import {TOWNS} from './archipelago.js';
import {createComputer,restoreComputer,rollComputerMail} from './computer.js';
export const SAVE_KEY = 'afterlight.shelter.v1';
export const RESOURCE_KEYS = ['food', 'water', 'scrap', 'meds', 'radmed', 'fuel'];
export const RESOURCE_NAMES = { food: 'food', water: 'water', scrap: 'scrap', meds: 'medicine', radmed: 'Rad-Clear', fuel: 'fuel' };
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const UPGRADES = {
  filter: { name: 'Water purifier', desc: 'Produces 4 clean water each morning while the generator has fuel.', cost: { scrap: 12 }, max: 1, icon: 'water' },
  garden: { name: 'Grow beds', desc: 'Produces 3 food each morning. A small beginning, even underground.', cost: { scrap: 16, water: 4 }, max: 1, icon: 'leaf' },
  suit: { name: 'Sealed expedition suit', desc: 'Halves radiation exposure on every expedition.', cost: { scrap: 18 }, max: 1, icon: 'shield' },
  pack: { name: 'Expedition backpack', desc: 'Carry 28 supplies instead of 18 on a supply run.', cost: { scrap: 14 }, max: 1, icon: 'pack' },
  bunks: { name: 'Extra bunks', desc: 'Make space for 6 residents instead of 4.', cost: { scrap: 18 }, max: 1, icon: 'people' },
  radio: { name: 'Long-range radio', desc: 'Two repairs restore the emergency beacon. Reach day 14 and send a signal.', cost: { scrap: 20, fuel: 2 }, max: 2, icon: 'radio' },
};
export const SITES = [
  { id:'market', name:'Starry Sands Market', type:'food', x:TOWNS[0].x+(-23), z:TOWNS[0].z+(42), building:'store', desc:'Rations behind the collapsed shopfront', loot:{food:[4,7],water:[2,4],scrap:[1,2]} },
  { id:'wreck', name:'Starry Sands Apartments', type:'fuel', x:TOWNS[0].x+(23), z:TOWNS[0].z+(28), building:'tenement', upstairs:true, desc:'Fuel cache upstairs; use the east stairwell', loot:{fuel:[2,4],scrap:[3,5]} },
  { id:'cistern', name:'Riccota Waterworks', type:'water', x:TOWNS[3].x+(-22), z:TOWNS[3].z+(-12), building:'store', desc:'Emergency drinking water', loot:{water:[5,8],scrap:[1,3]} },
  { id:'clinic', name:'Starry Sands Clinic', type:'meds', x:TOWNS[0].x+(-24), z:TOWNS[0].z+(0), building:'store', desc:'Medical supplies in the treatment room', loot:{meds:[2,4],radmed:[1,1],food:[1,3],water:[1,2]} },
  { id:'depot', name:'Little Jaffa Depot', type:'scrap', x:TOWNS[2].x+(-24), z:TOWNS[2].z+(-24), building:'store', desc:'Tools and generator parts', loot:{scrap:[6,9],fuel:[1,3]} },
  { id:'camp', name:'Riccota Refuge', type:'food', x:TOWNS[3].x+(24), z:TOWNS[3].z+(25), building:'store', desc:'An abandoned evacuation point', loot:{food:[3,5],water:[3,5],meds:[1,2]} },
  { id:'relay', name:'North Relay', type:'scrap', x:TOWNS[1].x+(-35), z:TOWNS[1].z+(-45), building:'tenement', upstairs:true, desc:'Signal components on the upper floor', loot:{scrap:[7,10],fuel:[1,2]} },
  { id:'checkpoint', name:'Military Checkpoint', type:'scrap', x:TOWNS[1].x+(25), z:TOWNS[1].z+(24), building:'store', desc:'A service rifle and ammunition', loot:{scrap:[3,5],meds:[1,2]} },
  { id:'school', name:'Little Jaffa School', type:'food', x:TOWNS[2].x+(26), z:TOWNS[2].z+(-24), building:'tenement', upstairs:true, desc:'Classroom supply cache upstairs', loot:{food:[4,6],water:[2,4]} },
  { id:'offices', name:'Azure Port Customs', type:'scrap', x:TOWNS[4].x+(28), z:TOWNS[4].z+(-25), building:'tenement', upstairs:true, desc:'Civil-defence lockers above the offices', loot:{scrap:[5,8],meds:[1,2],radmed:[1,1]} },
  { id:'station', name:'Menton Fuel Station', type:'fuel', x:TOWNS[5].x+(-25), z:TOWNS[5].z+(-25), building:'store', desc:'Fuel in the southern coastal settlement', loot:{fuel:[4,6],scrap:[1,3]} },
  { id:'foundry', name:'Menton Ironworks', type:'scrap', x:TOWNS[5].x+(25), z:TOWNS[5].z+(28), building:'tenement', upstairs:true, desc:'Heavy salvage and rifle cartridges', loot:{scrap:[7,10],fuel:[2,3]} },
];
const PEOPLE = [
  { name: 'Mara', role: 'Medic', benefit: '+5 health each morning' },
  { name: 'Eli', role: 'Scavenger', benefit: '+2 scrap each morning' },
  { name: 'June', role: 'Botanist', benefit: '+2 food from grow beds' },
  { name: 'Rafi', role: 'Engineer', benefit: '+4 shelter condition each morning' },
  { name: 'Nora', role: 'Cook', benefit: 'One less food used each morning' },
  ...['Tariq','Lena','Sami','Hana','Idris','Maya','Omar','Farah','Yusuf','Amina','Nadia','Khaled','Mira','Salim','Leila','Adam','Rana','Bilal','Dina','Zayd'].map((name,i)=>({name,role:['Medic','Engineer','Botanist','Cook','Scavenger'][i%5],benefit:'Helps maintain Shelter 07'})),
];

export function newGame(seed = Date.now()) {
  return {
    version: 1, seed: seed >>> 0 || 314159, day: 1, minute: 8*60+10, zone: 'shelter',
    position: { x: 1.4, z: 2.5 }, health: 100, energy: 100, radiation: 0, morale: 78, integrity: 94,
    resources: { food: 12, water: 16, scrap: 8, meds: 3, radmed: 1, fuel: 6 },
    residents: [{ name: 'You', role: 'Caretaker', benefit: 'Keep the light on' }],
    upgrades: Object.fromEntries(Object.keys(UPGRADES).map(k => [k,0])),
    searched: {}, bag: Object.fromEntries(RESOURCE_KEYS.map(k => [k,0])),
    flares: 3, expeditions: 0, scavenged: 0, expeditionSeconds: 0, encounter: false,
    pendingEvent: null, eventHistory: [], weather: 'Clear skies', log: [], computer:createComputer(),
    firstHaul: false, introSeen: false, signalSent: false, continued: false, gameOver: false,
  };
}
export function random(s) { s.seed = (Math.imul(s.seed,1664525)+1013904223) >>> 0; return s.seed/4294967296; }
export function log(s, text, kind = 'info') {
  s.log.unshift({ day: s.day, text, kind }); s.log = s.log.slice(0,45);
}
export function capacity(s) { if(!s.shelter)return s.upgrades.bunks?6:4;const rooms=(s.shelter.slots||[]).flat().filter(r=>r?.id==='bedrooms');const beds=rooms.reduce((n,r)=>n+4+(r.level>=2?2:0),0);return Math.max(rooms.length?1+beds+(s.upgrades.bunks?2:0):4,1); }
export function bagCapacity(s) { return s.upgrades.pack ? 28 : 18; }
export function bagCount(s) { return RESOURCE_KEYS.reduce((n,k)=>n+s.bag[k],0); }
export function canAfford(s, cost) { return Object.entries(cost).every(([k,n])=>s.resources[k]>=n); }
export function pay(s, cost) { if (!canAfford(s,cost)) return false; for (const [k,n] of Object.entries(cost)) s.resources[k]-=n; return true; }
export function upgradeCost(s, id) { return id==='radio' && s.upgrades.radio===1 ? { scrap:28, fuel:3 } : UPGRADES[id].cost; }
export function build(s, id) {
  if (s.zone!=='shelter' || !UPGRADES[id] || s.upgrades[id]>=UPGRADES[id].max || !pay(s,upgradeCost(s,id))) return false;
  s.upgrades[id]++; s.morale=clamp(s.morale+6,0,100);
  log(s,`${UPGRADES[id].name} ${id==='radio' ? `repaired (${s.upgrades.radio}/2)` : 'built'}.`,'good');
  return true;
}
export function useMedicine(s) {
  const supplies=s.zone==='wasteland'?s.bag:s.resources;
  if (supplies.meds<1 || (s.health>=100 && s.radiation<=0)) return false;
  supplies.meds--; s.health=clamp(s.health+35,0,100); s.radiation=clamp(s.radiation-35,0,100);
  log(s,'Used a medical kit. +35 health, −35 radiation.','good'); return true;
}
export function useRadMedicine(s) {
  const supplies=s.zone==='wasteland'?s.bag:s.resources;
  if(supplies.radmed<1||s.radiation<=0)return false;
  supplies.radmed--;s.radiation=0;
  log(s,'Used Rad-Clear. Radiation removed.','good');return true;
}
export function eat(s) {
  const supplies=s.zone==='wasteland'?s.bag:s.resources;
  if (s.energy>=100 || supplies.food<1 || supplies.water<1) return false;
  supplies.food--;supplies.water--;
  s.energy=clamp(s.energy+35,0,100); s.health=clamp(s.health+5,0,100);
  log(s,'A meal and a moment to breathe. +35 energy.','good'); return true;
}
export function repair(s) {
  if(s.zone!=='shelter' || s.integrity>=100 || !pay(s,{scrap:4})) return false;
  s.integrity=clamp(s.integrity+30,0,100); log(s,'Patched the shelter seals. +30 condition.','good'); return true;
}
export function craftFlares(s) {
  if(s.zone!=='shelter' || !pay(s,{scrap:3})) return false;
  s.flares+=3; log(s,'Crafted 3 emergency flares.','good'); return true;
}
export function depart(s) {
  if (s.zone!=='shelter' || s.gameOver || s.pendingEvent) return false;
  s.zone='wasteland'; s.position={x:0,z:15}; s.expeditions++; s.expeditionSeconds=0;
  s.encounter=random(s)<.08;
  s.bag=Object.fromEntries(RESOURCE_KEYS.map(k=>[k,0]));
  log(s,`Expedition ${s.expeditions}. The blast door closes behind you.`);
  return true;
}
export function returnHome(s) {
  if(s.zone!=='wasteland') return false;
  const count=bagCount(s);
  for(const k of RESOURCE_KEYS) { s.resources[k]+=s.bag[k]; s.bag[k]=0; }
  s.zone='shelter'; s.position={x:7.0,z:-4.7}; s.encounter=false;
  if(count>0) { s.firstHaul=true; s.morale=clamp(s.morale+5,0,100); }
  log(s,`Home again. ${count} supplies added to the stockpile.`,count?'good':'info');
  return count;
}
export function siteAvailable(s,id) { return s.searched[id]===undefined || s.day-s.searched[id]>=3; }
export function scavenge(s,id) {
  const site=SITES.find(x=>x.id===id);
  if(s.zone!=='wasteland' || !site || !siteAvailable(s,id) || bagCount(s)>=bagCapacity(s)) return null;
  const found={}; let free=bagCapacity(s)-bagCount(s);
  for(const [k,[min,max]] of Object.entries(site.loot)) {
    const n=Math.min(free,min+Math.floor(random(s)*(max-min+1)));
    if(n) { found[k]=n; s.bag[k]+=n; free-=n; }
  }
  s.searched[id]=s.day; s.scavenged++; s.energy=clamp(s.energy-5,0,100);
  s.radiation=clamp(s.radiation+(s.upgrades.suit?1.5:3),0,100);
  s.minute+=20;
  log(s,`${site.name}: ${Object.entries(found).map(([k,n])=>`+${n} ${RESOURCE_NAMES[k]}`).join(', ')}.`,'good');
  if(random(s)<.23 && !s.pendingEvent) triggerEvent(s, random(s)<.5 ? 'cache' : 'stranger');
  return found;
}

export const EVENTS = {
  visitor: { eyebrow:'A KNOCK AT THE DOOR', title:'One more light in the dark.', text:'A traveller stands outside the airlock. They have been following the warm glow of your vent. There is room for hope, if there is room at your table.', icon:'people', choices:[
    {id:'welcome',label:'Welcome them in',detail:'A new resident · +10 morale',require:s=>s.residents.length<capacity(s),effect:s=>{const person=PEOPLE.find(p=>!s.residents.some(r=>r.name===p.name));if(person)s.residents.push({...person});s.morale+=10;s.resources.food+=2;}},
    {id:'share',label:'Share supplies and say goodbye',detail:'−2 food · +4 morale',cost:{food:2},effect:s=>{s.morale+=4;}},
    {id:'decline',label:'Keep the door closed',detail:'−5 morale',effect:s=>{s.morale-=5;}},
  ]},
  trader: { eyebrow:'A VOICE ON THE INTERCOM', title:'The travelling merchant.', text:'A battered bicycle, a dozen canvas bags, and a cheerful voice. The trader says the northern road is still passable. For now.',icon:'trade',choices:[
    {id:'rations',label:'Trade for provisions',detail:'−4 scrap · +6 food · +6 water',cost:{scrap:4},effect:s=>{s.resources.food+=6;s.resources.water+=6;}},
    {id:'fuel',label:'Trade for generator fuel',detail:'−4 food · +5 fuel',cost:{food:4},effect:s=>{s.resources.fuel+=5;}},
    {id:'pass',label:'Wish them safe travels',detail:'Keep your supplies',effect:()=>{}},
  ]},
  leak: { eyebrow:'SHELTER MAINTENANCE', title:'Water on the floor.',text:'A corroded pipe has split behind the cistern. Every drip is clean water you cannot afford to lose.',icon:'water',choices:[
    {id:'fix',label:'Replace the damaged pipe',detail:'−3 scrap · +5 condition',cost:{scrap:3},effect:s=>{s.integrity+=5;}},
    {id:'catch',label:'Catch what you can',detail:'−4 water · −8 condition',effect:s=>{s.resources.water-=4;s.integrity-=8;}},
  ]},
  rain: { eyebrow:'WEATHER REPORT',title:'Rain, at last.',text:'The Geiger counter barely ticks. For a few precious hours, the rain is clean enough to collect.',icon:'water',choices:[
    {id:'collect',label:'Set out the collection barrels',detail:'+7 water · +4 morale',effect:s=>{s.resources.water+=7;s.morale+=4;}},
    {id:'rest',label:'Listen to it from the bunks',detail:'+15 energy · +8 morale',effect:s=>{s.energy+=15;s.morale+=8;}},
  ]},
  power: { eyebrow:'GENERATOR ALERT',title:'A cough. Then silence.',text:'The generator shudders to a stop. The intake is clogged with fine grey dust.',icon:'power',choices:[
    {id:'repair',label:'Replace the intake filter',detail:'−3 scrap · +8 condition',cost:{scrap:3},effect:s=>{s.integrity+=8;}},
    {id:'restart',label:'Force a restart',detail:'−2 fuel · −6 condition',cost:{fuel:2},effect:s=>{s.integrity-=6;}},
    {id:'wait',label:'Spend the night by lantern light',detail:'−10 morale · −10 condition',effect:s=>{s.morale-=10;s.integrity-=10;}},
  ]},
  signal: { eyebrow:'INCOMING TRANSMISSION',title:'Someone is still out there.',text:'Through a wash of static, a voice reads coordinates. A relief network is listening for working emergency beacons. Keep the shelter alive until day 14.',icon:'radio',choices:[
    {id:'listen',label:'Write down the frequency',detail:'+8 morale · +2 scrap from spare radio parts',effect:s=>{s.morale+=8;s.resources.scrap+=2;}},
  ]},
  rats: { eyebrow:'STOCKPILE ALERT',title:'Uninvited dinner guests.',text:'Something small has chewed through a food container. You find the gap beneath a service hatch before it gets any worse.',icon:'food',choices:[
    {id:'seal',label:'Seal the service hatch',detail:'−2 scrap · protect your food',cost:{scrap:2},effect:()=>{}},
    {id:'discard',label:'Discard the damaged rations',detail:'−3 food',effect:s=>{s.resources.food-=3;}},
  ]},
  dust: { eyebrow:'FALLOUT ADVISORY',title:'The sky turns to ash.',text:'A dust front rolls across the old highway. Radiation will rise outside today. The shelter walls creak under the wind.',icon:'radiation',choices:[
    {id:'seal',label:'Reinforce the air seals',detail:'−3 scrap · no shelter damage',cost:{scrap:3},effect:s=>{s.weather='Ash storm';}},
    {id:'weather',label:'Weather the storm',detail:'−12 condition · high radiation outside',effect:s=>{s.weather='Ash storm';s.integrity-=12;}},
  ]},
  meal: { eyebrow:'A SMALL GOOD THING',title:'Dinner feels like home.',text:'An old recipe is found pencilled on the back of a tin label. For once, supper could taste like something from before.',icon:'food',choices:[
    {id:'cook',label:'Make a proper meal',detail:'−3 food · +15 morale · +10 health',cost:{food:3},effect:s=>{s.morale+=15;s.health+=10;}},
    {id:'save',label:'Save the recipe for another day',detail:'+3 morale',effect:s=>{s.morale+=3;}},
  ]},
  cache: { eyebrow:'WASTELAND DISCOVERY',title:'A sealed emergency locker.',text:'Behind a loose panel, you find a civil-defence locker. Its faded red cross is still visible beneath the dust.',icon:'meds',choices:[
    {id:'open',label:'Recover the medical kit',detail:'+1 medicine to your backpack, if there is space',require:s=>bagCount(s)<bagCapacity(s),effect:s=>{s.bag.meds++;}},
    {id:'leave',label:'Leave a marker for someone else',detail:'+4 morale',effect:s=>{s.morale+=4;}},
  ]},
  stranger: { eyebrow:'WASTELAND ENCOUNTER',title:'Footsteps in the rubble.',text:'A lone scavenger lowers their hands when they see you. They are lost, thirsty, and looking for the western road.',icon:'people',choices:[
    {id:'help',label:'Give them water and directions',detail:'−2 water from stockpile · +10 morale · +3 scrap in thanks',cost:{water:2},effect:s=>{s.morale+=10;s.resources.scrap+=3;}},
    {id:'directions',label:'Point them toward the road',detail:'+2 morale',effect:s=>{s.morale+=2;}},
  ]},
};
export function triggerEvent(s,id) { if(!EVENTS[id] || s.pendingEvent) return false; s.pendingEvent=id; return true; }
export function choiceAvailable(s,c) { return (!c.cost || canAfford(s,c.cost)) && (!c.require || c.require(s)); }
export function resolveEvent(s,id) {
  const event=EVENTS[s.pendingEvent]; const choice=event?.choices.find(c=>c.id===id);
  if(!choice || !choiceAvailable(s,choice)) return false;
  if(choice.cost) pay(s,choice.cost);
  choice.effect(s);
  s.eventHistory.push(s.pendingEvent); s.eventHistory=s.eventHistory.slice(-30);
  log(s,`${event.title} ${choice.label}.`);
  s.pendingEvent=null; normalize(s); return true;
}
function rollDailyEvent(s) {
  if(s.day===2 && s.residents.length===1) return triggerEvent(s,'visitor');
  if(s.day===4 && !s.eventHistory.includes('signal')) return triggerEvent(s,'signal');
  const table=['visitor','visitor','trader','leak','rain','power','signal','rats','dust','meal'];
  const last=s.eventHistory.at(-1);
  const pool=table.filter(id=>id!==last && (id!=='visitor' || s.residents.length<capacity(s)));
  triggerEvent(s,pool[Math.floor(random(s)*pool.length)]);
}
function normalize(s) {
  for(const key of ['health','energy','radiation','morale','integrity']) s[key]=clamp(s[key],0,100);
  for(const k of RESOURCE_KEYS) s.resources[k]=Math.max(0,s.resources[k]);
  if(s.health<=0) s.gameOver=true;
}
export function nextDay(s, rested=true) {
  if(s.gameOver) return;
  s.day++; s.minute=rested?8*60:0; s.weather=random(s)<.22?'Dust haze':'Clear skies';
  const mailArrived=rollComputerMail(s,random);
  const roles=s.residents.map(r=>r.role);
  const powered=s.resources.fuel>=1||s.shelter?.rooms?.reactor>0;
  if(powered) { if(s.resources.fuel>=1&&!(s.shelter?.rooms?.reactor>0))s.resources.fuel--; if(s.upgrades.filter)s.resources.water+=4; }
  if(s.upgrades.garden) s.resources.food+=3+(roles.includes('Botanist')?2:0);
  if(roles.includes('Scavenger')&&s.shelter?.rooms?.storage)s.resources.scrap+=2;
  if(roles.includes('Engineer')&&s.shelter?.rooms?.workshop)s.integrity+=4;
  const food=Math.max(1,s.residents.length-(roles.includes('Cook')&&s.shelter?.rooms?.kitchen?1:0));
  const water=s.residents.length*2;
  const shortages=Math.max(0,food-s.resources.food)+Math.max(0,water-s.resources.water);
  s.resources.food=Math.max(0,s.resources.food-food); s.resources.water=Math.max(0,s.resources.water-water);
  // A sheltered night's sleep always heals the player. Missing rations still
  // hurt morale and supplies, but cannot cause an unexplained death in bed.
  if(rested&&s.zone==='shelter')s.health+=12;
  else if(shortages)s.health-=Math.min(shortages*7,Math.max(0,s.health-1));
  if(roles.includes('Medic')&&s.shelter?.rooms?.hospital) s.health+=5;
  s.morale+=shortages?-12:2; if(!powered)s.morale-=6;
  s.integrity-=2;
  if(s.integrity<25)s.health-=rested&&s.zone==='shelter'?0:Math.min(8,Math.max(0,s.health-1));
  if(rested&&s.zone==='shelter') { s.energy=100; s.radiation=Math.max(0,s.radiation-25); }
  log(s,`Day ${s.day}. Used ${food} food and ${water} water.${shortages?' Rations ran short.':''}${!powered?' Generator has no fuel.':''}`,shortages?'warn':'info');
  if(mailArrived)log(s,'New email received at the Shelter 07 computer.','good');
  normalize(s);
  if(!s.gameOver && !s.pendingEvent)rollDailyEvent(s);
}
export function tick(s,dt) {
  if(s.gameOver || s.pendingEvent) return;
  s.minute+=dt*(s.zone==='wasteland'?3:1.5);
  if(s.zone==='wasteland') {
    s.expeditionSeconds+=dt;
    const exposure=s.weather==='Ash storm'?.26:s.weather==='Dust haze'?.15:.095;
    s.radiation+=dt*exposure*(s.upgrades.suit?.5:1);
    s.energy-=dt*.085;
    if(s.radiation>65)s.health-=dt*(s.radiation>85?.7:.22);
  } else s.radiation-=dt*.15;
  if(s.minute>=24*60)nextDay(s);
  normalize(s);
}
export function broadcast(s) {
  if(s.zone!=='shelter'||s.day<14||s.upgrades.radio<2||s.resources.fuel<1||s.gameOver)return false;
  s.signalSent=true; log(s,'Emergency beacon received. You made a home at the end of the world.','good'); return true;
}
export function inviteByRadio(s) {
  if(s.zone!=='shelter'||s.gameOver)return {status:'unavailable'};
  if(s.shelter.radioDay===s.day)return {status:'already'};
  if(s.residents.length>=capacity(s))return {status:'full'};
  s.shelter.radioDay=s.day;
  if(random(s)>=.10){log(s,'Radio invitation sent. No one answered today.');return {status:'no-answer'};}
  const person=PEOPLE.find(p=>!s.residents.some(r=>r.name===p.name));
  if(!person){log(s,'Radio invitation reached no new survivor.');return {status:'no-answer'};}
  s.residents.push({...person});s.morale=clamp(s.morale+5,0,100);log(s,`${person.name} heard the radio and joined Shelter 07.`,'good');return {status:'joined',person};
}
export function restoreSave(raw) {
  try {
    const data=typeof raw==='string'?JSON.parse(raw):raw;
    if(!data || data.version!==1) return null;
    const s=newGame();
    const number=(v,min,max,fallback)=>typeof v==='number'&&Number.isFinite(v)?clamp(v,min,max):fallback;
    for(const k of ['health','energy','radiation','morale','integrity'])s[k]=number(data[k],0,100,s[k]);
    for(const k of ['day','flares','expeditions','scavenged'])s[k]=Math.floor(number(data[k],k==='day'?1:0,100000,s[k]));
    s.seed=number(data.seed,1,4294967295,s.seed)>>>0;
    s.minute=number(data.minute,0,1439,490);
    s.zone=data.zone==='wasteland'?'wasteland':'shelter';
    const limit=s.zone==='shelter'?{x:8.5,z:6.5}:{x:23,z:27};
    s.position={x:number(data.position?.x,-limit.x,limit.x,0),z:number(data.position?.z,-limit.z,limit.z,2)};
    for(const k of RESOURCE_KEYS)s.resources[k]=Math.floor(number(data.resources?.[k],0,100000,s.resources[k]));
    for(const k of Object.keys(UPGRADES))s.upgrades[k]=Math.floor(number(data.upgrades?.[k],0,UPGRADES[k].max,0));
    s.shelter=data.shelter;
    s.residents=[s.residents[0],...PEOPLE.filter(p=>data.residents?.some(r=>r.name===p.name)).map(p=>({...p}))].slice(0,capacity(s));
    let space=bagCapacity(s);
    for(const k of RESOURCE_KEYS){s.bag[k]=Math.floor(number(data.bag?.[k],0,space,0));space-=s.bag[k];}
    if(s.zone==='shelter')for(const k of RESOURCE_KEYS)s.bag[k]=0;
    for(const site of SITES)if(Number.isFinite(data.searched?.[site.id]))s.searched[site.id]=clamp(data.searched[site.id],1,s.day);
    for(const k of ['firstHaul','introSeen','signalSent','continued','encounter'])s[k]=data[k]===true;
    s.gameOver=s.health<=0;
    s.pendingEvent=typeof data.pendingEvent==='string' && Object.hasOwn(EVENTS,data.pendingEvent)?data.pendingEvent:null;
    s.eventHistory=Array.isArray(data.eventHistory)?data.eventHistory.filter(x=>Object.hasOwn(EVENTS,x)).slice(-30):[];
    s.expeditionSeconds=number(data.expeditionSeconds,0,99999,0);
    s.weather=['Clear skies','Dust haze','Ash storm'].includes(data.weather)?data.weather:'Clear skies';
    s.computer=restoreComputer(data.computer,s.day);
    s.log=Array.isArray(data.log)?data.log.filter(x=>x&&typeof x.text==='string').slice(0,45).map(x=>({day:number(x.day,1,100000,1),text:x.text.slice(0,250),kind:['good','warn','info'].includes(x.kind)?x.kind:'info'})):[];
    return s;
  }catch{return null;}
}

