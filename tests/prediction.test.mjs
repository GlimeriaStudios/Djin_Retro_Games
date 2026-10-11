import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGame,startRound,drive} from '../public/game/sim.js';
import {replayPending} from '../public/game/prediction.js';
test('delayed authoritative state replays only unacknowledged controls',()=>{
 const g=makeGame();startRound(g,true);const car={...g.cars[0]},history=[];let acknowledged;
 for(let i=1;i<=30;i++){const input={seq:i,throttle:1,steer:.15};history.push({input,dt:1/60});drive(car,input,1/60,g.track);if(i===18)acknowledged={...car};}
 const oldDistance=Math.hypot(car.x-acknowledged.x,car.z-acknowledged.z);assert.ok(oldDistance>.5);
 const pending=replayPending(acknowledged,history,g.track);assert.equal(pending.length,12);assert.ok(Math.hypot(car.x-acknowledged.x,car.z-acknowledged.z)<1e-7);assert.equal(acknowledged.inputSeq,30);
 assert.equal(replayPending(acknowledged,history,g.track).length,0);
});
test('cornering force saturates and lateral load stays finite',()=>{
 const g=makeGame();startRound(g,true);const c={...g.cars[0],vx:25,vz:0,a:0};drive(c,{},1/60,g.track);
 assert.ok(Math.abs(c.lateralAccel)<=28.00001);assert.ok(c.slip>20);assert.ok(c.vx>24,'tires must not instantly erase lateral momentum');
});

