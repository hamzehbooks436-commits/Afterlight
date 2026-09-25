const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const check=(name,value)=>{assert.ok(value,name);checks.push(name);console.log('PASS',name);};
 try{
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__afterlight?.world?.state);
  await page.evaluate(()=>{const a=__afterlight;a.state.field.settings.sound=false;a.actions.depart(a.state);a.refresh();a.state.minute=12*60;a.state.weather='Clear skies';a.world.updateAtmosphere(100,0);document.getElementById('menu').classList.add('hidden');});
  const stats=await page.evaluate(async()=>{const A=await import('/src/archipelago.js'),P=await import('/src/physics.js'),w=__afterlight.world;
   const blocked=[];for(let j=0;j<A.ROADS.length;j++){const road=A.ROADS[j];for(let i=1;i<road.length;i++){const a=road[i-1],b=road[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/2);for(let k=0;k<=n;k++){const x=a.x+(b.x-a.x)*k/n,z=a.z+(b.z-a.z)*k/n;if(!P.canOccupy(w.boxes,x,0,z,1.72,.28,2000)||!A.isWalkable(x,z))blocked.push({route:j,segment:i,x,z});}}}
   return {area:A.MAP_WIDTH*A.MAP_HEIGHT,towns:A.TOWNS.map(t=>({name:t.name,buildings:w.settlementBuildings.filter(b=>b.town===t.id).length,land:A.isLand(t.x,t.z)})),blocked:blocked.slice(0,20),blockedTotal:blocked.length,targets:w.targets.length,spawn:__afterlight.state.position,canSpawn:P.canOccupy(w.boxes,A.SPAWN.x,0,A.SPAWN.z,1.72,.28,2000),assets:['coastal_house','coastal_tower','coastal_bridge','coastal_boat'].every(k=>w.assets[k])};});
  console.log(JSON.stringify(stats));
  check('world area is 6.5 square kilometres',Math.abs(stats.area-6500000)<1);
  check('six abandoned settlements have explorable building groups',stats.towns.length===6&&stats.towns.every(t=>t.land&&t.buildings>=10));
  check('custom Blender assets load in the playable world',stats.assets);
  check('shelter departure spawns safely on the island',stats.canSpawn);
  check('all coast road centre lines are unobstructed',stats.blockedTotal===0);
  check('twelve supply caches and shelter return are present',stats.targets===13);
  const bridges=await page.evaluate(async()=>{const A=await import('/src/archipelago.js'),P=await import('/src/physics.js'),w=__afterlight.world;return A.BRIDGES.map(([a,b])=>{const p={...a,y:0};P.moveCapsule(w.boxes,w.floors,p,b.x-a.x,b.z-a.z,1.72,2000,A.isWalkable);return Math.hypot(p.x-b.x,p.z-b.z)<.5;});});
  check('player collision can traverse all eight bridges',bridges.every(Boolean));
  const shores=await page.evaluate(async()=>{const A=await import('/src/archipelago.js'),P=await import('/src/physics.js');const p=A.mapPoint([310,160]);p.y=0;P.moveCapsule([],[],p,0,-500,1.72,2000,A.isWalkable);return A.isWalkable(p.x,p.z)&&p.z>A.mapPoint([310,-60]).z;});
  check('shoreline prevents walking across open water',shores);
  fs.mkdirSync('art/qa',{recursive:true});
  for(const id of ['hollaway','starfield','jaffa','riccota','azure','menton']){
   const reachable=await page.evaluate(async id=>{const A=await import('/src/archipelago.js'),w=__afterlight.world,t=A.TOWNS.find(t=>t.id===id);w.player.position.set(t.x,0,t.z+9);__afterlight.state.position={x:t.x,y:0,z:t.z+9};__afterlight.state.field.yaw=0;__afterlight.state.field.pitch=.08;w.syncCamera(0);return w.location().includes(t.name.toUpperCase());},id);
   check(`${id} has the correct in-world location`,reachable);await page.waitForTimeout(100);await page.screenshot({path:`art/qa/coast-${id}.png`});
  }
  await page.evaluate(()=>__afterlight.showJournal());await page.screenshot({path:'art/qa/coast-map.png'});
  check('journal displays new geography and all six place names',await page.locator('.journal .field-map').textContent().then(t=>['Stary Sands','Starfield','Little Jaffa','Riccota','Azure Port','Menton Coast'].every(n=>t.includes(n))));
  const cacheAccess=await page.evaluate(async()=>{const w=__afterlight.world;return w.targets.filter(t=>t.site).map(t=>{w.player.position.set(t.x,t.level,t.z+2);__afterlight.state.field.yaw=0;__afterlight.state.field.pitch=-.45;w.syncCamera(0);return {id:t.id,reachable:w.nearest()?.id===t.id};});});
  console.log('CACHE',JSON.stringify(cacheAccess));check('all relocated supply caches can be interacted with',cacheAccess.every(t=>t.reachable));
  const save=await page.evaluate(async()=>{const A=await import('/src/archipelago.js'),a=__afterlight,s=a.actions.newCampaign(55);a.actions.depart(s);s.position={x:A.TOWNS[1].x,y:0,z:A.TOWNS[1].z};s.resources.scrap=85;const q=a.actions.restoreCampaign(s);const old={...s,worldRevision:2};const m=a.actions.restoreCampaign(old);return q.position.x===s.position.x&&q.position.z===s.position.z&&m.resources.scrap===85&&m.position.x===A.SPAWN.x;});
  check('large coordinates survive saves and old saves migrate safely',save);
  check('no runtime or WebGL errors',errors.length===0);
  fs.writeFileSync('art/qa/coast-report.json',JSON.stringify({checks,errors,stats},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
