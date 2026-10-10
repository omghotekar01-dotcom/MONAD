import { INSTRUMENTS, LABELS, COLORS } from "./sequencer.js";
import { beatStats, beatArtworkSvg, seatShares, walletShares } from "./beat-card.js";
import { shortAddress } from "./room-utils.js";

export function escapeCardText(value) {
  return String(value ?? "").replace(/[&<>"']/g, c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[c]);
}
export function beatCardHTML({pattern, title, room=null, playing=false, muted=[], solo=null}) {
  const stats=beatStats(pattern);
  if(!stats.playable && !room) return "";
  const finalized=room?.phase==="Finalized";
  const seats=finalized?seatShares(room):[];
  const wallets=finalized?walletShares(room):[];
  const percent=n=>Number(n).toLocaleString("en-US",{maximumFractionDigits:2})+"%";
  const actions=INSTRUMENTS.map((instrument,index)=>{
    const n=pattern[instrument].reduce((t,cell)=>t+cell.length,0);
    const isMuted=muted.includes(instrument),isSolo=solo===instrument;
    const owner=room?.seats?.[index];
    return `<div class="beat-stem" style="--stem:${COLORS[instrument]}">
      <div class="stem-head"><strong>${LABELS[instrument]}</strong><span>${n} notes</span></div>
      <div class="stem-owner">${finalized&&owner&&owner!=="0x0000000000000000000000000000000000000000" ? escapeCardText(shortAddress(owner)):"STEM "+String(index+1).padStart(2,"0")}</div>
      <div class="stem-buttons">
        <button type="button" data-card-mute="${instrument}" aria-label="Mute ${instrument}" aria-pressed="${isMuted}" class="${isMuted?"selected":""}">MUTE</button>
        <button type="button" data-card-solo="${instrument}" aria-label="Solo ${instrument}" aria-pressed="${isSolo}" class="${isSolo?"selected":""}">SOLO</button>
      </div>
    </div>`;
  }).join("");
  const participants=finalized?wallets.map(x=>`
    <div class="credit-wallet"><span class="credit-avatar">${x.address.slice(2,4).toUpperCase()}</span>
      <div><strong title="${escapeCardText(x.address)}">${escapeCardText(shortAddress(x.address))}</strong>
        <small>${x.instruments.map(i=>LABELS[i]).join(" · ")}</small></div>
      <span class="credit-share">${percent(x.percentage)}</span></div>`).join(""):"";
  const creditPanel=finalized?`
    <div class="beat-credits"><div class="eyebrow">ON-CHAIN CONTRIBUTORS / FROZEN SHARES</div>
      ${participants||'<p class="credit-empty">No eligible contributors. This beat cannot receive tips.</p>'}
      <p class="credit-footnote">Equal shares by eligible instrument seat, not by note count. The smart contract assigns any indivisible-wei remainder to the first eligible seat. Wallet labels are not verified human identities.</p>
    </div>`:`<div class="beat-credits"><div class="eyebrow">LOCAL PRACTICE / UNSIGNED</div>
      <p class="credit-footnote">This is your local preview, not a finalized chain record. No wallet attribution, minting or tip allocation occurs here.</p>
    </div>`;
  return `<section class="beat-card" aria-label="${finalized?"Finalized Beat Card":"Local Beat Card preview"}">
    <div class="beat-cover">
      <div class="beat-cover-art">${beatArtworkSvg(pattern)}</div>
      <div class="beat-cover-label"><span class="eyebrow">${finalized?"FINALIZED / MONAD TESTNET":"LOCAL STUDIO / PREVIEW"}</span>
        <span class="beat-code">#${stats.fingerprint}</span></div>
    </div>
    <div class="beat-information">
      <div class="eyebrow">BEAT DROP / THE FINISHED SOUND</div>
      <h3>${escapeCardText(title||"Untitled Loop")}</h3>
      <p class="beat-subtitle">${finalized?"Replayable on-chain arrangement · 120 BPM":"Local arrangement, ready to practice · 120 BPM"}</p>
      <div class="beat-counts"><div><strong>${stats.notes}</strong><span>NOTES</span></div><div><strong>${stats.seats}/4</strong><span>ACTIVE STEMS</span></div><div><strong>16</strong><span>STEPS / LOOP</span></div></div>
      <div class="beat-play-actions">
        <button type="button" class="beat-play-button" data-card-play>${playing?"❚❚ Pause replay":"▶ Play replay"}</button>
        <button type="button" class="beat-secondary" data-card-art>↓ Save artwork</button>
        ${finalized?'<button type="button" class="beat-secondary" data-card-share>↗ Share beat</button>':""}
      </div>
      <p class="beat-help">Solo or mute individual instruments to hear what each player contributed. These listening settings never alter the recorded chain pattern.</p>
      <div class="beat-stems">${actions}</div>
      ${creditPanel}
      <div class="beat-footer"><span>ONE BAR / FOUR SEATS / NO HIDDEN BACKING TRACKS</span><span>${finalized?"ON-CHAIN REPLAY":"PREVIEW ONLY"}</span></div>
    </div>
  </section>`;
}
export function saveBeatArtwork(pattern,name) {
  const svg=beatArtworkSvg(pattern);
  const file=new Blob([svg],{type:"image/svg+xml;charset=utf-8"});
  const link=document.createElement("a");
  const url=URL.createObjectURL(file);
  link.href=url;
  link.download="beat-drop-"+(name||"loop").toLowerCase().replace(/[^a-z0-9]+/g,"-").slice(0,32)+"-art.svg";
  link.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),2000);
}
