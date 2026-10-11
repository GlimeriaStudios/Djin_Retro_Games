const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
// Anticipate the authored road without replacing the player's chase target.
export function roadCamera(state,track,car,yaw,zoom,dt,reset=false){
 const near=track.nearest(car.x,car.z),speed=Math.hypot(car.vx,car.vz);
 const direction=Math.sin(car.a)*near.tx+Math.cos(car.a)*near.tz>=0?1:-1;
 const ahead=track.at(near.s+direction*(8+Math.min(speed,42)*.35));
 const roadYaw=ahead.angle+(direction<0?Math.PI:0);
 const bend=clamp(angle(roadYaw-yaw)*.32,-.26,.26);
 const grade=Math.atan(((near.slope||0)*.65+(ahead.slope||0)*.35)*direction);
 const pitch=clamp(.73+grade*.8-zoom*.012,.39,.96);
 if(!state||reset)state={pitch,turn:0};
 const ease=1-Math.exp(-Math.max(0,dt)*2.4);
 state.pitch+=(pitch-state.pitch)*ease;state.turn+=(bend-state.turn)*ease;
 return state;
}
