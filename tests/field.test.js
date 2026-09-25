import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/state.js';
import * as F from '../src/field.js';
import {SPAWN} from '../src/archipelago.js';
import {canOccupy,moveCapsule,segmentBlocked,findPath} from '../src/physics.js';

test('an expedition packs real supplies and consumes carried medicine, not remote stock',()=>{
  const s=F.newCampaign(42),stock={...s.resources};s.pendingEvent='trader';assert.ok(F.depart(s));
  assert.equal(s.pendingEvent,'trader');assert.equal(s.bag.meds,1);assert.equal(s.resources.meds,stock.meds-1);
  s.health=50;assert.ok(G.useMedicine(s));assert.equal(s.bag.meds,0);assert.equal(s.resources.meds,stock.meds-1);
  assert.equal(G.useMedicine(s),false);assert.equal(s.health,85);
  F.returnHome(s);assert.equal(s.resources.food,stock.food);assert.equal(s.resources.water,stock.water);assert.equal(G.bagCount(s),0);
});
test('weapons cannot fire without ammunition; reload conserves rounds; melee remains available',()=>{
  const s=F.newCampaign();assert.equal(F.fire(s),false);F.depart(s);
  for(let i=0;i<8;i++)assert.ok(F.fire(s));assert.equal(F.fire(s),false);
  const w=s.field.weapons.pistol,total=w.mag+w.reserve;assert.equal(F.reload(s),8);assert.equal(w.mag+w.reserve,total);assert.equal(F.reload(s),false);
  assert.equal(F.setWeapon(s,'rifle'),false);assert.ok(F.setWeapon(s,'pipe'));assert.ok(F.fire(s));assert.equal(F.reload(s),false);
});
test('checkpoint discovery unlocks the rifle once and survives a save reload',()=>{
  const s=F.newCampaign(123);F.depart(s);assert.ok(F.search(s,'checkpoint'));assert.ok(s.field.weapons.rifle.owned);
  const reserve=s.field.weapons.rifle.reserve;assert.equal(F.search(s,'checkpoint'),null);assert.equal(s.field.weapons.rifle.reserve,reserve);
  s.position={x:101,y:3.6,z:-108};s.field.yaw=2.1;s.field.weapons.rifle.mag=7;s.field.defeated.enemy_3=s.day;
  const loaded=F.restoreCampaign(JSON.stringify(s));assert.deepEqual(loaded.position,s.position);assert.equal(loaded.field.weapons.rifle.mag,7);assert.equal(loaded.field.yaw,2.1);assert.equal(loaded.field.defeated.enemy_3,1);
});
test('base work is transactional, once per day, and persists across leaving and reloading',()=>{
  const s=F.newCampaign();s.resources.scrap=1;const before={...s.resources};assert.equal(F.completeJob(s,'generator'),false);assert.deepEqual(s.resources,before);
  assert.ok(F.completeJob(s,'salvage'));assert.equal(s.resources.scrap,5);assert.ok(F.completeJob(s,'generator'));assert.equal(s.resources.scrap,3);
  assert.equal(F.completeJob(s,'generator'),false);const loaded=F.restoreCampaign(s);assert.equal(F.completeJob(loaded,'generator'),false);
  F.depart(loaded);assert.equal(F.completeJob(loaded,'water'),false);F.returnHome(loaded);loaded.day++;assert.ok(F.completeJob(loaded,'generator'));
});
test('crew shifts produce bounded rewards and cannot be reset by reloading',()=>{
  const s=F.newCampaign(),scrap=s.resources.scrap;
  for(let i=0;i<3;i++)assert.ok(F.crewWork(s,'Rafi','Engineer'));
  assert.equal(s.resources.scrap,scrap+3);assert.equal(F.crewWork(F.restoreCampaign(s),'Rafi','Engineer'),false);
  s.day++;assert.ok(F.crewWork(s,'Rafi','Engineer'));
});
test('radstorms hurt outdoors; roofs and suits reduce the same dose',()=>{
  const outside=F.newCampaign(),inside=F.newCampaign(),suit=F.newCampaign();
  for(const s of [outside,inside,suit]){F.depart(s);s.weather='Radstorm';s.radiation=0;}
  suit.upgrades.suit=1;F.advance(outside,10);F.advance(inside,10,{sheltered:true});F.advance(suit,10);
  assert.equal(outside.radiation,6.5);assert.equal(inside.radiation,.65);assert.equal(suit.radiation,3.25);
  const before=outside.radiation;F.advance(outside,1,{hazard:true});assert.ok(outside.radiation-before>1);
});
test('weather moves through fog and radstorms without pausing for radio messages',()=>{
  const s=F.newCampaign();s.pendingEvent='visitor';s.field.weatherTimer=.1;const minute=s.minute;
  F.advance(s,1);assert.equal(s.weather,'Fog');assert.ok(s.minute>minute);s.field.weatherTimer=.1;F.advance(s,1);assert.equal(s.weather,'Radstorm');
});
test('natural midnight is continuous and does not act as a free sleep',()=>{
  const s=F.newCampaign();s.minute=1439;s.energy=40;s.health=50;s.radiation=20;
  F.advance(s,.5);assert.equal(s.day,2);assert.equal(s.minute,1);assert.equal(s.energy,40);assert.equal(s.health,50);assert.ok(s.radiation>19);
});
test('original overhead saves retain progress and migrate to a safe first-person position',()=>{
  const old=G.newGame(321);old.day=9;old.upgrades.radio=1;old.resources.scrap=89;old.zone='wasteland';old.position={x:-8,z:-20};
  const s=F.restoreCampaign(old);assert.equal(s.day,9);assert.equal(s.resources.scrap,89);assert.equal(s.upgrades.radio,1);assert.deepEqual(s.position,SPAWN);assert.ok(s.field.weapons.pistol.owned);
  s.field.weapons.pistol.mag=Infinity;s.field.equipped='__proto__';s.position.x=10000;s.field.settings.sensitivity=-8;
  const clean=F.restoreCampaign(s);assert.equal(clean.field.equipped,'pistol');assert.ok(clean.field.weapons.pistol.mag<=8);assert.ok(clean.position.x<F.WORLD_LIMIT);assert.equal(clean.field.settings.sensitivity,.4);
});
test('capsules stop at walls, pass through doors, and cannot tunnel on a large movement',()=>{
  const wall={minX:-5,maxX:5,minY:0,maxY:3,minZ:-1,maxZ:0},p={x:0,y:0,z:2};moveCapsule([wall],[],p,0,-10);assert.ok(p.z>.25);
  const doorway=[{...wall,maxX:-1},{...wall,minX:1}];const q={x:0,y:0,z:2};moveCapsule(doorway,[],q,0,-5);assert.ok(q.z<-2);assert.ok(!canOccupy(doorway,3,0,-.5));
});
test('a real staircase climbs to its upper floor, without lifting players through ceilings',()=>{
  const steps=Array.from({length:18},(_,i)=>({minX:0,maxX:2,minZ:-i*.46-.46,maxZ:-i*.46,minY:0,maxY:(i+1)*.2}));
  const p={x:1,y:0,z:.5};moveCapsule(steps,steps,p,0,-8.3);assert.ok(p.y>=3.4,`height ${p.y}`);
  const ceiling={minX:-10,maxX:10,minZ:-10,maxZ:10,minY:3.36,maxY:3.6};assert.ok(canOccupy([ceiling],0,0,0));assert.equal(canOccupy([ceiling],0,2,0),false);
});
test('solid walls occlude combat and interaction rays; windows remain open',()=>{
  const wall={minX:-2,maxX:2,minZ:2,maxZ:2.4,minY:0,maxY:3};
  assert.ok(segmentBlocked({x:0,y:1.6,z:0},{x:0,y:1.2,z:6},[wall]));
  assert.equal(segmentBlocked({x:4,y:1.6,z:0},{x:4,y:1.2,z:6},[wall]),false);
  assert.equal(segmentBlocked({x:0,y:4,z:0},{x:0,y:4,z:6},[wall]),false);
});
test('residents find a path around a partition instead of crossing it',()=>{
  const wall={minX:-.3,maxX:.3,minZ:-3,maxZ:2,minY:0,maxY:3};
  const path=findPath([wall],{x:-2,z:0},{x:2,z:0});assert.ok(path.length>0);assert.ok(path.some(p=>p.z>2.2||p.z<-3.2));assert.ok(path.every(p=>canOccupy([wall],p.x,0,p.z)));
});
