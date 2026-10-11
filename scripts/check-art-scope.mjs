// Acceptance check: the art-only branch must retain every baseline game module.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const baseline='dc56f6952816a6baf096cd4d3cbd4156c4c7cbe5';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).replaceAll('\r\n','\n');
const files=git('ls-tree','-r','--name-only',baseline,'public/game').trim().split('\n');
for(const file of files){
 if(file==='public/game/render.js')continue;
 const old=execFileSync('git',['show',`${baseline}:${file}`],{maxBuffer:16*1024*1024});
 const current=readFileSync(file);
 // Git may normalize working-tree text endings on Windows; binary bytes stay exact.
 if(/\.(js|html|css|json|svg)$/.test(file))assert.equal(current.toString().replaceAll('\r\n','\n'),old.toString().replaceAll('\r\n','\n'),`${file} changed`);
 else assert.ok(current.equals(old),`${file} changed`);
}
const original=git('show',`${baseline}:public/game/render.js`);
let render=readFileSync('public/game/render.js','utf8').replaceAll('\r\n','\n');
for(const [added,old]of[
 ["import {ArtStyle} from './art-style.js';\n",''],
 ['this.artStyle=new ArtStyle(this);',''],
 ["ground.userData.artRole='water';",''],
 ["road.userData.artRole='road';",''],
 ['this.artStyle.rebuild(track);',''],
 ['this.artStyle.render(this.scene,this.camera);','this.renderer.render(this.scene,this.camera);'],
])render=render.replace(added,old);
assert.equal(render,original,'A change outside the permitted appearance hooks was introduced');
console.log(`PASS: ${files.length-1} original game files unchanged; render.js differs only by six appearance hooks. Camera, physics, rules, input, models and FX timing preserved.`);
