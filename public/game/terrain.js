// Authored per-node road cross-sections. Legacy layouts remain flat unless edited.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const flatSection=()=>({elevation:0,width:1,bank:0,surface:'asphalt'});
export function decorateTrack(track){
 const baseAt=track.at.bind(track),baseNearest=track.nearest.bind(track),n=track.config.points.length;
 const sections=track.config.terrain||Array.from({length:n},flatSection);
 const stations=Array.from({length:n},(_,i)=>track.samples[i*24].s);
 function section(s){s=((s%track.length)+track.length)%track.length;let i=n-1;for(let k=0;k<n-1;k++)if(s<stations[k+1]){i=k;break;}
  const a=sections[i],b=sections[(i+1)%n],len=(i===n-1?track.length:stations[i+1])-stations[i];const t=clamp((s-stations[i])/len,0,1),u=t*t*(3-2*t),mix=k=>a[k]+(b[k]-a[k])*u;
  return{surface:a.surface||'asphalt',elevation:mix('elevation'),width:track.config.width*mix('width'),bank:mix('bank')*Math.PI/180,slope:(b.elevation-a.elevation)*6*t*(1-t)/len};
 }
 track.at=(s,lane=0)=>{const p=baseAt(s,lane),f=section(s);return{...p,...f,y:f.elevation+lane*Math.tan(f.bank)};};
 track.nearest=(x,z)=>{const p=baseNearest(x,z),f=section(p.s);return{...p,...f,y:f.elevation+p.lateral*Math.tan(f.bank)};};
 track.surface=(x,z)=>track.nearest(x,z).y;
 for(const p of track.samples){const f=track.at(p.s);Object.assign(p,{surface:f.surface,y:f.y,width:f.width,bank:f.bank,slope:f.slope});}
 track.samples[track.samples.length-1].tx=track.samples[0].tx;track.samples[track.samples.length-1].tz=track.samples[0].tz;
 track.obstacles=(track.config.obstacles||[]).map(o=>{const p=track.at(o.s*track.length,o.lane);return{...o,x:p.x,z:p.z,y:p.y,a:p.angle+(o.angle||0)*Math.PI/180};});
 return track;
}
export function alignSurface(c,track){
 const p=track.nearest(c.x,c.z),f=Math.sin(c.a),z=Math.cos(c.a);
 // Local gradient of the banked surface, projected along chassis forward/right.
 const sx=p.tx*p.slope-p.tz*Math.tan(p.bank),sz=p.tz*p.slope+p.tx*Math.tan(p.bank);
 c.surface=p.surface;c.y=p.y;c.trackPitch=-Math.atan(sx*f+sz*z);c.trackRoll=Math.atan(sx*z-sz*f);
 return{sx,sz};
}
export function constrainObstacles(c,track){
 for(const b of track.obstacles){
  if(Math.hypot(c.x-b.x,c.z-b.z)>Math.hypot(b.w,b.d)/2+2.5)continue;
  const ca=[{x:Math.cos(c.a),z:-Math.sin(c.a),r:1.075},{x:Math.sin(c.a),z:Math.cos(c.a),r:2.15}],ba=[{x:Math.cos(b.a),z:-Math.sin(b.a),r:b.w/2},{x:Math.sin(b.a),z:Math.cos(b.a),r:b.d/2}];
  let depth=Infinity,normal=null;for(const axis of [...ca,...ba]){const dist=(c.x-b.x)*axis.x+(c.z-b.z)*axis.z;const radius=list=>list.reduce((r,q)=>r+q.r*Math.abs(q.x*axis.x+q.z*axis.z),0);const overlap=radius(ca)+radius(ba)-Math.abs(dist);if(overlap<=0){normal=null;break;}if(overlap<depth){depth=overlap;const sign=dist<0?-1:1;normal={x:axis.x*sign,z:axis.z*sign};}}
  if(!normal)continue;c.x+=normal.x*(depth+.002);c.z+=normal.z*(depth+.002);const vn=c.vx*normal.x+c.vz*normal.z;if(vn<0){c.vx-=normal.x*vn*1.18;c.vz-=normal.z*vn*1.18;c.omega*=.6;c.impactTime=.4;impactCamera(c,-vn);}
 }
}
export function blockedPoint(track,x,z,padding=0){return track.obstacles.some(b=>{const dx=x-b.x,dz=z-b.z;return Math.abs(dx*Math.cos(b.a)-dz*Math.sin(b.a))<b.w/2+padding&&Math.abs(dx*Math.sin(b.a)+dz*Math.cos(b.a))<b.d/2+padding;});}

// Contact speed in m/s: ignore resting scrapes; a 16 m/s hit gives the maximum
// jolt. Taking the maximum prevents overlapping contacts from stacking shake.
export function impactCamera(c,speed){c.cameraKick=Math.max(c.cameraKick||0,clamp((speed-1)/15,0,1));}
