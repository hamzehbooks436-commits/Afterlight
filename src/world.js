import * as THREE from 'three';
import {createBike, toggleBike, rideBike, respawnBike} from './bike.js';
import {createBoats, toggleBoat, rideBoat} from './boat.js';
import {SHADY_SHORES} from './settlement.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {SITES, clamp} from './state.js';
import * as F from './field.js';
import * as A from './archipelago.js';
import {buildCoast} from './coastal-world.js';
import {ROOMS, SHELTER_LIMIT, FLOOR_HEIGHT, placements} from './shelter.js';
import {buildShelterWing} from './shelter-world.js';
import {canOccupy, floorHeight, moveCapsule, nearestClearPosition, segmentBlocked, findPath, HEIGHT} from './physics.js';

const V=THREE.Vector3;
const bounds=b=>({minX:b.min.x,minY:b.min.y,minZ:b.min.z,maxX:b.max.x,maxY:b.max.y,maxZ:b.max.z});
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const ASSETS=['survivor','bunk','generator','water_tank','workbench','radio','crate','planter','dead_tree','wreck','mutant','ruin_tenement','ruin_store','ruin_rowhouse','ruin_warehouse','ruin_clinic','ruin_fuel_station','scavenger_pistol','service_rifle','scrap_pipe','rubble_cluster','fallout_barrel','shelter_room','hospital_bed','hydroponic_rack','kitchen_range','coastal_house','coastal_bridge','coastal_boat','coastal_tower','flashlight','shelter_bike','raider_scout','raider_guard','raider_brute','shelter_lift','shelter_airlock','shelter_reception','shelter_radio_room','shelter_computer_station','shelter_server_rack','shelter_mess_table','shelter_reactor','settlement_home','settlement_workshop','settlement_market','shelter09_hospital','settler_medic','settler_trader','settler_mechanic','settler_guard','settler_resident','settler_nurse','renovated_home','renovated_clinic','renovated_shop','renovated_school','renovated_farm','renovated_power','town_planter','town_bench','town_lamp','town_sign','town_fence','town_solar_array','town_reactor_link','town_playground','town_well','town_street_tree','town_market_stall','town_greenhouse','town_watch_post','town_water_tower'];

export class World {
  constructor(container,events={}){
    this.container=container;this.events=events;this.assets={};this.materials=new Map();this.textures=new Map();this.generated=[];
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x9b9a86);this.scene.fog=new THREE.FogExp2(0x9b9a86,.01);
    this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.3;this.renderer.autoClear=false;this.renderer.info.autoReset=false;
    this.canvas=this.renderer.domElement;this.canvas.tabIndex=0;this.canvas.setAttribute('aria-label','Afterlight first-person game. WASD to move, mouse to look, E to interact.');container.prepend(this.canvas);
    this.camera=new THREE.PerspectiveCamera(76,1,.06,5000);this.camera.rotation.order='YXZ';this.active=new THREE.Group();this.scene.add(this.active);this.player=new THREE.Object3D();
    this.ambient=new THREE.HemisphereLight(0xd1c8aa,0x40382e,1.8);this.scene.add(this.ambient);
    this.sun=new THREE.DirectionalLight(0xffd49d,2.8);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);
    Object.assign(this.sun.shadow.camera,{left:-34,right:34,top:34,bottom:-34,near:1,far:160});this.sun.shadow.bias=-.00025;this.sun.shadow.normalBias=.035;this.scene.add(this.sun,this.sun.target);
    this.torch=new THREE.SpotLight(0xffe7b7,38,52,.47,.6,1.2);this.torch.castShadow=true;this.torch.shadow.mapSize.set(512,512);this.scene.add(this.torch,this.torch.target);
    this.muzzleLight=new THREE.PointLight(0xffb64f,0,8,2);this.scene.add(this.muzzleLight);
    this.viewScene=new THREE.Scene();this.viewCamera=new THREE.PerspectiveCamera(65,1,.025,5);this.viewScene.add(new THREE.HemisphereLight(0xe3dcc9,0x363230,2.5));
    const light=new THREE.DirectionalLight(0xffdfb0,2.2);light.position.set(-2,3,1);this.viewScene.add(light);this.gun=new THREE.Group();this.viewScene.add(this.gun);
    this.raycaster=new THREE.Raycaster();this.direction=new V();this.velocityY=0;this.cooldown=0;this.reloading=0;this.recoil=0;this.flash=0;this.bob=0;this.stepClock=0;this.gunResources=[];this.flashlightModel=null;
    this.buildSky();this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.resize();
  }
  async load(progress=()=>{}){
    const loader=new GLTFLoader();let loaded=0;
    await Promise.all(ASSETS.map(async name=>{
      let source;
      try{({scene:source}=await loader.loadAsync(`${import.meta.env.BASE_URL}models/${name}.glb`));}
      catch(error){throw new Error(`Could not load model ${name}.glb: ${error.message}`,{cause:error});}
      source.updateMatrixWorld(true);const collisions=[],floors=[];
      source.traverse(o=>{if(!o.isMesh)return;
        if(/^(WALL_|FLOOR_)/.test(o.name)){const b=bounds(new THREE.Box3().setFromObject(o));collisions.push(b);if(o.name.startsWith('FLOOR_'))floors.push(b);}
        if(/Fallout.*(concrete|plaster|brick|edge)/.test(o.material.name)){o.material.map=this.texture('concrete');o.material.bumpMap=this.texture('concrete');o.material.bumpScale=.065;o.material.needsUpdate=true;}
        if(o.material.name.startsWith('Coast /')){o.material.map=this.texture('concrete');o.material.bumpMap=this.texture('concrete');o.material.bumpScale=.12;o.material.side=THREE.DoubleSide;o.material.needsUpdate=true;}
        o.castShadow=true;o.receiveShadow=true;
      });
      let asset=source;
      if(name!=='survivor'&&name!=='shelter_bike'){
        const byMaterial=new Map();source.traverse(o=>{if(o.isMesh){const g=this.planarUV(o.geometry.clone().applyMatrix4(o.matrixWorld));if(!byMaterial.has(o.material))byMaterial.set(o.material,[]);byMaterial.get(o.material).push(g);}});
        asset=new THREE.Group();for(const [m,geos] of byMaterial){const merged=mergeGeometries(geos);if(merged){asset.add(new THREE.Mesh(merged,m));geos.forEach(g=>g.dispose());}else for(const g of geos)asset.add(new THREE.Mesh(g,m));}source.traverse(o=>o.geometry?.dispose());
      }
      asset.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});asset.userData={collisions,floors};this.assets[name]=asset;progress(++loaded/ASSETS.length);
    }));
  }
  planarUV(g){
    if(!g.attributes.normal)g.computeVertexNormals();const p=g.attributes.position,n=g.attributes.normal,uv=new Float32Array(p.count*2);
    for(let i=0;i<p.count;i++){uv[i*2]=(Math.abs(n.getX(i))>.6?p.getZ(i):p.getX(i))*.24;uv[i*2+1]=(Math.abs(n.getY(i))>.6?p.getZ(i):p.getY(i))*.24;}
    g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.deleteAttribute('tangent');return g;
  }
  texture(kind){
    if(this.textures.has(kind))return this.textures.get(kind);
    const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d'),r=rng(kind==='asphalt'?431:716);
    ctx.fillStyle=kind==='asphalt'?'#76756e':kind==='dirt'?'#a09a87':'#d5d1c5';ctx.fillRect(0,0,256,256);
    for(let i=0;i<12500;i++){const v=Math.floor(75+r()*135);ctx.fillStyle=`rgba(${v},${v},${v},${.05+r()*.18})`;ctx.fillRect(r()*256,r()*256,r()*3+1,r()*2+1);}
    for(let i=0;i<(kind==='asphalt'?10:3);i++){let x=r()*256,y=r()*256;ctx.beginPath();ctx.moveTo(x,y);for(let j=0;j<9;j++){x+=(r()-.5)*28;y+=r()*17;ctx.lineTo(x,y);}ctx.strokeStyle=kind==='asphalt'?'#343633':'#78786d';ctx.lineWidth=kind==='asphalt'?1.4:.4;ctx.stroke();}
    const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;this.textures.set(kind,t);return t;
  }
  mat(color,texture=null,extra={}){
    const key=`${color}/${texture}/${JSON.stringify(extra)}`;if(!this.materials.has(key))this.materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.87,map:texture?this.texture(texture):null,bumpMap:texture?this.texture(texture):null,bumpScale:texture==='concrete'?.055:.09,...extra}));return this.materials.get(key);
  }
  box(x,y,z,w,h,d,color,solid=false,texture=null,extra={}){
    const g=this.planarUV(new THREE.BoxGeometry(w,h,d));this.generated.push(g);const m=new THREE.Mesh(g,this.mat(color,texture,extra));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;this.active.add(m);this.staticRoots.push(m);
    if(solid){const b={minX:x-w/2,maxX:x+w/2,minY:y-h/2,maxY:y+h/2,minZ:z-d/2,maxZ:z+d/2};this.boxes.push(b);if(solid==='floor')this.floors.push(b);}return m;
  }
  model(name,x=0,z=0,rotation=0,scale=1,y=0,dynamic=false){
    if(!this.assets[name])throw new Error(`Model ${name}.glb was used without being loaded`);
    const m=this.assets[name].clone(true);m.position.set(x,y,z);m.rotation.y=rotation;m.scale.setScalar(scale);this.active.add(m);m.updateMatrixWorld(true);if(!dynamic)this.staticRoots.push(m);
    const transform=b=>bounds(new THREE.Box3(new V(b.minX,b.minY,b.minZ),new V(b.maxX,b.maxY,b.maxZ)).applyMatrix4(m.matrixWorld));
    for(const b of m.userData.collisions||[])this.boxes.push(transform(b));for(const b of m.userData.floors||[])this.floors.push(transform(b));return m;
  }
  recoverFromVoid(){
    if(this.zone!=='wasteland'||this.player.position.y>=-6)return false;
    const p=this.player.position,nearHospital=Math.abs(p.x-SHADY_SHORES.x)<18&&Math.abs(p.z-(SHADY_SHORES.z-25))<18;
    p.set(nearHospital?SHADY_SHORES.x:A.SPAWN.x,nearHospital?-4.08:0,nearHospital?SHADY_SHORES.z-14.5:A.SPAWN.z);
    this.velocityY=0;this.lastClearPosition=p.clone();
    this.state.position={x:p.x,y:p.y,z:p.z};
    return true;
  }
  collider(x,y,z,w,h,d){this.boxes.push({minX:x-w/2,maxX:x+w/2,minY:y-h/2,maxY:y+h/2,minZ:z-d/2,maxZ:z+d/2});}
  target(id,name,action,x,y,z,extra={}){const t={id,name,action,x,y,z,...extra};this.targets.push(t);return t;}
  sign(text,x,y,z,width=4,rotation=0,color='#d5c9a8'){
    const c=document.createElement('canvas');c.width=768;c.height=192;const ctx=c.getContext('2d');ctx.fillStyle='#343b34';ctx.fillRect(0,0,768,192);ctx.strokeStyle=color;ctx.lineWidth=3;ctx.strokeRect(10,10,748,172);ctx.fillStyle=color;ctx.font='bold 52px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,98,710);
    const r=rng(text.length*913);ctx.fillStyle='rgba(20,20,18,.24)';for(let i=0;i<190;i++)ctx.fillRect(r()*768,r()*192,r()*15,1+r()*2);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const mat=new THREE.MeshStandardMaterial({map:t,roughness:1,side:THREE.DoubleSide});const g=new THREE.PlaneGeometry(width,width/4);const m=new THREE.Mesh(g,mat);m.position.set(x,y,z);m.rotation.y=rotation;this.active.add(m);this.generated.push(t,mat,g);return m;
  }
  lamp(x,y,z,color=0xffb961,power=17){
    this.box(x,y+.1,z,.75,.17,.35,0x242723);this.box(x,y,z,.58,.05,.22,color,false,null,{emissive:color,emissiveIntensity:2});
    const light=new THREE.PointLight(color,power,13,2);light.position.set(x,y-.15,z);this.active.add(light);this.lights.push({light,power});return light;
  }
  setZone(s){
    this.generated.forEach(o=>o.dispose());this.generated=[];this.active.clear();this.staticRoots=[];this.boxes=[];this.floors=[];this.targets=[];this.volumes=[];this.enemies=[];this.npcs=[];this.settlers=[];this.townResidents=[];this.lights=[];this.smoke=[];
    for(const t of this.tracers||[]){t.m.geometry.dispose();t.m.material.dispose();}this.tracers=[];
    this.state=s;this.zone=s.zone;this.velocityY=0;this.reloading=0;this.cooldown=0;this.flash=0;this.ash=null;
    if(s.zone==='shelter')this.buildShelter();else this.buildWasteland();this.batchStatic();
    this.player.position.set(s.position.x,s.position.y||0,s.position.z);
    this.recoverFromVoid();
    const limit=this.zone==='shelter'?SHELTER_LIMIT:F.WORLD_LIMIT,walkable=this.zone==='wasteland'?(x,z)=>A.isWalkable(x,z)||A.isNavigableWater(x,z):null;
    if(!canOccupy(this.boxes,this.player.position.x,this.player.position.y,this.player.position.z,HEIGHT,.28,limit)||(walkable&&!walkable(this.player.position.x,this.player.position.z))){
      const clear=nearestClearPosition(this.boxes,this.floors,this.player.position,limit,walkable);
      if(clear)this.player.position.set(clear.x,clear.y,clear.z);
      else this.player.position.copy(this.zone==='shelter'?new V(0,0,5.5):new V(A.SPAWN.x,0,A.SPAWN.z));
    }
    if(this.zone==='wasteland'&&(!walkable(this.player.position.x,this.player.position.z)||!canOccupy(this.boxes,this.player.position.x,this.player.position.y,this.player.position.z,HEIGHT,.28,limit))){
      const home=nearestClearPosition(this.boxes,this.floors,new V(A.SPAWN.x,0,A.SPAWN.z),limit,A.isWalkable);
      if(home)this.player.position.set(home.x,home.y,home.z);
    }
    s.position={x:this.player.position.x,y:this.player.position.y,z:this.player.position.z};
    this.lastClearPosition=this.player.position.clone();
    createBike(this);createBoats(this);s.position={x:this.player.position.x,y:this.player.position.y,z:this.player.position.z};this.equip(s.field.equipped);this.sky.visible=s.zone==='wasteland';this.syncCamera(0);this.updateAtmosphere(1,0);
  }
  batchStatic(){
    // Spatial material batches keep detailed Blender architecture affordable to render.
    this.active.updateMatrixWorld(true);const batches=new Map();
    for(const root of this.staticRoots){const cell=`${Math.floor(root.position.x/40)},${Math.floor(root.position.z/40)}`;root.traverse(o=>{if(!o.isMesh)return;const key=`${cell}/${o.material.uuid}`;if(!batches.has(key))batches.set(key,{mat:o.material,geos:[]});const g=o.geometry.clone().applyMatrix4(o.matrixWorld);if(!g.attributes.uv)this.planarUV(g);g.deleteAttribute('tangent');batches.get(key).geos.push(g);});this.active.remove(root);}
    for(const {mat,geos} of batches.values()){const g=mergeGeometries(geos);if(g){const m=new THREE.Mesh(g,mat);m.castShadow=true;m.receiveShadow=true;this.active.add(m);this.generated.push(g);}geos.forEach(g=>g.dispose());}this.staticRoots=[];
  }
  buildShelter(){
    buildShelterWing(this);
    for(let i=1;i<this.state.residents.length;i++)this.createNPC(this.state.residents[i],i);
  }
  buildWasteland(){
    buildCoast(this);
  }
  building(x,z,type,name,variant){
    const asset=variant|| (type==='tenement'?'ruin_tenement':'ruin_store');
    const model=this.model(asset,x,z);this.volumes.push({x,z,w:type==='tenement'?7:6,d:type==='tenement'?6:5,type,name});this.model('rubble_cluster',x-7,z+6,0,.85);return model;
  }
  addSmoke(x,z){
    if(!this.smokeTexture){
      const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),gradient=ctx.createRadialGradient(64,64,3,64,64,64);
      gradient.addColorStop(0,'rgba(53,57,50,.7)');gradient.addColorStop(.35,'rgba(53,57,50,.45)');gradient.addColorStop(.75,'rgba(53,57,50,.12)');gradient.addColorStop(1,'rgba(53,57,50,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);this.smokeTexture=new THREE.CanvasTexture(c);this.smokeTexture.colorSpace=THREE.SRGBColorSpace;
    }
    for(let i=0;i<7;i++){const mat=new THREE.SpriteMaterial({map:this.smokeTexture,transparent:true,opacity:.8-i*.075,depthWrite:false});this.generated.push(mat);const m=new THREE.Sprite(mat);m.position.set(x+i*.45,2+i*2.1,z);m.scale.set(4+i*1.3,5+i*1.6,1);this.active.add(m);this.smoke.push({m,x,z,i});}
    this.box(x,.7,z,.5,1.2,.6,0xeb8a3d,false,null,{emissive:0xf78b35,emissiveIntensity:2});
  }
  addParticles(r){
    const positions=new Float32Array(850*3);for(let i=0;i<850;i++){positions[i*3]=(r()-.5)*85;positions[i*3+1]=r()*24;positions[i*3+2]=(r()-.5)*85;}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));const m=new THREE.PointsMaterial({color:0xb2b6a0,size:.075,transparent:true,opacity:.45,depthWrite:false});this.generated.push(g,m);this.ash=new THREE.Points(g,m);this.active.add(this.ash);
  }
  createNPC(person,index){
    const preferred={Engineer:'workshop',Botanist:'garden',Cook:'kitchen',Medic:'hospital',Scavenger:'storage'}[person.role]||'gym';
    const assigned=this.state.shelter.assignments?.[person.name];
    const work=assigned?placements(this.state).find(place=>place.floor===assigned.floor&&place.slot===assigned.slot):placements(this.state,preferred)[0];
    const beds=placements(this.state,'bedrooms');
    const anchors=beds.flatMap((room,i)=>{const locations=[[-2.6,-1.6],[2.6,-1.6],...(room.room.level>=2?[[0,1.9]]:[]),...(this.state.upgrades.bunks&&i===0?[[0,-2.1]]:[])];return locations.flatMap(([dx,dz])=>[0,1].map(layer=>({room,x:room.x+dx,z:room.z+dz,y:room.y+(layer?1.65:.65)})));});
    const sleep=anchors[index-1]||null;
    const night=this.state.minute>=22*60||this.state.minute<6*60;
    const pos=night&&sleep?{x:sleep.x,z:sleep.z,y:sleep.y}:work?{x:work.x,z:work.z+1,y:work.y}:{x:0,z:0,y:0};
    const m=this.model('survivor',pos.x,pos.z,0,.86,pos.y,true);if(night&&sleep)m.rotation.x=-Math.PI/2;
    m.traverse(o=>{if(o.isMesh&&o.name.includes('jacket')){o.material=o.material.clone();o.material.color.set(person.role==='Engineer'?0x8b795a:person.role==='Botanist'?0x687955:person.role==='Medic'?0xb8b7a3:person.role==='Cook'?0x906a4c:0x6c8584);this.generated.push(o.material);}});
    const carried=this.assets.crate.clone(true);carried.scale.setScalar(.32);carried.position.set(0,.8,-.42);m.add(carried);carried.visible=false;
    this.npcs.push({model:m,carried,person,work,sleep,night,step:0,path:[],timer:8+index*3,workClock:0,status:night?'sleeping in bed':'working in '+(work?ROOMS[work.room.id].name:'reception'),legs:['leg_L','leg_R'].map(n=>m.getObjectByName(n)),arms:['arm_L','arm_R'].map(n=>m.getObjectByName(n))});
  }
  createEnemy(id,x,z,type){
    if(this.state.field.defeated[id]!==undefined&&this.state.day-this.state.field.defeated[id]<3)return;
    const raider=type==='raider',variant=['raider_scout','raider_guard','raider_brute','shelter_lift','shelter_reactor'][Math.abs(Number(id.split('_').at(-1))||0)%3];
    const m=this.model(raider?variant:'mutant',x,z,Math.PI,raider?.9:type==='brute'?1.2:.85,0,true);
    const enemy={id,model:m,type,variant:raider?variant:null,health:raider?95:type==='brute'?150:70,home:{x,z},attack:0,flee:0,phase:x+z,dead:false};
    m.traverse(o=>{if(o.isMesh)o.userData.enemy=enemy;});this.enemies.push(enemy);
  }
  equip(id){
    this.gunResources.forEach(o=>o.dispose());this.gunResources=[];this.gun.clear();this.weaponId=id;this.reloading=0;this.weapon=this.assets[F.WEAPONS[id].model].clone(true);this.gun.add(this.weapon);
    this.flashlightModel=this.assets.flashlight.clone(true);this.flashlightModel.position.set(-.23,-.18,-.52);this.flashlightModel.rotation.set(0,Math.PI/2,-.12);this.flashlightModel.scale.setScalar(.62);this.gun.add(this.flashlightModel);
    const glove=this.mat(0x55554b),sleeve=this.mat(0x6b6950);
    for(const [x,y,z,w,h,d,mat] of [[.015,-.2,.005,.095,.13,.12,glove],[.07,-.32,.11,.13,.25,.15,sleeve],[-.08,-.12,-.24,.095,.12,.14,glove],[-.16,-.28,-.11,.12,.32,.15,sleeve]]){
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.rotation.z=x<0?-.32:.28;this.gun.add(mesh);this.gunResources.push(mesh.geometry);
    }
    const flash=new THREE.Mesh(new THREE.OctahedronGeometry(.06),new THREE.MeshBasicMaterial({color:0xffd590,transparent:true,opacity:.95,depthTest:false}));flash.position.set(0,.025,id==='rifle'?-.98:-.41);flash.scale.set(.5,.5,2.4);this.weapon.add(flash);this.muzzle=flash;this.gunResources.push(flash.geometry,flash.material);this.gun.visible=this.zone==='wasteland'&&!this.riding&&!this.activeBoat&&!this.state.field.swimming;
  }
  look(dx,dy){this.state.field.yaw-=dx*.0022*this.state.field.settings.sensitivity;this.state.field.pitch=clamp(this.state.field.pitch-dy*.0022*this.state.field.settings.sensitivity,-1.42,1.42);}
  beginReload(){
    if(this.riding||this.activeBoat||this.state.field.swimming)return false;
    const id=this.state.field.equipped,w=this.state.field.weapons[id],spec=F.WEAPONS[id];if(this.reloading||id==='pipe'||w.mag>=spec.magazine||w.reserve<=0)return false;this.reloading=spec.reload;this.events.sound?.('reload');return true;
  }
  shoot(){
    if(this.riding||this.activeBoat||this.state.field.swimming||this.cooldown>0||this.reloading>0||this.zone!=='wasteland')return null;
    const s=this.state,id=s.field.equipped,spec=F.WEAPONS[id];if(!F.fire(s)){this.cooldown=.25;this.events.sound?.('empty');return {empty:true};}
    this.cooldown=spec.delay;this.recoil=id==='pipe'?.22:.075;this.flash=id==='pipe'?0:.06;this.events.sound?.(id==='pipe'?'swing':'shot');
    this.camera.updateMatrixWorld();this.camera.getWorldDirection(this.direction);const start=this.camera.position.clone(),end=start.clone().addScaledVector(this.direction,spec.range);
    this.raycaster.set(start,this.direction);this.raycaster.far=spec.range;const hits=this.raycaster.intersectObjects(this.enemies.filter(e=>!e.dead).map(e=>e.model),true);let enemy=null;
    if(hits.length&&!segmentBlocked(start,hits[0].point,this.boxes)){enemy=hits[0].object.userData.enemy;end.copy(hits[0].point);}
    if(enemy){enemy.health-=spec.damage;this.events.hit?.();if(enemy.health<=0){enemy.dead=true;enemy.model.visible=false;s.field.defeated[enemy.id]=s.day;s.field.kills++;this.events.toast?.(enemy.type==='raider'?'Raider down.':'Creature down.');}}
    if(id!=='pipe')this.tracer(start.clone().add(new V(.12,-.13,0)),end,0xe5bf6d);return {hit:!!enemy,killed:!!enemy?.dead};
  }
  tracer(a,b,color){const g=new THREE.BufferGeometry().setFromPoints([a,b]),mat=new THREE.LineBasicMaterial({color,transparent:true,opacity:.45});const m=new THREE.Line(g,mat);this.active.add(m);this.tracers.push({m,life:.055});}
  flare(){for(const e of this.enemies)e.flee=14;this.flash=.5;this.events.sound?.('flare');}
  toggleBike(id){return toggleBike(this,id);}
  respawnBike(id){return respawnBike(this,id);}
  toggleBoat(id){return toggleBoat(this,id);}
  nearest(){
    if(this.riding)return {id:this.activeBikeId,name:this.activeBikeId==='bike_extra'?'Shelter spare bicycle':'Shelter courier bicycle',action:'Brake & dismount'};
    if(this.activeBoat)return {id:this.activeBoat,name:'Boat',action:'Dock and disembark'};
    this.camera.getWorldDirection(this.direction);const eye=this.camera.position;
    const bikeTargets=Object.keys(this.bikes||{}).map(id=>{const b=this.state.field[id];return {id,name:id==='bike_extra'?'Shelter spare bicycle':'Shelter courier bicycle',action:'Ride bicycle',x:b.x,y:b.y+.8,z:b.z};});
    const targets=[...bikeTargets,...(this.boats||[]).map(({id})=>({id,name:id==='holloway'?'Starry Sands boat':'Azure Port boat',action:'Board and steer',x:this.state.field.boats[id].x,y:-.2,z:this.state.field.boats[id].z,boat:true})),...this.targets,...this.npcs.map(n=>({id:`npc-${n.person.name}`,name:n.person.name,action:n.status,x:n.model.position.x,y:n.model.position.y+1.3,z:n.model.position.z,npc:n})),...this.settlers.map(n=>({id:`settler-${n.id}`,name:`${n.name} · ${n.role}`,action:n.id==='trader'?'Trade':n.id==='medic'?'Talk to medic':'Talk',x:n.model.position.x,y:n.model.position.y+1.4,z:n.model.position.z,settler:n})),...this.townResidents.map(n=>({id:`town-resident-${n.name}`,name:n.name,action:n.status,x:n.model.position.x,y:n.model.position.y+1.4,z:n.model.position.z,townResident:n}))];
    return targets.map(t=>{const d=new V(t.x,t.y,t.z).sub(eye),dist=d.length();return {...t,dist,facing:d.normalize().dot(this.direction)};}).filter(t=>t.dist<2.75&&t.facing>.35&&!segmentBlocked(eye,{x:t.x,y:t.y,z:t.z},this.boxes)).sort((a,b)=>(b.facing-b.dist*.15)-(a.facing-a.dist*.15))[0]||null;
  }
  environment(){const p=this.player.position;return {sheltered:this.zone==='shelter'||this.volumes.some(b=>Math.abs(p.x-b.x)<b.w-.25&&Math.abs(p.z-b.z)<b.d-.25&&(p.y<2.8||p.z<b.z-3.5)),hazard:false};}
  location(){
    if(this.zone==='shelter'){const p=this.player.position,floor=Math.max(1,Math.min(this.state.shelter.floors,Math.floor((p.y+1)/FLOOR_HEIGHT)+1)),room=(this.roomLocations||[]).find(r=>r.floor===floor&&Math.abs(p.x-r.x)<4.8&&Math.abs(p.z-r.z)<5);return room?.id?`SHELTER 07 / FLOOR ${floor} / ${ROOMS[room.id].name.toUpperCase()}`:`SHELTER 07 / FLOOR ${floor}${p.x<-10?' / HALL':' / RECEPTION'}`;}const p=this.player.position,b=this.volumes.find(b=>b.name&&Math.abs(b.x-p.x)<b.w+2&&Math.abs(b.z-p.z)<b.d+2);
    const town=A.nearestTown(p.x,p.z);return this.activeBoat?`${town.name.toUpperCase()} / ON THE WATER`:this.state.field.swimming?`${town.name.toUpperCase()} / SWIMMING`:Math.hypot(p.x-SHADY_SHORES.x,p.z-SHADY_SHORES.z)<75?p.y<-2?'SHADY SHORES / SHELTER 09 HOSPITAL':'SHADY SHORES / SURFACE':b?b.name.toUpperCase():`${town.name.toUpperCase()} / ${Math.hypot(p.x-town.x,p.z-town.z)<140?'SETTLEMENT':'COAST ROAD'}`;
  }
  update(dt,time,input,paused=false){
    if(!this.state)return;const s=this.state,p=this.player.position;let moving=false;
    if(!paused){
      this.recoverFromVoid();
      const collisionLimit=this.zone==='shelter'?SHELTER_LIMIT:F.WORLD_LIMIT,walkable=this.zone==='wasteland'?(x,z)=>A.isWalkable(x,z)||A.isNavigableWater(x,z):null;
      const isClear=()=>canOccupy(this.boxes,p.x,p.y,p.z,1.1,.28,collisionLimit)&&(!walkable||walkable(p.x,p.z));
      if(!this.riding&&!this.activeBoat&&!isClear()){
        const clear=nearestClearPosition(this.boxes,this.floors,p,collisionLimit,walkable);
        if(clear)p.set(clear.x,clear.y,clear.z);
        else if(this.lastClearPosition)p.copy(this.lastClearPosition);
        this.velocityY=0;
      }
      if(isClear())this.lastClearPosition=p.clone();
      this.cooldown=Math.max(0,this.cooldown-dt);this.recoil*=Math.exp(-dt*16);this.flash=Math.max(0,this.flash-dt);
      if(this.reloading>0){this.reloading=Math.max(0,this.reloading-dt);if(!this.reloading){F.reload(s,this.weaponId);this.events.sound?.('loaded');}}
      let ix=Number(input.has('KeyD'))-Number(input.has('KeyA')),iz=Number(input.has('KeyW'))-Number(input.has('KeyS'));
      if(input.has('ArrowLeft'))s.field.yaw+=dt*1.6;if(input.has('ArrowRight'))s.field.yaw-=dt*1.6;if(input.has('ArrowUp'))s.field.pitch=clamp(s.field.pitch+dt,-1.4,1.4);if(input.has('ArrowDown'))s.field.pitch=clamp(s.field.pitch-dt,-1.4,1.4);
      const inWater=this.zone==='wasteland'&&!A.isWalkable(p.x,p.z)&&A.isNavigableWater(p.x,p.z);
      const crouch=!inWater&&(input.has('ControlLeft')||input.has('KeyC')||!canOccupy(this.boxes,p.x,p.y,p.z,HEIGHT,.28,this.zone==='shelter'?SHELTER_LIMIT:F.WORLD_LIMIT)),height=crouch?1.1:HEIGHT,sprint=(input.has('ShiftLeft')||input.has('ShiftRight'))&&s.field.stamina>2&&!crouch&&!inWater;
      const length=Math.hypot(ix,iz),speed=inWater?2.2:s.energy<5?1.7:crouch?1.8:sprint?6:3.6;
      if(this.riding)moving=rideBike(this,dt,input);
      else if(this.activeBoat)moving=rideBoat(this,dt,input);
      else if(length){ix/=length;iz/=length;const yaw=s.field.yaw,dx=(Math.cos(yaw)*ix-Math.sin(yaw)*iz)*dt*speed,dz=(-Math.sin(yaw)*ix-Math.cos(yaw)*iz)*dt*speed;const before=p.clone();moveCapsule(this.boxes,this.floors,p,dx,dz,height,collisionLimit,walkable);moving=before.distanceToSquared(p)>.00001;}
      const swimming=this.zone==='wasteland'&&!this.activeBoat&&!this.riding&&!A.isWalkable(p.x,p.z)&&A.isNavigableWater(p.x,p.z);
      s.field.swimming=swimming;
      s.field.stamina=clamp(s.field.stamina+dt*(swimming&&moving?-3:sprint&&moving&&!this.riding?-16:11),0,100);
      const floor=floorHeight(this.floors,p.x,p.z,p.y),grounded=p.y<=floor+.05;
      if(this.riding){this.velocityY=0;}
      else if(swimming||this.activeBoat){p.y=-1.5;this.velocityY=0;}
      else{
        if(!this.riding&&input.has('Space')&&grounded&&!this.jumpHeld){this.velocityY=5.6;this.events.sound?.('step');}
        this.velocityY-=dt*16;const nextY=p.y+this.velocityY*dt;
        if(this.velocityY>0&&!canOccupy(this.boxes,p.x,nextY,p.z,height,.27,collisionLimit))this.velocityY=0;else p.y=nextY;
        if(p.y<=floor){if(this.velocityY<-11)this.events.damage?.(Math.round((-this.velocityY-10)*3));p.y=floor;this.velocityY=0;}
      }
      this.jumpHeld=input.has('Space');
      if(!this.riding&&!this.activeBoat){
        if(isClear())this.lastClearPosition=p.clone();
        else if(this.lastClearPosition){p.copy(this.lastClearPosition);this.velocityY=0;}
      }
      if(moving&&!this.riding&&!this.activeBoat){this.bob+=dt*(swimming?5:sprint?13:9);this.stepClock+=dt;if(!swimming&&this.stepClock>(sprint?.28:.44)&&grounded){this.stepClock=0;this.events.sound?.('step');}}
      this.eyeHeight=THREE.MathUtils.lerp(this.eyeHeight||1.64,this.activeBoat?2.3:this.riding?1.45:swimming?1.8:crouch?1:1.64,1-Math.exp(-dt*12));
      this.updateNPCs(dt,time);this.updateSettlers(time);this.updateTownResidents?.(dt,time);this.updateEnemies(dt,time);if(s.field.equipped!==this.weaponId)this.equip(s.field.equipped);s.position={x:p.x,y:p.y,z:p.z};
    }
    this.syncCamera(moving&&s.field.settings.bob?Math.sin(this.bob)*.035:0);this.updateAtmosphere(paused?0:dt,time);
    this.gun.scale.setScalar(this.weaponId==='pipe'?.9:.8);
    this.gun.position.set(.24+(moving?Math.sin(this.bob*.5)*.01:0),-.24-(moving?Math.abs(Math.cos(this.bob))*.012:0)-(this.reloading?Math.sin((1-this.reloading/F.WEAPONS[this.weaponId].reload)*Math.PI)*.3:0),-.58+this.recoil);
    this.gun.rotation.set(this.reloading?-.5:this.weaponId==='pipe'?this.recoil*4:0,this.weaponId==='pipe'?-.3:0,this.reloading?-.45:0);
    this.muzzle.visible=this.flash>0&&this.weaponId!=='pipe';this.muzzle.rotation.z=time*50;this.gun.visible=this.zone==='wasteland'&&!this.riding&&!this.activeBoat&&!s.field.swimming;this.muzzleLight.position.copy(this.camera.position);this.muzzleLight.intensity=this.flash>0?7:0;
    this.camera.getWorldDirection(this.direction);this.torch.position.copy(this.camera.position);this.torch.target.position.copy(this.camera.position).addScaledVector(this.direction,10);
    const angle=s.minute/1440*Math.PI*2-Math.PI/2,night=Math.sin(angle)<-.08,autoFlashlight=this.zone==='wasteland'&&(night||s.weather==='Radstorm');
    this.torch.visible=s.field.flashlight||autoFlashlight;if(this.flashlightModel)this.flashlightModel.visible=this.torch.visible;
    for(const t of this.tracers){t.life-=dt;if(t.life<=0){this.active.remove(t.m);t.m.geometry.dispose();t.m.material.dispose();}}this.tracers=this.tracers.filter(t=>t.life>0);
    this.renderer.info.reset();this.renderer.clear();this.renderer.render(this.scene,this.camera);if(this.gun.visible){this.renderer.clearDepth();this.renderer.render(this.viewScene,this.viewCamera);}
  }
  syncCamera(bob){const f=this.state.field;this.camera.position.copy(this.player.position).add(new V(0,(this.eyeHeight||1.64)+bob,0));if(this.riding){const bike=f[this.activeBikeId];this.camera.position.x+=Math.sin(bike.yaw)*.35;this.camera.position.z+=Math.cos(bike.yaw)*.35;}this.camera.rotation.set(f.pitch+this.recoil*.15,f.yaw,0,'YXZ');this.camera.updateMatrixWorld();}
  updateNPCs(dt,time){
    const night=this.state.minute>=22*60||this.state.minute<6*60;
    for(const n of this.npcs){
      if(night){
        if(!n.night&&n.sleep){n.path=[];n.model.position.set(n.sleep.x,n.sleep.y,n.sleep.z);n.model.rotation.set(-Math.PI/2,0,0);}
        n.night=true;n.status=n.sleep?'sleeping in bed':'resting in reception';n.carried.visible=false;continue;
      }
      if(n.night){if(n.work)n.model.position.set(n.work.x,n.work.y,n.work.z+1);else n.model.position.set(0,0,0);n.model.rotation.set(0,0,0);n.path=[];n.night=false;}
      n.workClock+=dt;n.timer-=dt;
      const work=n.work,base=work?{x:work.x,z:work.z+1,y:work.y}:{x:0,z:0,y:0};
      n.status=work?`working in ${ROOMS[work.room.id].name}`:'waiting for a work room';
      if(work){
        const offset=n.step%2===0?-1:1,target={x:base.x+offset,z:base.z};
        const p=n.model.position,dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz);
        if(d>.2){moveCapsule(this.boxes,this.floors,p,dx/d*Math.min(d,dt*.85),dz/d*Math.min(d,dt*.85),HEIGHT,SHELTER_LIMIT);n.model.rotation.y=Math.atan2(-dx,-dz);}
        else if(n.timer<=0){n.step++;n.timer=8;}
        const walking=d>.2;for(let i=0;i<2;i++){if(n.legs[i])n.legs[i].rotation.x=walking?Math.sin(time*7+i*Math.PI)*.3:0;if(n.arms[i])n.arms[i].rotation.x=walking?-.7:-.3+Math.sin(time*3+i)*.12;}
      }
      if(n.workClock>=65){n.workClock=0;if(work&&F.crewWork(this.state,n.person.name,n.person.role))this.events.crew?.(n.person);}
    }
  }
  updateSettlers(time){
    for(const n of this.settlers){
      const [ax,az]=n.work[Math.floor(time/11+n.homeX)%n.work.length];
      const x=SHADY_SHORES.x+ax,z=SHADY_SHORES.z+az,p=n.model.position;
      const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);
      if(d>.08){p.x+=dx/d*Math.min(d,.018);p.z+=dz/d*Math.min(d,.018);n.model.rotation.y=Math.atan2(-dx,-dz);}
      p.y=n.baseY+Math.sin(time*2+n.homeX)*.018;
    }
  }
  updateEnemies(dt,time){
    const p=this.player.position;
    for(const e of this.enemies){
      if(e.dead||e.model.position.distanceToSquared(p)>180*180)continue;e.attack=Math.max(0,e.attack-dt);e.flee=Math.max(0,e.flee-dt);const m=e.model,dx=p.x-m.position.x,dz=p.z-m.position.z,d=Math.hypot(dx,dz),raider=e.type==='raider';
      const eye={x:m.position.x,y:raider?1.5:1,z:m.position.z},seen=d<(this.state.weather==='Fog'?17:30)&&!segmentBlocked(eye,this.camera.position,this.boxes);let vx=0,vz=0;
      if(e.flee){vx=-dx/(d||1);vz=-dz/(d||1);}else if(seen&&d>(raider?13:1.3)){vx=dx/(d||1);vz=dz/(d||1);}else if(!seen){const tx=e.home.x+Math.sin(time*.12+e.phase)*4,tz=e.home.z+Math.cos(time*.1+e.phase)*4,dd=Math.hypot(tx-m.position.x,tz-m.position.z);if(dd>.2){vx=(tx-m.position.x)/dd*.35;vz=(tz-m.position.z)/dd*.35;}}
      if(raider&&seen&&!e.flee)m.rotation.y=Math.atan2(-dx,-dz);
      if(vx||vz){const speed=e.flee?5:raider?2.5:e.type==='brute'?2:3.1;moveCapsule(this.boxes,this.floors,m.position,vx*dt*speed,vz*dt*speed,raider?1.7:1.2,F.WORLD_LIMIT,A.isWalkable);if(!raider||!seen||e.flee)m.rotation.y=Math.atan2(-vx,-vz);m.position.y=Math.abs(Math.sin(time*11+e.phase))*.05;}
      if(!e.flee&&seen&&Math.abs(p.y-m.position.y)<2.3&&d<(raider?24:1.8)&&e.attack===0){e.attack=raider?2.1:1.3;this.events.damage?.(raider?7:e.type==='brute'?17:9);this.events.sound?.(raider?'enemyshot':'growl');if(raider){m.updateMatrixWorld(true);const muzzle=new V(.12,1.26,-1.52).applyMatrix4(m.matrixWorld);this.tracer(muzzle,this.camera.position.clone(),0xda9f53);}}
    }
  }
  buildSky(){
    const uniforms={top:{value:new THREE.Color(0x66716d)},horizon:{value:new THREE.Color(0xb9a786)},sunDir:{value:new V(.3,.3,-.7)},light:{value:new THREE.Color(0xffd59a)},night:{value:0},time:{value:0}};
    const mat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms,vertexShader:'varying vec3 v; void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`
      varying vec3 v; uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 light; uniform float night; uniform float time;
      float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      void main(){vec3 d=normalize(v); float h=max(d.y,0.0); vec3 col=mix(horizon,top,pow(h,.48));
      float clouds=sin(d.x*16.+d.z*9.+time*.006)*sin(d.z*19.-d.x*5.)*.5+.5;
      col=mix(col,col*.72,clouds*.18*(1.-h));float sd=max(dot(d,sunDir),0.);
      col+=light*(pow(sd,450.)*.8+pow(sd,20.)*.13)*(1.-night);
      col+=vec3(.5,.58,.65)*pow(max(dot(d,-sunDir),0.),1400.)*night;
      float star=step(.9988,hash(floor(d*700.)))*night*pow(h,.4);col+=vec3(star*.65);gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`});
    this.sky=new THREE.Mesh(new THREE.SphereGeometry(4500,24,16),mat);this.sky.frustumCulled=false;this.sky.renderOrder=-10;this.scene.add(this.sky);
  }
  updateAtmosphere(dt,time){
    const s=this.state,p=this.player.position,outside=this.zone==='wasteland',storm=s.weather==='Radstorm',fog=s.weather==='Fog',angle=s.minute/1440*Math.PI*2-Math.PI/2,alt=Math.sin(angle),day=clamp((alt+.16)/.65,0,1);
    const skyColor=new THREE.Color(0x101923).lerp(new THREE.Color(0x9b9b86),day);if(alt>-.12&&alt<.3)skyColor.lerp(new THREE.Color(0xac8966),.5);if(storm)skyColor.lerp(new THREE.Color(0x738058),.65);if(fog)skyColor.lerp(new THREE.Color(0xa1aaa0),.45);if(!outside)skyColor.set(0x151c19);
    this.scene.fog.color.lerp(skyColor,Math.min(1,dt*1.5+.015));this.scene.background.copy(this.scene.fog.color);
    const density=outside?(storm?.041:fog?.034:s.weather==='Dust haze'?.0018:.00065):.009;this.scene.fog.density=THREE.MathUtils.lerp(this.scene.fog.density,density,Math.min(1,dt*.9+.008));
    this.sky.position.copy(p);this.sky.material.uniforms.horizon.value.copy(this.scene.fog.color);this.sky.material.uniforms.top.value.copy(new THREE.Color(0x111d2d).lerp(new THREE.Color(storm?0x4e5d45:0x677b80),day));
    const sunDir=this.sky.material.uniforms.sunDir.value.set(Math.cos(angle)*.7,alt,-.65).normalize();this.sky.material.uniforms.night.value=1-clamp((alt+.12)/.2,0,1);this.sky.material.uniforms.time.value=time;
    this.sun.position.copy(p).addScaledVector(alt>0?sunDir:sunDir.clone().negate(),75);this.sun.target.position.copy(p);this.sun.intensity=outside?(storm?.18:.3+day*2.4):.04;this.sun.color.set(day>.35?0xffd2a0:0x8da6cc);this.ambient.intensity=outside?.24+day*1.6:.72;this.ambient.color.set(outside?(storm?0xa0ad79:0xc5c9c1):0xd3c8ad);this.renderer.toneMappingExposure=outside?1.2:1.45;
    const flash=storm&&outside&&Math.sin(time*1.71)>.991?2.3:0;if(flash){this.ambient.intensity+=flash;if(!this.lightning)this.events.sound?.('thunder');}this.lightning=!!flash;
    for(const {light,power} of this.lights)light.intensity=power*(s.resources.fuel||s.shelter?.rooms?.reactor||outside?1:.2)*(1+Math.sin(time*8+light.position.x)*.018);
    if(outside&&this.ash){this.ash.position.set(p.x,0,p.z);const a=this.ash.geometry.attributes.position.array;if(dt)for(let i=0;i<a.length;i+=3){a[i]+=dt*(storm?7:1);a[i+1]-=dt*(storm?1.9:.4);if(a[i]>42)a[i]=-42;if(a[i+1]<.1)a[i+1]=24;}this.ash.geometry.attributes.position.needsUpdate=true;this.ash.material.opacity=storm?.7:fog?.15:.32;this.ash.material.color.set(storm?0xaec38b:0xd3cfb9);}
    for(const {m,x,z,i} of this.smoke){m.position.x=x+i*.5+Math.sin(time*.2+i)*.5;m.position.z=z+Math.cos(time*.17+i)*.4;}
  }
  resize(){const w=this.container.clientWidth||innerWidth,h=this.container.clientHeight||innerHeight;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.viewCamera.aspect=w/h;this.viewCamera.updateProjectionMatrix();}
}

