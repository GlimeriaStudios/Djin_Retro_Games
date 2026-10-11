import {decorateTrack,alignSurface,constrainObstacles,blockedPoint,impactCamera} from './terrain.js';
import {integrateVehicle,VEHICLE} from './vehicle.js';
import {updateBoost} from './boost.js';
// GRAYLINE simulation. Metres, seconds; independent of rendering and networking.
export const COLORS=['#ffb44a','#65c9ed','#ec809f','#b6dd77'];
// Seconds/metres: allow roughly a lap to settle in, then give a spun-out car
// ten seconds to catch up. The two-minute cap still resolves surviving ties.
export const RACE_RULES=Object.freeze({duration:120,trailingStarts:45,trailingDistance:120,trailingGrace:10});
export const WEAPONS=['rocket','mine','oil','boost'];
// The 24 m base road flares to 30–32.4 m at corners for four-car drift battles.
// Corner control points are spread out so the inner edge never folds over itself.
// Only defaults change; imported/saved workshop layouts keep their authored geometry.
export const DEFAULT_TRACK={id:'foundry-loop',name:'Foundry Loop',width:24,grip:7.2,power:19,steering:1.9,points:[[-76,25],[-72,-25],[-48,-62],[-6,-72],[30,-50],[67,-50],[96,-18],[90,24],[65,49],[15,40],[-22,59],[-59,49]],terrain:[{elevation:0,width:1,bank:0},{elevation:0,width:1.08,bank:0,surface:'gravel'},{elevation:5,width:1.25,bank:-10,surface:'gravel'},{elevation:12,width:1.25,bank:-7},{elevation:7,width:1.3,bank:8},{elevation:3,width:1.3,bank:-9},{elevation:2,width:1.25,bank:-12},{elevation:7,width:1.35,bank:10},{elevation:11,width:1.35,bank:-10},{elevation:4,width:1.18,bank:7},{elevation:1,width:1.2,bank:-8},{elevation:0,width:1.2,bank:0}],obstacles:[{s:.235,lane:-5,w:4,d:6,h:1.6,angle:0},{s:.52,lane:4,w:3.5,d:7,h:1.5,angle:0},{s:.60,lane:-3.5,w:3,d:6,h:1.8,angle:0},{s:.87,lane:4,w:3.5,d:5,h:1.5,angle:0}],pickups:[{s:.10,lane:-3,type:'rocket'},{s:.12,lane:3,type:'boost'},{s:.30,lane:0,type:'mine'},{s:.46,lane:-3,type:'rocket'},{s:.49,lane:3,type:'oil'},{s:.65,lane:0,type:'boost'},{s:.79,lane:-3,type:'mine'},{s:.82,lane:3,type:'rocket'}],props:[{x:-28,z:-11,w:23,d:18,h:7},{x:27,z:-3,w:19,d:15,h:11},{x:0,z:10,w:10,d:8,h:5}]};
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
// Chassis bounds match the rendered body. Heading is clockwise in the X/Z plane.
const HALF_WIDTH=1.075,HALF_LENGTH=2.15,INVERSE_INERTIA=VEHICLE.mass/VEHICLE.yawInertia;
const axes=c=>[{x:Math.sin(c.a),z:Math.cos(c.a),extent:HALF_LENGTH},{x:Math.cos(c.a),z:-Math.sin(c.a),extent:HALF_WIDTH}];
const supportRadius=(c,nx,nz)=>axes(c).reduce((r,a)=>r+a.extent*Math.abs(a.x*nx+a.z*nz),0);
export function carContact(a,b){
 if(Math.hypot(b.x-a.x,b.z-a.z)>4.81)return null;
 let depth=Infinity,normal;
 for(const axis of [...axes(a),...axes(b)]){
  const distance=(b.x-a.x)*axis.x+(b.z-a.z)*axis.z;
  const overlap=supportRadius(a,axis.x,axis.z)+supportRadius(b,axis.x,axis.z)-Math.abs(distance);
  if(overlap<=0)return null;
  if(overlap<depth){depth=overlap;const sign=distance<0?-1:1;normal={x:axis.x*sign,z:axis.z*sign};}
 }
 return {...normal,depth};
}
export function resolveCarCollision(a,b){
 const n=carContact(a,b);if(!n)return 0;
 // Midpoint of the overlap along the contact face avoids artificial torque on symmetric hits.
 const tx=-n.z,tz=n.x,ta=a.x*tx+a.z*tz,tb=b.x*tx+b.z*tz;
 const ra=supportRadius(a,tx,tz),rb=supportRadius(b,tx,tz);
 const tangent=(Math.max(ta-ra,tb-rb)+Math.min(ta+ra,tb+rb))*.5;
 const normal=((a.x+b.x)*n.x+(a.z+b.z)*n.z)*.5;
 const cx=n.x*normal+tx*tangent,cz=n.z*normal+tz*tangent;
 const ax=cx-a.x,az=cz-a.z,bx=cx-b.x,bz=cz-b.z;
 const va=(b.vx+b.omega*bz-a.vx-a.omega*az)*n.x+(b.vz-b.omega*bx-a.vz+a.omega*ax)*n.z;
 const torqueA=az*n.x-ax*n.z,torqueB=bz*n.x-bx*n.z;
 const impulse=va<0?-va*1.25/(2+INVERSE_INERTIA*(torqueA**2+torqueB**2)):0;
 a.x-=n.x*n.depth*.5;a.z-=n.z*n.depth*.5;b.x+=n.x*n.depth*.5;b.z+=n.z*n.depth*.5;
 a.vx-=n.x*impulse;a.vz-=n.z*impulse;b.vx+=n.x*impulse;b.vz+=n.z*impulse;
 impactCamera(a,impulse);impactCamera(b,impulse);a.impactTime=b.impactTime=.65; a.omega=clamp(a.omega-torqueA*impulse*INVERSE_INERTIA,-5,5);b.omega=clamp(b.omega+torqueB*impulse*INVERSE_INERTIA,-5,5);
 return impulse;
}
export function exposedAt(track,s){const f=s/track.length;return(f>.34&&f<.48)||(f>.72&&f<.82);}
export function constrainBarrier(c,track){
 const near=track.nearest(c.x,c.z);if(exposedAt(track,near.s)||near.d<.001)return;
 const nx=(c.x-near.x)/near.d,nz=(c.z-near.z)/near.d;
 const limit=near.width/2-.375-supportRadius(c,nx,nz);
 if(near.d<=limit)return;
 c.x=near.x+nx*limit;c.z=near.z+nz*limit;
 const vn=c.vx*nx+c.vz*nz;if(vn>0){impactCamera(c,vn);c.vx-=nx*vn*1.3;c.vz-=nz*vn*1.3;}
}
export function validateTrack(t){
 if(!t||!Array.isArray(t.points)||t.points.length<6||t.points.length>32)throw Error('Track needs 6–32 control points');
 for(const p of t.points)if(!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)||Math.abs(v)>200))throw Error('Invalid track point');
 for(let i=0;i<t.points.length;i++){const a=t.points[i],b=t.points[(i+1)%t.points.length];if(Math.hypot(a[0]-b[0],a[1]-b[1])<4)throw Error('Keep adjacent road nodes at least 4 metres apart');}
 if(!Array.isArray(t.pickups)||t.pickups.length>30||t.pickups.some(p=>!WEAPONS.includes(p.type)||!Number.isFinite(p.s)||p.s<0||p.s>=1||!Number.isFinite(p.lane)||Math.abs(p.lane)>12))throw Error('Invalid pickups');
 if(!Array.isArray(t.props)||t.props.length>40||t.props.some(p=>['x','z','w','d','h'].some(k=>!Number.isFinite(p[k])||Math.abs(p[k])>220)||p.w<=0||p.d<=0||p.h<=0))throw Error('Invalid blockout props');
 if(t.terrain!==undefined&&(!Array.isArray(t.terrain)||t.terrain.length!==t.points.length||t.terrain.some(p=>!p||!Number.isFinite(p.elevation)||p.elevation<0||p.elevation>20||!Number.isFinite(p.width)||p.width<.6||p.width>1.4||!Number.isFinite(p.bank)||Math.abs(p.bank)>18)))throw Error('Invalid node elevation, width or banking');
 if(t.terrain?.some(p=>p.surface!==undefined&&!['asphalt','gravel'].includes(p.surface)))throw Error('Invalid road surface');
 if(t.obstacles!==undefined&&(!Array.isArray(t.obstacles)||t.obstacles.length>20||t.obstacles.some(p=>!p||['s','lane','w','d','h','angle'].some(k=>!Number.isFinite(p[k]))||p.s<0||p.s>=1||Math.abs(p.lane)>12||p.w<1||p.w>6||p.d<1||p.d>10||p.h<.5||p.h>3||Math.abs(p.angle)>45)))throw Error('Invalid road blockage');
 const out=structuredClone(t);out.width=clamp(+t.width||18,12,26);out.grip=clamp(+t.grip||7.2,3,12);out.power=clamp(+t.power||19,12,26);out.steering=clamp(+t.steering||1.9,1.2,2.8);out.name=String(t.name||'Foundry Loop').slice(0,32);out.id='foundry-loop';return out;
}
export function buildTrack(config=DEFAULT_TRACK){
 const points=config.points,n=points.length,samples=[],count=n*24;
 const cat=(a,b,c,d,t)=>.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
 for(let j=0;j<=count;j++){const u=j/count*n,i=Math.floor(u)%n,t=u-Math.floor(u),p=[points[(i+n-1)%n],points[i],points[(i+1)%n],points[(i+2)%n]];samples.push({x:cat(...p.map(v=>v[0]),t),z:cat(...p.map(v=>v[1]),t),s:0});}
 let length=0;for(let i=0;i<count;i++){samples[i].s=length;const a=samples[i],b=samples[i+1],d=Math.hypot(b.x-a.x,b.z-a.z);a.len=d;a.tx=(b.x-a.x)/d;a.tz=(b.z-a.z)/d;length+=d;}samples[count].s=length;
 // An epsilon of 1e-8 metres makes exact mesh stations select a consistent outgoing tangent after modulo rounding.
 const track={config,samples,length,at(s,lane=0){s=((s%length)+length)%length;let i=0;while(i<count-1&&samples[i+1].s<=s+1e-8)i++;const a=samples[i],t=(s-a.s)/a.len;return{x:a.x+a.tx*a.len*t-a.tz*lane,z:a.z+a.tz*a.len*t+a.tx*lane,angle:Math.atan2(a.tx,a.tz),tx:a.tx,tz:a.tz};},nearest(x,z){let best={d:Infinity};for(let i=0;i<count;i++){const a=samples[i],t=clamp(((x-a.x)*a.tx+(z-a.z)*a.tz)/a.len,0,1),px=a.x+a.tx*a.len*t,pz=a.z+a.tz*a.len*t,d=Math.hypot(x-px,z-pz);if(d<best.d)best={d,s:a.s+t*a.len,x:px,z:pz,tx:a.tx,tz:a.tz,lateral:(x-px)*-a.tz+(z-pz)*a.tx};}return best;}};return decorateTrack(track);
}
export function makeGame(config=DEFAULT_TRACK){const track=buildTrack(config);return {track,phase:'lobby',time:0,phaseTime:0,round:0,winner:-1,roundWinner:-1,cars:Array.from({length:4},(_,id)=>({id,name:['YOU','Rook','Bolt','Echo'][id],bot:true,score:0})),pickups:[],shots:[],hazards:[],events:[],eventId:0,seed:331};}
function event(g,type,x,z,extra={}){g.events.push({id:++g.eventId,type,x,z,time:g.time,...extra});if(g.events.length>25)g.events.shift();}
export function startRound(g,reset=false){if(reset){g.cars.forEach(c=>c.score=0);g.round=0;g.winner=-1;}g.round++;g.phase='countdown';g.phaseTime=3;g.raceTime=0;g.roundWinner=-1;g.shots=[];g.hazards=[];g.pickups=g.track.config.pickups.map((p,i)=>({...p,id:i,cooldown:0,...g.track.at(p.s*g.track.length,p.lane)}));
 const start=(g.round-1)*g.track.length*.19;
 for(const c of g.cars){const s=start-4-Math.floor(c.id/2)*6,p=g.track.at(s,c.id%2?3:-3);Object.assign(c,{x:p.x,z:p.z,y:p.y,a:p.angle,vx:0,vz:0,omega:0,hp:100,alive:true,fall:0,weapon:null,ammo:0,cooldown:0,boost:0,boostCharge:0,boostHeld:false,oil:0,progress:s,lastS:((s%g.track.length)+g.track.length)%g.track.length,behind:0,off:0,shield:1.5,resetCd:0,stuck:0,fireHeld:false,reason:'',slip:0,lateralAccel:0,longitudinalAccel:0,steeringAngle:0,tireUsage:0,frontLoad:.52,rearLoad:.48,steer:0,drifting:false,driftDirection:0,driftBlend:0,impactTime:0,cameraKick:0,trackPitch:0,trackRoll:0,inputSeq:0});alignSurface(c,g.track);}
}
function botTarget(g,c,near,speed){let lane=(c.id-1.5)*1.5;const look=9+speed*.6;const block=g.track.obstacles.find(b=>{const d=(b.s*g.track.length-near.s+g.track.length)%g.track.length;return d<look+12;});if(block){const width=g.track.at(block.s*g.track.length).width;const left=block.lane-block.w/2-2.4,right=block.lane+block.w/2+2.4;lane=right<width/2-1.8?right:left;}return g.track.at(near.s+look,clamp(lane,-near.width/2+2,near.width/2-2));}
export function botInput(g,c){const speed=Math.hypot(c.vx,c.vz),near=g.track.nearest(c.x,c.z),p=botTarget(g,c,near,speed),target=Math.atan2(p.x-c.x,p.z-c.z),diff=angleDiff(target,c.a),ahead=g.track.at(near.s+23),bend=Math.abs(angleDiff(ahead.angle,near?Math.atan2(near.tx,near.tz):c.a));let throttle=speed>(bend>.8?11:bend>.4?16:27)?-.65:1;
 c.stuck=speed<2?c.stuck+1/60:0;if(c.stuck>2.5)return{throttle:-.7,steer:-Math.sign(diff),fire:false,reset:c.stuck>4.5};
 const rival=g.cars.find(o=>o.id!==c.id&&o.alive&&Math.hypot(o.x-c.x,o.z-c.z)<38&&Math.abs(angleDiff(Math.atan2(o.x-c.x,o.z-c.z),c.a))<.5);
 return{throttle,steer:clamp(diff*2.1,-1,1),brake:Math.abs(diff)>.9&&speed>18,fire:c.cooldown<=0&&(c.weapon==='rocket'?!!rival:c.weapon==='boost'?bend<.5:!!c.weapon)};
}
export function recoveryPoint(track,s){for(const offset of [0,-7,7,-14,14])for(const lane of [0,-3,3]){const p=track.at(s+offset,lane);if(!blockedPoint(track,p.x,p.z,2.5))return p;}return track.at(s-22);}
export function drive(c,input,dt,track){
 if(!c.alive){if(c.fall){c.fall+=dt;c.y=(c.fallStart||0)-5*c.fall*c.fall;c.a+=dt*1.4;}return;}
 c.cooldown=Math.max(0,c.cooldown-dt);c.boost=Math.max(0,c.boost-dt);c.oil=Math.max(0,c.oil-dt);c.shield=Math.max(0,c.shield-dt);c.resetCd=Math.max(0,c.resetCd-dt);
 const grade=alignSurface(c,track);if(Math.hypot(c.vx,c.vz)>.5||Math.abs(input.throttle||0)>.1){c.vx-=9.81*grade.sx*dt;c.vz-=9.81*grade.sz*dt;}
 integrateVehicle(c,input,dt,track.config);updateBoost(c,input,dt);constrainObstacles(c,track);alignSurface(c,track);
 const near=track.nearest(c.x,c.z),half=near.width/2;let delta=near.s-c.lastS;if(delta>track.length/2)delta-=track.length;if(delta<-track.length/2)delta+=track.length;if(Math.abs(delta)<10)c.progress+=delta;c.lastS=near.s;
 // Most of the circuit has concrete barriers; two exposed outside edges reward precision.
 const exposed=exposedAt(track,near.s);
 constrainBarrier(c,track);
 c.off=exposed&&near.d>half+1?c.off+dt:0;
 if(input.reset&&c.resetCd<=0){const p=recoveryPoint(track,c.progress);Object.assign(c,{x:p.x,z:p.z,y:p.y,a:p.angle,vx:0,vz:0,omega:0,steer:0,drifting:false,driftDirection:0,driftBlend:0,impactTime:0,cameraKick:0,steeringAngle:0,lateralAccel:0,longitudinalAccel:0,hp:Math.max(1,c.hp-20),off:0,resetCd:6});}
}
function eliminate(g,c,reason){if(!c.alive)return;c.alive=false;c.reason=reason;if(reason==='FELL OFF'){c.fall=.1;c.fallStart=c.y;};event(g,'eliminate',c.x,c.z,{car:c.id,reason});}
function hit(g,c,damage,x,z,force=9,owner=-1){if(c.shield>0||!c.alive)return;const d=Math.hypot(c.x-x,c.z-z)||1;c.vx+=(c.x-x)/d*force;c.vz+=(c.z-z)/d*force;c.omega+=force*.11;c.impactTime=.65;impactCamera(c,force);c.hp=Math.max(0,c.hp-damage);event(g,'hit',c.x,c.z,{car:c.id,owner,damage,wrecked:c.hp<=0});if(c.hp<=0)eliminate(g,c,'WRECKED');}
export function fireWeapon(g,c){if(!c.alive||!c.weapon||c.cooldown>0)return false;const fx=Math.sin(c.a),fz=Math.cos(c.a),type=c.weapon;c.cooldown=.45;
 if(type==='rocket'){g.shots.push({id:++g.eventId,x:c.x+fx*3,z:c.z+fz*3,vx:fx*55+c.vx*.4,vz:fz*55+c.vz*.4,owner:c.id,life:2.2});}
 if(type==='mine'||type==='oil')g.hazards.push({id:++g.eventId,type,x:c.x-fx*3.5,z:c.z-fz*3.5,owner:c.id,life:type==='oil'?9:18,age:0});
 if(type==='boost')c.boost=2.4;
 event(g,'fire',c.x,c.z,{weapon:type,car:c.id});c.ammo--;if(c.ammo<=0)c.weapon=null;return true;
}
export function step(g,inputs={},dt=1/60){g.time+=dt;if(g.phase==='lobby'||g.phase==='match')return;
 if(g.phase==='countdown'){g.phaseTime-=dt;if(g.phaseTime<=0){g.phase='race';g.phaseTime=0;}return;}
 if(g.phase==='round'){g.phaseTime-=dt;if(g.phaseTime<=0)startRound(g);return;}
 g.raceTime+=dt;
 for(const c of g.cars){const input=c.bot?botInput(g,c):inputs[c.id]||{};drive(c,input,dt,g.track);if(input.fire)fireWeapon(g,c);if(c.off>.42)eliminate(g,c,'FELL OFF');}
 // Resolve the pack twice, then keep contact corrections inside solid barriers.
 for(let pass=0;pass<2;pass++){
  for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){const a=g.cars[i],b=g.cars[j];if(!a.alive||!b.alive)continue;const impulse=resolveCarCollision(a,b);if(impulse>6)event(g,'bump',(a.x+b.x)/2,(a.z+b.z)/2);}
  for(const c of g.cars)if(c.alive){constrainBarrier(c,g.track);constrainObstacles(c,g.track);alignSurface(c,g.track);}
 }
 for(const p of g.pickups){p.cooldown=Math.max(0,p.cooldown-dt);if(p.cooldown===0){for(const c of g.cars)if(c.alive&&!c.weapon&&Math.hypot(c.x-p.x,c.z-p.z)<3){c.weapon=p.type;c.ammo=p.type==='rocket'?2:p.type==='mine'?2:1;p.cooldown=7;event(g,'pickup',c.x,c.z,{car:c.id,weapon:p.type});break;}}}
 for(const s of g.shots){s.life-=dt;s.x+=s.vx*dt;s.z+=s.vz*dt;const near=g.track.nearest(s.x,s.z);if(blockedPoint(g.track,s.x,s.z,.25)||(!exposedAt(g.track,near.s)&&near.d>near.width/2-.55)){s.life=0;event(g,'blast',s.x,s.z);continue;}for(const c of g.cars)if(c.id!==s.owner&&c.alive&&Math.hypot(c.x-s.x,c.z-s.z)<2.7){hit(g,c,48,s.x-s.vx*.06,s.z-s.vz*.06,14,s.owner);s.life=0;event(g,'blast',s.x,s.z);break;}}
 g.shots=g.shots.filter(s=>s.life>0);
 for(const h of g.hazards){h.life-=dt;h.age+=dt;if(h.age<.65)continue;for(const c of g.cars)if(c.alive&&Math.hypot(c.x-h.x,c.z-h.z)<(h.type==='oil'?3.7:2.8)){if(h.type==='oil'){c.oil=1.8;c.omega+=.05;}else{hit(g,c,55,h.x,h.z,17,h.owner);h.life=0;event(g,'blast',h.x,h.z);break;}}}g.hazards=g.hazards.filter(h=>h.life>0);
 let alive=g.cars.filter(c=>c.alive),leader=Math.max(...alive.map(c=>c.progress));for(const c of alive){c.behind=g.raceTime>RACE_RULES.trailingStarts&&leader-c.progress>RACE_RULES.trailingDistance?c.behind+dt:0;if(c.behind>=RACE_RULES.trailingGrace)eliminate(g,c,'LEFT BEHIND');}
 alive=g.cars.filter(c=>c.alive);if(alive.length<=1||g.raceTime>=RACE_RULES.duration){const winner=alive.sort((a,b)=>b.progress-a.progress)[0];g.roundWinner=winner?.id??-1;if(winner){winner.score+=2;event(g,'round',winner.x,winner.z,{car:winner.id});}g.phase='round';g.phaseTime=4.5;if(winner?.score>=6){g.phase='match';g.winner=winner.id;}}
}
export function snapshot(g){return{phase:g.phase,time:g.time,phaseTime:g.phaseTime,round:g.round,winner:g.winner,roundWinner:g.roundWinner,raceTime:g.raceTime,cars:g.cars.map(c=>({...c})),pickups:g.pickups,shots:g.shots,hazards:g.hazards,events:g.events,eventId:g.eventId};}
export function applySnapshot(g,s){if(!s||!Array.isArray(s.cars)||s.cars.length!==4)return;for(const k of ['phase','time','phaseTime','round','winner','roundWinner','raceTime','cars','pickups','shots','hazards','events','eventId'])if(s[k]!==undefined)g[k]=s[k];}


