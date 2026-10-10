import { INSTRUMENTS, STEPS, validNote } from "./sequencer.js";

// No cloud models, API keys, tracking, or machine learning claims. This is a
// deterministic, style-aware arrangement engine for a fast zero-cost demo.
export const GENRES=Object.freeze({
  house:{label:"House",kick:[0,4,8,12],snare:[4,12],hat:[2,6,10,14],pulse:[0,4,8,12],turn:[12,14,15]},
  lofi:{label:"Lo-fi",kick:[0,7,10],snare:[4,12],hat:[2,6,10,14],pulse:[0,3,8,11],turn:[11,13,15]},
  trap:{label:"Trap",kick:[0,3,7,10],snare:[8],hat:[0,2,4,6,8,10,12,14],pulse:[0,3,7,10],turn:[12,13,15]},
  ambient:{label:"Ambient",kick:[0,8],snare:[],hat:[4,12],pulse:[0,6,10,14],turn:[11,13,15]}
});
export const ENERGIES=Object.freeze({1:"Sparse",2:"Balanced",3:"Energetic"});
export const ROLES=Object.freeze({drums:"Groove foundation",bass:"Low-end movement",synth:"Melodic lead",pluck:"Rhythmic accents"});
const assertPattern=pattern=>{
  for(const instrument of INSTRUMENTS){
    const lane=pattern?.[instrument];
    if(!Array.isArray(lane)||lane.length!==STEPS)throw new Error("Invalid 16-step pattern");
    for(const cell of lane){
      if(!Array.isArray(cell)||cell.some(note=>!validNote(instrument,note))||(instrument!=="drums"&&cell.length>1))throw new Error("Invalid musical note");
    }
  }
};
const serializeLane=lane=>lane.map(cell=>[...cell].sort((a,b)=>a-b).join(",")).join("|");
export function laneSignature(pattern,instrument){
  assertPattern(pattern);
  if(!INSTRUMENTS.includes(instrument))throw new Error("Unknown instrument");
  return serializeLane(pattern[instrument]);
}
export function laneChanges(before,after,instrument){
  const a=before[instrument],b=after[instrument];
  if(!Array.isArray(a)||!Array.isArray(b)||a.length!==STEPS||b.length!==STEPS)throw new Error("Invalid lane");
  return a.reduce((list,cell,step)=>{
    const from=[...cell].sort((x,y)=>x-y),to=[...b[step]].sort((x,y)=>x-y);
    if(JSON.stringify(from)!==JSON.stringify(to))list.push({step,before:[...cell],after:[...b[step]]});
    return list;
  },[]);
}
const clone=pattern=>Object.fromEntries(INSTRUMENTS.map(instrument=>[instrument,pattern[instrument].map(cell=>[...cell])]));
const xorSeed=(a,b)=>Math.imul(a^b,16777619)>>>0;
function seedFrom(pattern,instrument,style,energy,variant){
  const input=instrument+"|"+style+"|"+energy+"|"+variant+"|"+serializeLane(pattern[instrument]);
  let seed=2166136261;for(let i=0;i<input.length;i++)seed=xorSeed(seed,input.charCodeAt(i));
  return seed||1;
}
function randInt(seed,max) {
  let x=seed; x^=x<<13;x^=x>>>17;x^=x<<5;
  return [(x>>>0)%max,x>>>0];
}
const mergeDrum=(pattern,step,note)=>{
  const cell=pattern.drums[step];
  if(!cell.includes(note))pattern.drums[step]=[...cell,note].sort((a,b)=>a-b);
};
const setMelody=(pattern,instrument,step,note,overwrite=false)=>{
  if(pattern[instrument][step].length===0||overwrite)pattern[instrument][step]=[note];
};
function musicalPitch(instrument,step,root,seed) {
  // Selected notes stay in the app's existing 16-pitch pentatonic keyboard.
  const scale=instrument==="bass"?[0,2,3,4,5,7,8,10]:[0,2,3,4,6,7,9,11];
  const [offset]=randInt(seed^(step*2654435761),scale.length);
  return scale[(offset+Math.floor(step/4)+root)%scale.length];
}
function makeGroove(pattern,style,energy,variant,seed){
  const p=clone(pattern),beat=GENRES[style];
  const anchors=variant===0?beat.kick:variant===1?beat.pulse:beat.turn;
  if(variant===0) {
    for(const step of anchors)mergeDrum(p,step,0);
    for(const step of beat.snare)mergeDrum(p,step,1);
    if(energy>=2)for(const step of beat.hat)mergeDrum(p,step,2);
    if(energy===3)for(const step of [3,11,15])mergeDrum(p,step,2);
  }else if(variant===1){
    for(const step of beat.hat)mergeDrum(p,step,2);
    for(const step of (energy===1?[7]:energy===2?[7,15]:[3,7,11,15]))mergeDrum(p,step,3);
    for(const step of beat.snare)mergeDrum(p,step,1);
  }else {
    for(const step of [12,14,15])mergeDrum(p,step,2);
    mergeDrum(p,15,3);
    if(energy>=2)mergeDrum(p,13,1);
    if(energy===3)mergeDrum(p,14,0);
  }
  // Even if a groove is already fully occupied, supply a genuine contrast.
  if(!laneChanges(pattern,p,"drums").length){
    const step=[0,6,14][variant];
    const drum=[0,2,3][variant];
    p.drums[step]=p.drums[step].includes(drum)?p.drums[step].filter(x=>x!==drum):[...p.drums[step],drum].sort((a,b)=>a-b);
  }
  return p;
}
function makeMelody(pattern,instrument,style,energy,variant,seed){
  const p=clone(pattern),beat=GENRES[style];
  let steps=variant===0?beat.pulse:variant===1?[2,6,10,14]:beat.turn;
  if(variant===1&&style==="trap")steps=[3,7,11,15];
  if(energy===1)steps=steps.filter((_,index)=>index%2===0);
  if(energy===3)steps=[...new Set([...steps,...(variant===2?[12,15]:[5,13])])].sort((a,b)=>a-b);
  let nextSeed=seed;
  for(const [i,step] of steps.entries()){
    const [offset,newSeed]=randInt(nextSeed^(step+17),8);nextSeed=newSeed;
    const pitch=musicalPitch(instrument,step,i+variant+offset,seed);
    setMelody(p,instrument,step,pitch);
  }
  if(!laneChanges(pattern,p,instrument).length){
    const step=[0,7,15][variant];
    const old=p[instrument][step][0]??0;
    const replacement=(old+[1,3,5][variant])%16;
    setMelody(p,instrument,step,replacement,true);
  }
  return p;
}
const TITLES=[
  {name:"Build the foundation",why:"Adds a repeatable pulse and essential accents to hold the bar together."},
  {name:"Find a counter-rhythm",why:"Introduces offbeat movement and spaces notes against the main pulse."},
  {name:"Create a turnaround",why:"Adds a short end-of-bar phrase that leads naturally into the next loop."}
];
export function analyzeBeat(pattern){
  assertPattern(pattern);
  const lines=Object.fromEntries(INSTRUMENTS.map(instrument=>{
    const lane=pattern[instrument];
    return [instrument,{
      steps:lane.filter(cell=>cell.length>0).length,
      hits:lane.reduce((n,cell)=>n+cell.length,0),
      density:lane.filter(cell=>cell.length>0).length/STEPS,
      finalBeat:lane.slice(12).some(cell=>cell.length>0)
    }];
  }));
  return {lines,totalHits:INSTRUMENTS.reduce((sum,i)=>sum+lines[i].hits,0),
    activeInstruments:INSTRUMENTS.filter(i=>lines[i].hits>0)};
}
export function generateSuggestions(pattern,{instrument="drums",style="house",energy=2}={}){
  assertPattern(pattern);
  if(!INSTRUMENTS.includes(instrument))throw new Error("Select a valid instrument");
  if(!Object.hasOwn(GENRES,style))throw new Error("Choose a supported style");
  if(!Number.isInteger(energy)||energy<1||energy>3)throw new Error("Energy must be 1, 2 or 3");
  const baseline=laneSignature(pattern,instrument);
  const candidates=[];
  for(let variant=0;variant<3;variant++){
    const seed=seedFrom(pattern,instrument,style,energy,variant);
    const next=instrument==="drums"?makeGroove(pattern,style,energy,variant,seed):makeMelody(pattern,instrument,style,energy,variant,seed);
    const changes=laneChanges(pattern,next,instrument);
    if(!changes.length)throw new Error("Producer must never return a no-op");
    candidates.push({
      id:instrument+":"+style+":"+energy+":"+variant+":"+seed.toString(16),
      instrument,style,energy,variant,
      title:TITLES[variant].name,
      rationale:TITLES[variant].why+" "+ROLES[instrument]+".",
      source:baseline,
      pattern:next,
      changes,
      originalHits:pattern[instrument].reduce((n,c)=>n+c.length,0),
      suggestedHits:next[instrument].reduce((n,c)=>n+c.length,0)
    });
  }
  return candidates;
}
export function suggestionIsCurrent(pattern,suggestion){
  return laneSignature(pattern,suggestion.instrument)===suggestion.source;
}
export function applySuggestion(pattern,suggestion){
  if(!suggestionIsCurrent(pattern,suggestion))throw new Error("This suggestion is stale: generate it again for the current loop.");
  const next=clone(pattern);
  for(const change of suggestion.changes)next[suggestion.instrument][change.step]=[...change.after];
  return next;
}

export function generateFullBeat(pattern,{style="house",energy=2}={}){
  assertPattern(pattern);
  const source=JSON.stringify(pattern);
  let next=clone(pattern);
  const variants={drums:0,bass:0,synth:1,pluck:2};
  const edits=[];
  for(const instrument of INSTRUMENTS){
    const idea=generateSuggestions(next,{instrument,style,energy})[variants[instrument]];
    const before=next;
    next=applySuggestion(before,idea);
    for(const change of laneChanges(before,next,instrument)){
      edits.push({...change,instrument});
    }
  }
  return {
    kind:"full",
    id:"full:"+style+":"+energy+":"+source.length,
    title:"Full four-track arrangement",
    rationale:"A drum foundation, supporting bass, counter-rhythm synth and bright pluck turnaround.",
    style,energy,source,pattern:next,
    changes:edits
  };
}
export function fullBeatIsCurrent(pattern,draft){
  assertPattern(pattern);
  return draft?.kind==="full" && JSON.stringify(pattern)===draft.source;
}
export function applyFullBeat(pattern,draft){
  if(!fullBeatIsCurrent(pattern,draft))throw new Error("Full beat draft is stale. Generate it again.");
  return clone(draft.pattern);
}
