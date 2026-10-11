import test from 'node:test';
import assert from 'node:assert/strict';
import {BOOST,updateBoost} from '../public/game/boost.js';
import {makeGame,startRound,drive,snapshot,applySnapshot} from '../public/game/sim.js';
import {replayPending} from '../public/game/prediction.js';
const car=()=>({alive:true,boost:0,boostCharge:0,oil:0,drifting:true,vx:20,vz:0,slip:5});
test('only real powered drift charges reserve; no boost feedback loop',()=>{
 for(const [patch,input]of [[{drifting:false},{throttle:1,drift:true}],[{vx:0},{throttle:1}],[{oil:1},{throttle:1}],[{boost:1},{throttle:1}],[{slip:0},{throttle:1}],[{alive:false},{throttle:1}],[{},{throttle:0}]]){
  const c=Object.assign(car(),patch);updateBoost(c,input,1);assert.equal(c.boostCharge,0);
 }
 const c=car();for(let i=0;i<361;i++)updateBoost(c,{throttle:1},1/60);assert.equal(c.boostCharge,1);
 updateBoost(c,{throttle:1,boost:true},1/60);assert.equal(c.boostCharge,0);assert.equal(c.boost,BOOST.duration);
 updateBoost(c,{throttle:1,boost:true},1/60);assert.equal(c.boostCharge,0);
});
test('reserve persists across corners and requires a fresh full-meter press',()=>{
 const c=car();updateBoost(c,{throttle:1},3);assert.equal(c.boostCharge,.5);
 c.drifting=false;updateBoost(c,{throttle:1,boost:true},2);assert.equal(c.boostCharge,.5);assert.equal(c.boost,0);
 c.boostCharge=1;updateBoost(c,{boost:true},.1);assert.equal(c.boost,0);
 updateBoost(c,{boost:false},.1);updateBoost(c,{boost:true},.1);assert.equal(c.boost,BOOST.duration);
});
test('boost activation survives authoritative snapshots/replay and resets between rounds',()=>{
 const g=makeGame();startRound(g,true);const c=g.cars[0];c.boostCharge=1;
 const saved=snapshot(g),client=makeGame();applySnapshot(client,saved);const predicted={...client.cars[0]};
 const history=[{input:{seq:1,throttle:1,boost:true},dt:1/60},{input:{seq:2,throttle:1,boost:false},dt:1/60}];
 for(const h of history)drive(c,h.input,h.dt,g.track);replayPending(predicted,history,g.track);
 assert.equal(c.boostCharge,0);assert.equal(predicted.boost,c.boost);assert.equal(predicted.boostHeld,c.boostHeld);
 assert.ok(Math.hypot(c.x-predicted.x,c.z-predicted.z)<1e-8);
 startRound(g);assert.equal(c.boostCharge,0);assert.equal(c.boost,0);assert.equal(c.boostHeld,false);
});
