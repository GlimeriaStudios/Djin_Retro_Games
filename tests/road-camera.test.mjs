import test from 'node:test';import assert from 'node:assert/strict';
import {roadCamera} from '../public/game/road-camera.js';
const car={x:0,z:0,a:0,vx:0,vz:25};
const track=(slope=0,heading=0)=>({nearest:()=>({s:0,tx:0,tz:1,slope}),at:()=>({slope,angle:heading})});
const pose=(slope,zoom=0)=>roadCamera(null,track(slope),car,0,zoom,1);
test('downhill is more horizontal, uphill steeper, and zoom lowers every grade',()=>{
 assert.ok(pose(-.3).pitch<pose(0).pitch);assert.ok(pose(.3).pitch>pose(0).pitch);
 for(const slope of [-.3,0,.3])assert.ok(pose(slope,14).pitch<pose(slope).pitch);
});
test('turn anticipation is smooth and bounded, with angle wrapping',()=>{
 const s=roadCamera(null,track(0,1.2),car,0,0,.016);assert.ok(s.turn>0&&s.turn<.02);
 const settled=roadCamera(s,track(0,3),car,0,0,30);assert.ok(settled.turn<=.26);
 const wrap=roadCamera(null,track(0,-Math.PI+.1),car,Math.PI-.1,0,1);assert.ok(wrap.turn>0&&wrap.turn<.1);
});
test('reverse road direction reverses slope and steep terrain remains bounded',()=>{
 const s=roadCamera(null,track(.3),{...car,a:Math.PI},Math.PI,0,1);assert.ok(s.pitch<pose(0).pitch);
 assert.ok(pose(-10,14).pitch>=.39);assert.ok(pose(10).pitch<=.96);
});
