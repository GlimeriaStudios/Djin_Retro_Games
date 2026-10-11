const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const radians=Math.PI/180;
// Project gravity onto the screen's horizontal axis so left/right work in both
// landscape directions as well as portrait. Alpha (compass heading) is irrelevant.
export function screenRoll(beta,gamma,screenAngle=0){
 if(!Number.isFinite(beta)||!Number.isFinite(gamma))return null;
 const b=beta*radians,g=gamma*radians,a=screenAngle*radians;
 const right=Math.cos(b)*Math.sin(g)*Math.cos(a)+Math.sin(b)*Math.sin(a);
 return Math.atan2(right,Math.cos(b)*Math.cos(g))/radians;
}
export function tiltInput(angle,center){
 const delta=Math.atan2(Math.sin((angle-center)*radians),Math.cos((angle-center)*radians))/radians;
 // Three degrees absorb hand tremor; 28 degrees reaches full steering.
 // The vehicle uses positive for left, opposite the screen's rightward roll.
 if(Math.abs(delta)<=3)return 0;
 return -Math.sign(delta)*clamp((Math.abs(delta)-3)/25,0,1);
}
export class TiltSteering{
 constructor(win,onStatus=()=>{}){
  this.win=win;this.onStatus=onStatus;this.enabled=false;this.pending=false;this.generation=0;
  this.listener=e=>this.receive(e);this.rotation=()=>this.calibrate();this.lastSample=0;this.value=0;this.lastAt=-Infinity;
 }
 now(){return this.win.performance.now();}
 status(text){this.onStatus({enabled:this.enabled,pending:this.pending,text});}
 async enable(){
  if(this.enabled||this.pending)return;
  const api=this.win.DeviceOrientationEvent;
  if(!this.win.isSecureContext||!api){this.status('Tilt unavailable here. Use the steering buttons.');return;}
  this.pending=true;this.status('Allow motion access to steer.');const generation=++this.generation;
  try{
   // Safari requires this call directly inside the player's button gesture.
   const permission=typeof api.requestPermission==='function'?await api.requestPermission():'granted';
   if(generation!==this.generation)return;
   this.pending=false;
   if(permission!=='granted'){this.status('Motion access denied. Use the steering buttons.');return;}
   this.enabled=true;this.win.addEventListener('deviceorientation',this.listener);
   this.win.screen?.orientation?.addEventListener('change',this.rotation);this.win.addEventListener('orientationchange',this.rotation);
   this.calibrate();
  }catch{if(generation===this.generation){this.pending=false;this.status('Could not enable motion. Use the steering buttons.');}}
 }
 calibrate(){
  this.value=0;this.center=null;this.target=0;this.lastAt=-Infinity;this.calibrationStart=null;this.sinSum=0;this.cosSum=0;this.count=0;this.lost=false;
  this.win.clearTimeout(this.timeout);
  if(!this.enabled)return;
  this.status('Hold your phone steady to center.');
  // A desktop or sensor-blocking browser may expose the API but send no events.
  this.timeout=this.win.setTimeout(()=>{if(this.center===null)this.disable('No motion signal. Use the steering buttons.');},4000);
 }
 receive(event){
  if(!this.enabled||this.win.document.hidden)return;
  const now=this.now(),angle=screenRoll(event.beta,event.gamma,this.win.screen?.orientation?.angle??this.win.orientation??0);
  if(angle===null)return;
  if(this.lost)this.calibrate();
  this.lastAt=now;
  if(this.center===null){
   this.calibrationStart??=now;this.sinSum+=Math.sin(angle*radians);this.cosSum+=Math.cos(angle*radians);this.count++;
   // Average 350 ms of sensor readings to avoid calibrating from a tap-induced jolt.
   if(now-this.calibrationStart<350||this.count<3)return;
   this.center=Math.atan2(this.sinSum,this.cosSum)/radians;this.win.clearTimeout(this.timeout);
   this.status('Tilt left / right. Hold GAS to drive.');
  }
  this.target=tiltInput(angle,this.center);
 }
 sample(){
  const now=this.now(),dt=clamp((now-this.lastSample)/1000,0,.05);this.lastSample=now;
  if(!this.enabled||this.center===null||this.win.document.hidden)return this.value=0;
  // Stop stale steering within half a second if the OS pauses sensor delivery.
  if(now-this.lastAt>500){if(!this.lost){this.lost=true;this.status('Motion paused. Use buttons or hold steady.');}return this.value=0;}
  // 80 ms time constant smooths sensor noise without a sluggish steering response.
  this.value+=(this.target-this.value)*(1-Math.exp(-dt/.08));return this.value;
 }
 disable(message='Tap TILT to steer with your phone.'){
  this.generation++;this.pending=false;this.enabled=false;this.value=0;this.win.clearTimeout(this.timeout);
  this.win.removeEventListener('deviceorientation',this.listener);this.win.screen?.orientation?.removeEventListener('change',this.rotation);this.win.removeEventListener('orientationchange',this.rotation);this.status(message);
 }
}
