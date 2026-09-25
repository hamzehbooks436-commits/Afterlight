const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');

(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  try{
    await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.__afterlight?.world?.state);
    const result=await page.evaluate(async()=>{
      const game=window.__afterlight;
      game.actions.depart(game.state);game.refresh();
      const world=game.world;
      const physics=await import('/src/physics.js');
      const state=await import('/src/state.js');
      const names=['ruin_rowhouse','ruin_warehouse','ruin_clinic','ruin_fuel_station'];
      const models=Object.fromEntries(names.map(name=>[name,!!world.assets[name]]));
      const sites=state.SITES.filter(site=>['clinic','depot','camp','checkpoint','station','cistern'].includes(site.id)).map(site=>({
        id:site.id,inside:physics.canOccupy(world.boxes,site.x-1,0,site.z-2.8,1.72,.28,2000),
        doorway:physics.canOccupy(world.boxes,site.x,0,site.z+5,1.72,.28,2000),
      }));
      return {models,sites};
    });
    assert.ok(Object.values(result.models).every(Boolean),'all four Blender buildings loaded');
    assert.ok(result.sites.every(site=>site.inside&&site.doorway),'new supply buildings have walkable interiors and entrances');
    const station=await page.evaluate(async()=>{const state=await import('/src/state.js');const site=state.SITES.find(site=>site.id==='station');const world=window.__afterlight.world;world.player.position.set(site.x,0,site.z+17);world.state.position={x:site.x,y:0,z:site.z+17};world.state.field.yaw=0;world.state.field.pitch=.04;world.state.minute=12*60;world.state.weather='Clear skies';world.updateAtmosphere(100,0);world.syncCamera(0);document.getElementById('menu').classList.add('hidden');return site.name;});
    fs.mkdirSync('art/qa',{recursive:true});
    await page.screenshot({path:'art/qa/abandoned-fuel-station.png'});
    assert.equal(errors.length,0,`browser errors: ${errors.join('; ')}`);
    console.log(JSON.stringify({station,...result,errors},null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
