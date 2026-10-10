import test from "node:test";
import assert from "node:assert/strict";
import { createPattern, withNote } from "../src/sequencer.js";
import { beatFingerprint, beatStats, beatArtworkSvg, seatShares, walletShares, shareSummary } from "../src/beat-card.js";
import { beatCardHTML, escapeCardText } from "../src/beat-card-view.js";

test("artwork is deterministic and changes with the actual recorded pattern",()=>{
 const empty=createPattern();
 const beat=withNote(empty,"drums",0,0);
 const art=beatArtworkSvg(beat);
 assert.equal(art,beatArtworkSvg(beat));
 assert.ok(art.startsWith("<svg"));
 assert.match(art,/120 BPM/);
 assert.match(art,/PATTERN /);
 assert.notEqual(beatFingerprint(empty),beatFingerprint(beat));
 assert.notEqual(beatArtworkSvg(empty),art);
});
test("simultaneous drum hits have distinct art fingerprint",()=>{
 const a=withNote(createPattern(),"drums",4,0);
 const b=withNote(a,"drums",4,1);
 assert.notEqual(beatFingerprint(a),beatFingerprint(b));
 assert.equal(beatStats(b).notes,2);
 assert.equal(beatStats(b).seats,1);
});
test("seat shares count eligible seats, aggregate multiple seats and ignore empty",()=>{
 const room={
   eligibleMask:11,
   seats:["0xAbCd","0xBBBB","0xEEEE","0xabcd"]
 };
 const seats=seatShares(room);
 assert.deepEqual(seats.map(x=>x.instrument),["drums","bass","pluck"]);
 assert.equal(seats.reduce((sum,x)=>sum+x.percentage,0),100);
 const wallet=walletShares(room);
 assert.equal(wallet.length,2);
 assert.equal(wallet[0].seatCount,2);
 assert.equal(Math.round(wallet[0].percentage),67);
 assert.equal(wallet[1].seatCount,1);
});
test("local preview is explicit about off-chain status and escapes user input",()=>{
 const pattern=withNote(createPattern(),"synth",5,15);
 const html=beatCardHTML({pattern,title:'<script>alert("x")</script>'});
 assert.match(html,/LOCAL STUDIO \/ PREVIEW/);
 assert.match(html,/not a finalized chain record/);
 assert.ok(!html.includes("<script>"));
 assert.ok(html.includes("&lt;script&gt;"));
 assert.match(html,/data-card-solo="synth"/);
 assert.equal(escapeCardText("foo & bar"),"foo &amp; bar");
});
test("finalized card shows frozen on-chain claims and instrument roles",()=>{
 const pattern=withNote(createPattern(),"pluck",3,2);
 const html=beatCardHTML({
   pattern, title:"First Jam", room:{phase:"Finalized", eligibleMask:8,
   seats:["0x0000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000","0xabcde"]}
 });
 assert.match(html,/FINALIZED \/ MONAD TESTNET/);
 assert.match(html,/ON-CHAIN CONTRIBUTORS/);
 assert.match(html,/100%/);
 assert.match(html,/Share beat/);
 assert.equal(beatCardHTML({pattern:createPattern(),title:"Empty"}),"");
});
test("share summary has immutable fingerprint and actual note counts",()=>{
 const pattern=withNote(createPattern(),"bass",2,2);
 const summary=shareSummary({name:"Saturday",pattern});
 assert.match(summary,/Saturday/);
 assert.match(summary,/1 recorded hits/);
 assert.match(summary,/#[0-9A-F]{8}/);
 assert.throws(()=>beatFingerprint({drums:[],bass:[],synth:[],pluck:[]}));
});
