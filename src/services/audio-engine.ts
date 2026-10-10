import { MUSIC, instruments, pitches, type Pattern, type Instrument } from '@/lib/beat-drop';
type ToneModule = typeof import('tone');
export interface AudioEngine { unlock(): Promise<void>; trigger(instrument: Instrument, note: number): void; play(pattern:()=>Pattern, onStep:(step:number)=>void): Promise<void>; stop(): void; volume(value:number):void; tempo(bpm:number):void; channel(instrument:Instrument,value:number):void; waveform():Float32Array }
class BrowserAudioEngine implements AudioEngine {
  private tone?: ToneModule;
  private bpm:number=MUSIC.bpm;
  private loading: Promise<void> | undefined;
  private loop: import('tone').Loop | undefined;
  private drums?: import('tone').MembraneSynth;
  private noise?: import('tone').NoiseSynth;
  private hat?: import('tone').MetalSynth;
  private melodic: Partial<Record<Instrument, import('tone').PolySynth>> = {};
  private echoes: Partial<Record<Instrument, import('tone').FeedbackDelay>> = {};
  private gains: Partial<Record<Instrument, import('tone').Gain>> = {};
  private master?: import('tone').Gain;
  private compressor?: import('tone').Compressor;
  private limiter?: import('tone').Limiter;
  private analyser?: import('tone').Waveform;
  async unlock() {
    if (!this.loading) this.loading=this.initialize().catch(e=>{this.loading=undefined;throw e;});
    await this.loading;
    await this.tone?.start();
  }
  private async initialize() {
    const T=await import('tone'); this.tone=T;
    // Loudness upgrade: approximately 2.5–3x nominal gain before peak control.
    // A compressor and -1 dB limiter prevent hard digital clipping when
    // drums, bass and melodic notes hit simultaneously.
    this.limiter=new T.Limiter(-1).toDestination();
    this.compressor=new T.Compressor(-16,3);
    this.compressor.attack.value=.006;
    this.compressor.release.value=.18;
    this.compressor.connect(this.limiter);
    this.master=new T.Gain(1.9).connect(this.compressor);
    this.analyser=new T.Waveform(128); this.limiter.connect(this.analyser);
    for(const i of instruments)this.gains[i]=new T.Gain(.9).connect(this.master);
    const drumGain=this.gains.drums; if(!drumGain)return;
    this.drums=new T.MembraneSynth({pitchDecay:.04,octaves:5,envelope:{attack:.001,decay:.3,sustain:0,release:.1},volume:-3}).connect(drumGain);
    this.noise=new T.NoiseSynth({noise:{type:'white'},envelope:{attack:.001,decay:.12,sustain:0,release:.02},volume:-13}).connect(drumGain);
    this.hat=new T.MetalSynth({envelope:{attack:.001,decay:.045,release:.02},harmonicity:5.1,resonance:3000,modulationIndex:32,volume:-17}).connect(drumGain);
    for(const i of ['bass','synth','pluck'] as const){
      const gain=this.gains[i];if(!gain)continue;
      // A restrained echo makes the original melody feel less like isolated
      // click tones. Bass stays dry and centered to preserve low-end clarity.
      const destination=i==='bass'?gain:(this.echoes[i]=new T.FeedbackDelay('8n',.16).connect(gain));
      if(i!=='bass'&&this.echoes[i])this.echoes[i].wet.value=i==='synth'?.13:.2;
      this.melodic[i]=new T.PolySynth(T.Synth,{
        oscillator:{type:i==='bass'?'triangle':i==='synth'?'triangle':'triangle'},
        envelope:{attack:i==='synth'?.025:.003,decay:.15,sustain:i==='pluck'?0:.15,release:.15},
        volume:i==='bass'?-5:i==='synth'?-8:-9
      }).connect(destination);
    }
    T.getTransport().bpm.value=this.bpm;
  }
  private hit(instrument: Instrument,note:number,time?:number) {
    if(!this.tone)return;
    if(instrument==='drums'){if(note===1)this.drums?.triggerAttackRelease('C1','16n',time); else if(note===3)this.hat?.triggerAttackRelease('C4','32n',time);else this.noise?.triggerAttackRelease(note===4?'32n':'16n',time);}
    else {const pitch=pitches[note-1]; if(pitch)this.melodic[instrument]?.triggerAttackRelease(instrument==='bass'?pitch.replace(/\d/,x=>String(Math.max(1,Number(x)-1))):pitch,'16n',time);}
  }
  trigger(instrument:Instrument,note:number){this.hit(instrument,note);}
  async play(pattern:()=>Pattern,onStep:(step:number)=>void) {
    await this.unlock(); this.stop(); const T=this.tone;if(!T)return;
    let step=0;
    this.loop=new T.Loop(time=>{const p=pattern();for(const i of instruments){const n=p[i][step]??0;if(i==='drums'){for(let bit=0;bit<4;bit++)if(n&(1<<bit))this.hit(i,bit+1,time);}else if(n)this.hit(i,n,time);}const current=step;T.getDraw().schedule(()=>onStep(current),time);step=(step+1)%16;},'16n').start(0);
    T.getTransport().start();
  }
  stop(){this.loop?.dispose();this.loop=undefined;this.tone?.getTransport().stop();this.tone?.getTransport().cancel();}
  tempo(bpm:number){
    this.bpm=Math.max(65,Math.min(160,Math.round(bpm)));
    if(this.tone)this.tone.getTransport().bpm.rampTo(this.bpm,.08);
  }
  volume(value:number){
    // 0 stays completely silent; the 0..1 slider controls boosted pre-limiter gain.
    // Clamp programmatic input; the limiter handles simultaneous transient peaks.
    const safe=Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
    this.master?.gain.rampTo(safe*2.5,.06);
  }
  channel(instrument:Instrument,value:number){
    const safe=Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
    this.gains[instrument]?.gain.rampTo(safe,.05);
  }
  waveform(){return this.analyser?.getValue()??new Float32Array(128);}
}
export const audioEngine: AudioEngine = new BrowserAudioEngine();