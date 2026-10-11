import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTrack} from '../public/game/sim.js';

test('widened default corners have no reversed or folded road edges',()=>{
 const track=buildTrack();
 // Use the actual rendered mesh stations, including the closing seam. The
 // track lookup has piecewise normals; sub-station offsets are not mesh edges.
 for(let i=0;i<track.samples.length-1;i++){
  const s=track.samples[i].s,afterS=track.samples[i+1].s;
  const p=track.at(s),next=track.at(afterS);
  for(const side of [-1,1]){
   const edge=track.at(s,side*p.width/2),after=track.at(afterS,side*next.width/2);
   const along=(after.x-edge.x)*(next.x-p.x)+(after.z-edge.z)*(next.z-p.z);
   assert.ok(along>0,`road edge folds at station ${s} m, side ${side}`);
  }
 }
});
