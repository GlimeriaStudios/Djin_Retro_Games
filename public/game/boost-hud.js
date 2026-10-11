export function updateBoostHud(car){
 const amount=Math.floor((car.boostCharge||0)*100),active=car.alive&&car.boost>0,ready=car.alive&&car.boostCharge>=1;
 const meter=document.getElementById('boostMeter');meter.value=amount;
 document.getElementById('boostLabel').textContent=active?'BOOST ACTIVE':ready?'BOOST READY · E / LB':`DRIFT BOOST · ${amount}%`;
 document.getElementById('boostPanel').dataset.ready=String(ready);
 document.getElementById('touchBoost').setAttribute('aria-label',ready?'Activate boost':'Boost charging');
}
