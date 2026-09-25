const {chromium}=require('playwright');
const assert=require('node:assert/strict');

(async()=>{
  const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
  try{
    const host=await browser.newPage({viewport:{width:1280,height:800}}),guest=await browser.newPage({viewport:{width:1280,height:800}});
    const errors=[];for(const page of [host,guest])page.on('pageerror',error=>errors.push(error.message));
    for(const page of [host,guest]){await page.goto('http://127.0.0.1:5174/');await page.waitForFunction(()=>window.__afterlight?.world?.state,null,{timeout:120000});}
    const before=await host.evaluate(()=>localStorage.getItem('afterlight.slots.v1'));
    await host.getByRole('button',{name:'Play online'}).click();
    await host.locator('#online-name').fill('Host');
    await host.getByRole('button',{name:'Create room'}).click();
    await host.locator('.online-code').waitFor({timeout:30000});
    const code=(await host.locator('.online-code').innerText()).trim();assert.match(code,/^[A-Z2-9]{20}$/);
    console.log('PASS room created');
    await guest.getByRole('button',{name:'Play online'}).click();
    await guest.locator('#online-name').fill('Guest');await guest.locator('#online-code').fill(code);
    await guest.getByRole('button',{name:'Join room'}).click();
    try{await guest.locator('.online-code').waitFor({timeout:30000});}catch(error){console.log('GUEST MODAL',await guest.locator('#modal-root').innerText());throw error;}
    assert.equal((await guest.locator('.online-code').innerText()).trim(),code);
    console.log('PASS second browser joined');
    await host.evaluate(()=>{__afterlight.state.resources.scrap+=7;});
    await guest.waitForFunction(()=>__afterlight.state.resources.scrap===19,null,{timeout:20000});
    console.log('PASS supplies synced');
    await host.getByRole('button',{name:'Leave room and return to offline journey'}).click();
    assert.equal(await host.evaluate(()=>__afterlight.state.resources.scrap),12);
    assert.equal(await host.evaluate(()=>localStorage.getItem('afterlight.slots.v1')),before);
    console.log('PASS offline progress preserved');
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
