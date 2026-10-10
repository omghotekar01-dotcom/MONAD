export const MUSIC = { bpm: 120, steps: 16, duration: 90, chainId: 10143, beatsPerBar: 4 } as const;
export const instruments = ['drums', 'bass', 'synth', 'pluck'] as const;
export type Instrument = typeof instruments[number];
export type Pattern = Record<Instrument, number[]>;
export type RoomStatus = 'Lobby' | 'Live' | 'Finalized';
export interface InstrumentSeat { instrument: Instrument; owner: string | null }
export interface Room { id: string; name: string; vibe: string; visibility: 'public' | 'private'; status: RoomStatus; seats: InstrumentSeat[]; host: string; startedAt?: number; pattern: Pattern }
export interface Beat { id: string; title: string; vibe: string; creator: string; cover: number; pattern: Pattern; roomId?: string; createdAt?: number }
export interface TipAllocation { instrument: Instrument; owner: string; amount: bigint }
export const keys = ['a','s','d','f','g','h','j','k','q','w','e','r','t','y','u','i'];
export const pitches = ['C3','D3','E3','G3','A3','C4','D4','E4','G4','A4','C5','D5','E5','G5','A5','C6'];
export const drumNames = ['Kick','Snare','Hat','Clap'];
export function emptyPattern(): Pattern { return { drums: Array(16).fill(0), bass: Array(16).fill(0), synth: Array(16).fill(0), pluck: Array(16).fill(0) }; }
export function samplePattern(variant = 0): Pattern {
  const p = emptyPattern();
  for(let s=0;s<16;s++) { p.drums[s]=(s%4===0?1:0)|(s%4===2?4:0)|((s===4||s===12)?2:0); if(s%4===0)p.bass[s]=[1,1,5,4][Math.floor(s/4)]??1; if(s%4===2)p.synth[s]=[6,8,7,5][Math.floor(s/4)]??1; if(s%2===1)p.pluck[s]=[6,7,8,10][(s+variant)%4]??6; }
  return p;
}
export function validPattern(value: unknown): value is Pattern {
  if (!value || typeof value !== 'object') return false;
  return instruments.every(i => { const lane = (value as Record<string, unknown>)[i]; return Array.isArray(lane) && lane.length===16 && lane.every(n=>Number.isInteger(n)&&n>=0&&n<=(i==='drums'?15:16)); });
}
export function editStep(p: Pattern, instrument: Instrument, step: number, note: number): Pattern {
  if (step<0||step>=16||note<1||note>(instrument==='drums'?4:16)) return p;
  const lane = [...p[instrument]];
  lane[step] = instrument==='drums' ? (lane[step]??0) ^ (1 << (note-1)) : lane[step]===note ? 0 : note;
  return { ...p, [instrument]: lane };
}
export function canEdit(room: Room, instrument: Instrument, user='You'): boolean { return room.status==='Live' && room.seats.find(s=>s.instrument===instrument)?.owner===user && remainingSeconds(room.startedAt)>0; }
export function recordStep(p: Pattern, instrument: Instrument, step: number, note: number): Pattern {
  if(step<0||step>=16||note<1||note>(instrument==='drums'?4:16))return p;
  const lane=[...p[instrument]];
  lane[step]=instrument==='drums'?(lane[step]??0)|(1<<(note-1)):note;
  return {...p,[instrument]:lane};
}
export function remainingSeconds(startedAt?: number, now=Date.now()): number { return startedAt===undefined?MUSIC.duration:Math.max(0, Math.ceil(MUSIC.duration-(now-startedAt)/1000)); }
export function eligibleTips(room: Room, total: bigint): TipAllocation[] {
  const seats=room.seats.filter(s=>s.owner && room.pattern[s.instrument].some(n=>n>0));
  if(!seats.length) return [];
  const base=total/BigInt(seats.length), remainder=total%BigInt(seats.length);
  return seats.map((s,index)=>({instrument:s.instrument,owner:s.owner??'',amount:base+(BigInt(index)<remainder?1n:0n)}));
}
export const demoRooms: Room[] = [
  { id:'BD-CHILL', name:'Late night, low lights', vibe:'Lo-fi', status:'Lobby', visibility:'public', host:'milo', seats:instruments.map((i,n)=>({instrument:i,owner:n===0?'milo':n===2?'jade':null})), pattern:samplePattern() },
  { id:'BD-GROOVE', name:'A little house party', vibe:'House', status:'Lobby', visibility:'public', host:'ellie', seats:instruments.map((i,n)=>({instrument:i,owner:n===1?'ellie':null})), pattern:samplePattern(1) },
  { id:'BD-NEON', name:'Somewhere after hours', vibe:'Electronic', status:'Live', visibility:'public', host:'noah', seats:instruments.map((i,n)=>({instrument:i,owner:['noah','kai','ava','leo'][n]??null})), pattern:samplePattern(2) },
];
export const demoBeats: Beat[] = [
  {id:'mint-condition',title:'Mint condition',vibe:'Lo-fi',creator:'milo, jade + 2',cover:0,pattern:samplePattern()},
  {id:'blue-hour',title:'Blue hour',vibe:'House',creator:'ellie, kai + 2',cover:1,pattern:samplePattern(1)},
  {id:'soft-landing',title:'Soft landing',vibe:'Ambient',creator:'ava, noah + 2',cover:2,pattern:samplePattern(2)},
];
export function pageHead(title: string, description: string) { return { meta: [{title:`${title} — BEAT DROP`},{name:'description',content:description},{property:'og:title',content:`${title} — BEAT DROP`},{property:'og:description',content:description},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}] }; }