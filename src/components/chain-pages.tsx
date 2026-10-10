import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, Check, Copy, Wallet, Play, Pause, RotateCcw, Circle, ExternalLink, RefreshCw, Radio, Download, Music2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useMusic } from '@/components/music/music-context';
import { InstrumentSelector, PerformanceKeyboard, Sequencer, Waveform, instrumentIcons } from '@/components/music/music-controls';
import { instruments, editStep, recordStep, type Instrument, type Pattern } from '@/lib/beat-drop';
import { covers } from '@/components/app-shell';
import {
  chainConfigured, explorerBase, faucetUrl, abbreviatedWallet, sameWallet,
  currentMainWallet, connectMainWallet, refreshMainWallet, watchWallet,
  fetchChainRoom, assignChainSeat, startChainRoom, finalizeChainRoom,
  sendChainNotes, authorizeChainSession, revokeChainSession,
  fundChainSession, chainSessionAddress, chainSessionActive,
  tipChainRoom, claimChainRoom, claimableChainRoom, formatTestMon,
  transactionExplorer, chainError, createChainRoom, listChainRooms, isOnChainId,
  type ChainRoom
} from '@/services/monad-bridge';

const readableTime=(n:number)=>Math.max(0,Math.floor(n/60))+':'+String(Math.max(0,n%60)).padStart(2,'0');
const notesActive=(pattern:Pattern,inst:Instrument)=>pattern[inst].some(n=>n!==0);
const canPlay=(room:ChainRoom,account:string|null,inst:Instrument)=>{
  const idx=instruments.indexOf(inst);
  const onchainTime=room.chainTime+(Date.now()-room.chainObservedAt)/1000;
  return room.phase==='Live'&&sameWallet(room.seats[idx],account)&&onchainTime<room.endsAt-4;
};
function useChainRoom(id:string){
  const [room,setRoom]=useState<ChainRoom|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const refresh=useCallback(async()=>{
    try{const r=await fetchChainRoom(id);setRoom(r);setError('');return r;}
    catch(e){setError(chainError(e));return null;}
    finally{setLoading(false);}
  },[id]);
  useEffect(()=>{let alive=true;void refresh();const timer=window.setInterval(()=>{if(alive)void refresh();},3000);return()=>{alive=false;window.clearInterval(timer);};},[refresh]);
  return {room,loading,error,refresh};
}
function useConnectedWallet(){
  const [account,setAccount]=useState<string|null>(null);
  useEffect(()=>{
    void refreshMainWallet().then(setAccount).catch(()=>setAccount(null));
    return watchWallet(setAccount);
  },[]);
  const connect=async()=>{try{const address=await connectMainWallet();setAccount(address);toast.success('Connected to Monad Testnet');return address;}
    catch(e){toast.error(chainError(e));return null;}};
  return {account,connect};
}
function ErrorNote({children}:{children:React.ReactNode}){return <p role="alert" className="text-xs leading-relaxed text-destructive bg-destructive/5 rounded-md p-3 mt-3">{children}</p>;}
function ChainState({loading,error}:{loading:boolean;error:string}){
  if(loading)return <p className="py-16 text-sm text-muted-foreground">Reading Monad Testnet…</p>;
  if(error)return <ErrorNote>{error}</ErrorNote>;
  return null;
}
function OwnerChip({address}:{address:string|null}){return <span className="font-mono text-[11px] text-muted-foreground" title={address||'Unassigned'}>{abbreviatedWallet(address)}</span>;}
function statusName(room:ChainRoom){return room.phase==='Lobby'?'Waiting for artists':room.phase==='Live'?'Recording live':'Finalized · chain confirmed';}
export function ChainRoomEntry({roomId}:{roomId:string}){
  const {room,loading,error}=useChainRoom(roomId);
  if(!room)return <ChainState loading={loading} error={error}/>;
  return <div className="max-w-3xl mx-auto py-7">
    <Link to="/explore" className="text-xs text-muted-foreground flex items-center gap-2 mb-8"><ArrowLeft className="size-3"/>Jam rooms</Link>
    <p className="eyebrow mb-3">MONAD TESTNET / ROOM {room.id}</p><h1 className="page-title">{room.name}</h1>
    <p className="text-sm text-muted-foreground mt-4">Real blockchain room · {statusName(room)} · Host <OwnerChip address={room.host}/></p>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-9 mb-8">{instruments.map((inst,idx)=>{
      const Icon=instrumentIcons[inst];return <div className={`studio-surface p-4 instrument-${inst}`} key={inst}>
        <Icon className="instrument-color size-6"/><h3 className="font-semibold capitalize text-sm mt-5">{inst}</h3>
        <p className="mt-2"><OwnerChip address={room.seats[idx]??null}/></p>
      </div>;
    })}</div>
    <Button asChild className="w-full h-12"><Link to={room.phase==='Lobby'?'/room/$roomId/lobby':room.phase==='Live'?'/room/$roomId/studio':'/beat/$beatId'}
      params={room.phase==='Finalized'?{beatId:room.id} as never:{roomId:room.id} as never}>
       {room.phase==='Lobby'?'Enter the lobby':room.phase==='Live'?'Open the live studio':'Play the finished beat'} <ArrowRight/>
    </Link></Button>
    <p className="text-xs text-muted-foreground mt-5">Listening needs no wallet. Editing requires an approved seat, wallet signature and testnet MON gas.</p>
  </div>;
}
export function ChainLobby({roomId}:{roomId:string}){
  const {room,loading,error,refresh}=useChainRoom(roomId);
  const {account,connect}=useConnectedWallet();
  const [addresses,setAddresses]=useState<string[]>(['','','','']);
  const [busy,setBusy]=useState(''),[activity,setActivity]=useState('');
  const navigate=useNavigate();
  useEffect(()=>{if(room)setAddresses(old=>room.seats.map((s,i)=>s??old[i]??''));},[room?.id,room?.seats.join('|')]);
  if(!room)return <ChainState loading={loading} error={error}/>;
  const isHost=sameWallet(account,room.host);
  const mySeat=room.seats.some(a=>sameWallet(a,account));
  const tx=async(name:string,action:(onHash:(h:string)=>void)=>Promise<unknown>,then?:()=>void)=>{
    if(busy)return;setBusy(name);setActivity('Waiting for your testnet wallet approval…');
    try{await action(hash=>setActivity('Pending confirmation · '+transactionExplorer(hash)));
      setActivity(name+' confirmed on Monad Testnet.');toast.success(name+' confirmed');await refresh();then?.();}
    catch(e){setActivity(chainError(e));toast.error(chainError(e));}
    finally{setBusy('');}
  };
  const saveSeat=(idx:number,address:string)=>void tx('Seat assignment',hash=>assignChainSeat(room.id,idx,address,hash));
  const copy=async()=>{const link=new URL('/room/'+room.id,window.location.origin).toString();try{await navigator.clipboard.writeText(link);toast.success('Shareable room link copied.');}catch{toast.error('Copy unavailable; share the URL shown in your browser.');}};
  return <div className="max-w-5xl mx-auto py-3">
    <div className="flex items-center justify-between gap-4 mb-8">
      <Link to="/explore" className="text-xs text-muted-foreground flex items-center gap-2"><ArrowLeft className="size-3"/>Jam rooms</Link>
      <span className="pill">{room.phase} · Monad Testnet</span>
    </div>
    <p className="eyebrow mb-3">Backstage / room {room.id}</p>
    <h1 className="page-title">{room.name}</h1>
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-4 mb-10">
      <span>Host <OwnerChip address={room.host}/></span><Button variant="ghost" size="sm" onClick={()=>void copy()}><Copy/> Copy invite</Button>
      <a href={explorerBase} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">Monad explorer <ExternalLink className="size-3"/></a>
    </div>
    <div className="flex items-end justify-between gap-4 mb-5"><div><h2 className="section-title">Your part in this sound.</h2><p className="text-xs text-muted-foreground mt-2">The host assigns wallet addresses. Seats are permanently frozen when recording starts.</p></div>
      {!account?<Button variant="outline" onClick={()=>void connect()}><Wallet/>Connect wallet</Button>:<OwnerChip address={account}/>}</div>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{instruments.map((inst,idx)=>{
      const Icon=instrumentIcons[inst],owner=room.seats[idx],mine=sameWallet(owner,account);
      return <article key={inst} className={`studio-surface p-5 instrument-${inst}`}>
        <div className="flex items-center justify-between"><Icon className="size-7 instrument-color"/>{mine&&<Check className="size-4 text-mint-foreground"/>}</div>
        <h3 className="text-lg font-semibold capitalize mt-7">{inst}</h3>
        <p className="text-[11px] text-muted-foreground mt-2 mb-4">{mine?'Your assigned seat':owner?'Assigned':'Available for assignment'}</p>
        <OwnerChip address={owner??null}/>
        {isHost&&room.phase==='Lobby'&&<div className="mt-4 space-y-2">
          <label className="text-[10px] text-muted-foreground" htmlFor={'seat-'+idx}>Wallet address</label>
          <input id={'seat-'+idx} className="field text-[11px] font-mono" placeholder="0x…" value={addresses[idx]??''} onChange={e=>setAddresses(v=>v.map((x,n)=>n===idx?e.target.value:x))}/>
          {account&&<Button size="sm" variant="ghost" className="w-full text-xs" onClick={()=>setAddresses(v=>v.map((x,n)=>n===idx?account:x))}>Use my wallet</Button>}
          <Button className="w-full text-xs" size="sm" disabled={!!busy||!addresses[idx]} onClick={()=>saveSeat(idx,addresses[idx]??'')}>Assign on-chain</Button>
        </div>}
      </article>;
    })}</div>
    <div className="mt-8 flex flex-col sm:flex-row justify-between gap-5 py-6 border-y border-border">
      <div><h3 className="font-semibold">{room.phase==='Lobby'?'Ready for the drop?':room.phase==='Live'?'Your round is live.':'The beat is finished.'}</h3>
        <p className="text-xs text-muted-foreground mt-2">120 BPM · 16 steps · 90 seconds · confirmed on Monad Testnet</p></div>
      <div className="flex flex-wrap gap-2">{room.phase==='Lobby'&&isHost&&<Button disabled={!!busy||!room.seats.some(Boolean)} onClick={()=>void tx('Jam started',hash=>startChainRoom(room.id,hash),()=>void navigate({to:'/room/$roomId/studio',params:{roomId}}))}>Start 90-second jam <ArrowRight/></Button>}
        {room.phase==='Live'&&<Button asChild><Link to="/room/$roomId/studio" params={{roomId}}>Open live studio <ArrowRight/></Link></Button>}
        {room.phase==='Finalized'&&<Button asChild><Link to="/beat/$beatId" params={{beatId:roomId}}>Open Beat Card <ArrowRight/></Link></Button>}</div>
    </div>
    {account&&mySeat&&room.phase!=='Finalized'&&<section className="studio-surface p-5 mt-6">
      <h3 className="text-sm font-semibold">Optional short-lived editing session</h3>
      <p className="text-xs text-muted-foreground mt-2 mb-4">Authorize a 5-minute browser-memory key before starting. It needs separate testnet MON for gas; any unused gas may be lost when you refresh.</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" disabled={!!busy} onClick={()=>void tx('Session authorized',hash=>authorizeChainSession(roomId,hash))}>Authorize session</Button>
        {chainSessionAddress()&&<Button variant="outline" size="sm" disabled={!!busy} onClick={()=>void tx('Session funded',hash=>fundChainSession('0.01',hash))}>Fund 0.01 test MON</Button>}
        {chainSessionActive(roomId)&&<Button variant="ghost" size="sm" disabled={!!busy} onClick={()=>void tx('Session revoked',hash=>revokeChainSession(roomId,hash))}>Revoke</Button>}
      </div>
    </section>}
    {activity&&<p role="status" className="mt-5 text-xs text-muted-foreground break-all">{activity}</p>}
    {room.phase==='Lobby'&&!isHost&&<p className="text-xs text-muted-foreground mt-5">To join: connect your wallet and share its address with the host. Only the host can assign seats.</p>}
  </div>;
}
export function ChainStudio({roomId}:{roomId:string}){
  const {room,loading,error,refresh}=useChainRoom(roomId);
  const {account,connect}=useConnectedWallet();const m=useMusic();const music=useRef(m);music.current=m;
  const [busy,setBusy]=useState(false),[activity,setActivity]=useState(''),[seconds,setSeconds]=useState(90),[sessionMode,setSessionMode]=useState(false);
  const pending=useRef(new Map<Instrument,Map<number,number>>()),flushing=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const roomRef=useRef(room);roomRef.current=room;const accountRef=useRef(account);accountRef.current=account;
  const loadedId=useRef('');
  useEffect(()=>{if(!room)return;
    if(loadedId.current!==room.id){loadedId.current=room.id;m.load(room.pattern,room.name);}
    else if(!flushing.current&&pending.current.size===0)m.sync(room.pattern);
  },[room?.chainObservedAt,room?.id]);
  useEffect(()=>{
    const t=window.setInterval(()=>{const r=roomRef.current;if(r){const chainNow=r.chainTime+(Date.now()-r.chainObservedAt)/1000;setSeconds(Math.max(0,Math.ceil(r.endsAt-chainNow)));}},200);
    return()=>window.clearInterval(t);
  },[]);
  const flush=useCallback(async()=>{
    if(flushing.current||!roomRef.current||!accountRef.current||!pending.current.size)return;
    flushing.current=true;setBusy(true);
    const r=roomRef.current,owner=accountRef.current;
    const entries=[...pending.current.entries()];pending.current.clear();
    let failed=false;
    try{for(const [inst,steps] of entries){
      if(!steps.size)continue;
      setActivity('Submitting '+steps.size+' '+inst+' edits; wallet confirmation may be required.');
      await sendChainNotes(r.id,inst,[...steps].map(([step,value])=>({step,value})),owner,hash=>setActivity('Pending on Monad · '+transactionExplorer(hash)),sessionMode&&chainSessionActive(r.id));
    }
    setActivity('Confirmed on Monad Testnet. Refreshing the accepted pattern.');
    }catch(e){failed=true;setActivity('Edit not confirmed: '+chainError(e));toast.error(chainError(e));}
    finally{flushing.current=false;setBusy(false);const confirmed=await refresh();if(confirmed&&!pending.current.size)music.current.sync(confirmed.pattern);
      if(failed)toast('Any rejected edits were reverted to confirmed chain data.');if(pending.current.size)timer.current=setTimeout(()=>void flush(),1500);}
  },[refresh,sessionMode]);
  const flushRef=useRef(flush);flushRef.current=flush;
  useEffect(()=>{
    const onEdit=(inst:Instrument,step:number,note:number,record:boolean)=>{
      const r=roomRef.current,a=accountRef.current;
      if(!r||!canPlay(r,a,inst)){toast.error('Read-only: this instrument is not your active wallet seat.');return;}
      if(flushing.current){toast('Transaction pending. Wait for confirmation before editing again.');return;}
      const current=music.current.pattern;
      const updated=record?recordStep(current,inst,step,note):editStep(current,inst,step,note);
      const cell=updated[inst][step];if(cell===undefined)return;
      music.current.sync(updated);
      if(!pending.current.has(inst))pending.current.set(inst,new Map());
      pending.current.get(inst)?.set(step,cell);
      if(timer.current)clearTimeout(timer.current);
      timer.current=setTimeout(()=>void flushRef.current(),1300);
      setActivity('Local edit queued. Only a confirmed transaction counts for credit.');
    };
    m.setEditHandler(onEdit);
    return()=>{m.setEditHandler(null);if(timer.current)clearTimeout(timer.current);pending.current.clear();};
  },[m.setEditHandler,roomId]);
  useEffect(()=>()=>{m.stop();},[roomId]);
  if(!room)return <ChainState loading={loading} error={error}/>;
  const eligible=room.seats.filter(s=>sameWallet(s,account)).length>0;
  const remaining=room.phase==='Live'?seconds:room.phase==='Lobby'?90:0;
  const userCanEdit=(inst:Instrument)=>canPlay(room,account,inst);
  const action=async(label:string,fn:()=>Promise<unknown>)=>{if(busy)return;setBusy(true);
    try{await fn();setActivity(label+' confirmed on-chain.');toast.success(label);await refresh();}
    catch(e){setActivity(chainError(e));toast.error(chainError(e));}
    finally{setBusy(false);}
  };
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="eyebrow mb-3">MONAD TESTNET / LIVE MUSIC</p><h1 className="page-title">{room.name}</h1>
        <p className="text-xs text-muted-foreground mt-3">Room {room.id} · {statusName(room)} · {eligible?'Your seat is assigned':'Listening as a guest'}</p></div>
      <div className="flex items-center gap-2">{!account&&<Button variant="outline" onClick={()=>void connect()}><Wallet/>Connect wallet</Button>}
        <span className={`text-xl tabular-nums font-semibold p-3 rounded-md ${remaining<=10?'bg-destructive/10 text-destructive':'bg-accent'}`}>{readableTime(remaining)}</span></div>
    </div>
    {room.phase==='Lobby'&&<div className="studio-surface p-5 flex justify-between items-center gap-4">
      <div><h2 className="text-sm font-semibold">Still in the lobby.</h2><p className="text-xs text-muted-foreground mt-2">The host must assign and start the jam before editing.</p></div>
      <Button asChild variant="outline"><Link to="/room/$roomId/lobby" params={{roomId}}>Open lobby <ArrowRight/></Link></Button>
    </div>}
    {room.phase==='Finalized'&&<div className="studio-surface p-5 flex items-center justify-between gap-3"><p className="text-sm">This Beat Card has been finalized. All notes are locked.</p><Button asChild><Link to="/beat/$beatId" params={{beatId:roomId}}>View Beat Card</Link></Button></div>}
    {room.phase==='Live'&&<p className="text-xs text-muted-foreground bg-accent rounded-md p-3">The local grid responds immediately. Blockchain credit begins only when the transaction confirms. Stop editing at least four seconds before the deadline.</p>}
    <InstrumentSelector allowed={userCanEdit}/>
    <section className="studio-surface p-5 sm:p-7">
      <div className="flex justify-between gap-3 mb-5"><div><p className="eyebrow mb-2">THE LOOP</p><h2 className="section-title">A little music in motion.</h2></div>
        <span className="text-[11px] text-muted-foreground">120 BPM · 16 steps</span></div>
      <Sequencer editable={room.phase==='Live'} allowed={userCanEdit}/>
    </section>
    <section className="studio-surface p-5 sm:p-7"><div className="flex flex-wrap justify-between items-center gap-3 mb-5">
      <div><p className="eyebrow mb-2">PLAY YOUR PART</p><h2 className="section-title">The keyboard is yours.</h2></div>
      <span className="text-[11px] text-muted-foreground">A–K / Q–I · 1–4 switch instruments</span></div>
      <PerformanceKeyboard allowed={inst=>room.phase==='Live'?userCanEdit(inst):true}/>
      <div className="flex items-center justify-between flex-wrap gap-4 mt-6 pt-5 border-t border-border">
        <div className="flex items-center gap-2">
          <Button size="icon" aria-label={m.playing?'Pause beat':'Play beat'} onClick={()=>void m.toggle()}>{m.playing?<Pause/>:<Play/>}</Button>
          <Button variant="ghost" size="icon" aria-label="Stop playback" onClick={m.stop}><RotateCcw/></Button>
          <Button variant={m.armed?'destructive':'outline'} aria-pressed={m.armed} disabled={!userCanEdit(m.instrument)} onClick={()=>m.setArmed(!m.armed)}><Circle/> {m.armed?'Recording armed':'Arm recording'}</Button>
        </div>
        <span className="text-xs text-muted-foreground">{busy?'Waiting for confirmation':pending.current.size?'Edits queued':'Listening / ready'}</span>
      </div>
    </section>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <section className="studio-surface p-5"><p className="eyebrow mb-3">COLLABORATORS / WALLET SEATS</p>
        {instruments.map((inst,idx)=><div className="flex items-center justify-between border-b border-border py-3 last:border-none" key={inst}><span className={`text-xs capitalize instrument-${inst}`}>{inst}</span><OwnerChip address={room.seats[idx]??null}/></div>)}
      </section>
      <section className="studio-surface p-5"><p className="eyebrow mb-3">TRANSACTION STATUS</p><p role="status" className="text-xs text-muted-foreground leading-relaxed break-all">{activity||'Only confirmed edits are recorded on-chain.'}</p>
        {eligible&&room.phase==='Live'&&<div className="mt-5 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={()=>void action('Session authorized',()=>authorizeChainSession(room.id))}>Authorize session</Button>
          <Button size="sm" variant="outline" onClick={()=>void action('Session gas funded',()=>fundChainSession('0.01'))}>Fund test MON</Button>
          <label className="flex items-center gap-2 text-[11px]"><input type="checkbox" checked={sessionMode} onChange={e=>setSessionMode(e.target.checked)}/>Use authorized session</label>
        </div>}
        {eligible&&chainSessionAddress()&&<p className="text-[10px] text-muted-foreground mt-3">Browser key: {abbreviatedWallet(chainSessionAddress())} · lost on reload; fund only small amounts.</p>}
      </section>
    </div>
    {room.phase==='Live'&&remaining===0&&<Button className="w-full h-12" disabled={busy} onClick={()=>void action('Round finalized',()=>finalizeChainRoom(room.id))}>Finalize finished loop on Monad <ArrowRight/></Button>}
    <Waveform/>
  </div>;
}
export function ChainBeat({beatId}:{beatId:string}){
  const {room,loading,error,refresh}=useChainRoom(beatId);
  const m=useMusic();const [account,setAccount]=useState<string|null>(null);
  const [amount,setAmount]=useState('0.01'),[claimable,setClaimable]=useState<bigint>(0n),[pending,setPending]=useState(''),[activity,setActivity]=useState('');
  const loaded=useRef('');
  useEffect(()=>{void refreshMainWallet().then(setAccount).catch(()=>{});
    return watchWallet(setAccount);},[]);
  useEffect(()=>{if(!room||room.phase!=='Finalized')return;
    if(loaded.current!==room.id){loaded.current=room.id;m.load(room.pattern,room.name);}
    else if(!m.playing)m.sync(room.pattern);
  },[room?.id,room?.chainObservedAt]);
  useEffect(()=>{if(room&&account)void claimableChainRoom(room.id,account).then(setClaimable).catch(()=>setClaimable(0n));},[room?.id,room?.totalTipped,account]);
  useEffect(()=>()=>m.stop(),[beatId]);
  if(!room)return <ChainState loading={loading} error={error}/>;
  if(room.phase!=='Finalized')return <div className="py-16 text-center"><h1 className="page-title">This beat is still being made.</h1><p className="text-sm text-muted-foreground mt-4">It becomes a permanent Beat Card only after finalization on Monad.</p><Button asChild className="mt-6"><Link to="/room/$roomId" params={{roomId:beatId}}>Go to room</Link></Button></div>;
  const eligible=instruments.map((inst,idx)=>({inst,idx,owner:room.seats[idx]})).filter(x=>x.owner&&(room.eligibleMask&(1<<x.idx))!==0);
  const payout=eligible.length?100/eligible.length:0;
  const transact=async(kind:string,fn:()=>Promise<unknown>)=>{if(pending)return;setPending(kind);setActivity('Waiting for wallet confirmation…');
    try{await fn();setActivity(kind+' confirmed on Monad Testnet.');toast.success(kind+' confirmed');await refresh();
      if(account)setClaimable(await claimableChainRoom(room.id,account));}
    catch(e){setActivity(chainError(e));toast.error(chainError(e));}
    finally{setPending('');}
  };
  return <div className="max-w-6xl mx-auto">
    <Link to="/drops" className="text-xs text-muted-foreground inline-flex items-center gap-2 mb-7"><ArrowLeft className="size-3"/>Recent drops</Link>
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1fr)] gap-8 lg:gap-12">
      <div><img src={covers[Number(room.id)%covers.length]} alt={room.name+' Beat Drop artwork'} className="w-full aspect-square object-cover rounded-lg"/>
        <div className="flex gap-2 justify-between items-center mt-4"><span className="pill">FINALIZED · MONAD TESTNET</span><Button variant="ghost" size="icon" onClick={()=>void navigator.clipboard.writeText(window.location.href).then(()=>toast.success('Beat Card link copied')).catch(()=>toast.error('Clipboard unavailable'))}><Copy/></Button></div></div>
      <div className="lg:py-3">
        <p className="eyebrow mb-4">ON-CHAIN BEAT CARD / ROOM {room.id}</p><h1 className="page-title">{room.name}</h1>
        <p className="text-sm text-muted-foreground mt-4 mb-6">Four sounds, one loop. The arrangement and eligible instrument owners are frozen in the Monad contract.</p>
        <div className="flex flex-wrap gap-2 mb-5"><Button onClick={()=>void m.toggle()}>{m.playing?<Pause/>:<Play/>}{m.playing?'Pause':'Replay beat'}</Button><Button variant="outline" onClick={()=>m.stop()}><RotateCcw/>Stop</Button></div>
        <Waveform/>
        <section className="py-5 border-y border-border my-6">
          <h2 className="text-sm font-semibold mb-5">Everyone gets their credit.</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{instruments.map((inst,idx)=>{
            const owner=room.seats[idx];const active=(room.eligibleMask&(1<<idx))!==0;
            return <div className="flex gap-3 items-center" key={inst}>
              <div className={`avatar w-9 h-9 instrument-${inst} instrument-bg instrument-color`}>{inst.slice(0,1).toUpperCase()}</div>
              <div><p className="text-xs font-semibold capitalize">{inst} · {active?payout.toFixed(2)+'%':'No share'}</p><OwnerChip address={owner??null}/><p className="text-[10px] text-muted-foreground mt-1">{active?'Retained accepted notes':'Empty on final pattern'}</p></div>
            </div>;
          })}</div>
          <p className="text-[10px] text-muted-foreground mt-4">Equal shares per eligible seat, not per hit. One wallet owning multiple eligible seats receives the combined entitlement. Exact wei rounding happens in the Solidity contract.</p>
        </section>
        <p className="text-xs text-muted-foreground mb-2">Tips recorded: <strong>{formatTestMon(room.totalTipped)} test MON</strong></p>
        <p className="text-xs text-muted-foreground mb-5">Your claimable balance: <strong>{formatTestMon(claimable)} test MON</strong></p>
        <div className="flex flex-wrap gap-2">
          <input aria-label="Tip amount in testnet MON" type="text" inputMode="decimal" className="field max-w-[140px]" value={amount} onChange={e=>setAmount(e.target.value)}/>
          <Button disabled={!!pending||!eligible.length} onClick={()=>void transact('Tip',()=>tipChainRoom(room.id,amount))}><Wallet/>Send testnet MON tip</Button>
          <Button variant="outline" disabled={!!pending||claimable===0n} onClick={()=>void transact('Claim',()=>claimChainRoom(room.id))}>Claim tips</Button>
        </div>
        {!account&&<Button variant="ghost" className="mt-3" onClick={()=>void connectMainWallet().then(setAccount).catch(e=>toast.error(chainError(e)))}>Connect wallet to tip or claim</Button>}
        {activity&&<p role="status" className="mt-4 text-xs text-muted-foreground break-all">{activity}</p>}
        <p className="text-[10px] text-muted-foreground mt-5">Testnet only. This card is not a minted NFT, copyright certificate or streaming-royalty distribution.</p>
      </div>
    </div>
    <section className="studio-surface p-6 mt-9"><h2 className="section-title mb-5">A closer listen.</h2><Sequencer/></section>
  </div>;
}

export function ChainCreatePage(){
  const navigate=useNavigate();const [title,setTitle]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
  const create=async(event:React.FormEvent)=>{
    event.preventDefault();if(busy)return;setBusy(true);setStatus('Waiting for your MetaMask approval…');
    try{const roomId=await createChainRoom(title,hash=>setStatus('Transaction pending: '+transactionExplorer(hash)));
      toast.success('Room confirmed on Monad Testnet');void navigate({to:'/room/$roomId/lobby',params:{roomId}});}
    catch(e){setStatus(chainError(e));toast.error(chainError(e));}finally{setBusy(false);}
  };
  return <div className="max-w-2xl mx-auto py-5">
    <Link to="/explore" className="text-xs text-muted-foreground flex items-center gap-2 mb-8"><ArrowLeft className="size-3"/>Back to jam rooms</Link>
    <p className="eyebrow mb-3">MONAD TESTNET / ON-CHAIN CREATION</p>
    <h1 className="page-title">Make room for a little magic.</h1>
    <p className="text-sm text-muted-foreground mt-4 mb-10">One room. Four instruments. Everyone credited for accepted final notes.</p>
    <form onSubmit={event=>void create(event)} className="space-y-7">
      <label htmlFor="chain-room-name" className="block text-sm font-semibold">What are we calling it?</label>
      <input id="chain-room-name" className="field" maxLength={31} placeholder="Sunday kind of feeling" required value={title} onChange={event=>setTitle(event.target.value)}/>
      <p className="text-[11px] text-muted-foreground">The title must fit in 31 UTF-8 bytes. Your wallet is the immutable host. Room names and contributions are publicly readable on Monad Testnet.</p>
      <div className="grid grid-cols-3 gap-4 py-6 border-y border-border">
        <div><strong className="text-2xl">120</strong><p className="text-xs text-muted-foreground">BPM</p></div>
        <div><strong className="text-2xl">90</strong><p className="text-xs text-muted-foreground">Seconds</p></div>
        <div><strong className="text-2xl">16</strong><p className="text-xs text-muted-foreground">Steps</p></div>
      </div>
      <p className="text-xs text-muted-foreground">Your wallet must be connected to Monad Testnet (chain ID 10143) with enough TESTNET MON for gas. No real funds are requested.</p>
      <Button type="submit" className="w-full h-12" disabled={busy||!title.trim()}>{busy?'Waiting for blockchain confirmation…':'Create real jam room'}<ArrowRight/></Button>
      {status&&<p role="status" className="text-xs text-muted-foreground break-all">{status}</p>}
    </form>
  </div>;
}
export function ChainJoinPage(){
  const [code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const navigate=useNavigate();
  const enter=async(e:React.FormEvent)=>{
    e.preventDefault();
    let raw=code.trim();try{const url=new URL(raw);raw=url.pathname.match(/\/room\/([0-9]+)/)?.[1]??url.searchParams.get('room')??raw;}catch{/* entered a room ID */}
    if(!isOnChainId(raw)){setError('Enter a positive Monad room number or complete invite URL.');return;}
    setBusy(true);try{await fetchChainRoom(raw);void navigate({to:'/room/$roomId',params:{roomId:raw}});}
    catch(e){setError(chainError(e));}finally{setBusy(false);}
  };
  return <div className="max-w-md mx-auto py-14">
    <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center mb-6"><Radio className="size-5"/></div>
    <p className="eyebrow mb-3">SHARED MUSIC / MONAD TESTNET</p><h1 className="page-title">Got a room in mind?</h1>
    <p className="text-sm text-muted-foreground mt-4 mb-8">Every room has a real on-chain ID. No wallet is needed just to listen.</p>
    <form onSubmit={e=>void enter(e)}>
      <label htmlFor="chain-join-code" className="text-xs font-semibold mb-3 block">Room number or invitation link</label>
      <input id="chain-join-code" className="field" value={code} onChange={e=>{setCode(e.target.value);setError('');}} placeholder="e.g. 12" required/>
      {error&&<ErrorNote>{error}</ErrorNote>}
      <Button disabled={busy} className="w-full mt-5 h-11">{busy?'Looking up room…':'Find room'}<ArrowRight/></Button>
    </form><Link to="/explore" className="text-xs text-muted-foreground mt-7 block text-center">Or explore available rooms →</Link>
  </div>;
}
export function ChainExplorePage(){
  const [rooms,setRooms]=useState<ChainRoom[]>([]),[search,setSearch]=useState(''),[filter,setFilter]=useState('All rooms'),[busy,setBusy]=useState(true),[error,setError]=useState('');
  const load=useCallback(async()=>{setBusy(true);
    try{setRooms(await listChainRooms(24));setError('');}catch(e){setError(chainError(e));}finally{setBusy(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  const visible=rooms.filter(room=>(filter==='All rooms'||room.phase===filter)&&[room.id,room.name].join(' ').toLowerCase().includes(search.toLowerCase()));
  return <div>
    <div className="flex items-center justify-between gap-4 mb-8">
      <div><p className="eyebrow mb-3">MONAD TESTNET / RECENT ON-CHAIN ROOMS</p><h1 className="page-title">Find your next sound.</h1><p className="text-sm text-muted-foreground mt-3">Every room is loaded from the verified contract. No sample rooms are shown as live.</p></div>
      <Button asChild><Link to="/create">Create jam <ArrowRight/></Link></Button>
    </div>
    <div className="flex flex-col sm:flex-row gap-3 justify-between mb-6">
      <div className="tab-control">{['All rooms','Lobby','Live','Finalized'].map(value=><Button key={value} variant="ghost" size="sm" className={filter===value?'selected':''} onClick={()=>setFilter(value)}>{value}</Button>)}</div>
      <div className="flex gap-2"><input className="field" aria-label="Search on-chain rooms" placeholder="Name or room number" value={search} onChange={e=>setSearch(e.target.value)}/>
        <Button variant="outline" size="icon" aria-label="Refresh rooms" onClick={()=>void load()}><RefreshCw/></Button></div>
    </div>
    {error&&<ErrorNote>{error}</ErrorNote>}
    {busy?<p className="text-xs text-muted-foreground py-16">Reading rooms from Monad…</p>:
      visible.length?<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{visible.map((room,idx)=><Link key={room.id} to="/room/$roomId" params={{roomId:room.id}} className="studio-surface p-5 block hover:border-foreground/30 transition-colors">
      <div className="flex justify-between items-center gap-3"><span className="pill">{statusName(room)}</span><span className="text-xs text-muted-foreground">#{room.id}</span></div>
      <h2 className="text-lg font-semibold mt-8 mb-2">{room.name}</h2><p className="text-xs text-muted-foreground">Hosted by {abbreviatedWallet(room.host)}</p>
      <div className="flex gap-1.5 mt-6">{instruments.map((inst,i)=><span key={inst} className={`w-7 h-7 rounded-full instrument-${inst} instrument-bg flex items-center justify-center text-[10px] instrument-color`}>{room.seats[i]?'●':'○'}</span>)}</div>
      <div className="flex justify-between mt-5 pt-4 border-t border-border text-xs"><span>{room.seats.filter(Boolean).length}/4 seats assigned</span><span>Open room →</span></div>
      </Link>)}</div>:
      <div className="studio-surface text-center py-16"><Music2 className="size-7 mx-auto text-muted-foreground mb-4"/><h2 className="text-base font-semibold">It's quiet right now.</h2><p className="text-xs text-muted-foreground mt-3 mb-6">Create the first room, or refresh to check for new ones.</p><Button asChild><Link to="/create">Create jam</Link></Button></div>}
    <p className="text-[11px] text-muted-foreground mt-6">Showing up to 24 most recent testnet rooms, including completed ones. RPC polling is eventual, not sample-accurate.</p>
  </div>;
}
