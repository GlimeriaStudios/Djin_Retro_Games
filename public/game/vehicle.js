// Reference-matched arcade dynamics from the supplied grayline-3d.html.
export const VEHICLE={mass:1150,yawInertia:1550,wheelbase:2.6,frontAxle:1.25,rearAxle:1.35,track:1.65,cgHeight:.52,gravity:9.81};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function integrateVehicle(c,input,dt,tuning){
 if(!(dt>0))return;
 const steps=Math.max(1,Math.ceil(dt/(1/120))),h=dt/steps;
 const throttle=clamp(Number(input.throttle)||0,-1,1),target=clamp(Number(input.steer)||0,-1,1);
 const gripScale=clamp(tuning.grip/7.2,.5,1.5),powerScale=tuning.power/19;
 for(let tick=0;tick<steps;tick++){
  const sin=Math.sin(c.a),cos=Math.cos(c.a);
  let forward=c.vx*sin+c.vz*cos,side=c.vx*cos-c.vz*sin;
  const prevForward=forward,prevSide=side;
  c.steer=(c.steer||0)+(target-(c.steer||0))*Math.min(1,h*(target===0?7:4.5));
  c.impactTime=Math.max(0,(c.impactTime||0)-h);
  let thrust=0,braking=0;
  if(throttle>0){if(forward<-.5)braking=24*throttle;else thrust=14*powerScale*throttle*Math.max(0,1-(forward/62)**2)*(c.boost>0?1.5:1);}
  if(throttle<0){if(forward>.5)braking=24*-throttle;else thrust=6*powerScale*throttle*Math.max(0,1+forward/12);}
  if(input.brake){braking=Math.max(braking,24);thrust=0;}
  forward+=thrust*h;
  const resistance=(.4+.0035*forward*forward+braking+Math.abs(side)*.9)*h;
  forward=Math.abs(forward)<=resistance?0:forward-Math.sign(forward)*resistance;
  const grip=(c.oil>0?2.5:12)*gripScale,maxLat=(c.oil>0?6:28)*gripScale;
  const lateralDelta=Math.min(Math.abs(side)*grip,maxLat)*h;
  side=Math.abs(side)<=lateralDelta?0:side-Math.sign(side)*lateralDelta;
  const speed=Math.abs(forward),yaw=c.steer*tuning.steering*clamp(speed/6,0,1)/(1+(speed/30)**2*.7)*Math.sign(forward);
  const catchRate=c.impactTime>0?1.6:c.oil>0?3.5:6;
  c.omega+=(yaw-c.omega)*Math.min(1,h*catchRate);c.a+=c.omega*h;
  c.vx=sin*forward+cos*side;c.vz=cos*forward-sin*side;
  c.x+=c.vx*h;c.z+=c.vz*h;
  c.longitudinalAccel=(c.longitudinalAccel||0)+((forward-prevForward)/h-(c.longitudinalAccel||0))*Math.min(1,h*6);
  c.lateralAccel=(side-prevSide)/h;c.slip=Math.abs(side);c.tireUsage=clamp(Math.abs(prevSide)*grip/maxLat,0,1);
  // Visual load estimate; this arcade model does not solve individual tire forces.
  c.frontLoad=clamp(VEHICLE.rearAxle/VEHICLE.wheelbase-c.longitudinalAccel*VEHICLE.cgHeight/(VEHICLE.gravity*VEHICLE.wheelbase),.18,.82);c.rearLoad=1-c.frontLoad;
  c.steeringAngle=c.steer*.45;
 }
 c.inputSeq=input.seq||0;
}
