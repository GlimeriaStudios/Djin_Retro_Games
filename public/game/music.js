// Original procedural arrangement. No sampled recordings or third-party audio.
// Beethoven's public-domain opening motif enters after 32 bars, then every 24 bars.
export const SCORE={bpm:96,stepsPerBar:16,firstThemeBar:32,themePeriod:24};
const beat=60/SCORE.bpm;
export function scoreEvents(bar){
 const out=[],add=(kind,step,note=0,duration=.15,level=1)=>out.push({kind,time:(bar*16+step)*beat/4,note,duration,level});
 const groove=bar>=8,turn=bar%4;
 for(const [step,note,length,level]of(groove?[[0,36,.30,1],[3,36,.13,.55],[6,43,.18,.7],[8,36,.24,.95],[11,34,.12,.55],[14,39,.16,.7]]:[[0,36,.5,.8],[10,36,.28,.55]]))add('bass',step,note,length,level);
 if(bar>=4)for(let s=0;s<16;s+=2)add('hat',s,0,.055,s%4===0?.32:.52);
 if(bar>=6){add('snare',4,0,.14,.6);add('snare',12,0,.14,.7);}
 if(groove){for(const s of [0,7,8,14])add('kick',s,0,.22,s===0?1:.72);if(turn===3)add('hat',15,0,.14,.38);}
 if(bar>=12){const chord=turn===2?[53,56,60,63]:[55,58,62,63];for(const s of [2,5,10,13])for(const n of chord)add('guitar',s,n,.09,s===5?.48:.33);}
 if(bar>=20){const chord=turn===2?[60,65,68,72]:[60,63,67,74];for(const s of [3,11])for(const n of chord)add('piano',s,n,.65,.32);}
 const phase=(bar-SCORE.firstThemeBar)%SCORE.themePeriod;
 if(bar>=SCORE.firstThemeBar&&phase<8){
  // Eight-bar call and response, with breath between phrases and an original cadence.
  const phrases=[[[2,67,.18],[3,67,.18],[4,67,.2],[6,63,1.3]],[[2,65,.18],[3,65,.18],[4,65,.2],[6,62,1.3]],[[2,67,.18],[3,67,.18],[4,67,.2],[6,63,1.3]],[[2,65,.18],[3,65,.18],[4,65,.2],[6,62,1.3]],[[0,72,.55],[4,70,.4],[8,67,.65]],[[0,68,.55],[4,67,.4],[8,65,.65]],[[0,67,.3],[3,67,.3],[6,63,.65]],[[0,62,.5],[4,60,1.45]]];
  const swell=[.25,.38,.56,.75,.85,.7,.5,.25][phase];
  for(const [s,n,d]of phrases[phase]){add('theme',s,n,d,swell);add('theme',s,n-12,d,swell*.4);}
 }
 return out.sort((a,b)=>a.time-b.time);
}
export class RaceMusic{
 constructor(ctx){this.ctx=ctx;this.enabled=false;this.active=false;this.bar=0;this.origin=ctx.currentTime+.12;this.next=0;
  this.bus=ctx.createGain();this.bus.gain.value=0;const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-18;compressor.knee.value=12;compressor.ratio.value=3;this.bus.connect(compressor);compressor.connect(ctx.destination);
  this.noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const data=this.noise.getChannelData(0);let seed=71231;for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;data[i]=seed/1073741823.5-1;}
  this.timer=setInterval(()=>this.schedule(),25);
 }
 setEnabled(on){this.enabled=on;this.volume();}
 setActive(on){if(this.active===on)return;this.active=on;if(on)this.origin=this.ctx.currentTime+.12-this.next;this.volume();}
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
  const pitch=440*2**((e.note-69)/12);let source,end=t+e.duration+.08,peak=.12*e.level;
  if(e.kind==='hat'||e.kind==='snare'){
   source=ctx.createBufferSource();source.buffer=this.noise;filter.type='highpass';filter.frequency.value=e.kind==='hat'?7000:1400;peak=(e.kind==='hat'?.09:.18)*e.level;
  }else{
   source=ctx.createOscillator();source.frequency.setValueAtTime(pitch,t);filter.type='lowpass';
   if(e.kind==='kick'){source.type='sine';source.frequency.setValueAtTime(125,t);source.frequency.exponentialRampToValueAtTime(43,t+.13);filter.frequency.value=500;peak=.48*e.level;}
   else if(e.kind==='bass'){source.type='triangle';filter.frequency.setValueAtTime(1100,t);filter.frequency.exponentialRampToValueAtTime(180,t+.18);peak=.34*e.level;}
   else if(e.kind==='guitar'){source.type='sawtooth';filter.type='bandpass';filter.frequency.value=1500;filter.Q.value=.8;peak=.06*e.level;}
   else if(e.kind==='piano'){source.type='triangle';filter.frequency.value=2300;peak=.12*e.level;}
   else{source.type='sawtooth';filter.frequency.setValueAtTime(700,t);filter.frequency.linearRampToValueAtTime(2100,t+.12);filter.frequency.exponentialRampToValueAtTime(900,end);peak=.13*e.level;}
  }
  const attack=e.kind==='theme'?.055:.006;
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(peak,t+attack);g.gain.exponentialRampToValueAtTime(.0001,end);
  source.connect(g);source.start(t);source.stop(end+.02);source.onended=()=>{source.disconnect();g.disconnect();filter.disconnect();};
 }
 close(){clearInterval(this.timer);this.bus.disconnect();}
}

