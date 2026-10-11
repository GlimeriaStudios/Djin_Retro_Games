// Procedural exhaust, intake, tyre and road layers. No downloaded sound assets.
// These values describe audio only: virtual gears never alter vehicle physics.
export const DRIVE_SOUND={idleRpm:850,redlineRpm:6100,gearMetresPerSecond:10,
 master:.32,exhaust:.24,intake:.10,rumble:.12,tyres:.11,gravel:.13,wind:.055,
 attack:.045,release:.12}; // Gains are linear; envelope constants are seconds.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));

export function drivingSoundState(car,input={},active=true){
 const speed=Math.hypot(car?.vx||0,car?.vz||0),load=clamp(Math.abs(input.throttle||0));
 const gear=Math.min(3,Math.floor(speed/DRIVE_SOUND.gearMetresPerSecond));
 const revs=clamp((speed-gear*DRIVE_SOUND.gearMetresPerSecond*.72)/14);
 const rpm=DRIVE_SOUND.idleRpm+(DRIVE_SOUND.redlineRpm-DRIVE_SOUND.idleRpm)*revs+load*500;
 // Real lateral slip, rather than a pressed drift key, drives tyre scrub.
 const slip=Math.max(clamp(((car?.slip||0)-1.8)/7),car?.drifting ? .65 : 0,clamp(((car?.tireUsage||0)-.85)/.4)*.4);
 const moving=clamp((speed-2)/9),gravel=car?.surface==='gravel';
 return {active:!!(active&&car?.alive),speed,load,gear,rpm,
  squeal:gravel?0:slip*moving,gravel:gravel?clamp(speed/22):0,wind:clamp((speed-12)/24)};
}

export class DrivingAudio{
 constructor(ctx){
  this.ctx=ctx;this.rpm=DRIVE_SOUND.idleRpm;
  this.master=ctx.createGain();this.master.gain.value=0;
  const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-14;limiter.knee.value=12;limiter.ratio.value=4;
  this.master.connect(limiter).connect(ctx.destination);
  const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=buffer.getChannelData(0);
  let seed=1871;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/2147483648-1;}
  // An uneven four-pulse exhaust cycle evokes a cross-plane V8's paired-bank
  // burble. The oscillator repeats once per crank revolution, in Hz = RPM / 60.
  const real=new Float32Array(33),imag=new Float32Array(33);
  for(let n=1;n<33;n++)for(const [phase,weight]of[[0,1],[.22,.75],[.5,.95],[.72,.7]]){
   const decay=weight/Math.pow(n,.72);
   real[n]+=Math.cos(2*Math.PI*n*phase)*decay;imag[n]+=Math.sin(2*Math.PI*n*phase)*decay;
  }
  this.exhaust=this.tone('custom',95,'lowpass',650,DRIVE_SOUND.exhaust,ctx.createPeriodicWave(real,imag));
  this.rumble=this.tone('sine',32,'lowpass',160,DRIVE_SOUND.rumble);
  this.intake=this.noise(buffer,'bandpass',380,.7);
  this.scrub=this.noise(buffer,'bandpass',1700,1.3);
  this.gravel=this.noise(buffer,'lowpass',1900,.5);
  this.wind=this.noise(buffer,'highpass',750,.5);
  this.tyreA=this.tone('sine',740,'bandpass',1100,0);
  this.tyreB=this.tone('sine',1090,'bandpass',1300,0);
  if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(document.hidden)this.silence();});
 }
 silence(){this.master.gain.setTargetAtTime(0,this.ctx.currentTime,DRIVE_SOUND.release);}
 tone(type,hz,filterType,cutoff,level,wave){
  const source=this.ctx.createOscillator(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain();
  if(wave)source.setPeriodicWave(wave);else source.type=type;
  source.frequency.value=hz;filter.type=filterType;filter.frequency.value=cutoff;filter.Q.value=.65;gain.gain.value=level;
  source.connect(filter).connect(gain).connect(this.master);source.start();return{source,filter,gain};
 }
 noise(buffer,type,hz,q){
  const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain();
  source.buffer=buffer;source.loop=true;filter.type=type;filter.frequency.value=hz;filter.Q.value=q;gain.gain.value=0;
  source.connect(filter).connect(gain).connect(this.master);source.start();return{source,filter,gain};
 }
 update(car,input,active,dt){
  const s=drivingSoundState(car,input,active),t=this.ctx.currentTime,c=DRIVE_SOUND;
  this.rpm+=(s.rpm-this.rpm)*(1-Math.exp(-Math.min(dt,.1)*12));
  const set=(param,value,seconds=c.attack)=>param.setTargetAtTime(value,t,seconds);
  set(this.master.gain,s.active?c.master:0,c.release);
  // Eight-cylinder, four-stroke engine: four pulses per crank revolution.
  set(this.exhaust.source.frequency,this.rpm/60);
  set(this.exhaust.filter.frequency,300+this.rpm*.13+s.load*650);
  set(this.exhaust.gain.gain,c.exhaust*(.5+s.load*.5)*(1+Math.sin(t*12)*.035));
  set(this.rumble.source.frequency,this.rpm/120);
  set(this.intake.filter.frequency,260+this.rpm*.13);
  set(this.intake.gain.gain,c.intake*(.15+s.load*.85));
  const flutter=1+Math.sin(t*31)*.018+Math.sin(t*47)*.009;
  set(this.tyreA.source.frequency,(690+s.speed*8)*flutter);
  set(this.tyreB.source.frequency,(1040+s.speed*11)/flutter);
  set(this.tyreA.gain.gain,s.squeal*c.tyres);set(this.tyreB.gain.gain,s.squeal*c.tyres*.45);
  set(this.scrub.gain.gain,s.squeal*.085);set(this.gravel.gain.gain,s.gravel*c.gravel);
  set(this.wind.gain.gain,s.wind*c.wind);
 }
}
