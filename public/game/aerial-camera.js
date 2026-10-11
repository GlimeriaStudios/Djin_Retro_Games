// A camera operator riding an imperfect airborne platform, not a second vehicle.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function aerialCamera(state,car,dt,reset=false,reduced=false){
 if(!state||reset)state={time:0,energy:0,bank:0,bankV:0,side:0,lift:0,aim:0,roll:0,roughness:0,shakeX:0,shakeY:0,shakeRoll:0};
 if(reduced){state.roughness=state.shakeX=state.shakeY=state.shakeRoll=state.energy=state.bank=state.bankV=state.side=state.lift=state.aim=state.roll=0;return state;}
 // Substeps bound the spring even after a stalled frame or tab switch.
 const elapsed=clamp(dt,0,.1),n=Math.max(1,Math.ceil(elapsed*120)),h=elapsed/n;
 for(let i=0;i<n;i++){
  state.time+=h;const t=state.time;
  const speed=clamp(Math.hypot(car.vx,car.vz)/42,0,1);
  const load=clamp((car.lateralAccel||0)/20,-1,1);
  const active=car.alive===false?0:1;
  const energy=active*clamp(speed*.65+Math.abs(load)*.25+(car.impactTime>0?.45:0),0,1);
  state.energy+=(energy-state.energy)*(1-Math.exp(-h*2));
  state.bankV+=(-load*active*.022-state.bank)*9*h-state.bankV*4*h;
  state.bank+=state.bankV*h;
  // Incommensurate slow waves avoid a regular, metronomic bob.
  const wander=Math.sin(t*.71)*.62+Math.sin(t*1.13+.8)*.25+Math.sin(t*.29)*.13;
  // Brief gusts separated by calm intervals, not constant high-frequency shake.
  const gust=Math.pow(Math.max(0,Math.sin(t*1.37)*Math.sin(t*.53+.6)),6);
  const bump=gust*Math.sin(t*10.7)*state.energy;
  state.side=wander*(.22+state.energy*.8);
  state.lift=(Math.sin(t*.83)*.23+Math.sin(t*1.61)*.09)*(.3+state.energy)+bump*.48;
  state.aim=(Math.sin(t*.59+.3)*.26+Math.sin(t*1.03)*.09)*state.energy;
  // Blend surface boundaries over ~0.12 s. Cornering adds at most 2.5 cm;
  // gravel adds 15 cm. Mixed frequencies (radians/s) avoid a regular bob.
  const rough=active*speed*(car.surface==='gravel'?1:0);
  state.roughness+=(rough-state.roughness)*(1-Math.exp(-h*8));
  const amplitude=state.roughness*.15+active*speed*Math.abs(load)*.025;
  // A maximum impact contributes 24 cm sideways, 30 cm vertical, 0.008 rad roll.
  const impact=active*clamp(car.cameraKick||0,0,1);
  state.shakeX=amplitude*(Math.sin(t*43)*.6+Math.sin(t*71)*.4)+impact*Math.sin(t*55)*.24;
  state.shakeY=amplitude*(Math.sin(t*57)*.7+Math.sin(t*37)*.3)+impact*Math.cos(t*49)*.3;
  state.shakeRoll=amplitude*Math.sin(t*41)*.025+impact*Math.sin(t*47)*.008;
  state.roll=clamp(state.bank+wander*.007*state.energy+bump*.009,-.035,.035);
 }
 return state;
}
