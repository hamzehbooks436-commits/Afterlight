import {HOME, isWalkable, roadDistance} from './archipelago.js';
import {canOccupy, floorHeight, HEIGHT} from './physics.js';

export const newBike=(id='bike')=>({x:HOME.x+(id==='bike_extra'?-3:3),y:0,z:HOME.z-6,yaw:0});
export function restoreBike(raw,id='bike'){
  return raw&&['x','y','z','yaw'].every(k=>Number.isFinite(raw[k]))&&raw.y>=0&&raw.y<=20&&isWalkable(raw.x,raw.z)
    ?{x:raw.x,y:raw.y,z:raw.z,yaw:raw.yaw}:newBike(id);
}
// Check the entire wheelbase, not just the rider's walking capsule.
export function bikeFits(w,x,y,z,yaw){
  return [-.7,0,.7].every(offset=>{
    const px=x-Math.sin(yaw)*offset,pz=z-Math.cos(yaw)*offset;
    return isWalkable(px,pz)&&canOccupy(w.boxes,px,y,pz,HEIGHT,.42,2000)&&Math.abs(floorHeight(w.floors,px,pz,y)-y)<.28;
  });
}
export function createBike(w){
  w.riding=false;w.bikeSpeed=0;w.bike=null;w.bikes={};w.activeBikeId=null;
  if(w.zone!=='wasteland')return;
  for(const id of ['bike','bike_extra']){
    let b=w.state.field[id]=restoreBike(w.state.field[id],id);
    if(!bikeFits(w,b.x,b.y,b.z,b.yaw)||id==='bike_extra'&&Math.hypot(b.x-w.state.field.bike.x,b.z-w.state.field.bike.z)<2.5){
      const candidates=id==='bike_extra'?[[-3,-6],[-5,-6],[-3,-9],[5,-9]]:[[3,-6]];
      const spot=candidates.map(([dx,dz])=>({x:HOME.x+dx,y:0,z:HOME.z+dz,yaw:0})).find(v=>bikeFits(w,v.x,v.y,v.z,v.yaw)&&(id==='bike'||Math.hypot(v.x-w.state.field.bike.x,v.z-w.state.field.bike.z)>2.5));
      if(!spot)continue;
      b=w.state.field[id]=spot;
    }
    const model=w.model('shelter_bike',b.x,b.z,b.yaw,1,b.y,true);
    w.bikes[id]={model,wheels:['wheel_front','wheel_rear'].map(n=>model.getObjectByName(n))};
  }
  w.bike=w.bikes.bike?.model||null;
}
export function respawnBike(w,id){
  if(!['bike','bike_extra'].includes(id)||w.riding&&w.activeBikeId===id)return false;
  const other=w.state.field[id==='bike'?'bike_extra':'bike'];
  const offsets=id==='bike'?[[3,-6],[5,-9],[3,-10],[-5,-9]]:[[-3,-6],[-5,-6],[-3,-9],[5,-9]];
  const spot=offsets.map(([dx,dz])=>({x:HOME.x+dx,y:0,z:HOME.z+dz,yaw:0})).find(p=>
    (!other||Math.hypot(p.x-other.x,p.z-other.z)>2.5)&&
    (w.zone!=='wasteland'||bikeFits(w,p.x,p.y,p.z,p.yaw)));
  if(!spot)return false;
  w.state.field[id]=spot;
  const model=w.bikes?.[id]?.model;
  if(model){model.position.set(spot.x,spot.y,spot.z);model.rotation.y=spot.yaw;}
  return true;
}
export function toggleBike(w,id='bike'){
  if(w.riding)id=w.activeBikeId;
  if(!w.bikes[id])return false;
  const p=w.player.position,b=w.state.field[id];
  if(w.riding){
    for(const side of [1,-1]){
      const x=b.x+Math.cos(b.yaw)*side,z=b.z-Math.sin(b.yaw)*side;
      if(isWalkable(x,z)&&canOccupy(w.boxes,x,b.y,z,HEIGHT,.28,2000)){
        p.set(x,b.y,z);w.riding=false;w.activeBikeId=null;w.bikeSpeed=0;w.state.position={x,y:b.y,z};return true;
      }
    }
    return false;
  }
  if(Math.hypot(p.x-b.x,p.z-b.z)>2.75||Math.abs(p.y-b.y)>.5||!bikeFits(w,b.x,b.y,b.z,b.yaw))return false;
  p.set(b.x,b.y,b.z);w.state.field.yaw=b.yaw;w.state.field.pitch=0;w.riding=true;w.activeBikeId=id;w.velocityY=0;w.reloading=0;return true;
}
export function rideBike(w,dt,input){
  const b=w.state.field[w.activeBikeId],p=w.player.position;
  const brake=input.has('Space')||input.has('KeyS'),pedal=input.has('KeyW')&&!brake;
  const max=roadDistance(p.x,p.z)<8?14:8;
  w.bikeSpeed=Math.max(0,Math.min(max,w.bikeSpeed+dt*(brake?-18:pedal?4:-2)));
  const steer=Number(input.has('KeyA'))-Number(input.has('KeyD'));
  const yaw=b.yaw+steer*dt*1.5*Math.min(1,w.bikeSpeed/2);
  if(bikeFits(w,p.x,p.y,p.z,yaw)){w.state.field.yaw+=yaw-b.yaw;b.yaw=yaw;}
  const distance=w.bikeSpeed*dt,steps=Math.max(1,Math.ceil(distance/.1));let travelled=0;
  for(let i=0;i<steps;i++){
    const x=p.x-Math.sin(b.yaw)*distance/steps,z=p.z-Math.cos(b.yaw)*distance/steps;
    const y=floorHeight(w.floors,x,z,p.y);
    if(!bikeFits(w,x,y,z,b.yaw)){w.bikeSpeed=0;break;}
    p.set(x,y,z);travelled+=distance/steps;
  }
  Object.assign(b,{x:p.x,y:p.y,z:p.z});const bike=w.bikes[w.activeBikeId];bike.model.position.copy(p);bike.model.rotation.y=b.yaw;
  for(const wheel of bike.wheels)if(wheel)wheel.rotation.x-=travelled/.37;
  return travelled>0;
}
