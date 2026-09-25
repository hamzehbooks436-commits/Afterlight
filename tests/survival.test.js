import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/state.js';

test('a supply run fills a bounded bag and deposits exactly once',()=>{
  const s=G.newGame(932);s.introSeen=true;assert.equal(G.depart(s),true);
  const original={...s.resources};
  for(const site of G.SITES){G.scavenge(s,site.id);s.pendingEvent=null;}
  assert.equal(G.bagCount(s),18);const bag={...s.bag};
  assert.equal(G.returnHome(s),18);assert.equal(s.zone,'shelter');
  for(const k of G.RESOURCE_KEYS)assert.equal(s.resources[k],original[k]+bag[k]);
  assert.equal(G.bagCount(s),0);assert.equal(G.returnHome(s),false);assert.ok(s.firstHaul);
});
test('searched sites cannot be farmed by returning, reloading, or starting another trip',()=>{
  let s=G.newGame(123);G.depart(s);assert.ok(G.scavenge(s,'market'));s.pendingEvent=null;
  assert.equal(G.scavenge(s,'market'),null);G.returnHome(s);G.depart(s);
  s=G.restoreSave(JSON.stringify(s));assert.equal(G.scavenge(s,'market'),null);
  s.day+=2;assert.equal(G.siteAvailable(s,'market'),false);s.day++;assert.equal(G.siteAvailable(s,'market'),true);
});
test('new residents consume supplies and give a daily skill benefit',()=>{
  const s=G.newGame(3);G.nextDay(s);assert.equal(s.pendingEvent,'visitor');
  assert.equal(G.resolveEvent(s,'welcome'),true);assert.equal(s.residents.length,2);assert.equal(s.residents[1].role,'Medic');
  s.health=50;const food=s.resources.food,water=s.resources.water;G.nextDay(s);
  assert.equal(s.resources.food,food-2);assert.equal(s.resources.water,water-4);assert.equal(s.health,67);
});
test('a full shelter cannot accept a visitor without a bunk upgrade',()=>{
  const s=G.newGame();s.resources.scrap=100;
  for(let i=0;i<3;i++){G.triggerEvent(s,'visitor');assert.ok(G.resolveEvent(s,'welcome'));}
  G.triggerEvent(s,'visitor');assert.equal(G.resolveEvent(s,'welcome'),false);assert.equal(s.residents.length,4);
  G.resolveEvent(s,'decline');assert.ok(G.build(s,'bunks'));G.triggerEvent(s,'visitor');assert.ok(G.resolveEvent(s,'welcome'));assert.equal(s.residents.length,5);
});
test('purchases are atomic and upgrades cannot exceed their maximum',()=>{
  const s=G.newGame();const before={...s.resources};assert.equal(G.build(s,'garden'),false);assert.deepEqual(s.resources,before);
  s.resources.scrap=100;assert.ok(G.build(s,'filter'));assert.equal(s.resources.scrap,88);assert.equal(G.build(s,'filter'),false);assert.equal(s.resources.scrap,88);
  assert.ok(G.build(s,'radio'));assert.deepEqual(G.upgradeCost(s,'radio'),{scrap:28,fuel:3});assert.ok(G.build(s,'radio'));assert.equal(G.build(s,'radio'),false);
});
test('purifier needs fuel and starvation has actual consequences',()=>{
  const s=G.newGame();s.upgrades.filter=1;s.resources.water=0;G.nextDay(s);assert.equal(s.resources.water,2);assert.equal(s.health,100);
  s.pendingEvent=null;s.resources.fuel=0;s.resources.water=0;s.resources.food=0;G.nextDay(s);assert.equal(s.health,79);assert.equal(s.resources.water,0);
});
test('radiation hurts outdoors; sealed suit reduces exposure; dialogs pause time',()=>{
  const a=G.newGame(),b=G.newGame();a.zone=b.zone='wasteland';b.upgrades.suit=1;G.tick(a,100);G.tick(b,100);assert.equal(b.radiation,a.radiation/2);
  a.radiation=80;const hp=a.health;G.tick(a,10);assert.ok(a.health<hp);
  G.triggerEvent(a,'rain');const before=JSON.stringify(a);G.tick(a,100);assert.equal(JSON.stringify(a),before);
});
test('monster encounters remain rare, approximately eight percent',()=>{
  const s=G.newGame(13827);let hits=0;
  for(let i=0;i<10000;i++){G.depart(s);hits+=Number(s.encounter);G.returnHome(s);}
  assert.ok(hits>700&&hits<900,`Observed ${hits}/10000`);
});
test('save and restore preserve expeditions, residents, upgrades and pending decisions',()=>{
  const s=G.newGame(823);s.resources.scrap=99;G.build(s,'filter');G.depart(s);G.scavenge(s,'clinic');s.pendingEvent='stranger';s.position={x:-5.3,z:2.7};
  const restored=G.restoreSave(JSON.stringify(s));assert.deepEqual(restored.bag,s.bag);assert.deepEqual(restored.position,s.position);assert.equal(restored.upgrades.filter,1);assert.equal(restored.pendingEvent,'stranger');assert.equal(restored.zone,'wasteland');assert.deepEqual(restored.searched,s.searched);
});
test('corrupt saves are rejected or bounded and do not inject game events',()=>{
  assert.equal(G.restoreSave('broken'),null);assert.equal(G.restoreSave({version:8}),null);
  const s=G.newGame();s.health=-100;s.resources.water=-80;s.bag.food=900;s.position.x=999;s.pendingEvent='__proto__';
  const restored=G.restoreSave(s);assert.equal(restored.health,0);assert.ok(restored.gameOver);assert.equal(restored.resources.water,0);assert.equal(restored.pendingEvent,null);assert.equal(restored.bag.food,0);assert.ok(restored.position.x<=8.5);
});
test('medical kits are consumed once and cannot raise vitals above their caps',()=>{
  const s=G.newGame();assert.equal(G.useMedicine(s),false);s.health=90;s.radiation=12;assert.ok(G.useMedicine(s));assert.equal(s.health,100);assert.equal(s.radiation,0);assert.equal(s.resources.meds,2);
});
test('ending requires survival, a repaired radio, power, and being home',()=>{
  const s=G.newGame();assert.equal(G.broadcast(s),false);s.day=14;s.upgrades.radio=2;s.zone='wasteland';assert.equal(G.broadcast(s),false);s.zone='shelter';s.resources.fuel=0;assert.equal(G.broadcast(s),false);s.resources.fuel=1;assert.ok(G.broadcast(s));assert.ok(s.signalSent);
});

test('every event has an affordable decision even when the shelter is full and supplies are empty',()=>{
  for(const [id,event] of Object.entries(G.EVENTS)){
    const s=G.newGame();for(const k of G.RESOURCE_KEYS)s.resources[k]=0;
    s.residents=Array.from({length:4},(_,i)=>({name:`Resident ${i}`,role:'Caretaker'}));
    const choices=event.choices.filter(c=>G.choiceAvailable(s,c));assert.ok(choices.length>0,`${id} must not deadlock`);
    for(const choice of choices){const fresh=structuredClone(s);G.triggerEvent(fresh,id);assert.ok(G.resolveEvent(fresh,choice.id));assert.equal(fresh.pendingEvent,null);assert.ok(Object.values(fresh.resources).every(n=>n>=0));}
  }
});
