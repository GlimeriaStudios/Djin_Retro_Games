import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {scoreEvents,SCORE,RaceMusic} from '../public/game/music.js';import {MIDI_SCORE} from '../public/game/race-score.js';
test('browser score retains every supplied MIDI note, tempo and velocity',()=>{
 const midi=fs.readFileSync(new URL('../public/game/audio/grayline-race-theme-v2.mid',import.meta.url));assert.equal(crypto.createHash('sha256').update(midi).digest('hex'),MIDI_SCORE.sha256);
 assert.ok(Math.abs(SCORE.bpm-117)<.001);const events=Array.from({length:56},(_,i)=>scoreEvents(i)).flat();assert.equal(events.length,1476);
 for(let i=0;i<events.length;i++){const e=events[i],n=MIDI_SCORE.notes[i],unit=MIDI_SCORE.microsecondsPerBeat/1e6/MIDI_SCORE.ppq;assert.ok(Math.abs(e.time-n[0]*unit)<1e-10);assert.ok(Math.abs(e.duration-n[1]*unit)<1e-10);assert.equal(e.note,n[2]);assert.equal(e.level,n[3]/127);}
});
test('all eight parts and the authored cymbals are preserved; the exact 56-bar score loops',()=>{
 const events=Array.from({length:56},(_,i)=>scoreEvents(i)).flat();for(const kind of ['bass','guitar','piano','theme','violin','viola','cello','kick','snare','hat','openHat','crash'])assert.ok(events.some(e=>e.kind===kind),kind);
 const length=114.871904;for(let b=0;b<56;b++){const first=scoreEvents(b),next=scoreEvents(b+56);assert.equal(first.length,next.length);first.forEach((e,i)=>assert.ok(Math.abs(next[i].time-e.time-length)<1e-10));}
 assert.ok(events.every((e,i)=>!i||e.time>=events[i-1].time));assert.ok(Math.abs(events.find(e=>e.kind==='theme').time-77040/480*60/SCORE.bpm)<1e-10);
});
test('scheduler is silent while muted, resumes without a burst, and restarts on race entry',()=>{
 const music=Object.create(RaceMusic.prototype);Object.assign(music,{ctx:{currentTime:0,state:'running'},active:true,enabled:false,origin:.12,next:0,bar:0,events:[],volume(){},play(e,t){this.played.push({e,t});},played:[]});
 music.schedule();assert.equal(music.played.length,0);music.enabled=true;music.schedule();assert.ok(music.played.length>0);
 music.ctx.currentTime=60;music.schedule();assert.ok(music.played.at(-1).t>=60);music.setActive(false);music.setActive(true);assert.equal(music.bar,0);assert.equal(music.next,0);assert.equal(music.events.length,0);
});
