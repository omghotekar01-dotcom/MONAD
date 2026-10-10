import {useCallback,useEffect,useMemo,useState} from 'react';
import {Link} from '@tanstack/react-router';
import {Activity,ArrowRight,Copy,ExternalLink,RefreshCw,Radio,ShieldCheck,Music2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {
 chainConfigured,beatDropContractAddress,explorerBase,transactionExplorer,
 fetchChainOverview,listChainRooms,abbreviatedWallet,chainError,
 type ChainOverview,type ChainRoom
} from '@/services/monad-bridge';
import {summarizeTransactions,ACTIVITY_LABELS,INSTRUMENT_NAMES} from '@/lib/chain-activity';
import type {ChainActivityItem} from '@/services/monad-bridge';
import {MonadActivity} from './music/monad-activity';

const positive=(value:number)=>Number.isFinite(value)?value:0;
function noteCount(room:ChainRoom){
 return room.pattern.drums.reduce((a,v)=>a+(v.toString(2).match(/1/g)?.length??0),0)+
   (['bass','synth','pluck'] as const).reduce((sum,i)=>sum+room.pattern[i].filter(v=>v>0).length,0);
}
export function ChainDashboard(){
 const [overview,setOverview]=useState<ChainOverview|null>(null);
 const [rooms,setRooms]=useState<ChainRoom[]>([]);
 const [selected,setSelected]=useState('');
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [updated,setUpdated]=useState<Date|null>(null);
 const refresh=useCallback(async()=>{
   if(!chainConfigured)return;
   setLoading(true);
   const [summary,latestRooms]=await Promise.allSettled([fetchChainOverview(),listChainRooms(12)]);
   if(summary.status==='fulfilled'){
     setOverview(summary.value);setError('');setUpdated(new Date());
   }else setError(chainError(summary.reason));
   if(latestRooms.status==='fulfilled')setRooms(latestRooms.value);
   else if(summary.status==='fulfilled')setError('Room listing unavailable: '+chainError(latestRooms.reason));
   setLoading(false);
 },[]);
 useEffect(()=>{
  if(!chainConfigured)return;
  void refresh();
  const timer=window.setInterval(()=>{if(!document.hidden)void refresh();},15000);
  return()=>window.clearInterval(timer);
 },[refresh]);
 const transactions=useMemo(()=>{
  const mapped=(overview?.events??[]).map(e=>({...e,eligibleMask:null})) as ChainActivityItem[];
  return summarizeTransactions(mapped).slice(0,24);
 },[overview]);
 const eventRoomByHash=useMemo(()=>{
  const map=new Map<string,string>();
  for(const e of overview?.events??[])if(e.roomId)map.set(e.hash,e.roomId);
  return map;
 },[overview]);
 const allNotes=rooms.reduce((a,r)=>a+noteCount(r),0);
 const allFinalized=rooms.filter(r=>r.phase==='Finalized').length;
 const contract=beatDropContractAddress;
 const clip=async(value:string)=>{
  try{await navigator.clipboard.writeText(value);}catch{/* browser may disallow copying */}
 };
 return <div className="space-y-7 max-w-7xl mx-auto">
  <div className="flex flex-wrap items-start justify-between gap-4">
    <div>
      <p className="eyebrow mb-3">MONAD TESTNET · VERIFIED PUBLIC DATA</p>
      <h1 className="page-title">The blockchain, live.</h1>
      <p className="text-sm text-muted-foreground mt-3 max-w-2xl leading-relaxed">
        Follow real Beat Drop rooms, accepted musical steps, contributing wallets, and confirmed transactions. The audio plays in-browser; the approved note grid lives in the contract.
      </p>
    </div>
    <Button variant="outline" onClick={()=>void refresh()} disabled={loading||!chainConfigured}>
      <RefreshCw className={loading?'animate-spin':''}/>{loading?'Reading testnet…':'Refresh chain'}
    </Button>
  </div>
  {!chainConfigured?<section className="studio-surface p-6 space-y-3">
    <h2 className="section-title">Blockchain not configured in this build.</h2>
    <p className="text-sm text-muted-foreground">The frontend needs the public `VITE_BEATDROP_ADDRESS` value at build time. Local Beat Cards still play but are not transactions.</p>
    <Button asChild><Link to="/studio">Use local studio <ArrowRight/></Link></Button>
  </section>:<>
    <section className="studio-surface p-5 sm:p-6 space-y-3" aria-label="Live contract identification">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold flex items-center gap-2"><ShieldCheck className="size-4"/>Contract identity</h2>
        <span className="pill">Monad Testnet · chain 10143</span>
      </div>
      <p className="text-[11px] text-muted-foreground">Public address of the deployed BeatDrop smart contract (not your personal wallet).</p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="text-xs break-all font-mono flex-1">{contract}</code>
        <Button variant="ghost" size="sm" aria-label="Copy contract address" onClick={()=>contract&&void clip(contract)}><Copy className="size-3.5"/></Button>
        <a target="_blank" rel="noreferrer" className="text-xs underline inline-flex gap-1 items-center" href={explorerBase+'/address/'+contract}>View on MonadVision <ExternalLink className="size-3"/></a>
      </div>
    </section>
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {[
       {label:'Latest chain block',value:overview?.latestBlock.toLocaleString()??'…',icon:Radio},
       {label:'Total chain rooms',value:overview?.roomCount.toLocaleString()??'…',icon:Music2},
       {label:'Finalized (recent 12 rooms)',value:overview?String(allFinalized):'…',icon:ShieldCheck},
       {label:'Accepted notes (recent 12)',value:overview?String(allNotes):'…',icon:Activity}
      ].map(s=><div key={s.label} className="studio-surface p-4 sm:p-5">
       <s.icon className="size-4 text-muted-foreground mb-4"/>
       <strong className="text-xl sm:text-2xl font-semibold tabular-nums">{s.value}</strong>
       <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{s.label}</p>
      </div>)}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span role="status" className="text-xs text-muted-foreground">{loading?'Updating from public Monad RPC…':error?'RPC error: '+error:updated?'Updated '+updated.toLocaleTimeString()+' · auto-refresh every 15s':'Waiting for first live RPC response…'}</span>
      {overview&&!overview.scanComplete&&<span role="alert" className="text-xs text-destructive">Some log ranges could not be read. Transaction feed is incomplete.</span>}
    </div>
    <section className="studio-surface p-5 sm:p-6">
      <div className="flex flex-wrap justify-between gap-3 items-center mb-5">
        <div><p className="eyebrow mb-2">ON-CHAIN ROOM REGISTRY</p><h2 className="section-title">Songs being made.</h2></div>
        <Button variant="outline" size="sm" asChild><Link to="/create">Create on-chain jam <ArrowRight className="size-4"/></Link></Button>
      </div>
      {rooms.length===0?<div className="py-10 text-center">
        <p className="text-sm font-medium">No accessible chain rooms yet.</p>
        <p className="text-xs text-muted-foreground mt-2">Saved local drops do not count as blockchain rooms. Create a real jam to record the first RoomCreated transaction.</p>
      </div>:<div className="divide-y divide-border">{rooms.map(room=><div key={room.id} className="py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold break-words">{room.name} <span className="text-muted-foreground font-normal">#{room.id}</span></p>
          <p className="text-[11px] text-muted-foreground mt-1">{room.phase} · {noteCount(room)} accepted notes · {room.seats.filter(Boolean).length}/4 assigned wallets · host {abbreviatedWallet(room.host)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Owners: {room.seats.map((owner,i)=>INSTRUMENT_NAMES[i]+': '+abbreviatedWallet(owner)).join(' · ')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={selected===room.id?'secondary':'outline'} size="sm" onClick={()=>setSelected(selected===room.id?'':room.id)}>Transactions</Button>
          <Button asChild size="sm"><Link to="/room/$roomId" params={{roomId:room.id}}>Open room <ArrowRight className="size-3"/></Link></Button>
        </div>
      </div>)}</div>}
      {selected&&<div className="mt-5"><MonadActivity key={selected} roomId={selected}/></div>}
      {overview&&Number(overview.roomCount)>rooms.length&&<p className="text-[11px] text-muted-foreground mt-4">Showing the most recent {rooms.length} accessible rooms, of {overview.roomCount.toString()} total. Open an older room by its ID using Jam rooms → Join.</p>}
    </section>
    <section className="studio-surface p-5 sm:p-6" aria-label="Live Monad transactions">
      <p className="eyebrow mb-2">REAL TRANSACTION HASHES</p>
      <h2 className="section-title">Verified contract activity.</h2>
      <p className="text-xs text-muted-foreground mt-2 mb-4">Room creation, seat assignments, each approved note batch, finalization, and MON tips/claims. No fabricated transactions.</p>
      <p className="text-[11px] text-muted-foreground mb-4">Scanning recent blocks {overview?.fromBlock.toString()??'…'}–{overview?.toBlock.toString()??'…'} (latest 1,024). Older transactions may be visible in the external contract explorer.</p>
      {transactions.length===0?<p className="text-xs text-muted-foreground border-t border-border py-8">No real contract events found in this recent scan. Create an on-chain room and refresh. Local Beat Cards are never added to this feed.</p>:
      <div className="divide-y divide-border">{transactions.map((tx,i)=><div className="py-4 flex flex-wrap items-center justify-between gap-3" key={tx.hash+'-'+tx.name+'-'+i}>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{ACTIVITY_LABELS[tx.name]}{tx.name==='NoteSet'&&tx.instrument!==null?' · '+INSTRUMENT_NAMES[tx.instrument]:''}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Room #{eventRoomByHash.get(tx.hash)??'?'} · Block {tx.block} · {tx.count} event{tx.count===1?'':'s'}{tx.name==='NoteSet'?' · steps '+tx.steps.join(', '):''}</p>
          <code className="text-[10px] text-muted-foreground break-all block mt-1">{tx.hash}</code>
          {tx.owner&&<p className="text-[10px] text-muted-foreground mt-1">Wallet: {tx.owner}</p>}
        </div>
        <a className="text-xs underline shrink-0 inline-flex gap-1 items-center" href={transactionExplorer(tx.hash)} target="_blank" rel="noreferrer">Verify TX <ExternalLink className="size-3.5"/></a>
      </div>)}</div>}
    </section>
    <section className="studio-surface p-5 sm:p-6 space-y-5" aria-label="What Monad actually records">
      <p className="eyebrow">HOW WEB3 POWERS BEAT DROP</p>
      <h2 className="section-title">Instant sound. Verifiable credit.</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs leading-relaxed">
        <div><h3 className="font-semibold mb-2">Recorded by Monad</h3>
          <p className="text-muted-foreground">Room ID and host, four wallet-assigned instrument seats, the final four-by-sixteen note grid, confirmed note-edit transaction hashes, and equal-per-eligible-seat testnet MON tip/claim accounting.</p></div>
        <div><h3 className="font-semibold mb-2">Played in your browser</h3>
          <p className="text-muted-foreground">The actual synthesized audio, speaker volume, Lo-fi tempo settings, cover images, and browser-only drafts are not stored on-chain. Each audible beat does not require a transaction.</p></div>
      </div>
      <p className="text-[11px] text-muted-foreground border-t border-border pt-4">Credit is based on the frozen final pattern, not number of historical edits. One wallet owning four eligible seats receives their combined tip allocation. Beat Cards are not automatically NFTs, copyright registrations or licensed streaming royalties.</p>
    </section>
    <p className="text-[11px] text-muted-foreground pb-7">This is a recent-block RPC viewer, not an exhaustive index or proof of copyright. Counts for notes/finalizations summarize the latest 12 accessible rooms; transactions never include raw synthesized audio. Chain confirmation, not a local button click, determines authorship attribution.</p>
  </>}
 </div>;
}
