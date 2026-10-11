// Reference-matched arcade dynamics from the supplied grayline-3d.html.
export const VEHICLE={mass:1150,yawInertia:1550,wheelbase:2.6,frontAxle:1.25,rearAxle:1.35,track:1.65,cgHeight:.52,gravity:9.81};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Arcade drift tuning: m/s entry/exit thresholds, seconds to engage/recover,
// s^-1 lateral damping, and m/s² tire-force limit. Hysteresis avoids chatter.
export const DRIFT={entrySpeed:10,exitSpeed:7,engageTime:.18,recoverTime:.35,grip:3.4,maxLateral:20};
export function integrateVehicle(c,input,dt,tuning){
 if(!(dt>0))return;
 const steps=Math.max(1,Math.ceil(dt/(1/120))),h=dt/steps;
 const throttle=clamp(Number(input.throttle)||0,-1,1),target=clamp(Number(input.steer)||0,-1,1);
 const gripScale=clamp(tuning.grip/7.2,.5,1.5),powerScale=tuning.power/19;
 for(let tick=0;tick<steps;tick++){
  const sin=Math.sin(c.a),cos=Math.cos(c.a);
  let forward=c.vx*sin+c.vz*cos,side=c.vx*cos-c.vz*sin;
  const prevForward=forward,prevSide=side;
  // Missing oil state is normal in standalone vehicle tests and old snapshots.
  const wantsDrift=input.drift&&!input.brake&&throttle>=0&&!(c.oil>0);
  if(!wantsDrift||forward<DRIFT.exitSpeed)c.driftDirection=0;
  // 18% steering deadzone prevents accidental initiation from a resting stick.
  else if(!c.driftDirection&&forward>=DRIFT.entrySpeed&&Math.abs(target)>.18)c.driftDirection=Math.sign(target);
  c.drifting=!!c.driftDirection;
  const blendTarget=c.drifting?1:0;
  const blendStep=h/(c.drifting?DRIFT.engageTime:DRIFT.recoverTime);
  c.driftBlend=(c.driftBlend||0)+clamp(blendTarget-(c.driftBlend||0),-blendStep,blendStep);
  c.steer=(c.steer||0)+(target-(c.steer||0))*Math.min(1,h*(target===0?7:4.5));
  // A 0.1-second decay time keeps collision jolts brief.
  c.cameraKick=(c.cameraKick||0)*Math.exp(-10*h);
  c.impactTime=Math.max(0,(c.impactTime||0)-h);
  let thrust=0,braking=0;
  if(throttle>0){if(forward<-.5)braking=24*throttle;else thrust=14*powerScale*throttle*Math.max(0,1-(forward/62)**2)*(c.boost>0?1.5:1);}
  if(throttle<0){if(forward>.5)braking=24*-throttle;else thrust=6*powerScale*throttle*Math.max(0,1+forward/12);}
  if(input.brake){braking=Math.max(braking,24);thrust=0;}
  forward+=thrust*h;
  // A powered drift scrubs some speed, but does not apply the service brake.
  const resistance=(.4+.0035*forward*forward+braking+Math.abs(side)*(.9-.7*c.driftBlend))*h;
  forward=Math.abs(forward)<=resistance?0:forward-Math.sign(forward)*resistance;
  const grip=(c.oil>0?2.5:12+(DRIFT.grip-12)*c.driftBlend)*gripScale;
  const maxLat=(c.oil>0?6:28+(DRIFT.maxLateral-28)*c.driftBlend)*gripScale;
  const lateralDelta=Math.min(Math.abs(side)*grip,maxLat)*h;
  side=Math.abs(side)<=lateralDelta?0:side-Math.sign(side)*lateralDelta;
  const speed=Math.abs(forward);
  let yaw=c.steer*tuning.steering*clamp(speed/6,0,1)/(1+(speed/30)**2*.7)*Math.sign(forward);
  if(c.drifting){
   // Steer into the slide to tighten it; countersteer opens the arc. Feedback
   // targets 7–29 degrees of slip through yaw torque, never forced rotation.
   const steerAlong=c.steer*c.driftDirection;
   const desiredSlip=c.driftDirection*clamp(.28+.22*steerAlong,.12,.5);
   const slipAngle=-Math.atan2(side,Math.max(forward,.1));
   const turnRate=c.driftDirection*maxLat/Math.max(speed,DRIFT.exitSpeed)*(.7+.25*steerAlong);
   // 2.5 s^-1 slip feedback and a 1.8 rad/s yaw cap keep the slide catchable.
   const driftYaw=clamp(turnRate+(desiredSlip-slipAngle)*2.5,-1.8,1.8);
   yaw+=(driftYaw-yaw)*c.driftBlend;
  }
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
