import { describe,it,expect } from 'vitest';
import { emptyPattern, samplePattern, type Instrument } from '@/lib/beat-drop';
import { patternToChain, patternFromChain, isOnChainId, sameWallet, abbreviatedWallet, chainConfigured, ensureContract } from '@/services/monad-bridge';

describe('original Lovable UI ↔ actual Monad contract encoding',()=>{
  it('round-trips all four 16-step sample instruments without losing drum polyphony',()=>{
    const pattern=samplePattern(2);
    const translated=patternToChain(pattern);
    expect(translated.drums.length).toBe(16);
    expect(translated.bass.length).toBe(16);
    expect(translated.synth.length).toBe(16);
    expect(translated.pluck.length).toBe(16);
    expect(patternFromChain(translated)).toEqual(pattern);
  });
  it('encodes a multi-hit kick/hat/clap bitmask and pitch bounds precisely',()=>{
    const pattern=emptyPattern();
    pattern.drums[0]=1+4+8; // kick+hat+clap
    pattern.bass[2]=16; // highest pitch
    const cells=patternToChain(pattern);
    expect(cells.drums[0]).toEqual([0,2,3]);
    expect(cells.bass[2]).toEqual([15]);
    expect(cells.synth[2]).toEqual([]);
    expect(patternFromChain(cells)).toEqual(pattern);
  });
  it('validates actual room IDs and identifies real wallet owners case-insensitively',()=>{
    expect(isOnChainId('12')).toBe(true);
    expect(isOnChainId('BD-CHILL')).toBe(false);
    expect(isOnChainId('0')).toBe(false);
    expect(isOnChainId('room/12')).toBe(false);
    expect(sameWallet('0xAbCd','0xabcd')).toBe(true);
    expect(sameWallet(null,'0xabcd')).toBe(false);
    expect(abbreviatedWallet(null)).toBe('Open seat');
  });
  it('never permits a fake chain creation while contract is unconfigured',()=>{
    if(!chainConfigured)expect(()=>ensureContract()).toThrow(/Deploy BeatDrop.sol/);
  });
});
