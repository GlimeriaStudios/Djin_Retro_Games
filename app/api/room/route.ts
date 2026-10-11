import {roomIce} from '../../../lib/turn';
import { env } from 'cloudflare:workers';
export const dynamic = 'force-dynamic';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:Request) {
  try {
    const raw=await request.text(); if(raw.length>100000) return reply({error:'Request too large'},413);
    const b=JSON.parse(raw), db=env.DB; if(!db) return reply({error:'Room service is unavailable'},503);
    const now=Date.now(), name=String(b.name||'Driver').replace(/[<>\x00-\x1f]/g,'').slice(0,18);
    if(b.action==='create') {
      const code=crypto.randomUUID().replaceAll('-','').slice(0,8).toUpperCase(),token=crypto.randomUUID();
      if(!b.config || JSON.stringify(b.config).length>18000) return reply({error:'Invalid track'},400);
      await db.batch([db.prepare('INSERT INTO rooms(code,host,config,updated) VALUES(?,?,?,?)').bind(code,token,JSON.stringify(b.config),now),...Array.from({length:4},(_,i)=>db.prepare('INSERT INTO seats(room,slot,token,name,updated) VALUES(?,?,?,?,?)').bind(code,i,i===0?token:'',i===0?name:'',i===0?now:0))]);
      await db.batch([db.prepare('DELETE FROM seats WHERE room IN (SELECT code FROM rooms WHERE updated < ? LIMIT 20)').bind(now-86400000),db.prepare('DELETE FROM rooms WHERE code IN (SELECT code FROM rooms WHERE updated < ? LIMIT 20)').bind(now-86400000)]);
      return reply({code,token,slot:0});
    }
    const code=String(b.code||'').toUpperCase(); if(!/^[A-F0-9]{8}$/.test(code))return reply({error:'Enter an eight-character room code'},400);
    const token=String(b.token||'');
    const initial=await db.batch([db.prepare('SELECT * FROM rooms WHERE code=?').bind(code),db.prepare('SELECT slot,answer FROM seats WHERE room=? AND token=? AND token<>?').bind(code,token,'')]);
    const room=initial[0].results[0] as any;
    if(!room || room.updated<now-20000)return reply({error:'Room closed. Ask the host for a new room.'},404);
    if(b.action==='join') {
      const token=crypto.randomUUID();
      const seat=await db.prepare("UPDATE seats SET token=?,name=?,updated=?,input='{}',offer='{}',answer='{}',voice='{}' WHERE room=? AND slot=(SELECT MIN(slot) FROM seats WHERE room=? AND slot>0 AND (token='' OR updated<?)) RETURNING slot").bind(token,name,now,code,code,now-12000).first<any>();
      if(!seat)return reply({error:'Room full — all four seats are taken'},409);
      return reply({code,token,slot:seat.slot,config:JSON.parse(room.config)});
    }
    const seat=initial[1].results[0] as any;
    if(!seat)return reply({error:'Your seat expired. Join the room again.'},403);
    if(b.action==='ice'){try{return reply(await roomIce(env as unknown as {TURN_KEY_ID?:string;TURN_KEY_API_TOKEN?:string},token));}catch{return reply({error:'Real-time relay could not connect. Check TURN setup.'},503);}}
    if(b.action==='leave') {
      if(token===room.host)await db.prepare('UPDATE rooms SET updated=0 WHERE code=?').bind(code).run();
      await db.prepare("UPDATE seats SET token='',name='',updated=0,input='{}',voice='{}' WHERE room=? AND token=?").bind(code,token).run(); return reply({ok:true});
    }
    if(b.action!=='sync')return reply({error:'Unknown action'},400);
    const i=b.input||{},input={throttle:Math.max(-1,Math.min(1,Number(i.throttle)||0)),steer:Math.max(-1,Math.min(1,Number(i.steer)||0)),brake:!!i.brake,drift:!!i.drift,fire:!!i.fire,reset:!!i.reset,seq:Number(i.seq)||0};
    const ops=[db.prepare('UPDATE seats SET input=?,updated=? WHERE room=? AND token=?').bind(JSON.stringify(input),now,code,token)];
    if(b.voice!==undefined){
      const v=b.voice;
      if(!v||typeof v!=='object'||JSON.stringify(v).length>32000||
        (v.id!==undefined&&(typeof v.id!=='string'||v.id.length>64))||
        (v.signals!==undefined&&(!v.signals||typeof v.signals!=='object'||Object.keys(v.signals).some(k=>!['0','1','2','3'].includes(k)))))return reply({error:'Invalid voice signalling'},400);
      ops.push(db.prepare('UPDATE seats SET voice=? WHERE room=? AND token=?').bind(JSON.stringify(v),code,token));
    }
    if(b.offer && token!==room.host && JSON.stringify(b.offer).length<16000)ops.push(db.prepare('UPDATE seats SET offer=? WHERE room=? AND token=?').bind(JSON.stringify(b.offer),code,token));
    if(token===room.host && Array.isArray(b.answers))for(const a of b.answers.slice(0,3)){if(a.slot>0&&a.slot<4&&JSON.stringify(a.answer).length<16000)ops.push(db.prepare('UPDATE seats SET answer=? WHERE room=? AND slot=?').bind(JSON.stringify(a.answer),code,a.slot));}
    if(token===room.host && b.state) ops.push(db.prepare('UPDATE rooms SET state=?,updated=? WHERE code=? AND host=?').bind(JSON.stringify(b.state),now,code,token));
    else if(token===room.host) ops.push(db.prepare('UPDATE rooms SET updated=? WHERE code=? AND host=?').bind(now,code,token));
    // Fetch the roster in the same ordered batch as writes: two DB trips per sync instead of four.
    ops.push(db.prepare('SELECT slot,name,input,updated,offer,voice FROM seats WHERE room=? AND token<>? AND updated>? ORDER BY slot').bind(code,'',now-12000));
    const results=await db.batch(ops),roster=results[results.length-1];
    return reply({players:roster.results.map((p:any)=>({slot:p.slot,name:p.name,updated:p.updated,voice:((v:any)=>({id:v.id,mic:!!v.mic,signal:v.signals?.[seat.slot]}))(JSON.parse(p.voice)),offer:token===room.host?JSON.parse(p.offer):undefined,input:p.updated<now-2500?{}:JSON.parse(p.input)})),answer:JSON.parse(seat.answer),state:token===room.host?null:JSON.parse(room.state),serverTime:now});
  }catch(e){ console.error('room',e); return reply({error:'Room service could not complete the request. Try again.'},500); }
}
