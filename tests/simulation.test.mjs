import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGame,startRound,step,drive,buildTrack,DEFAULT_TRACK,fireWeapon,snapshot,applySnapshot,validateTrack,carContact,resolveCarCollision,constrainBarrier} from '../public/game/sim.js';
const setup=()=>{const g=makeGame();startRound(g,true);g.phase='race';g.cars.forEach(c=>{c.bot=false;c.shield=0;});return g;};
test('road curve is closed and nearest-point lookup preserves distance',()=>{const t=buildTrack();assert.ok(t.length>400);const p=t.at(35,3),n=t.nearest(p.x,p.z);assert.ok(Math.abs(n.d-3)<.1);assert.ok(Math.hypot(t.at(0).x-t.at(t.length).x,t.at(0).z-t.at(t.length).z)<.001);});
test('acceleration, coasting and reverse are finite and bounded',()=>{const g=setup(),c=g.cars[0];for(let i=0;i<90;i++)drive(c,{throttle:1},1/60,g.track);let speed=Math.hypot(c.vx,c.vz);assert.ok(speed>18&&speed<21);for(let i=0;i<45;i++)drive(c,{},1/60,g.track);assert.ok(Math.hypot(c.vx,c.vz)<speed);for(let i=0;i<180;i++)drive(c,{throttle:-1},1/60,g.track);assert.ok(c.vx*Math.sin(c.a)+c.vz*Math.cos(c.a)<0);});
test('chassis turning preserves lateral momentum',()=>{const t=buildTrack(),p=t.at(30),base={...setup().cars[0],x:p.x,z:p.z,a:p.angle,vx:Math.sin(p.angle)*20,vz:Math.cos(p.angle)*20},a={...base},b={...base};for(let i=0;i<20;i++){drive(a,{steer:.7,throttle:1},1/60,t);drive(b,{steer:.7,throttle:1,brake:true},1/60,t);}assert.ok(a.slip>.3);assert.ok(b.slip>.2);});
test('pickups arm weapon and respect respawn delay',()=>{const g=setup(),p=g.pickups[0],c=g.cars[0];c.x=p.x;c.z=p.z;step(g,{},1/60);assert.equal(c.weapon,'rocket');assert.equal(c.ammo,2);assert.ok(p.cooldown>6);});
test('rocket consumes ammo, damages opponent and imparts impulse',()=>{const g=setup(),a=g.cars[0],b=g.cars[1],p=g.track.at(20);Object.assign(a,{x:p.x,z:p.z,a:p.angle,weapon:'rocket',ammo:2});Object.assign(b,{x:p.x+Math.sin(p.angle)*9,z:p.z+Math.cos(p.angle)*9});assert.equal(fireWeapon(g,a),true);assert.equal(a.ammo,1);for(let i=0;i<15;i++)step(g,{},1/60);assert.equal(b.hp,52);assert.ok(Math.hypot(b.vx,b.vz)>1);assert.equal(g.shots.length,0);});
test('mine has arming delay then explodes once',()=>{const g=setup(),a=g.cars[0],b=g.cars[1];a.weapon='mine';a.ammo=2;fireWeapon(g,a);const h=g.hazards[0];Object.assign(b,{x:h.x,z:h.z});step(g,{},.1);assert.equal(b.hp,100);for(let i=0;i<60;i++)step(g,{},1/60);assert.equal(b.hp,45);assert.equal(g.hazards.length,0);});
test('oil reduces grip and boost expires',()=>{const g=setup(),c=g.cars[0];c.weapon='boost';c.ammo=1;fireWeapon(g,c);assert.equal(c.boost,2.4);assert.equal(c.weapon,null);g.hazards.push({type:'oil',x:c.x,z:c.z,owner:1,age:1,life:9});step(g,{},1/60);assert.ok(c.oil>1);for(let i=0;i<150;i++)step(g,{},1/60);assert.equal(c.boost,0);});
test('front bump stops chassis overlap and transfers momentum without artificial spin',()=>{
 const a={x:0,z:0,a:0,vx:0,vz:20,omega:0},b={x:0,z:4,a:0,vx:0,vz:0,omega:0};
 assert.ok(carContact(a,b));resolveCarCollision(a,b);assert.ok(b.z-a.z>=4.2999);assert.ok(b.vz>10);assert.equal(a.omega,0);assert.equal(b.omega,0);assert.ok(Math.abs(a.vz+b.vz-20)<1e-8);
});
test('side-by-side cars can run close without circular phantom bumps',()=>{const a={x:0,z:0,a:0},b={x:2.3,z:0,a:0};assert.equal(carContact(a,b),null);});
test('angled side impacts impart bounded spin and separate both chassis',()=>{
 const a={x:-2,z:1.1,a:Math.PI/2,vx:20,vz:0,omega:0},b={x:0,z:0,a:0,vx:0,vz:0,omega:0};
 resolveCarCollision(a,b);assert.ok(b.vx>0);assert.ok(Math.abs(b.omega)>.1&&Math.abs(b.omega)<=5);assert.ok(!carContact(a,b)||carContact(a,b).depth<1e-8);
});
test('wall clearance follows chassis orientation and leaves exposed edges open',()=>{
 const t=buildTrack(),s=25,p=t.at(s,8.8),c={x:p.x,z:p.z,a:p.angle+Math.PI/2,vx:0,vz:0};constrainBarrier(c,t);assert.ok(t.nearest(c.x,c.z).d<=t.config.width/2-2.15-.374);
 const edge=t.at(t.length*.4,12),d={...c,x:edge.x,z:edge.z};constrainBarrier(d,t);assert.equal(d.x,edge.x);assert.equal(d.z,edge.z);
});
test('rockets terminate at a concrete barrier',()=>{
 const g=setup(),c=g.cars[0],p=g.track.at(25);Object.assign(c,{x:p.x,z:p.z,a:p.angle+Math.PI/2,weapon:'rocket',ammo:2});fireWeapon(g,c);for(let i=0;i<12;i++)step(g,{},1/60);assert.equal(g.shots.length,0);assert.ok(g.events.some(e=>e.type==='blast'));
});
test('exposed edge eliminates, while recovery returns to road and costs HP',()=>{const g=setup(),c=g.cars[0],p=g.track.at(g.track.length*.4,15);Object.assign(c,{x:p.x,z:p.z,progress:g.track.length*.4,lastS:g.track.length*.4});for(let i=0;i<30;i++)step(g,{},1/60);assert.equal(c.alive,false);assert.equal(c.reason,'FELL OFF');const h=setup(),d=h.cars[0];step(h,{0:{reset:true}},1/60);assert.equal(d.hp,80);assert.ok(h.track.nearest(d.x,d.z).d<.1);step(h,{0:{reset:true}},1/60);assert.equal(d.hp,80);});
test('trailing grace eliminates and awards a round; 6 points ends match',()=>{const g=setup();g.raceTime=9;g.cars.forEach(c=>{c.progress=0;});g.cars[0].progress=90;g.cars[0].score=4;for(let i=0;i<190;i++)step(g,{},1/60);assert.equal(g.phase,'match');assert.equal(g.winner,0);assert.equal(g.cars[0].score,6);startRound(g,true);assert.equal(g.phase,'countdown');assert.ok(g.cars.every(c=>c.alive&&c.score===0));});
test('all-bot matches finish with finite simulation state',()=>{const g=makeGame();startRound(g,true);for(let i=0;i<60*400&&g.phase!=='match';i++)step(g);assert.equal(g.phase,'match');assert.ok(g.cars.some(c=>c.score>=6));assert.ok(g.cars.every(c=>[c.x,c.z,c.vx,c.vz,c.a,c.hp].every(Number.isFinite)));});
test('snapshots synchronize gameplay and leave authored track intact',()=>{const g=setup(),h=makeGame();for(let i=0;i<10;i++)step(g,{0:{throttle:1}});applySnapshot(h,JSON.parse(JSON.stringify(snapshot(g))));assert.equal(h.cars[0].x,g.cars[0].x);assert.equal(h.phase,g.phase);assert.deepEqual(h.track.config,DEFAULT_TRACK);});
test('designer import validates and preserves manual edits',()=>{const t=structuredClone(DEFAULT_TRACK);t.points[2]=[-49,-52];t.pickups.push({s:.2,lane:2,type:'oil'});assert.deepEqual(validateTrack(t).points[2],[-49,-52]);assert.throws(()=>validateTrack({...t,points:[[Infinity,0]]}));assert.throws(()=>validateTrack({...t,pickups:[{s:2,lane:0,type:'bad'}]}));});


