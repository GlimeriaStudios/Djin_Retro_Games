import * as T from './vendor/three.module.js';
import { ART } from './art-config.js';

// Shore bands are rasterized once from the existing track. They never alter it.
export function shorelineTexture(track) {
 const n=ART.nature, size=n.shoreTextureSize, scale=size/n.worldSize;
 const layers=[0,n.foamWidth,n.shoreRadius].map(expand=>{
  const c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d');
  ctx.fillStyle='#000';ctx.fillRect(0,0,size,size);ctx.fillStyle=ctx.strokeStyle='#fff';
  ctx.translate(size/2,size/2);ctx.scale(scale,scale);ctx.lineCap='round';ctx.lineJoin='round';
  // Roads are raised piers: proximity tint below them is decorative reflected light.
  for(const [x,z] of n.islands){ctx.beginPath();ctx.arc(x,z,n.islandRadius+expand,0,Math.PI*2);ctx.fill();}
  for(const p of track.config.props)ctx.fillRect(p.x-p.w/2-expand,p.z-p.d/2-expand,p.w+2*expand,p.d+2*expand);
  return ctx.getImageData(0,0,size,size).data;
 });
 const pixels=new Uint8Array(size*size*4);
 for(let i=0;i<pixels.length;i+=4){pixels[i]=layers[0][i];pixels[i+1]=layers[1][i];pixels[i+2]=layers[2][i];pixels[i+3]=255;}
 const map=new T.DataTexture(pixels,size,size);map.magFilter=map.minFilter=T.LinearFilter;map.needsUpdate=true;return map;
}

export function islandPalms() {
 const n=ART.nature,p=ART.palette,group=new T.Group();group.visible=n.palms;
 const count=n.islands.length*n.palmOffsets.length;
 const trunks=new T.InstancedMesh(new T.CylinderGeometry(n.trunkRadius*.72,n.trunkRadius,1,7),new T.MeshToonMaterial({color:p.trunk}),count);
 const leaves=new T.InstancedMesh(new T.SphereGeometry(1,8,5),new T.MeshToonMaterial({color:p.foliage}),count*n.leaves);
 trunks.userData.artRole='trunk';leaves.userData.artRole='foliage';
 const dummy=new T.Object3D();let index=0;
 for(const [x,z] of n.islands)for(const [dx,dz]of n.palmOffsets) {
  const height=n.palmHeight*(index%2?.9:1);
  dummy.position.set(x+dx,n.baseY+height/2,z+dz);dummy.rotation.set(0,0,dx>0?-.08:.08);dummy.scale.set(1,height,1);dummy.updateMatrix();trunks.setMatrixAt(index,dummy.matrix);
  for(let leaf=0;leaf<n.leaves;leaf++){
   const a=leaf/n.leaves*Math.PI*2+index;
   dummy.position.set(x+dx+Math.sin(a)*n.leafLength*.55,n.baseY+height,z+dz+Math.cos(a)*n.leafLength*.55);
   dummy.rotation.set(n.crownDrop,a,0,'YXZ');dummy.scale.set(n.leafWidth,n.leafThickness,n.leafLength);dummy.updateMatrix();leaves.setMatrixAt(index*n.leaves+leaf,dummy.matrix);
  }
  index++;
 }
 for(const mesh of [trunks,leaves]){mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);}
 return group;
}

export function naturePatch(shader,role,time,shore) {
 const n=ART.nature,p=ART.palette;
 Object.assign(shader.uniforms,{
  artTime:time,artShore:shore,artWorldSize:{value:n.worldSize},artShallow:{value:new T.Color(p.shallow)},artDeep:{value:new T.Color(p.deep)},
  artFoam:{value:new T.Color(p.foam)},artLeafLight:{value:new T.Color(p.leafLight)},artRockShade:{value:new T.Color(p.rockShade)},
  artWaveSpeed:{value:n.waveSpeed},artWaterScale:{value:n.waterScale},artGlint:{value:n.glint},
  artFoamStrength:{value:n.foamStrength},artGradient:{value:n.gradient},artLeafWrap:{value:n.leafWrap},
 });
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
 uniform float artTime,artWorldSize,artWaveSpeed,artWaterScale,artGlint,artFoamStrength,artGradient,artLeafWrap;
 uniform sampler2D artShore;
 uniform vec3 artShallow,artDeep,artFoam,artLeafLight,artRockShade;
 float artHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 `);
 if(role==='water') {
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
   vec2 artWaterUv=vArtWorld.xz/artWorldSize+.5;
   vec3 artShoreBands=texture2D(artShore,artWaterUv).rgb;
   float artWave=sin(vArtWorld.x*artWaterScale+sin(vArtWorld.z*artWaterScale)+artTime*artWaveSpeed)*.5+.5;
   float artNear=mix(.18,.85,artShoreBands.b);
   vec3 artWater=mix(artDeep,artShallow,artNear+artWave*.12);
   vec2 artCell=vArtWorld.xz*2.0+vec2(artTime*artWaveSpeed,0.0);
   float artGlitter=step(.985,artHash(floor(artCell)))*pow(artWave,5.0);
   float artSunward=.35+.65*max(dot(normalize(cameraPosition-vArtWorld),normalize(vec3(-.8,.26,.6))),0.0);
   float artFoamLine=max(0.0,artShoreBands.g-artShoreBands.r)*(.65+.35*artWave);
   outgoingLight=artWater+artFoam*artGlitter*artGlint*artSunward+artFoam*artFoamLine*artFoamStrength;
   #include <opaque_fragment>
  `);
 } else if(role==='foliage') {
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
   outgoingLight=mix(outgoingLight,outgoingLight+artLeafLight,artGradient*max(vArtNormal.y,0.0));
   outgoingLight+=artLeafLight*artLeafWrap*pow(1.0-abs(dot(normal,normalize(vViewPosition))),2.0);
   #include <opaque_fragment>
  `);
 } else if(role==='rock'||role==='sand') {
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
   outgoingLight=mix(outgoingLight,artRockShade,(1.0-max(vArtNormal.y,0.0))*artGradient);
   #include <opaque_fragment>
  `);
 }
}
