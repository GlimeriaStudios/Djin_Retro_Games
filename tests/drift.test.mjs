import test from 'node:test';
import assert from 'node:assert/strict';
import {integrateVehicle} from '../public/game/vehicle.js';
import {DEFAULT_TRACK,makeGame,startRound,drive} from '../public/game/sim.js';
import {replayPending} from '../public/game/prediction.js';
const car=(speed=0)=>({x:0,z:0,a:0,vx:0,vz:speed,omega:0});
const run=(c,input,seconds,dt=1/60)=>{for(let i=0;i<Math.round(seconds/dt);i++)integrateVehicle(c,input,dt,DEFAULT_TRACK);return c;};

test('powered drift maintains a sideways arc instead of stopping the car',()=>{
 const c=run(car(24),{throttle:1,steer:.7,drift:true},2);
 const forward=c.vx*Math.sin(c.a)+c.vz*Math.cos(c.a);
 const lateral=c.vx*Math.cos(c.a)-c.vz*Math.sin(c.a);
 assert.equal(c.drifting,true);assert.ok(forward>15);
 assert.ok(Math.abs(lateral)>4,'drift must change actual velocity relative to the chassis');
 assert.ok(Math.abs(Math.atan2(lateral,forward))<.7,'drift must remain controllable');
});
test('countersteer opens an established drift; release catches the tires',()=>{
 const entry=run(car(24),{throttle:1,steer:.7,drift:true},1);
 const tight=run({...entry},{throttle:1,steer:1,drift:true},1);
 const wide=run({...entry},{throttle:1,steer:-1,drift:true},1);
 assert.ok(tight.a-entry.a>wide.a-entry.a);
 run(wide,{throttle:1},1);assert.equal(wide.drifting,false);
 assert.equal(wide.driftBlend,0);assert.ok(wide.slip<1);
});
test('drift requires forward speed and steering, and does not defeat oil or braking',()=>{
 for(const c of [car(),car(-20),{...car(24),oil:1}]){
  run(c,{throttle:0,steer:1,drift:true},.2);assert.equal(c.drifting,false);
 }
 const straight=run(car(24),{throttle:1,drift:true},.5);assert.equal(straight.drifting,false);assert.equal(straight.a,0);
 const c=run(car(24),{throttle:1,steer:.7,drift:true},.5);
 run(c,{throttle:-1,drift:true},.2);assert.equal(c.drifting,false);
});
test('drift and grip recovery are deterministic at 30 and 60 Hz',()=>{
 const simulate=dt=>{const c=run(car(24),{throttle:1,steer:.65,drift:true},2,dt);return run(c,{throttle:1,steer:-.2},1,dt);};
 const a=simulate(1/30),b=simulate(1/60);
 assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<1e-6);assert.ok(Math.abs(a.a-b.a)<1e-6);
});
test('authoritative replay preserves an active drift and new rounds clear it',()=>{
 const g=makeGame();startRound(g,true);const c=g.cars[0];
 c.vx=Math.sin(c.a)*20;c.vz=Math.cos(c.a)*20;
 const history=[];let acknowledged;
 for(let i=1;i<=20;i++){const input={seq:i,throttle:1,steer:.5,drift:true};history.push({input,dt:1/60});drive(c,input,1/60,g.track);if(i===10)acknowledged={...c};}
 replayPending(acknowledged,history,g.track);
 assert.ok(Math.hypot(c.x-acknowledged.x,c.z-acknowledged.z)<1e-7);
 assert.equal(c.driftDirection,acknowledged.driftDirection);assert.equal(c.driftBlend,acknowledged.driftBlend);
 startRound(g,true);assert.equal(c.drifting,false);assert.equal(c.driftBlend,0);
});
