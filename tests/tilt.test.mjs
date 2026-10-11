import test from 'node:test';import assert from 'node:assert/strict';
import {screenRoll,tiltInput,TiltSteering} from '../public/game/tilt.js';
function setup(permission='granted'){
 let time=0;const events=new Map(),timeouts=new Map(),statuses=[];let id=0;
 const win={isSecureContext:true,DeviceOrientationEvent:{requestPermission:async()=>permission},document:{hidden:false},performance:{now:()=>time},screen:{orientation:{angle:0,addEventListener:(n,f)=>events.set('screen:'+n,f),removeEventListener:n=>events.delete('screen:'+n)}},addEventListener:(n,f)=>events.set(n,f),removeEventListener:n=>events.delete(n),setTimeout:f=>{timeouts.set(++id,f);return id;},clearTimeout:id=>timeouts.delete(id)};
 const tilt=new TiltSteering(win,s=>statuses.push(s));return{tilt,win,events,timeouts,statuses,setTime:v=>time=v,send(beta,gamma){events.get('deviceorientation')?.({beta,gamma});}};
}
function center(s){for(const t of [0,200,400]){s.setTime(t);s.send(35,0);}}
test('screen-relative tilt keeps left/right consistent in portrait and both landscape directions',()=>{
 for(const [b,g,angle,expected]of [[0,20,0,20],[20,0,90,20],[-20,0,270,20],[0,-20,180,20]])assert.ok(Math.abs(screenRoll(b,g,angle)-expected)<1e-10);
 assert.equal(screenRoll(null,0),null);assert.equal(screenRoll(0,NaN),null);assert.equal(tiltInput(2,0),0);assert.equal(tiltInput(28,0),-1);assert.equal(tiltInput(-28,0),1);assert.ok(Math.abs(tiltInput(-179,179))<.001);
});
test('permission is opt-in, calibration centers the phone, smoothing and stale-signal cutoff work',async()=>{
 const s=setup();assert.equal(s.events.size,0);await s.tilt.enable();assert.ok(s.tilt.enabled);center(s);assert.equal(s.tilt.sample(),0);
 for(let i=0;i<30;i++){s.setTime(420+i*20);s.send(35,28);s.tilt.sample();}assert.ok(s.tilt.value<-.99);
 s.setTime(1600);assert.equal(s.tilt.sample(),0);assert.ok(s.statuses.at(-1).text.includes('paused'));
 s.send(35,15);assert.equal(s.tilt.center,null);assert.equal(s.tilt.sample(),0);
 s.tilt.disable();assert.equal(s.events.size,0);assert.equal(s.tilt.sample(),0);
});
test('screen rotation and backgrounding clear steering and require fresh centering',async()=>{
 const s=setup();await s.tilt.enable();center(s);s.win.screen.orientation.angle=90;s.events.get('screen:change')();assert.equal(s.tilt.center,null);assert.equal(s.tilt.sample(),0);
 center(s);s.win.document.hidden=true;assert.equal(s.tilt.sample(),0);
});
test('denied, unavailable and absent sensors leave button steering available',async()=>{
 const denied=setup('denied');await denied.tilt.enable();assert.equal(denied.tilt.enabled,false);assert.equal(denied.events.size,0);
 const missing=setup();delete missing.win.DeviceOrientationEvent;await missing.tilt.enable();assert.match(missing.statuses.at(-1).text,/unavailable/);
 const silent=setup();await silent.tilt.enable();[...silent.timeouts.values()][0]();assert.equal(silent.tilt.enabled,false);assert.match(silent.statuses.at(-1).text,/No motion signal/);
});
test('leaving the race while permission is pending cannot enable a stale sensor listener',async()=>{
 const s=setup();let finish;s.win.DeviceOrientationEvent.requestPermission=()=>new Promise(resolve=>finish=resolve);const p=s.tilt.enable();s.tilt.disable();finish('granted');await p;assert.equal(s.tilt.enabled,false);assert.equal(s.events.size,0);
});
