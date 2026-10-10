import { useEffect, useRef, useState } from 'react';
import { Sparkles, Play, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMusic } from './music-context';
import { audioEngine } from '@/services/audio-engine';
import { patternToChain, patternFromChain } from '@/services/monad-bridge';
import type { Instrument, Pattern } from '@/lib/beat-drop';
import { instruments } from '@/lib/beat-drop';
import { toast } from 'sonner';
// @ts-ignore Proven pure JS generator from the original Beat Drop music engine
import { GENRES, ENERGIES, generateSuggestions, suggestionIsCurrent, generateFullBeat, fullBeatIsCurrent } from '../../producer.js';
type Proposal={id:string;title:string;rationale:string;instrument:Instrument;pattern:Record<Instrument,number[][]>;changes:Array<{step:number;before:number[];after:number[]}>};
type FullProposal={id:string;title:string;pattern:Record<Instrument,number[][]>;changes:Array<{instrument:Instrument;step:number}>};
const genreOptions=['house','lofi','trap','ambient'];
export function NativeProducer({allowed,shared=false,onApprove}:{allowed:(instrument:Instrument)=>boolean;shared?:boolean;onApprove?:(instrument:Instrument,updates:Array<{step:number;value:number}>,draft:Pattern)=>boolean}){
 const m=useMusic();
 const [style,setStyle]=useState('house'),[energy,setEnergy]=useState(2),[ideas,setIdeas]=useState<Proposal[]>([]),[full,setFull]=useState<FullProposal|null>(null);
 const [notice,setNotice]=useState(''),[audition,setAudition]=useState('');
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 const source=()=>patternToChain(m.pattern);
 const reset=()=>{setIdeas([]);setFull(null);setNotice('');setAudition('');};
 const generate=()=>{
   try{const result=generateSuggestions(source(),{instrument:m.instrument,style,energy}) as Proposal[];
     setIdeas(result);setFull(null);setNotice('Three drafts ready. Listen before applying.');}
   catch(e){toast.error(e instanceof Error?e.message:'Could not generate.');}
 };
 const generateAll=()=>{if(shared)return;try{const result=generateFullBeat(source(),{style,energy}) as FullProposal;
     setFull(result);setIdeas([]);setNotice('Four-track draft ready. Nothing has been saved yet.');}
   catch(e){toast.error(e instanceof Error?e.message:'Could not generate full beat.');}
 };
 const preview=async(id:string,pattern:Pattern)=>{
   if(timer.current){clearTimeout(timer.current);timer.current=null;}
   audioEngine.stop();m.stop();
   if(audition===id){setAudition('');setNotice('Audition stopped. Your original loop is unchanged.');return;}
   try{await audioEngine.play(()=>pattern,()=>{});setAudition(id);
      setNotice('Listening only: no notes are saved or submitted on-chain.');
      timer.current=setTimeout(()=>{audioEngine.stop();setAudition('');timer.current=null;},2050);
   }catch{toast.error('Could not start the audio audition.');}
 };
 const approve=(proposal:Proposal)=>{
   if(!allowed(proposal.instrument)){toast.error('This instrument is not available to edit.');return;}
   if(!suggestionIsCurrent(source(),proposal)){toast.error('The loop changed. Generate fresh suggestions.');reset();return;}
   if(timer.current)clearTimeout(timer.current);audioEngine.stop();setAudition('');
   const converted=patternFromChain(proposal.pattern);
   if(shared){
     if(!onApprove){toast.error('Shared-room approval is not connected. No edits were submitted.');return;}
     const changed=proposal.changes.map(change=>({step:change.step,value:converted[proposal.instrument][change.step]??0}));
     if(!onApprove(proposal.instrument,changed,converted))return;
     setNotice('Approved changes queued. Only accepted Monad transactions earn contributor credit.');
   }else{
     m.replace(converted);setNotice('Idea applied. Use Undo to restore your earlier loop.');
   }
   setIdeas([]);toast.success(shared?'Changes queued for testnet confirmation':'Instrument idea applied.');
 };
 const approveFull=()=>{if(!full||shared)return;
   if(!fullBeatIsCurrent(source(),full)){toast.error('The loop changed. Generate a new draft.');reset();return;}
   if(timer.current)clearTimeout(timer.current);audioEngine.stop();setAudition('');
   m.replace(patternFromChain(full.pattern));setFull(null);setNotice('Full beat applied as one undoable edit.');toast.success('Four-track beat ready.');
 };
 const MiniBar=({pattern,inst}:{pattern:Record<Instrument,number[][]>;inst:Instrument})=><div className="grid grid-cols-16 gap-0.5 h-4 mt-3" aria-label={inst+' proposed sixteen-step pattern'}>
   {pattern[inst].map((cell,index)=><span key={index} className={`rounded-[2px] ${cell.length?'bg-mint-foreground':'bg-secondary'}`} title={'Step '+(index+1)}/>)}</div>;
 return <div className="space-y-4">
   <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center"><Sparkles className="size-4"/></div>
   <h3 className="text-sm font-semibold">A little creative nudge.</h3>
   <p className="text-[11px] text-muted-foreground leading-5">On-device, rule-based Producer. Three explainable drafts in your chosen style. No model subscriptions or hidden edits.</p>
   <label className="block text-[11px] font-semibold">Style
     <select className="field mt-2 text-xs h-10" aria-label="Producer genre" value={style} onChange={e=>{setStyle(e.target.value);reset();}}>
       {genreOptions.map(x=><option key={x} value={x}>{(GENRES as Record<string,{label:string}>)[x]?.label??x}</option>)}
     </select>
   </label>
   <label className="block text-[11px] font-semibold">Energy · {(ENERGIES as Record<number,string>)[energy]}
     <input className="w-full accent-mint-foreground mt-3" aria-label="Producer energy" type="range" min="1" max="3" step="1" value={energy}
       onChange={e=>{setEnergy(Number(e.target.value));reset();}}/>
   </label>
   <p className="text-[10px] text-muted-foreground">Editing <strong className="capitalize">{m.instrument}</strong> · 16-step bar · 120 BPM</p>
   <Button className="w-full text-xs" onClick={generate} disabled={!allowed(m.instrument)}><Sparkles/>Generate 3 ideas</Button>
   {!shared&&<Button variant="outline" className="w-full text-xs" onClick={generateAll}>Draft full 4-track beat</Button>}
   {shared&&<p className="text-[10px] text-muted-foreground">Full-beat generation is reserved for solo practice; shared seats remain isolated.</p>}
   {notice&&<p role="status" className="text-[11px] text-muted-foreground leading-relaxed">{notice}</p>}
   {ideas.map((idea,i)=><div key={idea.id} className="studio-surface p-3">
      <div className="flex justify-between gap-2"><h4 className="text-xs font-semibold">{i+1}. {idea.title}</h4><span className="text-[10px] text-muted-foreground">{idea.changes.length} changes</span></div>
      <p className="text-[10px] text-muted-foreground leading-4 mt-2">{idea.rationale}</p>
      <MiniBar pattern={idea.pattern} inst={idea.instrument}/>
      <div className="flex gap-2 mt-4">
        <Button size="sm" variant="outline" className="flex-1 text-[10px]" onClick={()=>void preview(idea.id,patternFromChain(idea.pattern))}>{audition===idea.id?'Stop':'Audition'}<Play/></Button>
        <Button size="sm" className="flex-1 text-[10px]" onClick={()=>approve(idea)}>Apply<Check/></Button>
      </div>
    </div>)}
   {full&&<div className="studio-surface p-3"><h4 className="text-xs font-semibold">Complete 4-track arrangement</h4>
      <p className="text-[10px] text-muted-foreground mt-2">{full.changes.length} proposed step updates. Your earlier loop is preserved until approval.</p>
      {instruments.map(inst=><div key={inst} className="mt-3"><span className="capitalize text-[10px]">{inst}</span><MiniBar pattern={full.pattern} inst={inst}/></div>)}
      <div className="flex gap-2 mt-4"><Button variant="outline" className="flex-1 text-[10px]" size="sm" onClick={()=>void preview(full.id,patternFromChain(full.pattern))}>Audition<Play/></Button>
        <Button className="flex-1 text-[10px]" size="sm" onClick={approveFull}>Apply full beat<Check/></Button></div>
   </div>}
   <p className="text-[9px] tracking-wide text-muted-foreground border-t border-border pt-3">LOCAL ARRANGEMENT ENGINE · NO TRAINED AI MODEL · YOU CONTROL EVERY APPROVAL</p>
 </div>;
}
