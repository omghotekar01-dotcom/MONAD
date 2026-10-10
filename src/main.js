import * as Tone from "tone";
import {INSTRUMENTS,LABELS,COLORS,STEPS,BPM,NOTES,KEY_LOWER,KEY_UPPER,DRUM_NAMES,createPattern,withNote,keyToNote,hasNotes,contributions,serialize,deserialize,quantizedStep} from "./sequencer.js";
import { mountRooms } from "./room-controller.js";
import { beatCardHTML, saveBeatArtwork } from "./beat-card-view.js";
import "./beat-card.css";
import "./style.css";

const el=document.querySelector("#app");
let pattern=createPattern(),history=[],instrument="drums",selectedNote=0,recording=false,playing=false,started=false,step=-1;
let beatUrl="",message="Practice is local — no wallet needed.",notesPlayed=0;
let sampler=null,loop=null,master=null;
const sound={};
let playbackStartedAt=0;
let roomController=null, pendingRemote=null, previewVisible=false;
const mutedInstruments=new Set();
let soloInstrument=null;
const shouldPlayStem=inst=>soloInstrument ? inst===soloInstrument : !mutedInstruments.has(inst);
function getMix(){return {playing,muted:[...mutedInstruments],solo:soloInstrument};}
function syncCardButtons(){
  document.querySelectorAll("[data-card-play]").forEach(b=>b.textContent=playing?"❚❚ Pause replay":"▶ Play replay");
  document.querySelectorAll("[data-card-mute]").forEach(b=>{
    const value=mutedInstruments.has(b.dataset.cardMute);
    b.setAttribute("aria-pressed",String(value));b.classList.toggle("selected",value);
  });
  document.querySelectorAll("[data-card-solo]").forEach(b=>{
    const value=soloInstrument===b.dataset.cardSolo;
    b.setAttribute("aria-pressed",String(value));b.classList.toggle("selected",value);
  });
}
function renderLocalCard(){
  const anchor=document.querySelector("#local-card-anchor");
  if(!anchor)return;
  if(!previewVisible || !hasNotes(pattern) || roomController?.inRoom()){
    anchor.hidden=true;anchor.innerHTML="";return;
  }
  anchor.hidden=false;
  anchor.innerHTML=beatCardHTML({pattern,title:"My Beat Drop Loop",...getMix()});
}
function togglePreview(){
  if(!hasNotes(pattern)){setMessage("Add at least one note before previewing.");return;}
  if(roomController?.inRoom()){setMessage("Finish and finalize your shared room to open its Beat Card.");return;}
  previewVisible=!previewVisible;
  renderLocalCard();
  document.querySelector("#preview-card").textContent=previewVisible?"✕ Close Beat Card":"◈ Preview Beat Card";
  if(previewVisible)document.querySelector("#local-card-anchor").scrollIntoView({behavior:"smooth",block:"start"});
}
function setCell(instrument,step,cell){
 const out={...pattern,[instrument]:pattern[instrument].map(c=>[...c])};
 out[instrument][step]=[...cell];
 return out;
}
function setPatternFromChain(next,boundary=true){
 if(playing&&boundary){pendingRemote=next;return;}
 pendingRemote=null;pattern=next;renderGrid();renderStats();
}
function toggleRecord(){
 if(!recording && roomController?.inRoom() && !roomController.canEdit(instrument)){
   setMessage("Read-only instrument. A seat owner can record during a live jam.");return;
 }
 recording=!recording;renderControls();
 setMessage(recording?"Record armed — changes are "+(roomController?.inRoom()?"submitted to Monad.":"local."):"Recording disarmed.");
}

function buildSound(){
 if(started)return;
 master=new Tone.Limiter(-1).toDestination();
 const gain=new Tone.Gain(0.7).connect(master);
 sound.bass=new Tone.MonoSynth({oscillator:{type:"sawtooth"},envelope:{attack:0.01,decay:0.18,sustain:0.25,release:0.1},filterEnvelope:{attack:0.01,decay:0.12,sustain:0.3,release:0.1,baseFrequency:80,octaves:2}}).connect(gain);
 sound.synth=new Tone.PolySynth(Tone.Synth,{oscillator:{type:"triangle"},envelope:{attack:0.015,decay:0.12,sustain:0.22,release:0.18}}).connect(gain);
 sound.pluck=new Tone.PolySynth(Tone.Synth,{oscillator:{type:"sine"},envelope:{attack:0.001,decay:0.15,sustain:0.02,release:0.12}}).connect(gain);
 const kick=new Tone.MembraneSynth({pitchDecay:0.035,octaves:7,oscillator:{type:"sine"},envelope:{attack:0.001,decay:0.27,sustain:0,release:0.02}}).connect(gain);
 const snare=new Tone.NoiseSynth({noise:{type:"white"},envelope:{attack:0.001,decay:0.12,sustain:0}}).connect(gain);
 const hat=new Tone.MetalSynth({frequency:320,envelope:{attack:0.001,decay:0.045,release:0.01},harmonicity:5,resonance:3000,octaves:1.5}).connect(gain);
 const clap=new Tone.NoiseSynth({noise:{type:"pink"},envelope:{attack:0.002,decay:0.17,sustain:0}}).connect(gain);
 sound.drums=[kick,snare,hat,clap];
 Tone.getTransport().bpm.value=BPM;
 loop=new Tone.Loop(time=>{
  step=(step+1)%STEPS;
  if(pendingRemote){pattern=pendingRemote;pendingRemote=null;Tone.getDraw().schedule(()=>{renderGrid();renderStats();},time);}
  for(const inst of INSTRUMENTS){
   if(shouldPlayStem(inst))for(const note of pattern[inst][step]) trigger(inst,note,time);
  }
  Tone.getDraw().schedule(()=>refreshPlayback(step),time);
 },"16n").start(0);
 started=true;
}
function trigger(inst,note,time){
 try{
  if(inst==="drums") {
   if(note===0)sound.drums[note].triggerAttackRelease("C1","16n",time,0.85);
   else if(note===2)sound.drums[note].triggerAttackRelease("32n",time,0.12);
   else sound.drums[note].triggerAttackRelease("16n",time,0.26);
  } else sound[inst].triggerAttackRelease(NOTES[inst][note],inst==="bass"?"8n":"16n",time,0.46);
 }catch(error){console.error("Audio trigger failed",error);}
}
async function unlock(){
 try{await Tone.start();buildSound();return true;}
 catch{setMessage("Audio permission denied. Tap Play to try again.");return false;}
}
function setMessage(value){message=value;document.querySelector("#status").textContent=value;}
function short(inst){return LABELS[inst].toLowerCase();}
function selectedPadLabel(n){return instrument==="drums"?DRUM_NAMES[n]:NOTES[instrument][n];}
function timeForStep(){return started ? quantizedStep(Math.max(0,Tone.getTransport().seconds)):0;}
async function togglePlay(){
 if(!await unlock())return;
 if(playing){Tone.getTransport().pause();playing=false;setMessage("Paused. Your loop is saved locally.");}
 else{Tone.getTransport().start();playing=true;setMessage(recording?"Recording into your local loop.":"Playing the local loop.");}
 renderControls();
 syncCardButtons();
}
async function inputNote(note){
 if(!await unlock())return;
 if(!Number.isInteger(note)||note<0||(instrument==="drums"?note>3:note>15))return;
 selectedNote=note;
 trigger(instrument,note,Tone.now()+0.005);notesPlayed++;
 if(recording){
  const target=playing?timeForStep():0;
  if(roomController?.inRoom() && !roomController.canEdit(instrument)){
    recording=false;renderControls();setMessage("Your seat is not allowed to edit now.");return;
  }
  if(roomController?.inRoom())history.push({kind:"room",instrument,step:target,before:[...pattern[instrument][target]]});
  else history.push(pattern);
  pattern=withNote(pattern,instrument,target,note,true);
  if(roomController?.inRoom())roomController.enqueue(instrument,target,pattern[instrument][target]);
  setMessage("Recorded "+selectedPadLabel(note)+" at step "+(target+1)+".");
 }
 renderPads();renderGrid();renderStats();
}
function toggleCell(i){
 if(roomController?.inRoom() && !roomController.canEdit(instrument)){
   setMessage("Read-only: you need the assigned wallet, a live round and time remaining.");return;
 }
 const current=pattern[instrument][i];
 if(roomController?.inRoom())history.push({kind:"room",instrument,step:i,before:[...current]});
 else history.push(pattern);
 pattern=withNote(pattern,instrument,i,selectedNote,current.includes(selectedNote)?false:true);
 if(roomController?.inRoom())roomController.enqueue(instrument,i,pattern[instrument][i]);
 setMessage("Edited step "+(i+1)+" in "+LABELS[instrument]+".");
 renderGrid();renderStats();
}
function undo(){
 if(!history.length){setMessage("Nothing to undo yet.");return;}
 const last=history.pop();
 if(last?.kind==="room"){
   if(!roomController?.canEdit(last.instrument)){setMessage("Undo is no longer allowed after the round closes.");return;}
   pattern=setCell(last.instrument,last.step,last.before);
   roomController.enqueue(last.instrument,last.step,last.before);
 }else pattern=last;
 setMessage("Last edit undone.");renderGrid();renderStats();
}
function changeInstrument(i){
 instrument=i;selectedNote=0;
 document.querySelectorAll("[data-instrument]").forEach(b=>b.classList.toggle("active",b.dataset.instrument===i));
 document.querySelector("#lane-label").textContent=LABELS[i]+" / STEP GRID";
 renderGrid();renderPads();renderStats();
}
function renderGrid(){
 const grid=document.querySelector("#grid");
 grid.innerHTML="";
 const max=instrument==="drums"?4:16;
 for(let s=0;s<STEPS;s++){
  const active=pattern[instrument][s].includes(selectedNote);
  const b=document.createElement("button");b.type="button";
  b.className="step"+(active?" hit":"")+(s===step&&playing?" current":"")+(s%4===0?" beat":"");
  b.dataset.step=String(s);b.setAttribute("aria-label","Step "+(s+1)+(active?", active":""));
  b.title="Step "+(s+1)+" — click to toggle "+selectedPadLabel(selectedNote);
  b.textContent=String(s+1).padStart(2,"0");b.onclick=()=>toggleCell(s);grid.append(b);
 }
 const mini=document.querySelector("#lane-overview");mini.innerHTML="";
 for(const inst of INSTRUMENTS){
  const lane=document.createElement("div");lane.className="lane";
  const name=document.createElement("span");name.textContent=LABELS[inst];lane.append(name);
  const bar=document.createElement("div");bar.className="lane-cells";
  pattern[inst].forEach((cell,s)=>{
   const dot=document.createElement("i");dot.className=(cell.length?"filled ":"")+(s===step&&playing?"now ":"");
   dot.style.setProperty("--lane",COLORS[inst]);bar.append(dot);
  });
  lane.append(bar);mini.append(lane);
 }
 document.documentElement.style.setProperty("--accent",COLORS[instrument]);
 document.querySelector("#pad-hint").textContent=instrument==="drums"?"A S D F · drum hits":"A–K / Q–I · lower / higher octave";
}
function refreshPlayback(value){
 const dots=document.querySelectorAll(".step");
 dots.forEach((b,i)=>b.classList.toggle("current",i===value));
 const lanes=document.querySelectorAll(".lane-cells");
 lanes.forEach(l=>Array.from(l.children).forEach((c,i)=>c.classList.toggle("now",i===value)));
 document.querySelector("#playhead").textContent=String(value+1).padStart(2,"0")+" / 16";
}
function renderPads(){
 const pads=document.querySelector("#pads");pads.innerHTML="";
 const length=instrument==="drums"?4:16;
 for(let n=0;n<length;n++){
  const b=document.createElement("button");b.type="button";
  const key=instrument==="drums"?"ASDF"[n]:(n<8?KEY_LOWER[n]:KEY_UPPER[n-8]).toUpperCase();
  b.className="pad"+(n===selectedNote?" selected":"");
  b.innerHTML='<kbd>'+key+'</kbd><strong>'+selectedPadLabel(n)+'</strong>';
  b.setAttribute("aria-label","Play "+selectedPadLabel(n));
  b.onclick=()=>inputNote(n);
  b.oncontextmenu=e=>{e.preventDefault();selectedNote=n;renderPads();renderGrid();};
  pads.append(b);
 }
}
function renderStats(){
 document.querySelector("#edit-count").textContent=INSTRUMENTS.reduce((n,i)=>n+pattern[i].reduce((m,cell)=>m+cell.length,0),0).toString();
 document.querySelector("#active-seats").textContent=contributions(pattern).length+" / 4";
 document.querySelector("#save").disabled=!hasNotes(pattern);
 const previewButton=document.querySelector("#preview-card");
 if(previewButton)previewButton.disabled=!hasNotes(pattern)||Boolean(roomController?.inRoom());
 if(previewVisible)renderLocalCard();
}
function renderControls(){
 document.querySelector("#play").textContent=playing?"❚❚ Pause":"▶ Play loop";
 document.querySelector("#record").textContent=recording?"● Recording":"○ Record";
 document.querySelector("#record").classList.toggle("recording",recording);
}
function downloadBeat(){
 if(!hasNotes(pattern))return;
 const blob=new Blob([serialize(pattern)],{type:"application/json"});
 if(beatUrl)URL.revokeObjectURL(beatUrl);
 beatUrl=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=beatUrl;a.download="beat-drop-loop.json";a.click();
 setMessage("Beat saved as JSON. This is not yet an on-chain Beat Card.");
}
function loadBeat(file){
 if(!file)return;
 file.text().then(text=>{pattern=deserialize(text);history=[];setMessage("Local beat loaded.");renderGrid();renderStats();})
 .catch(()=>setMessage("This file is not a valid Beat Drop loop."));
}
function onKey(event){
 if(event.ctrlKey||event.altKey||event.metaKey||event.repeat)return;
 const target=event.target;
 if(target instanceof HTMLElement&&(target.closest("input,textarea,select,[contenteditable=true]")))return;
 const k=event.key.toLowerCase();
 if("1234".includes(k)&&k.length===1){changeInstrument(INSTRUMENTS[Number(k)-1]);return;}
 if(k===" "){event.preventDefault();toggleRecord();return;}
 if(k==="z"){undo();return;}
 const note=keyToNote(instrument,k);if(note>=0)void inputNote(note);
}
window.addEventListener("keydown",onKey);
window.addEventListener("blur",()=>{document.querySelectorAll(".pad").forEach(b=>b.classList.remove("pressed"));});

el.innerHTML=`
<header class="top"><a class="logo" href="/" aria-label="Beat Drop home"><span class="logo-symbol">◉</span> BEAT<span>DROP</span></a><span class="pill"><i></i> BEAT DROP <small>· MONAD TESTNET</small></span><a class="github" href="https://github.com/omghotekar01-dotcom/MONAD" target="_blank" rel="noreferrer">GitHub ↗</a></header>
<main>
<section class="intro"><div class="eyebrow">THE SHARED MUSIC EXPERIMENT <span>·</span> 01 / PRACTICE</div><h1>Make something <em>together.</em></h1><p>Four strangers. One beat. Everyone credited. Make a local loop for practice, or create a jam on Monad Testnet and invite friends to record together.</p></section>
<div id="rooms-anchor"></div>
<section class="workspace" aria-label="Music studio">
<div class="studio-head"><div><div class="eyebrow">YOUR WORKSPACE</div><h2>Late Night Session <span>↗</span></h2><p>120 BPM · Local practice needs no wallet; shared edits are recorded when a live room is connected</p></div><div class="tempo"><strong>120</strong><span>BPM</span><strong>4/4</strong><span>TIME</span></div></div>
<div class="seat-row"><button data-instrument="drums" class="seat active"><span class="seat-icon">◈</span><div><b>01 / DRUMS</b><small>Percussion</small></div><span class="seat-dot"></span></button><button data-instrument="bass" class="seat"><span class="seat-icon">♩</span><div><b>02 / BASS</b><small>Low frequencies</small></div><span class="seat-dot"></span></button><button data-instrument="synth" class="seat"><span class="seat-icon">≋</span><div><b>03 / SYNTH</b><small>Lead melody</small></div><span class="seat-dot"></span></button><button data-instrument="pluck" class="seat"><span class="seat-icon">✧</span><div><b>04 / PLUCK</b><small>Bright accents</small></div><span class="seat-dot"></span></button></div>
<div class="grid-section"><div class="section-line"><span id="lane-label">DRUMS / STEP GRID</span><span>ONE BAR · 16 STEPS <b id="playhead">01 / 16</b></span></div><div class="step-grid" id="grid"></div><div class="beat-labels"><span>BEAT 01</span><span>BEAT 02</span><span>BEAT 03</span><span>BEAT 04</span></div>
<div id="lane-overview" class="lanes"></div></div>
<div class="play-section"><div class="section-line"><span>PLAY YOUR INSTRUMENT</span><span id="pad-hint">A S D F · drum hits</span></div><div class="pads" id="pads"></div><p class="keyboard-tip">Click or tap a pad to play and select a note for the step grid. <kbd>1–4</kbd> change instruments · <kbd>SPACE</kbd> arm recording · <kbd>Z</kbd> undo.</p></div>
<div class="transport"><div class="transport-left"><button id="play" class="play-btn">▶ Play loop</button><button id="record" class="record-btn">○ Record</button><button id="undo">↶ Undo</button></div><div class="transport-right"><button id="preview-card" disabled>◈ Preview Beat Card</button><button id="save" disabled>↓ Save loop</button><label for="upload" class="upload-btn">↑ Open loop<input id="upload" type="file" accept=".json,application/json" hidden></label></div></div>
<div id="status" class="status" role="status" aria-live="polite">Practice is local — no wallet needed.</div>
</section>
<div id="local-card-anchor" class="local-card-section" hidden></div>
<section class="info-strip"><div><span class="eyebrow">01 / LOCAL EDITS</span><strong id="edit-count">0</strong><small>Recorded notes</small></div><div><span class="eyebrow">02 / ACTIVE LANES</span><strong id="active-seats">0 / 4</strong><small>With at least one note</small></div><div><span class="eyebrow">03 / ON-CHAIN STATUS</span><strong id="network-status" class="not-live">Room controls above</strong><small>Only confirmed chain notes earn attribution</small></div></section>
<footer><p>BEAT DROP / EXPERIMENTAL MUSIC SPACE</p><p>Local audio · No royalties or ownership claims · Built for Monad</p></footer>
</main>`;
document.querySelectorAll("[data-instrument]").forEach(btn=>btn.addEventListener("click",()=>changeInstrument(btn.dataset.instrument)));
document.querySelector("#play").onclick=()=>void togglePlay();
document.querySelector("#record").onclick=toggleRecord;
document.querySelector("#undo").onclick=undo;
document.querySelector("#save").onclick=downloadBeat;
document.querySelector("#preview-card").onclick=togglePreview;
document.addEventListener("click",event=>{
 const control=event.target.closest("[data-card-play],[data-card-mute],[data-card-solo],[data-card-art],[data-card-share]");
 if(!control)return;
 if(control.hasAttribute("data-card-play")){void togglePlay();return;}
 if(control.hasAttribute("data-card-mute")){
  const inst=control.dataset.cardMute;
  if(mutedInstruments.has(inst))mutedInstruments.delete(inst);else mutedInstruments.add(inst);
  syncCardButtons();return;
 }
 if(control.hasAttribute("data-card-solo")){
  const inst=control.dataset.cardSolo;
  soloInstrument=soloInstrument===inst?null:inst;
  syncCardButtons();return;
 }
 if(control.hasAttribute("data-card-art")){
  const room=roomController?.currentRoom();
  const finalized=room?.phase==="Finalized";
  saveBeatArtwork(finalized?room.pattern:pattern,finalized?room.name:"my-loop");
  setMessage("Pattern-derived SVG artwork saved locally.");return;
 }
 if(control.hasAttribute("data-card-share")){
  const room=roomController?.currentRoom();
  if(!room||room.phase!=="Finalized")return;
  const url=new URL(location.href);
  url.searchParams.delete("room");url.searchParams.set("beat",String(room.id));
  const value=url.toString();
  if(navigator.share){void navigator.share({title:"BEAT DROP · "+room.name,url:value}).catch(()=>{});
  }else if(navigator.clipboard?.writeText){void navigator.clipboard.writeText(value).then(()=>setMessage("Beat Card link copied.")).catch(()=>setMessage("Share this link: "+value));}
  else setMessage("Share this link: "+value);
 }
});
document.querySelector("#upload").onchange=e=>{loadBeat(e.target.files?.[0]);e.target.value="";};
renderGrid();renderPads();renderStats();renderControls();

roomController=mountRooms({
 onPattern:setPatternFromChain,
 getMix,
 onStatus:setMessage,
 onRoomChange:(active)=>{
   history=[];recording=false;renderControls();
   previewVisible=false;document.querySelector("#preview-card").textContent="◈ Preview Beat Card";
   renderLocalCard();renderStats();
   document.querySelector("#network-status").textContent=active?"Shared room":"Local practice";
   setMessage(active?"Loading chain-authoritative room state.":"Local practice. No wallet needed.");
 }
});
