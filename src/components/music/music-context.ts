import { createContext, useContext } from 'react';
import type { Pattern, Instrument } from '@/lib/beat-drop';

export interface MusicState { pattern:Pattern; instrument:Instrument; setInstrument:(i:Instrument)=>void; selectedNote:number; setSelectedNote:(n:number)=>void; playing:boolean; step:number; armed:boolean; setArmed:(v:boolean)=>void; title:string; load:(p:Pattern,title:string)=>void; toggle:()=>Promise<void>; stop:()=>void; edit:(i:Instrument,s:number,n:number)=>void; replace:(p:Pattern)=>void; sync:(p:Pattern)=>void; setEditHandler:(callback:((i:Instrument,step:number,note:number,record:boolean)=>void)|null)=>void; undo:()=>void; trigger:(i:Instrument,n:number,record?:boolean)=>Promise<void>; volume:number; setVolume:(n:number)=>void; unlocked:boolean }

// Context identity must survive provider Fast Refresh updates.
export const MusicContext = createContext<MusicState | null>(null);
export function useMusic() {
  const context = useContext(MusicContext);
  if (!context) throw new Error('MusicProvider missing');
  return context;
}