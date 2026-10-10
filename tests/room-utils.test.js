import test from "node:test";
import assert from "node:assert/strict";
import {createPattern} from "../src/sequencer.js";
import {roomHref,beatHref,roomIdFromSearch,encodeCell,decodeCell,decodePattern,editable,canFlush,makeBatches,applyOverlay,getEligibleSeats,shortAddress} from "../src/room-utils.js";
test("deep links survive static hosting query routing",()=>{
 assert.equal(roomHref(42,"https://a.example/?foo=1"),"https://a.example/?foo=1&room=42");
 assert.equal(beatHref("42","https://a.example/?room=22"),"https://a.example/?beat=42");
 assert.equal(roomIdFromSearch("?room=42"),42n);
 assert.equal(roomIdFromSearch("?room=1abc"),null);
 assert.equal(roomIdFromSearch("?room=-1"),null);
});
test("drum mask round trip handles simultaneous hits",()=>{
 assert.equal(encodeCell("drums",[0,2,3]),13);
 assert.deepEqual(decodeCell("drums",13),[0,2,3]);
 assert.deepEqual(decodeCell("synth",16),[15]);
 assert.equal(encodeCell("synth",[15]),16);
 assert.equal(encodeCell("bass",[]),0);
 assert.throws(()=>encodeCell("synth",[1,2]));
 assert.throws(()=>decodeCell("drums",16));
});
test("64 decoded cells map into the existing sequencer",()=>{
 const raw=Array.from({length:4},()=>Array(16).fill(0));
 raw[0][4]=11; raw[2][7]=16;
 const beat=decodePattern(raw);
 assert.deepEqual(beat.drums[4],[0,1,3]); assert.deepEqual(beat.synth[7],[15]);
 assert.throws(()=>decodePattern(raw.slice(1)));
});
test("readonly and locked lanes cannot record",()=>{
 const room={phase:"Live",seats:["0xAbC","0xdef",null,null],endsAt:200};
 assert.equal(editable(room,"0xabc","drums",100),true);
 assert.equal(editable(room,"0xdef","drums",100),false);
 assert.equal(editable(room,"0xabc","drums",197),false);
 assert.equal(canFlush(room,"0xabc","drums",197),true);
 assert.equal(canFlush(room,"0xabc","drums",200),false);
});
test("coalesced batches are sorted by lane and step",()=>{
 const batch=makeBatches([["drums:8",[0,3]],["drums:0",[1]],["pluck:5",[15]]]);
 assert.deepEqual(batch[0].steps,[0,8]);assert.deepEqual(batch[0].values,[2,9]);
 assert.deepEqual(batch[1].values,[16]);
});
test("confirmed chain state overlays only explicitly pending local cells",()=>{
 const base=createPattern(), queued=new Map([["drums:0",[0]]]),inflight=new Map([["bass:2",[8]]]);
 const merged=applyOverlay(base,queued,inflight);
 assert.deepEqual(merged.drums[0],[0]);assert.deepEqual(merged.bass[2],[8]);
 assert.deepEqual(base.drums[0],[]);
 assert.deepEqual(getEligibleSeats({eligibleMask:5}),["drums","synth"]);
 assert.equal(shortAddress("0x123456789012"),"0x1234…9012");
});
