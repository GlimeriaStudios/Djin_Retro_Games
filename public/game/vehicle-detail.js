import * as T from './vendor/three.module.js';
import {toon} from './art.js';
import {ART} from './art-config.js';

// Visual shells only. All dimensions are metres, fitted inside the existing
// 2.1 × 4.2 m footprint; chassis, wheels, suspension and weapon rack are retained.
export function detailVehicle(g,id,color){
 const {body,rack,mount}=g.userData,p=ART.vehicleDetail;
 for(const child of [...body.children])if(child!==rack&&child!==mount){body.remove(child);child.traverse(o=>{o.geometry?.dispose();o.material?.map?.dispose();o.material?.dispose();});}
 const root=new T.Group();body.add(root);
 const mats={paint:toon(color),dark:toon(p.rubber),chrome:toon(p.chrome),glass:toon(p.glass),stripe:toon(p.stripe),wood:toon(p.wood),light:toon(p.lamps,{emissive:p.lamps,emissiveIntensity:.25}),tail:toon(p.tail,{emissive:p.tail,emissiveIntensity:.15})};
 const mesh=(geo,mat,x=0,y=0,z=0)=>{const m=new T.Mesh(geo,mats[mat]||mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;root.add(m);return m;};
 const box=(w,h,d,mat,x,y,z)=>mesh(new T.BoxGeometry(w,h,d),mat,x,y,z);
 const cylinder=(r,length,mat,x,y,z)=>{const m=mesh(new T.CylinderGeometry(r,r,length,16),mat,x,y,z);m.rotation.x=Math.PI/2;return m;};
 const pickup=id>=2;
 // Chamfered sections give the fenders/hood a rolled edge instead of a box top.
 const sections=[[-2.1,.93,.24],[-1.75,1.04,.38],[.85,1.04,.39],[1.85,1.01,.32],[2.1,.95,.24]];
 const vertices=[],indices=[];
 for(const [z,w,top] of sections)for(const [x,y] of [[-w,-.16],[-w,top-.07],[-w+.12,top],[w-.12,top],[w,top-.07],[w,-.16]])vertices.push(x,y,z);
 for(let s=0;s<sections.length-1;s++)for(let j=0;j<6;j++){const a=s*6+j,b=s*6+(j+1)%6,c=a+6,d=b+6;indices.push(a,c,b,b,c,d);}
 indices.push(0,1,2,0,2,3,0,3,4,0,4,5,24,26,25,24,27,26,24,28,27,24,29,28);
 const hull=new T.BufferGeometry();hull.setAttribute('position',new T.Float32BufferAttribute(vertices,3));hull.setIndex(indices);hull.computeVertexNormals();mesh(hull,'paint');
 // Low muscle roof / upright pickup cab. Glass panels have inset chrome frames.
 const cabZ=pickup?.42:-.43,roofY=pickup?1.14:id===0?.96:1.00,cabDepth=pickup?1.14:1.48;
 const taper=pickup?.08:.22,frontInset=pickup?.10:.29,rearInset=pickup?.06:.24;
 const cabin=new T.BufferGeometry();
 cabin.setAttribute('position',new T.Float32BufferAttribute([
  -.86,.35,cabZ-cabDepth/2,.86,.35,cabZ-cabDepth/2,.86,.35,cabZ+cabDepth/2,-.86,.35,cabZ+cabDepth/2,
  -.86+taper,roofY,cabZ-cabDepth/2+rearInset,.86-taper,roofY,cabZ-cabDepth/2+rearInset,
  .86-taper,roofY,cabZ+cabDepth/2-frontInset,-.86+taper,roofY,cabZ+cabDepth/2-frontInset],3));
 cabin.setIndex([0,4,1,1,4,5,1,5,2,2,5,6,2,6,3,3,6,7,3,7,0,0,7,4,4,7,5,5,7,6]);cabin.computeVertexNormals();mesh(cabin,'glass');
 box(1.75-taper*2,.085,cabDepth-frontInset-rearInset+.06,'paint',0,roofY,cabZ+(rearInset-frontInset)/2);
 for(const side of [-1,1]){
  const frontPost=box(.075,Math.hypot(roofY-.35,frontInset),.08,'chrome',side*(.86-taper/2),(roofY+.35)/2,cabZ+cabDepth/2-frontInset/2);frontPost.rotation.x=-Math.atan2(frontInset,roofY-.35);frontPost.rotation.z=side*Math.atan2(taper,roofY-.35);
  const rearPost=box(.095,Math.hypot(roofY-.35,rearInset),.09,'paint',side*(.86-taper/2),(roofY+.35)/2,cabZ-cabDepth/2+rearInset/2);rearPost.rotation.x=Math.atan2(rearInset,roofY-.35);rearPost.rotation.z=side*Math.atan2(taper,roofY-.35);
  box(.06,.07,cabDepth,'chrome',side*.877,.39,cabZ);
  const pillar=box(.065,roofY-.35,.065,'paint',side*(.86-taper/2),(roofY+.35)/2,cabZ+.05);pillar.rotation.z=side*Math.atan2(taper,roofY-.35);
  box(.035,.20,cabDepth+.12,'paint',side*1.045,.21,cabZ);
  box(.04,.045,.22,'chrome',side*1.065,.29,cabZ-.24);
  const mirror=box(.22,.14,.25,'paint',side*1.10,.65,cabZ+cabDepth/2-.12);mirror.rotation.y=side*.15;
  box(.24,.045,.07,'chrome',side*1.03,.54,cabZ+cabDepth/2-.12);
  box(.065,.065,3.5,'chrome',side*1.06,-.10,0);
  for(const z of [-1.3,1.28]){
   // Dark wheel wells and rolled lips are stationary body trim, not collision.
   const arch=mesh(new T.TorusGeometry(.51,.075,5,16,Math.PI),'paint',side*1.065,-.14,z);
   arch.rotation.y=Math.PI/2;arch.rotation.z=Math.PI/2;
  }
  const exhaust=cylinder(.09,.30,'chrome',side*.72,-.17,-2.13);
  cylinder(.065,.012,'dark',side*.72,-.17,-2.285);
  box(.27,.16,.045,'tail',side*.78,.13,-2.13);
 }
 box(2.12,.12,.16,'chrome',0,-.07,2.11);box(2.12,.12,.14,'chrome',0,-.07,-2.11);
 box(1.75,.27,.07,'dark',0,.10,2.11);
 for(let i=0;i<7;i++)box(.025,.21,.025,'chrome',-.60+i*.2,.10,2.157);
 if(pickup){
  // Visible open bed: inner floor, wheel tubs, rails and recessed tailgate.
  box(1.75,.10,1.6,id===2?'wood':'dark',0,.40,-1.18);
  for(const side of [-1,1]){
   box(.17,.31,1.74,'paint',side*.96,.52,-1.18);
   box(.18,.035,1.76,'chrome',side*.96,.70,-1.18);
   box(.34,.18,.72,'paint',side*.70,.53,-1.3);
  }
  box(1.82,.34,.12,'paint',0,.53,-2.03);box(.36,.045,.035,'chrome',0,.65,-2.1);
  for(let i=0;i<7;i++)box(.022,.013,1.45,'chrome',-.68+i*.225,.463,-1.18);
  // Two distinctive cabs: stepside roll bar vs work-truck amber clearance lights.
  if(id===2){for(const side of [-1,1])box(.075,.65,.075,'chrome',side*.73,.92,-.47);box(1.5,.075,.075,'chrome',0,1.24,-.47);}
  else for(const x of [-.6,0,.6])box(.15,.07,.14,'light',x,1.23,.83);
  for(const side of [-1,1])box(.42,.22,.045,'light',side*.70,.14,2.157);
 }else{
  // Twin round headlights, long hood, bonnet scoop and coupe/fastback rear deck.
  for(const side of [-1,1])for(const x of [.58,.82]){cylinder(.125,.06,'chrome',side*x,.15,2.15);cylinder(.094,.067,'light',side*x,.15,2.16);}
  for(const side of [-1,1])box(.23,.017,1.17,'stripe',side*.34,.367,1.27);
  box(.52,.17,.65,'paint',0,.43,1.13);box(.42,.075,.022,'dark',0,.47,1.46);
  const rear=box(1.65,.10,id===1?.64:.30,'glass',0,.67,-1.34);rear.rotation.x=id===1?-.40:-.28;
  if(id===0){box(1.8,.085,.30,'paint',0,.57,-1.94);for(const x of [-.65,.65])box(.07,.19,.10,'chrome',x,.43,-1.94);}
  else for(let i=0;i<4;i++)box(1.5,.025,.055,'dark',0,.72-i*.038,-1.12-i*.13);
 }
 // Number roundels remain visible and use original graphics, never real brands.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');
 ctx.fillStyle='#e8ddc8';ctx.beginPath();ctx.arc(64,64,54,0,Math.PI*2);ctx.fill();ctx.fillStyle=p.stripe;ctx.font='bold 72px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(id+1).padStart(2,'0'),64,67);
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
 const badge=mesh(new T.PlaneGeometry(.72,.72),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false}),0,roofY+.057,cabZ-.05);badge.rotation.x=-Math.PI/2;badge.rotation.z=Math.PI;
 // Merge static details by material: richer bodywork without one draw per rivet.
 batchShell(root);
}

function batchShell(root){
 const groups=new Map();for(const m of [...root.children]){if(m.material.map)continue;let list=groups.get(m.material);if(!list)groups.set(m.material,list=[]);list.push(m);}
 for(const [material,list] of groups){const positions=[],normals=[];
  for(const m of list){m.updateMatrix();const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geo.applyMatrix4(m.matrix);positions.push(...geo.attributes.position.array);normals.push(...geo.attributes.normal.array);geo.dispose();m.geometry.dispose();root.remove(m);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geo.computeBoundingSphere();
  const mesh=new T.Mesh(geo,material);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);
 }
}
