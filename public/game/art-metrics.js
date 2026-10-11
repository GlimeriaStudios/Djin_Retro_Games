// Opt-in diagnostic observer (?art-stats). Reads render timing and lens state;
// never drives a car, changes time, moves a camera or writes to game state.
export class ArtMetrics {
 constructor(view) {
  this.view=view;this.active=new URLSearchParams(location.search).has('art-stats');
  this.frames=[];this.costs=[];this.last=0;this.started=0;this.mode=null;
 }
 begin(enabled) {
  if(!this.active)return;
  const now=performance.now();
  if(this.mode!==enabled){this.mode=enabled;this.frames=[];this.costs=[];this.last=0;this.started=now;}
  // Ignore tab suspension and the first two seconds of shader warmup.
  if(this.last&&now-this.last<250&&now-this.started>2000)this.frames.push(now-this.last);
  this.last=now;this.beginTime=now;
 }
 end() {
  if(!this.active)return;
  this.costs.push(performance.now()-this.beginTime);
  if(this.frames.length<300)return;
  const sorted=[...this.frames].sort((a,b)=>a-b),costs=[...this.costs].sort((a,b)=>a-b);
  const mean=this.frames.reduce((a,b)=>a+b,0)/this.frames.length;
  console.info('ART_METRICS '+JSON.stringify({look:this.mode?'coastal':'original',mode:this.view.mode,
   frames:this.frames.length,meanFps:Number((1000/mean).toFixed(2)),medianFrameMs:Number(sorted[Math.floor(sorted.length/2)].toFixed(2)),
   p95FrameMs:Number(sorted[Math.floor(sorted.length*.95)].toFixed(2)),cpuRenderMedianMs:Number(costs[Math.floor(costs.length/2)].toFixed(2)),
   viewport:[innerWidth,innerHeight],pixelRatio:this.view.renderer.getPixelRatio(),fov:Number(this.view.camera.fov.toFixed(3)),
   automaticZoom:Number((this.view.zoom?.amount||0).toFixed(3))}));
  this.frames=[];this.costs=[];
 }
}
