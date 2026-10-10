import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Circle, Undo2, Volume2, VolumeX, Download, Upload, Drum, AudioLines, Piano, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMusic } from './music-context';
import { instruments, drumNames, keys, pitches, validPattern, type Instrument } from '@/lib/beat-drop';
import { audioEngine } from '@/services/audio-engine';
import { toast } from 'sonner';
export const instrumentIcons = { drums:Drum,bass:AudioLines,synth:Piano,pluck:Waves };
export function Waveform({className=''}:{className?:string}) {
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{let frame=0;const draw=()=>{const canvas=ref.current;const ctx=canvas?.getContext('2d');if(canvas&&ctx){const values=audioEngine.waveform();ctx.clearRect(0,0,canvas.width,canvas.height);ctx.strokeStyle=getComputedStyle(canvas).color;ctx.lineWidth=1.8;ctx.beginPath();values.forEach((v,i)=>{const x=i/values.length*canvas.width,y=canvas.height/2+v*canvas.height*.85;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});ctx.stroke();}frame=requestAnimationFrame(draw);};draw();return()=>cancelAnimationFrame(frame);},[]);
  return <canvas ref={ref} width={360} height={60} aria-label="Actual audio waveform" className={`w-full h-10 text-mint-foreground ${className}`}/>;
}
export function MiniSteps({instrument='drums',variant=0}:{instrument?:Instrument;variant?:number}) { return <div className={`mini-steps instrument-${instrument}`} aria-hidden="true">{Array.from({length:24},(_,i)=><i key={i} style={{height:`${5+((i*13+variant*7)%22)}px`}}/>)}</div>; }
export function Sequencer({editable=false,allowed=()=>true}:{editable?:boolean;allowed?:(i:Instrument)=>boolean}) {
  const m=useMusic();const voice=m.selectedNote>=1&&m.selectedNote<=4?m.selectedNote:1;
  const note=m.selectedNote>=1&&m.selectedNote<=16?m.selectedNote:6;
  return <div><div className="sequencer-scroll"><div className="sequencer-inner"><div className="grid grid-cols-[64px_1fr] gap-3 mb-3"><span className="eyebrow self-end">Tracks</span><div className="step-grid">{Array.from({length:16},(_,s)=><span className={`text-[9px] text-center tabular-nums ${m.step===s?'text-foreground font-bold':'text-muted-foreground'}`} key={s}>{String(s+1).padStart(2,'0')}</span>)}</div></div>
    {instruments.map(i=><div className={`grid grid-cols-[64px_1fr] items-center gap-3 mb-2 instrument-${i}`} key={i}><Button variant="ghost" className="p-0 justify-start capitalize text-xs h-8 instrument-color" onClick={()=>m.setInstrument(i)}>{i}</Button><div className="step-grid">{m.pattern[i].map((n,s)=><Button variant="ghost" key={s} className={`step-cell ${n?'on':''} ${m.step===s?'current':''}`} aria-label={`${i} step ${s+1}, ${n?'note '+n:'rest'}`} aria-pressed={n>0} disabled={!editable||!allowed(i)} onClick={()=>{const chosen=m.instrument===i?(i==='drums'?voice:note):(i==='drums'?1:6);if(m.instrument!==i)m.setInstrument(i);m.edit(i,s,chosen);}}>{i==='drums'?<span className="grid grid-cols-2 gap-0.5">{[0,1,2,3].map(bit=><i key={bit} className={`w-1 h-1 rounded-full ${n&(1<<bit)?'bg-foreground/60':'bg-foreground/10'}`}/>)}</span>:<span className="text-[9px] opacity-65">{n?pitches[n-1]:''}</span>}</Button>)}</div></div>)}</div></div>
    {editable&&m.instrument==='drums'&&<div className="flex flex-wrap items-center gap-2 mt-4"><span className="text-xs text-muted-foreground mr-1">Drum voice</span>{drumNames.map((name,n)=><Button key={name} size="sm" variant={voice===n+1?'secondary':'ghost'} onClick={()=>m.setSelectedNote(n+1)}>{name}</Button>)}</div>}
    {editable&&m.instrument!=='drums'&&<div className="flex flex-wrap items-center gap-3 mt-4"><label className="text-xs text-muted-foreground" htmlFor="sequencer-pitch">Note to place</label><select id="sequencer-pitch" className="field h-8 w-24 text-xs" value={note} onChange={e=>m.setSelectedNote(Number(e.target.value))}>{pitches.map((p,n)=><option key={p} value={n+1}>{p}</option>)}</select><span className="text-[11px] text-muted-foreground">Tap a performance key below to change the selected note.</span></div>}
  </div>;
}
export function InstrumentSelector({allowed=()=>true}:{allowed?:(i:Instrument)=>boolean}) {
  const m=useMusic();return <div className="grid grid-cols-4 gap-2 sm:gap-3">{instruments.map((i,n)=>{const Icon=instrumentIcons[i];return <Button variant="outline" key={i} aria-pressed={m.instrument===i} onClick={()=>m.setInstrument(i)} className={`instrument-${i} h-auto min-h-20 flex-col items-start px-3 sm:px-4 py-3 ${m.instrument===i?'instrument-selected':''}`}><div className="flex w-full items-center justify-between"><Icon className="instrument-color"/><span className="text-[10px] text-muted-foreground">0{n+1}</span></div><span className="capitalize text-xs sm:text-sm mt-2">{i}</span><span className="text-[10px] text-muted-foreground font-normal">{!allowed(i)?'Listen only':m.instrument===i?'✓ Selected — play below':'Click to select'}</span></Button>;})}</div>;
}
export function PerformanceKeyboard({allowed=()=>true}:{allowed?:(i:Instrument)=>boolean}) {
  const m=useMusic();const [held,setHeld]=useState<Set<number>>(new Set());const current=useRef(m);const permitted=useRef(allowed);current.current=m;permitted.current=allowed;
  const press=(n:number)=>{if(!permitted.current(current.current.instrument)){toast('This instrument belongs to another seat.');return;}setHeld(h=>new Set(h).add(n));void current.current.trigger(current.current.instrument,n+1);};
  const release=(n:number)=>setHeld(h=>{const next=new Set(h);next.delete(n);return next;});
  useEffect(()=>{const down=(event:KeyboardEvent)=>{if(event.repeat||event.ctrlKey||event.metaKey||event.altKey||event.target instanceof HTMLElement&&(event.target.closest('input,textarea,select,button,a,[role=button],[contenteditable=true]')))return;const key=event.key.toLowerCase();if(['1','2','3','4'].includes(key)){const selected=instruments[Number(key)-1];if(selected)current.current.setInstrument(selected);return;}if(event.code==='Space'){event.preventDefault();current.current.setArmed(!current.current.armed);return;}if(key==='z'){current.current.undo();return;}const n=keys.indexOf(key);if(n>=0&&(current.current.instrument!=='drums'||n<4)){event.preventDefault();press(n);}};const up=(event:KeyboardEvent)=>{const n=keys.indexOf(event.key.toLowerCase());if(n>=0)release(n);};const blur=()=>setHeld(new Set());window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);};},[]);
  useEffect(()=>setHeld(new Set()),[m.instrument]);
  const count=m.instrument==='drums'?4:16;
  return <div className={`instrument-${m.instrument}`}><div className={`grid gap-2 ${count===4?'grid-cols-4':'grid-cols-8'}`}>{Array.from({length:count},(_,n)=><Button variant="ghost" key={n} className={`performance-key ${held.has(n)?'down':''} ${m.selectedNote===n+1?'selected-note':''}`} disabled={!allowed(m.instrument)} aria-label={`Play ${m.instrument==='drums'?drumNames[n]:pitches[n]}`} aria-pressed={m.selectedNote===n+1} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);press(n);}} onPointerUp={()=>release(n)} onPointerCancel={()=>release(n)} onClick={e=>{if(e.detail===0){press(n);setTimeout(()=>release(n),130);}}}><span className="text-[10px] sm:text-xs">{m.instrument==='drums'?drumNames[n]:pitches[n]}</span><kbd className="text-[10px] text-muted-foreground uppercase">{keys[n]}</kbd></Button>)}</div></div>;
}
export function Transport({save=true}:{save?:boolean}) {
 const m=useMusic();const input=useRef<HTMLInputElement>(null);
 const exportLoop=()=>{
   const blob=new Blob([JSON.stringify({name:m.title,bpm:120,steps:16,pattern:m.pattern},null,2)],{type:'application/json'});
   const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;
   link.download='beat-drop-loop.json';link.click();URL.revokeObjectURL(url);
   toast.success('Loop exported to Downloads.');
 };
 const recordStatus=m.armed
   ?(m.playing?'Recording is armed. Play the pads to add notes at the current step.':'Ready to record. Press Play loop, then tap the instrument keys.')
   :(m.playing?'Playing your 16-step loop. Tap keys to improvise; Arm record to save your notes.':
     'Ready. Press Play loop to hear all four tracks together.');
 return <div className="studio-transport" aria-label="Music playback and recording controls">
   <div className="studio-transport-main">
     <div className="studio-transport-buttons">
       <Button title={m.playing?'Pause the loop':'Play all four instruments'} aria-label={m.playing?'Pause beat':'Play beat'}
         className="studio-transport-play" onClick={()=>void m.toggle()}>
         {m.playing?<Pause className="size-4"/>:<Play className="size-4"/>}{m.playing?'Pause loop':'Play loop'}
       </Button>
       <Button variant="outline" title="Stop playback" aria-label="Stop beat"
         onClick={m.stop}><RotateCcw className="size-4"/>Stop</Button>
       <Button variant={m.armed?'destructive':'outline'} title={m.armed?'Disarm recording':'Arm recording'}
         aria-label="Arm recording" aria-pressed={m.armed} onClick={()=>m.setArmed(!m.armed)}>
         <Circle className={`size-4 ${m.armed?'fill-current':''}`}/>{m.armed?'Record armed':'Arm record'}
       </Button>
       <Button variant="ghost" aria-label="Undo edit" title="Undo your last edit"
         onClick={m.undo}><Undo2 className="size-4"/>Undo</Button>
     </div>
     <div className="studio-transport-utilities">
       <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">120 BPM · 4/4</span>
       <Button variant="ghost" size="icon" aria-label="Toggle master mute" title={m.volume?'Mute':'Unmute'} onClick={()=>m.setVolume(m.volume>0?0:.65)}>{m.volume?<Volume2/>:<VolumeX/>}</Button>
       <label htmlFor="studio-master-volume" className="text-[10px] text-muted-foreground sr-only">Master volume</label>
       <input id="studio-master-volume" aria-label="Master volume" type="range" min="0" max="1" step=".01" value={m.volume}
         onChange={e=>m.setVolume(Number(e.target.value))} className="studio-master-volume accent-mint-foreground"/>
       {save&&<><Button size="sm" variant="outline" aria-label="Export loop" title="Download beat as JSON" onClick={exportLoop}><Download className="size-4"/>Save file</Button>
          <Button size="sm" variant="ghost" aria-label="Import loop" title="Load beat from JSON" onClick={()=>input.current?.click()}><Upload className="size-4"/>Open file</Button>
          <input ref={input} type="file" accept="application/json" className="hidden" onChange={async e=>{
            const file=e.target.files?.[0];if(!file)return;
            try{const data=JSON.parse(await file.text());if(!validPattern(data.pattern))throw new Error('Invalid beat');
               m.load(data.pattern,typeof data.name==='string'?data.name.slice(0,80):'Imported loop');
               toast.success('Loop imported.');
            }catch{toast.error('Choose a valid 16-step BEAT DROP loop.');}e.target.value='';
          }}/>
        </>}
     </div>
   </div>
   <p className="studio-transport-status" role="status">
     <span className={`studio-transport-led ${m.playing?'running':''} ${m.armed?'recording':''}`} aria-hidden="true"/>
     {recordStatus}
   </p>
 </div>;
}
