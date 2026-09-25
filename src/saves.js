import {SAVE_KEY} from './state.js';
import {restoreCampaign} from './field.js';

export const SLOTS_KEY='afterlight.slots.v1';
export const SLOT_COUNT=5;
export function readSlots(storage){
  const book={version:1,active:0,slots:Array(SLOT_COUNT).fill(null)};
  const raw=storage.getItem(SLOTS_KEY);
  if(raw){
    // Keep unreadable storage intact instead of silently overwriting it.
    const data=JSON.parse(raw);if(data.version!==1||!Array.isArray(data.slots))throw new Error('Unreadable save library');
    for(let i=0;i<SLOT_COUNT;i++){const slot=data.slots[i];if(slot&&restoreCampaign(slot.state))book.slots[i]={name:String(slot.name||`Journey ${i+1}`).slice(0,40),savedAt:Number(slot.savedAt)||0,state:slot.state};}
    book.active=Number.isInteger(data.active)&&data.active>=0&&data.active<SLOT_COUNT?data.active:0;
  }else{
    const legacy=restoreCampaign(storage.getItem(SAVE_KEY));
    if(legacy)book.slots[0]={name:'Original journey',savedAt:Date.now(),state:legacy};
  }
  return book;
}
export function writeSlot(storage,book,index,state,name){
  if(!Number.isInteger(index)||index<0||index>=SLOT_COUNT)throw new Error('Invalid slot');
  const next=structuredClone(book);next.active=index;next.slots[index]={name:(name||next.slots[index]?.name||`Journey ${index+1}`).slice(0,40),savedAt:Date.now(),state:structuredClone(state)};
  storage.setItem(SLOTS_KEY,JSON.stringify(next));return next;
}
