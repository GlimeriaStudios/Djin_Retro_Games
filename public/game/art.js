import * as T from './vendor/three.module.js';
export const ARMORY={rocket:{name:'COMET',label:'ROCKET',color:'#ff713e',glyph:'↟',hint:'Straight shot · 48 damage'},mine:{name:'SNAPJAW',label:'MINE',color:'#ff5fa0',glyph:'✹',hint:'Rear trap · arms in 0.65s'},oil:{name:'INKSPILL',label:'OIL',color:'#ad8bff',glyph:'≈',hint:'Rear slick · breaks tire grip'},boost:{name:'AFTERBURN',label:'BOOST',color:'#8ff0be',glyph:'»',hint:'2.4 seconds of extra thrust'}};
const ink='#242334',cream='#ffe5ac';
const ramp=new T.DataTexture(new Uint8Array([72,72,72,255,150,150,150,255,215,215,215,255,255,255,255,255]),4,1,T.RGBAFormat);
ramp.minFilter=ramp.magFilter=T.NearestFilter;ramp.needsUpdate=true;
export function toon(color,extra={}){return new T.MeshToonMaterial({color,gradientMap:ramp, ...extra});}
function mesh(g,geo,color,x=0,y=0,z=0){const m=new T.Mesh(geo,typeof color==='string'?toon(color):color);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
function box(g,w,h,d,color,x=0,y=0,z=0){return mesh(g,new T.BoxGeometry(w,h,d),color,x,y,z);}
function cyl(g,r1,r2,h,color,x=0,y=0,z=0,n=8){return mesh(g,new T.CylinderGeometry(r1,r2,h,n),color,x,y,z);}
function ring(g,r,w,color,y=0){const m=mesh(g,new T.RingGeometry(r,r+w,32),new T.MeshBasicMaterial({color,side:T.DoubleSide,transparent:true,opacity:.8}),0,y,0);m.rotation.x=-Math.PI/2;return m;}
export function weaponModel(type){const g=new T.Group(),col=ARMORY[type].color;
 if(type==='rocket'){
  const hull=cyl(g,.32,.38,1.5,cream,0,0,0);hull.rotation.x=Math.PI/2;
  const tip=mesh(g,new T.ConeGeometry(.34,.65,8),col,0,0,1.05);tip.rotation.x=Math.PI/2;
  const band=cyl(g,.39,.39,.22,ink,0,0,-.3);band.rotation.x=Math.PI/2;
  for(let i=0;i<4;i++){const fin=box(g,.12,.62,.7,col,0,0,-.65);fin.rotation.z=i*Math.PI/2;fin.position.x=Math.sin(i*Math.PI/2)*.28;fin.position.y=Math.cos(i*Math.PI/2)*.28;}
  const fire=mesh(g,new T.ConeGeometry(.28,1.3,6),new T.MeshBasicMaterial({color:'#ffd86c'}),0,0,-1.35);fire.rotation.x=-Math.PI/2;g.userData.flame=fire;
  // Oversized black collar and hazard bands read at racing distance.
  for(const z of [-.12,.16]){const stripe=cyl(g,.385,.385,.09,ink,0,0,z);stripe.rotation.x=Math.PI/2;}
  for(const side of [-1,1]){const wing=box(g,.85,.08,.42,col,side*.52,0,-.5);wing.rotation.y=side*.35;}
  const core=mesh(fire,new T.ConeGeometry(.12,.9,5),new T.MeshBasicMaterial({color:cream}),0,-.15,0);
 }else if(type==='mine'){
  cyl(g,.7,.95,.32,ink,0,.2);cyl(g,.64,.7,.3,col,0,.48);cyl(g,.25,.35,.3,cream,0,.76);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;const tooth=mesh(g,new T.ConeGeometry(.16,.55,4),cream,Math.sin(a)*.78,.48,Math.cos(a)*.78);tooth.rotation.z=-Math.cos(a)*.65;tooth.rotation.x=Math.sin(a)*.65;}
  g.userData.pulse=ring(g,1,.10,col,.04);
  for(let i=0;i<4;i++){const a=i*Math.PI/2+.4;const latch=box(g,.19,.09,.36,'#ffc45c',Math.sin(a)*.55,.67,Math.cos(a)*.55);latch.rotation.y=a;}
  box(g,.14,.13,.14,new T.MeshBasicMaterial({color:'#ffedaa'}),0,.99,0);
 }else if(type==='oil'){
  cyl(g,.55,.55,1.2,ink,0,.6);cyl(g,.58,.58,.2,col,0,.35);cyl(g,.58,.58,.2,col,0,.95);box(g,.28,.1,.4,cream,0,1.23);const drop=mesh(g,new T.OctahedronGeometry(.4),col,.7,.6);drop.scale.y=1.5;
  const warning=box(g,.36,.36,.025,'#ffc45c',0,.65,.56);warning.rotation.z=Math.PI/4;box(g,.07,.19,.035,ink,0,.67,.58);box(g,.07,.05,.035,ink,0,.51,.58);
 }else{
  for(const x of [-.48,.48]){cyl(g,.32,.32,1.3,ink,x,.65);cyl(g,.36,.36,.95,col,x,.7);cyl(g,.13,.2,.28,cream,x,1.4);}
  box(g,1.3,.23,.5,cream,0,.6);box(g,.2,.55,.2,col,0,.85,.3);
  for(const x of [-.48,.48]){cyl(g,.23,.33,.24,ink,x,.02);const bolt=box(g,.1,.6,.055,cream,x,.72,.34);bolt.rotation.z=-.28;}
 }
 return g;
}
export function pickupModel(type){const g=new T.Group(),hover=new T.Group(),col=ARMORY[type].color;g.add(hover);const model=weaponModel(type);model.scale.setScalar(type==='rocket'?1.4:1.4);model.rotation.x=type==='rocket'?-.45:0;hover.add(model);const halo=ring(hover,1.15,.06,col,-.4);halo.rotation.x=0;halo.position.y=.6;const pedestal=cyl(g,1.35,1.7,.23,ink,0,-1.35);const ready=ring(g,1.7,.13,col,-1.2);const charge=ring(g,1.35,.15,cream,-1.18);g.userData={hover,ready,charge,pedestal,type};return g;}
export function upgradeCar(g,id,color){const body=g.userData.body;
 armoredCar(body,id,color);
 // Bold, geometric racing livery and modular roof rack, attached to the authored chassis.
 for(const x of [-.43,.43])box(body,.24,.027,1.05,cream,x,.42,1.35);
 for(const x of [-1.064,1.064]){box(body,.028,.22,2.9,ink,x,.02,.15);box(body,.035,.14,.68,cream,x,.30,.8);}
 for(const x of [-.85,.85]){box(body,.18,.18,.5,ink,x,-.08,-2.22);}
 const intake=box(body,.8,.2,.55,ink,0,.55,1.25);box(body,.6,.06,.22,cream,0,.66,1.35);
 for(const m of body.children.slice(0,2)){const outline=new T.LineSegments(new T.EdgesGeometry(m.geometry,30),new T.LineBasicMaterial({color:ink,transparent:true,opacity:.85}));m.add(outline);}
 const rack=new T.Group();rack.position.set(0,1.32,0);body.add(rack);g.userData.rack=rack;g.userData.rackType=null;
 // Wheel rims and fender corners reinforce silhouette at chase distance.
 for(const x of [-1.13,1.13])for(const z of [-1.3,1.28]){const rim=cyl(g,.28,.28,.035,cream,x,.48,z,8);rim.rotation.z=Math.PI/2;}
 const jets=new T.Group();for(const x of [-.7,.7]){const f=mesh(jets,new T.ConeGeometry(.28,2.2,6),new T.MeshBasicMaterial({color:'#84ffcd'}),x,.4,-3);f.rotation.x=-Math.PI/2;}g.add(jets);jets.visible=false;g.userData.jets=jets;
 const aura=ring(g,2.5,.09,color,.07);aura.visible=false;g.userData.aura=aura;
}
export function sceneryPass(view,track){
 const root=view.staticGroup,half=track.config.width/2;
 retroScenery(view,track);
 // Pier foundations give the existing floating roadway a readable physical setting.
 for(let d=0;d<track.length;d+=28){for(const lane of [-track.at(d).width/2+1,track.at(d).width/2-1]){const p=track.at(d,lane);box(root,1.25,p.y+6,1.25,'#285563',p.x,(p.y-6)/2,p.z);}}
 for(const p of track.config.props){box(root,p.w+5,1.2,p.d+5,'#b17f68',p.x,-1.1,p.z);box(root,p.w+5.3,.2,p.d+5.3,'#f7d5a0',p.x,-.4,p.z);}
 for(const [x,z]of[[-102,-60],[115,45],[100,-78],[-100,70]]){cyl(root,10,12,4,'#4a7d7f',x,-4,z,6);cyl(root,10,10,.3,'#afbd9d',x,-1.9,z,6);}

 // Attach detail to existing designer-authored buildings; never change their data.
 track.config.props.forEach((p,i)=>{
  const roofY=p.h+.4;
  for(let k=0;k<2;k++){const x=p.x-p.w*.22+k*p.w*.44;cyl(root,1.15,1.3,2.5,'#ed986a',x,roofY+1.25,p.z,10);cyl(root,1.35,1.35,.2,cream,x,roofY+2.5,p.z,10);}
  for(const side of [-1,1]){const x=p.x+side*(p.w/2+.18);box(root,.24,p.h,.24,cream,x,p.h/2,p.z-p.d*.4);box(root,.24,p.h,.24,cream,x,p.h/2,p.z+p.d*.4);}
  const sign=view.label(['COMET WORKS','DOCK / 02','INK & IRON'][i%3],ink,cream,Math.min(p.w-1,13),2.2);sign.position.set(p.x,p.h*.62,p.z+p.d/2+.18);root.add(sign);
  for(let k=0;k<3;k++){const x=p.x-p.w*.25+k*p.w*.25;box(root,1.3,.14,2.4,'#73bec4',x,roofY,p.z+p.d*.28);}
 });
 // Roadside wayfinding follows the stable authored curve, like the existing barriers.
 for(let d=12;d<track.length;d+=22){const p=track.at(d),q=track.at(d,p.width/2+.9);const slab=box(root,.5,.18,1.9,'#fff1ce',q.x,q.y+1.32,q.z);slab.rotation.y=p.angle;}
 for(const fraction of [.18,.31,.54,.67,.87]){const p=track.at(track.length*fraction,track.at(track.length*fraction).width/2+1.3);const panel=view.label('› › ›','#142d3a','#ffe0a0',5,1.4);panel.position.set(p.x,p.y+2.25,p.z);panel.rotation.y=p.angle-Math.PI/2;root.add(panel);}
 // Two harbor cranes outside the road footprint. Decorative and non-colliding.
 for(const [x,z,rot]of[[-108,-30,.2],[108,63,-.5]]){
  const crane=new T.Group();crane.position.set(x,-5,z);crane.rotation.y=rot;root.add(crane);
  for(const side of [-1,1]){box(crane,.85,26,.85,'#f78b58',side*5,13,0);box(crane,.85,26,.85,ink,side*5,13,3);}
  box(crane,27,1.3,2.5,'#f78b58',4,26,1.5);box(crane,5,4,4,cream,-6,24,1.5);box(crane,.13,16,.13,ink,15,18,1.5);box(crane,3,.4,2.5,ink,15,10,1.5);
  for(let i=0;i<5;i++){const brace=box(crane,.3,6,.3,cream,-5+i*5,25,1.5);brace.rotation.z=.9;}
 }
 // Ocean graphic strokes are stable set dressing, not gameplay placement.
 const vertices=[];for(let i=0;i<90;i++){const x=Math.sin(i*17.3)*190,z=Math.cos(i*9.7)*170;if(track.nearest(x,z).d<half+4)continue;vertices.push(x,-5.7,z,x+3+i%4,-5.7,z+.3);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));root.add(new T.LineSegments(geo,new T.LineBasicMaterial({color:'#79dfce',transparent:true,opacity:.45})));
}
// Original scrapyard racers: shared collision footprint, four distinct silhouettes.
function armoredCar(body,id,color){
 const steel='#727a89',rust='#a6503f',black='#252130';
 const hull=body.children[0],cab=body.children[1];
 const positions=hull.geometry.attributes.position;
 for(let i=0;i<positions.count;i++){const z=positions.getZ(i);if(z>1)positions.setY(i,positions.getY(i)-(id===0?.18:id===2?.12:.05));}
 positions.needsUpdate=true;hull.geometry.computeVertexNormals();
 // Low wedge / interceptor / hot rod / heavy bruiser.
 cab.scale.set(id===2?.84:1,id===0?.72:id===3?1.13:1,id===1?1.1:id===2?.85:1);
 box(body,2.12,.27,.3,steel,0,-.04,1.98);
 for(const x of [-.76,0,.76]){const tooth=box(body,.23,.36,.32,black,x,-.08,1.98);tooth.rotation.x=-.35;}
 for(const side of [-1,1]){
  box(body,.15,.26,3.35,steel,side*1.02,-.14,0);
  for(const z of [-1.3,1.28])box(body,.23,.30,1.05,black,side*1.02,.08,z);
  const armor=box(body,.045,.4,1.26,id%2?steel:rust,side*1.077,.22,-.15);armor.rotation.x=side*.05;
  for(const z of [-.62,.32])box(body,.055,.09,.09,cream,side*1.108,.3,z);
  for(let k=0;k<3;k++){const slash=box(body,.025,.07,.36,cream,side*1.108,.11+k*.075,-.17);slash.rotation.x=-.45;}
  const exhaust=cyl(body,.11,.14,id===3?1.3:.85,steel,side*.85,id===3?.65:.02,-1.83,6);if(id!==3)exhaust.rotation.x=Math.PI/2;
 }
 // Windshield armor slats retain a readable front and colored roof number.
 for(const x of [-.52,0,.52]){const bar=box(body,.075,.55,.08,steel,x,.66,.77);bar.rotation.x=-.28;}
 if(id===0){for(const side of [-1,1]){const fin=box(body,.10,.64,.75,color,side*.93,.57,-1.62);fin.rotation.x=.35;}box(body,2.1,.12,.5,black,0,.8,-1.72);}
 if(id===1){box(body,1.5,.13,.37,black,0,1.03,-.55);for(const x of [-.52,.52])box(body,.3,.14,.24,x<0?'#ff6545':'#6ce6fa',x,1.14,-.55);}
 if(id===2){box(body,.83,.4,.85,steel,0,.6,1.2);for(const x of [-.28,0,.28]){const intake=cyl(body,.1,.1,.25,black,x,.85,1.2,6);intake.rotation.x=Math.PI/2;}}
 if(id===3){box(body,1.7,.18,1.25,black,0,.54,1.1);for(const x of [-.65,.65])box(body,.14,.6,.16,steel,x,.24,2.04);const spare=cyl(body,.42,.42,.21,black,0,.26,-1.97,10);spare.rotation.x=Math.PI/2;const hub=cyl(body,.18,.18,.23,steel,0,.26,-1.99,6);hub.rotation.x=Math.PI/2;}
 // Hood vents, exposed rivets and a dark grille give the nose a heavier face.
 for(const x of [-.7,-.35,0,.35,.7])box(body,.12,.12,.025,black,x,.05,2.145);
 for(const side of [-1,1])for(let k=0;k<3;k++){const vent=box(body,.33,.035,.08,black,side*.57,.44,1.05+k*.17);vent.rotation.y=side*.22;}
 // Coarse paint chips instead of photoreal grunge; deterministic and cheap.
 for(let i=0;i<7;i++)box(body,.08+(i%3)*.035,.018,.12,steel,Math.sin(i*7+id)*.8,.43,-1.4+(i%3)*1.25);
}
function retroScenery(view,track){
 const root=view.staticGroup;
 // Low-poly coastal ridgeline remains outside the editable race footprint.
 for(let i=0;i<18;i++){
  const a=i*Math.PI/9,r=245+(i%3)*17,h=32+(i*13%43);
  const mountain=mesh(root,new T.ConeGeometry(45,h,5),i%2?'#796886':'#9c7890',Math.sin(a)*r,h/2-7,Math.cos(a)*r);mountain.rotation.y=i*.7;mountain.castShadow=false;
 }
 // Original roadside poster graphics on existing building facades.
 track.config.props.forEach((p,i)=>{
  const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d');
  ctx.fillStyle='#272339';ctx.fillRect(0,0,512,256);
  ctx.fillStyle=['#ff974e','#e65b89','#a0c45c'][i%3];ctx.fillRect(12,12,488,232);
  ctx.fillStyle='#272339';for(let x=-100;x<650;x+=70){ctx.beginPath();ctx.moveTo(x,256);ctx.lineTo(x+140,0);ctx.lineTo(x+163,0);ctx.lineTo(x+23,256);ctx.fill();}
  ctx.fillStyle='#272339';ctx.fillRect(20,54,472,147);ctx.fillStyle='#ffe7ad';ctx.textAlign='center';ctx.font='900 62px Impact, sans-serif';ctx.fillText(['BURN RUBBER','FULL CONTACT','NO BRAKES'][i%3],256,127);ctx.font='bold 20px monospace';ctx.fillText('GRAYLINE  //  MOTOR CLUB',256,168);
  const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;texture.magFilter=T.NearestFilter;
  const panel=mesh(root,new T.PlaneGeometry(Math.min(15,p.w-1),5),new T.MeshBasicMaterial({map:texture}),p.x,p.h*.6,p.z-p.d/2-.2);panel.rotation.y=Math.PI;
 });
 // Painted rumble strips conform to the authored bank and elevation.
 for(let d=0;d<track.length;d+=3){const p=track.at(d);for(const side of [-1,1]){
  const q=track.at(d,side*(p.width/2-.6));const strip=box(root,.62,.035,2.8,Math.floor(d/3)%2?'#f2d5a2':'#c84a49',q.x,q.y+.045,q.z);strip.rotation.set(-Math.atan(p.slope),p.angle,-p.bank,'YXZ');
 }}
}
export class CombatFX{
 constructor(scene){this.group=new T.Group();scene.add(this.group);this.items=[];this.clock=0;this.lastTrail=0;}
 clear(){for(const p of this.items){this.group.remove(p.m);p.m.geometry.dispose();p.m.material.dispose();}this.items=[];}
 emit(x,z,color,kind='spark',y=.7){y+=(this.track?.surface(x,z)||0);if(this.items.length>=100||(this.reducedMotion&&kind!=='spark'))return;let m;
  if(kind==='ring'){m=ring(this.group,.7,.16,color,y);m.position.x=x;m.position.z=z;}
  else m=mesh(this.group,kind==='smoke'?new T.IcosahedronGeometry(.5,0):new T.OctahedronGeometry(.23,0),new T.MeshBasicMaterial({color,transparent:true,opacity:1}),x,y,z);
  const life=kind==='ring'?.45:kind==='smoke'?.55:.4;
  this.items.push({m,kind,life,total:life,vx:kind==='spark'?(Math.random()-.5)*14:0,vz:kind==='spark'?(Math.random()-.5)*14:0,vy:kind==='spark'?5:0});
 }
 event(e){if(e.type==='blast'||e.type==='hit'){this.emit(e.x,e.z,'#ffdd83','ring');for(let i=0;i<(this.reducedMotion?3:12);i++)this.emit(e.x,e.z,i%2?'#ff7449':'#fff0c9');}if(e.type==='pickup')this.emit(e.x,e.z,ARMORY[e.weapon]?.color||'#fff1ce','ring');if(e.type==='fire')this.emit(e.x,e.z,ARMORY[e.weapon]?.color||'#fff1ce','ring');}
 frame(g,dt){this.clock+=dt;
  if(this.clock-this.lastTrail>.045){this.lastTrail=this.clock;for(const s of g.shots)this.emit(s.x,s.z,'#ffdba1','smoke',1);for(const c of g.cars)if(c.alive&&c.boost>0)this.emit(c.x-Math.sin(c.a)*2.5,c.z-Math.cos(c.a)*2.5,'#a1ffe0','smoke',.45);}
  for(const p of this.items){p.life-=dt;const t=1-p.life/p.total;p.m.material.opacity=Math.max(0,1-t);p.m.position.x+=p.vx*dt;p.m.position.z+=p.vz*dt;if(p.kind==='spark'){p.vy-=18*dt;p.m.position.y+=p.vy*dt;p.m.rotation.x+=dt*6;}else p.m.scale.setScalar(p.kind==='ring'?1+t*6:1+t*1.4);if(p.life<=0){this.group.remove(p.m);p.m.geometry.dispose();p.m.material.dispose();}}
  this.items=this.items.filter(p=>p.life>0);
 }
}
