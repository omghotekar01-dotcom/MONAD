import "./rooms.css";
import QRCode from "qrcode";
import { INSTRUMENTS, LABELS, createPattern } from "./sequencer.js";
import {
  CONTRACT_READY, CONTRACT_ADDRESS, EXPLORER, FAUCET,
  connectWallet, refreshWallet, walletAddress, walletEvents,
  readRoom, createRoom, assignSeat, startRoom, finalizeRoom,
  tipRoom, claimRoom, readClaim, authorizeSession, revokeSession,
  sessionAddress, sessionActive, readSessionGas, fundSession,
  submitBatch, clearSession, getErrorMessage, explorerTx, formatMon
} from "./chain.js";
import {
  ZERO_ADDRESS, shortAddress, sameAddress, roomIdFromSearch,
  roomHref, beatHref, editable, canFlush, applyOverlay,
  makeBatches, getEligibleSeats, formatCountdown, FINAL_EDIT_BUFFER_SECONDS
} from "./room-utils.js";

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
const numberId = value => {
  const v=String(value).trim();
  if(!/^[1-9][0-9]{0,14}$/.test(v))throw new Error("Enter a valid positive room ID.");
  return BigInt(v);
};
const EMPTY_STATUS="Local practice is ready without a wallet.";
export function mountRooms({onPattern,onStatus,onRoomChange}) {
  const root=document.getElementById("rooms-anchor");
  let roomId=roomIdFromSearch(location.search);
  let room=null, wallet=null, claimable=0n;
  let confirmed=createPattern(), queue=new Map(), inflight=new Map();
  let failed=new Map(), preferSession=false;
  let busy=false, sending=false, refreshing=false, lastFlush=0;
  let lastFrameSignature="", sessionBalance=0n;
  let transactions=[];
  let lastObservedAt=Date.now();
  let lastChainTime=0;
  let pollSeq=0, closed=false, lastError="";
  let activity="Choose local practice or connect to a shared room.";
  const updateStatus=(text)=>{activity=text;onStatus?.(text);const node=root.querySelector("#room-activity");if(node)node.textContent=text;};
  const nowSec=()=>room?room.chainTime+(Date.now()-room.chainObservedAt)/1000:Math.floor(Date.now()/1000);
  const txMessage=(label,state,hash)=> {
    transactions.unshift({label,state,hash});
    transactions=transactions.slice(0,7);
    renderTransactions();
  };
  const latestHash=(hash)=>txMessage("Awaiting confirmation","pending",hash);
  function frameSignature() {
    return JSON.stringify([roomId?.toString(),room?.phase,room?.seats,wallet?.toLowerCase(),preferSession,sessionAddress(),room?.eligibleMask,CONTRACT_READY]);
  }
  function route(id,kind="room") {
    const next=id==null?location.pathname:(kind==="beat"?beatHref(id):roomHref(id));
    history.pushState({}, "", next);
    enter(id);
  }
  async function enter(id) {
    const previous=roomId;
    roomId=id===null?null:BigInt(id);
    pollSeq++;
    if(previous!==roomId) {
      queue.clear();inflight.clear();failed.clear();transactions=[];confirmed=createPattern();
      room=null;lastFrameSignature="";onRoomChange?.(Boolean(roomId));
      if(!roomId)onPattern?.(createPattern(),false);
    }
    render(true);
    if(roomId)await refresh();
  }
  function leaveRoom() {
    if(queue.size || inflight.size){
      if(!confirm("This room has unconfirmed edits. Leave without sending them?"))return;
    }
    route(null);
  }
  function updatePattern(boundary=true){
    const p=applyOverlay(confirmed,queue,inflight);
    onPattern?.(p,boundary);
  }
  function refreshCountdown(){
    if(!room)return;
    const e=root.querySelector("#room-countdown");
    if(e)e.textContent=formatCountdown(room,nowSec());
    const deadline=root.querySelector("#deadline-status");
    if(deadline)deadline.textContent=room.phase==="Live"?
      (nowSec()>=room.endsAt-FINAL_EDIT_BUFFER_SECONDS?"Submission window closing. Only confirmed transactions count.":"Edits stop 4 seconds before the deadline to allow pending batches to settle.") :
      (room.phase==="Finalized"?"Final pattern frozen on-chain.":"Host assigns seats; everyone sees the same roster.");
    const pending=root.querySelector("#room-pending");
    if(pending)pending.textContent=queue.size+" queued · "+inflight.size+" in flight · "+failed.size+" failed";
  }
  function renderTransactions(){
    const target=root.querySelector("#room-txs");
    if(!target)return;
    target.innerHTML=transactions.map(t=>`<div class="tx-line"><span class="tx-state ${t.state}">${escapeHTML(t.state)}</span><span>${escapeHTML(t.label)}</span>${t.hash?`<a href="${explorerTx(t.hash)}" target="_blank" rel="noopener noreferrer">Explorer ↗</a>`:""}</div>`).join("") ||
      '<div class="soft-note">Transactions appear here when you interact with Monad.</div>';
  }
  function render(force=false){
    const signature=frameSignature();
    if(!force&&lastFrameSignature===signature){
      refreshCountdown();return;
    }
    lastFrameSignature=signature;
    const walletLabel=wallet?shortAddress(wallet):"Connect MetaMask";
    const header=`
    <div class="room-title-row">
      <div><div class="eyebrow">BEAT DROP / JAM ROOMS</div><h2>${room?escapeHTML(room.name||"Untitled Jam"): "Create a moment. Share a beat."}</h2>
      <p>${room?"Monad Testnet · On-chain room #"+room.id: "Create or join a real jam on Monad Testnet. Practice remains free and offline."}</p></div>
      <div class="room-actions">
        <span class="network-tag">${CONTRACT_READY?"◉ MONAD TESTNET":"● DEPLOYMENT NEEDED"}</span>
        <button id="wallet-connect" class="subtle-btn" type="button">${escapeHTML(walletLabel)}</button>
      </div>
    </div>`;
    const inactive=!CONTRACT_READY? `
      <div class="setup-warning"><strong>Blockchain activation required</strong><p>The studio works now, but room creation needs a real Monad Testnet contract address. Deploy the tested contract, then set <code>VITE_BEATDROP_ADDRESS</code> in your local <code>.env.local</code> and restart Vite. No room is simulated.</p>
      <a href="https://github.com/omghotekar01-dotcom/MONAD/blob/main/docs/MULTIPLAYER.md" target="_blank" rel="noopener noreferrer">Deployment instructions ↗</a></div>`:"";
    const browserRooms=`
      <div class="join-grid">
        <div class="join-box"><span class="eyebrow">01 / HOST A JAM</span>
          <label for="new-room-name">Room name</label>
          <input id="new-room-name" placeholder="e.g. Midnight Frequencies" maxlength="31" value="Friday Night Loop">
          <button id="room-create" class="action-btn" type="button" ${!CONTRACT_READY?"disabled":""}>+ Create Jam</button>
        </div>
        <div class="join-box"><span class="eyebrow">02 / JOIN A JAM</span>
          <label for="room-id-input">Room number</label>
          <input id="room-id-input" placeholder="e.g. 27" inputmode="numeric">
          <button id="room-join" class="subtle-btn" type="button" ${!CONTRACT_READY?"disabled":""}>Join / Listen →</button>
          <small>You can listen without a wallet; connect to own a seat.</small>
        </div>
      </div>`;
    let content=browserRooms;
    if(room) {
      const host=sameAddress(room.host,wallet);
      const mySeats=INSTRUMENTS.filter((_,i)=>sameAddress(wallet,room.seats[i]));
      const countdown=escapeHTML(formatCountdown(room,nowSec()));
      const seats=INSTRUMENTS.map((instrument,index)=>{
        const addr=room.seats[index],occupied=!sameAddress(addr,ZERO_ADDRESS);
        const self=sameAddress(addr,wallet);
        const owner=occupied?shortAddress(addr):"Available";
        return `<div class="room-seat"><div><strong>${index+1} / ${LABELS[instrument]}</strong><small>${escapeHTML(owner)} ${self?"· YOU":""}</small></div>
        ${host&&room.phase==="Lobby"?
          `<div class="assign-row"><input id="seat-addr-${index}" aria-label="Owner for ${instrument}" placeholder="0x... or self" value="${occupied?escapeHTML(addr):""}"><button data-self="${index}" type="button">Me</button><button data-assign="${index}" type="button">Assign</button><button data-clear="${index}" type="button">Clear</button></div>`:""}
        </div>`;
      }).join("");
      const eligible=getEligibleSeats(room);
      const chosenMask=eligible.length?eligible.map(i=>escapeHTML(LABELS[i])).join(", "):"None";
      content=`
        <div class="room-ribbon">
          <button id="room-back" type="button" class="subtle-btn">← Practice / Other rooms</button>
          <div class="room-state"><span class="state-marker ${room.phase.toLowerCase()}"></span>${room.phase}<strong id="room-countdown">${countdown}</strong></div>
          <button id="room-copy" type="button" class="subtle-btn">↗ Copy invite</button>
          <button id="room-show-qr" type="button" class="subtle-btn">▦ Show QR</button>
        </div>
        <div id="room-qr" class="room-qr" hidden><p>Scan to open room #${room.id}</p><img id="room-qr-image" alt="Invite QR code"></div>
        <div class="room-seat-grid">${seats}</div>
        <div class="room-progress">
          <div><span class="eyebrow">ROOM HOST</span><strong>${escapeHTML(shortAddress(room.host))}</strong></div>
          <div><span class="eyebrow">YOUR SEATS</span><strong>${mySeats.length?mySeats.map(i=>LABELS[i]).join(" · "):"Listener"}</strong></div>
          <div><span class="eyebrow">DEADLINE</span><strong>${room.phase==="Live"?new Date(room.endsAt*1000).toLocaleTimeString():"—"}</strong></div>
        </div>
        <p id="deadline-status" class="soft-note"></p>
        ${room.phase==="Lobby"?`
          <div class="room-action-row"><span class="soft-note">Host approval is required. Guests can copy their connected wallet address for seat assignment.</span>
          ${host?`<button id="room-start" class="action-btn" type="button">▶ Start 90-second jam</button>`:""}
          <button id="room-copy-wallet" class="subtle-btn" type="button" ${!wallet?"disabled":""}>Copy my address</button></div>`:""}
        ${room.phase==="Live"?`
          <div class="session-panel">
            <div><strong>Music permissions</strong><p>Only the owner of each instrument can record edits. Use main-wallet confirmations or an optional funded browser session key.</p></div>
            <div class="room-action-row">
              <button id="room-main-mode" type="button" class="subtle-btn ${!preferSession?"chosen":""}">Main-wallet signing</button>
              ${sessionActive(roomId)?`
                <button id="room-session-mode" type="button" class="subtle-btn ${preferSession?"chosen":""}">Session signing</button>
                <button id="room-session-fund" type="button" class="subtle-btn">Fund session gas</button>
                <button id="room-session-revoke" type="button" class="subtle-btn">Revoke session</button>
                `:`<button id="room-session-enable" type="button" class="subtle-btn" ${!wallet||!mySeats.length?"disabled":""}>Authorize short session</button>`}
            </div>
            <div class="soft-note" id="session-details">${sessionActive(roomId)?`Key: ${escapeHTML(shortAddress(sessionAddress()))} · Gas: ${formatMon(sessionBalance)} testnet MON · Resets on reload`:"Session signing is optional. Main wallet signing can require one popup per batch."}</div>
          </div>
          <div class="room-action-row">
            <span id="room-pending" class="soft-note">0 queued · 0 in flight · 0 failed</span>
            <button id="room-flush" type="button" class="subtle-btn">Send pending edits</button>
            ${failed.size?`<button id="room-retry" type="button" class="subtle-btn">Retry failed</button>`:""}
            <button id="room-finalize" type="button" class="action-btn" ${nowSec()<room.endsAt?"disabled":""}>Finalize after deadline</button>
          </div>
          `:""}
        ${room.phase==="Finalized"?`
          <div class="final-panel">
            <div><span class="eyebrow">THE FINISHED BEAT</span><h3>${room.eligibleMask?"Your music is on-chain.":"No recorded contributions"}</h3>
              <p>Eligible seats: ${chosenMask}. Every eligible seat receives an equal share of tips sent to this contract. Multiple seats held by one wallet aggregate.</p>
              <p>Total tipped: <strong>${formatMon(room.totalTipped)} testnet MON</strong> · Claimed: <strong>${formatMon(room.totalClaimed)} MON</strong>.</p>
              <a href="${escapeHTML(beatHref(room.id))}" id="beat-share" class="subtle-btn">Open permanent Beat Card ↗</a>
            </div>
            <div class="tip-box"><label for="tip-value">Tip this beat (testnet MON)</label>
              <input id="tip-value" value="0.01" inputmode="decimal" ${!room.eligibleMask?"disabled":""}>
              <button id="room-tip" class="action-btn" type="button" ${!room.eligibleMask?"disabled":""}>Tip contributors</button>
              <span class="soft-note">Your claimable: ${formatMon(claimable)} MON</span>
              <button id="room-claim" class="subtle-btn" type="button" ${claimable===0n?"disabled":""}>Claim to my main wallet</button>
            </div>
          </div>`:""}
        <div class="tx-panel"><div class="eyebrow">ON-CHAIN ACTIVITY</div><div id="room-txs"></div></div>
      `;
    }
    root.innerHTML=`<section class="rooms" aria-label="Multiplayer rooms">${header}${!room?inactive:""}${content}
      <div class="room-feedback" id="room-activity" role="status" aria-live="polite">${escapeHTML(lastError||activity)}</div>
    </section>`;
    bindUI();
    renderTransactions();
    refreshCountdown();
  }
  function bindUI(){
    root.querySelector("#wallet-connect")?.addEventListener("click",()=>void execute("Connect wallet",async()=>{
      wallet=await connectWallet();
      updateStatus("Wallet connected to Monad Testnet: "+shortAddress(wallet));
      await refresh();
    },false));
    root.querySelector("#room-create")?.addEventListener("click",()=>void execute("Create jam",async()=>{
      if(!wallet)wallet=await connectWallet();
      const name=root.querySelector("#new-room-name").value;
      const made=await createRoom(name,hash=>txMessage("Creating room","pending",hash));
      txMessage("Room created","confirmed",made.hash);
      route(made.roomId);
    }));
    root.querySelector("#room-join")?.addEventListener("click",()=>{
      try{route(numberId(root.querySelector("#room-id-input").value));}catch(error){updateStatus(getErrorMessage(error));}
    });
    root.querySelector("#room-back")?.addEventListener("click",leaveRoom);
    root.querySelector("#room-copy-wallet")?.addEventListener("click",()=>void copyText(wallet,"Wallet address"));
    root.querySelector("#room-copy")?.addEventListener("click",()=>void copyText(roomHref(room.id),"Invitation link"));
    root.querySelector("#room-show-qr")?.addEventListener("click",async()=>{
      const area=root.querySelector("#room-qr"),image=root.querySelector("#room-qr-image");
      area.hidden=!area.hidden;
      if(!area.hidden){
        try{image.src=await QRCode.toDataURL(roomHref(room.id),{width:180,margin:1,color:{dark:"#101216",light:"#f4f5f7"}});}
        catch(error){updateStatus("QR generation failed: "+getErrorMessage(error));}
      }
    });
    root.querySelectorAll("[data-self]").forEach(b=>b.addEventListener("click",()=>{
      const input=root.querySelector("#seat-addr-"+b.dataset.self);if(input)input.value=wallet||"";
    }));
    root.querySelectorAll("[data-assign]").forEach(b=>b.addEventListener("click",()=>void execute("Assign instrument",async()=>{
      const index=Number(b.dataset.assign);
      const value=root.querySelector("#seat-addr-"+index).value.trim();
      const {hash}=await assignSeat(room.id,index,value,h=>txMessage("Assigning "+LABELS[INSTRUMENTS[index]],"pending",h));
      txMessage("Seat assigned","confirmed",hash);await refresh(true);
    })));
    root.querySelectorAll("[data-clear]").forEach(b=>b.addEventListener("click",()=>void execute("Clear instrument",async()=>{
      const index=Number(b.dataset.clear);
      const {hash}=await assignSeat(room.id,index,ZERO_ADDRESS,h=>txMessage("Clearing seat","pending",h));
      txMessage("Seat cleared","confirmed",hash);await refresh(true);
    })));
    root.querySelector("#room-start")?.addEventListener("click",()=>void execute("Start jam",async()=>{
      if(!confirm("Start the 90-second on-chain round? The instrument roster will freeze."))return;
      const {hash}=await startRoom(room.id,h=>txMessage("Starting jam","pending",h));
      txMessage("Jam started","confirmed",hash);await refresh(true);
    }));
    root.querySelector("#room-main-mode")?.addEventListener("click",()=>{preferSession=false;render(true);updateStatus("Main wallet signs each batch. Session keys are optional.");});
    root.querySelector("#room-session-mode")?.addEventListener("click",()=>{preferSession=true;render(true);updateStatus("Session signing selected. Ensure it has gas.");});
    root.querySelector("#room-session-enable")?.addEventListener("click",()=>void execute("Authorize temporary key",async()=>{
      const info=await authorizeSession(room.id,h=>txMessage("Authorizing session","pending",h));
      preferSession=true;
      sessionBalance=await readSessionGas();
      txMessage("Session authorized","confirmed",info.hash);
      updateStatus("Temporary key "+shortAddress(info.address)+" authorized for this room only. Top up testnet MON separately.");
      render(true);
    }));
    root.querySelector("#room-session-fund")?.addEventListener("click",()=>void execute("Fund temporary session",async()=>{
      const requested=prompt("Testnet MON to send to temporary session for gas (example: 0.01). Session keys reset on reload. Do not send real MON.","0.01");
      if(requested===null)return;
      const result=await fundSession(requested,h=>txMessage("Funding session gas","pending",h));
      sessionBalance=await readSessionGas();
      txMessage("Session funded","confirmed",result.hash);render(true);
    }));
    root.querySelector("#room-session-revoke")?.addEventListener("click",()=>void execute("Revoke session",async()=>{
      const result=await revokeSession(room.id,h=>txMessage("Revoking session","pending",h));
      preferSession=false;sessionBalance=0n;
      txMessage("Session revoked","confirmed",result.hash);render(true);
    }));
    root.querySelector("#room-flush")?.addEventListener("click",()=>void flush());
    root.querySelector("#room-retry")?.addEventListener("click",()=>retryFailed());
    root.querySelector("#room-finalize")?.addEventListener("click",()=>void execute("Finalize jam",async()=>{
      if(queue.size)await flush();
      if(inflight.size)throw new Error("Edits are still awaiting confirmation. Finalization cannot include transactions mined after the deadline.");
      const result=await finalizeRoom(room.id,h=>txMessage("Finalizing beat","pending",h));
      txMessage("Beat finalized","confirmed",result.hash);
      await refresh(true);
      history.replaceState({},"",beatHref(room.id));
    }));
    root.querySelector("#room-tip")?.addEventListener("click",()=>void execute("Tip contributors",async()=>{
      const value=root.querySelector("#tip-value").value;
      const result=await tipRoom(room.id,value,h=>txMessage("Tipping contributors","pending",h));
      txMessage("Tip confirmed","confirmed",result.hash);await refresh(true);
    }));
    root.querySelector("#room-claim")?.addEventListener("click",()=>void execute("Claim tips",async()=>{
      const result=await claimRoom(room.id,h=>txMessage("Claiming tips","pending",h));
      txMessage("Claim confirmed","confirmed",result.hash);await refresh(true);
    }));
  }
  async function copyText(value,label){
    try{await navigator.clipboard.writeText(value);updateStatus(label+" copied.");}
    catch{updateStatus("Copy manually: "+value);}
  }
  async function execute(label,fn,refreshAfter=true){
    if(busy)return;
    busy=true;lastError="";
    updateStatus(label+"… Waiting for wallet or chain confirmation.");
    try {
      await fn();
      if(refreshAfter && roomId)await refresh(true);
      updateStatus(label+" completed on Monad Testnet.");
    }catch(error){
      lastError=getErrorMessage(error);
      txMessage(label,"failed","");
      updateStatus(label+" failed: "+lastError);
    }finally{busy=false;}
  }
  async function refresh(force=false){
    if(!roomId||!CONTRACT_READY||refreshing||closed)return;
    const current=roomId, seq=pollSeq;
    refreshing=true;
    try{
      const next=await readRoom(current);
      if(seq!==pollSeq||roomId!==current)return;
      const previousPhase=room?.phase;
      room=next;
      confirmed=next.pattern;
      if(room.phase!=="Live" && (queue.size||inflight.size)){
        // Never retain optimistic edits when a room is finalized or unstarted.
        queue.clear();inflight.clear();
      }
      updatePattern(true);
      if(room.phase==="Finalized" && wallet) {
        claimable=await readClaim(current,wallet);
      } else claimable=0n;
      if(seq!==pollSeq||roomId!==current)return;
      render(force||previousPhase!==room.phase);
      if(previousPhase==="Live"&&room.phase==="Finalized")updateStatus("The round was finalized. Only accepted on-chain edits are included.");
    }catch(error){
      lastError=getErrorMessage(error);
      updateStatus("Room sync failed: "+lastError+" — checking again shortly.");
    }finally{refreshing=false;}
  }
  function canEdit(instrument) {
    return !roomId || editable(room,wallet,instrument,nowSec());
  }
  function enqueue(instrument,step,cell) {
    if(!roomId)return;
    if(!canEdit(instrument)){updateStatus("Read-only: connect and claim this seat, or wait for a live round.");return;}
    queue.set(instrument+":"+step,[...cell]);
    failed.delete(instrument+":"+step);
    updatePattern(false);refreshCountdown();
    updateStatus("Edit queued for Monad. Accepted edits enter the shared loop after confirmation.");
  }
  async function flush(){
    if(!roomId || sending || queue.size===0)return;
    if(!room){updateStatus("Room is not ready.");return;}
    sending=true;lastFlush=Date.now();
    try{
      const batches=makeBatches([...queue.entries()]);
      for(const batch of batches){
        if(!canFlush(room,wallet,batch.instrument,nowSec())) {
          updateStatus("Submission cutoff reached; pending edits could not be included.");
          for(let j=0;j<batch.steps.length;j++){
            const key=batch.instrument+":"+batch.steps[j];
            failed.set(key,batch.cells[j]);queue.delete(key);
          }
          continue;
        }
        for(let j=0;j<batch.steps.length;j++) {
          const key=batch.instrument+":"+batch.steps[j];
          // A new edit can arrive during a transaction: only delete the old queue value.
          const currentlyQueued=queue.get(key);
          if(currentlyQueued && JSON.stringify(currentlyQueued)===JSON.stringify(batch.cells[j]))queue.delete(key);
          inflight.set(key,batch.cells[j]);
        }
        updatePattern(false);
        let hash=null;
        try {
          const res=await submitBatch(room.id,INSTRUMENTS.indexOf(batch.instrument),batch.steps,batch.values,wallet,
            h=>{hash=h;txMessage("Submitting "+LABELS[batch.instrument],"pending",h);},preferSession);
          txMessage("Confirmed "+LABELS[batch.instrument],"confirmed",res.hash);
          for(let j=0;j<batch.steps.length;j++)inflight.delete(batch.instrument+":"+batch.steps[j]);
          await refresh(true);
        }catch(error){
          for(let j=0;j<batch.steps.length;j++){
            const key=batch.instrument+":"+batch.steps[j];
            inflight.delete(key);
            if(!queue.has(key))failed.set(key,batch.cells[j]);
          }
          txMessage("Failed "+LABELS[batch.instrument],"failed",hash);
          updateStatus("Edit not confirmed: "+getErrorMessage(error)+". You can retry before the cutoff.");
          await refresh(true);
        }
      }
    }finally{sending=false;updatePattern(true);refreshCountdown();}
  }
  function retryFailed(){
    for(const [key,cell] of failed) {
      const instrument=key.split(":")[0];
      if(canEdit(instrument))queue.set(key,cell);
    }
    failed.clear();updatePattern(false);render(true);
    void flush();
  }
  function tick(){
    if(closed)return;
    refreshCountdown();
    if(room?.phase==="Live" && queue.size && !sending && Date.now()-lastFlush>=1900)void flush();
    if(room?.phase==="Live" && nowSec()>=room.endsAt){
      const finalize=root.querySelector("#room-finalize");
      if(finalize)finalize.disabled=false;
    }
  }
  const unsub=walletEvents(async next=>{
    wallet=next;preferSession=false;lastFrameSignature="";
    render(true);await refresh(true);
  });
  const interval=setInterval(tick,700);
  const poll=setInterval(()=>void refresh(),2500);
  const pop=()=>void enter(roomIdFromSearch(location.search));
  window.addEventListener("popstate",pop);
  void refreshWallet().then(next=>{wallet=next;render(true);if(roomId)void refresh();}).catch(()=>{render(true);});
  onRoomChange?.(Boolean(roomId));
  render(true);
  if(roomId)void refresh();
  return {
    inRoom:()=>roomId!==null,
    canEdit,
    enqueue,
    roomPhase:()=>room?.phase||null,
    currentRoom:()=>room,
    reset:()=>{queue.clear();inflight.clear();failed.clear();},
    dispose:()=>{
      closed=true;clearInterval(interval);clearInterval(poll);
      window.removeEventListener("popstate",pop);unsub();clearSession();
    }
  };
}
