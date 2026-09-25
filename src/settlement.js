import * as A from './archipelago.js';
import {bagCapacity,bagCount,log} from './state.js';

export const SHADY_SHORES={id:'shady_shores',name:'Shady Shores',...A.mapPoint([990,935])};
export const TRADES={
  food:{label:'3 food for 2 scrap',give:{scrap:2},get:{food:3},limit:4},
  water:{label:'3 water for 2 scrap',give:{scrap:2},get:{water:3},limit:4},
  meds:{label:'1 medicine for 5 scrap',give:{scrap:5},get:{meds:1},limit:2},
  radmed:{label:'1 Rad-Clear dose for 6 scrap',give:{scrap:6},get:{radmed:1},limit:2},
  scrap:{label:'2 scrap for 3 food',give:{food:3},get:{scrap:2},limit:3},
  fuel:{label:'1 fuel for 3 water',give:{water:3},get:{fuel:1},limit:2},
};

export const SETTLERS=[
  {id:'medic',name:'Dr. Amara',role:'Hospital medic',asset:'settler_medic',x:-2,z:-21,work:[[-2,-21],[2,-22]],speech:'Shelter 09 is a hospital now. Our ward stays open to anyone who reaches us.'},
  {id:'trader',name:'Nadia',role:'Market trader',asset:'settler_trader',x:-20,z:8,work:[[-20,8],[-19,7]],speech:'We barter what we can spare. Bring field supplies, and take what you need.'},
  {id:'mechanic',name:'Bram',role:'Repair mechanic',asset:'settler_mechanic',x:22,z:8,work:[[22,8],[24,6]],speech:'Those roofs came from old vehicle panels. Nothing here went to waste.'},
  {id:'guard',name:'Yara',role:'Settlement guard',asset:'settler_guard',x:0,z:26,work:[[0,26],[2,26]],speech:'Shady Shores was built after the fall. Keep your weapon lowered near the hospital.'},
  {id:'resident',name:'Ivo',role:'Home builder',asset:'settler_resident',x:-29,z:-21,work:[[-29,-21],[-27,-18]],speech:'We made a town out of doors, decks, and scrap from the coast.'},
  {id:'nurse',name:'Sera',role:'Hospital nurse',asset:'settler_nurse',x:4,z:-21,work:[[4,-21],[4,-24]],speech:'Clean water and bandages go first to the ward. Dr. Amara handles treatment.'},
];

export function restoreSettlement(raw){
  const stock={};
  for(const [id,offer] of Object.entries(TRADES))stock[id]=Number.isInteger(raw?.stock?.[id])?Math.max(0,Math.min(offer.limit,raw.stock[id])):offer.limit;
  return {day:Number.isInteger(raw?.day)?raw.day:1,stock,lastTreatment:Number.isInteger(raw?.lastTreatment)?raw.lastTreatment:0};
}
export function townState(s){
  const town=s.field.settlement;
  if(town.day!==s.day){town.day=s.day;town.stock=Object.fromEntries(Object.entries(TRADES).map(([id,offer])=>[id,offer.limit]));}
  return town;
}
export function canTrade(s,id){
  if(s.zone!=='wasteland'||!TRADES[id])return false;
  const offer=TRADES[id],town=townState(s),bag=s.bag;
  if(town.stock[id]<1||Object.entries(offer.give).some(([key,n])=>bag[key]<n))return false;
  const capacity=bagCapacity(s)-bagCount(s),out=Object.values(offer.give).reduce((n,v)=>n+v,0),incoming=Object.values(offer.get).reduce((n,v)=>n+v,0);
  return capacity+out>=incoming;
}
export function trade(s,id){
  if(!canTrade(s,id))return false;
  const offer=TRADES[id],town=townState(s),bag=s.bag;
  for(const [key,n] of Object.entries(offer.give))bag[key]-=n;
  for(const [key,n] of Object.entries(offer.get))bag[key]+=n;
  town.stock[id]--;
  log(s,`Traded at Shady Shores: ${offer.label}.`,'good');
  return true;
}
export function canTreat(s){return s.zone==='wasteland'&&townState(s).lastTreatment!==s.day&&s.bag.food>=1&&s.bag.water>=2&&(s.health<100||s.radiation>0);}
export function treat(s){
  if(!canTreat(s))return false;
  s.bag.food--;s.bag.water-=2;s.health=Math.min(100,s.health+45);s.radiation=Math.max(0,s.radiation-30);
  s.field.settlement.lastTreatment=s.day;
  log(s,'Shelter 09 staff treated your wounds and radiation exposure.','good');
  return true;
}

export function buildShadyShores(w){
  const {x,z}=SHADY_SHORES;
  const model=(name,dx,dz,rotation=0)=>w.model(name,x+dx,z+dz,rotation);
  w.settlers=[];
  const path=(ax,az,bx,bz,width=3)=>{
    const dx=bx-ax,dz=bz-az,m=w.box(x+(ax+bx)/2,.035,z+(az+bz)/2,width,.07,Math.hypot(dx,dz),0x9d8c6e,false,'dirt');
    m.rotation.y=Math.atan2(dx,dz);
  };
  path(0,34,27,18,4);path(0,15,0,-13,5);path(-27,8,27,8,4);path(-28,-15,27,-15,3);
  model('shelter09_hospital',0,-25);
  w.volumes.push({x,z:z-25,w:13.8,d:12.8,name:'Shelter 09 hospital'});
  model('settlement_market',-20,6);
  model('settlement_workshop',22,6);
  const homes=[[-27,-24,0],[27,-24,0],[-35,22,Math.PI/2],[35,22,-Math.PI/2],[-39,-11,Math.PI/2],[39,-11,-Math.PI/2]];
  for(const [dx,dz,rotation] of homes)model('settlement_home',dx,dz,rotation);
  for(const [dx,dz] of [[0,-25],[-20,6],[22,6],...homes])w.settlementBuildings.push({x:x+dx,z:z+dz,town:'shady_shores'});
  for(const [dx,dz] of [[-11,-1],[-8,-1],[8,-1],[11,-1]]){
    w.box(x+dx,.25,z+dz,2.3,.5,1.2,0x66523d);
    w.box(x+dx,.55,z+dz,2.08,.14,.95,0x4b673e);
  }
  for(const [dx,dz] of [[-43,-27],[-43,31],[43,-27],[43,31]]){
    w.box(x+dx,1.3,z+dz,.25,2.6,.25,0x615545);
    w.box(x+dx,2.45,z+dz,1.2,.1,.22,0x9f7951);
  }
  w.model('water_tank',x-11,z-35,0,.8);
  w.model('wreck',x+35,z+4,Math.PI/2,.68);
  w.model('crate',x+27,z+12,0,.8);
  w.model('crate',x+29,z+12,0,.65);
  w.box(x,0.15,z+13,2.8,.3,2.8,0x76684f);
  w.box(x,.43,z+13,.9,.25,.9,0x9b5b32,false,null,{emissive:0x934724,emissiveIntensity:1.5});
  w.box(x+1.55,1.15,z+13,.14,2.3,.14,0x5c4d38);
  w.lamp(x+1.55,2.28,z+13,0xffb360,8);
  for(const [dx,dz] of [[-42,8],[42,8],[-10,34],[10,34]]){
    w.box(x+dx,1.1,z+dz,.14,2.2,.14,0x554d3c);
    w.lamp(x+dx,2.3,z+dz,0xffc174,7);
  }
  const gateZ=z+34;
  for(const side of [-1,1]){
    w.box(x+side*4.32,2.9,gateZ,.32,5.8,.32,0x5a5042,true);
    w.box(x+side*4.32,.16,gateZ,.75,.32,.75,0x777367);
    w.box(x+side*4.32,4.62,gateZ,.42,.22,.42,0xb08a58);
  }
  w.box(x,5.73,gateZ,8.9,.22,.45,0x655b4b);
  w.box(x,4.8,gateZ,8.8,2.2,.28,0x444a43);
  w.box(x,3.05,gateZ,7.05,1.7,.28,0x444a43);
  for(const side of [-1,1]){
    const faceZ=gateZ+side*.16,rotation=side>0?0:Math.PI;
    w.sign('SHADY SHORES',x,4.8,faceZ,8.3,rotation,'#f6ddb1');
    w.sign('BUILT AFTER THE FALL',x,3.05,faceZ,6.55,rotation,'#e7d2a6');
  }
  w.sign('SHELTER 09 / COMMUNITY HOSPITAL',x,2.62,z-4.95,4.3,0,'#e6e7cc');
  w.sign('BARTER MARKET',x-20,3.3,z+9.6,3.6);
  w.sign('REPAIR YARD',x+22,3.3,z+9.6,3.6);
  for(const spec of SETTLERS){
    const baseY=spec.id==='medic'||spec.id==='nurse'?-4.08:0;
    const model=w.model(spec.asset,x+spec.x,z+spec.z,0,1,baseY,true);
    w.settlers.push({...spec,model,baseY,homeX:x+spec.x,homeZ:z+spec.z});
  }
  w.target('shelter09_entry','Shelter 09 entrance','Go down to the hospital',x,1.35,z-4.3,{hospitalEntry:true});
  w.target('shelter09_exit','Shelter 09 stairs','Return to the surface',x,-2.68,z-13,{hospitalExit:true});
  w.target('shelter09_triage','Shelter 09 triage','Ask the hospital staff for treatment',x,-2.68,z-18.6,{hospital:true});
}
