import {newBike,restoreBike} from './bike.js';
import {restoreBoats} from './boat.js';
import {restoreSettlement} from './settlement.js';
import {restoreStarrySands,advanceTownDay} from './town-renovation.js';
import * as G from './state.js';
import {createShelter, restoreShelter, SHELTER_LIMIT} from './shelter.js';

import {MAP_REVISION,MAP_WIDTH,MAP_HEIGHT,SPAWN,HOME,isWalkable} from './archipelago.js';
export {HOME};
export const WORLD_LIMIT = MAP_WIDTH/2;
export const WEATHER = ['Clear skies','Dust haze','Fog','Radstorm'];
export const WEAPONS = {
  pistol:{name:'Scavenger pistol',model:'scavenger_pistol',magazine:8,damage:32,range:70,delay:.32,reload:1.55},
  rifle:{name:'Service rifle',model:'service_rifle',magazine:24,damage:24,range:115,delay:.12,reload:2.1},
  pipe:{name:'Salvaged pipe',model:'scrap_pipe',magazine:0,damage:40,range:2.7,delay:.6,reload:0},
};

export const JOBS = {
  generator:{name:'Service the generator',verb:'Replacing intake seals',seconds:4,cost:{scrap:2},reward:{fuel:1},detail:'2 scrap → 1 fuel and +15 shelter condition'},
  water:{name:'Flush the water filter',verb:'Flushing the filter',seconds:3.5,cost:{scrap:1},reward:{water:5},detail:'1 scrap → 5 clean water'},
  garden:{name:'Tend the grow beds',verb:'Watering and harvesting',seconds:4,cost:{water:2},reward:{food:4},detail:'2 water → 4 food'},
  salvage:{name:'Sort the salvage',verb:'Separating usable parts',seconds:3,cost:{},reward:{scrap:4},detail:'Recover 4 scrap from the damaged crates'},
  cook:{name:'Prepare a hot meal',verb:'Cooking a communal meal',seconds:4,cost:{food:2,water:1},reward:{},detail:'2 food + 1 water → restore 45 energy and 10 health'},
};

export function createField() {
  return {bike:newBike(),bike_extra:newBike('bike_extra'),boats:restoreBoats(),activeBoat:null,swimming:false,settlement:restoreSettlement(),starrySands:restoreStarrySands(),waypoint:null,yaw:0,pitch:0,weatherTimer:100,weatherIndex:0,flashlight:false,
    weapons:{pistol:{owned:true,mag:8,reserve:32},rifle:{owned:false,mag:0,reserve:0},pipe:{owned:true,mag:0,reserve:0}},equipped:'pistol',
    jobs:{},crewJobs:{},defeated:{},notes:[],kills:0,rifleFound:false,relayRecovered:false,
    stamina:100,jobCount:0,settings:{sound:true,sensitivity:1,bob:true}};
}
export function newCampaign(seed) {
  const s=G.newGame(seed);s.worldRevision=MAP_REVISION;s.field=createField();s.shelter=createShelter();
  s.position={x:0,y:0,z:5.5};s.minute=16*60+40;
  s.resources.food=28;s.resources.water=40;s.resources.scrap=12;
  s.residents.push({name:'Rafi',role:'Engineer',benefit:'Repairs the generator and sorts salvage'}, {name:'June',role:'Botanist',benefit:'Tends grow beds and prepares provisions'});
  G.log(s,'Rafi is keeping the generator alive. June needs water for the grow beds. The ruined district still has supplies.');
  return s;
}
function finite(v,min,max,fallback){return typeof v==='number'&&Number.isFinite(v)?G.clamp(v,min,max):fallback;}
export function restoreCampaign(raw) {
  let data;try{data=typeof raw==='string'?JSON.parse(raw):raw;}catch{return null;}
  const s=G.restoreSave(data);if(!s)return null;
  const f=createField(),old=data.field||{};
  s.worldRevision=MAP_REVISION;
  if(data.worldRevision===MAP_REVISION||(s.zone==='shelter'&&data.worldRevision===2)){
    const limit=s.zone==='shelter'?SHELTER_LIMIT:WORLD_LIMIT-.5;
    s.position={x:finite(data.position?.x,-limit,limit,s.zone==='shelter'?0:SPAWN.x),y:finite(data.position?.y,s.zone==='shelter'?0:-8,40,0),z:finite(data.position?.z,s.zone==='shelter'?-limit:-MAP_HEIGHT/2+.5,s.zone==='shelter'?limit:MAP_HEIGHT/2-.5,s.zone==='shelter'?5.5:SPAWN.z)};
  }else{
    s.position=s.zone==='shelter'?{x:0,y:0,z:5.5}:{...SPAWN};
    G.log(s,'The coastal archipelago has opened up. Your shelter supplies and progress have been preserved.');
    for(const person of [{name:'Rafi',role:'Engineer',benefit:'Maintains the generator and sorts salvage'},{name:'June',role:'Botanist',benefit:'Tends grow beds and prepares provisions'}]){
      if(s.residents.length<3&&!s.residents.some(r=>r.name===person.name))s.residents.push(person);
    }
  }
  f.bike=restoreBike(old.bike);
  f.bike_extra=restoreBike(old.bike_extra,'bike_extra');
  f.boats=restoreBoats(old.boats);
  f.settlement=restoreSettlement(old.settlement);
  f.starrySands=restoreStarrySands(old.starrySands,s.day);
  f.activeBoat=Object.hasOwn(f.boats,old.activeBoat)?old.activeBoat:null;
  f.swimming=old.swimming===true;
  if(old.waypoint&&Number.isFinite(old.waypoint.x)&&Number.isFinite(old.waypoint.z)&&Math.abs(old.waypoint.x)<MAP_WIDTH/2&&Math.abs(old.waypoint.z)<MAP_HEIGHT/2)f.waypoint={x:old.waypoint.x,z:old.waypoint.z};
  f.yaw=finite(old.yaw,-Math.PI*100,Math.PI*100,0);f.pitch=finite(old.pitch,-1.45,1.45,0);
  f.weatherTimer=finite(old.weatherTimer,1,300,100);f.weatherIndex=Math.floor(finite(old.weatherIndex,0,100000,0));
  f.stamina=finite(old.stamina,0,100,100);f.kills=Math.floor(finite(old.kills,0,100000,0));f.jobCount=Math.floor(finite(old.jobCount,0,100000,0));
  for(const id of Object.keys(WEAPONS)){
    const w=old.weapons?.[id];if(!w)continue;
    f.weapons[id]={owned:id==='rifle'?w.owned===true:true,mag:Math.floor(finite(w.mag,0,WEAPONS[id].magazine,f.weapons[id].mag)),reserve:Math.floor(finite(w.reserve,0,999,f.weapons[id].reserve))};
  }
  if(Object.hasOwn(WEAPONS,old.equipped)&&f.weapons[old.equipped].owned)f.equipped=old.equipped;
  for(const key of ['jobs','crewJobs','defeated']){
    const entries=Object.entries(old[key]||{}).filter(([k,v])=>/^[a-zA-Z0-9_-]{1,50}$/.test(k)&&Number.isFinite(v));
    f[key]=Object.fromEntries(entries.slice(0,150).map(([k,v])=>[k,G.clamp(Math.floor(v),0,s.day*10+100)]));
  }
  f.notes=Array.isArray(old.notes)?old.notes.filter(v=>typeof v==='string').slice(0,30):[];
  f.rifleFound=old.rifleFound===true;f.relayRecovered=old.relayRecovered===true;f.flashlight=old.flashlight===true;
  f.settings={sound:old.settings?.sound!==false,bob:old.settings?.bob!==false,sensitivity:finite(old.settings?.sensitivity,.4,2.2,1)};
  s.field=f;s.shelter=restoreShelter(data.shelter);s.weather=WEATHER.includes(data.weather)?data.weather:data.weather==='Ash storm'?'Radstorm':'Clear skies';
  if(s.zone==='wasteland'&&!isWalkable(s.position.x,s.position.z)&&!f.swimming&&!f.activeBoat)s.position={...SPAWN};
  return s;
}

export function depart(s) {
  // Radio messages wait at the receiver; they never block the airlock.
  const pending=s.pendingEvent;s.pendingEvent=null;
  const ok=G.depart(s);s.pendingEvent=pending;if(!ok)return false;
  s.position={...SPAWN};s.field.yaw=0;s.field.pitch=0;
  s.field.activeBoat=null;s.field.swimming=false;
  // The computer's prepared field kit determines what leaves the stockpile.
  let free=G.bagCapacity(s);
  for(const [k,n] of Object.entries(s.computer?.kit||{food:1,water:2,meds:1,radmed:1})){
    if(!G.RESOURCE_KEYS.includes(k))continue;
    const packed=Math.min(n,s.resources[k],free);s.resources[k]-=packed;s.bag[k]+=packed;free-=packed;
  }
  return true;
}
export function returnHome(s) {
  const count=G.returnHome(s);if(count===false)return false;
  s.position={x:0,y:0,z:7.5};s.field.yaw=0;s.field.pitch=0;s.field.activeBoat=null;s.field.swimming=false;return count;
}
export function reload(s,id=s.field.equipped) {
  const w=s.field.weapons[id],spec=WEAPONS[id];
  if(!w?.owned||!spec||!spec.magazine)return false;
  const n=Math.min(spec.magazine-w.mag,w.reserve);if(n<=0)return false;
  w.mag+=n;w.reserve-=n;return n;
}
export function fire(s) {
  const id=s.field.equipped,w=s.field.weapons[id];
  if(!w?.owned||s.zone!=='wasteland'||s.gameOver)return false;
  if(id==='pipe')return true;
  if(w.mag<=0)return false;w.mag--;return true;
}
export function setWeapon(s,id){if(!Object.hasOwn(WEAPONS,id)||!s.field.weapons[id].owned)return false;s.field.equipped=id;return true;}
export function search(s,id) {
  const found=G.scavenge(s,id);if(!found)return null;
  s.field.weapons.pistol.reserve=Math.min(999,s.field.weapons.pistol.reserve+(id==='clinic'?4:8));
  if(['checkpoint','foundry','relay'].includes(id))s.field.weapons.rifle.reserve=Math.min(999,s.field.weapons.rifle.reserve+18);
  if(id==='checkpoint'&&!s.field.rifleFound){s.field.rifleFound=true;s.field.weapons.rifle.owned=true;s.field.weapons.rifle.mag=24;G.log(s,'Recovered a service rifle from the checkpoint armoury.','good');}
  if(id==='relay'){s.field.relayRecovered=true;G.log(s,'Recovered the relay frequency: 104.7. Repair the shelter radio to transmit.','good');}
  return found;
}
export function jobAvailable(s,id){return s.zone==='shelter'&&!!JOBS[id]&&s.field.jobs[id]!==s.day&&G.canAfford(s,JOBS[id].cost);}
export function completeJob(s,id){
  if(!jobAvailable(s,id))return false;
  const job=JOBS[id];G.pay(s,job.cost);
  for(const [k,n] of Object.entries(job.reward))s.resources[k]+=n;
  if(id==='generator')s.integrity=G.clamp(s.integrity+15,0,100);
  if(id==='cook'){s.health=G.clamp(s.health+10,0,100);s.energy=G.clamp(s.energy+45,0,100);}
  s.morale=G.clamp(s.morale+3,0,100);s.field.jobs[id]=s.day;s.field.jobCount++;
  G.log(s,`${job.name} completed. ${job.detail}.`,'good');return true;
}
export function crewWork(s,name,role) {
  if(s.zone!=='shelter')return false;
  const key=`${name}_${s.day}`,count=s.field.crewJobs[key]||0;
  if(count>=3)return false;
  s.field.crewJobs[key]=count+1;
  const place=s.shelter.assignments?.[name],room=place&&s.shelter.slots[place.floor-1]?.[place.slot]?.id;
  if(room==='workshop'){s.integrity=G.clamp(s.integrity+2,0,100);s.resources.scrap++;}
  else if(room==='garden'||room==='kitchen'){if(s.resources.water){s.resources.water--;s.resources.food+=2;}}
  else if(room==='hospital')s.health=G.clamp(s.health+3,0,100);
  else if(room==='waterworks')s.resources.water+=2;
  else if(room==='reactor')s.resources.fuel++;
  else if(room==='gym'||room==='computer')s.morale=G.clamp(s.morale+2,0,100);
  else if(room==='storage')s.resources.scrap++;
  else if(role==='Engineer'){s.integrity=G.clamp(s.integrity+2,0,100);s.resources.scrap++;}
  else if(role==='Botanist'||role==='Cook'){if(s.resources.water){s.resources.water--;s.resources.food+=2;}}
  else if(role==='Medic'){s.health=G.clamp(s.health+3,0,100);}
  else s.resources.scrap++;
  // Retain only recent shifts, so an endless campaign does not grow the save forever.
  for(const k of Object.keys(s.field.crewJobs))if(Number(k.split('_').at(-1))<s.day-2)delete s.field.crewJobs[k];
  return true;
}
export function craftAmmo(s,id){
  if(s.zone!=='shelter'||!['pistol','rifle'].includes(id)||!s.field.weapons[id].owned||!G.pay(s,{scrap:id==='rifle'?5:3}))return false;
  s.field.weapons[id].reserve=Math.min(999,s.field.weapons[id].reserve+(id==='rifle'?24:16));return true;
}
export function advance(s,dt,{sheltered=false,hazard=false}={}) {
  if(s.gameOver)return;
  s.minute+=dt*4; // One continuous day lasts six real minutes.
  s.field.weatherTimer-=dt;
  if(s.field.weatherTimer<=0){
    s.field.weatherIndex++;
    const sequence=['Clear skies','Fog','Radstorm','Dust haze','Clear skies'];
    s.weather=sequence[s.field.weatherIndex%sequence.length];s.field.weatherTimer=s.weather==='Radstorm'?70:110;
  }
  if(s.zone==='wasteland'){
    s.expeditionSeconds+=dt;
    const dose=s.weather==='Radstorm'?.65:s.weather==='Fog'?.06:.09;
    s.radiation+=dt*(dose*(sheltered?.10:1)+(hazard?.6:0))*(s.upgrades.suit?.5:1);
    s.energy-=dt*.06;
    if(s.radiation>65)s.health-=dt*(s.radiation>85?.65:.2);
  }else s.radiation-=dt*.2;
  if(s.minute>=1440){const minute=s.minute-1440,weather=s.weather;G.nextDay(s,false);advanceTownDay(s);s.minute=minute;s.weather=weather;}
  for(const key of ['health','energy','radiation','morale','integrity'])s[key]=G.clamp(s[key],0,100);
  if(s.health<=0)s.gameOver=true;
}

export function objective(s){
  if(!s.firstHaul)return 'Search Starry Sands Market, then bring supplies back to Shelter 07.';
  if(!s.field.rifleFound)return 'Recover the service rifle from the Military Checkpoint at Starfield.';
  if(!s.field.relayRecovered)return 'Search the upper floor of North Relay in Starfield for a transmission frequency.';
  if(s.upgrades.radio<2)return 'Use salvaged parts to repair the radio twice at the shelter workbench.';
  if(s.day<14)return `Keep the shelter alive until day 14. ${14-s.day} days to go.`;
  return s.signalSent?'The relief network heard you. Keep your people alive.':'Transmit from the shelter radio. Someone is listening.';
}
