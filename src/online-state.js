// Shared campaign fields. The player's location, pack, health and controls stay on their own device.
const ROOT=['day','minute','seed','weather','morale','integrity','resources','residents','upgrades','searched','shelter','computer','signalSent','eventHistory','pendingEvent','log'];
const FIELD=['starrySands','settlement','defeated','jobs','crewJobs','bike','bike_extra','boats'];
const copy=value=>value===undefined?undefined:structuredClone(value);
export function sharedFrom(state){
  const result=Object.fromEntries(ROOT.map(key=>[key,copy(state[key])]));
  result.field=Object.fromEntries(FIELD.map(key=>[key,copy(state.field?.[key])]));
  return result;
}
export function applyShared(state,shared){
  if(!shared)return state;
  for(const key of ROOT)if(shared[key]!==undefined)state[key]=copy(shared[key]);
  for(const key of FIELD)if(shared.field?.[key]!==undefined)state.field[key]=copy(shared.field[key]);
  return state;
}
export function sharedChanges(before,after){
  const changes={};
  for(const key of ROOT){
    if(key==='resources'){
      const delta={};for(const [resource,n] of Object.entries(after.resources||{})){
        const difference=n-(before.resources?.[resource]||0);if(difference)delta[resource]=difference;
      }if(Object.keys(delta).length)changes.resourcesDelta=delta;
    }else if(JSON.stringify(before[key])!==JSON.stringify(after[key]))changes[key]=copy(after[key]);
  }
  const field={};for(const key of FIELD)if(JSON.stringify(before.field?.[key])!==JSON.stringify(after.field?.[key]))field[key]=copy(after.field?.[key]);
  if(Object.keys(field).length)changes.field=field;
  return changes;
}
export function mergeChanges(current,changes){
  const next=copy(current);
  const previousDay=next.day;
  for(const key of ROOT){
    if(key==='resources')continue;
    if(changes[key]===undefined)continue;
    if(key==='day')next.day=Math.max(next.day||0,changes.day);
    else if(key==='minute')next.minute=next.day>previousDay?changes.minute:Math.max(next.minute||0,changes.minute);
    else if(key==='searched'||key==='upgrades')next[key]={...next[key],...changes[key]};
    else next[key]=copy(changes[key]);
  }
  for(const [key,delta] of Object.entries(changes.resourcesDelta||{}))next.resources[key]=Math.max(0,(next.resources[key]||0)+delta);
  if(changes.field)next.field={...next.field,...copy(changes.field)};
  return next;
}
