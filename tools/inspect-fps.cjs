const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs');
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__afterlight?.world?.state,{timeout:45000});
  fs.mkdirSync('art/qa',{recursive:true});
  await page.evaluate(()=>window.__afterlight.resumeForTest());await page.waitForTimeout(900);
  await page.screenshot({path:'art/qa/shelter.png'});
  console.log('SHELTER',await page.evaluate(()=>({camera:__afterlight.world.camera.type,npcs:__afterlight.world.npcs.length,boxes:__afterlight.world.boxes.length,state:__afterlight.state.position,canvas:document.querySelector('canvas').getBoundingClientRect().toJSON()})));
  await page.evaluate(()=>{const a=__afterlight;a.actions.depart(a.state);a.refresh();a.resumeForTest();});await page.waitForTimeout(1200);
  await page.screenshot({path:'art/qa/wasteland.png'});
  console.log('OUTSIDE',await page.evaluate(()=>({buildings:__afterlight.world.volumes.length,enemies:__afterlight.world.enemies.length,boxes:__afterlight.world.boxes.length,draws:__afterlight.world.renderer.info.render.calls,triangles:__afterlight.world.renderer.info.render.triangles,position:__afterlight.state.position})));
  await page.keyboard.press('KeyI');await page.screenshot({path:'art/qa/inventory.png'});
  console.log('ERRORS',JSON.stringify(errors));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
