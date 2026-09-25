import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign} from '../src/field.js';
import {sharedFrom,applyShared,sharedChanges,mergeChanges} from '../src/online-state.js';

test('online room keeps player location, health and backpack separate from shared shelter supplies',()=>{
  const host=newCampaign(1),guest=newCampaign(2);
  host.resources.scrap+=8;host.shelter.floors=2;host.position={x:99,y:0,z:99};host.health=12;host.bag.food=4;
  guest.position={x:3,y:0,z:4};guest.health=88;guest.bag.food=1;
  applyShared(guest,sharedFrom(host));
  assert.equal(guest.resources.scrap,host.resources.scrap);
  assert.equal(guest.shelter.floors,2);
  assert.deepEqual(guest.position,{x:3,y:0,z:4});
  assert.equal(guest.health,88);assert.equal(guest.bag.food,1);
});

test('concurrent supply finds add rather than overwrite one another',()=>{
  const base=sharedFrom(newCampaign(4)),a=structuredClone(base),b=structuredClone(base);
  a.resources.scrap+=3;b.resources.scrap+=5;
  const merged=mergeChanges(mergeChanges(base,sharedChanges(base,a)),sharedChanges(base,b));
  assert.equal(merged.resources.scrap,base.resources.scrap+8);
});
