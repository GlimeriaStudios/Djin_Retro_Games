import {MIDI_SCORE} from './race-score.js';
// Play the supplied MIDI performance, retaining all 1,476 note starts, lengths,
// velocities and eight instrument parts. The original .mid remains downloadable.
export const SCORE={bpm:60e6/MIDI_SCORE.microsecondsPerBeat,stepsPerBar:16,bars:56};
const beat=MIDI_SCORE.microsecondsPerBeat/1e6,ticksPerBar=MIDI_SCORE.ppq*4;
const kinds=['bass','guitar','piano','theme','violin','viola','cello','drums'];
const drums={36:'kick',38:'snare',42:'hat',46:'openHat',49:'crash'};
const bars=Array.from({length:SCORE.bars},()=>[]);
for(const [tick,length,note,velocity,track]of MIDI_SCORE.notes){
 const kind=track===7?drums[note]:kinds[track];
 if(!kind)throw Error('Unsupported MIDI instrument');
 bars[Math.floor(tick/ticksPerBar)].push({kind,time:tick/MIDI_SCORE.ppq*beat,note,duration:length/MIDI_SCORE.ppq*beat,level:velocity/127});
}
export function scoreEvents(bar){
 const offset=Math.floor(bar/SCORE.bars)*MIDI_SCORE.endTick/MIDI_SCORE.ppq*beat;
 return bars[bar%SCORE.bars].map(e=>({...e,time:e.time+offset}));
}
export class RaceMusic{
 constructor(ctx){this.ctx=ctx;this.enabled=false;this.active=false;this.bar=0;this.origin=ctx.currentTime+.12;this.next=0;
  this.bus=ctx.createGain();this.bus.gain.value=0;const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-18;compressor.knee.value=12;compressor.ratio.value=3;this.compressor=compressor;this.bus.connect(compressor);compressor.connect(ctx.destination);
  this.noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const data=this.noise.getChannelData(0);let seed=71231;for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;data[i]=seed/1073741823.5-1;}
  this.timer=setInterval(()=>this.schedule(),25);
 }
 setEnabled(on){this.enabled=on;this.volume();}
 setActive(on){if(this.active===on)return;this.active=on;if(on){this.bar=0;this.next=0;this.events=[];this.origin=this.ctx.currentTime+.12;}this.volume();}
 volume(){this.bus.gain.setTargetAtTime(this.enabled&&this.active?.48:0,this.ctx.currentTime,.15);}
 schedule(){if(!this.active||!this.enabled||this.ctx.state!=='running')return;
  // Rebase after suspension rather than scheduling a burst of missed notes.
  if(this.origin+this.next<this.ctx.currentTime-.2)this.origin=this.ctx.currentTime+.05-this.next;
  while(this.origin+this.next<this.ctx.currentTime+.18){
   if(!this.events?.length)this.events=scoreEvents(this.bar++);
   const e=this.events[0];if(this.origin+e.time>this.ctx.currentTime+.18){this.next=e.time;break;}
   this.events.shift();this.play(e,this.origin+e.time);this.next=this.events[0]?.time??this.bar*4*beat;
  }
 }
 play(e,t){
  const ctx=this.ctx,g=ctx.createGain(),filter=ctx.createBiquadFilter();g.connect(filter);filter.connect(this.bus);
  const pitch=440*2**((e.note-69)/12),strings=['theme','violin','viola','cello'].includes(e.kind);
  // Per-part mix leaves headroom for chords, drums, and the game's sound effects.
  let source,peak=.12*e.level,attack=.006,release=.08,end=t+e.duration+release;
  if(['hat','openHat','snare','crash'].includes(e.kind)){
   source=ctx.createBufferSource();source.buffer=this.noise;
   filter.type='highpass';filter.frequency.value=e.kind==='snare'?1400:e.kind==='crash'?3500:7000;
   peak=(e.kind==='snare'?.18:e.kind==='crash'?.1:.065)*e.level;
   // Drum MIDI note-offs do not truncate the natural cymbal decay (seconds).
   end=t+(e.kind==='crash'?.95:e.kind==='openHat'?.28:e.kind==='snare'?.18:.06);
  }else{
   source=ctx.createOscillator();source.frequency.setValueAtTime(pitch,t);filter.type='lowpass';
   if(e.kind==='kick'){source.type='sine';source.frequency.setValueAtTime(125,t);source.frequency.exponentialRampToValueAtTime(43,t+.13);filter.frequency.value=500;peak=.42*e.level;end=t+.24;}
   else if(e.kind==='bass'){source.type='triangle';filter.frequency.setValueAtTime(1100,t);filter.frequency.exponentialRampToValueAtTime(180,t+.18);peak=.3*e.level;}
   else if(e.kind==='guitar'){source.type='sawtooth';filter.type='bandpass';filter.frequency.value=1500;filter.Q.value=.8;peak=.055*e.level;}
   else if(e.kind==='piano'){source.type='triangle';filter.frequency.value=2300;peak=.11*e.level;}
   else{source.type='sawtooth';filter.frequency.value=e.kind==='cello'?1000:e.kind==='viola'?1500:2100;peak=(e.kind==='theme'?.065:.04)*e.level;attack=Math.min(.09,e.duration*.35);release=.16;end=t+e.duration+release;}
  }
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(peak,t+attack);
  // Bowed parts sustain to the authored note-off instead of fading like plucks.
  if(strings){g.gain.setValueAtTime(peak*.8,t+e.duration);}
  g.gain.exponentialRampToValueAtTime(.0001,end);
  source.connect(g);source.start(t);source.stop(end+.02);source.onended=()=>{source.disconnect();g.disconnect();filter.disconnect();};
 }
 close(){clearInterval(this.timer);this.bus.disconnect();this.compressor.disconnect();}
}
