import {TOWNS} from './archipelago.js';
import {RESOURCE_KEYS,RESOURCE_NAMES,bagCount,bagCapacity,clamp,log} from './state.js';
import {shelterTownAid,dispatchTownAid,canDispatchTownAid} from './shelter.js';

export const STARRY_SANDS=TOWNS[0];
export const TOWN_BOARD={x:STARRY_SANDS.x-9,z:STARRY_SANDS.z+22};
export const nearTownPoint=(s,x,z,radius=12)=>s.zone==='wasteland'&&Number.isFinite(s.position?.x)&&Number.isFinite(s.position?.z)&&Math.hypot(s.position.x-x,s.position.z-z)<=radius;
export const nearTownBoard=s=>nearTownPoint(s,TOWN_BOARD.x,TOWN_BOARD.z,12);
const nearTown=s=>nearTownPoint(s,STARRY_SANDS.x,STARRY_SANDS.z,140);
const project=(id,type,name,dx,dz,model,first,second,description)=>({id,type,name,dx,dz,x:STARRY_SANDS.x+dx,z:STARRY_SANDS.z+dz,rotation:0,model,levels:[{cost:first,desc:'Clear debris and restore the building'},{cost:second,desc:'Expand and equip the building'}],description});
export const TOWN_PROJECTS=[
  project('home_north','home','North row homes',-68,-38,'renovated_home',{scrap:8,water:2},{scrap:12,water:3},'Three families can settle here; the expansion adds two more beds.'),
  project('home_west','home','West row homes',-66,65,'renovated_home',{scrap:8,water:2},{scrap:12,water:3},'Repair the roof, doors and rooms so survivors have a safe address.'),
  project('home_east','home','East row homes',68,-36,'renovated_home',{scrap:8,water:2},{scrap:12,water:3},'A second home can hold three people, or five after expansion.'),
  project('hospital','hospital','Community hospital',-55,-78,'renovated_clinic',{scrap:14,water:4,meds:1},{scrap:18,meds:2,water:4},'A staffed, powered hospital treats injuries and radiation.'),
  project('shop','shop','Main street shops',-70,10,'renovated_shop',{scrap:10,water:2},{scrap:16,food:3},'Traders and repairers turn salvaged goods into a working high street.'),
  project('school','school','Starry Sands school',30,-85,'renovated_school',{scrap:12,water:3},{scrap:18,food:3},'Teachers give families a reason to stay and raise town morale.'),
  project('farm_west','farm','West field farm',-20,87,'renovated_farm',{scrap:10,water:5},{scrap:15,water:5},'Field beds grow food; a powered greenhouse expands the harvest.'),
  project('farm_east','farm','East field farm',38,85,'renovated_farm',{scrap:10,water:5},{scrap:15,water:5},'A second farm helps feed the people moving into repaired homes.'),
  project('power','power','Town power plant',89,65,'renovated_power',{scrap:16,fuel:2},{scrap:20,fuel:3},'A fuel generator powers two blocks; expansion powers four.'),
  project('waterworks','waterworks','Clean waterworks',-105,65,'town_water_tower',{scrap:12,water:3},{scrap:17,water:4},'Clean water flows while this block has power and a worker.'),
  project('workshop','workshop','Repair workshop',98,15,'renovated_shop',{scrap:12,water:2},{scrap:17,fuel:2},'A staffed workshop reclaims construction materials each day.'),
  project('community','community','Community hall',6,-50,'renovated_school',{scrap:12,food:3},{scrap:18,water:3},'A meeting hall helps neighbours organize care, work and recreation.'),
  project('reactor_link','grid','Shelter 07 reactor link',5,37,'town_reactor_link',{scrap:12,fuel:1},{scrap:18,fuel:2},'A distribution link brings two reactor powered blocks online; upgrade for a wider grid.'),
];
export const TOWN_PROJECT_BY_ID=Object.fromEntries(TOWN_PROJECTS.map(p=>[p.id,p]));
export const TOWN_DECORATIONS={
  planter:{name:'Planter',model:'town_planter',cost:{scrap:2,water:1},description:'Flowers and hardy green shoots.'},
  bench:{name:'Street bench',model:'town_bench',cost:{scrap:3},description:'A place for neighbours to sit.'},
  lamp:{name:'Street lamp',model:'town_lamp',cost:{scrap:4,fuel:1},description:'Lights a lane when the grid has power.'},
  sign:{name:'Town sign',model:'town_sign',cost:{scrap:3},description:'Mark a restored neighbourhood.'},
  fence:{name:'Garden fence',model:'town_fence',cost:{scrap:3},description:'Protect a garden plot.'},
  solar_array:{name:'Solar array',model:'town_solar_array',cost:{scrap:9},description:'Adds one block of daylight power to the grid.'},
  playground:{name:'Playground',model:'town_playground',cost:{scrap:8},description:'Families need somewhere for children to play.'},
  well:{name:'Hand pump well',model:'town_well',cost:{scrap:6},description:'Adds two clean water to town stores each day.'},
  street_tree:{name:'Street tree',model:'town_street_tree',cost:{scrap:2,water:2},description:'A living landmark for the road.'},
  market_stall:{name:'Market stall',model:'town_market_stall',cost:{scrap:5},description:'Adds one scrap a day when the shop is staffed.'},
  greenhouse:{name:'Greenhouse',model:'town_greenhouse',cost:{scrap:9,water:4},description:'Adds two food a day when a farm is staffed.'},
  watch_post:{name:'Watch post',model:'town_watch_post',cost:{scrap:7},description:'A safer place for residents to keep watch.'},
};
export const HOME_DECORATIONS={
  porch_garden:{name:'Porch garden',model:'town_planter',dx:-5,dz:6,cost:{scrap:3,water:1},description:'A planted entrance for the people living here.'},
  seating:{name:'Front seating',model:'town_bench',dx:5,dz:6,cost:{scrap:3},description:'A shared bench for neighbours.'},
  solar_porch:{name:'Solar porch',model:'town_solar_array',dx:5,dz:-5,cost:{scrap:8},description:'Adds one block of daylight power to the town grid.'},
  fenced_yard:{name:'Fenced yard',model:'town_fence',dx:-6,dz:9,cost:{scrap:5},description:'A sheltered outdoor space for this home.'},
};
export const TOWN_DECOR_SLOTS=[
  ['plaza_n',8,-15],['plaza_s',3,10],['plaza_e',42,3],['plaza_w',-50,-24],
  ['lane_ne',35,-55],['lane_nw',-25,-62],['lane_sw',-48,38],['lane_se',51,50],
  ['garden_w',-5,105],['garden_e',67,106],['ridge_e',115,-37],['ridge_w',-109,-28],
].map(([id,dx,dz])=>({id,dx,dz,x:STARRY_SANDS.x+dx,z:STARRY_SANDS.z+dz,rotation:0}));
export const TOWN_DECOR_SLOT_BY_ID=Object.fromEntries(TOWN_DECOR_SLOTS.map(slot=>[slot.id,slot]));
export const TOWN_AID_CONTENTS={food:{food:6},water:{water:8},medicine:{meds:2},materials:{scrap:10}};
export const TOWN_SHOP_OFFERS={
  food:{name:'2 food',resource:'food',amount:2,scrap:2},
  water:{name:'3 water',resource:'water',amount:3,scrap:2},
  meds:{name:'1 medicine',resource:'meds',amount:1,scrap:5},
  fuel:{name:'1 fuel',resource:'fuel',amount:1,scrap:5},
};
export const TOWN_JOB_LABELS={hospital:'Medic',shop:'Shopkeeper',school:'Teacher',farm_west:'Farmer',farm_east:'Farmer',power:'Engineer',waterworks:'Water technician',workshop:'Builder',community:'Organiser'};
const TOWN_JOB_CAPACITY={hospital:2,shop:2,school:2,farm_west:3,farm_east:3,power:2,waterworks:2,workshop:2,community:2};
const SURVIVORS=['Aisha','Mika','Tariq','Leila','Nabil','Hana','Yusuf','Mira','Sami','Farah','Omar','Dina','Rana','Salim','Nora'];
const emptySupplies=()=>Object.fromEntries(RESOURCE_KEYS.map(k=>[k,0]));
const fresh=day=>({projects:Object.fromEntries(TOWN_PROJECTS.map(p=>[p.id,0])),decorations:{},homeDecor:{},supplies:emptySupplies(),residents:[],day,lastInvitation:0,lastTreatment:0,lastRadClearDay:0,morale:55});
export function restoreStarrySands(raw,day=1){
  const town=fresh(day);
  for(const p of TOWN_PROJECTS)if(Number.isInteger(raw?.projects?.[p.id]))town.projects[p.id]=clamp(raw.projects[p.id],0,2);
  for(const slot of TOWN_DECOR_SLOTS){const id=raw?.decorations?.[slot.id];if(Object.hasOwn(TOWN_DECORATIONS,id))town.decorations[slot.id]=id;}
  for(const p of TOWN_PROJECTS.filter(p=>p.type==='home')){const id=raw?.homeDecor?.[p.id];if(town.projects[p.id]&&Object.hasOwn(HOME_DECORATIONS,id))town.homeDecor[p.id]=id;}
  for(const key of RESOURCE_KEYS){const n=raw?.supplies?.[key];if(Number.isFinite(n))town.supplies[key]=clamp(Math.floor(n),0,100000);}
  const seen=new Set();
  for(const r of Array.isArray(raw?.residents)?raw.residents:[]){
    if(!SURVIVORS.includes(r?.name)||seen.has(r.name))continue;
    seen.add(r.name);
    town.residents.push({name:r.name,home:TOWN_PROJECT_BY_ID[r.home]?.type==='home'?r.home:null,job:Object.hasOwn(TOWN_JOB_CAPACITY,r.job)?r.job:null});
  }
  town.day=Number.isInteger(raw?.day)?clamp(raw.day,1,day):day;
  town.lastInvitation=Number.isInteger(raw?.lastInvitation)?clamp(raw.lastInvitation,0,day):0;
  town.lastTreatment=Number.isInteger(raw?.lastTreatment)?clamp(raw.lastTreatment,0,day):0;
  town.lastRadClearDay=Number.isInteger(raw?.lastRadClearDay)?clamp(raw.lastRadClearDay,0,day):0;
  town.morale=Number.isFinite(raw?.morale)?clamp(Math.round(raw.morale),0,100):55;
  reconcileResidents(town);
  return town;
}
function reconcileResidents(town){
  for(const resident of town.residents){
    if(!resident.home||town.projects[resident.home]<1)resident.home=firstOpenHome(town);
    if(resident.job&&town.projects[resident.job]<1)resident.job=null;
  }
}
const owned=(town,id)=>town.projects[id]||0;
const canManage=(s,{remote=false}={})=>!s.gameOver&&(remote?s.zone==='shelter':nearTown(s));
const canManageAt=(s,points,options={})=>canManage(s,options)&&(options.remote||nearTownBoard(s)||points.some(p=>p&&nearTownPoint(s,p.x,p.z,12)));
const projectEntrance=id=>{const p=TOWN_PROJECT_BY_ID[id];return p?{x:p.x,z:p.z+7}:null;};
const decorEntrance=id=>{const p=TOWN_DECOR_SLOT_BY_ID[id];return p?{x:p.x,z:p.z+3.2}:null;};
const homeCapacity=(town,id)=>owned(town,id)?owned(town,id)===2?5:3:0;
const firstOpenHome=town=>TOWN_PROJECTS.filter(p=>p.type==='home').map(p=>p.id).find(id=>town.residents.filter(r=>r.home===id).length<homeCapacity(town,id))||null;
export function townBeds(s){const town=townState(s);return TOWN_PROJECTS.filter(p=>p.type==='home').reduce((sum,p)=>sum+homeCapacity(town,p.id),0);}
export function townState(s){
  if(!s.field.starrySands)s.field.starrySands=fresh(s.day);
  if(s.field.starrySands.day<s.day)advanceTownDay(s);
  return s.field.starrySands;
}
export function townFunds(s){const t=townState(s);return Object.fromEntries(RESOURCE_KEYS.map(k=>[k,t.supplies[k]+(nearTown(s)?s.bag[k]:0)]));}
export function canPayTown(s,cost){const funds=townFunds(s);return Object.entries(cost).every(([key,n])=>funds[key]>=n);}
function payTown(s,cost){if(!canPayTown(s,cost))return false;const town=townState(s);for(const [key,n] of Object.entries(cost)){const fromTown=Math.min(town.supplies[key],n);town.supplies[key]-=fromTown;if(n>fromTown)s.bag[key]-=n-fromTown;}return true;}
export function canRenovate(s,id,options={}){const p=TOWN_PROJECT_BY_ID[id],town=townState(s);return !!p&&canManageAt(s,[projectEntrance(id)],options)&&owned(town,id)<2&&canPayTown(s,p.levels[owned(town,id)].cost);}
export function renovate(s,id,options={}){
  if(!canRenovate(s,id,options))return false;
  const town=townState(s),p=TOWN_PROJECT_BY_ID[id],level=owned(town,id);
  payTown(s,p.levels[level].cost);town.projects[id]=level+1;
  town.morale=clamp(town.morale+(level?3:5),0,100);
  log(s,`${p.name} ${level?'expanded':'repaired'} in Starry Sands.`,'good');
  return true;
}
export function canPlaceDecoration(s,slotId,decorId,options={}){const slot=TOWN_DECOR_SLOT_BY_ID[slotId],decor=TOWN_DECORATIONS[decorId],town=townState(s);return !!slot&&!!decor&&canManageAt(s,[decorEntrance(slotId)],options)&&town.decorations[slotId]!==decorId&&canPayTown(s,decor.cost);}
export function placeDecoration(s,slotId,decorId,options={}){if(!canPlaceDecoration(s,slotId,decorId,options))return false;const town=townState(s),decor=TOWN_DECORATIONS[decorId];payTown(s,decor.cost);town.decorations[slotId]=decorId;town.morale=clamp(town.morale+1,0,100);log(s,`Placed ${decor.name.toLowerCase()} in Starry Sands.`,'good');return true;}
export function canRemoveDecoration(s,slotId,options={}){return !!TOWN_DECOR_SLOT_BY_ID[slotId]&&canManageAt(s,[decorEntrance(slotId)],options)&&!!townState(s).decorations[slotId];}
export function removeDecoration(s,slotId,options={}){if(!canRemoveDecoration(s,slotId,options))return false;delete townState(s).decorations[slotId];log(s,'Cleared a Starry Sands decoration plot.');return true;}
export function canDecorateHome(s,homeId,decorId,options={}){
  const p=TOWN_PROJECT_BY_ID[homeId],decor=HOME_DECORATIONS[decorId],town=townState(s);
  return p?.type==='home'&&!!decor&&town.projects[homeId]>=1&&town.homeDecor[homeId]!==decorId&&canManageAt(s,[projectEntrance(homeId)],options)&&canPayTown(s,decor.cost);
}
export function decorateHome(s,homeId,decorId,options={}){
  if(!canDecorateHome(s,homeId,decorId,options))return false;
  const town=townState(s),decor=HOME_DECORATIONS[decorId];payTown(s,decor.cost);town.homeDecor[homeId]=decorId;
  town.morale=clamp(town.morale+1,0,100);log(s,`${TOWN_PROJECT_BY_ID[homeId].name} now has ${decor.name.toLowerCase()}.`,'good');return true;
}
export function depositTownSupplies(s,key='all'){
  if(s.gameOver||!nearTownBoard(s)||key!=='all'&&!RESOURCE_KEYS.includes(key))return false;
  const town=townState(s),keys=key==='all'?RESOURCE_KEYS:[key];let total=0;
  for(const item of keys){const amount=Math.max(0,Math.floor(s.bag[item]||0));town.supplies[item]+=amount;s.bag[item]-=amount;total+=amount;}
  if(total)log(s,`Delivered ${total} supplies to Starry Sands stores.`,'good');
  return total;
}
export function canSendTownAid(s,kind){return Object.hasOwn(TOWN_AID_CONTENTS,kind)&&(s.zone==='shelter'||nearTownBoard(s))&&canDispatchTownAid(s,kind);}
export function sendTownAid(s,kind){
  if(!canSendTownAid(s,kind))return false;
  const shipment=dispatchTownAid(s,kind);if(!shipment)return false;
  const town=townState(s);for(const [key,n] of Object.entries(TOWN_AID_CONTENTS[kind]))town.supplies[key]+=n*shipment.amount;
  log(s,`${kind==='materials'?'Repair materials':kind==='medicine'?'Medical supplies':kind} reached Starry Sands stores.`,'good');
  return true;
}
export function canInviteTownResident(s,options={}){const town=townState(s);return canManageAt(s,[],options)&&town.lastInvitation!==s.day&&town.residents.length<townBeds(s)&&town.supplies.food>=2&&town.supplies.water>=2&&SURVIVORS.some(name=>!town.residents.some(r=>r.name===name));}
export function inviteTownResident(s,options={}){
  if(!canInviteTownResident(s,options))return null;
  const town=townState(s),name=SURVIVORS.find(person=>!town.residents.some(r=>r.name===person));
  town.supplies.food-=2;town.supplies.water-=2;town.lastInvitation=s.day;
  const resident={name,home:firstOpenHome(town),job:null};town.residents.push(resident);
  town.morale=clamp(town.morale+3,0,100);log(s,`${name} moved into a repaired home in Starry Sands.`,'good');return resident;
}
export function canAssignTownResident(s,name,job,options={}){
  const town=townState(s),r=town.residents.find(r=>r.name===name);
  return !!r&&canManageAt(s,[projectEntrance(r.home),projectEntrance(job||r.job)],options)&&(job===null||Object.hasOwn(TOWN_JOB_CAPACITY,job)&&town.projects[job]>=1&&town.residents.filter(r=>r.job===job&&r.name!==name).length<TOWN_JOB_CAPACITY[job]);
}
export function assignTownResident(s,name,job,options={}){
  if(!canAssignTownResident(s,name,job,options))return false;
  const town=townState(s),r=town.residents.find(r=>r.name===name);
  r.job=job;log(s,`${name} ${job?`started work as a ${TOWN_JOB_LABELS[job]}`:'left their assigned shift'} in Starry Sands.`,'good');return true;
}
export function canMoveTownResident(s,name,home,options={}){
  const town=townState(s),r=town.residents.find(r=>r.name===name);
  return !!r&&canManageAt(s,[projectEntrance(r.home),projectEntrance(home)],options)&&TOWN_PROJECT_BY_ID[home]?.type==='home'&&town.residents.filter(person=>person.home===home&&person.name!==name).length<homeCapacity(town,home);
}
export function moveTownResident(s,name,home,options={}){
  if(!canMoveTownResident(s,name,home,options))return false;
  const town=townState(s),r=town.residents.find(r=>r.name===name);
  r.home=home;return true;
}
export const isTownDaylight=s=>s.minute>=6*60&&s.minute<18*60;
export function townGrid(s,minute=s.minute){
  const town=s.field.starrySands||fresh(s.day),aid=shelterTownAid(s),decor=Object.values(town.decorations);
  const plant=town.projects.power||0,link=town.projects.reactor_link||0;
  const local=(plant&&town.supplies.fuel>0?plant===2?4:2:0)+(minute>=6*60&&minute<18*60?decor.filter(id=>id==='solar_array').length+Object.values(town.homeDecor||{}).filter(id=>id==='solar_porch').length:0);
  const reactor=link?Math.min(aid.power,link===2?8:2):0;
  const priority=['hospital','waterworks','school','shop','workshop','community','farm_west','farm_east','home_north','home_west','home_east'];
  const demand=priority.filter(id=>town.projects[id]>=1&&(id.startsWith('home_')||id.startsWith('farm_')?town.projects[id]>=2:true));
  const powered=demand.slice(0,local+reactor),shelterPowered=powered.slice(local);
  return {local,reactor,capacity:local+reactor,demand:demand.length,powered,shelterPowered};
}
export function townSummary(s){
  const town=townState(s),grid=townGrid(s),built=TOWN_PROJECTS.filter(p=>town.projects[p.id]>0).length,decorations=Object.keys(town.decorations).length;
  return {built,total:TOWN_PROJECTS.length,decorations,residents:town.residents.length,beds:townBeds(s),morale:town.morale,grid};
}
const staffed=(town,id)=>town.residents.filter(r=>r.job===id).length;
const powered=(grid,id)=>grid.powered.includes(id);
export function advanceTownDay(s){
  const town=s.field.starrySands;if(!town)return;
  // Damaged or very old saves should not replay thousands of town shifts at once.
  if(s.day-town.day>30)town.day=s.day-30;
  while(town.day<s.day){
    const grid=townGrid(s,12*60),level=id=>town.projects[id]||0;
    town.day++;
    if(level('power')&&town.supplies.fuel>0)town.supplies.fuel--;
    let food=0,water=0,scrap=0;
    for(const id of ['farm_west','farm_east'])if(level(id)&&staffed(town,id))food+=2+staffed(town,id)+(level(id)===2&&powered(grid,id)?2:0);
    if(level('waterworks')&&powered(grid,'waterworks')&&staffed(town,'waterworks'))water+=3+level('waterworks')*2+staffed(town,'waterworks');
    water+=Object.values(town.decorations).filter(id=>id==='well').length*2;
    if(Object.values(town.decorations).includes('greenhouse')&&['farm_west','farm_east'].some(id=>staffed(town,id)))food+=2;
    if(level('workshop')&&powered(grid,'workshop')&&staffed(town,'workshop'))scrap+=level('workshop')+staffed(town,'workshop');
    if(level('shop')&&powered(grid,'shop')&&staffed(town,'shop'))scrap+=1+(level('shop')===2?1:0)+Object.values(town.decorations).filter(id=>id==='market_stall').length;
    town.supplies.food=clamp(town.supplies.food+food,0,100000);town.supplies.water=clamp(town.supplies.water+water,0,100000);town.supplies.scrap=clamp(town.supplies.scrap+scrap,0,100000);
    const people=town.residents.length,shortFood=Math.max(0,people-town.supplies.food),shortWater=Math.max(0,people*2-town.supplies.water);
    town.supplies.food=Math.max(0,town.supplies.food-people);town.supplies.water=Math.max(0,town.supplies.water-people*2);
    town.morale=clamp(town.morale+(shortFood||shortWater?-6:people?1:0)+(level('school')&&powered(grid,'school')&&staffed(town,'school')?2:0)+(level('community')&&powered(grid,'community')&&staffed(town,'community')?2:0),0,100);
    if(food||water||scrap||people)log(s,`Starry Sands: +${food} food, +${water} water, +${scrap} scrap; ${people} residents fed${shortFood||shortWater?' with shortages':''}.`,shortFood||shortWater?'warn':'info');
  }
}
export function canTreatInTown(s){const town=townState(s),grid=townGrid(s);return !s.gameOver&&nearTownPoint(s,TOWN_PROJECT_BY_ID.hospital.x,TOWN_PROJECT_BY_ID.hospital.z+7,12)&&town.projects.hospital>=1&&grid.powered.includes('hospital')&&town.residents.some(r=>r.job==='hospital')&&town.lastTreatment!==s.day&&town.supplies.meds>=1&&town.supplies.water>=1&&(s.health<100||s.radiation>0);}
export function treatInTown(s){if(!canTreatInTown(s))return false;const town=townState(s);town.supplies.meds--;town.supplies.water--;town.lastTreatment=s.day;s.health=clamp(s.health+50,0,100);s.radiation=clamp(s.radiation-35,0,100);log(s,'Starry Sands hospital staff treated your injuries and radiation.','good');return true;}
export function canUseTownRadClear(s){const town=townState(s),grid=townGrid(s);return !s.gameOver&&nearTownPoint(s,TOWN_PROJECT_BY_ID.hospital.x,TOWN_PROJECT_BY_ID.hospital.z+7,12)&&town.projects.hospital>=1&&grid.powered.includes('hospital')&&town.residents.some(r=>r.job==='hospital')&&town.lastRadClearDay!==s.day&&town.supplies.radmed>=1&&town.supplies.water>=1&&s.radiation>0;}
export function useTownRadClear(s){if(!canUseTownRadClear(s))return false;const town=townState(s);town.supplies.radmed--;town.supplies.water--;town.lastRadClearDay=s.day;s.radiation=0;log(s,'Starry Sands hospital used town-stored Rad-Clear to remove your radiation.','good');return true;}
export function canShopInTown(s,id){
  const offer=TOWN_SHOP_OFFERS[id],town=townState(s),shop=TOWN_PROJECT_BY_ID.shop;
  return !!offer&&!s.gameOver&&nearTownPoint(s,shop.x,shop.z+7,12)&&town.projects.shop>=1&&townGrid(s).powered.includes('shop')&&town.residents.some(r=>r.job==='shop')&&s.bag.scrap>=offer.scrap&&town.supplies[offer.resource]>=offer.amount&&bagCount(s)-offer.scrap+offer.amount<=bagCapacity(s);
}
export function shopInTown(s,id){
  if(!canShopInTown(s,id))return false;
  const town=townState(s),offer=TOWN_SHOP_OFFERS[id];s.bag.scrap-=offer.scrap;town.supplies.scrap+=offer.scrap;town.supplies[offer.resource]-=offer.amount;s.bag[offer.resource]+=offer.amount;
  log(s,`Bought ${offer.name} from Starry Sands shops for ${offer.scrap} carried scrap.`,'good');return true;
}
export function townProjectStatus(s,id){
  const p=TOWN_PROJECT_BY_ID[id],town=townState(s);if(!p)return null;
  const level=town.projects[id],next=level<2?p.levels[level].cost:null;
  return {project:p,level,next,affordable:next?canPayTown(s,next):false,staff:staffed(town,id),powered:townGrid(s).powered.includes(id)};
}
export function townSuppliesLabel(s){const town=townState(s);return RESOURCE_KEYS.map(k=>`${town.supplies[k]} ${RESOURCE_NAMES[k]}`).join(' · ');}
