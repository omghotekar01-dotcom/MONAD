import { INSTRUMENTS, COLORS, STEPS, hasNotes } from "./sequencer.js";
import { sameAddress, shortAddress } from "./room-utils.js";

export function beatFingerprint(pattern) {
  // FNV-1a over a canonical, integer-only 4 x 16 note representation.
  let hash=2166136261;
  for(const instrument of INSTRUMENTS) {
    if(!Array.isArray(pattern?.[instrument]) || pattern[instrument].length !== STEPS) throw new Error("Invalid beat pattern");
    for(const cell of pattern[instrument]) {
      if(!Array.isArray(cell)) throw new Error("Invalid beat cell");
      const notes=[...cell].sort((a,b)=>a-b);
      hash=Math.imul(hash ^ notes.length,16777619)>>>0;
      for(const n of notes) {
        if(!Number.isInteger(n) || n<0 || n>15)throw new Error("Invalid beat note");
        hash=Math.imul(hash ^ (n+1),16777619)>>>0;
      }
      hash=Math.imul(hash ^ 255,16777619)>>>0;
    }
  }
  return hash.toString(16).toUpperCase().padStart(8,"0");
}
export function beatStats(pattern){
  const active=INSTRUMENTS.filter(key=>pattern[key].some(cell=>cell.length>0));
  const notes=INSTRUMENTS.reduce((sum,key)=>sum+pattern[key].reduce((n,c)=>n+c.length,0),0);
  return {notes, active, seats:active.length, fingerprint:beatFingerprint(pattern), playable:hasNotes(pattern)};
}
export function seatShares(room){
  if(!room || !Array.isArray(room.seats) || room.seats.length!==4) return [];
  const mask=Number(room.eligibleMask||0);
  const active=INSTRUMENTS.map((instrument,index)=>({instrument,index,address:room.seats[index]}))
    .filter(x=>((mask>>x.index)&1)===1 && x.address);
  // This is per-seat entitlement; integer MON rounding is handled on-chain,
  // with each tip's leftover wei allocated to the lowest eligible seat.
  return active.map(x=>({...x,shareNumerator:1,shareDenominator:active.length,percentage:100/active.length}));
}
export function walletShares(room) {
  const rows=[];
  for(const seat of seatShares(room)){
    let row=rows.find(x=>sameAddress(x.address,seat.address));
    if(!row){row={address:seat.address,seatCount:0,instruments:[],percentage:0};rows.push(row);}
    row.seatCount++;row.instruments.push(seat.instrument);
    row.percentage+=seat.percentage;
  }
  return rows;
}
function arc(cx,cy,r,a0,a1) {
  const toRadians=a=>a*Math.PI/180;
  const sx=cx+r*Math.cos(toRadians(a0)),sy=cy+r*Math.sin(toRadians(a0));
  const ex=cx+r*Math.cos(toRadians(a1)),ey=cy+r*Math.sin(toRadians(a1));
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 0 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
}
export function beatArtworkSvg(pattern) {
  const fingerprint=beatFingerprint(pattern);
  const seed=parseInt(fingerprint,16)>>>0;
  const cx=365,cy=265;
  const rings=INSTRUMENTS.map((instrument,lane)=>{
    const radius=93+lane*37;
    const color=COLORS[instrument];
    const guide=`<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${color}" stroke-opacity=".12" stroke-width="1"/>`;
    const hits=pattern[instrument].map((cell,step)=>{
      const start=-90+step*22.5+2.2, end=start+18.1;
      if(!cell.length)return `<path d="${arc(cx,cy,radius,start+6,end-6)}" fill="none" stroke="${color}" stroke-opacity=".11" stroke-width="5" stroke-linecap="round"/>`;
      const intensity=instrument==="drums" ? Math.min(cell.length/4,1) : (cell[0]+1)/16;
      const width=7+intensity*8;
      return `<path d="${arc(cx,cy,radius,start,end)}" fill="none" stroke="${color}" stroke-opacity=".96" stroke-width="${width.toFixed(2)}" stroke-linecap="round"/>`;
    }).join("");
    return guide+hits;
  }).join("");
  const points=Array.from({length:42},(_,i)=>{
    const v=(Math.imul(seed^(i*2654435761),2246822519)>>>0);
    const x=40+v%680,y=35+((v>>>11)%460);
    const radius=.4+(v%3)*.35;
    return `<circle cx="${x}" cy="${y}" r="${radius}" fill="#E5F2FF" opacity=".20"/>`;
  }).join("");
  const innerLines=Array.from({length:16},(_,i)=>{
    const angle=i*22.5-90;
    const length=24+((seed>>>((i%8)*4))&15)*2;
    const rad=angle*Math.PI/180;
    return `<line x1="${(cx+18*Math.cos(rad)).toFixed(1)}" y1="${(cy+18*Math.sin(rad)).toFixed(1)}" x2="${(cx+length*Math.cos(rad)).toFixed(1)}" y2="${(cy+length*Math.sin(rad)).toFixed(1)}" stroke="#eaf4ff" stroke-opacity=".15" stroke-width="1"/>`;
  }).join("");
  // Generated numeric geometry and constant colors only. No user-supplied SVG/HTML.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 730 530" role="img" aria-label="Unique four-instrument beat pattern artwork">
    <defs>
      <radialGradient id="beatGlow"><stop offset="0%" stop-color="#343b50"/><stop offset="62%" stop-color="#181d28"/><stop offset="100%" stop-color="#11151d"/></radialGradient>
      <radialGradient id="beatCore"><stop offset="0%" stop-color="#f3c389"/><stop offset="100%" stop-color="#a997fd"/></radialGradient>
    </defs>
    <rect width="730" height="530" rx="16" fill="url(#beatGlow)"/>
    ${points}
    <circle cx="${cx}" cy="${cy}" r="248" fill="none" stroke="#9eacc5" stroke-opacity=".12" stroke-dasharray="1 12"/>
    ${rings}${innerLines}
    <circle cx="${cx}" cy="${cy}" r="17" fill="url(#beatCore)" opacity=".93"/>
    <circle cx="${cx}" cy="${cy}" r="7" fill="#171a22"/>
    <text x="28" y="45" fill="#d4dbeb" font-family="system-ui,sans-serif" font-size="12" letter-spacing="4">BEAT DROP / ORIGINAL LOOP</text>
    <text x="28" y="500" fill="#949caf" font-family="monospace" font-size="13" letter-spacing="3">PATTERN ${fingerprint}</text>
    <text x="702" y="500" fill="#949caf" font-family="monospace" font-size="12" text-anchor="end">120 BPM / 16 STEPS</text>
  </svg>`;
}
export function shareSummary(room) {
  const stats=beatStats(room.pattern);
  return `BEAT DROP · ${room.name||"Untitled Loop"} · ${stats.notes} recorded hits · ${stats.seats} active instruments · #${stats.fingerprint}`;
}
export function creditLabel(address) {return shortAddress(address);}
