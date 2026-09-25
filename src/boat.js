import * as A from './archipelago.js';
import {canOccupy} from './physics.js';

export const BOAT_STARTS={
  holloway:{x:A.HOLLOWAY_PIER[1].x+3.4,z:A.HOLLOWAY_PIER[1].z-5,yaw:Math.PI},
  ...Object.fromEntries(Array.from({length:3},(_,i)=>{
    const port=A.TOWNS[4],z=port.z-25+i*22;
    return [`azure_${i+1}`,{x:port.x-61-i*9,z:z+8,yaw:.2+i*.3}];
  })),
};

export function restoreBoats(raw){
  return Object.fromEntries(Object.entries(BOAT_STARTS).map(([id,start])=>{
    const boat=raw?.[id];
    return [id,boat&&Number.isFinite(boat.x)&&Number.isFinite(boat.z)&&Number.isFinite(boat.yaw)&&A.isNavigableWater(boat.x,boat.z)
      ?{x:boat.x,z:boat.z,yaw:boat.yaw}:{...start}];
  }));
}

export function createBoats(w){
  w.boats=[];w.activeBoat=null;w.boatSpeed=0;
  if(w.zone!=='wasteland')return;
  for(const [id,boat] of Object.entries(w.state.field.boats)){
    const model=w.model('coastal_boat',boat.x,boat.z,boat.yaw,1.5,-1.5,true);
    w.boats.push({id,model});
  }
  const id=w.state.field.activeBoat;
  if(id&&w.state.field.boats[id]&&A.isNavigableWater(w.state.field.boats[id].x,w.state.field.boats[id].z)){
    w.activeBoat=id;
    const b=w.state.field.boats[id];w.player.position.set(b.x,-1.5,b.z);w.state.field.yaw=b.yaw;
  }else w.state.field.activeBoat=null;
}

export function toggleBoat(w,id){
  if(w.zone!=='wasteland')return false;
  const p=w.player.position;
  if(w.activeBoat){
    const boat=w.state.field.boats[w.activeBoat];
    for(const radius of [2.2,3.2,4.5,6])for(let i=0;i<16;i++){
      const angle=i*Math.PI/8,x=boat.x+Math.cos(angle)*radius,z=boat.z+Math.sin(angle)*radius;
      if(A.isWalkable(x,z)&&canOccupy(w.boxes,x,0,z,1.72,.28,2000)){
        p.set(x,0,z);w.activeBoat=null;w.state.field.activeBoat=null;w.boatSpeed=0;w.state.field.swimming=false;
        w.state.position={x,y:0,z};return true;
      }
    }
    return false;
  }
  const boat=w.state.field.boats[id];
  if(!boat||Math.hypot(p.x-boat.x,p.z-boat.z)>4)return false;
  w.activeBoat=id;w.state.field.activeBoat=id;w.state.field.swimming=false;w.boatSpeed=0;
  p.set(boat.x,-1.5,boat.z);w.state.position={x:p.x,y:p.y,z:p.z};w.state.field.yaw=boat.yaw;w.velocityY=0;
  return true;
}

export function rideBoat(w,dt,input){
  const boat=w.state.field.boats[w.activeBoat],p=w.player.position;
  if(!boat)return false;
  const throttle=Number(input.has('KeyW'))-Number(input.has('KeyS'));
  w.boatSpeed=Math.max(-2.5,Math.min(10,w.boatSpeed+throttle*dt*5-dt*1.3*Math.sign(w.boatSpeed)));
  if(Math.abs(w.boatSpeed)<.04)w.boatSpeed=0;
  const steer=Number(input.has('KeyA'))-Number(input.has('KeyD'));
  boat.yaw+=steer*dt*.9*Math.min(1,Math.abs(w.boatSpeed)/2);
  const distance=w.boatSpeed*dt,steps=Math.max(1,Math.ceil(Math.abs(distance)/.3));let moved=false;
  for(let i=0;i<steps;i++){
    const x=boat.x-Math.sin(boat.yaw)*distance/steps,z=boat.z-Math.cos(boat.yaw)*distance/steps;
    if(!A.isNavigableWater(x,z)){w.boatSpeed=0;break;}
    boat.x=x;boat.z=z;moved=true;
  }
  p.set(boat.x,-1.5,boat.z);
  const model=w.boats.find(item=>item.id===w.activeBoat)?.model;
  if(model){model.position.set(boat.x,-1.5,boat.z);model.rotation.y=boat.yaw;}
  w.state.field.yaw=boat.yaw;
  return moved;
}
