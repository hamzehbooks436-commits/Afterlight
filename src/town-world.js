import * as THREE from 'three';
import * as A from './archipelago.js';
import {TOWN_PROJECTS,TOWN_DECORATIONS,TOWN_DECOR_SLOTS,HOME_DECORATIONS,townGrid} from './town-renovation.js';

const TOWN=A.TOWNS[0];
const relative=(dx,dz)=>({x:TOWN.x+dx,z:TOWN.z+dz});
const stage=(town,id)=>Math.max(0,Math.min(2,Number(town?.projects?.[id])||0));
const lane=dx=>dx<-48?-86:dx>20?60:-9;

function residentRoute(home,job){
  const front=project=>relative(project.dx,project.dz+10);
  const inside=project=>relative(project.dx,project.dz+1);
  if(!job)return [inside(home),front(home),relative(home.dx+(home.dx>0?-9:9),home.dz+15)];
  const homeLane=lane(home.dx),jobLane=lane(job.dx);
  const route=[inside(home),front(home),relative(homeLane,home.dz+10)];
  if(homeLane!==jobLane)route.push(relative(homeLane,-30),relative(jobLane,-30));
  route.push(relative(jobLane,job.dz+10),front(job),inside(job));
  return route;
}

function alongRoute(points,fraction){
  const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.z-points[i].z));
  let remaining=lengths.reduce((sum,n)=>sum+n,0)*Math.max(0,Math.min(1,fraction));
  for(let i=0;i<lengths.length;i++){
    if(remaining<=lengths[i]||i===lengths.length-1){
      const a=points[i],b=points[i+1],t=lengths[i]?Math.min(1,remaining/lengths[i]):0;
      return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,dx:b.x-a.x,dz:b.z-a.z};
    }
    remaining-=lengths[i];
  }
  return {...points[0],dx:0,dz:1};
}

function ruinedModel(project){
  if(project.type==='farm'||project.type==='grid')return null;
  if(project.type==='home')return 'ruin_rowhouse';
  if(project.type==='hospital')return 'ruin_clinic';
  if(project.type==='shop'||project.type==='workshop')return 'ruin_store';
  if(project.type==='school'||project.type==='community')return 'ruin_tenement';
  return 'ruin_warehouse';
}

function improvedProps(project){
  if(project.type==='home')return [['town_lamp',-7,6],['town_street_tree',7,8]];
  if(project.type==='hospital')return [['town_planter',-5,6],['town_solar_array',6,-5]];
  if(project.type==='shop')return [['town_market_stall',-6,7],['town_planter',6,6]];
  if(project.type==='workshop')return [['town_solar_array',-6,-5],['town_bench',6,6]];
  if(project.type==='school'||project.type==='community')return [['town_playground',-6,7],['town_street_tree',7,7]];
  if(project.type==='farm')return [['town_greenhouse',-6,-6],['town_well',6,6]];
  if(project.type==='power')return [['town_solar_array',-6,7],['town_solar_array',6,7]];
  if(project.type==='waterworks')return [['town_well',-6,6],['town_planter',6,6]];
  if(project.type==='grid')return [['town_lamp',-5,6],['town_sign',5,6]];
  return [['town_planter',-5,6],['town_bench',5,6]];
}

function residentAsset(role=''){
  const name=role.toLowerCase();
  if(name.includes('medic')||name.includes('doctor')||name==='hospital')return 'settler_medic';
  if(name.includes('nurse'))return 'settler_nurse';
  if(name.includes('trade')||name.includes('shop'))return 'settler_trader';
  if(name.includes('engineer')||name.includes('repair')||name.includes('mechanic')||['power','waterworks','workshop'].includes(name))return 'settler_mechanic';
  if(name.includes('guard'))return 'settler_guard';
  return 'settler_resident';
}

export function buildStarrySands(w){
  const {x,z}=TOWN;
  const path=(a,b,width=2.5)=>{
    const dx=b.x-a.x,dz=b.z-a.z;
    const m=w.box((a.x+b.x)/2,.105,(a.z+b.z)/2,width,.075,Math.hypot(dx,dz),0xa99776,false,'dirt');
    m.rotation.y=Math.atan2(dx,dz);
  };

  // The old supply caches remain searchable; the new lots occupy the spaces between them.
  path(relative(-9,109),relative(-9,-95),3.4);
  path(relative(-86,87),relative(-86,-72),2.8);
  path(relative(60,109),relative(60,-95),2.8);
  path(relative(-86,14),relative(-9,14),2.5);
  path(relative(-86,-30),relative(60,-30),2.5);
  path(relative(-9,52),relative(60,52),2.5);
  w.box(x-8,.075,z+15,14,.1,14,0x817d65,false,'dirt');
  w.box(x-15,1.25,z+20,.3,2.5,.3,0x635b45);
  w.sign('STARRY SANDS / RESTORATION',x-15,2.45,z+20.2,6.5,0,'#e9dfba');
  w.target('starry_sands_planning','Starry Sands planning board','Plan repairs, housing and town services',x-15,1.35,z+22,{townPlanning:true});

  for(const project of TOWN_PROJECTS){
    const p=relative(project.dx,project.dz),front={x:p.x+Math.sin(project.rotation||0)*7,z:p.z+Math.cos(project.rotation||0)*7};
    path(relative(project.dx,project.dz+10),relative(lane(project.dx),project.dz+10),2);
    w.box(p.x,.045,p.z,14,.08,14,0x77715f,false,'dirt');
    w.settlementBuildings.push({x:p.x,z:p.z,town:'hollaway'});
    if(['hospital','school','shop','power','waterworks','farm'].includes(project.type)){
      w.box(front.x-4,1.25,front.z+2,.2,2.5,.2,0x5f5847);
      w.sign(project.name.toUpperCase(),front.x-4,2.45,front.z+2.15,4,0,'#e5d5a7');
    }
  }

  for(const slot of TOWN_DECOR_SLOTS){
    const p=relative(slot.dx,slot.dz);
    w.box(p.x,.055,p.z,4,.1,4,0x7b755f,false,'dirt');
  }

  // These lamps become an obvious visual signal that the town grid is live.
  const streetlights=[[-14,12],[-14,-33],[17,-45],[55,52],[-51,9]];
  for(const [dx,dz] of streetlights){const p=relative(dx,dz);w.model('town_lamp',p.x,p.z);}

  w.townResidents=[];
  let rendered={objects:[],boxes:[],floors:[],targets:[],volumes:[],lights:[],generated:[]};
  const clear=()=>{
    for(const object of rendered.objects)w.active.remove(object);
    w.townResidents=[];
    const remove=(items,owned)=>{const set=new Set(owned);return items.filter(item=>!set.has(item));};
    w.boxes=remove(w.boxes,rendered.boxes);
    w.floors=remove(w.floors,rendered.floors);
    w.targets=remove(w.targets,rendered.targets);
    w.volumes=remove(w.volumes,rendered.volumes);
    w.lights=remove(w.lights,rendered.lights);
    w.generated=remove(w.generated,rendered.generated);
    for(const resource of rendered.generated)resource.dispose();
    rendered={objects:[],boxes:[],floors:[],targets:[],volumes:[],lights:[],generated:[]};
  };
  const model=(name,x,z,rotation=0,scale=1,y=0)=>{
    const beforeBoxes=w.boxes.length,beforeFloors=w.floors.length;
    const object=w.model(name,x,z,rotation,scale,y,true);
    rendered.objects.push(object);
    rendered.boxes.push(...w.boxes.slice(beforeBoxes));
    rendered.floors.push(...w.floors.slice(beforeFloors));
    return object;
  };
  const target=(id,name,action,x,y,z,extra)=>rendered.targets.push(w.target(id,name,action,x,y,z,extra));
  const volume=(x,z,name)=>{const v={x,z,w:5.5,d:5,name};w.volumes.push(v);rendered.volumes.push(v);};
  const cable=(start,end,color=0x4c5046)=>{
    const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end),direction=b.clone().sub(a);
    const geometry=new THREE.CylinderGeometry(.035,.035,direction.length(),5);
    const wire=new THREE.Mesh(geometry,w.mat(color,null,{metalness:.55,roughness:.5}));
    wire.position.copy(a).add(b).multiplyScalar(.5);
    wire.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
    w.active.add(wire);rendered.objects.push(wire);w.generated.push(geometry);rendered.generated.push(geometry);
  };
  const powerLight=(dx,dz,color=0xffcb78,brightness=11)=>{
    const p=relative(dx,dz),light=new THREE.PointLight(color,brightness,16,2);
    light.position.set(p.x,3,p.z);w.active.add(light);
    const record={light,power:brightness};w.lights.push(record);rendered.lights.push(record);rendered.objects.push(light);
  };

  w.refreshStarrySands=()=>{
    if(w.zone!=='wasteland')return;
    clear();
    const town=w.state?.field?.starrySands||{};
    for(const project of TOWN_PROJECTS){
      const p=relative(project.dx,project.dz),level=stage(town,project.id),rotation=project.rotation||0;
      if(level===0){
        const old=ruinedModel(project);
        if(old)model(old,p.x,p.z,rotation);
        else model(project.type==='farm'?'dead_tree':'wreck',p.x,p.z,rotation,project.type==='farm'?.75:.65);
        model('rubble_cluster',p.x-6,p.z+5,.5,.75);
      }else{
        model(project.model,p.x,p.z,rotation);
        if(project.type==='home'){
          const decor=HOME_DECORATIONS[town.homeDecor?.[project.id]];
          if(decor)model(decor.model,p.x+decor.dx,p.z+decor.dz,rotation);
        }
        if(level>=2){
          for(const [asset,dx,dz] of improvedProps(project))model(asset,p.x+dx,p.z+dz,rotation);
        }
      }
      if(!['farm','waterworks','grid'].includes(project.type))volume(p.x,p.z,`${project.name} · ${level===0?'ruin':level===1?'restored':'expanded'}`);
      const frontX=p.x+Math.sin(rotation)*7,frontZ=p.z+Math.cos(rotation)*7;
      target(`town-project-${project.id}`,project.name,level===0?'Repair building':level===1?'Expand building':'Manage building',frontX,1.3,frontZ,{townProject:project.id});
    }
    for(const slot of TOWN_DECOR_SLOTS){
      const p=relative(slot.dx,slot.dz),choice=town.decorations?.[slot.id],decor=TOWN_DECORATIONS[choice];
      if(decor)model(decor.model,p.x,p.z,slot.rotation||0);
      target(`town-decor-${slot.id}`,decor?`${slot.id.replaceAll('_',' ')} · ${decor.name}`:`Decoration space · ${slot.id.replaceAll('_',' ')}`,decor?'Change decoration':'Place decoration',p.x,1.2,p.z+3.2,{townDecorSlot:slot.id});
    }
    const residents=Array.isArray(town.residents)?town.residents:[];
    residents.slice(0,20).forEach((resident,index)=>{
      const home=TOWN_PROJECTS.find(p=>p.id===resident.home),job=TOWN_PROJECTS.find(p=>p.id===resident.job);
      if(!home)return;
      const route=residentRoute(home,job),start=route[0],visual=model(residentAsset(resident.job||resident.role),start.x,start.z,0,.95);
      w.townResidents.push({name:resident.name,homeName:home.name,jobName:job?.name||null,model:visual,route,index,status:'At home'});
    });
    w.updateTownResidents(0,0);

    const grid=townGrid(w.state),shelterPower=grid.reactor>0,localPower=grid.local>0;
    const plantPower=stage(town,'power')>0&&(town.supplies?.fuel||0)>0;
    if(shelterPower){
      const home=A.HOME,link=relative(5,37),hub=relative(-9,20);
      cable([home.x,3.9,home.z+1],[home.x,4.4,home.z-11]);
      cable([home.x,4.4,home.z-11],[link.x,4.6,link.z]);
      cable([link.x,4.6,link.z],[hub.x,4.1,hub.z]);
      powerLight(5,37,0x8bc9dc,15);
    }
    if(plantPower){
      const plant=relative(89,65),pole=relative(55,52),hub=relative(-9,20);
      cable([plant.x,5.2,plant.z],[pole.x,4.4,pole.z]);
      cable([pole.x,4.4,pole.z],[hub.x,4.1,hub.z]);
      powerLight(89,65,0xe0c275,16);
    }
    if(shelterPower||localPower)for(const [dx,dz] of streetlights.slice(0,Math.min(streetlights.length,grid.capacity)))powerLight(dx,dz);
    for(const home of TOWN_PROJECTS.filter(p=>p.type==='home'&&stage(town,p.id)>=2&&grid.powered.includes(p.id)))
      powerLight(home.dx-7,home.dz+6,0xffc58b,8);
  };
  w.updateTownResidents=(dt,time)=>{
    if(w.zone!=='wasteland')return;
    const minute=w.state.minute;
    for(const person of w.townResidents){
      const toWork=minute>=360&&minute<540,atWork=minute>=540&&minute<1020,toHome=minute>=1020&&minute<1200;
      const fraction=toWork?(minute-360)/180:atWork?1:toHome?1-(minute-1020)/180:0;
      const point=alongRoute(person.route,fraction),walking=toWork||toHome;
      person.model.position.set(point.x,walking?Math.sin(time*8+person.index)*.025:0,point.z);
      if(walking)person.model.rotation.y=Math.atan2(toHome?point.dx:-point.dx,toHome?point.dz:-point.dz);
      person.status=toWork?person.jobName?`Walking to ${person.jobName}`:'Walking through the neighbourhood':atWork?person.jobName?`Working at ${person.jobName}`:'Visiting neighbours':toHome?`Walking home to ${person.homeName}`:`At home in ${person.homeName}`;
    }
  };
  w.refreshStarrySands();
}
