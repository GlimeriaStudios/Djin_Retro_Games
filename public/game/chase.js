// Personal chase adapted from the reference's independently sprung focus and heading.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
// Lens-only adjustment: never changes the personal follow target or spring.
export function raceZoom(state,cars,local,dt,reset=false){
 if(!state||reset)state={amount:0,separated:false};
 const c=cars[local],alive=cars.filter(c=>c.alive);
 const rivals=alive.filter(other=>other!==c);
 const nearest=c?.alive&&rivals.length?Math.min(...rivals.map(other=>Math.hypot(other.x-c.x,other.z-c.z))):0;
 // Hysteresis prevents network jitter around 50 m from pumping the lens.
 state.separated=state.separated?nearest>45:nearest>=50;
 const drops=clamp(cars.length-alive.length,0,2);
 const target=clamp(drops*4+(state.separated?6:0),0,14);
 state.amount+=(target-state.amount)*(1-Math.exp(-Math.max(0,dt)*1.5));
 return state;
}
export function chaseCamera(state,car,dt,reset=false){
 if(!state||reset)state={x:car.x,z:car.z,vx:0,vz:0,yaw:car.a,yawV:0,speed:0,drift:0};
 const n=Math.max(1,Math.ceil(dt*120)),h=dt/n;
 for(let i=0;i<n;i++){
  state.vx+=((car.x+car.vx*.36-state.x)*12-state.vx*(1.5*Math.sqrt(12)))*h;
  state.vz+=((car.z+car.vz*.36-state.z)*12-state.vz*(1.5*Math.sqrt(12)))*h;
  state.x+=state.vx*h;state.z+=state.vz*h;
  state.yawV+=(angle(car.a+(car.omega||0)*.2-state.yaw)*6-state.yawV*(1.6*Math.sqrt(6)))*h;state.yaw+=state.yawV*h;
  const speed=clamp(Math.hypot(car.vx,car.vz)/42,0,1);
  state.speed+=(speed-state.speed)*Math.min(1,h*(speed>state.speed?1.2:.6));
  const forward=car.vx*Math.sin(car.a)+car.vz*Math.cos(car.a);
  state.drift+=(clamp(-forward*(car.omega||0)*.25,-7,7)-state.drift)*Math.min(1,h*2.2);
 }
 return state;
}
