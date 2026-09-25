import './style.css';
import { World } from './world.js';
import { icon } from './icons.js';
import * as G from './state.js';

const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state;try{state=G.restoreSave(localStorage.getItem(G.SAVE_KEY));}catch{}
state ||= G.newGame();
if(!state.log.length)G.log(state,'The generator is humming. For now, this is home.');
let world, loading=true, modal=null, manuallyPaused=false, sidebarKey='', task=null, lastTime=0, frameTime=0, saveTimer=0, uiTimer=0, hiddenPause=false;
let sound=false,audioContext=null,ambientSound=null;
const keys=new Set();

$('app').innerHTML=`
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-wrap"><div class="brand"><div class="brand-symbol"><span>A</span></div><div><div class="brand-name">AFTERLIGHT</div><div class="brand-subtitle">A SHELTER AT THE END OF THE WORLD</div></div></div><div class="header-context">SURVIVE. BUILD. BELONG.</div></div>
      <div class="day-header"><span id="time-icon">${icon('sun')}</span><div><div class="day-title" id="day-title">DAY 01</div><div class="day-time" id="day-time">08:10 · Clear skies</div></div></div>
      <div class="top-actions"><span class="saved" id="saved-label">Saved locally</span><button class="icon-button" data-action="sound" id="sound-button" title="Enable ambient sound" aria-label="Enable ambient sound">${icon('mute')}</button><button class="icon-button" data-action="pause" id="pause-button" title="Pause (Esc)" aria-label="Pause game">${icon('pause')}</button><button class="icon-button" data-action="help" title="How to play" aria-label="How to play">${icon('help')}</button></div>
    </header>
    <section class="resource-bar" aria-label="Shelter stockpile"><div class="stock-label">SHELTER<br>STOCKPILE</div>${G.RESOURCE_KEYS.map(k=>`<div class="resource" id="resource-${k}">${icon(k)}<div><div class="resource-label">${k==='meds'?'Medicine':k}</div><div class="resource-value"><span id="count-${k}">${state.resources[k]}</span><span class="resource-unit">${k==='water'?'L':k==='fuel'?'cans':k==='meds'?'kits':k==='scrap'?'parts':'rations'}</span></div></div></div>`).join('')}</section>
    <div class="body-grid">
      <main class="play-area" id="play-area" aria-label="Afterlight game">
        <div class="scene-vignette"></div>
        <div class="scene-top"><div><div class="scene-eyebrow" id="scene-eyebrow">24 METERS BELOW THE SURFACE</div><h1 id="scene-title">Shelter 07</h1><p id="scene-caption">A little light remains.</p></div><div class="zone-tag" id="zone-tag">${icon('shield')} SAFE ZONE</div></div>
        <div class="world-labels" id="world-labels"></div>
        <div class="danger-banner hidden" id="danger-banner">${icon('radiation')} Movement in the ruins. Keep a flare ready.</div>
        <div class="toast-area" id="toast-area" aria-live="polite"></div>
        <div class="action-progress" id="action-progress"></div>
        <div class="interaction" id="interaction"></div>
        <div class="scene-bottom"><div class="vitals-panel"><div class="player-title">${icon('people')} THE CARETAKER</div>${[['health','heart','Health'],['energy','power','Energy'],['radiation','radiation','Radiation']].map(([key,ic,label])=>`<div class="vital ${key}" title="${label}">${icon(ic)}<div><div class="track"><i id="vital-${key}" style="width:${state[key]}%"></i></div></div><span class="vital-value" id="value-${key}" aria-label="${label}">${Math.round(state[key])}</span></div>`).join('')}</div><div class="scene-bottom-right"><div class="key-hints"><span><kbd>W A S D</kbd> Move</span><span><kbd>↗</kbd> Click to walk</span><span><kbd>E</kbd> Interact</span></div><button class="primary orange" id="expedition-button" data-action="expedition">Explore wasteland ${icon('northeast')}</button></div></div>
        <div class="touch-controls" aria-label="Touch controls"><div class="touch-dpad"><button data-key="KeyW" aria-label="Move up">↑</button><button data-key="KeyA" aria-label="Move left">←</button><button data-key="KeyS" aria-label="Move down">↓</button><button data-key="KeyD" aria-label="Move right">→</button></div><div class="touch-tools"><button data-action="interact" aria-label="Interact">E</button><button data-action="flare" aria-label="Use flare">${icon('flare')}</button></div></div>
        <div class="pause-screen hidden" id="pause-screen"><div><div class="eyebrow">TAKE A BREATH</div><h2>WORLD PAUSED</h2><p>Your shelter will be here.</p><button data-action="pause" class="primary">Continue ${icon('play')}</button></div></div>
        <div class="loading" id="loading"><div class="loading-logo">AFTERLIGHT</div><p id="loading-text">OPENING THE BLAST DOOR</p><div class="loading-track"><i id="loading-fill"></i></div></div>
      </main>
      <button class="mobile-toggle" data-action="sidebar" aria-label="Toggle shelter panel">${icon('map')} <span id="mobile-toggle-label">Shelter</span></button>
      <aside class="sidebar" id="sidebar" aria-label="Shelter management"></aside>
    </div>
    <footer class="footer"><span class="footer-left"><i></i><span id="footer-status">ALL SYSTEMS NOMINAL</span></span><span>KEEP THE LIGHT ON.</span><span>SECTOR 07 / ${new Date().getFullYear()} · SINGLE PLAYER</span></footer>
  </div><div id="modal-root"></div>`;

function costText(cost){return Object.entries(cost).map(([k,n])=>`${n} ${G.RESOURCE_NAMES[k]}`).join(' · ');}
function toast(text,kind='good'){
  const t=document.createElement('div');t.className=`toast ${kind}`;t.innerHTML=`${icon(kind==='warn'?'radiation':'check')}<span>${esc(text)}</span>`;
  $('toast-area').appendChild(t);setTimeout(()=>t.remove(),4600);
}
function save(){
  try{localStorage.setItem(G.SAVE_KEY,JSON.stringify(state));$('saved-label').textContent='Saved locally';}
  catch{$('saved-label').textContent='Save unavailable';}
}
function paused(){return loading||manuallyPaused||!!modal||hiddenPause||state.gameOver;}
function showModal(type,html,wide=false,closable=true){
  task=null;$('action-progress').replaceChildren();keys.clear();world.walkPath=[];world.pendingTarget=null;world.marker.visible=false;
  modal={type,closable};$('modal-root').innerHTML=`<div class="modal-backdrop"><section class="modal ${wide?'wide':''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">${closable?`<button class="icon-button modal-close" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button>`:''}${html}</section></div>`;
  requestAnimationFrame(()=>{const el=$('modal-root').querySelector('.choices button:not(:disabled),.modal-actions button:not(:disabled),button:not(:disabled)');el?.focus({preventScroll:true});});
}
function closeModal(){if(modal&&!modal.closable)return;modal=null;$('modal-root').replaceChildren();world.renderer.domElement.focus({preventScroll:true});}
function forceClose(){modal=null;$('modal-root').replaceChildren();}
function refreshWorld(){world.setZone(state);sidebarKey='';updateUI();save();}
function chooseTarget(id){
  if(paused()||task)return;
  const t=world.targets.find(t=>t.id===id);if(!t)return;
  if(Math.hypot(state.position.x-t.x,state.position.z-t.z)<1.7){interact(id);return;}
  if(!world.goTo(t,t))toast('There is no clear path to that spot. Try approaching from the aisle.','warn');
}
function interact(id){
  if(paused()||task)return;
  if(id==='airlock')showExpedition();
  else if(id==='home'){const count=G.returnHome(state);refreshWorld();beep(220,.13);toast(`Back home. ${count} supplies unloaded.`);}
  else if(id==='bed')showRest();
  else if(id==='workbench')showWorkshop();
  else if(id==='generator')showMaintenance();
  else if(id==='water'||id==='stores')showStockpile();
  else if(id==='radio')showRadio();
  else if(G.SITES.some(s=>s.id===id))startSearch(id);
}
function interactNearest(){const t=world?.nearest();if(t)interact(t.id);else if(!paused())toast('Walk closer to a marked station or supply location.','warn');}
function startSearch(id){
  if(!G.siteAvailable(state,id)){toast('This location has been searched. Supplies refresh after 3 days.','warn');return;}
  if(G.bagCount(state)>=G.bagCapacity(state)){toast('Your backpack is full. Return to the shelter to unload.','warn');return;}
  task={id,elapsed:0,duration:2.2};keys.clear();world.walkPath=[];world.pendingTarget=null;world.marker.visible=false;beep(370,.06);
}
function showExpedition(){
  if(state.zone==='wasteland'){chooseTarget('home');toast('Heading back to the shelter.');return;}
  showModal('expedition',`<div class="modal-symbol">${icon('northeast')}</div><div class="eyebrow">EXPEDITION ${String(state.expeditions+1).padStart(2,'0')}</div><h2 id="modal-title">Beyond the blast door.</h2><p class="modal-description">The old district still holds what we need. Search the marked locations, keep an eye on your radiation, and bring your supplies home.</p><div class="inventory-grid"><div class="inventory-item">${icon('pack')}<strong>${G.bagCapacity(state)}</strong><small>carry limit</small></div><div class="inventory-item">${icon('heart')}<strong>${Math.round(state.health)}</strong><small>health</small></div><div class="inventory-item">${icon('flare')}<strong>${state.flares}</strong><small>flares</small></div><div class="inventory-item">${icon('shield')}<strong>${state.upgrades.suit?'50':'0'}%</strong><small>protection</small></div><div class="inventory-item">${icon('clock')}<strong>${state.weather==='Ash storm'?'HIGH':'LOW'}</strong><small>fallout</small></div></div><p class="modal-description">${state.health<45?'Your health is low. A medical kit could make the difference.':state.weather==='Ash storm'?'An ash storm is passing. Radiation builds up much faster today.':'Most trips are quiet. Mutated wildlife is rare, but a flare can buy you time to escape.'}</p><div class="modal-actions"><button class="secondary" data-action="close-modal">Stay inside</button><button class="primary orange" data-action="depart">Step outside ${icon('arrow')}</button></div><p class="modal-footnote">WASD or click to walk · E to search · Shift to run · Space to use a flare<br>Time pauses while a dialog is open.</p>`);
}
function showRest(){
  const food=Math.max(1,state.residents.length-(state.residents.some(r=>r.role==='Cook')?1:0)),water=state.residents.length*2;
  showModal('rest',`<div class="modal-symbol">${icon('moon')}</div><div class="eyebrow">END OF DAY ${String(state.day).padStart(2,'0')}</div><h2 id="modal-title">Rest. Tomorrow needs you.</h2><p class="modal-description">Everyone shares their rations before the lights go down. Sleeping restores your energy, removes 25 radiation, and heals 12 health when everyone is fed.</p><div class="choices"><div class="choice"><span><span class="choice-title">Daily shelter needs</span><span class="choice-detail">${food} food · ${water} water · 1 generator fuel</span></span>${icon('food')}</div></div><p class="modal-footnote">${state.resources.food<food||state.resources.water<water?'Rations are running short. Each missing food or water costs 7 health. Consider a supply run first.':'Supplies are sufficient for tonight.'}${state.upgrades.filter?' Your purifier produces 4 water before breakfast if the generator has fuel.':''}${state.upgrades.garden?' Your grow beds produce food each morning.':''}</p><div class="modal-actions"><button class="secondary" data-action="close-modal">A little longer</button><button class="primary" data-action="sleep">Sleep until morning ${icon('moon')}</button></div>`);
}
function showEvent(){
  if(!state.pendingEvent||state.gameOver)return;
  const event=G.EVENTS[state.pendingEvent];
  showModal('event',`<div class="modal-symbol">${icon(event.icon)}</div><div class="eyebrow">${event.eyebrow}</div><h2 id="modal-title">${event.title}</h2><p class="modal-description">${event.text}</p>${state.pendingEvent==='visitor'?`<p class="modal-footnote">${state.residents.length} / ${G.capacity(state)} beds occupied. Each resident needs 1 food and 2 water a day, and brings a useful skill.</p>`:''}<div class="choices">${event.choices.map(c=>`<button class="choice" data-action="event-choice" data-choice="${c.id}" ${G.choiceAvailable(state,c)?'':'disabled'}><span><span class="choice-title">${c.label}</span><span class="choice-detail">${c.detail}${!G.choiceAvailable(state,c)?' · unavailable':''}</span></span>${icon('arrow')}</button>`).join('')}</div><p class="modal-footnote">Every choice leaves a mark. The world is paused while you decide.</p>`,false,false);
}
function showWorkshop(){
  showModal('workshop',`<div class="eyebrow">SHELTER WORKSHOP</div><h2 id="modal-title">Make this place a home.</h2><p class="modal-description">Salvage becomes something worth keeping. ${state.resources.scrap} scrap available.</p><div class="upgrade-grid">${Object.entries(G.UPGRADES).map(([id,u])=>{const complete=state.upgrades[id]>=u.max,cost=G.upgradeCost(state,id);return `<div class="upgrade-card">${icon(u.icon)}<h3>${u.name}</h3><div class="upgrade-level">${complete?'INSTALLED':id==='radio'?`${state.upgrades[id]} / 2 REPAIRS`:'NOT YET BUILT'}</div><p>${u.desc}</p><button data-action="build" data-id="${id}" ${complete||!G.canAfford(state,cost)?'disabled':''}>${complete?'✓ Operational':`Build · ${costText(cost)}`}</button></div>`;}).join('')}</div><div class="modal-actions"><button class="secondary" data-action="craft-flares" ${G.canAfford(state,{scrap:3})?'':'disabled'}>${icon('flare')} Craft 3 flares · 3 scrap</button><button class="secondary" data-action="close-modal">Back to shelter</button></div>`,true);
}
function showMaintenance(){
  showModal('maintenance',`<div class="modal-symbol">${icon('power')}</div><div class="eyebrow">SHELTER SYSTEMS</div><h2 id="modal-title">Keep the lights on.</h2><p class="modal-description">The generator uses one can of fuel each morning. It powers the water purifier. Your shelter seals lose condition over time; below 25%, exposure costs health each day.</p><div class="choices"><div class="choice"><span><span class="choice-title">Shelter condition: ${Math.round(state.integrity)}%</span><span class="choice-detail">${state.resources.fuel} cans of fuel · ${state.resources.fuel?'generator operational':'out of fuel'}</span></span>${icon('power')}</div><button class="choice" data-action="repair" ${state.integrity>=100||!G.canAfford(state,{scrap:4})?'disabled':''}><span><span class="choice-title">Repair seals & service generator</span><span class="choice-detail">4 scrap · restore 30 shelter condition</span></span>${icon('scrap')}</button></div><div class="modal-actions"><button class="secondary" data-action="workshop">Open workshop</button><button class="primary" data-action="close-modal">All right</button></div>`);
}
function showStockpile(){
  showModal('stockpile',`<div class="eyebrow">SUPPLIES & SELF CARE</div><h2 id="modal-title">Enough for another day.</h2><p class="modal-description">The stockpile feeds everyone each morning. Unload scavenged supplies by returning through the shelter hatch.</p><div class="inventory-grid">${G.RESOURCE_KEYS.map(k=>`<div class="inventory-item">${icon(k)}<strong>${state.resources[k]}</strong><small>${G.RESOURCE_NAMES[k]}</small></div>`).join('')}</div><div class="choices"><button class="choice" data-action="medicine" ${state.resources.meds<1||(state.health>=100&&state.radiation<=0)?'disabled':''}><span><span class="choice-title">Use a medical kit</span><span class="choice-detail">1 medicine · +35 health · −35 radiation</span></span>${icon('meds')}</button><button class="choice" data-action="eat" ${!G.canAfford(state,{food:1,water:1})||state.energy>=100?'disabled':''}><span><span class="choice-title">Eat & drink</span><span class="choice-detail">1 food + 1 water · +35 energy · +5 health</span></span>${icon('food')}</button></div><div class="modal-actions"><button class="primary" data-action="close-modal">Back to it ${icon('arrow')}</button></div>`);
}
function showRadio(){
  showModal('radio',`<div class="modal-symbol">${icon('radio')}</div><div class="eyebrow">EMERGENCY FREQUENCY / 107.7</div><h2 id="modal-title">${state.upgrades.radio===2?'A signal of hope.':'Only static. For now.'}</h2><p class="modal-description">A distant relief network is listening for emergency beacons. Keep your community alive until day 14 and finish both radio repairs to make contact.</p><div class="choices"><div class="choice"><span><span class="choice-title">${state.upgrades.radio}/2 radio repairs complete</span><span class="choice-detail">Day ${state.day} / 14 · ${state.residents.length} ${state.residents.length===1?'person':'people'} safe inside</span></span>${icon('radio')}</div></div><div class="modal-actions"><button class="secondary" data-action="workshop">Repair at workshop</button><button class="primary" data-action="broadcast" ${state.day<14||state.upgrades.radio<2||state.resources.fuel<1?'disabled':''}>Send the signal ${icon('northeast')}</button></div><p class="modal-footnote">A working generator is needed to transmit. You can keep playing after making contact.</p>`);
}
function showWin(){
  showModal('win',`<div class="modal-symbol">${icon('sun')}</div><div class="eyebrow">TRANSMISSION RECEIVED</div><h2 id="modal-title">You kept the light on.</h2><p class="modal-description">“Shelter 07, we hear you.”<br>For the first time in a long time, the radio carries something other than static. A relief network has your coordinates. There is a world beyond these walls, and you are part of it.</p><div class="inventory-grid"><div class="inventory-item">${icon('sun')}<strong>${state.day}</strong><small>days alive</small></div><div class="inventory-item">${icon('people')}<strong>${state.residents.length}</strong><small>residents</small></div><div class="inventory-item">${icon('map')}<strong>${state.expeditions}</strong><small>expeditions</small></div><div class="inventory-item">${icon('scrap')}<strong>${Object.values(state.upgrades).reduce((a,b)=>a+b,0)}</strong><small>upgrades</small></div><div class="inventory-item">${icon('heart')}<strong>${Math.round(state.morale)}</strong><small>hope</small></div></div><div class="modal-actions"><button class="primary" data-action="continue-endless">Keep building your home ${icon('arrow')}</button></div>`,false,false);
}
function showGameOver(){
  if(modal?.type==='gameover')return;
  showModal('gameover',`<div class="modal-symbol">${icon('moon')}</div><div class="eyebrow">THE LIGHT GOES QUIET</div><h2 id="modal-title">${state.day} days of hope.</h2><p class="modal-description">The wasteland asked more than you could give this time. Your next shelter can last longer: gather water early, build the purifier, and come home before radiation gets too high.</p><p class="modal-footnote">${state.expeditions} expeditions · ${state.residents.length} residents · ${state.scavenged} locations searched</p><div class="modal-actions"><button class="primary" data-action="new-game">Begin again ${icon('arrow')}</button></div>`,false,false);save();
}
function showHelp(){
  showModal('help',`<div class="eyebrow">THE CARETAKER'S HANDBOOK</div><h2 id="modal-title">A home worth surviving for.</h2><p class="modal-description">Explore a nuclear wasteland, grow your community, and keep Shelter 07 alive. Your goal: survive to day 14, repair the radio twice, then transmit.</p><div class="help-grid"><div><h3>Move & interact</h3><p><kbd>W A S D</kbd> / arrow keys to walk.<br>Click the ground or a station to walk there.<br><kbd>E</kbd> interact · <kbd>Shift</kbd> run.<br>Scroll to zoom. Touch controls also work.</p></div><div><h3>Supply runs</h3><p>Leave through the airlock. Search marked locations, then return to unload. Carry 18 supplies, or 28 with a backpack upgrade. Sites refresh after 3 days.</p></div><div><h3>Shelter life</h3><p>Each person needs 1 food and 2 water daily. Sleep in the bunks to advance a day. Fuel powers your purifier. New residents bring skills and need a bed.</p></div><div><h3>The dangers outside</h3><p>Radiation rises outdoors. Above 65, it damages health. Rare mutants appear on 8% of expeditions. <kbd>Space</kbd> uses a flare to drive them off for 14 seconds.</p></div><div><h3>Take care of yourself</h3><p><kbd>M</kbd> uses medicine: +35 health, −35 radiation. Eat at the stockpile to restore energy. Rest removes 25 radiation. Water shortages damage health.</p></div><div><h3>Your progress</h3><p>Autosaves on this browser every 5 seconds and after decisions. <kbd>Esc</kbd> pauses. Time stops during dialogs and while this tab is hidden.</p></div></div><div class="modal-actions"><button class="secondary" data-action="confirm-new">Start a new shelter</button><button class="primary" data-action="close-modal">Keep the light on ${icon('arrow')}</button></div>`,true);
}
function showJournal(){showModal('journal',`<div class="eyebrow">THE SHELTER JOURNAL</div><h2 id="modal-title">The days we made it through.</h2><div class="journal-list">${state.log.map(l=>`<div class="journal-entry ${l.kind}"><time>DAY ${String(l.day).padStart(2,'0')}</time>${esc(l.text)}</div>`).join('')}</div>`,false);}
function objective(){
  if(!state.firstHaul)return {title:'Bring something back.',text:'Head through the airlock, search the old district, and return with supplies.',progress:0};
  if(!state.upgrades.filter)return {title:'A reliable source of water.',text:'Collect 12 scrap and install the water purifier at the workshop.',progress:Math.min(state.resources.scrap/12,1)*100};
  if(!state.upgrades.radio)return {title:'Find a voice in the static.',text:'Make the first radio repair: 20 scrap and 2 fuel. Someone might be listening.',progress:Math.min(state.resources.scrap/20,1)*100};
  if(state.upgrades.radio===1)return {title:'One last repair.',text:'Finish the emergency beacon at the workshop: 28 scrap and 3 fuel.',progress:50};
  if(state.day<14)return {title:'Keep the shelter alive.',text:`The beacon is ready. Keep your community alive until day 14. ${14-state.day} days to go.`,progress:state.day/14*100};
  if(!state.signalSent)return {title:'The world is listening.',text:'Use the repaired radio to send your emergency signal.',progress:100};
  return {title:'A new beginning.',text:'The relief network knows you are here. Keep growing your home, one day at a time.',progress:100};
}
function renderSidebar(){
  if(state.zone==='shelter'){
    const o=objective();
    $('sidebar').innerHTML=`<section class="sidebar-section"><div class="section-heading"><span class="eyebrow">SHELTER OVERVIEW</span><span class="small-badge">${state.integrity>45?'STABLE':'NEEDS CARE'}</span></div><div class="overview-title">A place to begin again.</div><div class="overview-note">${state.residents.length} ${state.residents.length===1?'life':'lives'} sheltered from the outside.</div><div class="condition-row"><span class="condition-label">${icon('shield')} Shelter condition</span><span>${Math.round(state.integrity)}%</span></div><div class="thin-track"><i style="width:${state.integrity}%"></i></div><div class="condition-row"><span class="condition-label">${icon('sun')} Community morale</span><span>${Math.round(state.morale)}%</span></div><div class="thin-track"><i style="width:${state.morale}%;background:#b1b581"></i></div><div class="power-stat">${icon('power')} Generator <span style="margin-left:auto">${state.resources.fuel?'Online':'No fuel'}</span><i class="power-dot ${state.resources.fuel?'':'off'}"></i></div></section><div class="mission"><div class="eyebrow">${icon('flag')} THE NEXT SMALL STEP</div><h3>${o.title}</h3><p>${o.text}</p><div class="mission-progress"><i style="width:${o.progress}%"></i></div></div><section class="sidebar-section residents"><div class="section-heading"><span class="eyebrow">OUR PEOPLE</span><span class="eyebrow">${state.residents.length} / ${G.capacity(state)}</span></div>${state.residents.map((r,i)=>`<div class="resident" title="${esc(r.benefit)}"><div class="avatar">${i===0?'Y':r.name[0]}</div><div><div class="resident-name">${r.name}</div><div class="resident-role">${r.role}</div></div><span class="resident-status">${i?'SETTLED':'AT HOME'}</span></div>`).join('')}${state.residents.length<G.capacity(state)?`<div class="empty-bunk">${icon('bed')} A bed for whoever comes next.</div>`:''}</section><section class="sidebar-section journal"><div class="section-heading"><span class="eyebrow">RECENT JOURNAL</span><button data-action="journal" class="eyebrow" aria-label="Open journal">${icon('northeast')}</button></div>${state.log.slice(0,2).map(l=>`<div class="journal-entry ${l.kind}"><time>DAY ${String(l.day).padStart(2,'0')}</time>${esc(l.text)}</div>`).join('')}</section><div class="sidebar-bottom"><button class="secondary" data-action="rest">${icon('moon')} Rest until morning ${icon('arrow')}</button><p>Each day is another chance.</p></div>`;
  }else{
    $('sidebar').innerHTML=`<section class="sidebar-section"><div class="section-heading"><span class="eyebrow">EXPEDITION ${String(state.expeditions).padStart(2,'0')}</span><span class="small-badge">OUTSIDE</span></div><div class="overview-title">Tread lightly.</div><div class="overview-note">${state.weather} · supplies reset after 3 days</div><div class="condition-row"><span class="condition-label">${icon('pack')} Your backpack</span><span>${G.bagCount(state)} / ${G.bagCapacity(state)}</span></div><div class="thin-track"><i style="width:${G.bagCount(state)/G.bagCapacity(state)*100}%"></i></div><div class="bag-grid">${G.RESOURCE_KEYS.map(k=>`<span class="bag-item" title="${k}">${icon(k)} ${state.bag[k]}</span>`).join('')}</div><p class="expedition-note">Return to the shelter hatch to unload your finds.</p></section><section class="sidebar-section"><div class="section-heading"><span class="eyebrow">THE OLD DISTRICT</span>${icon('map')}</div><div class="sites-list">${G.SITES.map(site=>`<button class="site-row ${G.siteAvailable(state,site.id)?'':'depleted'}" data-action="site" data-id="${site.id}">${icon(site.type)}<div><div class="site-name">${site.name}</div><div class="site-detail">${G.siteAvailable(state,site.id)?site.desc:`Searched · returns day ${state.searched[site.id]+3}`}</div></div><span class="site-distance" data-distance="${site.id}"></span></button>`).join('')}</div></section><section class="sidebar-section journal"><div class="section-heading"><span class="eyebrow">FIELD EQUIPMENT</span></div><button class="secondary" data-action="flare" style="width:100%" ${state.flares?'':'disabled'}>${icon('flare')} Use flare · ${state.flares} left <kbd style="color:#7f8e6d;border-color:#b9c4a7">Space</kbd></button><button class="secondary" data-action="stockpile" style="width:100%;margin-top:8px">${icon('meds')} First aid & rations</button><p class="expedition-note">Flares repel mutants for 14 seconds. Radiation above 65 damages your health.</p></section><div class="sidebar-bottom"><button class="secondary" data-action="return">${icon('home')} Return to shelter ${icon('arrow')}</button><p id="distance-home">Follow the path home.</p></div>`;
  }
}
function updateUI(){
  $('day-title').textContent=`DAY ${String(state.day).padStart(2,'0')}`;
  $('day-time').textContent=`${String(Math.floor(state.minute/60)).padStart(2,'0')}:${String(Math.floor(state.minute%60)).padStart(2,'0')} · ${state.weather}`;
  const outside=state.zone==='wasteland';
  $('scene-eyebrow').textContent=outside?'THE EXCLUSION ZONE / SECTOR 07':'24 METERS BELOW THE SURFACE';
  $('scene-title').textContent=outside?'The old district':'Shelter 07';
  $('scene-caption').textContent=outside?'Take what you need. Find your way home.':'A little light remains.';
  const tag=outside?`${icon('radiation')} ${state.weather==='Ash storm'?'HIGH':'LOW'} FALLOUT`:`${icon('shield')} SAFE ZONE`;
  if($('zone-tag').innerHTML!==tag)$('zone-tag').innerHTML=tag;
  $('expedition-button').innerHTML=outside?`Return to shelter ${icon('home')}`:`Explore wasteland ${icon('northeast')}`;
  $('mobile-toggle-label').textContent=outside?'Expedition':'Shelter';
  for(const k of G.RESOURCE_KEYS){$(`count-${k}`).textContent=state.resources[k];$(`resource-${k}`).classList.toggle('warning',state.resources[k]<=(k==='food'?state.residents.length:k==='water'?state.residents.length*2:0));}
  for(const k of ['health','energy','radiation']){$(`vital-${k}`).style.width=`${G.clamp(state[k],0,100)}%`;$(`value-${k}`).textContent=Math.round(state[k]);}
  $('play-area').classList.toggle('low-health',state.health<30);
  $('danger-banner').classList.toggle('hidden',!outside||!state.encounter);
  $('footer-status').textContent=outside?state.radiation>65?'RADIATION WARNING — RETURN HOME':`${G.bagCount(state)} SUPPLIES RECOVERED · WATCH YOUR RADIATION`:state.resources.fuel?'ALL SYSTEMS NOMINAL':'GENERATOR OFFLINE — FUEL NEEDED';
  const key=JSON.stringify([state.zone,state.resources,state.bag,state.residents.length,state.upgrades,state.day,Math.round(state.integrity),Math.round(state.morale),state.firstHaul,state.signalSent,state.flares,state.log[0]?.text,state.searched]);
  if(key!==sidebarKey){sidebarKey=key;const scroll=$('sidebar').scrollTop;renderSidebar();$('sidebar').scrollTop=scroll;world?.sync(state);}
  if(outside){document.querySelectorAll('[data-distance]').forEach(el=>{const site=G.SITES.find(p=>p.id===el.dataset.distance);el.textContent=`${Math.round(Math.hypot(site.x-state.position.x,site.z-state.position.z))}m`;});const d=$('distance-home');if(d)d.textContent=`${Math.round(Math.hypot(state.position.x,state.position.z-15.8))}m from home · walk back to unload`;}
  const t=!paused()&&!task?world?.nearest():null;$('interaction').innerHTML=t?`<kbd>E</kbd> ${t.action}`:'';
}
function flare(){
  if(paused()||state.zone!=='wasteland')return;
  if(!state.flares){toast('No flares left. Craft more at the shelter workshop.','warn');return;}
  state.flares--;world.flare();beep(130,.3);toast('Flare lit. Mutants will flee for 14 seconds.');save();updateUI();
}
function beep(frequency,duration=.08){
  if(!sound)return;
  try{audioContext||=new AudioContext();audioContext.resume();const o=audioContext.createOscillator(),g=audioContext.createGain();o.frequency.value=frequency;o.type='sine';g.gain.setValueAtTime(.045,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);o.connect(g).connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+duration);}catch{}
}
function toggleSound(){
  sound=!sound;$('sound-button').innerHTML=icon(sound?'sound':'mute');$('sound-button').setAttribute('aria-label',sound?'Mute ambient sound':'Enable ambient sound');$('sound-button').title=sound?'Mute ambient sound':'Enable ambient sound';
  try{
    audioContext||=new AudioContext();audioContext.resume();
    if(sound){const o=audioContext.createOscillator(),g=audioContext.createGain();o.type='sine';o.frequency.value=58;g.gain.value=.025;o.connect(g).connect(audioContext.destination);o.start();ambientSound={o,g};beep(420);}
    else if(ambientSound){ambientSound.o.stop();ambientSound=null;}
  }catch{sound=false;}
}
function pauseGame(){if(modal){closeModal();return;}manuallyPaused=!manuallyPaused;keys.clear();$('pause-screen').classList.toggle('hidden',!manuallyPaused);$('pause-button').innerHTML=icon(manuallyPaused?'play':'pause');$('pause-button').setAttribute('aria-label',manuallyPaused?'Resume game':'Pause game');save();}

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');if(!b||b.disabled||loading)return;
  const a=b.dataset.action;
  if(a==='close-modal'){closeModal();return;}
  if(a==='sound'){toggleSound();return;}
  if(a==='sidebar'){$('sidebar').classList.toggle('mobile-open');return;}
  if(a==='pause'){pauseGame();return;}
  if(state.gameOver&&!['new-game','help'].includes(a))return;
  if(a==='help')showHelp();
  else if(a==='expedition')showExpedition();
  else if(a==='depart'){forceClose();if(G.depart(state)){refreshWorld();toast('Supply run started. Click a marked location to walk there.');beep(160,.22);}}
  else if(a==='return'){chooseTarget('home');$('sidebar').classList.remove('mobile-open');}
  else if(a==='rest'&&state.zone==='shelter')showRest();
  else if(a==='sleep'){forceClose();G.nextDay(state);refreshWorld();beep(490,.15);if(state.gameOver)showGameOver();else showEvent();}
  else if(a==='event-choice'){if(G.resolveEvent(state,b.dataset.choice)){forceClose();refreshWorld();beep(410,.12);}}
  else if(a==='workshop'&&state.zone==='shelter')showWorkshop();
  else if(a==='build'){if(G.build(state,b.dataset.id)){refreshWorld();showWorkshop();toast(`${G.UPGRADES[b.dataset.id].name} improved.`);beep(550,.13);}}
  else if(a==='craft-flares'){if(G.craftFlares(state)){save();showWorkshop();updateUI();toast('3 flares ready for your next expedition.');}}
  else if(a==='repair'){if(G.repair(state)){save();showMaintenance();updateUI();toast('Shelter condition restored.');}}
  else if(a==='stockpile')showStockpile();
  else if(a==='medicine'){if(G.useMedicine(state)){save();showStockpile();updateUI();beep(580);}}
  else if(a==='eat'){if(G.eat(state)){save();showStockpile();updateUI();}}
  else if(a==='site'){chooseTarget(b.dataset.id);$('sidebar').classList.remove('mobile-open');}
  else if(a==='interact')interactNearest();
  else if(a==='flare')flare();
  else if(a==='journal')showJournal();
  else if(a==='broadcast'){if(G.broadcast(state)){save();showWin();updateUI();beep(650,.4);}}
  else if(a==='continue-endless'){state.continued=true;forceClose();save();updateUI();}
  else if(a==='confirm-new')showModal('confirm-new',`<div class="eyebrow">A NEW BEGINNING</div><h2 id="modal-title">Start another shelter?</h2><p class="modal-description">This replaces your saved shelter and begins again on day 1.</p><div class="modal-actions"><button class="secondary" data-action="close-modal">Keep this shelter</button><button class="primary" data-action="new-game">Start over ${icon('arrow')}</button></div>`);
  else if(a==='new-game'){forceClose();state=G.newGame();G.log(state,'The generator is humming. For now, this is home.');manuallyPaused=false;$('pause-screen').classList.add('hidden');$('pause-button').innerHTML=icon('pause');refreshWorld();toast('A new shelter. A new chance.');}
});
window.addEventListener('keydown',e=>{
  if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
  if(e.code==='Tab'&&modal){const f=[...$('modal-root').querySelectorAll('button:not(:disabled)')];const first=f[0],last=f.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}return;}
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  if(e.repeat)return;
  if(e.code==='Escape'){e.preventDefault();pauseGame();return;}
  if(paused())return;
  if(e.code==='KeyE')interactNearest();
  else if(e.code==='Space')flare();
  else if(e.code==='KeyM'){if(G.useMedicine(state)){toast('Medical kit used. Health restored and radiation reduced.');save();}else toast('No medical kit needed or available.','warn');}
  else {keys.add(e.code);if(task&&['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){task=null;$('action-progress').replaceChildren();}}
});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>keys.clear());
document.addEventListener('visibilitychange',()=>{hiddenPause=document.hidden;keys.clear();save();});
window.addEventListener('pagehide',save);
document.querySelectorAll('[data-key]').forEach(b=>{
  b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(!paused()){keys.add(b.dataset.key);task=null;$('action-progress').replaceChildren();}});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys.delete(b.dataset.key));
});

function frame(now){
  requestAnimationFrame(frame);const dt=Math.min((now-lastTime)/1000||.016,.05);lastTime=now;frameTime+=dt;
  if(loading)return;
  const isPaused=paused();
  if(!isPaused){
    G.tick(state,dt);
    if(task){task.elapsed+=dt;$('action-progress').innerHTML=`Searching ${G.SITES.find(s=>s.id===task.id).name}…<div class="track"><i style="width:${Math.min(100,task.elapsed/task.duration*100)}%"></i></div>`;
      if(task.elapsed>=task.duration){const id=task.id;task=null;const found=G.scavenge(state,id);$('action-progress').replaceChildren();if(found){toast(Object.entries(found).map(([k,n])=>`+${n} ${G.RESOURCE_NAMES[k]}`).join(' · '));beep(510,.15);save();world.sync(state);}if(state.pendingEvent)showEvent();}}
    if(state.pendingEvent&&!modal)showEvent();
    if(state.gameOver)showGameOver();
  }
  world.update(dt,frameTime,keys,paused(),id=>interact(id),damage=>{state.health=Math.max(0,state.health-damage);toast('A mutant struck you! Use a flare or run back home.','warn');beep(100,.2);if(state.health<=0){state.gameOver=true;showGameOver();}});
  uiTimer+=dt;saveTimer+=dt;if(uiTimer>.25){updateUI();uiTimer=0;}if(saveTimer>5){save();saveTimer=0;}
}
async function init(){
  try{
    world=new World($('play-area'),$('world-labels'),chooseTarget,point=>{if(!paused()&&!task)world.goTo(point);});
    await world.load(progress=>$('loading-fill').style.width=`${progress*100}%`);
    world.setZone(state);loading=false;$('loading').classList.add('hidden');updateUI();
    if(state.gameOver)showGameOver();else if(state.pendingEvent)showEvent();else if(state.signalSent&&!state.continued)showWin();
    else if(!state.introSeen){state.introSeen=true;toast('Welcome home. Walk with WASD, or click a station to get started.');save();}
    requestAnimationFrame(frame);
  }catch(error){
    console.error('Afterlight could not start:',error);
    $('loading-text').textContent='The shelter could not load. Please reload the page.';
    const detail=document.createElement('p');detail.style.cssText='max-width:360px;text-align:center;line-height:1.8;letter-spacing:0';detail.textContent='This game needs WebGL and must be opened through the local server. Check that hardware acceleration is enabled in your browser.';$('loading').appendChild(detail);
  }
}
// Deliberately enabled only in Vite development mode for repeatable game QA.
if(import.meta.env.DEV){window.__afterlight={get state(){return state;},get world(){return world;},get paused(){return paused();},setState(s){forceClose();state=G.restoreSave(s)||G.newGame();refreshWorld();if(state.pendingEvent)showEvent();},actions:G,showEvent,showWorkshop,refresh:refreshWorld};}
init();
