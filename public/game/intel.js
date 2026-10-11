export function raceIntel(g,c){
 if(!c.alive||g.phase!=='race')return {label:'',detail:'',kind:''};
 const near=g.track.nearest(c.x,c.z),speed=Math.hypot(c.vx,c.vz);
 for(const s of g.shots){if(s.owner===c.id)continue;const dx=s.x-c.x,dz=s.z-c.z,vx=s.vx-c.vx,vz=s.vz-c.vz,v2=vx*vx+vz*vz;if(v2<1)continue;const t=-(dx*vx+dz*vz)/v2;if(t>0&&t<1.25&&Math.hypot(dx+vx*t,dz+vz*t)<4.2)return{label:'ROCKET INCOMING',detail:'Break left or right',kind:'danger'};}
 const mine=g.hazards.find(h=>h.type==='mine'&&h.age>=.65&&Math.hypot(h.x-c.x,h.z-c.z)<9);
 if(mine)return{label:'MINE NEARBY',detail:'Pink teeth · steer clear',kind:'danger'};
 const direction=c.vx*near.tx+c.vz*near.tz;
 if(speed>5&&direction<-speed*.6)return{label:'WRONG WAY',detail:'Follow the road arrows',kind:'warning'};
 if(c.hp<=30)return{label:'CRITICAL DAMAGE',detail:Math.round(c.hp)+' HP · protect your car',kind:'danger'};
 if(speed<1&&c.resetCd<=0&&g.raceTime>4)return{label:'STUCK?',detail:'R / Y to recover · costs 20 HP',kind:'hint'};
 return{label:'',detail:'',kind:''};
}
