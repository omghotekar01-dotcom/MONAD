import { useState } from 'react';
import { Activity, ExternalLink, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { abbreviatedWallet, explorerBase, fetchRoomActivity, transactionExplorer, chainError, formatTestMon } from '@/services/monad-bridge';
import { summarizeTransactions, ACTIVITY_LABELS, INSTRUMENT_NAMES } from '@/lib/chain-activity';
import type { ChainActivity } from '@/services/monad-bridge';

/** Honest RPC-backed event view. No sample or local edits presented as chain records. */
export function MonadActivity({roomId}:{roomId:string}){
 const [data,setData]=useState<ChainActivity|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const refresh=async()=>{
   if(loading)return;setLoading(true);setError('');
   try{setData(await fetchRoomActivity(roomId));}
   catch(e){setError(chainError(e));setData(null);}
   finally{setLoading(false);}
 };
 const txs=summarizeTransactions(data?.events??[]);
 return <section className="studio-surface p-5 sm:p-6" aria-label="Monad transaction explorer">
   <div className="flex flex-wrap justify-between items-start gap-4">
     <div><p className="eyebrow mb-2">VERIFIED MONAD TESTNET ACTIVITY</p>
       <h2 className="section-title flex items-center gap-2"><Activity className="size-4"/>What happened on-chain?</h2>
       <p className="text-xs text-muted-foreground mt-2 max-w-xl leading-relaxed">One live musical loop, many scheduled audio hits—but only wallet-approved changes produce transactions. A note batch appears as one transaction with multiple NoteSet events.</p>
     </div>
     <Button size="sm" variant="outline" disabled={loading} onClick={()=>void refresh()}>
       <RefreshCw className={`size-4 ${loading?'animate-spin':''}`}/>{loading?'Checking Monad…':data?'Refresh transactions':'Load transactions'}
     </Button>
   </div>
   {error&&<div className="mt-5 text-xs text-destructive bg-destructive/5 p-3 rounded-md" role="alert">{error} <a target="_blank" rel="noreferrer" href={explorerBase} className="underline">Open explorer instead</a>.</div>}
   {!data&&!loading&&!error&&<p className="text-xs mt-5 text-muted-foreground">Press <strong>Load transactions</strong> to fetch verified events from Monad’s public RPC. This is not simulated.</p>}
   {data&&<div className="mt-5">
     {!data.scanComplete&&<p role="alert" className="text-xs text-destructive mb-3">The Monad public RPC limited this activity scan. The confirmed events below are genuine, but the list may be incomplete. <a href={explorerBase+'/address/'+import.meta.env['VITE_BEATDROP_ADDRESS']} target="_blank" rel="noreferrer" className="underline">Check full contract history on MonadVision</a>.</p>}
     <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-3 text-[11px] text-muted-foreground">
       <span>{txs.length} event groups · recent scan from block {data.fromBlock.toString()} through {data.toBlock.toString()}</span>
       <a href={explorerBase+'/address/'+import.meta.env['VITE_BEATDROP_ADDRESS']} target="_blank" rel="noreferrer" className="inline-flex gap-1 items-center underline">Full contract explorer <ExternalLink className="size-3"/></a>
     </div>
     {txs.length===0?<p className="text-xs text-muted-foreground py-7">No events for this room in the most recent {data.windowBlocks} blocks. Older transactions may exist—use the contract explorer for historical activity.</p>:
       <div className="divide-y divide-border">{txs.map((tx,i)=><div className="py-4 flex items-start justify-between gap-4" key={tx.hash+'|'+tx.name+'|'+i}>
         <div className="min-w-0">
           <strong className="text-xs font-semibold">{ACTIVITY_LABELS[tx.name]??tx.name}{tx.name==='NoteSet'&&tx.instrument!==null?' · '+(INSTRUMENT_NAMES[tx.instrument]??'Instrument'):''}</strong>
           <p className="text-[11px] text-muted-foreground mt-1">
             {tx.name==='NoteSet'?tx.count+' step edits · steps '+[...new Set(tx.steps)].sort((a,b)=>a-b).join(', '):'Contract event recorded'}
             {tx.amount!==null?' · '+formatTestMon(BigInt(tx.amount))+' test MON':''}
           </p>
           <p className="text-[10px] text-muted-foreground mt-1">Block #{tx.block}{tx.owner?' · '+abbreviatedWallet(tx.owner):''}
             {tx.operator&&tx.owner&&tx.operator.toLowerCase()!==tx.owner.toLowerCase()?' · operated by '+abbreviatedWallet(tx.operator):''}
           </p>
         </div>
         <a className="text-[11px] font-medium shrink-0 inline-flex items-center gap-1 underline" target="_blank" rel="noreferrer" href={transactionExplorer(tx.hash)}>View TX <ExternalLink className="size-3"/></a>
       </div>)}</div>}
     <p className="text-[10px] text-muted-foreground mt-4 leading-relaxed flex items-start gap-2"><Info className="size-3.5 shrink-0"/>Recent-window RPC view only, not a complete historical index. Chain data is authoritative. The music audio itself is not stored on-chain; its 4×16 step pattern is.</p>
   </div>}
 </section>;
}
