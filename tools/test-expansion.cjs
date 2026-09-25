const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const report={checks:[],errors:[],screenshots:[]};
const check=(name,value)=>{assert.ok(value,name);report.checks.push(name);console.log('PASS',name);};
(async()=>{
  const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
    await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__afterlight?.world?.state);
    await page.evaluate(()=>{__afterlight.resumeForTest();__afterlight.state.field.settings.sound=false;});
    const place=async(x,z,yaw=0)=>page.evaluate(({x,z,yaw})=>{const a=__afterlight;a.world.player.position.set(x,0,z);a.state.position={x,y:0,z};a.state.field.yaw=yaw;a.state.field.pitch=0;a.world.syncCamera(0);},{x,z,yaw});
    const walk=async(dx,dz)=>page.evaluate(async({dx,dz})=>{const {moveCapsule}=await import('/src/physics.js');const a=__afterlight,w=a.world;moveCapsule(w.boxes,w.floors,w.player.position,dx,dz,1.72,48);a.state.position={x:w.player.position.x,y:w.player.position.y,z:w.player.position.z};w.syncCamera(0);return a.state.position;},{dx,dz});
    const shot=async(name)=>{await page.waitForTimeout(200);await page.screenshot({path:`art/qa/${name}.png`});report.screenshots.push(name);};
    const aimAt=async(id)=>page.evaluate(id=>{const a=__afterlight,w=a.world,t=w.targets.find(t=>t.id===id),p=w.player.position,dx=t.x-p.x,dz=t.z-p.z;a.state.field.yaw=Math.atan2(-dx,-dz);a.state.field.pitch=Math.atan2(t.y-1.62,Math.hypot(dx,dz));w.syncCamera(0);return w.nearest()?.id;},id);
    await place(-7,-3);let p=await walk(-10,0);check('walk through western doorway from original shelter into new corridor',p.x<-16.9);
    p=await walk(0,-5);check('walk through Blender hospital door into recovery ward',p.z<-7.9);
    check('hospital location and imported furniture are present',await page.evaluate(()=>__afterlight.world.location().includes('HOSPITAL')&&!!__afterlight.world.assets.hospital_bed));
    await shot('expansion-hospital');
    await place(-15,-5.8);check('hospital control is reachable',await aimAt('room_hospital')==='room_hospital');
    await page.evaluate(()=>{__afterlight.state.health=24;__afterlight.state.radiation=45;});await page.keyboard.press('KeyE');
    await page.getByRole('button',{name:'Receive treatment',exact:true}).click();check('hospital treatment consumes medicine and heals',await page.evaluate(()=>__afterlight.state.health===100&&__afterlight.state.radiation===0&&__afterlight.state.resources.meds===2));
    await page.keyboard.press('Escape');await page.evaluate(()=>__afterlight.resumeForTest());
    await place(-27,-3);p=await walk(0,-6);check('sealed farm physically blocks entry before construction',p.z>-4.8);
    await place(-5,3.8);check('expansion plans are physically reachable',await aimAt('expansion')==='expansion');
    await page.keyboard.press('KeyE');check('construction shows six distinct room choices',await page.locator('.expansion article').count()===6);
    check('unaffordable farm cannot be purchased',await page.locator('[data-action="build-room"][data-id="farm"]').isDisabled());
    await page.evaluate(()=>{Object.assign(__afterlight.state.resources,{scrap:500,water:100,fuel:40,meds:20});__afterlight.showExpansion();});
    for(const id of ['farm','bedrooms','workshop','waterworks'])await page.locator(`[data-action="build-room"][data-id="${id}"]`).click();
    check('building consumes scrap and unlocks all four rooms',await page.evaluate(()=>Object.values(__afterlight.state.shelter.rooms).every(v=>v===1)&&__afterlight.state.resources.scrap===434));
    await shot('expansion-plans');await page.keyboard.press('Escape');await page.evaluate(()=>__afterlight.resumeForTest());
    for(const [id,x,z] of [['farm',-27,-11],['bedrooms',-27,5],['workshop',-37,-11],['waterworks',-37,5],['kitchen',-17,5]]){
      await place(x,-3);p=await walk(0,z<0?-5:5);check(`walk into built ${id} through its doorway`,z<0?p.z<-7.9:p.z>1.9);
      await place(x+2,z<0?-5.8:-.2);check(`${id} service control is reachable`,await aimAt(`room_${id}`)===`room_${id}`);
      await page.keyboard.press('KeyE');await page.locator(`[data-action="room-service"][data-id="${id}"]`).click();
      check(`${id} daily activity is recorded and cannot repeat`,await page.locator(`[data-action="room-service"][data-id="${id}"]`).isDisabled());
      await page.keyboard.press('Escape');await page.evaluate(()=>__afterlight.resumeForTest());
      await place(x,z<0?-6.8:.8,z<0?0:Math.PI);await shot(`expansion-${id}`);
    }
    await place(-12,-3,Math.PI/2);await shot('expansion-corridor');
    // Actual UI save-copy, new-journey, load and overwrite cancellation paths.
    await page.keyboard.press('Escape');await page.getByRole('button',{name:'Save slots',exact:true}).click();
    await page.locator('[data-action="save-slot"][data-id="1"]').click();
    check('save copy creates a separate slot and makes it active',await page.evaluate(()=>{const b=JSON.parse(localStorage.getItem('afterlight.slots.v1'));return b.active===1&&b.slots[0]&&b.slots[1].state.shelter.rooms.farm===1;}));
    await shot('save-slots');await page.locator('[data-action="new-slot"][data-id="2"]').click();
    check('new journey starts independently in chosen slot',await page.evaluate(()=>__afterlight.state.shelter.rooms.farm===0&&__afterlight.state.day===1));
    await page.evaluate(()=>__afterlight.showSaves());await page.locator('[data-action="load-slot"][data-id="1"]').click();
    check('loading restores constructed rooms and daily services',await page.evaluate(()=>__afterlight.state.shelter.rooms.farm===1&&__afterlight.state.shelter.duties.farm===1));
    await page.evaluate(()=>__afterlight.showSaves());await page.locator('[data-action="save-slot"][data-id="2"]').click();await page.getByRole('button',{name:'Cancel',exact:true}).click();
    check('cancel overwrite preserves the other journey',await page.evaluate(()=>JSON.parse(localStorage.getItem('afterlight.slots.v1')).slots[2].state.shelter.rooms.farm===0));
    await page.keyboard.press('Escape');await page.evaluate(()=>__afterlight.resumeForTest());
    await place(-37,-8);await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>__afterlight.world?.state);
    check('reload retains active slot and position in expanded wing',await page.evaluate(()=>__afterlight.state.position.x===-37&&__afterlight.state.shelter.rooms.farm===1));
    await page.evaluate(()=>{__afterlight.resumeForTest();__afterlight.state.bag.scrap=4;__afterlight.damage(200);});
    await page.getByRole('heading',{name:'A second chance.'}).waitFor();await shot('respawn-screen');
    // The dead save must remain recoverable even after closing/reopening the game.
    await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:'Respawn at Shelter 07',exact:false}).waitFor();
    await page.getByRole('button',{name:'Respawn at Shelter 07',exact:false}).click();
    check('death and reload allow rescue with progress intact',await page.evaluate(()=>!__afterlight.state.gameOver&&__afterlight.state.shelter.deaths===1&&__afterlight.state.health===100&&__afterlight.state.position.x===-17&&__afterlight.state.shelter.rooms.farm===1&&__afterlight.state.bag.scrap===0));
    await page.evaluate(()=>{__afterlight.resumeForTest();__afterlight.damage(200);});await page.getByRole('button',{name:'Respawn at Shelter 07',exact:false}).click();
    check('second death is also respawnable',await page.evaluate(()=>__afterlight.state.shelter.deaths===2&&!__afterlight.state.gameOver));
    await page.evaluate(()=>__afterlight.showExpansion());await page.locator('[data-action="build-room"][data-id="farm"]').click();
    check('level two room upgrade persists and stops further purchasing',await page.locator('[data-action="build-room"][data-id="farm"]').isDisabled());
    await page.keyboard.press('Escape');await page.evaluate(()=>__afterlight.resumeForTest());await place(-27,-6.8);await shot('expansion-farm-upgraded');
    report.render=await page.evaluate(()=>({calls:__afterlight.world.renderer.info.render.calls,triangles:__afterlight.world.renderer.info.render.triangles}));
    await page.setViewportSize({width:844,height:390});await page.evaluate(()=>__afterlight.showSaves());
    check('save-slot dialog fits a small landscape screen',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.panel').getBoundingClientRect().height<=innerHeight));
    check('no runtime or WebGL errors',report.errors.length===0);
    fs.writeFileSync('art/qa/expansion-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.checks.length,render:report.render,errors:report.errors}));
  }finally{await browser.close();}
})().catch(e=>{fs.writeFileSync('art/qa/expansion-report.json',JSON.stringify({...report,failure:String(e)},null,2));console.error(e);process.exit(1);});
