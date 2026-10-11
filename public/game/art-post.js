import * as T from './vendor/three.module.js';
import { ART } from './art-config.js';

// One HDR render target and one full-screen pass; DOM HUD never enters this path.
// No camera settings or matrices are changed. Focus is only a screen-space mask.
export class ArtPost {
 constructor(renderer) {
  this.renderer=renderer;this.size=new T.Vector2();this.projected=new T.Vector3();
  this.target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true,samples:renderer.capabilities.isWebGL2?ART.post.samples:0});
  this.uniforms={ sceneColor:{value:this.target.texture},texel:{value:new T.Vector2(1,1)},
   focus:{value:new T.Vector2(0,1)},time:{value:0} };
  for(const key of ['bloom','threshold','blur','contrast','saturation','warm','shadowTint','grain','grainFps','vignette','bloomRadius','blurRadius'])this.uniforms[key]={value:ART.post[key]};
  this.material=new T.ShaderMaterial({uniforms:this.uniforms,depthTest:false,depthWrite:false,
   vertexShader:'varying vec2 uvScreen;void main(){uvScreen=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
   fragmentShader:`
    varying vec2 uvScreen;
    uniform sampler2D sceneColor;
    uniform vec2 texel,focus;
    uniform float time,bloom,threshold,blur,contrast,saturation,warm,shadowTint,grain,grainFps,vignette,bloomRadius,blurRadius;
    float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
    void main(){
     vec3 color=texture2D(sceneColor,uvScreen).rgb;
     vec3 light=vec3(0.0),soft=vec3(0.0);
     for(int i=0;i<4;i++){
      vec2 direction=i==0?vec2(-1.0,0.0):i==1?vec2(1.0,0.0):i==2?vec2(0.0,-1.0):vec2(0.0,1.0);
      light+=max(texture2D(sceneColor,uvScreen+direction*texel*bloomRadius).rgb-vec3(threshold),0.0);
      soft+=texture2D(sceneColor,uvScreen+direction*texel*blurRadius).rgb;
     }
     color+=light*bloom*.25;
     float outside=max(focus.x-uvScreen.y,uvScreen.y-focus.y);
     color=mix(color,soft*.25,clamp(outside*4.0,0.0,1.0)*blur);
     gl_FragColor=vec4(color,1.0);
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
     color=gl_FragColor.rgb;
     float luma=dot(color,vec3(.2126,.7152,.0722));
     float chroma=max(color.r,max(color.g,color.b))-min(color.r,min(color.g,color.b));
     color=mix(vec3(luma),color,mix(saturation,1.0,smoothstep(.1,.35,chroma)));
     color+=(vec3(1.0,.38,-.2)*warm)*smoothstep(.45,1.0,luma);
     color+=vec3(-.3,.12,.5)*shadowTint*(1.0-smoothstep(.05,.55,luma));
     color=(color-.5)*contrast+.5;
     vec2 edge=uvScreen*2.0-1.0;
     color*=1.0-vignette*smoothstep(.35,1.5,dot(edge,edge));
     color+=(hash(gl_FragCoord.xy+floor(time*grainFps))- .5)*grain;
     gl_FragColor=vec4(clamp(color,0.0,1.0),1.0);
    }`});
  this.scene=new T.Scene();this.camera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  this.scene.add(new T.Mesh(new T.PlaneGeometry(2,2),this.material));
 }
 render(scene,camera,cars) {
  const r=this.renderer;r.getDrawingBufferSize(this.size);
  if(this.target.width!==this.size.x||this.target.height!==this.size.y){this.target.setSize(this.size.x,this.size.y);this.uniforms.texel.value.set(1/this.size.x,1/this.size.y);}
  let low=1,high=0;
  for(const car of cars)if(car.visible){car.getWorldPosition(this.projected);this.projected.project(camera);
   if(this.projected.z>=-1&&this.projected.z<=1&&Math.abs(this.projected.x)<1.2){const y=this.projected.y*.5+.5;low=Math.min(low,y-ART.post.focusPadding);high=Math.max(high,y+ART.post.focusPadding);}}
  // An uncertain/offscreen racer disables blur, so focus never guesses a new framing.
  this.uniforms.focus.value.set(low<high?low:0,low<high?high:1);
  this.uniforms.time.value=performance.now()/1000;
  const previous=r.getRenderTarget();r.setRenderTarget(this.target);r.render(scene,camera);
  r.setRenderTarget(previous);r.render(this.scene,this.camera);
 }
}
