import test from 'node:test';import assert from 'node:assert/strict';
import {aerialCamera} from '../public/game/aerial-camera.js';
const car={vx:0,vz:35,lateralAccel:15,alive:true};
const run=(c,h=1/60)=>{let s;for(let i=0;i<600*h*60;i++)s=aerialCamera(s,c,h);return s;};
test('motion builds with driving and stays bounded through long hard cornering',()=>{
 let s;for(let i=0;i<36000;i++){s=aerialCamera(s,car,1/60);assert.ok(Math.abs(s.side)<=1.02);assert.ok(Math.abs(s.lift)<1);assert.ok(Math.abs(s.roll)<=.035);}
 assert.ok(s.energy>.5);const still=run({vx:0,vz:0});assert.equal(still.energy,0);assert.equal(still.roll,0);
});
test('reduced motion disables every added camera offset immediately',()=>{
 const s=aerialCamera(run(car),car,.016,false,true);for(const k of ['side','lift','aim','roll','bank','bankV','energy'])assert.equal(s[k],0);
});
test('reset clears bank momentum and stalled frames remain finite',()=>{
 const s=aerialCamera(run(car),car,0,true);assert.equal(s.time,0);assert.equal(s.bankV,0);
 for(const v of Object.values(aerialCamera(s,car,30)))assert.ok(Number.isFinite(v));
});
test('30 and 60 Hz follow the same airborne spring path',()=>{
 let a,b;for(let i=0;i<120;i++)a=aerialCamera(a,car,1/30);for(let i=0;i<240;i++)b=aerialCamera(b,car,1/60);
 for(const k of Object.keys(a))assert.ok(Math.abs(a[k]-b[k])<1e-9,k);
});
