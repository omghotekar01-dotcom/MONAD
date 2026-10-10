import type { Pattern, Instrument } from '@/lib/beat-drop';
// The proven Vite/viem adapter was implemented before the TanStack UI migration.
// @ts-ignore legacy ESM module has no published TypeScript declarations
import * as chain from '../chain.js';
// @ts-ignore legacy ESM module has no published TypeScript declarations
import { encodeCell, decodeCell, ZERO_ADDRESS } from '../room-utils.js';
import { instruments, validPattern } from '@/lib/beat-drop';

export const chainConfigured: boolean = chain.CONTRACT_READY;
export const explorerBase: string = chain.EXPLORER;
export const faucetUrl: string = chain.FAUCET;
export const monadId = 10143;
export const isOnChainId=(id:string)=>/^[1-9]\d{0,14}$/.test(id);

export interface ChainRoom {
  id:string; name:string; host:string; phase:'Lobby'|'Live'|'Finalized';
  seats:(string|null)[]; startedAt:number; endsAt:number; finalizedAt:number;
  eligibleMask:number; totalTipped:bigint; totalClaimed:bigint;
  pattern:Pattern; chainTime:number; chainObservedAt:number;
}
export function patternToChain(pattern:Pattern):Record<Instrument,number[][]>{
  if(!validPattern(pattern))throw new Error('Invalid music pattern.');
  return Object.fromEntries(instruments.map(inst=>[inst,pattern[inst].map(value=>decodeCell(inst,value))])) as Record<Instrument,number[][]>;
}
export function patternFromChain(data:Record<Instrument,number[][]>):Pattern {
  return Object.fromEntries(instruments.map(inst=>[inst,data[inst].map(cell=>encodeCell(inst,cell))])) as Pattern;
}
export const sameWallet=(left?:string|null,right?:string|null)=>Boolean(left&&right&&left.toLowerCase()===right.toLowerCase());
export const abbreviatedWallet=(wallet?:string|null)=>wallet?wallet.slice(0,6)+'…'+wallet.slice(-4):'Open seat';
export async function connectMainWallet():Promise<string>{return await chain.connectWallet();}
export async function refreshMainWallet():Promise<string|null>{return await chain.refreshWallet();}
export function currentMainWallet():string|null {return chain.walletAddress();}
export function watchWallet(callback:(address:string|null)=>void):()=>void{return chain.walletEvents(callback);}
export function transactionExplorer(hash:string){return chain.explorerTx(hash);}
export function ensureContract(){if(!chainConfigured)throw new Error('Deploy BeatDrop.sol on Monad Testnet (10143), then set VITE_BEATDROP_ADDRESS. Live rooms are disabled without a contract.');}
export async function fetchChainRoom(id:string):Promise<ChainRoom>{
  ensureContract();if(!isOnChainId(id))throw new Error('Invalid on-chain room ID.');
  const raw=await chain.readRoom(id);
  return {id:String(raw.id),name:raw.name,host:raw.host,
    phase:raw.phase,seats:raw.seats.map((s:string)=>s.toLowerCase()===ZERO_ADDRESS?null:s),
    startedAt:raw.startedAt,endsAt:raw.endsAt,finalizedAt:raw.finalizedAt,
    eligibleMask:raw.eligibleMask,totalTipped:raw.totalTipped,totalClaimed:raw.totalClaimed,
    pattern:patternFromChain(raw.pattern),chainTime:raw.chainTime,chainObservedAt:raw.chainObservedAt
  };
}
export async function listChainRooms(limit=12):Promise<ChainRoom[]>{
  ensureContract();
  const next=Number(await chain.nextRoomId());
  const ids=Array.from({length:Math.min(Math.max(next-1,0),limit)},(_,i)=>String(next-1-i));
  const outcomes=await Promise.allSettled(ids.map(fetchChainRoom));
  return outcomes.filter((r):r is PromiseFulfilledResult<ChainRoom>=>r.status==='fulfilled').map(r=>r.value);
}
export async function createChainRoom(name:string, onHash?:(hash:string)=>void):Promise<string>{
  ensureContract();
  const nameBytes=new TextEncoder().encode(name.trim());
  if(!nameBytes.length||nameBytes.length>31)throw new Error('Name must contain 1–31 UTF-8 bytes.');
  const result=await chain.createRoom(name,onHash);return String(result.roomId);
}
export async function assignChainSeat(id:string,index:number,address:string,onHash?:(hash:string)=>void){
  if(index<0||index>=4||!Number.isInteger(index))throw new Error('Invalid seat.');
  return chain.assignSeat(id,index,address,onHash);
}
export async function startChainRoom(id:string,onHash?:(hash:string)=>void){return chain.startRoom(id,onHash);}
export async function finalizeChainRoom(id:string,onHash?:(hash:string)=>void){return chain.finalizeRoom(id,onHash);}
export async function tipChainRoom(id:string,amount:string,onHash?:(hash:string)=>void){return chain.tipRoom(id,amount,onHash);}
export async function claimChainRoom(id:string,onHash?:(hash:string)=>void){return chain.claimRoom(id,onHash);}
export async function claimableChainRoom(id:string,address:string):Promise<bigint>{return chain.readClaim(id,address);}
export async function sendChainNotes(id:string,instrument:Instrument,values:{step:number;value:number}[],owner:string,onHash?:(hash:string)=>void,session=false){
  if(!values.length)return;
  if(!values.every(x=>Number.isInteger(x.step)&&x.step>=0&&x.step<16&&Number.isInteger(x.value)&&x.value>=0&&x.value<=(instrument==='drums'?15:16)))throw new Error('Invalid step or pitch');
  const sorted=[...values].sort((a,b)=>a.step-b.step);
  return chain.submitBatch(id,instruments.indexOf(instrument),sorted.map(x=>x.step),sorted.map(x=>x.value),owner,onHash,session);
}
export async function authorizeChainSession(id:string,onHash?:(hash:string)=>void){return chain.authorizeSession(id,onHash);}
export async function revokeChainSession(id:string,onHash?:(hash:string)=>void){return chain.revokeSession(id,onHash);}
export async function fundChainSession(amount:string,onHash?:(hash:string)=>void){return chain.fundSession(amount,onHash);}
export const chainSessionActive=(id:string)=>chain.sessionActive(id);
export const chainSessionAddress=():string|null=>chain.sessionAddress();
export function formatTestMon(value:bigint){return chain.formatMon(value);}
export const chainError=(error:unknown)=>chain.getErrorMessage(error);
