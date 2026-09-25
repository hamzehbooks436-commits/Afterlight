import {FLOOR_HEIGHT,ROOMS,SLOTS,roomAt,placements} from './shelter.js';
import {COMPUTER_COLORS,COMPUTER_LIGHTS} from './computer.js';

const wall=0x77766b,trim=0x988d78,amber=0xffc07a;
const hallZ=0;
const furnishing=(w,id,x,z,y,level,decor={},floor=1,slot=0)=>{
  const model=(name,dx,dz,rot=0,scale=1)=>w.model(name,x+dx,z+dz,rot,scale,y);
  const box=(dx,dy,dz,sx,sy,sz,color,solid=false)=>w.box(x+dx,y+dy,z+dz,sx,sy,sz,color,solid);
  if(id==='hospital'){
    for(const dx of [-2.65,2.65]){model('hospital_bed',dx,-1.5);w.collider(x+dx,y+.5,z-1.5,1.7,1,2.5);}
    box(0,1,-3.8,1.5,1.5,.5,0xa5a496,true);box(0,1.65,-3.5,.5,.5,.04,0xb86b55);
  }else if(id==='kitchen'){
    model('kitchen_range',0,z>0?3.5:-3.5,z>0?Math.PI:0);
    model('shelter_mess_table',0,0);w.collider(x,y+.65,z,3.4,1.3,1.35);
  }else if(id==='bedrooms'){
    for(const dx of [-2.6,2.6]){model('bunk',dx,-1.6);w.collider(x+dx,y+1,z-1.6,1.6,2,2.7);box(dx,.75,2,1.25,1.5,.5,0x837666,true);}
    if(level===2){model('bunk',0,1.9);w.collider(x,y+1,z+1.9,1.6,2,2.7);}
    if(w.state.upgrades.bunks&&w.state.shelter.rooms.bedrooms){model('bunk',0,-2.1);w.collider(x,y+1,z-2.1,1.6,2,2.7);}
  }else if(id==='workshop'){
    model('workbench',0,-3.5);w.collider(x,y+.7,z-3.5,2.6,1.4,1.3);
    model('generator',2.7,-2);w.collider(x+2.7,y+.8,z-2,2.4,1.6,1.8);
    w.target(`generator_${x}_${y}`,'Generator','Service the generator',x+2.7,y+1,z-.3,{job:true,id:'generator'});
    w.target(`workbench_${x}_${y}`,'Work bench','Craft equipment',x,y+1,z-2,{workbench:true});
  }else if(id==='garden'){
    for(const dx of [-2.4,2.4])model('hydroponic_rack',dx,-1.6,Math.PI/2);
    w.target(`garden_${x}_${y}`,'Grow beds','Water and harvest',x,y+1,z+1,{job:true,id:'garden'});
  }else if(id==='waterworks'){
    for(const dx of [-2.4,2.4]){model('water_tank',dx,-2.1);w.collider(x+dx,y+1,z-2.1,1.7,2,1.7);}
    box(0,1.1,-3.6,1.1,2.2,.65,0x686e66,true);
    w.target(`water_${x}_${y}`,'Water purifier','Flush the filter',x,y+1,z-.3,{job:true,id:'water'});
  }else if(id==='storage'){
    for(const dx of [-2.5,2.5])for(const dz of [-2.5,0])model('crate',dx,dz,0,.8);
    box(0,1,-3.8,3,2,.7,0x736958,true);
    w.target(`salvage_${x}_${y}`,'Salvage stores','Sort usable parts',x,y+1,z+1,{job:true,id:'salvage'});
    w.target(`stores_${x}_${y}`,'Supply locker','Inspect the stockpile',x+2,y+1,z+1,{stores:true});
  }else if(id==='gym'){
    for(const dx of [-2.5,0,2.5])box(dx,.14,-2,1.4,.28,2.2,0x5b5e56);
    for(const dx of [-2.5,2.5]){box(dx,1,2,.16,2,.16,0x555a55);box(dx,2,2,1.4,.12,.12,0x555a55);}
  }else if(id==='computer'){
    const north=z<0,rotation=north?0:Math.PI,back=north?-4.4:4.4;
    model('shelter_server_rack',0,back);
    if(level===2)model('shelter_server_rack',1.45,back);
    if(decor.layout==='wall'){
      for(const side of [-1,1]){
        model('shelter_computer_station',side*2.8,0,side<0?Math.PI/2:-Math.PI/2);
        w.target(`computer_${floor}_${slot}_${side}`,'Shelter computer','Open desktop',x+side*1.02,y+1.5,z,{computer:true,floor,slot});
      }
    }else{
      for(const side of [-1,1]){
        model('shelter_computer_station',side*2.25,north?-1.8:1.8,rotation);
        w.target(`computer_${floor}_${slot}_${side}`,'Shelter computer','Open desktop',x+side*2.25,y+1.5,z+(north?.15:-.15),{computer:true,floor,slot});
      }
    }
    const accent=COMPUTER_COLORS[decor.color]||COMPUTER_COLORS.teal;
    w.box(x,y+2.9,z+(north?-4.84:4.84),7.6,.12,.1,accent,false,null,{emissive:accent,emissiveIntensity:1.2});
    w.lamp(x,y+3.35,z,COMPUTER_LIGHTS[decor.light]||COMPUTER_LIGHTS.warm,22);
  }else if(id==='reactor'){
    model('shelter_reactor',0,-.7,z<0?Math.PI:0);w.collider(x,y+1.45,z-.7,3.2,2.9,3.2);
  }
};

export function buildShelterWing(w){
  const count=w.state.shelter.floors;
  w.roomLocations=[];
  for(let floor=1;floor<=count;floor++){
    const y=(floor-1)*FLOOR_HEIGHT;
    // Floors above reception end at the outside walls of the west and east bays.
    const upper=floor>1,centerX=upper?-25:-18,width=upper?30:58;
    w.box(centerX,y-.16,0,width,.32,30,0x8b877a,'floor','concrete');
    w.box(centerX,y+3.75,0,width,.25,30,0x696a60,true,'concrete');
    w.box(upper?-40:-47,y+1.85,0,.25,3.7,30,wall,true,'concrete');
    w.box(upper?-10:11,y+1.85,0,.25,3.7,30,wall,true,'concrete');
    w.box(centerX,y+1.85,-15,width,3.7,.25,wall,true,'concrete');
    if(floor===1){
      // The end wall has a real portal cutout for the Blender airlock assembly.
      w.box(-24.5,y+1.85,15,45,3.7,.25,wall,true,'concrete');
      w.box(6.5,y+1.85,15,9,3.7,.25,wall,true,'concrete');
    }else w.box(centerX,y+1.85,15,width,3.7,.25,wall,true,'concrete');
    for(const x of [-35,-25,-15]){
      w.lamp(x,y+3.45,hallZ,amber,24);
      w.box(x,y+.018,0,6,.028,.08,0xc2a169,false,null,{emissive:0x896038,emissiveIntensity:.25});
    }
    if(!upper){w.lamp(2,y+3.4,0,amber,30);w.model('shelter_reception',0,0,0,1,y);}
    const liftX=upper?-38.4:-8.4,liftZ=upper?0:-10;
    w.model('shelter_lift',liftX,liftZ,upper?Math.PI/2:0,1,y);
    w.target(`lift_${floor}`,'Shelter lift','Choose a floor',liftX+(upper?1.7:0),y+1.3,liftZ+(upper?0:1.7),{lift:true});
    if(floor===1){
      w.model('shelter_airlock',0,14.7,0,1,y);
      w.target('airlock','Blast door','Enter the wasteland',0,y+1.3,13.9);
      // A dedicated communications room opens from the north side of reception.
      w.model('shelter_radio_room',7,-9,0,1,y);
      w.model('shelter_computer_station',9,-6,0,1,y);
      w.lamp(7,y+3.3,-7.5,0xb5e5cf,16);
      w.target('radio','Emergency radio','Call for survivors',7,y+1.45,-11.25);
      w.target('radio_pc','Shelter computer','Open desktop',9,y+1.5,-4.15,{computer:true});
      w.target('expansion','Expansion plans','Place rooms & build floors',3.65,y+1.6,-7.45);
      w.target('board','Duty roster','Read tasks & field notes',10.35,y+1.6,-7.45);
    }
    for(let slot=0;slot<SLOTS.length;slot++){
      const {x,z,name}=SLOTS[slot],north=z<0,front=north?-5:5,back=north?-15:15,room=roomAt(w.state,floor,slot);
      w.box(x,y+1.85,back,9.8,3.7,.24,wall,true,'concrete');
      for(const side of [-1,1]){
        w.box(x+side*4.9,y+1.85,z,.22,3.7,10,wall,true,'concrete');
        w.box(x+side*3.45,y+1.85,front,2.9,3.7,.22,wall,true,'concrete');
      }
      w.box(x,y+3.2,front,3.8,.9,.22,trim,true);
      const label=room?`${ROOMS[room.id].name.toUpperCase()} / ${room.level}`:`AVAILABLE / ${name.toUpperCase()}`;
      w.sign(label,x,y+3.2,front+(north?.13:-.13),3.2,north?0:Math.PI,'#f2d6a8');
      w.roomLocations.push({floor,slot,x,z,y,id:room?.id||null});
      if(room){
        w.box(x,y+3.4,z,.9,.1,.45,0xffc58e,false,null,{emissive:0xffc58e,emissiveIntensity:2});
        furnishing(w,room.id,x,z,y,room.level,room.decor,floor,slot);
        const controlZ=z+(north?3.8:-3.8);
        w.box(x+2.8,y+1.2,controlZ,.38,.7,.12,0x554e40);
        w.target(`room_${floor}_${slot}`,ROOMS[room.id].name,'Use room / improve facilities',x+2.8,y+1.2,controlZ+(north?.16:-.16),{room:room.id,floor,slot});
        if(room.id==='bedrooms'){
          // Targets sit just beyond the foot of each physical bunk, outside its collider.
          for(const [index,dx,dz] of [[0,-2.6,-1.6],[1,2.6,-1.6]])
            w.target(`bed_${floor}_${slot}_${index}`,'Bunk bed','Sleep until morning',x+dx,y+1.1,z+dz+1.95,{bed:true});
          if(room.level===2)w.target(`bed_${floor}_${slot}_2`,'Bunk bed','Sleep until morning',x,y+1.1,z+3.65,{bed:true});
          if(w.state.upgrades.bunks)w.target(`bed_${floor}_${slot}_3`,'Bunk bed','Sleep until morning',x,y+1.1,z-.15,{bed:true});
        }
        if(room.id==='kitchen')w.target(`cook_${floor}_${slot}`,'Mess table','Prepare a hot meal',x+2.35,y+1,z,{job:true,id:'cook'});
      }else w.target(`slot_${floor}_${slot}`,'Empty room bay','Plan this room',x,y+1,front+(north?.8:-.8),{expansion:true,floor,slot});
    }
  }
}
