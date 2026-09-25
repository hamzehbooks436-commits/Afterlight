// The shelter network is simulated locally. Mail arrives only from game characters.
export const MAIL=[
  {from:'Mara · Field Clinic',subject:'Medical supplies',body:'If you reach the old clinic, look for sealed kits behind the treatment room. Keep one in your field pack.'},
  {from:'North Relay Operator',subject:'Signal from the ridge',body:'The relay is still transmitting on 104.7. The upper floor has spare signal parts if you can reach it.'},
  {from:'Starry Sands Market',subject:'A safe route',body:'The market shelves were picked over, but food remains behind the collapsed shopfront. Watch the road after dark.'},
  {from:'Riccota Waterworks',subject:'Water filter notice',body:'A clean filter is worth more than a full tank. Flush the shelter intake before the next dust front.'},
  {from:'Unknown Survivor',subject:'Is anyone there?',body:'We saw a light over Shelter 07. If your radio still works, keep broadcasting. Someone is listening.'},
  {from:'Azure Port Customs',subject:'Supply manifest',body:'The customs offices kept emergency scrap and medical stores upstairs. The doors may still be sealed.'},
];
export const KIT_LIMITS={food:6,water:8,meds:4,radmed:2};
export const COMPUTER_COLORS={teal:0x608f8b,amber:0xd2a05c,blue:0x708fc2};
export const COMPUTER_LIGHTS={warm:0xffc58e,cool:0x9fdaf2};
export function createComputer(){return {kit:{food:1,water:2,meds:1,radmed:1},mail:[],lastMailDay:1};}
export function restoreComputer(raw,day){
  const result=createComputer();
  for(const key of Object.keys(KIT_LIMITS))result.kit[key]=Number.isInteger(raw?.kit?.[key])?Math.max(0,Math.min(KIT_LIMITS[key],raw.kit[key])):result.kit[key];
  result.mail=Array.isArray(raw?.mail)?raw.mail.filter(m=>Number.isInteger(m?.template)&&m.template>=0&&m.template<MAIL.length&&Number.isInteger(m.day)&&m.day>=1&&m.day<=day).slice(-60).map(m=>({template:m.template,day:m.day,read:m.read===true})):[];
  result.lastMailDay=Number.isInteger(raw?.lastMailDay)?Math.max(1,Math.min(day,raw.lastMailDay)):day;
  return result;
}
export function rollComputerMail(state,random){
  const box=state.computer;if(!box||box.lastMailDay>=state.day)return false;
  box.lastMailDay=state.day;
  if(random(state)>=.25)return false;
  box.mail.push({template:Math.floor(random(state)*MAIL.length),day:state.day,read:false});
  box.mail=box.mail.slice(-60);
  return true;
}
export function changeKit(state,key,delta){
  if(!Object.hasOwn(KIT_LIMITS,key)||!Number.isInteger(delta)||Math.abs(delta)!==1)return false;
  const kit=state.computer.kit,next=kit[key]+delta;
  if(next<0||next>KIT_LIMITS[key]||Object.values(kit).reduce((n,v)=>n+v,0)+delta> (state.upgrades.pack?28:18))return false;
  kit[key]=next;return true;
}
