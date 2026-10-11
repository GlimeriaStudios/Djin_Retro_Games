import * as T from './vendor/three.module.js';
import { ART } from './art-config.js';

// A private PRNG prevents texture generation from consuming gameplay randomness.
function random(seed) { return () => { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; }; }
function canvas(size) { const c=document.createElement('canvas'); c.width=c.height=size; return c; }
export function grungeTexture() {
 const config=ART.grunge, size=config.textureSize, rng=random(config.seed);
 const cracks=canvas(size), stains=canvas(size), a=cracks.getContext('2d'), b=stains.getContext('2d');
 a.fillStyle=b.fillStyle='#000'; a.fillRect(0,0,size,size); b.fillRect(0,0,size,size);
 // Draw wrapped copies so every crack and stain crosses tile boundaries seamlessly.
 const wrap=(ctx,draw)=>{for(const x of [-size,0,size])for(const y of [-size,0,size]){ctx.save();ctx.translate(x,y);draw();ctx.restore();}};
 a.strokeStyle='#fff'; a.lineWidth=config.crackWidth;
 for(let i=0;i<config.cracks;i++) {
  const points=[[rng()*size,rng()*size]];
  for(let j=0;j<8;j++)points.push([points[j][0]+(rng()-.5)*size*.18,points[j][1]+rng()*size*.08]);
  wrap(a,()=>{a.beginPath();points.forEach(([x,y],j)=>j?a.lineTo(x,y):a.moveTo(x,y));a.stroke();});
 }
 b.fillStyle=`rgba(255,255,255,${config.stainOpacity})`;
 for(let i=0;i<config.stains;i++) {
  const x=rng()*size,y=rng()*size,rx=size*(.015+rng()*.065),ry=rx*(.4+rng());
  const outline=Array.from({length:16},(_,j)=>{const angle=j/16*Math.PI*2,radius=.55+rng()*.45;return [x+Math.cos(angle)*rx*radius,y+Math.sin(angle)*ry*radius];});
  wrap(b,()=>{b.beginPath();outline.forEach(([px,py],j)=>j?b.lineTo(px,py):b.moveTo(px,py));b.closePath();b.fill();});
 }
 const crack=a.getImageData(0,0,size,size).data, stain=b.getImageData(0,0,size,size).data;
 const grids=[4,8,16,32].map(n=>({n,data:Float32Array.from({length:n*n},rng)}));
 const data=new Uint8Array(size*size*4);
 const smooth=t=>t*t*(3-2*t);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
  let noise=0,weight=0;
  grids.forEach(({n,data},octave)=>{
   const px=x/size*n,py=y/size*n,ix=Math.floor(px),iy=Math.floor(py),fx=smooth(px-ix),fy=smooth(py-iy);
   const at=(a,b)=>data[(b%n)*n+a%n],lerp=(a,b,t)=>a+(b-a)*t,w=1/2**octave;
   noise+=lerp(lerp(at(ix,iy),at(ix+1,iy),fx),lerp(at(ix,iy+1),at(ix+1,iy+1),fx),fy)*w;weight+=w;
  });
  const i=(y*size+x)*4;data[i]=Math.round(noise/weight*255);data[i+1]=crack[i];data[i+2]=stain[i];data[i+3]=255;
 }
 const texture=new T.DataTexture(data,size,size,T.RGBAFormat);
 texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.magFilter=T.LinearFilter;
 texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
 return texture;
}

export function abstractSignTexture() {
 const c=canvas(256),ctx=c.getContext('2d'),s=ART.signage;
 ctx.fillStyle=s.paper;ctx.fillRect(0,0,256,256);ctx.strokeStyle=s.ink;ctx.lineWidth=6;
 ctx.strokeRect(s.border,s.border,256-2*s.border,256-2*s.border);
 ctx.fillStyle=s.accent;
 for(let i=0;i<s.stripes;i++){ctx.beginPath();ctx.moveTo(35+i*37,62);ctx.lineTo(53+i*37,62);ctx.lineTo(24+i*37,174);ctx.lineTo(6+i*37,174);ctx.fill();}
 const rng=random(ART.grunge.seed);ctx.fillStyle=s.paper;ctx.globalAlpha=.55;
 for(let i=0;i<ART.grunge.scratchDensity;i++)ctx.fillRect(rng()*256,rng()*256,1+rng()*12,1);
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;return map;
}
