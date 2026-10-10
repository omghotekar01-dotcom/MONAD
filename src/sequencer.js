export const INSTRUMENTS = Object.freeze(["drums","bass","synth","pluck"]);
export const LABELS = Object.freeze({drums:"DRUMS",bass:"BASS",synth:"SYNTH",pluck:"PLUCK"});
export const STEPS = 16;
export const BPM = 120;
export const STEP_SECONDS = 60 / BPM / 4;
export const COLORS = Object.freeze({drums:"#f28f7c",bass:"#b6a0ff",synth:"#73d3df",pluck:"#f2bd78"});
export const NOTES = Object.freeze({
  bass:["C2","D2","E2","G2","A2","C3","D3","E3","C3","D3","E3","G3","A3","C4","D4","E4"],
  synth:["C4","D4","E4","G4","A4","C5","D5","E5","C5","D5","E5","G5","A5","C6","D6","E6"],
  pluck:["C4","D4","E4","G4","A4","C5","D5","E5","C5","D5","E5","G5","A5","C6","D6","E6"]
});
export const KEY_LOWER = "asdfghjk";
export const KEY_UPPER = "qwertyui";
export const DRUM_KEYS = "asdf";
export const DRUM_NAMES = ["Kick","Snare","Hat","Clap"];
export function createPattern(){
 return Object.fromEntries(INSTRUMENTS.map(i=>[i,Array.from({length:STEPS},()=>[])]));
}
export function validNote(instrument,note){
 return instrument==="drums" ? Number.isInteger(note)&&note>=0&&note<4 : Number.isInteger(note)&&note>=0&&note<16;
}
export function withNote(pattern,instrument,step,note,enabled){
 if(!INSTRUMENTS.includes(instrument)||!Number.isInteger(step)||step<0||step>=STEPS||!validNote(instrument,note)) throw new RangeError("Invalid note address");
 const copy={...pattern,[instrument]:pattern[instrument].map(a=>[...a])};
 const original=copy[instrument][step];
 if(instrument==="drums"){
  const add=enabled===undefined?!original.includes(note):enabled;
  copy[instrument][step]=add?[...new Set([...original,note])].sort((a,b)=>a-b):original.filter(x=>x!==note);
 }else{
  const add=enabled===undefined?!original.includes(note):enabled;
  copy[instrument][step]=add?[note]:[];
 }
 return copy;
}
export function hasNotes(pattern){return INSTRUMENTS.some(i=>pattern[i].some(cell=>cell.length>0));}
export function contributions(pattern){return INSTRUMENTS.filter(i=>pattern[i].some(cell=>cell.length>0));}
export function allocation(pattern,owners){
 const seats=contributions(pattern).filter(i=>owners[i]);
 const shares={};
 for(const i of seats){shares[owners[i]]=(shares[owners[i]]??0)+1;}
 return {seats,weights:shares,totalSeats:seats.length};
}
export function keyToNote(instrument,key){
 const k=key.toLowerCase();
 if(instrument==="drums") return DRUM_KEYS.indexOf(k);
 const lower=KEY_LOWER.indexOf(k);if(lower>=0)return lower;
 const upper=KEY_UPPER.indexOf(k);return upper>=0?upper+8:-1;
}
export function quantizedStep(seconds){return ((Math.round(seconds/STEP_SECONDS)%STEPS)+STEPS)%STEPS;}
export function serialize(pattern){return JSON.stringify({version:1,bpm:BPM,steps:STEPS,pattern});}
export function deserialize(raw){
 const payload=JSON.parse(raw);
 if(payload.version!==1||payload.bpm!==BPM||payload.steps!==STEPS)throw new Error("Unsupported beat format");
 const p=payload.pattern;
 for(const i of INSTRUMENTS){
  if(!Array.isArray(p?.[i])||p[i].length!==STEPS)throw new Error("Invalid instrument pattern");
  for(const cell of p[i]){
   if(!Array.isArray(cell)||cell.some(n=>!validNote(i,n))||(i!=="drums"&&cell.length>1)||new Set(cell).size!==cell.length)throw new Error("Invalid pattern cell");
  }
 }
 return p;
}
