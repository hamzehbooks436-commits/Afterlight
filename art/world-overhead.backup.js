import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SITES, siteAvailable } from './state.js';
import { icon } from './icons.js';

const V=THREE.Vector3;
const colors={ground:0x353d35, dust:0x777863, concrete:0x7c8172, dark:0x303c36, amber:0xe6bb69, green:0xd2e698};
export class World {
  constructor(container, labels, onSelect, onGround) {
    this.container=container; this.labelsElement=labels; this.onSelect=onSelect; this.onGround=onGround;
    this.scene=new THREE.Scene(); this.scene.background=new THREE.Color(colors.ground);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));
    this.renderer.shadowMap.enabled=true; this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure=1.45;
    this.renderer.domElement.setAttribute('aria-label','3D game world. Click the ground to walk, or use WASD.');
    this.renderer.domElement.setAttribute('tabindex','0');
    container.prepend(this.renderer.domElement);
    this.camera=new THREE.OrthographicCamera(-15,15,12,-12,.1,180);
    this.raycaster=new THREE.Raycaster(); this.pointer=new THREE.Vector2();
    this.plane=new THREE.Plane(new V(0,1,0),0);
    this.assets={}; this.assetGeometries=new Set(); this.assetMaterials=new Set(); this.labels=[]; this.targets=[]; this.obstacles=[]; this.npcs=[];
    this.active=new THREE.Group(); this.scene.add(this.active);
    this.cameraFocus=new V(); this.cameraDesired=new V(); this.cameraOffset=new V(21,26,28);
    this.sun=new THREE.DirectionalLight(0xffdfaa,3.3); this.sun.position.set(-10,25,12); this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(2048,2048); this.sun.shadow.camera.left=-25; this.sun.shadow.camera.right=25;
    this.sun.shadow.camera.top=25; this.sun.shadow.camera.bottom=-25; this.sun.shadow.camera.far=85;
    this.sun.shadow.bias=-.0003; this.sun.shadow.normalBias=.035;
    this.scene.add(this.sun); this.scene.add(this.sun.target);
    this.ambient=new THREE.HemisphereLight(0xe5ebce,0x50564c,2.5); this.scene.add(this.ambient);
    this.fill=new THREE.DirectionalLight(0x9cc8bf,1.4); this.fill.position.set(12,8,-15); this.scene.add(this.fill);
    this.marker=new THREE.Mesh(new THREE.RingGeometry(.36,.42,36),new THREE.MeshBasicMaterial({color:0xd7e4b0,transparent:true,opacity:.9,side:THREE.DoubleSide}));
    this.marker.rotation.x=-Math.PI/2; this.marker.visible=false; this.scene.add(this.marker);
    this.resizeObserver=new ResizeObserver(()=>this.resize()); this.resizeObserver.observe(container);
    this.renderer.domElement.addEventListener('pointerdown',e=>{this.down={x:e.clientX,y:e.clientY};});
    this.renderer.domElement.addEventListener('pointerup',e=>{
      if(!this.down || Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)>12)return;
      const rect=container.getBoundingClientRect();
      this.pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
      this.raycaster.setFromCamera(this.pointer,this.camera);
      const hits=this.raycaster.intersectObjects(this.active.children,true);
      for(const hit of hits){let p=hit.object;while(p&&!p.userData.targetId)p=p.parent;if(p?.userData.targetId){this.onSelect(p.userData.targetId);return;}}
      const point=new V();if(this.raycaster.ray.intersectPlane(this.plane,point))this.onGround(point);
    });
    container.addEventListener('wheel',e=>{e.preventDefault();this.zoom=THREE.MathUtils.clamp((this.zoom||1)+e.deltaY*.0006,.78,1.35);this.resize();},{passive:false});
    this.resize();
  }
  async load(progress) {
    const names=['shelter','survivor','bunk','generator','water_tank','workbench','radio','crate','planter','dead_tree','ruin','wreck','mutant'];
    const loader=new GLTFLoader();let loaded=0;
    await Promise.all(names.map(async name=>{
      const gltf=await loader.loadAsync(`${import.meta.env.BASE_URL}models/${name}.glb`);
      let asset=gltf.scene;
      // Batch static Blender meshes by material; preserve survivor limb pivots.
      if(name!=='survivor'){
        const byMaterial=new Map();gltf.scene.updateMatrixWorld(true);
        gltf.scene.traverse(o=>{if(o.isMesh){const g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);if(!byMaterial.has(o.material))byMaterial.set(o.material,[]);byMaterial.get(o.material).push(g);}});
        asset=new THREE.Group();asset.name=name;
        for(const [material,geometries] of byMaterial){const merged=mergeGeometries(geometries,false);if(merged)asset.add(new THREE.Mesh(merged,material));else for(const geometry of geometries)asset.add(new THREE.Mesh(geometry,material));if(merged)for(const g of geometries)g.dispose();}
        gltf.scene.traverse(o=>{if(o.geometry)o.geometry.dispose();});
      }
      asset.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;this.assetGeometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])this.assetMaterials.add(m);}});
      this.assets[name]=asset;progress(++loaded/names.length);
    }));
  }
  model(name,x=0,z=0,rotation=0,scale=1) {
    const m=this.assets[name].clone(true);m.position.set(x,0,z);m.rotation.y=rotation;m.scale.setScalar(scale);this.active.add(m);return m;
  }
  box(x,y,z,w,h,d,color,material={}) {
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.94,...material}));
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;this.active.add(mesh);return mesh;
  }
  obstacle(x,z,w,d) { this.obstacles.push({x,z,w:w/2+.28,d:d/2+.28}); }
  target(id,name,action,x,z,model,iconName,height=2) {
    const t={id,name,action,x,z,model,height};if(model)model.userData.targetId=id;
    const el=document.createElement('button');el.className='world-pin';el.dataset.target=id;el.setAttribute('aria-label',`${action}: ${name}`);
    el.innerHTML=`${icon(iconName)}<span>${name}</span>`;el.onclick=e=>{e.stopPropagation();this.onSelect(id);};
    this.labelsElement.appendChild(el);this.labels.push({el,pos:new V(x,height,z),target:t});this.targets.push(t);return t;
  }
  floorText(text,x,z,size=2,color='#d0c9ab',angle=0) {
    const c=document.createElement('canvas');c.width=768;c.height=128;const ctx=c.getContext('2d');
    ctx.font='500 44px monospace';ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,64);
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(size*3.4,size*.56),new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:.55,depthWrite:false}));
    mesh.rotation.x=-Math.PI/2;mesh.rotation.z=angle;mesh.position.set(x,.043,z);this.active.add(mesh);
  }
  setZone(s) {
    this.active.traverse(o=>{if(o.geometry&&!this.assetGeometries.has(o.geometry))o.geometry.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])if(!this.assetMaterials.has(m)){m.map?.dispose();m.dispose();}});
    this.state=s;this.zone=s.zone;this.active.clear();this.labelsElement.replaceChildren();this.labels=[];this.targets=[];this.obstacles=[];this.npcs=[];this.monster=null;this.dust=null;this.flareLight=null;this.zoom=1;
    this.marker.visible=false; this.walkPath=[]; this.pendingTarget=null;
    if(s.zone==='shelter')this.buildShelter(s);else this.buildWasteland(s);
    if(!this.isWalkable(s.position.x,s.position.z))s.position=s.zone==='shelter'?{x:1.4,z:3.4}:{x:0,z:15};
    this.player=this.model('survivor',s.position.x,s.position.z,Math.PI*.12,.83);
    this.playerLegs=['leg_L','leg_R'].map(n=>this.player.getObjectByName(n));
    this.playerArms=['arm_L','arm_R'].map(n=>this.player.getObjectByName(n));
    this.playerRing=new THREE.Mesh(new THREE.RingGeometry(.40,.47,40),new THREE.MeshBasicMaterial({color:0xebcd85,transparent:true,opacity:.75,side:THREE.DoubleSide}));
    this.playerRing.rotation.x=-Math.PI/2;this.playerRing.position.y=.065;this.active.add(this.playerRing);
    this.cameraFocus.copy(s.zone==='shelter'?new V(0,0,0):new V(s.position.x,0,s.position.z));
    this.resize();this.sync(s);
  }
  buildShelter(s) {
    this.scene.background.set(0x333d35);this.scene.fog=new THREE.FogExp2(0x333d35,.006);
    this.ambient.intensity=1.8;this.sun.intensity=2.5;this.sun.color.set(0xffd99a);this.renderer.toneMappingExposure=1.25;
    this.model('shelter');
    this.box(0,-.86,0,200,.16,200,0x333d35);
    // Furnish the open-front concrete diorama with actual Blender exports.
    const b1=this.model('bunk',-7.1,-4.3);this.obstacle(-7.1,-4.3,1.45,2.3);
    const b2=this.model('bunk',-4.6,-4.3);this.obstacle(-4.6,-4.3,1.45,2.3);
    this.target('bed','Bunks','Rest until morning',-5.9,-3.0,b1,'bed',2.1);b2.userData.targetId='bed';
    const bench=this.model('workbench',-.35,-5.5);this.obstacle(-.35,-5.5,2.5,1.3);
    this.target('workbench','Workshop','Build & repair',-.35,-4.25,bench,'scrap',2.4);
    const gen=this.model('generator',4.65,-4.6);this.obstacle(4.65,-4.6,2.1,1.4);
    this.target('generator','Generator','Maintain shelter',4.65,-3.4,gen,'power',2.3);
    const water=this.model('water_tank',7.55,-1.1);this.obstacle(7.55,-1.1,1.55,1.55);
    this.target('water','Cistern','Check supplies',6.65,-1.1,water,'water',2.3);
    const radio=this.model('radio',-7.65,1.9,Math.PI/2);this.obstacle(-7.65,1.9,1.2,2.2);
    this.target('radio','Radio','Listen to the radio',-6.35,1.9,radio,'radio',2.3);
    this.target('airlock','Airlock','Venture outside',7.3,-5.1,null,'northeast',2.9);
    this.obstacle(-3.05,-2.9,.22,7.13);this.obstacle(3.05,-4.4,.22,4.2);
    const stores=this.model('crate',7.3,3.35);this.model('crate',7.4,4.45);this.model('crate',5.95,4.45);
    this.obstacle(6.7,4.0,2.8,2.2);this.target('stores','Stockpile','Manage supplies',5.4,3.5,stores,'pack',1.7);
    // Dining table, kettle, rug and warm practical lights.
    this.box(-1.0,.83,1.1,2.5,.14,1.35,0x927a55);
    for(const x of [-1.95,-.05])for(const z of [.65,1.55])this.box(x,.4,z,.11,.8,.11,0x394339);
    for(const z of [-.15,2.4]){this.box(-1,.39,z,2.4,.14,.43,0x697556);for(const x of [-1.9,-.1])this.box(x,.16,z,.13,.32,.32,0x3b483e);}
    this.obstacle(-1,1.1,2.5,1.35);this.obstacle(-1,2.4,2.4,.43);this.obstacle(-1,-.15,2.4,.43);
    this.box(-.6,.97,1.15,.46,.13,.35,0xe0c89d);this.box(-1.5,1.0,1.25,.19,.22,.19,0xbebfaa);
    this.box(-5.9,.036,-1.8,3.6,.02,1.5,0x7a7c59);
    for(const x of [-6,0,6]){const light=new THREE.PointLight(0xffbf64,15,9,2);light.position.set(x,2.3,-5.8);this.active.add(light);}
    const lantern=new THREE.PointLight(0xffbb55,9,7,2);lantern.position.set(-1,2,1.1);this.active.add(lantern);
    this.box(2.55,1.08,-5.95,.45,.55,.32,0x9a6150);this.box(2.55,1.08,-5.77,.28,.14,.015,0xe1d5b4);
    this.floorText('SLEEPING QUARTERS',-5.95,-.70,1.2);
    this.floorText('07 / AFTERLIGHT',1.8,4.8,1.55);
    this.floorText('UTILITY',5.7,1.65,1.1);
    // A simple rock bed surrounds the bunker like a miniature architectural model.
    for(let i=0;i<36;i++){
      const a=i/36*Math.PI*2;const x=Math.cos(a)*(11.3+(i%3)*.2),z=Math.sin(a)*(9.5+(i%4)*.3);
      const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.25+(i%5)*.11),new THREE.MeshStandardMaterial({color:i%2?0x4b5546:0x59604e,roughness:1}));
      rock.position.set(x,-.54,z);rock.rotation.set(i*.1,i*.6,0);rock.scale.y=.7;rock.castShadow=true;this.active.add(rock);
    }
    if(s.upgrades.garden){this.model('planter',2.65,4.35);this.obstacle(2.65,4.35,2.3,1.3);}
    if(s.upgrades.bunks){this.model('bunk',-7.2,4.75);this.obstacle(-7.2,4.75,1.4,2.3);}
    if(s.upgrades.filter){this.box(8.3,.77,-2.25,.50,1.4,.55,0x677e6b);this.box(8.3,1.3,-1.955,.27,.18,.02,0xbfe1b0,{emissive:0x55733f});}
    for(let i=1;i<s.residents.length;i++){
      const spots=[[-4.7,-1.6],[1.4,-2.7],[-4.8,3.9],[4.8,1],[1.8,4.4]];
      const [x,z]=spots[i-1];const npc=this.model('survivor',x,z,(i-.5)*1.7,.79);
      npc.traverse(o=>{if(o.isMesh&&o.name.includes('jacket')){o.material=o.material.clone();o.material.color.set([0x86a69d,0xb6a170,0x7a93a2,0x997d73,0x8c9b68][i-1]);}});
      this.npcs.push({model:npc,x,z,phase:i*2});
    }
  }
  buildWasteland(s) {
    this.scene.background.set(0x899487);this.scene.fog=new THREE.FogExp2(0x899487,.011);
    this.ambient.intensity=1.8;this.sun.intensity=3.0;this.sun.color.set(0xffd7a0);this.renderer.toneMappingExposure=1.2;
    this.box(0,-.25,0,180,.5,180,0x83856c);
    this.box(0,.014,-4,5.5,.025,68,0x585e53);
    for(let z=-34;z<=26;z+=4)this.box(0,.033,z,.15,.011,1.5,0xb1ac86);
    for(const x of [-3.0,3.0])this.box(x,.023,-4,.3,.05,68,0x8f9380);
    const hatch=this.box(0,.22,17.5,3,.45,3,0x4b5c50);this.box(0,.48,17.5,2.2,.10,2.4,0x77816a);
    this.box(0,.54,17.5,.18,.06,1.8,0xd1b16b);
    this.target('home','Shelter 07','Return & unload',0,15.8,hatch,'home',2.4);this.obstacle(0,17.5,3,3);
    this.floorText('SHELTER 07',0,20.4,1.7,'#dcd2a7');
    for(const site of SITES){
      const object=site.id==='wreck'?this.model('wreck',site.x,site.z):site.id==='cistern'?this.model('water_tank',site.x,site.z,0,1.35):this.model('ruin',site.x,site.z,site.id==='camp'?.24:0);
      const approach={x:site.x,z:site.z+2.7};
      this.obstacle(site.x,site.z,site.id==='cistern'?2:4.5,site.id==='cistern'?2:3.8);
      if(site.id!=='wreck'&&site.id!=='cistern')this.model('crate',site.x+.9,site.z+1.1);
      this.target(site.id,site.name,'Search for supplies',approach.x,approach.z,object,site.type,2.6);
      if(site.id==='clinic'){this.box(site.x,2.25,site.z-1.78,.7,.18,.025,0xe0d4b7);this.box(site.x,2.25,site.z-1.8,.18,.7,.025,0xe0d4b7);}
    }
    // Deterministic scenery stays stable after loading a save.
    let seed=9183;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<48;i++){
      const x=(rand()-.5)*75,z=(rand()-.5)*85;
      if(Math.abs(x)<4 || SITES.some(p=>Math.hypot(p.x-x,p.z-z)<4) || Math.hypot(x,z-16)<5)continue;
      if(i%3===0){this.model('dead_tree',x,z,rand()*6,.65+rand()*.65);this.obstacle(x,z,.6,.6);}
      else {const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.2+rand()*.6),new THREE.MeshStandardMaterial({color:0x6f7562,roughness:1}));rock.position.set(x,.1,z);rock.scale.y=.65;rock.rotation.y=rand()*6;rock.castShadow=true;this.active.add(rock);}
    }
    for(const [x,z,r] of [[-21,-17,.8],[23,8,1.5],[-19,17,.2],[19,-31,2.4],[-15,-32,0]]){this.model('ruin',x,z,r,1.4);this.obstacle(x,z,6,5);}
    this.model('wreck',-4.7,-16,.6,.8);this.obstacle(-4.7,-16,2.5,3.8);
    // A collapsed transmission mast, in silhouette beyond the relay.
    for(let i=0;i<5;i++){const b=this.box(1+i*.4,1.3+i*.9,-27-i*.22,.15,2,.15,0x474f45);b.rotation.z=-.3;}
    this.box(2.1,4.9,-27.7,3.4,.1,.1,0x485244);
    const dustCount=150;const positions=new Float32Array(dustCount*3);
    for(let i=0;i<dustCount;i++){positions[i*3]=(rand()-.5)*65;positions[i*3+1]=rand()*7+.3;positions[i*3+2]=(rand()-.5)*70;}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
    this.dust=new THREE.Points(geometry,new THREE.PointsMaterial({color:0xe3d4a0,size:.045,transparent:true,opacity:.36,depthWrite:false}));this.active.add(this.dust);
    if(s.encounter){this.monster=this.model('mutant',12,-13,0,.95);this.monster.userData={flee:0,attack:0};}
  }
  sync(s) {
    this.state=s;
    for(const label of this.labels){const available=!SITES.some(x=>x.id===label.target.id)||siteAvailable(s,label.target.id);label.el.classList.toggle('depleted',!available);}
  }
  resize() {
    const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;
    this.renderer.setSize(w,h,false);const aspect=w/h;
    let height=this.zone==='wasteland'?21.5:23;
    if(this.zone!=='wasteland')height=Math.max(height,30/aspect);
    height*=this.zoom||1;
    this.camera.left=-height*aspect/2;this.camera.right=height*aspect/2;this.camera.top=height/2;this.camera.bottom=-height/2;this.camera.updateProjectionMatrix();
  }
  isWalkable(x,z) {
    const b=this.zone==='shelter'?{x:8.55,minZ:-6.1,maxZ:6.5}:{x:25,minZ:-29,maxZ:24};
    if(Math.abs(x)>b.x||z<b.minZ||z>b.maxZ)return false;
    return !this.obstacles.some(o=>Math.abs(x-o.x)<o.w&&Math.abs(z-o.z)<o.d);
  }
  // Grid A* lets clicking a station walk around beds, partitions and rubble.
  findPath(to) {
    const step=.5, start={x:Math.round(this.player.position.x/step),z:Math.round(this.player.position.z/step)};
    let end={x:Math.round(to.x/step),z:Math.round(to.z/step)};
    if(!this.isWalkable(end.x*step,end.z*step)){
      let nearest=null;
      for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++)if(this.isWalkable((end.x+dx)*step,(end.z+dz)*step)){
        const dist=dx*dx+dz*dz;if(!nearest||dist<nearest.dist)nearest={x:end.x+dx,z:end.z+dz,dist};
      }
      if(!nearest)return [];end=nearest;
    }
    const key=p=>`${p.x},${p.z}`, h=p=>Math.hypot(p.x-end.x,p.z-end.z);
    const open=[{...start,g:0,f:h(start),prev:null}], visited=new Map([[key(start),0]]);let iterations=0;
    while(open.length&&iterations++<14000){
      let best=0;for(let i=1;i<open.length;i++)if(open[i].f<open[best].f)best=i;
      const cur=open.splice(best,1)[0];
      if(cur.x===end.x&&cur.z===end.z){const path=[];for(let n=cur;n.prev;n=n.prev)path.unshift(new V(n.x*step,0,n.z*step));return path;}
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
        const n={x:cur.x+dx,z:cur.z+dz};if(!this.isWalkable(n.x*step,n.z*step))continue;
        if(dx&&dz&&(!this.isWalkable(cur.x*step,n.z*step)||!this.isWalkable(n.x*step,cur.z*step)))continue;
        const g=cur.g+Math.hypot(dx,dz),k=key(n);if(visited.has(k)&&visited.get(k)<=g)continue;
        visited.set(k,g);open.push({...n,g,f:g+h(n),prev:cur});
      }
    }
    return [];
  }
  goTo(point,target=null) {
    this.walkPath=this.findPath(point);this.pendingTarget=target;
    if(this.walkPath.length){this.marker.position.copy(this.walkPath.at(-1));this.marker.position.y=.06;this.marker.visible=true;return true;}
    return false;
  }
  nearest() {
    if(!this.player)return null;
    return this.targets.map(t=>({...t,dist:Math.hypot(t.x-this.player.position.x,t.z-this.player.position.z)})).filter(t=>t.dist<1.7).sort((a,b)=>a.dist-b.dist)[0]||null;
  }
  flare() { if(this.monster){this.monster.userData.flee=14;}this.flareLight=new THREE.PointLight(0xff754b,50,12,2);this.flareLight.position.copy(this.player.position).add(new V(0,1.2,0));this.active.add(this.flareLight);this.flareTime=3; }
  update(dt,time,input,paused,onArrive,onDamage) {
    if(!this.player)return;
    let moving=false;
    if(!paused){
      let dx=0,dz=0;
      const ix=(input.has('KeyD')||input.has('ArrowRight')?1:0)-(input.has('KeyA')||input.has('ArrowLeft')?1:0);
      const iz=(input.has('KeyS')||input.has('ArrowDown')?1:0)-(input.has('KeyW')||input.has('ArrowUp')?1:0);
      if(ix||iz){this.walkPath=[];this.pendingTarget=null;this.marker.visible=false;dx=ix*.8+iz*.6;dz=-ix*.6+iz*.8;}
      else if(this.walkPath?.length){const dest=this.walkPath[0];dx=dest.x-this.player.position.x;dz=dest.z-this.player.position.z;if(Math.hypot(dx,dz)<.13){this.walkPath.shift();dx=dz=0;}}
      const length=Math.hypot(dx,dz);if(length>.001){
        const sprint=input.has('ShiftLeft')||input.has('ShiftRight');const speed=(this.state.energy<10?1.65:sprint?4.5:3.1)*dt;
        dx=dx/length*Math.min(speed,length);dz=dz/length*Math.min(speed,length);
        const p=this.player.position;
        if(this.isWalkable(p.x+dx,p.z))p.x+=dx;
        if(this.isWalkable(p.x,p.z+dz))p.z+=dz;
        this.player.rotation.y=Math.atan2(dx,dz);moving=true;
        if(sprint&&this.zone==='wasteland')this.state.energy=Math.max(0,this.state.energy-dt*.18);
      }
      if(this.pendingTarget&&!this.walkPath.length){const t=this.pendingTarget;this.pendingTarget=null;this.marker.visible=false;if(Math.hypot(t.x-this.player.position.x,t.z-this.player.position.z)<1.85)onArrive(t.id);}
      this.state.position={x:this.player.position.x,z:this.player.position.z};
      for(let i=0;i<2;i++){
        if(this.playerLegs[i])this.playerLegs[i].rotation.x=moving?Math.sin(time*11+i*Math.PI)*.45:0;
        if(this.playerArms[i])this.playerArms[i].rotation.x=moving?Math.sin(time*11+i*Math.PI+Math.PI)*.3:0;
      }
      this.player.position.y=moving?Math.abs(Math.sin(time*11))*.035:Math.sin(time*2)*.012;
      if(this.monster){
        const m=this.monster,p=this.player.position,dist=Math.hypot(m.position.x-p.x,m.position.z-p.z);const flee=m.userData.flee>0;
        m.userData.flee=Math.max(0,m.userData.flee-dt);m.userData.attack=Math.max(0,m.userData.attack-dt);
        if(dist<15||flee){let vx=(p.x-m.position.x)/(dist||1),vz=(p.z-m.position.z)/(dist||1);if(flee){vx=-vx;vz=-vz;}
          const spd=(flee?4:2.25)*dt;const nx=m.position.x+vx*spd,nz=m.position.z+vz*spd;
          if(this.isWalkable(nx,m.position.z))m.position.x=nx;if(this.isWalkable(m.position.x,nz))m.position.z=nz;
          m.rotation.y=Math.atan2(vx,vz);m.position.y=Math.abs(Math.sin(time*13))*.08;
          if(dist<1.6&&!flee&&m.userData.attack===0){m.userData.attack=1.5;onDamage(12);}
        }
      }
      for(const npc of this.npcs){npc.model.position.y=Math.sin(time*1.8+npc.phase)*.018;npc.model.rotation.y+=Math.sin(time*.5+npc.phase)*dt*.15;}
      if(this.flareLight){this.flareTime-=dt;this.flareLight.intensity=Math.max(0,this.flareTime)*15;if(this.flareTime<=0){this.active.remove(this.flareLight);this.flareLight=null;}}
    }
    this.playerRing.position.x=this.player.position.x;this.playerRing.position.z=this.player.position.z;
    if(this.zone==='wasteland'){this.cameraDesired.set(this.player.position.x,0,this.player.position.z-2);this.cameraFocus.lerp(this.cameraDesired,1-Math.exp(-dt*4));}
    this.camera.position.copy(this.cameraFocus).add(this.cameraOffset);this.camera.lookAt(this.cameraFocus);
    this.sun.position.copy(this.cameraFocus).add(new V(-10,25,12));this.sun.target.position.copy(this.cameraFocus);
    if(this.dust&&this.zone==='wasteland')this.dust.position.x=Math.sin(time*.08)*2;
    this.camera.updateMatrixWorld();
    const w=this.container.clientWidth,h=this.container.clientHeight;
    for(const l of this.labels){const p=l.pos.clone().project(this.camera);const x=(p.x*.5+.5)*w,y=(-p.y*.5+.5)*h;
      const inView=x>45&&x<w-45&&y>52&&y<h-65&&p.z<1;
      const tooFar=this.zone==='wasteland'&&Math.hypot(l.target.x-this.player.position.x,l.target.z-this.player.position.z)>20;
      l.el.style.display=inView&&!tooFar?'':'none';l.el.style.transform=`translate(${x}px,${y}px) translate(-50%, -100%)`;
      l.el.classList.toggle('nearby',Math.hypot(l.target.x-this.player.position.x,l.target.z-this.player.position.z)<1.7);
    }
    this.renderer.render(this.scene,this.camera);
  }
}
