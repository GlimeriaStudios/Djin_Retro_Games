// Room-scoped audio mesh. Each participant connects directly to the other three.
// Joining is listen-only; microphone capture happens only after an explicit click.
export class VoiceChat {
 constructor(slot,onChange=()=>{},iceServers=[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]){this.iceServers=iceServers;this.slot=slot;this.onChange=onChange;this.id=crypto.randomUUID();this.links=new Map();this.signals={};this.stream=null;this.closed=false;this.busy=false;this.error='';this.blocked=false;this.muted=new Set();}
 get payload(){return this.closed?{}:{id:this.id,mic:!!this.stream,signals:this.signals};}
 async microphone(){
  if(this.busy||this.closed)return;
  if(this.stream){this.stopMic();return;}
  this.busy=true;this.error='';this.onChange();
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw new Error('Microphone needs HTTPS and a supported browser.');
   const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
   if(this.closed){stream.getTracks().forEach(t=>t.stop());return;}
   this.stream=stream;const track=stream.getAudioTracks()[0];track.onended=()=>{this.stopMic();this.error='Microphone disconnected. Enable it again to retry.';this.onChange();};
   await Promise.all([...this.links.values()].map(l=>l.sender?.replaceTrack(track)));
  }catch(e){this.stopMic();this.error=e.name==='NotAllowedError'?'Microphone permission denied. Allow it in browser settings, then retry.':e.name==='NotFoundError'?'No microphone found. Connect one and retry.':e.message||'Microphone could not start.';}
  finally{this.busy=false;this.onChange();}
 }
 stopMic(){const stream=this.stream;this.stream=null;for(const t of stream?.getTracks()||[]){t.onended=null;t.stop();}for(const l of this.links.values())l.sender?.replaceTrack(null).catch(()=>{});this.onChange();}
 async gathered(pc){if(pc.iceGatheringState==='complete')return;await new Promise(resolve=>{const timer=setTimeout(done,4000);function done(){clearTimeout(timer);pc.removeEventListener('icegatheringstatechange',check);resolve();}function check(){if(pc.iceGatheringState==='complete')done();}pc.addEventListener('icegatheringstatechange',check);});}
 drop(slot){const l=this.links.get(slot);if(l){l.pc.close();l.audio.pause();l.audio.srcObject=null;l.audio.remove();}this.links.delete(slot);delete this.signals[slot];}
 create(slot,peerId,id){
  const pc=new RTCPeerConnection({iceServers:this.iceServers});
  const audio=document.createElement('audio');audio.autoplay=true;audio.setAttribute('playsinline','');audio.muted=this.muted.has(slot);document.body.append(audio);
  const l={pc,audio,peerId,id,sender:null,busy:true,started:Date.now()};this.links.set(slot,l);
  pc.ontrack=e=>{audio.srcObject=new MediaStream([e.track]);audio.play().catch(()=>{this.blocked=true;this.onChange();});};
  pc.onconnectionstatechange=()=>this.onChange();return l;
 }
 async offer(slot,peerId){const l=this.create(slot,peerId,crypto.randomUUID());try{l.sender=l.pc.addTransceiver('audio',{direction:'sendrecv'}).sender;if(this.stream)await l.sender.replaceTrack(this.stream.getAudioTracks()[0]);await l.pc.setLocalDescription(await l.pc.createOffer());await this.gathered(l.pc);if(this.closed||this.links.get(slot)!==l)return;this.signals[slot]={id:l.id,to:peerId,sdp:l.pc.localDescription.toJSON()};}catch{this.error='Voice connection failed. Leave voice and rejoin to retry.';}finally{l.busy=false;this.onChange();}}
 async answer(slot,peerId,signal){this.drop(slot);const l=this.create(slot,peerId,signal.id);try{await l.pc.setRemoteDescription(signal.sdp);const transceiver=l.pc.getTransceivers().find(t=>t.receiver.track.kind==='audio');if(!transceiver)throw Error('Missing audio');transceiver.direction='sendrecv';l.sender=transceiver.sender;if(this.stream)await l.sender.replaceTrack(this.stream.getAudioTracks()[0]);await l.pc.setLocalDescription(await l.pc.createAnswer());await this.gathered(l.pc);if(this.closed||this.links.get(slot)!==l)return;this.signals[slot]={id:l.id,to:peerId,sdp:l.pc.localDescription.toJSON()};}catch{this.error='Voice connection failed. Leave voice and rejoin to retry.';}finally{l.busy=false;this.onChange();}}
 update(players){
  if(this.closed)return;
  const peers=players.filter(p=>p.slot!==this.slot&&p.voice?.id);
  for(const [slot,l]of this.links)if(!peers.some(p=>p.slot===slot&&p.voice.id===l.peerId))this.drop(slot);
  for(const p of peers){const slot=p.slot,v=p.voice,s=v.signal;let l=this.links.get(slot);
   if(this.slot<slot){if(l&&!l.busy&&(l.pc.connectionState==='failed'||(l.pc.connectionState!=='connected'&&Date.now()-l.started>20000))){this.drop(slot);l=null;}if(!l)this.offer(slot,v.id);else if(s?.to===this.id&&s.id===l.id&&s.sdp?.type==='answer'&&!l.pc.remoteDescription&&!l.applying){l.applying=true;l.pc.setRemoteDescription(s.sdp).catch(()=>{l.applying=false;});}}
   else if(s?.to===this.id&&s.sdp?.type==='offer'&&s.id!==l?.id)this.answer(slot,v.id,s);
  }
  this.onChange();
 }
 mute(slot){if(this.muted.has(slot))this.muted.delete(slot);else this.muted.add(slot);const l=this.links.get(slot);if(l)l.audio.muted=this.muted.has(slot);this.onChange();}
 async resume(){this.blocked=false;await Promise.all([...this.links.values()].map(l=>l.audio.play().catch(()=>{this.blocked=true;})));this.onChange();}
 close(){this.closed=true;this.stopMic();for(const slot of [...this.links.keys()])this.drop(slot);this.signals={};this.onChange();}
}
