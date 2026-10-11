// Read-only presentation envelope. Speeds are metres/second; response is seconds.
export function speedVfxTarget(car,mode,reduced,config){
 if(mode!=='race'||reduced||!car?.alive)return 0;
 const speed=Math.hypot(car.vx||0,car.vz||0);
 return Math.max(0,Math.min(1,(speed-config.startSpeed)/(config.fullSpeed-config.startSpeed)+(car.boost>0?config.boost:0)));
}
