import {describe,it,expect} from 'vitest';
import {parseSafeTestTip,validateNoteBatch,MAX_UI_TIP_WEI} from '@/lib/transaction-guards';

describe('Monad Testnet tip guard',()=>{
 it('keeps full 18-decimal wei precision without floating point',()=>{
  expect(parseSafeTestTip('0.000000000000000001')).toBe(1n);
  expect(parseSafeTestTip('0.01')).toBe(10000000000000000n);
  expect(parseSafeTestTip('10')).toBe(MAX_UI_TIP_WEI);
 });
 it('rejects zero, negative, scientific notation, overflow and excess precision',()=>{
  for(const bad of ['',' ','0','0.000','-1','+1','1e3','1.0000000000000000001','10.000000000000000001','11','Infinity','NaN','01','.5','1.']){
   expect(()=>parseSafeTestTip(bad)).toThrow();
  }
 });
 it('allows normal decimal amounts without silently rounding',()=>{
  expect(parseSafeTestTip('0.5')).toBe(500000000000000000n);
  expect(parseSafeTestTip(' 2.125 ')).toBe(2125000000000000000n);
 });
});
describe('Monad on-chain step batches',()=>{
 it('accepts a valid 16-cell drum transaction and four melodic lanes',()=>{
  expect(()=>validateNoteBatch('drums',Array.from({length:16},(_,step)=>({step,value:step})))).not.toThrow();
  expect(()=>validateNoteBatch('synth',[{step:0,value:16},{step:15,value:0}])).not.toThrow();
 });
 it('rejects duplicate steps, invalid pitches, excessive batches and empty transactions',()=>{
  expect(()=>validateNoteBatch('drums',[])).toThrow();
  expect(()=>validateNoteBatch('drums',Array.from({length:17},(_,step)=>({step,value:1})))).toThrow();
  expect(()=>validateNoteBatch('drums',[{step:1,value:1},{step:1,value:2}])).toThrow(/Duplicate/);
  expect(()=>validateNoteBatch('drums',[{step:0,value:16}])).toThrow();
  expect(()=>validateNoteBatch('pluck',[{step:0,value:17}])).toThrow();
  expect(()=>validateNoteBatch('bass',[{step:-1,value:2}])).toThrow();
  expect(()=>validateNoteBatch('bass',[{step:2.2,value:2}])).toThrow();
  expect(()=>validateNoteBatch('bass',[{step:0,value:NaN}])).toThrow();
 });
});
