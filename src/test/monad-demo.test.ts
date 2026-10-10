import { describe,it,expect } from 'vitest';
import { emptyPattern, validPattern, instruments } from '@/lib/beat-drop';
import { SIGNATURE_SONG, signaturePattern, signatureNoteCount } from '@/lib/demo-song';
import { summarizeTransactions, ACTIVITY_LABELS } from '@/lib/chain-activity';
import type { ChainActivityItem } from '@/services/monad-bridge';

const fake=(step:number,hash='0xabc'):ChainActivityItem=>({
 name:'NoteSet',hash,block:100,index:step,owner:'0xA',
 operator:'0xA',instrument:0,step,value:1,amount:null,eligibleMask:null
});
describe('Original signature-song demo',()=>{
 it('has four valid 16-step on-chain-compatible tracks',()=>{
  const p=signaturePattern();
  expect(validPattern(p)).toBe(true);
  expect(SIGNATURE_SONG.repeats).toBe(45);
  expect(SIGNATURE_SONG.durationSeconds).toBe(90);
  expect(signatureNoteCount(p)).toBeGreaterThan(20);
  expect(instruments.every(i=>p[i].some(v=>v!==0))).toBe(true);
 });
 it('returns a fresh pattern, never shared mutable notes',()=>{
  const a=signaturePattern(),b=signaturePattern();
  a.drums[0]=0;
  expect(b.drums[0]).not.toBe(0);
  expect(validPattern(emptyPattern())).toBe(true);
 });
});
describe('Real contract transaction explorer grouping',()=>{
 it('shows multiple NoteSet events within one transaction as one edit batch',()=>{
  const items=summarizeTransactions([fake(0),fake(3),fake(7)]);
  expect(items).toHaveLength(1);
  expect(items[0]?.count).toBe(3);
  expect(items[0]?.steps).toEqual([1,4,8]);
  expect(items[0]?.hash).toBe('0xabc');
 });
 it('keeps separate transaction hashes separate and never invents edits',()=>{
  const items=summarizeTransactions([fake(0,'0xone'),fake(1,'0xtwo')]);
  expect(items).toHaveLength(2);
  expect(summarizeTransactions([])).toEqual([]);
  expect(ACTIVITY_LABELS.NoteSet).toContain('Musical notes');
 });
});
