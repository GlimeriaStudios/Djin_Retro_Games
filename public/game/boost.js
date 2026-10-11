// Metres/seconds. Six seconds of powered, moving drift earns one 2.4 s burst.
// Reuse the existing boost force and duration, so there is only one thrust model.
export const BOOST={chargeSeconds:6,duration:2.4,minSpeed:10,minSlip:2};
export function updateBoost(c,input,dt){
 const pressed=!!input.boost&&!c.boostHeld;c.boostHeld=!!input.boost;
 if(!c.alive)return;
 c.boostCharge=Math.max(0,Math.min(1,c.boostCharge||0));
 if(pressed&&c.boostCharge>=1&&c.boost<=0){c.boostCharge=0;c.boost=BOOST.duration;return;}
 // No charge from stationary wheelspin, oil, boost thrust or simply holding Space.
 if(c.boost<=0&&c.drifting&&c.oil<=0&&input.throttle>0&&Math.hypot(c.vx,c.vz)>=BOOST.minSpeed&&c.slip>=BOOST.minSlip)
  c.boostCharge=Math.min(1,c.boostCharge+Math.max(0,dt)/BOOST.chargeSeconds);
}
