import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGame,startRound,step,RACE_RULES} from '../public/game/sim.js';
const setup=()=>{const g=makeGame();startRound(g,true);g.phase='race';g.cars.forEach(c=>c.bot=false);return g;};
test('the former 55-second cutoff no longer ends a race, and the two-minute cap awards it',()=>{
 const g=setup();g.raceTime=54.9;for(let i=0;i<30;i++)step(g);assert.equal(g.phase,'race');
 g.raceTime=RACE_RULES.duration-1/120;step(g);assert.equal(g.phase,'round');assert.equal(g.cars[g.roundWinner].score,2);
});
test('trailing pressure waits through opening and gives ten continuous seconds to recover',()=>{
 const g=setup();g.cars[0].progress=150;g.raceTime=20;
 for(let i=0;i<600;i++)step(g);assert.ok(g.cars.every(c=>c.alive&&c.behind===0));
 g.raceTime=RACE_RULES.trailingStarts+.1;for(let i=0;i<240;i++)step(g);assert.ok(g.cars.every(c=>c.alive));assert.ok(g.cars[1].behind>3.9);
 // Returning within range cancels the countdown rather than banking a penalty.
 g.cars[0].progress=100;step(g);assert.equal(g.cars[1].behind,0);
 g.cars[0].progress=150;for(let i=0;i<590;i++)step(g);assert.ok(g.cars[1].alive);
 for(let i=0;i<15;i++)step(g);assert.equal(g.cars[1].reason,'LEFT BEHIND');assert.equal(g.phase,'round');
});
test('the last surviving car can still win before the timer expires',()=>{
 const g=setup();g.cars.slice(1).forEach(c=>c.alive=false);step(g);assert.equal(g.phase,'round');assert.equal(g.roundWinner,0);
});
