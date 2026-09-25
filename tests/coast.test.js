import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as A from '../src/archipelago.js';
import * as F from '../src/field.js';
import {SITES} from '../src/state.js';
import {moveCapsule} from '../src/physics.js';

test('archipelago scale, town positions and cache footprints match navigable land',()=>{
 assert.ok(Math.abs(A.MAP_WIDTH*A.MAP_HEIGHT-6500000)<.001);
 assert.deepEqual(A.TOWNS.map(t=>t.name),['Stary Sands','Starfield','Little Jaffa','Riccota','Azure Port','Menton Coast']);
 for(const t of A.TOWNS)assert.ok(A.isLand(t.x,t.z),t.name);
 for(const s of SITES)for(const dx of [-8,8])for(const dz of [-7,7])assert.ok(A.isLand(s.x+dx,s.z+dz),s.name);
 assert.ok(A.isWalkable(A.SPAWN.x,A.SPAWN.z));
});
test('water is blocked and bridges can be crossed in both directions',()=>{
 assert.equal(A.isWalkable(0,0),false);
 for(const bridge of A.BRIDGES)for(const reverse of [false,true]){
  const [a,b]=reverse?[...bridge].reverse():bridge,p={...a,y:0};
  moveCapsule([],[],p,b.x-a.x,b.z-a.z,1.72,F.WORLD_LIMIT,A.isWalkable);
  assert.ok(Math.hypot(p.x-b.x,p.z-b.z)<.1);
 }
});
test('revision two field saves preserve progress and move to new shelter entrance',()=>{
 const s=F.newCampaign(12);F.depart(s);s.worldRevision=2;s.position={x:100,y:3.6,z:-100};s.resources.scrap=123;s.shelter.rooms.farm=2;s.field.rifleFound=true;
 const loaded=F.restoreCampaign(s);assert.deepEqual(loaded.position,A.SPAWN);assert.equal(loaded.resources.scrap,123);assert.equal(loaded.shelter.rooms.farm,2);assert.equal(loaded.field.rifleFound,true);
 loaded.position={x:A.TOWNS[1].x,y:0,z:A.TOWNS[1].z};assert.deepEqual(F.restoreCampaign(loaded).position,loaded.position);
});
test('Blender coastal GLBs contain only their intended abandoned assets',()=>{
 for(const name of ['coastal_house','coastal_tower','coastal_bridge','coastal_boat']){
  const b=fs.readFileSync(new URL(`../public/models/${name}.glb`,import.meta.url));assert.equal(b.toString('ascii',0,4),'glTF');
  const json=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)).trim());
  assert.equal(json.scenes.length,1);assert.equal(json.scenes[0].nodes.length,1);
  assert.ok(json.nodes.some(n=>n.name===name));assert.ok(!json.nodes.some(n=>/^(Cube|Camera|kitchen_range)$/.test(n.name)));
  if(name==='coastal_house')assert.ok(json.nodes.some(n=>n.name.startsWith('collapsed roof'))&&json.nodes.some(n=>n.name.startsWith('boarded window')));
 }
});
test('Blender flashlight asset is self-contained and visibly authored',()=>{
 const b=fs.readFileSync(new URL('../public/models/flashlight.glb',import.meta.url));assert.equal(b.toString('ascii',0,4),'glTF');
 const json=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)).trim());
 assert.equal(json.scenes[0].nodes.length,1);assert.equal(json.nodes[json.scenes[0].nodes[0]].name,'flashlight');
 for(const name of ['flashlight body','glowing lens','red power switch','side grip'])assert.ok(json.nodes.some(n=>n.name===name),name);
 assert.ok(json.materials.some(m=>m.name.includes('yellowed lens')));
});
