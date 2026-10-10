import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { audioEngine } from '@/services/audio-engine';
import { samplePattern, editStep, recordStep, type Pattern, type Instrument } from '@/lib/beat-drop';
import { toast } from 'sonner';
import { MusicContext } from './music-context';
export function MusicProvider({children}:{children:ReactNode}) {
  const [pattern,setPattern]=useState<Pattern>(samplePattern());const patternRef=useRef(pattern);
  const [instrument,setInstrument]=useState<Instrument>('drums');const [playing,setPlaying]=useState(false);const [step,setStep]=useState(-1);const [armed,setArmed]=useState(false);const [title,setTitle]=useState('Mint condition');const [volume,setVolumeState]=useState(.65);const [unlocked,setUnlocked]=useState(false);
  const history=useRef<Pattern[]>([]);const generation=useRef(0);
  const remoteEdit=useRef<((instrument:Instrument,step:number,note:number,record:boolean)=>void)|null>(null);
  const setEditHandler=useCallback((fn:((instrument:Instrument,step:number,note:number,record:boolean)=>void)|null)=>{remoteEdit.current=fn;},[]);
  const sync=useCallback((p:Pattern)=>{patternRef.current=p;setPattern(p);},[]);
  const replace=useCallback((p:Pattern)=>{history.current.push(patternRef.current);patternRef.current=p;setPattern(p);},[]);
  const edit=useCallback((i:Instrument,s:number,n:number)=>{
    if(remoteEdit.current){remoteEdit.current(i,s,n,false);return;}
    replace(editStep(patternRef.current,i,s,n));
  },[replace]);
  const stop=useCallback(()=>{generation.current++;audioEngine.stop();setPlaying(false);setStep(-1);},[]);
  useEffect(()=>{
    // TanStack SSR paints instantly; mark the control surface ready only
    // after React's click and keyboard handlers have been attached.
    document.documentElement.dataset['beatDropHydrated']='true';
    return()=>{delete document.documentElement.dataset['beatDropHydrated'];};
  },[]);
  useEffect(()=>()=>{audioEngine.stop();},[]);
  const toggle=async()=>{if(playing){stop();return;}const current=++generation.current;try{await audioEngine.unlock();setUnlocked(true);if(current!==generation.current)return;audioEngine.volume(volume);await audioEngine.play(()=>patternRef.current,setStep);if(current!==generation.current){audioEngine.stop();return;}setPlaying(true);}catch{toast.error('Audio could not start. Please try again.');}};
  const trigger=async(i:Instrument,n:number,record=true)=>{try{await audioEngine.unlock();setUnlocked(true);audioEngine.volume(volume);audioEngine.trigger(i,n);if(record&&armed&&step>=0){
        if(remoteEdit.current)remoteEdit.current(i,step,n,true);
        else replace(recordStep(patternRef.current,i,step,n));
      }}catch{toast.error('Please enable audio to play.');}};
  const load=(p:Pattern,t:string)=>{stop();history.current=[];patternRef.current=p;setPattern(p);setTitle(t);setArmed(false);};
  const undo=()=>{if(remoteEdit.current){toast('To reverse a live edit, tap that step again. The change must also be approved on Monad.');return;}
    const p=history.current.pop();if(p){patternRef.current=p;setPattern(p);}else toast('Nothing to undo yet.');};
  const setVolume=(n:number)=>{setVolumeState(n);audioEngine.volume(n);};
  return <MusicContext.Provider value={{pattern,instrument,setInstrument,playing,step,armed,setArmed,title,load,toggle,stop,edit,replace,sync,setEditHandler,undo,trigger,volume,setVolume,unlocked}}>{children}</MusicContext.Provider>;
}