type TurnEnv={TURN_KEY_ID?:string;TURN_KEY_API_TOKEN?:string};
type IceServer={urls:string[];username?:string;credential?:string};
const cache=new Map<string,{until:number;servers:IceServer[]}>();
export async function roomIce(env:TurnEnv,seatToken:string,request=fetch){
 if(!env.TURN_KEY_ID||!env.TURN_KEY_API_TOKEN)return{configured:false,iceServers:[]};
 const now=Date.now(),old=cache.get(seatToken);if(old&&old.until>now)return{configured:true,iceServers:old.servers};
 const response=await request('https://rtc.live.cloudflare.com/v1/turn/keys/'+encodeURIComponent(env.TURN_KEY_ID)+'/credentials/generate-ice-servers',{method:'POST',headers:{Authorization:'Bearer '+env.TURN_KEY_API_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({ttl:14400}),signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw new Error('TURN credentials unavailable');
 const data=await response.json() as {iceServers?:IceServer[]};
 const servers=(data.iceServers||[]).map(s=>({urls:(Array.isArray(s.urls)?s.urls:[s.urls]).filter(u=>typeof u==='string'&&/^(stun|turn|turns):/.test(u)&&!/:53(?:\?|$)/.test(u)),...(s.username?{username:s.username}:{}),...(s.credential?{credential:s.credential}:{})})).filter(s=>s.urls.length);
 if(!servers.some(s=>s.urls.some(u=>/^turns?:/.test(u))))throw new Error('TURN credentials unavailable');
 if(cache.size>=128)cache.delete(cache.keys().next().value!);cache.set(seatToken,{until:now+600000,servers});
 return{configured:true,iceServers:servers};
}
