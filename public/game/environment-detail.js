import * as T from './vendor/three.module.js';
import {toon} from './art.js';
import {ART} from './art-config.js';

// Decoration attaches to existing foundations and facades, never road/collision data.
// Boxes share four instanced draws; positions and dimensions below are in metres.
export function environmentDetails(track){
 const root=new T.Group(),p=ART.palette,groups=new Map(),dummy=new T.Object3D();
 const colors={metal:p.steel,shade:ART.vehicleDetail.glass,cream:p.kerbCream,coral:p.kerbRed};
 const add=(kind,x,y,z,w,h,d,rotation=0)=>{let items=groups.get(kind);if(!items)groups.set(kind,items=[]);items.push({x,y,z,w,h,d,rotation});};
 for(const [i,b]of track.config.props.entries()){
  const face=b.z+b.d/2+.035,windows=Math.max(2,Math.min(6,Math.floor(b.w/4)));
  for(let j=0;j<windows;j++){
   const x=b.x+(j-(windows-1)/2)*(b.w/(windows+1)),y=Math.max(2,b.h*.48);
   add('shade',x,y,face,1.65,1.8,.08);
   add('cream',x,y-.94,face+.07,1.90,.13,.22);
   for(const side of [-1,1])add('cream',x+side*.87,y,face+.07,.08,1.95,.12);
   // Alternating fabric panels read as faded resort awnings from the normal camera.
   for(let stripe=0;stripe<4;stripe++)add(stripe%2?'cream':'coral',x-.72+stripe*.48,y+1.03,face+.50,.48,.10,1.05);
  }
  for(const side of [-1,1]){
   const x=b.x+side*b.w*.43;
   add('metal',x,b.h*.48,face+.12,.10,b.h*.88,.10);
   add('metal',x,b.h-.2,face-.1,.32,.12,.6);
  }
  // Roof service equipment: plinths, fan housings and ventilation slats.
  const roof=b.h+.65,x=b.x-b.w*.22,z=b.z-b.d*.20;
  add('metal',x,roof,z,2.8,.65,2.1);add('shade',x,roof+.36,z,2.2,.06,1.5);
  for(let j=0;j<6;j++)add('cream',x-.92+j*.37,roof+.40,z,.08,.06,1.45);
  add('coral',b.x+b.w*.24,.48,b.z+b.d/2+1.7,.20,.8,.20);
  add('metal',b.x+b.w*.24,.9,b.z+b.d/2+1.7,.55,.13,.45);
  // Ladder on the building's existing foundation edge; decorative only.
  const lx=b.x-b.w*.3,lz=b.z+(b.d+5)/2+.12;
  for(const side of [-1,1])add('metal',lx+side*.42,-2,lz,.08,3.3,.10);
  for(let j=0;j<7;j++)add('cream',lx,-.55-j*.43,lz,.9,.07,.09);
 }
 for(const [kind,items]of groups){
  const batch=new T.InstancedMesh(new T.BoxGeometry(1,1,1),toon(colors[kind]),items.length);
  items.forEach((b,i)=>{dummy.position.set(b.x,b.y,b.z);dummy.scale.set(b.w,b.h,b.d);dummy.rotation.set(0,b.rotation,0);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);});
  batch.castShadow=batch.receiveShadow=true;batch.computeBoundingSphere();root.add(batch);
 }
 return root;
}
