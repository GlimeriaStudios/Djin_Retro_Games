import test from 'node:test';
import assert from 'node:assert/strict';
import {aerialCamera} from '../public/game/aerial-camera.js';
import {buildTrack,DEFAULT_TRACK,validateTrack,makeGame,startRound,drive,constrainBarrier,resolveCarCollision} from '../public/game/sim.js';
import {alignSurface,constrainObstacles,impactCamera} from '../public/game/terrain.js';
const energy=car=>{let state,total=0;for(let i=0;i<240;i++){state=aerialCamera(state,car,1/60);total+=state.shakeX**2+state.shakeY**2;}return total;};
test('roughness follows speed and surface, cornering is subtle, stationary gravel is quiet',()=>{
 const base={vx:0,vz:30,alive:true};
 const straight=energy(base),corner=energy({...base,lateralAccel:15}),gravel=energy({...base,surface:'gravel'});
 assert.equal(straight,0);assert.ok(corner>0);assert.ok(gravel>corner*10);assert.equal(energy({...base,vz:0,surface:'gravel'}),0);
 let s;for(let i=0;i<120;i++)s=aerialCamera(s,{...base,surface:'gravel'},1/60);
 for(let i=0;i<120;i++)s=aerialCamera(s,base,1/60);assert.ok(s.roughness<1e-6);
 s=aerialCamera(s,{...base,surface:'gravel',cameraKick:1},.016,false,true);
 for(const k of ['roughness','shakeX','shakeY','shakeRoll'])assert.equal(s[k],0);
});
test('surface zones round trip, legacy asphalt persists, and car samples the same boundary as the mesh',()=>{
 const cfg=structuredClone(DEFAULT_TRACK),t=buildTrack(cfg),start=t.samples[24].s,end=t.samples[72].s;
 assert.equal(t.at(start-.01).surface,'asphalt');assert.equal(t.at(start+.01).surface,'gravel');assert.equal(t.at(end+.01).surface,'asphalt');
 const p=t.at(start+10),c={...p,a:p.angle};alignSurface(c,t);assert.equal(c.surface,'gravel');
 assert.deepEqual(validateTrack(JSON.parse(JSON.stringify(cfg))),cfg);
 delete cfg.terrain;assert.equal(buildTrack(cfg).at(start+10).surface,'asphalt');
 cfg.terrain=structuredClone(DEFAULT_TRACK.terrain);cfg.terrain[0].surface='unknown';assert.throws(()=>validateTrack(cfg));
});
test('real wall, car, and obstacle contacts produce bounded jolts; resting contact stays quiet',()=>{
 const t=buildTrack(),p=t.at(15,20),near=t.nearest(p.x,p.z),nx=(p.x-near.x)/near.d,nz=(p.z-near.z)/near.d;
 const c={...p,a:p.angle,vx:nx*12,vz:nz*12,omega:0};constrainBarrier(c,t);assert.ok(c.cameraKick>0&&c.cameraKick<=1);
 const a={x:0,z:0,a:0,vx:0,vz:10,omega:0},b={x:0,z:4,a:0,vx:0,vz:0,omega:0};resolveCarCollision(a,b);assert.ok(a.cameraKick>0&&b.cameraKick>0);
 const o=t.obstacles[0],q={x:o.x,z:o.z,a:o.a,vx:-Math.cos(o.a)*10,vz:Math.sin(o.a)*10,omega:0};constrainObstacles(q,t);assert.ok(q.cameraKick>0);
 const still={};impactCamera(still,.5);assert.equal(still.cameraKick,0);impactCamera(still,100);assert.equal(still.cameraKick,1);
});
test('collision envelope decays and resets between rounds',()=>{
 const g=makeGame();startRound(g,true);const c=g.cars[0];impactCamera(c,16);const before=energy({...c,cameraKick:1});assert.ok(before>0);
 for(let i=0;i<60;i++)drive(c,{},1/60,g.track);assert.ok(c.cameraKick<.001);impactCamera(c,16);startRound(g,true);assert.equal(c.cameraKick,0);
});
