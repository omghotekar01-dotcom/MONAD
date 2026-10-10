import type { Instrument } from './beat-drop';

/** UI safety cap for TESTNET tipping, not a smart-contract spending limit. */
export const MAX_UI_TIP_WEI=10n*10n**18n;

/** Never use Number() for 18-decimal native-currency validation. */
export function parseSafeTestTip(value:string):bigint{
 const trimmed=value.trim();
 if(!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,18})?$/.test(trimmed))
   throw new Error('Enter a normal positive MON amount, with at most 18 decimal places.');
 const [whole,fraction='']=trimmed.split('.');
 const amount=BigInt(whole!)*10n**18n+BigInt((fraction+'0'.repeat(18)).slice(0,18));
 if(amount===0n)throw new Error('Tip amount must be greater than zero.');
 if(amount>MAX_UI_TIP_WEI)
   throw new Error('For testnet safety, the website limits individual tips to 10 test MON.');
 return amount;
}

/** A single on-chain note batch always belongs to exactly ONE instrument. */
export function validateNoteBatch(
 instrument:Instrument,
 edits:readonly {step:number;value:number}[]
):void{
 if(!['drums','bass','synth','pluck'].includes(instrument))
   throw new Error('Unsupported instrument lane.');
 if(edits.length===0||edits.length>16)
   throw new Error('A Monad edit transaction requires between 1 and 16 cells.');
 const seen=new Set<number>();
 for(const edit of edits){
   const max=instrument==='drums'?15:16;
   if(!Number.isInteger(edit.step)||edit.step<0||edit.step>=16||
      !Number.isInteger(edit.value)||edit.value<0||edit.value>max)
      throw new Error('A note step or pitch is outside the on-chain range.');
   if(seen.has(edit.step))throw new Error('Duplicate step in one transaction; refresh before retrying.');
   seen.add(edit.step);
 }
}
