// Visual-only snapshot interpolation. Collision and scoring remain host-authoritative.
const angle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
export class RemoteMotion{
 constructor(){this.clear();}
 clear(){this.frames=[];this.interval=50;this.received=0;}
 push(state,now){const last=this.frames.at(-1);if(last&&state.time<=last.time)return false;
  if(last&&state.round===last.round&&state.phase===last.phase)this.interval+=(Math.min(1000,now-this.received)-this.interval)*.2;
  else{this.frames=[];this.interval=50;}
  this.received=now;this.frames.push({time:state.time,round:state.round,phase:state.phase,cars:state.cars.map(c=>({...c}))});if(this.frames.length>24)this.frames.shift();return true;
 }
 sample(now){const last=this.frames.at(-1);if(!last)return null;
  const delay=Math.max(80,Math.min(300,this.interval*1.5))/1000,target=last.time+(now-this.received)/1000-delay;
  let a=this.frames[0],b=a;for(const f of this.frames){b=f;if(f.time>=target)break;a=f;}
  if(target>=last.time){const dt=Math.min(.15,Math.max(0,target-last.time));return last.cars.map(c=>({...c,x:c.x+(c.alive?c.vx*dt:0),z:c.z+(c.alive?c.vz*dt:0)}));}
  const t=b.time>a.time?Math.max(0,Math.min(1,(target-a.time)/(b.time-a.time))):0;
  return b.cars.map((c,i)=>{const old=a.cars[i];if(!old||old.alive!==c.alive||Math.hypot(c.x-old.x,c.z-old.z)>20)return{...c};
   const result={...c};for(const k of ['x','y','z','trackPitch','trackRoll'])result[k]=(old[k]||0)+((c[k]||0)-(old[k]||0))*t;result.a=angle(old.a,c.a,t);return result;});
 }
}
