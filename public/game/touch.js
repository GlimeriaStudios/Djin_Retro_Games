export function bindTouchControls(root,onFire=()=>{},onBoost=()=>{}){
 const held=new Map(),buttons=[...root.querySelectorAll('[data-key]')];
 const paint=()=>{for(const b of buttons)b.classList.toggle('held',[...held.values()].includes(b.dataset.key));};
 const release=e=>{held.delete(e.pointerId);paint();};
 for(const b of buttons){
  b.addEventListener('pointerdown',e=>{if(e.button>0)return;e.preventDefault();b.setPointerCapture(e.pointerId);held.set(e.pointerId,b.dataset.key);paint();if(b.dataset.key==='KeyF')onFire();if(b.dataset.key==='KeyE')onBoost();});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,release);
 }
 root.addEventListener('contextmenu',e=>e.preventDefault());
 return{sample:()=>({steer:0,keys:Object.fromEntries([...held.values()].map(k=>[k,true]))}),reset(){held.clear();paint();}};
}
