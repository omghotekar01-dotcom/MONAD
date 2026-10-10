import {validPattern,type Pattern} from './beat-drop';

const KEY='beat-drop/chain-draft/v1';
export interface SongDraft {title:string;tempo:number;pattern:Pattern;createdAt:number}
export function saveChainDraft(title:string,tempo:number,pattern:Pattern){
 if(!validPattern(pattern))throw new Error('Invalid song grid.');
 if(typeof window==='undefined')throw new Error('Browser not available.');
 const body:SongDraft={title:title.slice(0,31),tempo,pattern,createdAt:Date.now()};
 window.localStorage.setItem(KEY,JSON.stringify(body));
 return body;
}
export function readChainDraft():SongDraft|null{
 if(typeof window==='undefined')return null;
 try{
  const raw=window.localStorage.getItem(KEY);
  if(!raw)return null;
  const data=JSON.parse(raw) as SongDraft;
  if(!data||typeof data.title!=='string'||data.title.length>31||typeof data.tempo!=='number'||!validPattern(data.pattern))return null;
  return data;
 }catch{return null;}
}
export function clearChainDraft(){
 if(typeof window!=='undefined')window.localStorage.removeItem(KEY);
}
export function draftStepCount(pattern:Pattern){
 return Object.values(pattern).reduce((total,lane)=>total+lane.filter(n=>n!==0).length,0);
}
