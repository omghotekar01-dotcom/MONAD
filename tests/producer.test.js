import test from "node:test";
import assert from "node:assert/strict";
import { createPattern, withNote, INSTRUMENTS } from "../src/sequencer.js";
import {GENRES,ENERGIES,analyzeBeat,generateSuggestions,applySuggestion,laneChanges,laneSignature,suggestionIsCurrent,generateFullBeat,fullBeatIsCurrent,applyFullBeat} from "../src/producer.js";
test("all 4 instruments × 4 genres × 3 energy levels produce exactly three actionable ideas",()=>{
 for(const instrument of INSTRUMENTS)for(const style of Object.keys(GENRES))for(const energy of [1,2,3]){
  const original=createPattern();
  const plans=generateSuggestions(original,{instrument,style,energy});
  assert.equal(plans.length,3);
  for(const p of plans){
   assert.ok(p.changes.length>0);
   assert.equal(p.instrument,instrument);
   const changed=applySuggestion(original,p);
   assert.deepEqual(laneChanges(original,changed,instrument),p.changes);
   assert.ok(changed[instrument].flat().every(n=>Number.isInteger(n)&&n>=0&&n<(instrument==="drums"?4:16)));
   for(const other of INSTRUMENTS.filter(x=>x!==instrument))assert.deepEqual(changed[other],original[other]);
  }
 }
});
test("fully occupied drum and melodic lanes still yield non-no-op suggestions",()=>{
 let full=createPattern();
 for(let step=0;step<16;step++){
  for(const note of [0,1,2,3])full=withNote(full,"drums",step,note,true);
  full=withNote(full,"synth",step,5,true);
 }
 for(const instrument of ["drums","synth"]){
  for(const p of generateSuggestions(full,{instrument,style:"house",energy:2})){
   assert.ok(p.changes.length>0);
   assert.notEqual(laneSignature(applySuggestion(full,p),instrument),laneSignature(full,instrument));
  }
 }
});
test("stale proposals refuse to overwrite a changed original lane",()=>{
 const base=createPattern(),plans=generateSuggestions(base,{instrument:"bass",style:"lofi",energy:3});
 const changed=withNote(base,"bass",1,3,true);
 assert.equal(suggestionIsCurrent(changed,plans[0]),false);
 assert.throws(()=>applySuggestion(changed,plans[0]),/stale/);
 assert.equal(suggestionIsCurrent(withNote(base,"drums",0,0,true),plans[0]),true);
});
test("generated output is reproducible, data-only and never mutates input",()=>{
 const start=withNote(createPattern(),"pluck",4,5,true);
 const before=JSON.stringify(start);
 const a=generateSuggestions(start,{instrument:"pluck",style:"trap",energy:2});
 const b=generateSuggestions(start,{instrument:"pluck",style:"trap",energy:2});
 assert.deepEqual(a,b);
 assert.equal(JSON.stringify(start),before);
 assert.equal(analyzeBeat(start).lines.pluck.hits,1);
 assert.equal(analyzeBeat(start).lines.pluck.steps,1);
});
test("invalid input is rejected before production",()=>{
 assert.throws(()=>generateSuggestions({}),/Invalid/);
 assert.throws(()=>generateSuggestions(createPattern(),{instrument:"flute"}),/valid instrument/);
 assert.throws(()=>generateSuggestions(createPattern(),{style:"unknown"}),/supported style/);
 assert.throws(()=>generateSuggestions(createPattern(),{energy:0}),/Energy/);
 assert.deepEqual(Object.keys(ENERGIES),["1","2","3"]);
});

test("full starter beat creates four instrument contributions and preserves original",()=>{
 const start=createPattern();
 const full=generateFullBeat(start,{style:"house",energy:2});
 assert.equal(full.kind,"full");
 assert.equal(full.changes.length>0,true);
 assert.deepEqual(full.pattern.drums.some(x=>x.length>0),true);
 for(const inst of INSTRUMENTS)assert.equal(full.pattern[inst].some(x=>x.length>0),true);
 assert.deepEqual(start,createPattern());
 assert.deepEqual(applyFullBeat(start,full),full.pattern);
 assert.equal(fullBeatIsCurrent(withNote(start,"drums",0,1),full),false);
 assert.throws(()=>applyFullBeat(withNote(start,"bass",0,1),full),/stale/);
});
test("full starter respects validated melodic monophony for all styles",()=>{
 for(const style of Object.keys(GENRES)){
   const full=generateFullBeat(createPattern(),{style,energy:3});
   for(const inst of INSTRUMENTS.filter(x=>x!=="drums"))
     assert.ok(full.pattern[inst].every(c=>c.length<=1));
 }
});
