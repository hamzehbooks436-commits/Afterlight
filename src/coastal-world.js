import * as THREE from 'three';
import * as A from './archipelago.js';
import {SITES} from './state.js';
import {buildShadyShores,SHADY_SHORES} from './settlement.js';
import {buildStarrySands} from './town-world.js';

export function buildCoast(w){
  let seed=921;const r=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const surface=(poly,y,color,scale=1)=>{
    const cx=poly.reduce((v,p)=>v+p.x,0)/poly.length,cz=poly.reduce((v,p)=>v+p.z,0)/poly.length;
    const shape=new THREE.Shape(poly.map(p=>new THREE.Vector2(cx+(p.x-cx)*scale,-cz-(p.z-cz)*scale)));
    const g=new THREE.ShapeGeometry(shape);g.rotateX(-Math.PI/2);g.translate(0,y,0);w.planarUV(g);
    const m=new THREE.Mesh(g,w.mat(color,'dirt'));m.receiveShadow=true;w.active.add(m);w.generated.push(g);return m;
  };
  const waterGeo=new THREE.PlaneGeometry(12000,12000);waterGeo.rotateX(-Math.PI/2);
  const waterMat=new THREE.MeshStandardMaterial({color:0x354f50,roughness:.4,metalness:.2});
  const water=new THREE.Mesh(waterGeo,waterMat);water.position.y=-2.2;w.active.add(water);w.generated.push(waterGeo,waterMat);
  for(const poly of A.ISLANDS){surface(poly,-1.9,0x526963,1.06);surface(poly,-.18,0xa99f80,1.018);surface(poly,0,0x777965);}
  const strip=(a,b,width,y,color)=>{
    const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
    const m=w.box((a.x+b.x)/2,y,(a.z+b.z)/2,width,.08,len+.3,color,false,'dirt');m.rotation.y=Math.atan2(dx,dz);
  };
  for(const road of A.ROADS)for(let i=1;i<road.length;i++)strip(road[i-1],road[i],12,.06,0xb2a17a);
  // Continuous bridge corridors use the same endpoints as navigation.
  for(const [a,b] of A.BRIDGES){
    const length=Math.hypot(b.x-a.x,b.z-a.z),n=Math.ceil(length/20),angle=Math.atan2(b.x-a.x,b.z-a.z);
    for(let i=0;i<n;i++){const t=(i+.5)/n,m=w.model('coastal_bridge',a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,angle);m.scale.z=length/n/20;m.updateMatrixWorld(true);}
  }
  const reserved=(x,z,pad=18)=>SITES.some(s=>Math.hypot(s.x-x,s.z-z)<pad)||Math.hypot(x-A.HOME.x,z-A.HOME.z)<20||Math.hypot(x-SHADY_SHORES.x,z-SHADY_SHORES.z)<65+pad;
  w.settlementBuildings=[];
  const neighbourhoodModels=['coastal_house','ruin_rowhouse','ruin_warehouse','ruin_clinic','ruin_fuel_station'];
  const siteModels={clinic:'ruin_clinic',depot:'ruin_warehouse',camp:'ruin_rowhouse',checkpoint:'ruin_warehouse',station:'ruin_fuel_station',cistern:'ruin_warehouse'};
  for(const [townIndex,town] of A.TOWNS.entries()){
    const tx=town.x+20,tz=town.z-26;
    w.model('coastal_tower',tx,tz,0,town.kind==='city'?1.35:1);w.volumes.push({x:tx,z:tz,w:4,d:4,name:`${town.name} bell tower`});
    w.sign(`${town.name.toUpperCase()} / ${townIndex===0?'REBUILDING':'EVACUATED'}`,town.x+8,3,town.z+12,8);w.box(town.x+8,1.4,town.z+12,.18,2.8,.18,0x55564a);
    if(townIndex===0){strip({x:town.x,z:town.z},{x:tx,z:tz+8},3,.075,0xb2a17a);continue;}
    let placed=0;
    for(let attempt=0;attempt<1500&&placed<town.buildings;attempt++){
      const x=town.x+(Math.floor(r()*11)-5)*18,z=town.z+(Math.floor(r()*9)-4)*19;
      if(!A.isLand(x-8,z-8)||!A.isLand(x+8,z+8)||A.roadDistance(x,z)<16||reserved(x,z,20)||Math.hypot(x-tx,z-tz)<17||w.settlementBuildings.some(b=>Math.hypot(x-b.x,z-b.z)<17))continue;
      if(placed%6===0)w.building(x,z,'tenement',`${town.name} apartments`);
      else {
        const asset=neighbourhoodModels[(placed+townIndex)%neighbourhoodModels.length];
        w.model(asset,x,z);w.volumes.push({x,z,w:asset==='coastal_house'?5:6,d:asset==='coastal_house'?4.5:5,name:`${town.name} abandoned building`});
      }
      w.settlementBuildings.push({x,z,town:town.id});placed++;
      w.model('rubble_cluster',x-6,z+5,r()*6,1.2);
      if(placed%4===0){w.model('wreck',x+8,z+8,r()*6,1.1);w.collider(x+8,.7,z+8,2.5,1.4,4);}
      if(placed%3===0)w.model('dead_tree',x-8,z-7,r()*6,1.5);
    }
    // Safe walking access to every settlement cache and the tower plaza.
    strip({x:town.x,z:town.z},{x:tx,z:tz+8},3,.075,0xb2a17a);
  }
  for(const site of SITES){
    w.building(site.x,site.z,site.building,site.name,siteModels[site.id]);const y=site.upstairs?3.6:0;
    w.model('crate',site.x-1,site.z-3.8,0,1,y);
    w.target(site.id,site.name,site.upstairs?'Search upstairs cache':'Search supply cache',site.x-1,y+.65,site.z-2.8,{site:true,level:y});
    w.sign(site.name.toUpperCase(),site.x,siteModels[site.id]==='ruin_fuel_station'?4.2:2.9,site.z+(siteModels[site.id]==='ruin_fuel_station'?11.7:site.building==='store'?5.23:6.23),6);
    if(site.id==='checkpoint')w.model('service_rifle',site.x-1,site.z-3.7,Math.PI/2,1,1.2);
  }
  buildStarrySands(w);
  buildShadyShores(w);
  const h=A.HOME;
  w.box(h.x,1.45,h.z+4,9,2.9,5,0x575f54,true,'concrete');w.box(h.x,3.03,h.z+4,10,.35,6,0x65685b,true,'concrete');
  w.box(h.x,1.3,h.z+1.43,2.5,2.6,.12,0x40534c);w.sign('SHELTER 07',h.x,2.8,h.z+1.35,3.5);
  w.target('home','Shelter 07','Enter shelter & unload',h.x,1.2,h.z+.2);w.lamp(h.x,3,h.z+.9,0xdfb36d,12);
  strip(h,{x:h.x,z:A.TOWNS[0].z},4,.08,0xb2a17a);
  const [pierStart,pierEnd]=A.HOLLOWAY_PIER,pierLength=pierEnd.z-pierStart.z;
  w.box(pierStart.x,-.2,(pierStart.z+pierEnd.z)/2,3.6,.4,pierLength,0x80694d,'floor','dirt');
  for(let z=pierStart.z+3;z<pierEnd.z;z+=6)for(const side of [-1,1])w.box(pierStart.x+side*1.55,-1.25,z,.35,2.5,.35,0x554737);
  w.sign('STARRY SANDS PIER',pierStart.x,2.4,pierStart.z+1,3.3);
  // Harbour piers and moored sailing boats west of Azure Port.
  const port=A.TOWNS[4];
  for(let i=0;i<3;i++){
    const z=port.z-25+i*22;w.box(port.x-35,-.25,z,80,.5,5,0x73634c,false,'dirt');
    for(let x=port.x-72;x<port.x;x+=12)for(const side of [-1,1])w.box(x,-1.5,z+side*2, .45,3,.45,0x574e3c);
  }
  // Repeated pines are instanced in spatial cells, keeping the kilometre-scale map affordable.
  const trees=new Map();
  for(let i=0;i<14500;i++){
    const x=(r()-.5)*A.MAP_WIDTH,z=(r()-.5)*A.MAP_HEIGHT;
    if(!A.isLand(x,z)||A.roadDistance(x,z)<15||reserved(x,z,22)||A.TOWNS.some(t=>Math.hypot(t.x-x,t.z-z)<115))continue;
    const key=`${Math.floor(x/180)},${Math.floor(z/180)}`;if(!trees.has(key))trees.set(key,[]);trees.get(key).push({x,z,s:5+r()*7,dead:r()<.7});
  }
  const trunkG=new THREE.CylinderGeometry(.22,.45,1,5),leafG=new THREE.ConeGeometry(1,1,7);w.generated.push(trunkG,leafG);
  const dummy=new THREE.Object3D();
  for(const positions of trees.values())for(const leaves of [false,true]){
    const m=new THREE.InstancedMesh(leaves?leafG:trunkG,w.mat(leaves?0x555e47:0x595749),positions.length);
    positions.forEach((p,i)=>{dummy.position.set(p.x,p.s*(leaves?.65:.3),p.z);dummy.scale.set(leaves?(p.dead?.04:p.s*.35):1,p.s*(leaves?.95:.65),leaves?(p.dead?.04:p.s*.35):1);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);});
    m.castShadow=true;m.receiveShadow=true;w.active.add(m);
  }
  const rockG=new THREE.DodecahedronGeometry(1,0);w.generated.push(rockG);
  for(const poly of A.ISLANDS)for(let i=0;i<poly.length;i+=2){const p=poly[i];if(A.roadDistance(p.x,p.z)<18)continue;const m=new THREE.Mesh(rockG,w.mat(0x878477,'concrete'));m.position.set(p.x,1,p.z);m.scale.set(4+r()*6,2+r()*5,4+r()*4);m.rotation.y=r()*6;w.active.add(m);}
  for(const [px,pz,rad,ht] of [[1110,157,65,70],[1160,141,80,115],[1210,175,65,72],[1234,841,55,48],[698,871,46,32],[310,166,44,32]]){
    const p=A.mapPoint([px,pz]),g=new THREE.ConeGeometry(rad,ht,7);g.translate(0,ht/2,0);const m=new THREE.Mesh(g,w.mat(ht>60?0x818475:0x65784d,'dirt'));m.position.set(p.x,0,p.z);w.active.add(m);w.generated.push(g);
    w.collider(p.x,ht/2,p.z,rad*.8,ht,rad*.8);
  }
  A.TOWNS.forEach((t,i)=>{for(let j=0;j<(i===1?3:2);j++){const x=t.x-38+j*(i===1?40:80),z=t.z-80;if(A.isLand(x,z))w.createEnemy(`coast_${i}_${j}`,x,z,i===1?'raider':'hound');}});
  w.addParticles(r);
}
