import * as T from './vendor/three.module.js';
import { ART } from './art-config.js';
import { grungeTexture, abstractSignTexture } from './art-textures.js';
import { surfacePatch } from './art-shaders.js';

// Materials and lighting are the only mutable scene state owned by this pass.
// Original materials stay available so F9 restores the complete old appearance.
export class ArtStyle {
 constructor(view) {
  this.view = view; this.enabled = ART.enabled; this.records = new WeakMap();
  this.cache = new WeakMap(); this.time = { value: 0 };
  this.grunge = grungeTexture(); this.sign = abstractSignTexture();
  const scene = view.scene;
  this.sun = scene.children.find(o => o.isDirectionalLight);
  this.ambient = scene.children.find(o => o.isHemisphereLight);
  this.original = {
   background: scene.background.clone(), fog: scene.fog.clone(),
   exposure: view.renderer.toneMappingExposure,
   sun: this.sun.color.clone(), intensity: this.sun.intensity, position: this.sun.position.clone(),
   sky: this.ambient.color.clone(), ground: this.ambient.groundColor.clone(), ambient: this.ambient.intensity,
   shadow: { left: this.sun.shadow.camera.left, right: this.sun.shadow.camera.right,
    top: this.sun.shadow.camera.top, bottom: this.sun.shadow.camera.bottom,
    far: this.sun.shadow.camera.far, bias: this.sun.shadow.bias, normalBias: this.sun.shadow.normalBias },
  };
  this.applyLighting();
  window.addEventListener('keydown', e => {
   if (e.code !== 'F9' || e.repeat || e.target.matches('input,textarea,select')) return;
   e.preventDefault(); this.setEnabled(!this.enabled);
  });
 }
 setEnabled(enabled) { this.enabled = enabled; this.applyLighting(); this.scan(); }
 applyLighting() {
  const v = this.view, old = this.original, light = ART.lighting;
  v.scene.background.copy(this.enabled ? new T.Color(light.background) : old.background);
  v.scene.fog = this.enabled ? new T.Fog(light.background, light.fogNear, light.fogFar) : old.fog.clone();
  v.renderer.toneMappingExposure = this.enabled ? light.exposure : old.exposure;
  this.sun.color.copy(this.enabled ? new T.Color(light.sun) : old.sun);
  this.sun.intensity = this.enabled ? light.intensity : old.intensity;
  const elevation = light.elevation * Math.PI / 180;
  if (this.enabled) this.sun.position.set(-Math.cos(elevation)*light.distance*.8, Math.sin(elevation)*light.distance, Math.cos(elevation)*light.distance*.6);
  else this.sun.position.copy(old.position);
  this.ambient.color.copy(this.enabled ? new T.Color(light.sky) : old.sky);
  this.ambient.groundColor.copy(this.enabled ? new T.Color(light.ground) : old.ground);
  this.ambient.intensity = this.enabled ? light.ambient : old.ambient;
  const extent = light.shadowExtent, shadow = old.shadow;
  Object.assign(this.sun.shadow.camera, this.enabled ? {left:-extent,right:extent,top:extent,bottom:-extent,far:light.shadowFar} : {left:shadow.left,right:shadow.right,top:shadow.top,bottom:shadow.bottom,far:shadow.far});
  this.sun.shadow.bias = this.enabled ? light.shadowBias : shadow.bias;
  this.sun.shadow.normalBias = this.enabled ? light.shadowNormalBias : shadow.normalBias;
  this.sun.shadow.camera.updateProjectionMatrix();
 }
 role(object) {
  for (let node=object; node; node=node.parent) {
   if (this.view.cars.includes(node)) return 'vehicle';
   if (node.userData.artRole) return node.userData.artRole;
  }
  if (object.geometry?.type === 'ConeGeometry' && !object.castShadow) return 'rock';
  const hex=object.material?.color?.getHexString();
  if(hex==='afbd9d')return 'sand';
  if(hex==='4a7d7f')return 'rock';
  return 'building';
 }
 material(original, role, object) {
  if (!original.isMeshToonMaterial) {
   if(role==='building' && original.isMeshBasicMaterial && original.map?.isCanvasTexture) {
    const material=original.clone();material.map=this.sign;return material;
   }
   return original;
  }
  let cache = this.cache.get(original);
  if (!cache) this.cache.set(original, cache = new Map());
  if (cache.has(role)) return cache.get(role);
  const m = new T.MeshStandardMaterial({ color: original.color, map: original.map,
   side: original.side, transparent: original.transparent, opacity: original.opacity,
   depthWrite: original.depthWrite, emissive: original.emissive,
   emissiveIntensity: original.emissiveIntensity, roughness: ART.material.roughness,
   metalness: ART.material.metalness });
  const hex=original.color.getHexString(), palette=ART.palette;
  const remap={ '777e91':palette.road, 'd8ac70':palette.gravel, 'c85746':palette.kerbRed,
   'c84a49':palette.kerbRed, 'fff0cd':palette.kerbCream, 'f2d5a2':palette.kerbCream,
   '9b725f':palette.wall, 'ef916a':palette.roof, 'd49a72':palette.rock,
   'afbd9d':palette.sand, '4a7d7f':palette.rockShade };
  if (role !== 'vehicle' && remap[hex]) m.color.set(remap[hex]);
  if (role === 'rock') m.color.set(palette.rock);
  if (role === 'road') m.map=null; // Replace baked colour noise with world-space asphalt detail.
  if (hex === '3a4a52') m.roughness = ART.material.glassRoughness;
  let car=object;while(car && !this.view.cars.includes(car))car=car.parent;
  this.patch(m, role, car?.position);
  cache.set(role,m); return m;
 }
 patch(material, role, origin) {
  const rim = role==='vehicle'?ART.rim.vehicle:role==='rock'?ART.rim.nature:ART.rim.building;
  material.customProgramCacheKey = () => 'grayline-art-v1-'+role;
  material.onBeforeCompile = shader => {
   surfacePatch(shader,role,this.grunge,origin);
   shader.uniforms.artRim = {value:new T.Color(ART.rim.color)};
   shader.uniforms.artRimStrength = {value:rim};
   shader.uniforms.artRimPower = {value:ART.rim.power};
   shader.fragmentShader = 'uniform vec3 artRim; uniform float artRimStrength; uniform float artRimPower;\n'+shader.fragmentShader;
   shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>',
    'outgoingLight += artRim * artRimStrength * pow(1.0 - max(dot(normal, normalize(vViewPosition)), 0.0), artRimPower);\n#include <opaque_fragment>');
  };
 }
 scan() {
  this.view.scene.traverse(object => {
   if (!object.isMesh) return;
   let record = this.records.get(object);
   if (!record) {
    const original = object.material, role=this.role(object);
    record={original,styled:Array.isArray(original)?original.map(m=>this.material(m,role,object)):this.material(original,role,object)};
    this.records.set(object,record);
   }
   const next=this.enabled?record.styled:record.original;
   if(object.material!==next) {
    // Existing FX own opacity. Carry their current fade across an A/B switch.
    if(!Array.isArray(next)&&!Array.isArray(object.material)) next.opacity=object.material.opacity;
    object.material=next;
   }
  });
 }
 render(scene,camera) { this.time.value=performance.now()/1000; this.scan(); this.view.renderer.render(scene,camera); }
}
