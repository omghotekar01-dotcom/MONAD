import type { ChainActivityItem, ChainEventName } from '@/services/monad-bridge';

export interface TransactionSummary {
  hash:string;block:number;name:ChainEventName;instrument:number|null;
  owner:string|null;operator:string|null;amount:string|null;
  count:number;steps:number[];events:ChainActivityItem[];
}
export function summarizeTransactions(events:ChainActivityItem[]):TransactionSummary[]{
 const groups=new Map<string,TransactionSummary>();
 for(const event of events){
   const key=event.hash+'|'+event.name+(event.name==='NoteSet'?'|'+event.instrument:'');
   const old=groups.get(key);
   if(old){old.count++;old.events.push(event);if(event.step!==null)old.steps.push(event.step+1);}
   else groups.set(key,{
      hash:event.hash,block:event.block,name:event.name,instrument:event.instrument,
      owner:event.owner,operator:event.operator,amount:event.amount,count:1,
      steps:event.step===null?[]:[event.step+1],events:[event]
   });
 }
 return [...groups.values()].sort((a,b)=>b.block-a.block||b.events[0]!.index-a.events[0]!.index);
}
export const ACTIVITY_LABELS:Record<ChainEventName,string>={
 RoomCreated:'Jam created',SeatAssigned:'Seat assigned',RoomStarted:'90-second jam started',
 NoteSet:'Musical notes recorded',RoomFinalized:'Beat finalized',
 TipReceived:'Testnet MON tip received',TipAllocated:'Contributor allocation',
 Claimed:'Testnet MON claimed',SessionAuthorized:'Session authorized',SessionRevoked:'Session revoked'
};
export const INSTRUMENT_NAMES=['Drums','Bass','Synth','Pluck'] as const;
