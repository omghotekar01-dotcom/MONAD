import { demoRooms, demoBeats, emptyPattern, instruments, type Room, type Beat, type Pattern, type Instrument } from '@/lib/beat-drop';
export interface RoomService { list(): Room[]; get(id: string): Room | undefined; save(room: Room): void; create(name: string, vibe: string, visibility: Room['visibility']): Room }
export interface BeatService { list(): Beat[]; get(id: string): Beat | undefined; save(beat: Beat): void }
export interface WalletService { connect(): Promise<{address: string; chainId: number}> }
export interface ContractService { tip(beatId: string, amount: string): Promise<string>; finalize(room: Room): Promise<string> }
export interface CollaborationService { scope: 'local'; send(message: string): void }
function read<T>(key: string): T[] { try { return JSON.parse(localStorage.getItem(key)??'[]'); } catch { return []; } }
function write<T extends {id:string}>(key:string,item:T) { const items=read<T>(key).filter(x=>x.id!==item.id); localStorage.setItem(key,JSON.stringify([...items,item])); }
export const roomService: RoomService = {
  list:()=>Array.from(new Map([...demoRooms,...read<Room>('beat-drop-rooms')].map(r=>[r.id,r])).values()),
  get(id) { return this.list().find(r=>r.id===id); },
  save(room) { write('beat-drop-rooms',room); },
  create(name,vibe,visibility) { const room:Room={id:`BD-${crypto.randomUUID().slice(0,6).toUpperCase()}`,name,vibe,visibility,status:'Lobby',host:'You',seats:instruments.map(instrument=>({instrument,owner:null})),pattern:emptyPattern()}; this.save(room); return room; },
};
export const beatService: BeatService = { list:()=>[...demoBeats,...read<Beat>('beat-drop-beats')], get(id){return this.list().find(b=>b.id===id);}, save(beat){write('beat-drop-beats',beat);} };
export const walletService: WalletService = { async connect(){ throw new Error('Wallet integration is not connected in this frontend preview. No wallet request was sent.'); } };
export const contractService: ContractService = { async tip(){ throw new Error('Connect the existing Monad contract to send tips. No funds have moved.'); }, async finalize(){throw new Error('On-chain finalization requires the existing contract.');} };
export interface ProducerSuggestion { title: string; instrument: Instrument; description: string; notes: number[] }
export interface AIProducerService { suggest(instrument: Instrument, pattern: Pattern, action: string): ProducerSuggestion }
export const producerService: AIProducerService = { suggest(instrument,pattern,action){ const notes=[...pattern[instrument]]; if(action==='Simplify')notes.forEach((_,i)=>{if(i%2===1)notes[i]=0;}); else notes.forEach((n,i)=>{if(i%4===2)notes[i]=instrument==='drums'?(n|4):[1,5,4,6][Math.floor(i/4)]??1;}); return {title:action==='Simplify'?'Leave a little space':'Give it a little lift',instrument,description:`${action==='Simplify'?'Remove alternate notes from':'Add off-beat accents to'} your ${instrument} lane.`,notes}; } };