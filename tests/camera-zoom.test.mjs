import test from 'node:test';
import assert from 'node:assert/strict';
import {raceZoom} from '../public/game/chase.js';
const pack=()=>[0,10,20,30].map(x=>({x,z:0,alive:true}));
const settled=c=>raceZoom(null,c,0,20).amount;
test('local nearest rival triggers 50 m zoom, with a 45 m release threshold',()=>{
 const c=pack();assert.equal(settled(c),0);
 c[3].x=100;assert.equal(settled(c),0);
 c[1].x=50;c[2].x=60;let s=raceZoom(null,c,0,1);
 assert.equal(s.separated,true);assert.ok(s.amount>0&&s.amount<6);
 c[1].x=48;s=raceZoom(s,c,0,1);assert.equal(s.separated,true);
 c[1].x=45;s=raceZoom(s,c,0,1);assert.equal(s.separated,false);
});
test('each of the first two eliminations adds zoom and dead cars cannot affect distance',()=>{
 const c=pack();c[3].alive=false;assert.ok(Math.abs(settled(c)-4)<1e-9);
 c[2].alive=false;assert.ok(Math.abs(settled(c)-8)<1e-9);
 c[1].x=60;assert.ok(Math.abs(settled(c)-14)<1e-9);
 c[1].alive=false;assert.ok(Math.abs(settled(c)-8)<1e-9);
});
test('zoom smoothing is frame-rate independent and resets for a new round',()=>{
 const c=pack();c[2].alive=c[3].alive=false;
 let a=null,b=null;for(let i=0;i<30;i++)a=raceZoom(a,c,0,1/30);
 for(let i=0;i<120;i++)b=raceZoom(b,c,0,1/120);
 assert.ok(Math.abs(a.amount-b.amount)<1e-10);
 assert.deepEqual(raceZoom(a,pack(),0,0,true),{amount:0,separated:false});
});
