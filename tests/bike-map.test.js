import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as A from '../src/archipelago.js';
import * as F from '../src/field.js';
import {newBike,restoreBike,bikeFits,rideBike,toggleBike} from '../src/bike.js';
import {localView} from '../src/coastal-map.js';
function world(){const b=newBike();return {state:{field:{bike:b,yaw:0}},player:{position:new THREE.Vector3(b.x,b.y,b.z)},bike:new THREE.Object3D(),bikeWheels:[],bikeSpeed:0,boxes:[],floors:[]};}
test('local map follows the player while preserving a 240m neighbourhood',()=>{
 const s=F.newCampaign();F.depart(s);let v=localView(s),p=A.imagePoint(s.position);assert.ok(Math.abs(v[0]+v[2]/2-p[0])<1e-8);assert.equal(Math.round(v[2]*A.MAP_SCALE),240);
 s.position.x+=100;assert.ok(Math.abs(localView(s)[0]-v[0]-100/A.MAP_SCALE)<1e-8);
 s.zone='shelter';assert.deepEqual(localView(s),localView({...s,position:{x:900,z:900}}));
});
test('legacy and malformed bike saves get a usable shelter bike',()=>{
 for(const value of [null,{x:NaN,y:0,z:0,yaw:0},{x:0,y:0,z:0,yaw:0}])assert.deepEqual(restoreBike(value),newBike());
 const s=F.newCampaign();delete s.field.bike;assert.deepEqual(F.restoreCampaign(s).field.bike,newBike());
 s.field.bike={...newBike(),x:newBike().x+1};s.field.waypoint=A.HOME;const q=F.restoreCampaign(s);assert.deepEqual(q.field.bike,s.field.bike);assert.deepEqual(q.field.waypoint,A.HOME);
});
test('bike cannot tunnel through a wall at speed and Space brakes',()=>{
 const w=world(),b={...w.state.field.bike};w.riding=true;w.bikeSpeed=14;w.boxes=[{minX:b.x-4,maxX:b.x+4,minY:0,maxY:3,minZ:b.z-4,maxZ:b.z-3}];rideBike(w,1,new Set(['KeyW']));assert.ok(w.player.position.z>b.z-3);assert.equal(w.bikeSpeed,0);
 w.boxes=[];w.bikeSpeed=8;rideBike(w,1,new Set(['Space']));assert.equal(w.bikeSpeed,0);
});
test('both wheel ends remain on every bridge and the ocean rejects bikes',()=>{
 const w=world();assert.equal(bikeFits(w,0,0,0,0),false);
 for(const [a,b] of A.BRIDGES){const yaw=Math.atan2(a.x-b.x,a.z-b.z);for(let i=1;i<10;i++)assert.ok(bikeFits(w,a.x+(b.x-a.x)*i/10,0,a.z+(b.z-a.z)*i/10,yaw));}
});
test('dismounting cannot place the player in a wall, and parking remains in place',()=>{
 const w=world(),b={...w.state.field.bike};w.riding=true;w.boxes=[{minX:b.x+.5,maxX:b.x+1.5,minY:0,maxY:3,minZ:b.z-1,maxZ:b.z+1}];assert.equal(toggleBike(w),true);assert.ok(w.player.position.x<b.x);assert.deepEqual(w.state.field.bike,b);
 w.player.position.set(b.x,0,b.z);w.riding=true;w.boxes.push({minX:b.x-1.5,maxX:b.x-.5,minY:0,maxY:3,minZ:b.z-1,maxZ:b.z+1});assert.equal(toggleBike(w),false);assert.equal(w.riding,true);
});
