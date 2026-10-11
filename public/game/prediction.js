import {drive} from './sim.js';
export function replayPending(car,history,track){
 const pending=history.filter(p=>p.input.seq>(car.inputSeq||0)).slice(-120);
 for(const p of pending)drive(car,p.input,p.dt,track);
 return pending;
}
