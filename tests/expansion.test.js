import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,restoreCampaign,advance} from '../src/field.js';
import {newGame,SAVE_KEY,nextDay} from '../src/state.js';
import {ROOMS,buildRoom,roomCost,useRoom,respawn} from '../src/shelter.js';
import {SLOTS_KEY,readSlots,writeSlot} from '../src/saves.js';
import {readFileSync} from 'node:fs';

const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};};
test('five saves remain isolated, retain a copied checkpoint and restore active selection',()=>{
  const disk=memory(),a=newCampaign(12);a.resources.scrap=91;let book=writeSlot(disk,readSlots(disk),0,a,'First');
  book=writeSlot(disk,book,1,a,'Checkpoint');a.resources.scrap=0;a.shelter.rooms.farm=2;
  book=writeSlot(disk,book,0,a);book=writeSlot(disk,book,2,newCampaign(36),'Second');
  book=readSlots(disk);assert.equal(book.active,2);assert.equal(book.slots.length,5);
  assert.equal(book.slots[1].state.resources.scrap,91);assert.equal(book.slots[1].state.shelter.rooms.farm,0);assert.equal(book.slots[0].state.shelter.rooms.farm,2);
});
test('legacy saves migrate without deleting the original; unreadable libraries are not overwritten',()=>{
  const disk=memory(),s=newGame(9);s.day=10;s.health=0;s.gameOver=true;disk.setItem(SAVE_KEY,JSON.stringify(s));
  let book=readSlots(disk);assert.equal(book.slots[0].state.day,10);assert.ok(book.slots[0].state.shelter.rooms.hospital);
  book=writeSlot(disk,book,0,book.slots[0].state);assert.ok(disk.getItem(SAVE_KEY));
  disk.setItem(SLOTS_KEY,'bad data');assert.throws(()=>readSlots(disk));assert.equal(disk.getItem(SLOTS_KEY),'bad data');
});
test('failed save writes leave the current slot library intact',()=>{
  const disk=memory(),book=writeSlot(disk,readSlots(disk),0,newCampaign());const before=JSON.stringify(book);
  const full={setItem(){throw new Error('QuotaExceeded');}};
  assert.throws(()=>writeSlot(full,book,1,newCampaign()));assert.equal(JSON.stringify(book),before);
});
test('rooms cost actual supplies, cap at level two and retain progress and wing positions',()=>{
  const s=newCampaign();const before=structuredClone(s.resources);assert.equal(buildRoom(s,'farm'),false);assert.deepEqual(s.resources,before);
  s.resources.scrap=500;s.resources.water=100;s.resources.fuel=50;s.resources.meds=20;
  for(const id of Object.keys(ROOMS)){
    while(s.shelter.rooms[id]<2){const cost=roomCost(s,id),old=s.resources.scrap;assert.equal(buildRoom(s,id),true);assert.equal(s.resources.scrap,old-cost.scrap);}
    const resources=structuredClone(s.resources);assert.equal(buildRoom(s,id),false);assert.deepEqual(s.resources,resources);
  }
  s.position={x:-37,y:0,z:-10};const restored=restoreCampaign(JSON.stringify(s));assert.deepEqual(restored.shelter,s.shelter);assert.deepEqual(restored.position,s.position);
  restored.zone='wasteland';restored.shelter.rooms.farm=0;assert.equal(buildRoom(restored,'farm'),false);
});
test('every room has useful services; daily rewards cannot be duplicated by reload or death',()=>{
  let s=newCampaign();for(const id of Object.keys(ROOMS))s.shelter.rooms[id]=2;s.resources.fuel=10;
  for(const id of ['farm','kitchen','bedrooms','workshop','waterworks']){
    assert.equal(useRoom(s,id),true);s=restoreCampaign(JSON.stringify(s));assert.equal(useRoom(s,id),false);
  }
  s.health=7;s.radiation=80;s.resources.meds=0;assert.equal(useRoom(s,'hospital'),true);assert.equal(s.health,100);assert.equal(s.radiation,0);
  s.health=0;s.gameOver=true;respawn(s);assert.equal(useRoom(s,'farm'),false);
  nextDay(s);assert.equal(useRoom(s,'farm'),true);
});
test('repeated deaths respawn at hospital, lose only carried supplies, preserve gear and cannot grant extra rescues while alive',()=>{
  let s=newCampaign();s.field.weapons.rifle.owned=true;s.shelter.rooms.farm=2;s.resources.scrap=72;s.searched.market=1;
  for(let i=1;i<=4;i++){
    s.zone='wasteland';s.bag.food=5;s.health=0;s.gameOver=true;s=restoreCampaign(JSON.stringify(s));assert.equal(respawn(s),true);
    assert.equal(s.shelter.deaths,i);assert.equal(s.health,100);assert.equal(s.bag.food,0);assert.equal(s.resources.scrap,72);assert.equal(s.shelter.rooms.farm,2);assert.equal(s.field.weapons.rifle.owned,true);assert.equal(s.searched.market,1);assert.deepEqual(s.position,{x:-17,y:0,z:-8});assert.equal(respawn(s),false);
  }
});
test('starvation and radiation deaths also permit rescue',()=>{
  for(const cause of ['starvation','radiation']){
    const s=newCampaign();s.health=.01;
    if(cause==='starvation'){s.resources.food=0;s.resources.water=0;nextDay(s);}else{s.zone='wasteland';s.radiation=100;advance(s,1);}
    assert.equal(s.gameOver,true);assert.equal(respawn(s),true);assert.equal(s.gameOver,false);
  }
});
test('four shelter GLBs contain actual room boundaries and detailed original furnishings',()=>{
  const root=new URL('../public/models/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('shelter-manifest.json',root)));
  assert.equal(manifest.assets.length,4);
  for(const file of manifest.assets){
    const bytes=readFileSync(new URL(file,root));assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);
    const gltf=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));assert.ok(gltf.meshes.length>=15);assert.ok(gltf.buffers.every(b=>!b.uri));
    const node=gltf.nodes[gltf.scenes[gltf.scene||0].nodes[0]];assert.deepEqual(node.translation||[0,0,0],[0,0,0]);
    if(file==='shelter_room.glb'){assert.ok(gltf.nodes.some(n=>n.name==='FLOOR_room'));assert.ok(gltf.nodes.some(n=>n.name==='WALL_door_lintel'));}
  }
});
