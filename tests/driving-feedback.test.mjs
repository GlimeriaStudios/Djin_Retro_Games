import test from 'node:test';import assert from 'node:assert/strict';
import {drivingSoundState} from '../public/game/driving-audio.js';
import {speedVfxTarget} from '../public/game/speed-vfx.js';
import {ART} from '../public/game/art-config.js';
const car={alive:true,vx:24,vz:0,slip:0,tireUsage:.4,surface:'asphalt'};
test('tyre sound follows actual sliding, not the drift button alone',()=>{
 assert.equal(drivingSoundState(car,{drift:true}).squeal,0);
 assert.ok(drivingSoundState({...car,drifting:true},{}).squeal>.5);
 assert.equal(drivingSoundState({...car,vx:0,drifting:true},{}).squeal,0);
 assert.equal(drivingSoundState({...car,slip:8,surface:'gravel'},{}).squeal,0);
 assert.ok(drivingSoundState({...car,surface:'gravel'},{}).gravel>0);
});
test('audio and speed presentation are bounded, inactive when out, and do not mutate physics',()=>{
 const frozen=Object.freeze({...car,boost:2,drifting:true});
 for(let speed=0;speed<100;speed++){
  const s=drivingSoundState({...frozen,vx:speed},{throttle:1});
  assert.ok(Number.isFinite(s.rpm)&&s.rpm>=1100&&s.rpm<=7400);
  for(const k of ['squeal','wind','gravel'])assert.ok(s[k]>=0&&s[k]<=1);
 }
 assert.equal(drivingSoundState({...frozen,alive:false}).active,false);
 assert.equal(drivingSoundState(frozen,{},false).active,false);
 assert.equal(speedVfxTarget(frozen,'race',true,ART.speedVfx),0);
 assert.equal(speedVfxTarget(frozen,'garage',false,ART.speedVfx),0);
 assert.equal(speedVfxTarget({...frozen,alive:false},'race',false,ART.speedVfx),0);
 assert.ok(speedVfxTarget(frozen,'race',false,ART.speedVfx)>0);
 assert.equal(frozen.vx,24);
});
