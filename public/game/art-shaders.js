import * as T from './vendor/three.module.js';
import { ART } from './art-config.js';

export function surfacePatch(shader,role,texture,origin) {
 const vehicle=role==='vehicle', natural=['rock','sand','water','foliage'].includes(role);
 const grunge=ART.grunge, p=ART.palette;
 Object.assign(shader.uniforms,{
  artNoise:{value:texture},artOrigin:{value:origin||new T.Vector3()},
  artScale:{value:grunge.scale},artIntensity:{value:grunge.enabled&&!natural?(vehicle?grunge.vehicle:role==='road'?grunge.road:grunge.building):0},
  artRust:{value:new T.Color(p.rust)},artRustLight:{value:new T.Color(p.rustLight)},
  artMud:{value:new T.Color(p.mud)},artDust:{value:new T.Color(p.dust)},artMetal:{value:new T.Color(p.bareMetal)},
  artRustThreshold:{value:grunge.rustThreshold},artRustStrength:{value:grunge.rustStrength},
  artDustStrength:{value:grunge.dust},artMudStrength:{value:grunge.mud},
  artRoofProtection:{value:vehicle?grunge.roofProtection:0},artEdgeWear:{value:grunge.edgeWear},
  artMudHeight:{value:grunge.mudHeight},artDustThreshold:{value:grunge.dustThreshold},
  artRoadTile:{value:grunge.roadTileMetres},artFill:{value:ART.material.diffuseFill},
 });
 const varying='varying vec3 vArtWorld; varying vec3 vArtNormal; varying vec3 vArtLocal;';
 shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n'+varying);
 shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
  vec4 artPosition=vec4(transformed,1.0);
  #ifdef USE_INSTANCING
   artPosition=instanceMatrix*artPosition;
  #endif
  vArtWorld=(modelMatrix*artPosition).xyz;
  vArtNormal=inverseTransformDirection(transformedNormal,viewMatrix);
  vArtLocal=transformed;
 `);
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
  ${varying}
  uniform sampler2D artNoise;
  uniform vec3 artOrigin, artRust, artRustLight, artMud, artDust, artMetal;
  uniform float artScale, artIntensity, artRustThreshold, artRustStrength, artDustStrength;
  uniform float artMudStrength, artRoofProtection, artEdgeWear, artMudHeight, artDustThreshold, artRoadTile, artFill;
 `);
 // Triplanar noise has no UV dependency, including on the existing instanced walls.
 const sample=`
  vec3 artN=normalize(vArtNormal), artWeights=pow(abs(artN),vec3(4.0));
  artWeights/=max(dot(artWeights,vec3(1.0)),0.001);
  vec3 artP=${vehicle?'vArtLocal':'vArtWorld'}*artScale;
  vec3 artGrain=texture2D(artNoise,artP.yz*.19).rgb*artWeights.x
    +texture2D(artNoise,artP.xz*.19).rgb*artWeights.y
    +texture2D(artNoise,artP.xy*.19).rgb*artWeights.z;
  float artUp=smoothstep(artDustThreshold,1.0,artN.y);
  float artWear=artIntensity*(1.0-artUp*artRoofProtection);
  float artRustMask=smoothstep(artRustThreshold,artRustThreshold+.12,artGrain.r)*artRustStrength;
  float artLow=1.0-smoothstep(0.0,artMudHeight,vArtWorld.y-artOrigin.y);
  diffuseColor.rgb=mix(diffuseColor.rgb,mix(artRust,artRustLight,artGrain.r),artRustMask*artWear);
  diffuseColor.rgb=mix(diffuseColor.rgb,artMud,artLow*artMudStrength*artWear*(.5+artGrain.r));
  diffuseColor.rgb=mix(diffuseColor.rgb,artDust,artUp*artDustStrength*artWear*artGrain.r);
  diffuseColor.rgb=mix(diffuseColor.rgb,artMetal,artGrain.g*artEdgeWear*artWear);
  diffuseColor.rgb*=1.0-artGrain.b*artWear*.45;
 `;
 const road=role==='road'?`
  vec3 artAsphalt=texture2D(artNoise,vArtWorld.xz/artRoadTile).rgb;
  diffuseColor.rgb*=1.0-artAsphalt.g*artIntensity*.72-artAsphalt.b*artIntensity*.55;
  diffuseColor.rgb*=.91+artAsphalt.r*.18;
 `:'';
 shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+sample+road);
 // A restrained painterly fill preserves readable coloured surfaces in violet shade.
 shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','outgoingLight += diffuseColor.rgb * artFill;\n#include <opaque_fragment>');
}
