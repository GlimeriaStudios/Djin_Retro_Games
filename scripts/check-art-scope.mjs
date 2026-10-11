// Acceptance check: the art-only branch must retain every baseline game module.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const baseline='dc56f6952816a6baf096cd4d3cbd4156c4c7cbe5';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).replaceAll('\r\n','\n');
const files=git('ls-tree','-r','--name-only',baseline,'public/game').trim().split('\n');
// Explicit later request: charge a drift reserve and activate it with E/LB/touch.
// Undo only its reviewed hooks before checking the original gameplay baseline.
const boostHooks=JSON.parse(readFileSync('scripts/boost-scope.json','utf8'));
const unboost=(file,text)=>boostHooks.filter(h=>h.file===file).reverse().reduce((s,h)=>{
 assert.ok(s.includes(h.after),'Missing authorized boost hook: '+file);
 return s.replace(h.after,h.before);
},text);
for(const file of files){
 if(file==='public/game/render.js'||file==='public/game/app.js')continue;
 const old=execFileSync('git',['show',`${baseline}:${file}`],{maxBuffer:16*1024*1024});
 const current=readFileSync(file);
 // Git may normalize working-tree text endings on Windows; binary bytes stay exact.
 if(/\.(js|html|css|json|svg)$/.test(file))assert.equal(unboost(file,current.toString().replaceAll('\r\n','\n')),old.toString().replaceAll('\r\n','\n'),`${file} changed`);
 else assert.ok(current.equals(old),`${file} changed`);
}
const original=git('show',`${baseline}:public/game/render.js`);
let render=readFileSync('public/game/render.js','utf8').replaceAll('\r\n','\n');
for(const [added,old]of[
 ["import {detailVehicle} from './vehicle-detail.js';\n",''],
 ['detailVehicle(g,id,color);',''],
 ["import {ArtStyle} from './art-style.js';\n",''],
 ['this.artStyle=new ArtStyle(this);',''],
 ["ground.userData.artRole='water';",''],
 ["road.userData.artRole='road';",''],
 ['this.artStyle.rebuild(track);',''],
 ['this.artStyle.render(this.scene,this.camera,g.cars[local],dt,mode);','this.renderer.render(this.scene,this.camera);'],
])render=render.replace(added,old);
assert.equal(render,original,'A change outside the permitted appearance hooks was introduced');

// User-authorized audio hooks; every other application/control statement stays exact.
let app=unboost('public/game/app.js',readFileSync('public/game/app.js','utf8').replaceAll('\r\n','\n'));
app=app.replace("import {DrivingAudio} from './driving-audio.js';\n",'').replace("function initAudio(){if(audio)return;const ctx=new AudioContext();audio={ctx,drive:new DrivingAudio(ctx)};music=new RaceMusic(ctx);music.setEnabled(musicEnabled);music.setActive(mode==='race');}","function initAudio(){if(audio)return;const ctx=new AudioContext(),gain=ctx.createGain(),osc=ctx.createOscillator(),filter=ctx.createBiquadFilter();osc.type='sawtooth';filter.type='lowpass';filter.frequency.value=250;gain.gain.value=0;osc.connect(filter).connect(gain).connect(ctx.destination);osc.start();audio={ctx,gain,osc};music=new RaceMusic(ctx);music.setEnabled(musicEnabled);music.setActive(mode==='race');}").replace("if(audio)audio.drive.update(game.cars[slot],latestInput,!muted&&mode==='race'&&!paused&&!document.hidden,dt);","if(audio){const c=game.cars[slot],speed=Math.hypot(c.vx||0,c.vz||0);audio.gain.gain.setTargetAtTime(!muted&&mode==='race'&&c.alive?.014:0,audio.ctx.currentTime,.1);audio.osc.frequency.setTargetAtTime(38+speed*3.5,audio.ctx.currentTime,.1);}");
assert.equal(app,git('show',baseline+':public/game/app.js'),'Application changed outside audio hooks');
console.log('PASS: baseline preserved outside eight appearance hooks, audio hooks and the explicit drift-boost request. Camera, handling, collision, race rules and existing weapons unchanged.');

