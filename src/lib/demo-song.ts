import { emptyPattern, validPattern, type Pattern } from './beat-drop';

/**
 * BEAT DROP ORIGINAL · one bar, 16 steps, 120 BPM, four voices.
 * Repeating 45 bars fills the 90-second jam. No third-party song samples.
 * The very same 4x16 values can be stored on Monad (no off-chain-only layers).
 */
export const SIGNATURE_SONG = Object.freeze({
  title:'Midnight on Monad',
  artist:'BEAT DROP / Original demo',
  bpm:120,
  description:'Warm low-end, a syncopated backbeat, a bright pentatonic hook and a spacious answering pluck.',
  durationSeconds:90,
  repeats:45,
  instruments:['Drums: four-on-the-floor with snare, hats and clap',
    'Bass: C minor-pentatonic pulse',
    'Synth: rising C–E♭–G motif',
    'Pluck: a complementary offbeat answering phrase']
});
export function signaturePattern():Pattern{
  const p=emptyPattern();
  // Drum bitmask: 1 kick, 2 snare, 4 hat, 8 clap.
  p.drums=[1,4,4,4,3,4,4,4,1,4,5,4,11,4,4,12];
  // Indexes 1..16 are the app's published pentatonic pitch grid.
  p.bass=[1,0,0,1,0,0,5,0,1,0,0,4,0,0,5,0];
  p.synth=[6,0,8,0,9,0,8,0,11,0,9,0,8,0,6,0];
  p.pluck=[0,0,0,10,0,0,8,0,0,10,0,0,12,0,0,8];
  if(!validPattern(p))throw new Error('Invalid signature pattern.');
  return p;
}
export function signatureNoteCount(pattern:Pattern=signaturePattern()){
  return Object.values(pattern).reduce((hits,lane)=>hits+lane.reduce((sum,cell)=>sum+(cell?1:0),0),0);
}
