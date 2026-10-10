import { LABELS, INSTRUMENTS, COLORS } from "./sequencer.js";
import { GENRES, ENERGIES, analyzeBeat, generateSuggestions, suggestionIsCurrent, generateFullBeat, fullBeatIsCurrent } from "./producer.js";
import "./producer.css";

function escapeText(input){
 return String(input??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}
function snapshotSignature(pattern,instrument){
 return JSON.stringify(pattern[instrument]);
}
export function mountProducer({getPattern,getInstrument,isShared,canApply,onPreview,onStopPreview,onApply,onApplyFull}){
 const root=document.querySelector("#producer-anchor");
 if(!root)throw new Error("Missing Producer Lab anchor");
 let open=false, style="house", energy=2, plans=[], starter=null, audition=null, source=null, notice="";
 let disabled=false;
 const selected=()=>getInstrument();
 const actual=()=>getPattern();
 const canCommit=inst=>!isShared()||Boolean(canApply(inst));
 const statusText=()=> isShared()
   ? "Only an assigned owner can submit suggestions. Every changed step requires a confirmed Monad transaction."
   : "No cloud model, keys or payments. Arrangements use transparent, deterministic music rules.";
 function resetIdeas(clearNotice=true){
   if(audition){audition=null;onStopPreview();}
   plans=[];starter=null;source=null;
   if(clearNotice)notice="";
 }
 function invalidate(){
   const inst=selected();
   if((plans.length && (plans[0].instrument!==inst || source!==snapshotSignature(actual(),inst))) || (starter && !fullBeatIsCurrent(actual(),starter))) {
     resetIdeas(false);notice="The loop changed. Generate fresh ideas to avoid overwriting edits.";
   }
   render();
 }
 function viewGrid(pattern,instrument,changes){
   const changeSet=new Set(changes.map(x=>x.step));
   return '<div class="producer-minigrid" role="img" aria-label="16-step proposed '+escapeText(instrument)+' rhythm">'+
     pattern[instrument].map((cell,step)=>'<span class="producer-cell '+(cell.length?"filled ":"")+
       (changeSet.has(step)?"new ":"")+'" title="Step '+(step+1)+(changeSet.has(step)?" changed":"")+'"></span>').join("")+'</div>';
 }
 function card(plan,index){
   const editing=isShared()&&!canCommit(plan.instrument);
   const selectedIdea=audition?.id===plan.id;
   const before=plan.originalHits,after=plan.suggestedHits;
   return `<article class="producer-idea ${selectedIdea?"listening":""}" style="--producer-lane:${COLORS[plan.instrument]}">
      <div class="producer-idea-top"><div><span class="producer-idea-index">0${index+1} / ARRANGEMENT</span>
        <h4>${escapeText(plan.title)}</h4></div>
        <span class="producer-change-count">${plan.changes.length} ${plan.changes.length===1?"STEP":"STEPS"} CHANGED</span></div>
      <p>${escapeText(plan.rationale)}</p>
      ${viewGrid(plan.pattern,plan.instrument,plan.changes)}
      <div class="producer-idea-foot"><span>${before} → ${after} HITS</span>
        <div class="producer-idea-actions">
          <button type="button" data-producer-preview="${index}" class="producer-secondary" aria-pressed="${selectedIdea}">
            ${selectedIdea?"■ Stop audition":"▶ Audition"}</button>
          <button type="button" data-producer-apply="${index}" class="producer-apply"
            ${editing?"disabled":""} title="${editing?"This instrument is not assigned to your wallet.":"Approve and apply these exact note edits."}">✓ Apply idea</button>
        </div></div>
    </article>`;
 }
 function render(){
   const instrument=selected();
   const analysis=analyzeBeat(actual());
   const data=analysis.lines[instrument];
   const lock=isShared()&&!canCommit(instrument);
   root.innerHTML=`<section class="producer-shell" aria-label="Smart Producer" style="--producer-lane:${COLORS[instrument]}">
     <div class="producer-heading">
       <div class="producer-title-wrap"><div class="producer-orb" aria-hidden="true">✳</div><div>
         <div class="eyebrow">UPGRADE 05 / SMART PRODUCER</div>
         <h3>Need another idea? <em>Find the groove.</em></h3>
         <p>One-click suggestions grounded in your current 16-step loop. Nothing is changed until you approve it.</p>
       </div></div>
       <button id="producer-open" class="producer-launch" type="button" aria-expanded="${open}">${open?"− Hide Producer":"+ Open Producer"}</button>
     </div>
     ${open?`<div class="producer-body">
       <div class="producer-setup">
         <div class="producer-target"><span class="eyebrow">EDITING LANE</span><strong>${LABELS[instrument]}</strong>
            <small>${data.steps}/16 steps occupied · ${data.hits} notes</small></div>
         <label for="producer-style">Music style<select id="producer-style">
           ${Object.entries(GENRES).map(([key,genre])=>`<option value="${key}" ${key===style?"selected":""}>${genre.label}</option>`).join("")}
         </select></label>
         <label for="producer-energy">Energy <span class="producer-energy">${ENERGIES[energy]}</span>
           <input id="producer-energy" type="range" min="1" max="3" step="1" value="${energy}">
         </label>
         <button id="producer-generate" type="button" class="producer-launch">✳ Generate 3 ideas</button>
       </div>
       <div class="producer-full-action">
         <div><strong>Need a starting point?</strong><span>Draft drums, bass, synth and pluck together in one click.</span></div>
         <button id="producer-full" type="button" class="producer-secondary" ${isShared()?"disabled":""} title="Available only for local practice">✧ Draft 4-track loop</button>
       </div>
       <p class="producer-policy">${escapeText(statusText())}</p>
       ${lock?'<p class="producer-lock">Preview is available, but only the assigned seat owner can apply edits to a live room.</p>':""}
       ${notice?`<p class="producer-notice" role="status">${escapeText(notice)}</p>`:""}
       ${starter?`<article class="producer-full-card">
         <div class="producer-idea-top"><div><span class="producer-idea-index">FOUR TRACKS / LOCAL-ONLY DRAFT</span>
           <h4>${escapeText(starter.title)}</h4></div>
           <span class="producer-change-count">${starter.changes.length} STEPS CHANGED</span></div>
         <p>${escapeText(starter.rationale)} This is a listening draft, not an on-chain jam.</p>
         <div class="producer-full-lanes">${INSTRUMENTS.map(inst=>`<div class="producer-full-lane" style="--producer-lane:${COLORS[inst]}"><strong>${LABELS[inst]}</strong>${viewGrid(starter.pattern,inst,starter.changes.filter(x=>x.instrument===inst))}</div>`).join("")}</div>
         <div class="producer-idea-actions">
           <button id="producer-full-preview" type="button" class="producer-secondary" aria-pressed="${audition?.id===starter.id}">${audition?.id===starter.id?"■ Stop audition":"▶ Audition full beat"}</button>
           <button id="producer-full-apply" type="button" class="producer-apply">✓ Apply full beat</button>
         </div>
       </article>`:""}
       ${plans.length?`<div class="producer-cards">${plans.map(card).join("")}</div>`:
          '<div class="producer-empty"><span aria-hidden="true">♬</span><strong>Start with your sound.</strong><p>Pick a style and energy. The Producer will create three playable variants for the selected instrument.</p></div>'}
       <div class="producer-disclaimer">ON-DEVICE ARRANGEMENT ENGINE · RULE-BASED, NOT A TRAINED AI MODEL · NO NOTES SENT TO AN EXTERNAL API</div>
     </div>`:""}
   </section>`;
   root.querySelector("#producer-open")?.addEventListener("click",()=>{
     open=!open;
     if(!open){resetIdeas();}render();
   });
   root.querySelector("#producer-style")?.addEventListener("change",e=>{
     style=e.target.value;resetIdeas();render();
   });
   root.querySelector("#producer-energy")?.addEventListener("input",e=>{
     const next=Number(e.target.value);
     if(next===energy)return;
     energy=next;resetIdeas();render();
   });
   root.querySelector("#producer-full")?.addEventListener("click",()=>{
     if(isShared())return;
     try{
       resetIdeas();
       starter=generateFullBeat(actual(),{style,energy});
       notice="Complete 4-track draft ready. Audition or explicitly apply it to local practice.";
     }catch(error){notice=error.message;}
     render();
   });
   root.querySelector("#producer-full-preview")?.addEventListener("click",async()=>{
     if(!starter)return;
     if(!fullBeatIsCurrent(actual(),starter)){
       resetIdeas(false);notice="Your draft is stale. Generate another full beat.";render();return;
     }
     if(audition?.id===starter.id){
       audition=null;onStopPreview();notice="Full-beat audition closed.";
     }else{
       audition=starter;
       notice="Playing a complete four-instrument draft locally. Nothing is saved yet.";
       await onPreview(starter);
     }
     render();
   });
   root.querySelector("#producer-full-apply")?.addEventListener("click",()=>{
     if(!starter || isShared())return;
     if(!fullBeatIsCurrent(actual(),starter)){
       resetIdeas(false);notice="Full beat draft is stale. Try again.";render();return;
     }
     try{
       const count=onApplyFull(starter);
       audition=null;starter=null;plans=[];source=null;
       onStopPreview();
       notice=count+" local edits applied. Use Undo to restore the previous complete loop.";
     }catch(error){notice="Not applied: "+error.message;}
     render();
   });
   root.querySelector("#producer-generate")?.addEventListener("click",()=>{
     try{
       resetIdeas();source=snapshotSignature(actual(),instrument);
       plans=generateSuggestions(actual(),{instrument,style,energy});
       notice="Three drafts are ready. Audition first; Apply idea makes explicit edits.";
     }catch(error){notice=error.message;plans=[];}
     render();
   });
   root.querySelectorAll("[data-producer-preview]").forEach(button=>button.addEventListener("click",async()=>{
     const plan=plans[Number(button.dataset.producerPreview)];
     if(!plan)return;
     if(!suggestionIsCurrent(actual(),plan)){
       resetIdeas(false);notice="That idea is outdated. Generate again.";render();return;
     }
     if(audition?.id===plan.id){
       audition=null;onStopPreview();notice="Audition closed. Original loop restored.";
     }else{
       audition=plan;notice="Auditioning a draft. Nothing is saved or sent to Monad.";
       await onPreview(plan);
     }
     render();
   }));
   root.querySelectorAll("[data-producer-apply]").forEach(button=>button.addEventListener("click",()=>{
     const plan=plans[Number(button.dataset.producerApply)];
     if(!plan)return;
     if(!suggestionIsCurrent(actual(),plan)){
       resetIdeas(false);notice="The loop changed. Regenerate before applying.";render();return;
     }
     if(!canCommit(plan.instrument)){
       notice="Read-only: this wallet is not allowed to edit the selected lane.";render();return;
     }
     try{
       // Explicit click only. In a shared room, onApply enqueues wallet-authorized edits.
       const count=onApply(plan);
       audition=null;plans=[];source=null;
       onStopPreview();
       notice=isShared()?`${count} edits queued. They count only after on-chain confirmation.`:
         `${count} edits applied to your local loop. Undo is available.`;
     }catch(error){
       notice="Not applied: "+error.message;
     }
     render();
   }));
 }
 render();
 return {
   invalidate,
   onInstrumentChange(){resetIdeas();render();},
   onRoomChange(){resetIdeas();render();},
   clear(){resetIdeas();render();},
   isAuditioning(){return Boolean(audition)},
   dispose(){resetIdeas();root.innerHTML="";}
 };
}
