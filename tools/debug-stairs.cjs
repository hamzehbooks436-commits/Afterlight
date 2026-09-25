const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});const p=await b.newPage();await p.goto('http://127.0.0.1:5173/');await p.waitForFunction(()=>__afterlight.world?.state);
console.log(await p.evaluate(()=>{const a=__afterlight;a.actions.depart(a.state);a.refresh();a.resumeForTest();a.world.enemies.forEach(e=>e.dead=true);a.world.player.position.set(23,0,36.8);a.state.field.yaw=0;const checkpoints=[];
for(const [key,frames] of [['KeyW',24],['KeyD',28],['KeyW',49]]){for(let i=0;i<frames;i++)a.world.update(.05,i*.05,new Set([key]),false);checkpoints.push({...a.state.position});}
const q=a.world.player.position;const blockers=a.world.boxes.filter(v=>q.x+.3>v.minX&&q.x-.3<v.maxX&&q.z+.3>v.minZ&&q.z-.5<v.maxZ&&v.maxY>q.y+.26&&v.minY<q.y+1.72);return {checkpoints,blockers};}));await p.screenshot({path:'art/qa/stair-debug.png'});await b.close();})();
