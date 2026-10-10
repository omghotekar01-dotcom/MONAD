import { describe,it,expect } from 'vitest';
import { MUSIC, emptyPattern, editStep, recordStep, validPattern, canEdit, remainingSeconds, eligibleTips, instruments, type Room } from '@/lib/beat-drop';
const room=():Room=>({id:'test',name:'Test',vibe:'Lo-fi',visibility:'public',status:'Live',host:'You',startedAt:Date.now(),seats:instruments.map(i=>({instrument:i,owner:i==='synth'?'Other':'You'})),pattern:emptyPattern()});
describe('BEAT DROP contract-compatible music rules',()=>{
  it('uses fixed 120 BPM',()=>expect(MUSIC.bpm).toBe(120));
  it('uses exactly 16 steps',()=>{expect(MUSIC.steps).toBe(16);expect(emptyPattern().drums).toHaveLength(16);});
  it('uses a 90-second live round',()=>expect(remainingSeconds(1000,91000)).toBe(0));
  it('targets Monad Testnet 10143',()=>expect(MUSIC.chainId).toBe(10143));
  it('uses four beats per bar',()=>expect(MUSIC.beatsPerBar).toBe(4));
  it('supports simultaneous drum voices with a 4-bit mask',()=>{let p=emptyPattern();for(let n=1;n<=4;n++)p=editStep(p,'drums',0,n);expect(p.drums[0]).toBe(15);});
  it('recording a repeated drum hit preserves the hit instead of toggling it off',()=>{let p=recordStep(emptyPattern(),'drums',0,1);p=recordStep(p,'drums',0,1);p=recordStep(p,'drums',0,2);expect(p.drums[0]).toBe(3);});
  it('allows melodic pitches 1 to 16 and rest zero',()=>{expect(editStep(emptyPattern(),'bass',0,16).bass[0]).toBe(16);expect(editStep(emptyPattern(),'bass',0,17).bass[0]).toBe(0);expect(validPattern({...emptyPattern(),bass:Array(16).fill(17)})).toBe(false);});
  it('restricts editing to the assigned instrument seat',()=>{const r=room();expect(canEdit(r,'drums')).toBe(true);expect(canEdit(r,'synth')).toBe(false);});
  it('locks finalized patterns',()=>{const r=room();r.status='Finalized';expect(canEdit(r,'drums')).toBe(false);});
  it('locks edits after 90 seconds',()=>{const r=room();r.startedAt=Date.now()-90001;expect(canEdit(r,'drums')).toBe(false);});
  it('excludes empty seats from equal tip allocation',()=>{const r=room();r.pattern.drums[0]=1;r.pattern.bass[0]=1;expect(eligibleTips(r,10n).map(a=>a.amount)).toEqual([5n,5n]);});
  it('allocates remainder deterministically by instrument order',()=>{const r=room();r.pattern.drums[0]=1;r.pattern.bass[0]=1;expect(eligibleTips(r,11n).map(a=>a.amount)).toEqual([6n,5n]);});
  it('allocates independently to multiple seats owned by one wallet',()=>{const r=room();r.pattern.drums[0]=1;r.pattern.bass[0]=1;expect(eligibleTips(r,10n).map(a=>a.owner)).toEqual(['You','You']);});
});