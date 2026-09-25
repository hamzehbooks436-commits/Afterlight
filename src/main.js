import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import './style.css';
import './map-ui.css';
import './computer.css';
import './town.css';
import {World} from './world.js';
import * as A from './archipelago.js';
import {coastalMap, destinations, mapPosition, distanceLabel} from './coastal-map.js';
import * as G from './state.js';
import * as F from './field.js';
import * as H from './shelter.js';
import * as Saves from './saves.js';
import {icon} from './icons.js';
import {renderComputer} from './computer-ui.js';
import {changeKit} from './computer.js';
import * as P from './settlement.js';
import * as Town from './town-renovation.js';
import {OnlineSession,cleanCode} from './online.js';
import {applyShared} from './online-state.js';
import {OnlineAvatars} from './online-avatars.js';

const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let book={version:1,active:0,slots:Array(Saves.SLOT_COUNT).fill(null)},storageReady=true,saveStatus='Autosaves every 5 seconds';
try{book=Saves.readSlots(localStorage);}catch{storageReady=false;saveStatus='Saving unavailable. Existing browser data has been preserved.';}
let state=F.restoreCampaign(book.slots[book.active]?.state)||F.newCampaign(),world,loading=true,running=false,modal=null,task=null,last=0,elapsed=0,saveTimer=0,uiTimer=0,damageTime=0,hitTime=0,dragMode=false,dragging=false,hud=true,aiming=false,mapZoom=1,mapPanX=0,mapPanY=0;
let lastTownDaylight=Town.isTownDaylight(state);
const keys=new Set(),coarse=matchMedia('(pointer:coarse)').matches;
let expansionFloor=1,movingRoom=null;
let computerApp='desktop',computerMailOpen=null,computerFloor=1,computerSlot=null,computerPerson=null;
let computerTownTab='overview',computerTownSelection=null;
let online=null,avatars=null,localSnapshot=null,onlineStatus='',presenceTimer=0;
document.querySelector('#app').innerHTML=`
  <main id="game"><div id="vignette"></div><div id="damage"></div>
    <div id="hud"><div id="location"></div><div id="compass"><span id="heading">N</span><i></i></div>
      <div id="reticle"><i></i><b></b></div><div id="hitmarker">×</div>
      <div id="vitals"><div class="hp"><span>+</span><i><b id="health-fill"></b></i></div><div id="stamina"><b></b></div><span id="radiation"></span></div>
      <div id="ammo"><span id="weapon-name"></span><div><b id="mag"></b><small id="reserve"></small></div><span id="reload-label"></span></div>
      <div id="quick-hint"><kbd>I</kbd> BACKPACK <span>·</span> <kbd>J</kbd> FIELD NOTES</div>
    </div><button id="minimap" data-action="map" aria-label="Open full map"><span class="minimap-label">NEARBY · M</span><span id="minimap-map"></span></button>
    <div id="navigation"></div><div id="bike-status"></div><div id="interaction"></div><div id="action-progress"></div><div id="toast-area" aria-live="polite"></div>
    <div id="touch-controls"><div id="touch-look"></div><div class="touch-move"><button data-key="KeyW" aria-label="Move forward">↑</button><div><button data-key="KeyA" aria-label="Move left">←</button><button data-key="KeyS" aria-label="Move backward">↓</button><button data-key="KeyD" aria-label="Move right">→</button></div></div><div class="touch-actions"><button data-action="interact">E</button><button data-action="shoot">FIRE</button><button data-key="Space">JUMP</button><button data-action="inventory">PACK</button><button data-action="reload">R</button><button data-action="torch">LIGHT</button></div></div>
    <div id="loading"><div class="eyebrow">SECTOR 07 / NO SIGNAL</div><h1>AFTERLIGHT</h1><p id="loading-text">Entering the exclusion zone</p><div class="loading-track"><i id="loading-fill"></i></div></div>
    <div id="menu" class="hidden"></div><div id="modal-root"></div>
  </main>`;

function paused(){return loading||!running||!!modal||document.hidden||state.gameOver;}
function save(index=book.active,name){if(online){online.publishState(state);saveStatus='Online room synced';return true;}if(typeof index!=='number')index=book.active;if(!storageReady)return false;try{book=Saves.writeSlot(localStorage,book,index,state,name);saveStatus=`Saved to slot ${book.active+1} · ${new Date().toLocaleTimeString()}`;return true;}catch{saveStatus='Save failed: browser storage is unavailable or full.';toast(saveStatus,'warn');return false;}}
function toast(text,kind='info'){const e=document.createElement('div');e.className=`toast ${kind}`;e.textContent=text;$('toast-area').appendChild(e);while($('toast-area').children.length>3)$('toast-area').firstChild.remove();setTimeout(()=>e.remove(),5000);}
function release(){keys.clear();dragging=false;aiming=false;if(document.pointerLockElement)document.exitPointerLock();}
function pause(){if(loading)return;running=false;cancelTask();release();save();showMenu();}
function showMenu(){
  $('menu').classList.remove('hidden');$('menu').innerHTML=`<section class="title-screen"><div class="eyebrow">A FIRST-PERSON WASTELAND</div><h1>AFTERLIGHT<span>THE WORLD LEFT BEHIND</span></h1><p>Scavenge the ruins. Keep your people alive.<br>Find a voice in the static.</p><button class="primary" data-action="resume">${state.introSeen?'Continue surviving':'Enter Shelter 07'} <span>→</span></button><div class="menu-links"><button data-action="online">${online?'Online room':'Play online'}</button><button data-action="controls">Controls & settings</button>${online?'':`<button data-action="saves">Save slots</button><button data-action="new-confirm">New journey</button>`}</div><div class="menu-controls"><kbd>WASD</kbd> MOVE <kbd>MOUSE</kbd> LOOK <kbd>E</kbd> INTERACT <kbd>I</kbd> INVENTORY</div><small>DAY ${String(state.day).padStart(2,'0')} / ${state.zone==='shelter'?'SHELTER 07':'STARRY SANDS'} <span>${online?`ROOM ${online.code} · ${esc(onlineStatus)}`:`SLOT ${book.active+1} / ${esc(saveStatus)}`}</span></small></section>`;
}
function showOnline(message=''){
  const preferred=localStorage.getItem('afterlight.online.name')||'Survivor';
  showModal('online',online?'Your co-op room':'Shelter 07 co-op',online?
    `<p class="description">Share this invite code with up to three friends. Shared shelter and town progress syncs through Firebase. Your offline save slots stay on this device.</p><div class="online-code">${online.code}</div><p class="description">${esc(onlineStatus)}</p><button data-action="copy-room">Copy invite code</button> <button data-action="leave-online">Leave room and return to offline journey</button>`:
    `<p class="description">Create a private room from your current journey, or join a friend. Your local save slots are kept separately.</p><label class="online-field">Your name<input id="online-name" maxlength="24" value="${esc(preferred)}"></label><div class="online-actions"><button data-action="create-online">Create room</button><label class="online-field">Invite code<input id="online-code" maxlength="24" autocomplete="off" placeholder="20-character code"></label><button data-action="join-online">Join room</button></div>${message?`<p class="online-error" role="alert">${esc(message)}</p>`:''}`);
}
function receivedShared(shared){
  if(!online||!world)return;
  const rebuild=JSON.stringify([state.shelter,state.residents,state.field.starrySands,state.field.settlement])!==JSON.stringify([shared.shelter,shared.residents,shared.field?.starrySands,shared.field?.settlement]);
  state.position={x:world.player.position.x,y:world.player.position.y,z:world.player.position.z};
  applyShared(state,shared);
  if(rebuild){avatars?.clear();world.setZone(state);}updateHUD();
}
async function enterOnline(kind){
  const name=$('online-name')?.value.trim()||'Survivor',code=cleanCode($('online-code')?.value);
  document.querySelectorAll('.panel.online button').forEach(button=>button.disabled=true);
  try{
    save();localSnapshot=structuredClone(state);localStorage.setItem('afterlight.online.name',name);
    const callbacks=[receivedShared,peers=>avatars?.setPeers(peers),status=>{onlineStatus=status;if(modal==='online')showOnline();}];
    online=kind==='create'?await OnlineSession.create(name,state,callbacks):await OnlineSession.join(code,name,callbacks);
    if(kind==='join'){state=F.newCampaign();applyShared(state,online.baseline);state.zone='shelter';state.position={x:0,y:0,z:5.5};state.introSeen=true;world.setZone(state);}
    avatars=new OnlineAvatars(world,online.uid);running=false;saveStatus='Online room synced';showOnline();
  }catch(error){localSnapshot=null;showOnline(error.message||String(error));}
}
async function leaveOnline(){
  if(!online)return;const previous=online;online=null;await previous.close();avatars?.clear();avatars=null;
  state=F.restoreCampaign(localSnapshot)||F.newCampaign();localSnapshot=null;world.setZone(state);running=false;saveStatus='Offline save slots';showMenu();toast('Returned to your offline journey.');
}
async function resume(){
  if(loading||state.gameOver)return;modal=null;$('modal-root').replaceChildren();$('menu').classList.add('hidden');running=true;audio.start();
  if(!state.introSeen){state.introSeen=true;toast('The expansion plans let you choose rooms and build up to nine floors. The lift reaches each completed floor. The blast door leads to Starry Sands.');toast('In Starry Sands, use the planning board to restore homes, reopen services and decorate the streets.');toast(coarse?'Use the arrows to walk, drag on the right to look, and tap E to interact.':'Mouse to look · E to interact · I backpack · Esc pause');save();}
  world.canvas.focus();if(coarse){dragMode=true;return;}
  try{await world.canvas.requestPointerLock();dragMode=false;}catch{dragMode=true;toast('Hold right mouse to look, or use the arrow keys.');}
}
function showModal(type,title,body,footer=''){
  modal=type;cancelTask();release();$('menu').classList.add('hidden');$('modal-root').innerHTML=`<div class="modal-backdrop"><section class="panel ${type}" role="dialog" aria-modal="true" aria-labelledby="panel-title"><header><div><div class="eyebrow">AFTERLIGHT / ${type==='inventory'?'FIELD EQUIPMENT':type.startsWith('town')?'STARRY SANDS':'SHELTER 07'}</div><h2 id="panel-title">${title}</h2></div><button class="close" data-action="close" aria-label="Close">×</button></header>${body}<footer>${footer||'<span>The world is paused.</span>'}<button class="text-button" data-action="close">Close <kbd>ESC</kbd></button></footer></section></div>`;
  requestAnimationFrame(()=>$('modal-root').querySelector('button')?.focus());
}
function closeModal(){movingRoom=null;if(state.gameOver){gameOver();return;}modal=null;$('modal-root').replaceChildren();if(running)resume();else showMenu();}
function cancelTask(){task=null;$('action-progress').replaceChildren();}
function changeZone(){cancelTask();keys.clear();world.setZone(state);save();updateHUD();}
function costText(cost){return Object.entries(cost).map(([k,n])=>`${n} ${G.RESOURCE_NAMES[k]}`).join(' + ')||'No supplies needed';}
function weaponIcon(id){return `<svg viewBox="0 0 160 80" aria-hidden="true"><path d="${id==='pistol'?'M25 21H139V38H78L71 70H45L49 39H25Z M89 38V52H73':id==='rifle'?'M5 23H40L56 30H102V25H132V31H157V38H102L100 59H86V39H68L61 56H48L44 39H5Z':'M22 61L111 19H142V29H115L30 73Z'}"/></svg>`;}
function showInventory(){
  const outside=state.zone==='wasteland',bag=outside?state.bag:state.resources;
  showModal('inventory','Your backpack',`<div class="pack-top"><span>${outside?'Carried supplies':'At home · shelter supplies'}</span><span>${outside?`${G.bagCount(state)} / ${G.bagCapacity(state)} supply slots`:'Stockpile available'}</span></div><div class="weapon-grid">${Object.entries(F.WEAPONS).map(([id,w],i)=>{const own=state.field.weapons[id];return `<button class="weapon-card ${state.field.equipped===id?'selected':''}" data-action="equip" data-id="${id}" ${own.owned?'':'disabled'}><span class="slot">0${i+1}</span>${weaponIcon(id)}<strong>${w.name}</strong><small>${own.owned?id==='pipe'?'Melee · no ammunition':`${own.mag} loaded / ${own.reserve} reserve`:'Find at the Military Checkpoint'}</small>${state.field.equipped===id?'<em>EQUIPPED</em>':''}</button>`;}).join('')}</div><div class="supply-grid">${G.RESOURCE_KEYS.map(k=>`<div>${icon(k)}<strong>${bag[k]}</strong><span>${G.RESOURCE_NAMES[k]}</span></div>`).join('')}<div>${icon('flare')}<strong>${state.flares}</strong><span>flares</span></div></div><div class="pack-actions"><button data-action="medicine" ${bag.meds&& (state.health<100||state.radiation>0)?'':'disabled'}>Use medical kit <small>+35 health / −35 radiation</small></button><button data-action="radmed" ${bag.radmed&&state.radiation>0?'':'disabled'}>Use Rad-Clear <small>Remove all radiation</small></button><button data-action="eat" ${bag.food&&bag.water&&state.energy<100?'':'disabled'}>Eat & drink <small>1 food + 1 water / +35 energy</small></button><button data-action="torch">Flashlight <small>${state.field.flashlight?'ON':'OFF'} · press F in the field</small></button></div><div class="pack-stats"><span>HEALTH <b>${Math.round(state.health)}</b></span><span>ENERGY <b>${Math.round(state.energy)}</b></span><span>RADIATION <b>${Math.round(state.radiation)}</b></span><span>DAY ${state.day} <b>${timeLabel()}</b></span></div>`,outside?'<span>Search caches for supplies and ammunition. Return home to unload.</span>':'<span>Leaving home packs food, water, a medical kit and Rad-Clear when available.</span>');
}
function mapSVG(local=false,interactive=false){return coastalMap(state,G.SITES,id=>G.siteAvailable(state,id),{local,interactive,buildings:world?.settlementBuildings||[]});}

function showMap(){
  mapZoom=1;mapPanX=0;mapPanY=0;
  showModal('map','Coastal archipelago · Shelter 07',`<div class="full-map-wrap"><div class="full-map-viewport" id="full-map-viewport"><div class="full-map" style="--map-zoom:${mapZoom};--map-pan-x:0px;--map-pan-y:0px">${mapSVG(false,true)}</div></div><div class="map-legend"><span><i class="map-dot shelter"></i>SHELTER 07</span><span><i class="map-dot town"></i>SETTLEMENT / TOWN</span><span><i class="map-dot cache"></i>SUPPLY CACHE</span><span><i class="map-dot bridge"></i>BRIDGE / DOCK</span><span>◇ GREY: SEARCHED</span><span style="color:#88d6e5">◇ BICYCLE</span></div></div><div class="map-actions"><button data-action="map-zoom-out">−</button><button data-action="map-reset">100%</button><button data-action="map-zoom-in">+</button><button data-action="map-centre">Centre on me</button><button data-action="map-clear">Clear marker</button><button data-action="respawn-bike" data-id="bike">Respawn bicycle</button><button data-action="respawn-bike" data-id="bike_extra">Respawn spare bicycle</button><span>Drag to pan · scroll to zoom · click land or a destination to mark it.</span></div>`,'<span>Click the minimap or press <kbd>M</kbd> to return here.</span>');
  const viewport=$('full-map-viewport'),canvas=viewport?.firstElementChild;
  const list=document.createElement('div');list.className='map-destinations';list.innerHTML=destinations(state,G.SITES).map(d=>`<button data-action="map-destination" data-id="${d.id}">${esc(d.name)} <small>${distanceLabel(Math.hypot(d.x-mapPosition(state).x,d.z-mapPosition(state).z))}${G.SITES.some(s=>s.id===d.id)?G.siteAvailable(state,d.id)?' · supplies':` · resupplies day ${state.searched[d.id]+3}`:''}</small></button>`).join('');const details=document.createElement('details');details.className='map-destination-picker';details.innerHTML='<summary>Destinations & cache status</summary>';details.append(list);document.querySelector('.map-actions').after(details);
  if(viewport&&canvas){let dragging=false,lastX=0,lastY=0,moved=0;const apply=()=>{canvas.style.setProperty('--map-zoom',mapZoom);canvas.style.setProperty('--map-pan-x',`${mapPanX}px`);canvas.style.setProperty('--map-pan-y',`${mapPanY}px`);};const clamp=()=>{const maxX=(mapZoom-1)*viewport.clientWidth/2,maxY=(mapZoom-1)*viewport.clientHeight/2;mapPanX=Math.max(-maxX,Math.min(maxX,mapPanX));mapPanY=Math.max(-maxY,Math.min(maxY,mapPanY));};viewport.addEventListener('pointerdown',e=>{dragging=true;moved=0;lastX=e.clientX;lastY=e.clientY;viewport.setPointerCapture(e.pointerId);viewport.classList.add('dragging');});viewport.addEventListener('pointermove',e=>{if(!dragging)return;moved+=Math.abs(e.clientX-lastX)+Math.abs(e.clientY-lastY);mapPanX+=e.clientX-lastX;mapPanY+=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;clamp();apply();});viewport.addEventListener('pointerup',e=>{dragging=false;viewport.classList.remove('dragging');if(moved<6){const svg=canvas.querySelector('svg'),point=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse()),p=A.mapPoint([point.x,point.y]);const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-destination]');const d=destinations(state,G.SITES).find(d=>d.id===hit?.dataset.destination);if(d)setWaypoint(d);else if(A.isWalkable(p.x,p.z))setWaypoint(p);else toast('Choose a destination on land or a bridge.');}});viewport.addEventListener('pointercancel',()=>{dragging=false;viewport.classList.remove('dragging');});viewport.addEventListener('wheel',e=>{e.preventDefault();const rect=viewport.getBoundingClientRect(),ox=e.clientX-rect.left-rect.width/2,oy=e.clientY-rect.top-rect.height/2,old=mapZoom;mapZoom=Math.max(1,Math.min(4,mapZoom+(e.deltaY<0?.25:-.25)));const ratio=mapZoom/old;mapPanX=ox-(ox-mapPanX)*ratio;mapPanY=oy-(oy-mapPanY)*ratio;clamp();apply();refreshMapZoom();},{passive:false});}
}
function refreshMapZoom(){const e=document.querySelector('.full-map'),viewport=document.querySelector('.full-map-viewport');if(e){const maxX=(mapZoom-1)*(viewport?.clientWidth||0)/2,maxY=(mapZoom-1)*(viewport?.clientHeight||0)/2;mapPanX=Math.max(-maxX,Math.min(maxX,mapPanX));mapPanY=Math.max(-maxY,Math.min(maxY,mapPanY));e.style.setProperty('--map-zoom',mapZoom);e.style.setProperty('--map-pan-x',`${mapPanX}px`);e.style.setProperty('--map-pan-y',`${mapPanY}px`);}const b=document.querySelector('.map-actions button:nth-child(2)');if(b)b.textContent=`${Math.round(mapZoom*100)}%`;}

function setWaypoint(p){state.field.waypoint={x:p.x,z:p.z};save();refreshMapContent();updateHUD();}
function refreshMapContent(){const e=document.querySelector('.full-map');if(e)e.innerHTML=mapSVG(false,true);}
function centreMap(){const viewport=$('full-map-viewport');if(!viewport)return;mapZoom=4;const p=A.imagePoint(mapPosition(state)),scale=Math.min(viewport.clientWidth/1448,viewport.clientHeight/1086);mapPanX=(724-p[0])*scale*mapZoom;mapPanY=(543-p[1])*scale*mapZoom;refreshMapZoom();}

function showJournal(){
  const town=Town.townSummary(state);
  showModal('journal','Field notes',`<div class="current-objective"><span>THE NEXT STEP</span><p>${esc(F.objective(state))}</p></div><div class="journal-columns"><div>${mapSVG()}<small class="map-caption">COASTAL ARCHIPELAGO / 2.94 × 2.21 KM / RESTORING STARRY SANDS</small></div><div class="map-sites">${G.SITES.map((s,i)=>`<div><b>${String(i+1).padStart(2,'0')}</b><span>${s.name}<small>${s.desc}${G.siteAvailable(state,s.id)?'':` · resupplies day ${state.searched[s.id]+3}`}</small></span></div>`).join('')}</div></div><h3>Starry Sands restoration</h3><p class="description">${town.built} / ${town.total} buildings · ${town.residents} / ${town.beds} people housed · ${town.decorations} decorated plots · ${town.grid.capacity} powered blocks. Visit the planning board in town to renovate its lots.</p><button data-action="town-overview">Open town plans</button><h3>Base duties</h3><div class="duty-list">${Object.entries(F.JOBS).map(([id,j])=>`<div><span>${state.field.jobs[id]===state.day?'✓':'○'} ${j.name}</span><small>${j.detail}</small></div>`).join('')}</div><div class="log">${state.log.slice(0,6).map(l=>`<p><small>DAY ${l.day}</small> ${esc(l.text)}</p>`).join('')}</div>`);
}
function showWorkshop(){
  showModal('workshop','Make it last.',`<p class="description">${state.resources.scrap} scrap / ${state.resources.fuel} fuel in the shelter stockpile.</p><div class="craft-grid">${Object.entries(G.UPGRADES).map(([id,u])=>{const cost=G.upgradeCost(state,id),done=state.upgrades[id]>=u.max;return `<article>${icon(u.icon)}<h3>${u.name}</h3><p>${u.desc}</p><button data-action="build" data-id="${id}" ${done||!G.canAfford(state,cost)?'disabled':''}>${done?'INSTALLED':costText(cost)}</button></article>`;}).join('')}</div><div class="ammo-craft"><button data-action="craft-ammo" data-id="pistol" ${state.resources.scrap<3?'disabled':''}>16 pistol rounds · 3 scrap</button><button data-action="craft-ammo" data-id="rifle" ${state.resources.scrap<5||!state.field.weapons.rifle.owned?'disabled':''}>24 rifle rounds · 5 scrap</button><button data-action="craft-flares" ${state.resources.scrap<3?'disabled':''}>3 flares · 3 scrap</button></div>`);
}
function showControls(){
  showModal('controls','Stay alive.',`<div class="control-grid">${[['W A S D','Walk / swim'],['Mouse','Look around'],['Left click','Fire / swing'],['Right click','Aim / drag to look'],['Shift','Sprint'],['Space','Jump'],['C / Ctrl','Crouch'],['E','Interact / board / disembark'],['I / Tab','Backpack'],['J','Map & tasks'],['1 / 2 / 3','Pistol / rifle / pipe'],['R','Reload'],['F','Flashlight'],['G','Throw a flare'],['M','Open / close map'],['Bicycle','W pedal · A/D steer · S/Space brake · E dismount'],['Boat','W/S throttle · A/D steer · E disembark at shore'],['H','Hide all HUD'],['Esc','Pause']].map(([k,v])=>`<div><kbd>${k}</kbd><span>${v}</span></div>`).join('')}</div><p class="description">Shelter from radstorms inside buildings. Supplies are in physical caches; some are upstairs. Work at the generator, filter, garden, mess table and salvage pile once each day. Residents carry out their own shifts. Open field notes for the map and your next objective.</p><div class="settings"><button data-action="sound">Sound: ${state.field.settings.sound?'ON':'OFF'}</button><button data-action="bob">Head motion: ${state.field.settings.bob?'ON':'OFF'}</button><label>Look sensitivity<input id="sensitivity" type="range" min="0.4" max="2.2" step="0.1" value="${state.field.settings.sensitivity}"></label></div>`);
}
function showEvent(){
  const e=G.EVENTS[state.pendingEvent];if(!e){toast('Only static. Search North Relay for a signal.');return;}
  showModal('radio',e.title,`<p class="description">${e.text}</p><div class="choices">${e.choices.map(c=>`<button data-action="event" data-id="${c.id}" ${G.choiceAvailable(state,c)?'':'disabled'}>${c.label}<small>${c.detail}</small></button>`).join('')}</div>`);
}
function showRadio(message=''){
  showModal('radio','Shelter 07 radio',`<p class="description">${message?esc(message):'Invite survivors once per day. Each call has a 10% chance of finding someone who can join.'}</p><p class="description">${state.residents.length} residents / ${G.capacity(state)} beds · Radio repairs ${state.upgrades.radio} / 2</p><button data-action="invite-radio" ${state.shelter.radioDay===state.day||state.residents.length>=G.capacity(state)?'disabled':''}>Broadcast invitation · 10% chance</button><button data-action="broadcast" ${state.upgrades.radio<2||state.day<14||!state.resources.fuel?'disabled':''}>Transmit relief signal</button><button data-action="town-aid">Coordinate aid for Starry Sands</button>`);
}
function showComputer(app='desktop',open=null){
  computerApp=app;computerMailOpen=open;
  showModal('computer','Shelter 07 computer',renderComputer(state,app,open,world,computerFloor,computerSlot,computerPerson,computerTownTab,computerTownSelection),'<span>Local shelter network · simulated messages</span>');
}
function showTrade(){
  const town=P.townState(state);
  showModal('trade','Shady Shores barter market',`<p class="description">Nadia trades supplies from the town's shared stores. Bring supplies in your field backpack. Stock is replenished each day.</p><p class="description">Your backpack: ${G.RESOURCE_KEYS.map(key=>`${state.bag[key]} ${G.RESOURCE_NAMES[key]}`).join(' · ')} · ${G.bagCount(state)}/${G.bagCapacity(state)} carried</p><div class="trade-list">${Object.entries(P.TRADES).map(([id,offer])=>`<button data-action="shady_shores-trade" data-id="${id}" ${P.canTrade(state,id)?'':'disabled'}><strong>${esc(offer.label)}</strong><small>${town.stock[id]} available today</small></button>`).join('')}</div>`);
}
function showShelter09(){
  const treated=P.townState(state).lastTreatment===state.day;
  showModal('hospital','Shelter 09 hospital',`<p class="description">Dr. Amara and Sera run this converted shelter as a community hospital. Its wards and supplies belong to Shady Shores.</p><p class="description">Your condition: ${Math.round(state.health)} health · ${Math.round(state.radiation)} radiation. Treatment costs 1 food and 2 water from your backpack and is available once per day.</p><button class="primary" data-action="shelter09-treat" ${P.canTreat(state)?'':'disabled'}>${treated?'Already treated today':'Ask the staff for treatment'}</button>`);
}
function refreshTown(){
  if(state.zone==='wasteland'&&typeof world.refreshStarrySands==='function')world.refreshStarrySands();
  save();updateHUD();
}
function townNavigation(){return `<div class="town-nav"><button data-action="town-overview">Town board</button><button data-action="town-projects">Buildings</button><button data-action="town-residents">Residents</button><button data-action="town-decorations">Decorate</button><button data-action="town-aid">Shelter 07 aid</button></div>`;}
function townStores(){const town=Town.townState(state);return `<div class="town-supplies">${G.RESOURCE_KEYS.map(key=>`<span><strong>${town.supplies[key]}</strong> ${G.RESOURCE_NAMES[key]}</span>`).join('')}</div>`;}
function townDeposit(){return state.zone==='wasteland'?Town.nearTownBoard(state)?`<h3>Deliver field supplies</h3><p class="description">Supplies you bring into Starry Sands can be used for any project. Buildings also use what is still in your backpack.</p><div class="town-actions"><button data-action="town-deposit" data-id="all" ${G.bagCount(state)?'':'disabled'}>Unload backpack · ${G.bagCount(state)} supplies</button>${G.RESOURCE_KEYS.filter(key=>state.bag[key]).map(key=>`<button data-action="town-deposit" data-id="${key}">Deliver ${state.bag[key]} ${G.RESOURCE_NAMES[key]}</button>`).join('')}</div>`:'<p class="description">Visit the Starry Sands planning board to unload your backpack into town stores.</p>':'';}
function showTownPlanning(){
  const summary=Town.townSummary(state),grid=summary.grid;
  showModal('town','Restore Starry Sands',`${townNavigation()}<p class="description">Repair abandoned homes, invite neighbours, reopen public buildings and fill the streets with things you choose. Use the nearby lots to work on each building.</p><div class="town-stats"><span><strong>${summary.built} / ${summary.total}</strong> buildings restored</span><span><strong>${summary.residents} / ${summary.beds}</strong> people housed</span><span><strong>${summary.decorations} / ${Town.TOWN_DECOR_SLOTS.length}</strong> plots decorated</span><span><strong>${summary.morale}</strong> town morale</span></div><h3>Town stores</h3>${townStores()}${townDeposit()}<h3>Power for the neighbourhood</h3><p class="description">${grid.powered.length} of ${grid.demand} occupied blocks have power (${grid.capacity} available capacity). ${grid.reactor} can come from Shelter 07's reactors through the town link; ${grid.shelterPowered.length} ${grid.shelterPowered.length===1?'block is':'blocks are'} receiving that power now. The local plant needs town fuel. Solar arrays add another block.</p><div class="town-actions"><button data-action="town-projects">Inspect renovation lots</button><button data-action="town-residents">Homes and work</button><button data-action="town-decorations">Place decorations</button><button data-action="town-aid">Coordinate Shelter 07 aid</button></div>`, '<span>Work on a project by walking to its lot or selecting it here.</span>');
}
function showTownProjects(){
  const town=Town.townState(state),grid=Town.townGrid(state);
  showModal('town-project','Renovation lots',`${townNavigation()}<div class="town-project-list">${Town.TOWN_PROJECTS.map(p=>{const level=town.projects[p.id],next=level<2?p.levels[level].cost:null;return `<button data-action="town-project" data-id="${p.id}"><strong>${esc(p.name)}</strong><small>${level===0?'RUINED':level===1?'RESTORED':'EXPANDED'} · ${next?costText(next):'complete'}${grid.powered.includes(p.id)?' · powered':''}</small></button>`;}).join('')}</div>`);
}
function showTownProject(id){
  const status=Town.townProjectStatus(state,id);if(!status){showTownProjects();return;}
  const {project:p,level,next,staff,powered}=status;
  const needsPower=['hospital','shop','school','waterworks','workshop','community'].includes(p.type)||level===2&&['home','farm'].includes(p.type);
  const treatment=id==='hospital'&&level>0?`<h3>Hospital service</h3><p class="description">A medic, grid power, 1 town medicine and 1 town water provide treatment once each day. Your health is ${Math.round(state.health)} and radiation is ${Math.round(state.radiation)}.</p><button data-action="town-treat" ${Town.canTreatInTown(state)?'':'disabled'}>${Town.townState(state).lastTreatment===state.day?'Already treated today':'Receive treatment · +50 health / −35 radiation'}</button>`:'';
  showModal('town-project',p.name,`${townNavigation()}<p class="description">${esc(p.description)}</p><div class="town-stats"><span><strong>${level} / 2</strong> renovation level</span><span><strong>${staff}</strong> people working here</span><span><strong>${needsPower?powered?'ON':'OFF':'—'}</strong> ${needsPower?'grid power':'no grid needed'}</span></div><h3>${level===0?'Restore this lot':level===1?'Expand this building':'Building complete'}</h3>${next?`<p class="description">${p.levels[level].desc}. Requires ${costText(next)}. Building uses town stores and any supplies you are carrying.</p><button class="primary" data-action="town-build" data-id="${p.id}" ${Town.canRenovate(state,id)?'':'disabled'}>${level?'Expand':'Restore'} ${esc(p.name)} →</button>`:'<p class="description">Both renovation stages are finished.</p>'}${treatment}<h3>Town stores</h3>${townStores()}${townDeposit()}`);
  let services='';
  if(id==='hospital'&&level>0)services=`<h3>Rad-Clear treatment</h3><p class="description">Hospital staff can use 1 town-stored Rad-Clear and 1 town water to remove all your radiation once per day. Town Rad-Clear: ${Town.townState(state).supplies.radmed}.</p><button data-action="town-radclear" ${Town.canUseTownRadClear(state)?'':'disabled'}>${Town.townState(state).lastRadClearDay===state.day?'Already used today':'Remove all radiation'}</button>`;
  if(id==='shop'&&level>0)services=`<h3>Buy from the shops</h3><p class="description">A shopkeeper and grid power are needed. Pay with scrap in your field backpack; goods come from town stores.</p><div class="town-actions">${Object.entries(Town.TOWN_SHOP_OFFERS).map(([offerId,offer])=>`<button data-action="town-shop-buy" data-id="${offerId}" ${Town.canShopInTown(state,offerId)?'':'disabled'}>Buy ${esc(offer.name)} · ${offer.scrap} carried scrap</button>`).join('')}</div>`;
  if(p.type==='home'&&level>0){const current=Town.townState(state).homeDecor[id];services=`<h3>Decorate this home</h3><p class="description">Current: ${esc(Town.HOME_DECORATIONS[current]?.name||'plain front yard')}. Choose a porch or yard detail for the people living here.</p><div class="town-actions">${Object.entries(Town.HOME_DECORATIONS).map(([decorId,decor])=>`<button data-action="town-home-decor" data-home="${id}" data-id="${decorId}" ${Town.canDecorateHome(state,id,decorId)?'':'disabled'}>${esc(decor.name)} · ${costText(decor.cost)}<small>${esc(decor.description)}</small></button>`).join('')}</div>`;}
  const storesHeading=[...document.querySelectorAll('.panel.town-project h3')].find(element=>element.textContent==='Town stores');storesHeading?.insertAdjacentHTML('beforebegin',services);
}
function showTownResidents(){
  const town=Town.townState(state),beds=Town.townBeds(state);
  showModal('town-residents','People of Starry Sands',`${townNavigation()}<p class="description">Repair homes to make room. Each new resident needs 2 food and 2 water from town stores and can be invited once per day. Give them work in a restored building to keep the town running.</p><div class="town-stats"><span><strong>${town.residents.length} / ${beds}</strong> residents / beds</span><span><strong>${town.morale}</strong> morale</span><span><strong>${town.supplies.food}</strong> food</span><span><strong>${town.supplies.water}</strong> water</span></div><button class="primary" data-action="town-invite" ${Town.canInviteTownResident(state)?'':'disabled'}>Invite a survivor to move in →</button><div class="town-project-list">${town.residents.map(r=>`<button data-action="town-resident" data-id="${esc(r.name)}"><strong>${esc(r.name)}</strong><small>${esc(Town.TOWN_PROJECT_BY_ID[r.home]?.name||'No home')} · ${esc(Town.TOWN_JOB_LABELS[r.job]||'Needs a job')}</small></button>`).join('')||'<p class="description">No one has moved in yet. Start with a repaired home.</p>'}</div>${townDeposit()}`);
}
function showTownResident(name,status=''){
  const town=Town.townState(state),resident=town.residents.find(r=>r.name===name);if(!resident){showTownResidents();return;}
  const options=Object.entries(Town.TOWN_JOB_LABELS).filter(([id])=>town.projects[id]>0);
  showModal('town-residents',resident.name,`${townNavigation()}<p class="description">${status?`${esc(status)} · `:''}Home: ${esc(Town.TOWN_PROJECT_BY_ID[resident.home]?.name||'Unassigned')} · Work: ${esc(Town.TOWN_JOB_LABELS[resident.job]||'Unassigned')}</p><h3>Assign work</h3><div class="town-actions"><button data-action="town-assign" data-name="${esc(name)}" data-id="none" ${resident.job?'':'disabled'}>No shift</button>${options.map(([id,label])=>`<button data-action="town-assign" data-name="${esc(name)}" data-id="${id}" ${resident.job===id?'disabled':''}>${esc(label)} · ${esc(Town.TOWN_PROJECT_BY_ID[id].name)}</button>`).join('')}</div><h3>Choose a home</h3><div class="town-actions">${Town.TOWN_PROJECTS.filter(p=>p.type==='home'&&town.projects[p.id]).map(p=>`<button data-action="town-move-home" data-name="${esc(name)}" data-id="${p.id}" ${resident.home===p.id?'disabled':''}>${esc(p.name)}</button>`).join('')}</div>`);
  for(const button of document.querySelectorAll('.panel.town-residents [data-action="town-assign"]'))if(!Town.canAssignTownResident(state,name,button.dataset.id==='none'?null:button.dataset.id))button.disabled=true;
  for(const button of document.querySelectorAll('.panel.town-residents [data-action="town-move-home"]'))if(!Town.canMoveTownResident(state,name,button.dataset.id))button.disabled=true;
}
function showTownDecorations(){
  const town=Town.townState(state);
  showModal('town-decor','Decorate the streets',`${townNavigation()}<p class="description">Choose a marked plot and place a bench, lamp, trees, gardens, recreation space or useful town equipment. You can change a plot later.</p><div class="town-project-list">${Town.TOWN_DECOR_SLOTS.map((slot,i)=>`<button data-action="town-decor-slot" data-id="${slot.id}"><strong>Plot ${i+1} · ${esc(slot.id.replaceAll('_',' '))}</strong><small>${esc(Town.TOWN_DECORATIONS[town.decorations[slot.id]]?.name||'Empty')}</small></button>`).join('')}</div>`);
}
function showTownDecorSlot(id){
  const slot=Town.TOWN_DECOR_SLOT_BY_ID[id];if(!slot){showTownDecorations();return;}
  const current=Town.townState(state).decorations[id];
  showModal('town-decor',`Decoration plot · ${id.replaceAll('_',' ')}`,`${townNavigation()}<p class="description">Currently: ${esc(Town.TOWN_DECORATIONS[current]?.name||'empty')}. Place a new decoration using town stores or your backpack. Each useful prop changes the street and some add daily resources or power.</p><div class="town-project-list">${Object.entries(Town.TOWN_DECORATIONS).map(([key,d])=>`<button data-action="town-place-decor" data-slot="${id}" data-id="${key}" ${Town.canPlaceDecoration(state,id,key)?'':'disabled'}><strong>${esc(d.name)} · ${costText(d.cost)}</strong><small>${esc(d.description)}</small></button>`).join('')}</div>${current?`<button data-action="town-remove-decor" data-id="${id}">Clear this plot</button>`:''}<h3>Town stores</h3>${townStores()}${townDeposit()}`);
  const clear=document.querySelector('.panel.town-decor [data-action="town-remove-decor"]');if(clear&&!Town.canRemoveDecoration(state,id))clear.disabled=true;
}
function showTownAid(){
  const aid=H.shelterTownAid(state),grid=Town.townGrid(state);
  showModal('town-aid','Shelter 07 helps Starry Sands',`${townNavigation()}<p class="description">Shelter 07 can send supplies from its stockpile when its rooms are equipped. Its reactors power ${grid.shelterPowered.length} occupied town blocks through the distribution link. Reactor capacity: ${aid.power} blocks; link capacity: ${Town.townState(state).projects.reactor_link===2?8:Town.townState(state).projects.reactor_link?2:0}.</p><div class="town-project-list">${Object.entries(H.TOWN_AID).map(([id,spec])=>`<button data-action="town-aid-send" data-id="${id}" ${H.canDispatchTownAid(state,id)?'':'disabled'}><strong>${esc(spec.name)} · ${costText(spec.cost)}</strong><small>Town receives ${costText(Town.TOWN_AID_CONTENTS[id])}. ${aid[spec.facility==='kitchen'?'food':spec.facility==='water'?'water':spec.facility==='hospital'?'medicine':'materials']?'Facility ready':'Build the required shelter room first.'}</small></button>`).join('')}</div><h3>Town stores</h3>${townStores()}`);
  for(const button of document.querySelectorAll('.panel.town-aid [data-action="town-aid-send"]'))if(!Town.canSendTownAid(state,button.dataset.id))button.disabled=true;
}
function interact(){
  if(paused()||task)return;const t=world.nearest();if(!t)return;
  if(t.id==='bike'||t.id==='bike_extra'){const was=world.riding;if(world.toggleBike(t.id)){toast(was?'Bicycle parked. Its location is marked on your map.':'W pedal · A/D steer · S/Space brake · E dismount');save();updateHUD();}else toast('No room to get off here. Move to an open area.');}
  else if(t.boat||world.activeBoat){const was=!!world.activeBoat;if(world.toggleBoat(t.id)){toast(was?'Boat moored.':'Boat boarded. W/S throttle · A/D steer · E to disembark near a pier or shore.');save();updateHUD();}else toast(was?'Move closer to a pier or shore before disembarking.':'Move closer to the boat.');}
  else if(t.id==='airlock'){if(F.depart(state)){changeZone();toast('Starry Sands. The market is northwest. Shelter 07 is behind you.');audio.play('door');}}
  else if(t.id==='home'){const count=F.returnHome(state);changeZone();toast(`Home. ${count} supplies unloaded.`);audio.play('door');}
  else if(t.hospitalEntry||t.hospitalExit){
    const below=!!t.hospitalEntry,x=P.SHADY_SHORES.x,z=P.SHADY_SHORES.z;
    world.player.position.set(x,below?-4.08:.12,z+(below?-14.5:-7.5));
    world.lastClearPosition=world.player.position.clone();world.velocityY=0;
    state.position={x:world.player.position.x,y:world.player.position.y,z:world.player.position.z};
    world.syncCamera(0);save();updateHUD();toast(below?'You descend into Shelter 09’s staffed hospital.':'You return to Shady Shores.');audio.play('door');
  }
  else if(t.townPlanning)showTownPlanning();
  else if(t.townProject)showTownProject(t.townProject);
  else if(t.townDecorSlot)showTownDecorSlot(t.townDecorSlot);
  else if(t.townResident)showTownResident(t.townResident.name,t.townResident.status);
  else if(t.hospital)showShelter09();
  else if(t.settler){if(t.settler.id==='trader')showTrade();else if(t.settler.id==='medic')showShelter09();else toast(`${t.settler.name}: “${t.settler.speech}”`);}
  else if(t.job){if(state.field.jobs[t.id]===state.day){toast('Finished for today. Come back after the next shift.');return;}if(!F.jobAvailable(state,t.id)){toast(`Needs ${costText(F.JOBS[t.id].cost)}.`,'warn');return;}beginTask(t,'job',F.JOBS[t.id].seconds);}
  else if(t.site){if(!G.siteAvailable(state,t.id)){toast(`Already searched. Supplies return on day ${state.searched[t.id]+3}.`);return;}if(G.bagCount(state)>=G.bagCapacity(state)){toast('Backpack full. Return home to unload.','warn');return;}beginTask(t,'search',2.6);}
  else if(t.lift)showLift();
  else if(t.computer){computerFloor=Math.max(1,Math.min(state.shelter.floors,Math.floor((world.player.position.y+1)/H.FLOOR_HEIGHT)+1));computerSlot=null;computerPerson=null;showComputer();}
  else if(t.id==='expansion'||t.expansion)showExpansion(t.floor||1,t.slot??null);
  else if(t.room)showRoom(t.room,t.floor,t.slot);
  else if(t.id==='workbench'||t.workbench)showWorkshop();
  else if(t.id==='stores'||t.stores)showInventory();
  else if(t.id==='board')showJournal();
  else if(t.id==='bed'||t.bed)showModal('rest','Another morning.',`<p class="description">Sleep restores energy, removes 25 radiation, and heals 12 health when there are enough rations. Each resident needs 1 food and 2 water per day.</p><p class="description">${state.residents.length} residents · ${state.resources.food} food · ${state.resources.water} water · ${state.resources.fuel} fuel</p><button class="primary" data-action="sleep">Sleep until morning →</button>`);
  else if(t.id==='radio'){
    if(state.pendingEvent)showEvent();else showRadio();
  }else if(t.npc){const n=t.npc;toast(`${n.person.name}: “${n.person.role==='Engineer'?'I’ll keep the generator running. Bring back anything we can use for parts.':n.person.role==='Botanist'?'The plants are still alive. We need clean water. You can help at the grow beds.':'Check the medical supplies before you head outside.'}”`);}
}
function beginTask(target,kind,duration){task={target,kind,duration,elapsed:0,origin:world.player.position.clone()};keys.clear();audio.play('work');}
function finishTask(){
  const t=task;cancelTask();
  if(t.kind==='job'){if(F.completeJob(state,t.target.id)){toast(`${F.JOBS[t.target.id].name} completed.`);audio.play('loaded');}}
  else{const hadRifle=state.field.rifleFound,found=F.search(state,t.target.id);if(found){toast(Object.entries(found).map(([k,n])=>`+${n} ${G.RESOURCE_NAMES[k]}`).join(' · ')+' · ammunition recovered');if(!hadRifle&&state.field.rifleFound)toast('Service rifle recovered. Press 2 to equip.');audio.play('loaded');}}
  save();updateHUD();
}
function damage(amount){if(paused())return;cancelTask();state.health=Math.max(0,state.health-amount);damageTime=.8;audio.play('hurt');if(state.health<=0){state.gameOver=true;gameOver();}}
function gameOver(){running=false;release();save();showModal('death','A second chance.',`<p class="description">The rescue crew can bring you back to the hospital at Shelter 07. Respawns are unlimited.</p><p class="description">You will lose ${G.bagCount(state)} carried supplies. Your weapons, shelter stockpile, rooms, residents and progress are kept.</p><p class="description">Rescues so far: ${state.shelter.deaths}</p><button class="primary" data-action="respawn">Respawn at Shelter 07 →</button><button data-action="saves">Load another save</button>`);}
function showSaves(message=''){
  showModal('saves','Your journeys',`<p class="description">Five independent saves. The active slot autosaves. Save a copy to keep a checkpoint; loading it makes that slot active.</p><p class="save-status" role="status">${esc(message||saveStatus)}</p><div class="save-list">${book.slots.map((slot,i)=>`<article class="save-slot ${i===book.active?'selected':''}"><div><h3>0${i+1} / ${slot?esc(slot.name):'Empty slot'} ${i===book.active?'· ACTIVE':''}</h3><p>${slot?`Day ${slot.state.day} · ${slot.state.zone==='shelter'?'Shelter 07':'Wasteland'} · ${slot.state.health<=0?'Awaiting rescue':Math.round(slot.state.health)+' health'}<br>${slot.savedAt?esc(new Date(slot.savedAt).toLocaleString()):'Imported save'}`:'Start a separate journey or save your current progress here.'}</p></div><div class="slot-actions">${slot?`<button data-action="load-slot" data-id="${i}">Load slot ${i+1}</button>`:''}<button data-action="save-slot" data-id="${i}">${slot?'Save here':'Save a copy'}</button><button data-action="new-slot" data-id="${i}">New journey</button></div></article>`).join('')}</div>`);
}
function confirmSlot(index,action){
  if(!book.slots[index]||index===book.active&&action==='save-slot'){performSlot(index,action);return;}
  showModal('confirm','Replace this save?',`<p class="description">Slot ${index+1}: ${esc(book.slots[index].name)}, day ${book.slots[index].state.day}. This replaces that slot with ${action==='new-slot'?'a new journey':'your current progress'}.</p><button class="primary danger" data-action="${action==='new-slot'?'replace-new':'replace-save'}" data-id="${index}">Replace slot ${index+1}</button><button data-action="saves">Cancel</button>`);
}
function performSlot(index,action){
  if(action==='save-slot'){const ok=save(index);showSaves(ok?'Checkpoint saved. This is now your active slot.':saveStatus);return;}
  if(!save()){showSaves(saveStatus);return;}
  const next=action==='new-slot'?F.newCampaign():F.restoreCampaign(book.slots[index]?.state);
  if(!next){showSaves('This save could not be loaded.');return;}
  try{book=Saves.writeSlot(localStorage,book,index,next,action==='new-slot'?`Journey ${index+1}`:undefined);}catch{showSaves('Could not switch slots. Current progress is still open.');return;}
  state=next;movingRoom=null;expansionFloor=1;cancelTask();keys.clear();damageTime=0;world.setZone(state);if(state.gameOver)gameOver();else{running=true;resume();}updateHUD();
}
function showExpansion(floor=expansionFloor,selected=null){
  expansionFloor=Math.max(1,Math.min(state.shelter.floors,Number(floor)||1));
  const base=state.shelter,choice=selected===null?null:Number(selected),room=choice===null?null:H.roomAt(state,expansionFloor,choice);
  const floorTabs=Array.from({length:base.floors},(_,i)=>`<button data-action="show-floor" data-floor="${i+1}" class="${i+1===expansionFloor?'selected':''}">Floor ${i+1}</button>`).join('');
  const floorCost=H.floorCost(state);
  const bays=H.SLOTS.map((bay,i)=>{const r=H.roomAt(state,expansionFloor,i);return `<button class="room-bay ${choice===i?'selected':''}" data-action="select-room-slot" data-floor="${expansionFloor}" data-slot="${i}"><strong>${esc(bay.name)}</strong><span>${r?esc(H.ROOMS[r.id].name)+' · level '+r.level:'Open bay · choose a room'}</span></button>`;}).join('');
  let editor='<p class="description">Select a bay. Every bay has an open doorway, even before a room is installed.</p>';
  if(choice!==null){
    if(movingRoom)editor=`<p class="description">Moving ${esc(H.ROOMS[H.roomAt(state,movingRoom.floor,movingRoom.slot)?.id]?.name||'room')}. Select this bay to ${room?'swap rooms':'move the room here'}.</p><button data-action="finish-move" data-floor="${expansionFloor}" data-slot="${choice}">Confirm ${room?'swap':'move'}</button><button data-action="cancel-move">Cancel move</button>`;
    else if(room){const cost=H.roomCost(state,room.id,expansionFloor,choice);editor=`<h3>${esc(H.ROOMS[room.id].name)} · level ${room.level}</h3><p class="description">${esc(H.ROOMS[room.id].detail)}</p><button data-action="build-room" data-id="${room.id}" data-floor="${expansionFloor}" data-slot="${choice}" ${room.level>=H.ROOMS[room.id].max||!G.canAfford(state,cost)?'disabled':''}>${room.level>=H.ROOMS[room.id].max?'Fully upgraded':`Upgrade · ${costText(cost)}`}</button><button data-action="start-move" data-floor="${expansionFloor}" data-slot="${choice}">Move or swap room</button>`;}
    else editor=`<h3>${esc(H.SLOTS[choice].name)} · floor ${expansionFloor}</h3><div class="room-options">${Object.entries(H.ROOMS).map(([id,r])=>{const cost=H.roomCost(state,id,expansionFloor,choice),locked=id==='reactor'&&expansionFloor<8||id==='computer'&&expansionFloor<2;return `<button data-action="build-room" data-id="${id}" data-floor="${expansionFloor}" data-slot="${choice}" ${locked||!G.canAfford(state,cost)?'disabled':''}><strong>${esc(r.name)}</strong><small>${locked?`${id==='computer'?'Floors 2–9':'Floors 8–9'} only`:costText(cost)}</small></button>`;}).join('')}</div>`;
  }
  showModal('expansion','Shelter expansion',`<p class="description">Choose each room's exact bay. Build floors for more space. The lift in reception takes you to every completed floor. ${state.resources.scrap} scrap available.</p><div class="floor-tabs">${floorTabs}</div><div class="floor-builder"><span>${base.floors} / ${H.MAX_FLOORS} floors complete</span><button data-action="add-floor" ${base.floors>=H.MAX_FLOORS||!G.canAfford(state,floorCost)?'disabled':''}>${base.floors>=H.MAX_FLOORS?'Nine-floor limit reached':`Build floor ${base.floors+1} · ${costText(floorCost)}`}</button></div><div class="room-bays">${bays}</div><div class="room-editor">${editor}</div>`);
}
function showLift(){
  showModal('lift','Shelter lift',`<p class="description">The lift connects all completed floors.</p><div class="floor-tabs">${Array.from({length:state.shelter.floors},(_,i)=>`<button data-action="take-lift" data-floor="${i+1}">Floor ${i+1}</button>`).join('')}</div><button data-action="expansion">Open expansion plans</button>`);
}
function showRoom(id,floor,slot){
  const r=H.ROOMS[id],placed=H.roomAt(state,floor,slot);if(!r||!placed)return;
  if(id==='computer'){showComputerRoom(floor,slot);return;}
  const done=id!=='hospital'&&state.shelter.duties[`${floor}-${slot}`]===state.day;
  const labels={hospital:'Receive treatment',kitchen:'Cook a meal',garden:'Harvest food',bedrooms:'Rest in your room',workshop:'Reclaim machine parts',waterworks:'Purify water',storage:'Organize supplies',gym:'Train',reactor:'Run reactor shift'};
  showModal('room',r.name,`<p class="description">FLOOR ${floor} · ${esc(H.SLOTS[slot].name)} · LEVEL ${placed.level}</p><p class="description">${esc(r.detail)}</p><p class="description">${costText(H.serviceCost(state,id,floor,slot))}</p><button class="primary" data-action="room-service" data-id="${id}" data-floor="${floor}" data-slot="${slot}" ${H.serviceAvailable(state,id,floor,slot)?'':'disabled'}>${done?'Shift completed — return tomorrow':labels[id]}</button>${id==='workshop'?'<button data-action="workshop">Craft ammunition & equipment</button>':''}<button data-action="show-floor" data-floor="${floor}">Move, upgrade or expand</button>`);
}
function showComputerRoom(floor,slot){
  const room=H.roomAt(state,floor,slot);if(room?.id!=='computer')return;
  const decor=room.decor||{color:'teal',light:'warm',layout:'paired'};
  const label={teal:'Shelter teal',amber:'Warm amber',blue:'Retro blue',warm:'Warm lamps',cool:'Cool lamps',paired:'Paired desks',wall:'Wall desks'};
  showModal('computer-room','Computer room',`<p class="description">Floor ${floor} · ${esc(H.SLOTS[slot].name)} · Level ${room.level}. Choose the room's color, lighting and desk arrangement. Changes appear in the 3D room.</p><div class="computer-decor">${Object.entries(H.COMPUTER_DECOR).map(([kind,values])=>`<section><h3>${kind.toUpperCase()}</h3>${values.map(value=>`<button class="${decor[kind]===value?'selected':''}" data-action="computer-decor" data-kind="${kind}" data-id="${value}" data-floor="${floor}" data-slot="${slot}">${esc(label[value])}</button>`).join('')}</section>`).join('')}</div><button data-action="pc-app" data-id="desktop">Open a computer</button><button data-action="show-floor" data-floor="${floor}">Move or upgrade room</button>`);
}

function timeLabel(){return `${String(Math.floor(state.minute/60)).padStart(2,'0')}:${String(Math.floor(state.minute%60)).padStart(2,'0')}`;}
function updateHUD(){
  if(!world)return;const w=state.field.weapons[state.field.equipped],dirs=['N','NE','E','SE','S','SW','W','NW'];world.camera.getWorldDirection(world.direction);const heading=((Math.atan2(world.direction.x,-world.direction.z)*180/Math.PI)+360)%360;
  $('location').textContent=world.location();$('heading').textContent=`${dirs[Math.round(heading/45)%8]} · ${Math.round(heading)}°`;
  $('health-fill').style.width=`${state.health}%`;$('health-fill').style.background=state.health<30?'#ca7051':'#c7c7a2';$('stamina').style.opacity=state.field.stamina<96?'1':'0';$('stamina').firstElementChild.style.width=`${state.field.stamina}%`;
  $('radiation').textContent=state.radiation>30||state.weather==='Radstorm'&&state.zone==='wasteland'?`☢ ${Math.round(state.radiation)} ${world.environment().sheltered?' / SHELTERED':''}`:'';
  $('ammo').classList.toggle('hidden',state.zone==='shelter'||world.riding||world.activeBoat||state.field.swimming);$('weapon-name').textContent=F.WEAPONS[state.field.equipped].name;$('mag').textContent=state.field.equipped==='pipe'?'':String(w.mag).padStart(2,'0');$('reserve').textContent=state.field.equipped==='pipe'?'MELEE':` / ${w.reserve}`;$('reload-label').textContent=world.reloading?'RELOADING':!w.mag&&state.field.equipped!=='pipe'?'R · RELOAD':'';
  const t=paused()||task?null:world.nearest();$('interaction').innerHTML=t?`<span>${esc(t.name)}</span><div><kbd>E</kbd> ${esc(t.action)}</div>`:'';
  $('hud').classList.toggle('hidden',!hud||!running||!!modal);$('touch-controls').classList.toggle('active',coarse&&running&&!modal);
  if($('minimap-map'))$('minimap-map').innerHTML=mapSVG(true);
  $('minimap').classList.toggle('hidden',!hud||!running||!!modal);
  const wp=state.field.waypoint,pos=mapPosition(state);$('navigation').textContent=wp?`◇ ${distanceLabel(Math.hypot(wp.x-pos.x,wp.z-pos.z))} to marker · direct distance`:'';
  $('bike-status').textContent=world.activeBoat?`${Math.round(Math.abs(world.boatSpeed)*3.6)} km/h · W/S throttle · A/D steer · E disembark at shore`:world.riding?`${Math.round(world.bikeSpeed*3.6)} km/h · W pedal · A/D steer · S/Space brake · E dismount`:state.field.swimming?'SWIMMING · WASD move · reach a shore or pier':'';
  for(const id of ['navigation','bike-status'])$(id).classList.toggle('hidden',!hud||!running||!!modal);
  $('interaction').style.display=hud?'':'none';$('action-progress').style.display=hud?'':'none';
  $('toast-area').classList.toggle('hidden',!!modal||!hud);
}

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');if(!b||b.disabled||loading)return;const a=b.dataset.action,id=b.dataset.id;
  if(a==='resume')resume();else if(a==='close')closeModal();else if(a==='online')showOnline();else if(a==='create-online')enterOnline('create');else if(a==='join-online')enterOnline('join');else if(a==='leave-online')leaveOnline();else if(a==='copy-room'){navigator.clipboard.writeText(online.code).then(()=>toast('Invite code copied.'));}else if(a==='inventory'){if(modal==='inventory')closeModal();else showInventory();}
  else if(a==='pc-app')showComputer(id);
  else if(a==='pc-town-tab'&&modal==='computer'&&computerApp==='town'&&state.zone==='shelter'){computerTownTab=['overview','buildings','residents','decor','aid'].includes(id)?id:'overview';computerTownSelection=null;showComputer('town');}
  else if(a==='pc-town-project'&&modal==='computer'&&computerApp==='town'&&state.zone==='shelter'){computerTownTab='buildings';computerTownSelection=id;showComputer('town');}
  else if(a==='pc-town-decor-slot'&&modal==='computer'&&computerApp==='town'&&state.zone==='shelter'){computerTownTab='decor';computerTownSelection=id;showComputer('town');}
  else if(a==='pc-town-resident'&&modal==='computer'&&computerApp==='town'&&state.zone==='shelter'){computerTownTab='residents';computerTownSelection=id;showComputer('town');}
  else if(a==='pc-town-build'&&modal==='computer'&&computerApp==='town'&&state.zone==='shelter'){if(Town.renovate(state,id,{remote:true})){save();updateHUD();showComputer('town');}}
  else if(a==='pc-town-place-decor'&&modal==='computer'&&computerApp==='town'&&state.zone==='shelter'){if(Town.placeDecoration(state,b.dataset.slot,id,{remote:true})){save();updateHUD();showComputer('town');}}
  else if(a==='pc-town-home-decor'&&modal==='computer'&&computerApp==='town'&&state.zone==='shelter'){if(Town.decorateHome(state,b.dataset.home,id,{remote:true})){save();updateHUD();showComputer('town');}}
  else if(a==='pc-town-remove-decor'&&modal==='computer'&&computerApp==='town'&&state.zone==='shelter'){if(Town.removeDecoration(state,id,{remote:true})){save();updateHUD();showComputer('town');}}
  else if(a==='pc-town-invite'&&modal==='computer'&&computerApp==='town'&&state.zone==='shelter'){if(Town.inviteTownResident(state,{remote:true})){save();updateHUD();showComputer('town');}}
  else if(a==='pc-town-assign'&&modal==='computer'&&computerApp==='town'&&state.zone==='shelter'){if(Town.assignTownResident(state,b.dataset.name,id==='none'?null:id,{remote:true})){save();updateHUD();showComputer('town');}}
  else if(a==='pc-town-move-home'&&modal==='computer'&&computerApp==='town'&&state.zone==='shelter'){if(Town.moveTownResident(state,b.dataset.name,id,{remote:true})){save();updateHUD();showComputer('town');}}
  else if(a==='pc-town-aid-send'&&modal==='computer'&&computerApp==='town'&&state.zone==='shelter'){if(Town.sendTownAid(state,id)){save();updateHUD();showComputer('town');}}
  else if(a==='pc-floor'){computerFloor=Number(b.dataset.floor);computerSlot=null;showComputer('shelter');}
  else if(a==='pc-room-slot'){computerFloor=Number(b.dataset.floor);computerSlot=Number(b.dataset.slot);showComputer('shelter');}
  else if(a==='pc-build-room'){const floor=Number(b.dataset.floor),slot=Number(b.dataset.slot);if(H.buildRoom(state,id,floor,slot)){computerFloor=floor;computerSlot=slot;changeZone();showComputer('shelter');toast(`${H.ROOMS[id].name} built on floor ${floor}.`);}}
  else if(a==='pc-person'){computerPerson=id;showComputer('people');}
  else if(a==='pc-assign'){const floor=b.dataset.floor==='auto'?null:Number(b.dataset.floor),slot=floor===null?null:Number(b.dataset.slot);if(H.assignResident(state,b.dataset.name,floor,slot)){computerPerson=b.dataset.name;changeZone();showComputer('people');}}
  else if(a==='pc-kit'){if(changeKit(state,id,Number(b.dataset.delta)))save();showComputer('inventory');}
  else if(a==='pc-mail-open'){const index=Number(id);if(state.computer.mail[index]){state.computer.mail[index].read=true;save();showComputer('mail',index);}}
  else if(a==='shady_shores-trade'){if(P.trade(state,id)){save();audio.play('loaded');showTrade();}else toast('Bring the required supplies and make room in your backpack.','warn');}
  else if(a==='shelter09-treat'){if(P.treat(state)){save();audio.play('loaded');showShelter09();toast('Shelter 09 staff treated your injuries.');}else toast('The staff cannot treat you right now.','warn');}
  else if(a==='town-overview')showTownPlanning();
  else if(a==='town-projects')showTownProjects();
  else if(a==='town-project')showTownProject(id);
  else if(a==='town-residents')showTownResidents();
  else if(a==='town-resident')showTownResident(id);
  else if(a==='town-decorations')showTownDecorations();
  else if(a==='town-decor-slot')showTownDecorSlot(id);
  else if(a==='town-aid')showTownAid();
  else if(a==='town-build'){if(Town.renovate(state,id)){refreshTown();showTownProject(id);toast(`${Town.TOWN_PROJECT_BY_ID[id].name} renovated.`);audio.play('loaded');}else toast('Bring the required supplies to the town or fill its stores.','warn');}
  else if(a==='town-deposit'){const amount=Town.depositTownSupplies(state,id);if(amount){refreshTown();showTownPlanning();toast(`${amount} supplies delivered to town stores.`);}else toast('Your field backpack has no supplies to deliver.');}
  else if(a==='town-place-decor'){if(Town.placeDecoration(state,b.dataset.slot,id)){refreshTown();showTownDecorSlot(b.dataset.slot);toast(`${Town.TOWN_DECORATIONS[id].name} placed.`);}else toast('This decoration needs more supplies.','warn');}
  else if(a==='town-remove-decor'){if(Town.removeDecoration(state,id)){refreshTown();showTownDecorSlot(id);toast('Decoration plot cleared.');}}
  else if(a==='town-invite'){const resident=Town.inviteTownResident(state);if(resident){refreshTown();showTownResidents();toast(`${resident.name} moved into Starry Sands.`);}else toast('Repair a home and stock 2 food plus 2 water; one invitation is available each day.','warn');}
  else if(a==='town-assign'){if(Town.assignTownResident(state,b.dataset.name,id==='none'?null:id)){refreshTown();showTownResident(b.dataset.name);}else toast('That work shift has no available place.','warn');}
  else if(a==='town-move-home'){if(Town.moveTownResident(state,b.dataset.name,id)){refreshTown();showTownResident(b.dataset.name);}else toast('That home is full.','warn');}
  else if(a==='town-aid-send'){if(Town.sendTownAid(state,id)){refreshTown();showTownAid();toast('Shelter 07 supplies reached the town.');}else toast('Build the required shelter room and stock the shipment supplies.','warn');}
  else if(a==='town-treat'){if(Town.treatInTown(state)){save();showTownProject('hospital');toast('Starry Sands hospital staff treated you.');}else toast('The hospital needs a medic, power, medicine and water.','warn');}
  else if(a==='town-radclear'){if(Town.useTownRadClear(state)){save();showTownProject('hospital');toast('Town-stored Rad-Clear removed your radiation.');}}
  else if(a==='town-shop-buy'){if(Town.shopInTown(state,id)){save();updateHUD();showTownProject('shop');toast(`Bought ${Town.TOWN_SHOP_OFFERS[id].name}.`);}}
  else if(a==='town-home-decor'){if(Town.decorateHome(state,b.dataset.home,id)){refreshTown();showTownProject(b.dataset.home);toast(`${Town.HOME_DECORATIONS[id].name} added to the home.`);}}
  else if(a==='pc-place'){const place=destinations(state,G.SITES).find(item=>item.id===id);if(place){setWaypoint(place);showComputer('map');toast(`Marked ${place.name} on the map.`);}}
  else if(a==='computer-decor'){const floor=Number(b.dataset.floor),slot=Number(b.dataset.slot);if(H.customizeComputerRoom(state,floor,slot,b.dataset.kind,id)){changeZone();showComputerRoom(floor,slot);}}
  else if(a==='respawn-bike'){if(world.respawnBike(id)){save();refreshMapContent();toast(`${id==='bike_extra'?'Spare bicycle':'Bicycle'} returned to Shelter 07.`);}else toast('No clear parking space at Shelter 07, or you are riding that bicycle.','warn');}
  else if(a==='map-centre')centreMap();else if(a==='map-clear'){state.field.waypoint=null;save();refreshMapContent();updateHUD();}else if(a==='map-destination'){const d=destinations(state,G.SITES).find(d=>d.id===id);if(d)setWaypoint(d);}else if(a==='controls')showControls();else if(a==='map')showMap();else if(a==='map-zoom-in'){mapZoom=Math.min(4,mapZoom+.5);refreshMapZoom();}else if(a==='map-zoom-out'){mapZoom=Math.max(1,mapZoom-.5);refreshMapZoom();}else if(a==='map-reset'){mapZoom=1;mapPanX=0;mapPanY=0;refreshMapZoom();}else if(a==='interact')interact();else if(a==='shoot'){if(!paused())world.shoot();}else if(a==='reload'){if(!paused())world.beginReload();}
  else if(a==='torch'){state.field.flashlight=!state.field.flashlight;if(modal==='inventory')showInventory();}
  else if(a==='equip'){F.setWeapon(state,id);world.equip(state.field.equipped);showInventory();save();}
  else if(a==='medicine'){if(G.useMedicine(state)){audio.play('loaded');toast('Medical kit used.');save();}showInventory();}
  else if(a==='radmed'){if(G.useRadMedicine(state)){audio.play('loaded');toast('Rad-Clear used. Radiation removed.');save();}showInventory();}
  else if(a==='eat'){G.eat(state);showInventory();save();}
  else if(a==='sound'){state.field.settings.sound=!state.field.settings.sound;audio.start();showControls();save();}
  else if(a==='bob'){state.field.settings.bob=!state.field.settings.bob;showControls();save();}
  else if(a==='build'){if(G.build(state,id)){if(id==='bunks')changeZone();else save();showWorkshop();toast(`${G.UPGRADES[id].name} installed.`);}}
  else if(a==='craft-ammo'){if(F.craftAmmo(state,id)){save();showWorkshop();audio.play('loaded');}}
  else if(a==='craft-flares'){if(G.craftFlares(state)){save();showWorkshop();}}
  else if(a==='event'){if(G.resolveEvent(state,id)){world.setZone(state);save();closeModal();}}
  else if(a==='sleep'){G.nextDay(state);Town.advanceTownDay(state);world.setZone(state);save();if(state.gameOver)gameOver();else{closeModal();toast(`Day ${state.day}. A new shift.${state.pendingEvent?' There is a message at the radio.':''}${state.computer.mail.some(message=>message.day===state.day&&!message.read)?' New email at the computer.':''}`);}}
  else if(a==='invite-radio'){const result=G.inviteByRadio(state);if(result.status==='joined'){world.setZone(state);save();showRadio(`${result.person.name} answered and joined the shelter.`);}else{save();showRadio(result.status==='no-answer'?'No one answered today. Try again tomorrow.':result.status==='full'?'Build bedrooms for more residents.':'You already called today.');}}
  else if(a==='broadcast'){if(G.broadcast(state)){save();showModal('signal','Someone heard you.',`<p class="description">“Shelter 07, we read you. Keep the beacon lit.” The relief network knows you are here. Your journey can continue.</p><button class="primary" data-action="close">Keep surviving →</button>`);}}
  else if(a==='saves'||a==='new-confirm')showSaves(a==='new-confirm'?'Choose an empty slot for a new journey. Your current journey stays saved.':'');
  else if(a==='save-slot'||a==='new-slot')confirmSlot(Number(id),a);
  else if(a==='replace-new'||a==='replace-save')performSlot(Number(id),a==='replace-new'?'new-slot':'save-slot');
  else if(a==='load-slot')performSlot(Number(id),'load-slot');
  else if(a==='respawn'){if(H.respawn(state)){damageTime=0;running=true;changeZone();resume();toast('Rescued. You are safe in the hospital.');}}
  else if(a==='expansion')showExpansion();
  else if(a==='show-floor')showExpansion(Number(b.dataset.floor));
  else if(a==='select-room-slot')showExpansion(Number(b.dataset.floor),Number(b.dataset.slot));
  else if(a==='add-floor'){if(H.addFloor(state)){changeZone();showExpansion(state.shelter.floors);}}
  else if(a==='start-move'){movingRoom={floor:Number(b.dataset.floor),slot:Number(b.dataset.slot)};showExpansion(movingRoom.floor,movingRoom.slot);}
  else if(a==='cancel-move'){movingRoom=null;showExpansion();}
  else if(a==='finish-move'){if(movingRoom&&H.moveRoom(state,movingRoom.floor,movingRoom.slot,Number(b.dataset.floor),Number(b.dataset.slot))){movingRoom=null;changeZone();showExpansion(Number(b.dataset.floor),Number(b.dataset.slot));}else toast('This move is not allowed. Computer rooms need floors 2–9; reactors need floors 8–9.','warn');}
  else if(a==='take-lift'){const floor=Number(b.dataset.floor);if(floor>=1&&floor<=state.shelter.floors){const x=floor===1?-8.4:-35.7,z=floor===1?-7.3:0;world.player.position.set(x,(floor-1)*H.FLOOR_HEIGHT,z);state.position={x,y:world.player.position.y,z};world.velocityY=0;world.syncCamera(0);save();closeModal();toast(`Floor ${floor}.`);}}
  else if(a==='workshop')showWorkshop();
  else if(a==='build-room'){const floor=Number(b.dataset.floor),slot=Number(b.dataset.slot);if(H.buildRoom(state,id,floor,slot)){changeZone();showExpansion(floor,slot);}}
  else if(a==='room-service'){const floor=Number(b.dataset.floor),slot=Number(b.dataset.slot);if(H.useRoom(state,id,floor,slot)){save();showRoom(id,floor,slot);}}

});
document.addEventListener('input',e=>{if(e.target.id==='sensitivity'){state.field.settings.sensitivity=Number(e.target.value);save();}});
window.addEventListener('keydown',e=>{
  if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
  if(modal==='map'&&['Enter','Space'].includes(e.code)&&e.target.dataset.destination){e.preventDefault();const d=destinations(state,G.SITES).find(d=>d.id===e.target.dataset.destination);if(d)setWaypoint(d);return;}
  if(['Space','Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();
  if(e.code==='Tab'&&modal){const items=[...$('modal-root').querySelectorAll('button:not(:disabled),input,summary,[tabindex="0"]')].filter(e=>e.getClientRects().length);const i=items.indexOf(document.activeElement);items[(i+(e.shiftKey?-1:1)+items.length)%items.length]?.focus();return;}
  if(e.repeat)return;
  if(e.code==='Escape'){if(modal)closeModal();else pause();return;}
  if(e.code==='KeyM'&&modal==='map'){closeModal();return;}
  if(e.code==='KeyI'&&modal==='inventory'){closeModal();return;}if(e.code==='KeyJ'&&modal==='journal'){closeModal();return;}
  if(paused())return;
  if(e.code==='KeyI'||e.code==='Tab')showInventory();else if(e.code==='KeyJ')showJournal();else if(e.code==='KeyM')showMap();else if(e.code==='KeyE')interact();else if(e.code==='KeyR')world.beginReload();
  else if(e.code==='KeyF'){state.field.flashlight=!state.field.flashlight;audio.play('empty');}
  
  else if(e.code==='KeyG'){if(state.zone==='wasteland'&&state.flares){state.flares--;world.flare();toast('Flare lit. Creatures are fleeing.');save();}}
  else if(e.code==='KeyH'){hud=!hud;updateHUD();}
  else if(['Digit1','Digit2','Digit3'].includes(e.code)){const id={Digit1:'pistol',Digit2:'rifle',Digit3:'pipe'}[e.code];if(F.setWeapon(state,id))world.equip(id);else toast('Find the rifle at the Military Checkpoint.');}
  else {keys.add(e.code);if(task&&['KeyW','KeyA','KeyS','KeyD','Space'].includes(e.code))cancelTask();}
});
window.addEventListener('keyup',e=>keys.delete(e.code));
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&running&&!modal&&!dragMode&&!coarse)pause();});
document.addEventListener('mousemove',e=>{if(!paused()&&(document.pointerLockElement===world.canvas||dragging))world.look(e.movementX,e.movementY);});
document.addEventListener('mouseup',e=>{if(e.button===0)keys.delete('Mouse0');if(e.button===2){dragging=false;aiming=false;}});
window.addEventListener('blur',()=>{keys.clear();if(running&&!modal)pause();});document.addEventListener('visibilitychange',()=>{keys.clear();if(document.hidden)save();});window.addEventListener('pagehide',save);
document.querySelectorAll('[data-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(!paused())keys.add(b.dataset.key);});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>keys.delete(b.dataset.key));});
let touchLook=null;$('touch-look').addEventListener('pointerdown',e=>{e.preventDefault();e.target.setPointerCapture(e.pointerId);touchLook={x:e.clientX,y:e.clientY};});$('touch-look').addEventListener('pointermove',e=>{if(touchLook&&!paused()){world.look((e.clientX-touchLook.x)*2,(e.clientY-touchLook.y)*2);touchLook={x:e.clientX,y:e.clientY};}});for(const ev of ['pointerup','pointercancel'])$('touch-look').addEventListener(ev,()=>touchLook=null);

const audio={ctx:null,master:null,wind:null,start(){
  if(!this.ctx){try{this.ctx=new AudioContext();this.master=this.ctx.createGain();this.master.connect(this.ctx.destination);const data=this.ctx.createBuffer(1,this.ctx.sampleRate*2,this.ctx.sampleRate),a=data.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;const source=this.ctx.createBufferSource();source.buffer=data;source.loop=true;const filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=340;this.wind=this.ctx.createGain();this.wind.gain.value=.045;source.connect(filter).connect(this.wind).connect(this.master);source.start();}catch{return;}}
  this.ctx.resume();this.master.gain.value=state.field.settings.sound?.4:0;
},play(kind){
  if(!this.ctx||!state.field.settings.sound)return;const c=this.ctx,now=c.currentTime,g=c.createGain();g.connect(this.master);
  const noise=['shot','enemyshot','step','thunder','hurt','growl','swing','work','door','flare'].includes(kind),duration=kind==='thunder'?1.4:kind==='door'?.6:kind==='shot'?.13:kind==='step'?.09:.18;
  g.gain.setValueAtTime(kind==='shot'?.7:kind==='thunder'?.45:kind==='step'?.1:.12,now);g.gain.exponentialRampToValueAtTime(.001,now+duration);
  if(noise){const buffer=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),a=buffer.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;const n=c.createBufferSource(),f=c.createBiquadFilter();n.buffer=buffer;f.type='lowpass';f.frequency.value=kind==='shot'?2600:kind==='thunder'?180:kind==='step'?400:800;n.connect(f).connect(g);n.start();n.onended=()=>{n.disconnect();f.disconnect();g.disconnect();};}
  else{const o=c.createOscillator();o.frequency.setValueAtTime(kind==='loaded'?420:kind==='reload'?140:kind==='geiger'?1700:220,now);o.frequency.exponentialRampToValueAtTime(80,now+duration);o.connect(g);o.start();o.stop(now+duration);o.onended=()=>{o.disconnect();g.disconnect();};}
},update(){if(this.wind)this.wind.gain.value=state.zone==='shelter'?.018:state.weather==='Radstorm'?.13:state.weather==='Fog'?.028:.05;}};

function frame(now){
  requestAnimationFrame(frame);const dt=Math.min((now-last)/1000||.016,.05);last=now;if(loading)return;
  if(!paused()){
    elapsed+=dt;const weather=state.weather,day=state.day;F.advance(state,dt,world.environment());const daylight=Town.isTownDaylight(state);if(day!==state.day||daylight!==lastTownDaylight)world.refreshStarrySands?.();lastTownDaylight=daylight;if(weather!==state.weather)toast(state.weather==='Radstorm'?'Radstorm incoming. Get inside and stay away from exposed streets.':`${state.weather} is moving across Starry Sands.`,state.weather==='Radstorm'?'warn':'info');
    if(task){task.elapsed+=dt;if(world.player.position.distanceTo(task.origin)>.4)cancelTask();else{$('action-progress').innerHTML=`<span>${task.kind==='job'?F.JOBS[task.target.id].verb:'Searching the cache'}…</span><i><b style="width:${task.elapsed/task.duration*100}%"></b></i><small>Move to cancel</small>`;if(task.elapsed>=task.duration)finishTask();}}
    if(keys.has('Mouse0')&&state.field.equipped==='rifle')world.shoot();
    if(state.radiation>20&&Math.random()<dt*(state.radiation/18))audio.play('geiger');if(state.gameOver)gameOver();
  }
  world.camera.fov+=(aiming&&!paused()?55-world.camera.fov:76-world.camera.fov)*Math.min(1,dt*10);world.camera.updateProjectionMatrix();avatars?.update(dt,state.zone);world.update(dt,elapsed,keys,paused());
  if(online){presenceTimer+=dt;if(presenceTimer>1){online.publishPosition(state.zone,world.player.position,state.field.yaw);presenceTimer=0;}}
  damageTime=Math.max(0,damageTime-dt);hitTime=Math.max(0,hitTime-dt);$('damage').style.opacity=String(Math.max(damageTime,state.health<25?.15:0));$('hitmarker').style.opacity=hitTime>0?'1':'0';
  uiTimer+=dt;saveTimer+=dt;if(uiTimer>.12){updateHUD();audio.update();uiTimer=0;}if(saveTimer>5){save();saveTimer=0;}
}
async function init(){
  try{
    world=new World($('game'),{toast,sound:k=>audio.play(k),damage,hit:()=>{hitTime=.15;},crew:p=>{G.log(state,`${p.name} finished a shift: ${p.role==='Engineer'?'generator maintained and scrap sorted':p.role==='Botanist'?'grow beds tended and provisions prepared':'supplies checked'}.`,'good');}});
    await world.load(p=>$('loading-fill').style.width=`${p*100}%`);world.setZone(state);loading=false;$('loading').classList.add('hidden');
    world.canvas.addEventListener('contextmenu',e=>e.preventDefault());world.canvas.addEventListener('mousedown',e=>{if(paused())return;if(e.button===2){dragging=dragMode;aiming=!dragMode;}if(e.button===0&&!dragging){keys.add('Mouse0');const result=world.shoot();if(result?.empty)toast('Magazine empty. Press R to reload.');}});
    if(state.gameOver)gameOver();else showMenu();requestAnimationFrame(frame);
  }catch(error){
    console.error('Afterlight failed to start',error);
    const detail=error instanceof Error?error.message:String(error);
    $('loading-text').textContent=detail.includes('Could not load model')
      ?`${detail} Start the Vite development server from this project folder and reload.`
      :/WebGL|context|renderer/i.test(detail)
        ?'WebGL could not start. Enable hardware acceleration in your browser and reload.'
        :`The 3D world could not start: ${detail}`;
  }
}
if(import.meta.env.DEV)window.__afterlight={get state(){return state;},get world(){return world;},get paused(){return paused();},get task(){return task;},actions:{...G,...F,...H,...Town},setState(s){cancelTask();modal=null;$('modal-root').replaceChildren();state=F.restoreCampaign(s)||F.newCampaign();world.setZone(state);updateHUD();},resumeForTest(){running=true;dragMode=true;$('menu').classList.add('hidden');modal=null;$('modal-root').replaceChildren();},interact,showInventory,showJournal,showSaves,showExpansion,showTownPlanning,damage,refresh:changeZone};
init();
