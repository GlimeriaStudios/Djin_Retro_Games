// A camera operator riding an imperfect airborne platform, not a second vehicle.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function aerialCamera(state,car,dt,reset=false,reduced=false){
 if(!state||reset)state={time:0,energy:0,bank:0,bankV:0,side:0,lift:0,aim:0,roll:0};
 if(reduced){state.energy=state.bank=state.bankV=state.side=state.lift=state.aim=state.roll=0;return state;}
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
  state.roll=clamp(state.bank+wander*.007*state.energy+bump*.009,-.035,.035);
 }
 return state;
}
