// Convert the supplied Standard MIDI File into a dependency-free browser score.
// Fail on unsupported performance data instead of silently dropping musical parts.
import fs from 'node:fs';
import crypto from 'node:crypto';
const input=process.argv[2]||'public/game/audio/grayline-race-theme-v2.mid';
const output=process.argv[3]||'public/game/race-score.js';
const data=fs.readFileSync(input);let offset=0;
const str=n=>{const v=data.toString('ascii',offset,offset+n);offset+=n;return v;};
const uint=n=>{const v=data.readUIntBE(offset,n);offset+=n;return v;};
const variable=()=>{let n=0;for(let i=0;i<4;i++){const b=uint(1);n=(n<<7)|(b&127);if(!(b&128))return n;}throw Error('Invalid MIDI delta');};
if(str(4)!=='MThd'||uint(4)!==6)throw Error('Invalid MIDI header');
const format=uint(2),count=uint(2),ppq=uint(2);
if(format!==1||(ppq&0x8000))throw Error('Expected type-1 MIDI with beat-based timing');
const notes=[],tracks=[],tempos=[];let endTick=0;
for(let track=0;track<count;track++){
 if(str(4)!=='MTrk')throw Error('Missing track');const end=offset+4+uint(4);
 let tick=0,running=0,name='',program=null,channel=null;const held=new Map();
 while(offset<end){
  tick+=variable();let status=data[offset];if(status<128){if(!running)throw Error('Invalid running status');status=running;}else offset++;
  if(status===255){const type=uint(1),len=variable(),bytes=data.subarray(offset,offset+len);offset+=len;
   if(type===3)name=bytes.toString('utf8');if(type===81)tempos.push([tick,bytes.readUIntBE(0,3)]);
   continue;
  }
  if(status>=240)throw Error('Unsupported system event');running=status;
  const kind=status&240,ch=status&15,a=uint(1),b=(kind===192||kind===208)?0:uint(1);
  if(kind===192){if(tick!==0)throw Error('Mid-song program change');program=a;channel=ch;continue;}
  if(kind!==128&&kind!==144)throw Error('Unsupported performance controller '+kind);
  const key=ch+':'+a;
  if(kind===144&&b>0){if(!held.has(key))held.set(key,[]);held.get(key).push({tick,velocity:b});channel=ch;}
  else{const on=held.get(key)?.shift();if(!on)throw Error('Unmatched note off');notes.push([on.tick,tick-on.tick,a,on.velocity,track-1]);}
 }
 if([...held.values()].some(v=>v.length))throw Error('Unterminated note');
 endTick=Math.max(endTick,tick);if(track>0)tracks.push({name,program,channel});
}
if(tempos.length!==1||tempos[0][0]!==0)throw Error('This arrangement must have one initial tempo');
notes.sort((a,b)=>a[0]-b[0]||a[4]-b[4]||a[2]-b[2]);
const score={title:'Grayline - race theme 117bpm Cm v2',sha256:crypto.createHash('sha256').update(data).digest('hex'),ppq,microsecondsPerBeat:tempos[0][1],endTick,tracks,notes};
fs.writeFileSync(output,'// Generated from the supplied MIDI by scripts/import-race-midi.mjs.\n// Notes: [start tick, duration ticks, MIDI pitch, velocity, track index].\nexport const MIDI_SCORE='+JSON.stringify(score)+';\n');
console.log(JSON.stringify({notes:notes.length,bars:endTick/ppq/4,seconds:endTick/ppq*tempos[0][1]/1e6,tracks:tracks.map((t,i)=>({...t,firstTick:notes.find(n=>n[4]===i)?.[0]})),drums:[...new Set(notes.filter(n=>n[4]===7).map(n=>n[2]))]}));
