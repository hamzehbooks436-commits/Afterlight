import {canAfford, pay, clamp, log} from './state.js';

export const SHELTER_LIMIT=48;
export const FLOOR_HEIGHT=4.4;
export const MAX_FLOORS=9;
export const SLOTS=[
  {name:'North west',x:-35,z:-10},{name:'South west',x:-35,z:10},
  {name:'North middle',x:-25,z:-10},{name:'South middle',x:-25,z:10},
  {name:'North east',x:-15,z:-10},{name:'South east',x:-15,z:10},
];
export const ROOMS={
  hospital:{name:'Hospital',color:0xffc99c,cost:{scrap:18,meds:2},max:2,detail:'Treatment, recovery beds and a dedicated medic station.'},
  kitchen:{name:'Kitchen & mess',color:0xffce88,cost:{scrap:14},max:2,detail:'Daily meals and a common table.'},
  bedrooms:{name:'Bedrooms',color:0xffd2a0,cost:{scrap:12},max:2,detail:'Actual beds for sleeping residents and a place to rest.'},
  workshop:{name:'Workshop',color:0xffbe7c,cost:{scrap:20,fuel:2},max:2,detail:'Repairs, salvage, generator and ammunition.'},
  garden:{name:'Garden',color:0xffd99a,cost:{scrap:16,water:4},max:2,detail:'Grow food and tend plants.'},
  waterworks:{name:'Water filter room',color:0xffd0a0,cost:{scrap:18,fuel:1},max:2,detail:'Filter and store clean water.'},
  storage:{name:'Storage room',color:0xffbc83,cost:{scrap:10},max:2,detail:'Organized supply shelves and salvage.'},
  gym:{name:'Gym',color:0xffca95,cost:{scrap:12},max:2,detail:'Training restores energy and morale.'},
  computer:{name:'Computer room',color:0xa9d4c9,cost:{scrap:18,fuel:1},max:2,detail:'A dedicated computer room with terminals, servers and customizable decor. Floors 2–9 only.'},
  reactor:{name:'Nuclear reactor',color:0xffdcaa,cost:{scrap:30,fuel:4,water:4},max:2,detail:'Protected reactor that generates fuel and supports shelter power. Floors 8 and 9 only.'},
};
export const COMPUTER_DECOR={color:['teal','amber','blue'],light:['warm','cool'],layout:['paired','wall']};
const decorOf=raw=>({color:COMPUTER_DECOR.color.includes(raw?.color)?raw.color:'teal',light:COMPUTER_DECOR.light.includes(raw?.light)?raw.light:'warm',layout:COMPUTER_DECOR.layout.includes(raw?.layout)?raw.layout:'paired'});
const blank=()=>Array(6).fill(null);
export function roomAt(s,floor,slot){return s.shelter.slots[floor-1]?.[slot]||null;}
export function placements(s,id){const found=[];for(let floor=1;floor<=s.shelter.floors;floor++)for(let slot=0;slot<6;slot++){const room=roomAt(s,floor,slot);if(room&&(!id||room.id===id))found.push({floor,slot,room,...SLOTS[slot],y:(floor-1)*FLOOR_HEIGHT});}return found;}
export function refreshRooms(s){s.shelter.rooms=Object.fromEntries(Object.keys(ROOMS).map(id=>[id,Math.max(0,...placements(s,id).map(p=>p.room.level))]));s.shelter.rooms.farm=s.shelter.rooms.garden;}
export function createShelter(){const s={floors:1,slots:[blank()],rooms:{},duties:{},assignments:{},deaths:0,radioDay:0};s.slots[0][0]={id:'hospital',level:1};s.slots[0][1]={id:'kitchen',level:1};s.slots[0][2]={id:'bedrooms',level:1};s.slots[0][3]={id:'workshop',level:1};refreshRooms({shelter:s});return s;}
export function restoreShelter(raw){
  const s=createShelter();
  if(Array.isArray(raw?.slots)){
    s.floors=clamp(Math.floor(Number(raw.floors)||1),1,MAX_FLOORS);
    s.slots=Array.from({length:s.floors},(_,i)=>Array.from({length:6},(_,j)=>{const r=raw.slots[i]?.[j];return r&&Object.hasOwn(ROOMS,r.id)&&(r.id!=='reactor'||i+1>=8)&&(r.id!=='computer'||i+1>=2)?{id:r.id,level:clamp(Math.floor(r.level)||1,1,2),...(r.id==='computer'?{decor:decorOf(r.decor)}:{})}:null;}));
  }else if(raw?.rooms){
    s.slots=[blank()];const ids=['hospital','kitchen','bedrooms','workshop','garden','waterworks'];
    ids.forEach((id,i)=>{const old=id==='garden'?raw.rooms.farm:raw.rooms[id];if(Number.isFinite(old)&&old>0)s.slots[0][i]={id,level:clamp(Math.floor(old),1,2)};});
    if(!s.slots[0].some(Boolean))s.slots=createShelter().slots;
  }
  if(!s.slots.some(floor=>floor.some(room=>room?.id==='bedrooms'))){const floor=s.slots.findIndex(row=>row.includes(null));if(floor>=0)s.slots[floor][s.slots[floor].indexOf(null)]={id:'bedrooms',level:1};else if(s.floors<MAX_FLOORS){s.slots.push(blank());s.slots[s.floors][0]={id:'bedrooms',level:1};s.floors++;}}
  s.duties=Object.fromEntries(Object.entries(raw?.duties||{}).filter(([k,v])=>/^(\d+[-_]\d+|[a-z]+)$/.test(k)&&Number.isFinite(v)).map(([k,v])=>[k,clamp(Math.floor(v),0,1000000)]));
  s.assignments=Object.fromEntries(Object.entries(raw?.assignments||{}).filter(([name,place])=>/^[A-Za-z]{1,30}$/.test(name)&&Number.isInteger(place?.floor)&&Number.isInteger(place?.slot)&&place.floor>=1&&place.floor<=s.floors&&place.slot>=0&&place.slot<6&&s.slots[place.floor-1][place.slot]&&s.slots[place.floor-1][place.slot].id!=='bedrooms').map(([name,place])=>[name,{floor:place.floor,slot:place.slot}]));
  if(!Array.isArray(raw?.slots))for(const [oldId,value] of Object.entries(raw?.duties||{})){const id=oldId==='farm'?'garden':oldId;if(!Number.isFinite(value))continue;for(let floor=1;floor<=s.floors;floor++)for(let slot=0;slot<6;slot++)if(s.slots[floor-1][slot]?.id===id)s.duties[`${floor}-${slot}`]=clamp(Math.floor(value),0,1000000);}
  s.deaths=clamp(Math.floor(raw?.deaths)||0,0,1000000);s.radioDay=clamp(Math.floor(raw?.radioDay)||0,0,1000000);refreshRooms({shelter:s});return s;
}
export function floorCost(s){return {scrap:8+2*s.shelter.floors,fuel:Math.max(0,Math.floor(s.shelter.floors/3))};}
export function addFloor(s){if(s.gameOver||s.zone!=='shelter'||s.shelter.floors>=MAX_FLOORS||!pay(s,floorCost(s)))return false;s.shelter.floors++;s.shelter.slots.push(blank());log(s,`Floor ${s.shelter.floors} is ready for room placement.`,'good');return true;}
export function roomCost(s,id,floor=1,slot=0){const room=roomAt(s,floor,slot),next=room?.id===id?room.level+1:1;return Object.fromEntries(Object.entries(ROOMS[id]?.cost||{}).map(([k,n])=>[k,n*next]));}
export function buildRoom(s,id,floor=1,slot=0){
  const existing=roomAt(s,floor,slot),type=ROOMS[id];
  if(s.gameOver||s.zone!=='shelter'||!type||floor<1||floor>s.shelter.floors||slot<0||slot>=6||id==='reactor'&&floor<8||id==='computer'&&floor<2||existing&&existing.id!==id||existing?.level>=type.max||!pay(s,roomCost(s,id,floor,slot)))return false;
  s.shelter.slots[floor-1][slot]={id,level:(existing?.level||0)+1,...(id==='computer'?{decor:decorOf(existing?.decor)}:{})};refreshRooms(s);log(s,`${type.name} ${existing?'upgraded':'placed'} on floor ${floor}, ${SLOTS[slot].name}.`,'good');return true;
}
export function moveRoom(s,fromFloor,fromSlot,toFloor,toSlot){
  if(s.gameOver||s.zone!=='shelter'||fromFloor===toFloor&&fromSlot===toSlot||toFloor<1||toFloor>s.shelter.floors||![fromSlot,toSlot].every(n=>Number.isInteger(n)&&n>=0&&n<6))return false;
  const a=roomAt(s,fromFloor,fromSlot),b=roomAt(s,toFloor,toSlot);
  if(!a||a.id==='reactor'&&toFloor<8||b?.id==='reactor'&&fromFloor<8||a.id==='computer'&&toFloor<2||b?.id==='computer'&&fromFloor<2)return false;
  const fromKey=`${fromFloor}-${fromSlot}`,toKey=`${toFloor}-${toSlot}`,fromDuty=s.shelter.duties[fromKey],toDuty=s.shelter.duties[toKey];
  s.shelter.slots[fromFloor-1][fromSlot]=b;s.shelter.slots[toFloor-1][toSlot]=a;
  if(toDuty===undefined)delete s.shelter.duties[fromKey];else s.shelter.duties[fromKey]=toDuty;
  if(fromDuty===undefined)delete s.shelter.duties[toKey];else s.shelter.duties[toKey]=fromDuty;
  for(const place of Object.values(s.shelter.assignments)){
    if(place.floor===fromFloor&&place.slot===fromSlot){place.floor=toFloor;place.slot=toSlot;}
    else if(place.floor===toFloor&&place.slot===toSlot){place.floor=fromFloor;place.slot=fromSlot;}
  }
  refreshRooms(s);log(s,`${ROOMS[a.id].name} moved to floor ${toFloor}, ${SLOTS[toSlot].name}.`,'good');return true;
}
export function assignResident(s,name,floor=null,slot=null){
  if(s.zone!=='shelter'||!s.residents.slice(1).some(person=>person.name===name))return false;
  if(floor===null){delete s.shelter.assignments[name];return true;}
  const room=roomAt(s,floor,slot);
  if(!Number.isInteger(floor)||!Number.isInteger(slot)||!room||room.id==='bedrooms')return false;
  s.shelter.assignments[name]={floor,slot};
  log(s,`${name} assigned to ${ROOMS[room.id].name} on floor ${floor}.`,'good');return true;
}
export function customizeComputerRoom(s,floor,slot,kind,value){
  const room=roomAt(s,floor,slot);
  if(s.zone!=='shelter'||room?.id!=='computer'||!COMPUTER_DECOR[kind]?.includes(value))return false;
  room.decor=decorOf({...room.decor,[kind]:value});return true;
}
export function serviceCost(s,id,floor=1,slot=0){return id==='hospital'?(roomAt(s,floor,slot)?.level>=2?{}:{meds:1}):id==='garden'?{water:2}:id==='kitchen'?{food:1,water:1}:id==='waterworks'?{fuel:1}:id==='reactor'?{scrap:2,water:2}:{};}
export function serviceAvailable(s,id,floor=1,slot=0){const found=roomAt(s,floor,slot);return !s.gameOver&&s.zone==='shelter'&&found?.id===id&&id!=='computer'&&(id==='hospital'?(s.health<100||s.radiation>0):s.shelter.duties[`${floor}-${slot}`]!==s.day)&&canAfford(s,serviceCost(s,id,floor,slot));}
export function useRoom(s,id,floor=1,slot=0){
  if(!serviceAvailable(s,id,floor,slot))return false;pay(s,serviceCost(s,id,floor,slot));const level=roomAt(s,floor,slot).level;
  if(id==='hospital'){s.health=100;s.radiation=0;}
  if(id==='garden')s.resources.food+=8*level;
  if(id==='waterworks')s.resources.water+=10*level;
  if(id==='workshop')s.resources.scrap+=6*level;
  if(id==='storage')s.resources.scrap+=3*level;
  if(id==='reactor'){s.resources.fuel+=6*level;s.integrity=clamp(s.integrity+5,0,100);}
  if(id==='gym'){s.energy=100;s.morale=clamp(s.morale+8*level,0,100);}
  if(id==='kitchen'){s.energy=100;s.health=clamp(s.health+25,0,100);if(level===2)s.resources.food+=3;}
  if(id==='bedrooms'){s.energy=100;s.health=clamp(s.health+20*level,0,100);s.morale=clamp(s.morale+10,0,100);}
  s.shelter.duties[`${floor}-${slot}`]=s.day;log(s,`${ROOMS[id].name}: shift completed on floor ${floor}.`,'good');return true;
}

// Shelter 07 can supply Starry Sands without moving the player back indoors.
// Power is continuous capacity; the other forms of aid are paid shipments from
// the shelter stockpile. The town decides which projects receive each shipment.
export const TOWN_AID={
  food:{name:'Food convoy',cost:{food:6,water:2},facility:'kitchen',amount:1},
  water:{name:'Clean-water convoy',cost:{water:8,scrap:1},facility:'water',amount:1},
  medicine:{name:'Medical team',cost:{meds:2,water:2},facility:'hospital',amount:1},
  materials:{name:'Repair materials',cost:{scrap:10,fuel:1},facility:'workshop',amount:1},
};
export function shelterTownAid(s){
  const level=id=>(s.shelter?.slots||[]).flat().reduce((total,room)=>total+(room?.id===id?room.level||1:0),0);
  const reactors=level('reactor');
  return {
    // One reactor powers two town blocks. Additional reactors or upgrades can
    // bring more blocks online after Starry Sands builds its local distribution.
    power:reactors*2,
    food:level('kitchen')+level('garden'),
    water:level('waterworks')+(s.upgrades?.filter?1:0),
    medicine:level('hospital'),
    materials:level('workshop')+level('storage'),
    radio:s.upgrades?.radio||0,
  };
}
export function canDispatchTownAid(s,kind){
  const aid=TOWN_AID[kind];if(!aid||s.gameOver)return false;
  const capacity=shelterTownAid(s);
  const facility=aid.facility==='water'?'water':aid.facility==='kitchen'?'food':aid.facility==='hospital'?'medicine':'materials';
  return capacity[facility]>0&&canAfford(s,aid.cost);
}
export function dispatchTownAid(s,kind){
  if(!canDispatchTownAid(s,kind))return null;
  const aid=TOWN_AID[kind];pay(s,aid.cost);
  log(s,`Shelter 07 sent ${aid.name.toLowerCase()} to Starry Sands.`,'good');
  return {kind,amount:aid.amount};
}
export function respawn(s){
  if(!s.gameOver&&s.health>0)return false;s.shelter.deaths++;s.gameOver=false;s.health=100;s.energy=100;s.radiation=0;s.zone='shelter';
  const hospital=placements(s,'hospital')[0];s.position=hospital?{x:hospital.x,y:hospital.y,z:hospital.z+3}:{x:0,y:0,z:5.5};s.field.yaw=0;s.field.pitch=0;s.field.stamina=100;
  for(const k of Object.keys(s.bag))s.bag[k]=0;s.encounter=false;s.expeditionSeconds=0;
  log(s,'Rescued in Shelter 07. Carried supplies were lost; shelter progress and weapons are safe.','warn');return true;
}
