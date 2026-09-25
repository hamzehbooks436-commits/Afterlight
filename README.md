# Afterlight — The world left behind

A **first-person survival game** set in a ruined nuclear exclusion zone. Play a local journey offline or invite up to three friends to a shared Shelter 07 room.

## Play

```powershell
npm install
npm run dev
```

Open **http://127.0.0.1:5173/**, or double-click `Start Afterlight.cmd`. Click **Enter Shelter 07** or **Continue surviving** to capture the mouse. Requires Node.js 20.19+ and a browser with WebGL 2. Chrome and Edge are supported. All models and fonts load locally. The local journey and its save slots remain playable without an internet connection.

## Online co-op

Open the pause menu and choose **Play online**. Enter a name and create a room, then share its 20-character invite code. Up to three friends can enter the same code to join. Players see each other in the 3D world. Shelter supplies, rooms, residents, searched caches and Starry Sands progress sync through Firebase. Each player has their own position, health, backpack and controls. Shared supply changes are merged as amounts so two finds do not overwrite each other. Simultaneous structural edits to the same room or town item can still conflict; coordinate those changes with the group.

The current local journey is saved before going online. Online room progress is separate from the five offline save slots. **Leave room** returns to the offline journey. If the connection drops, leave the room and rejoin with the same code after reconnecting. Keep the code among trusted friends: anyone with it can join and change shared progress. Anonymous guest accounts are tied to browser storage; clearing that storage creates a new player identity.

## The district

- A 290 × 290 metre exploration area with 24 enterable ruined buildings and 12 named supply locations.
- Two-storey apartments with real door openings, interior partitions, window bays, 18-step staircases and upper-floor caches. Shops and clinics have searchable interiors.
- A collapsed highway, hollow tower shells, burned vehicles, exposed structural steel, scattered masonry, dead trees, smoke and an irradiated impact basin.
- A continuous six-minute day: moving sunlight and shadows, dusk, moonlight, stars and a usable flashlight. Natural midnight consumes shelter supplies but does not give free sleep benefits.
- Clear skies, dust haze, dense fog and radstorms. Storms increase radiation, carry ash across the streets and produce flashes and thunder. Indoor shelter cuts ambient radiation exposure by 90%; the sealed suit halves it again. The impact basin remains hazardous.
- Mutated hounds, heavier irradiated creatures and armed raiders. Solid walls block attacks and gunfire. Defeated enemies remain absent for three in-game days, including after returning home or loading a save.

## Equipment and scavenging

Start with a salvaged pistol and a melee pipe. Recover the service rifle from the Military Checkpoint. Weapons have individual magazines, reserve ammunition, reload times, recoil and damage. A reload completes only after its animation; switching weapons cancels it. Flares make nearby creatures flee.

Physically enter a supply location, look toward its cache and press **E**. Searching takes time; moving or taking damage cancels it. Caches refresh after three days. Ammunition is recovered alongside supplies. Upstairs caches require going upstairs.

Your backpack holds 18 supply units, or 28 with an upgrade. Departing automatically transfers up to 1 food, 2 water and 1 medicine from the shelter into the pack. Medical kits and rations used outside come from the **carried pack**. Returning through the shelter door unloads supplies. Weapons and ammunition have separate slots.

## Life inside Shelter 07

Shelter 07 has a reception area, lift and open room bays on each completed floor. Use the **Shelter expansion plans** beside the radio to choose which room belongs in each bay. The hospital, kitchen, bedrooms and workshop are furnished on floor 1 at the start and can be moved or swapped. Additional room types and floors cost scavenged resources. Empty bays remain accessible.

Use each room control with **E**. Hospital treatment heals and clears radiation; the garden grows food, kitchen cooks, bedrooms restore energy and morale, workshop recovers scrap, water filter room produces clean water, storage sorts supplies, gym restores energy and morale, and the reactor produces fuel. A room shift is limited to once per in-game day. Hospital treatment remains available when needed.

**Death is recoverable.** Choose **Respawn at Shelter 07** to return to the hospital with full health and energy, even after reloading a dead save. Rescues are unlimited. Carried supplies are lost; weapons, ammunition, shelter stockpiles, residents, rooms and campaign progress remain.

Rafi maintains the generator and repairs tools. June tends grow beds, prepares provisions and carries supplies. Recruited residents also have work routes. Residents walk around obstacles, animate their work and carry crates between stations. Each resident can complete three productive shifts per day, with saved limits on rewards.

The player has five physical duties, available once per day:

| Station | Work and result |
| --- | --- |
| Generator | 2 scrap → 1 fuel and +15 shelter condition |
| Water filter | 1 scrap → 5 water |
| Grow beds | 2 water → 4 food |
| Salvage pile | Sort damaged crates → 4 scrap |
| Mess table | 2 food + 1 water → +45 energy and +10 health |

Walk to the workbench to craft ammunition, flares, and shelter upgrades. Use the bunks to sleep until morning. Radio decisions wait at the receiver so they do not interrupt exploration. The duty roster and field journal show objectives and jobs. Survive to day 14, repair the radio twice, then transmit to the relief network. Play can continue afterward.

## Rebuilding Starry Sands

Walk out of Shelter 07 to the Starry Sands planning board, or approach a marked building lot and press **E**. Thirteen lots can be repaired and expanded: homes, a hospital, shops, a school, two farms, a power plant, waterworks, a workshop, a community hall, and the reactor grid link. Repaired buildings replace the ruins in the world. Expanded buildings gain more outdoor equipment. Each repaired home can also have its own porch garden, seating, solar porch, or fenced yard. Twelve public decoration plots accept benches, lamps, planters, trees, fences, solar arrays, a playground, wells, market stalls, greenhouses, signs, and watch posts.

Bring supplies in your backpack and deliver them to town stores. Repaired homes provide beds for new residents; assign people to a home and a job so farms, waterworks, shops, and other services can operate. Residents walk between their homes and workplaces. Town food and water are consumed each day. The staffed hospital can treat you when it has medicine, clean water, and power; stored Rad-Clear can remove all radiation. A staffed, powered shop sells town goods for carried scrap when you visit it.

The town power plant uses fuel, solar arrays provide daylight power, and an upgraded link can carry more power from Shelter 07's nuclear reactors. From Shelter 07, the radio and the **Starry Sands** computer app can coordinate supply shipments, review the grid, and manage town projects and residents. Town progress is stored with each save slot.

## Controls

| Action | Control |
| --- | --- |
| Move / sprint | WASD / Shift |
| Look / aim | Mouse / right mouse button |
| Fire or swing | Left mouse button; hold for rifle fire |
| Jump / crouch | Space / C or Ctrl |
| Interact / start work | E |
| Backpack | I or Tab |
| Map, objectives and duty roster | J |
| Pistol / rifle / melee pipe | 1 / 2 / 3 |
| Reload | R |
| Flashlight / flare | F / G |
| Use medicine | M |
| Hide the HUD and interaction prompts | H |
| Pause / close a panel | Esc |

If mouse capture is unavailable, hold right mouse to look or use the arrow keys. Touch devices get movement buttons, a right-side drag area for looking, and interact, fire, jump, backpack, reload and light buttons. Keyboard and mouse provide the full control set. Sound, look sensitivity and head motion can be adjusted in **Controls & settings**.

## Saves

Open **Esc → Save slots** for five independent offline journeys. The active slot saves to this browser's `localStorage` every five seconds and after important actions. **Save a copy** creates a separate checkpoint and makes that slot active; the previous slot stays available. **New journey** lets you choose a slot, and replacing an occupied slot asks for confirmation. **Load slot** saves the current journey before switching. Each slot displays its day, location, health and saved time. Saves belong to the local URL; clearing browser storage removes them.

The previous single autosave is imported into slot 1 automatically. Its original browser-storage entry is retained as a migration backup.

Original overhead-game saves migrate automatically: shelter supplies, residents, upgrades, days and searched locations are retained; old map coordinates are moved to a safe spawn. The old source files are also preserved in `art/*-overhead.backup.*`.

## Blender MCP assets

The shelter expansion adds four original assets made in live Blender through **Blender MCP**: `shelter_room`, `hospital_bed`, `hydroponic_rack` and `kitchen_range`. The room kit includes physical walls and doorway, tiled flooring, structural ribs, pipes and emissive ceiling strips. Hospital equipment includes monitors and IV stands; the farm has two-tier plant racks; the kitchen includes burners, cookware and a sink. Materials use concrete bump detail; the current shelter uses warm amber fixtures across its floors.

- `art/afterlight-shelter.blend` — editable shelter asset scene.
- `tools/create_shelter.py` — reproducible asset authoring script.
- `public/models/shelter-manifest.json` — shelter asset list and provenance.

The seven new assets were created in the running Blender instance through **Blender MCP**, exported as self-contained GLBs and used in the actual game:

`ruin_tenement`, `ruin_store`, `scavenger_pistol`, `service_rifle`, `scrap_pipe`, `rubble_cluster`, `fallout_barrel`.

- `art/afterlight-wasteland.blend` — editable Fallout Kit, with the previous workshop preserved.
- `tools/create_wasteland.py` — source for the Blender asset kit.
- `public/models/wasteland-manifest.json` — asset provenance and Blender version.
- `art/afterlight-models.blend` and `public/models/manifest.json` — original 13-asset collection, retained.

Named Blender wall and floor meshes generate physical collision surfaces in Three.js. Rendering batches static meshes by material and district cell; scattered rubble uses instancing. Characters retain movable limb pivots.

## Validation

```powershell
npm test
npm run build
# With npm run dev already serving on port 5173:
npm run test:browser
npm run test:expansion
```

The browser test uses installed Chrome in headless mode. Set `BROWSER_CHANNEL=msedge` to use Edge. It checks actual input, entering buildings, climbing Blender stairs, searching caches, gunfire and cover, reloads, returning home, player duties, NPC work, weather, saves and touch layouts. Screenshots and the browser report are written to `art/qa/`.

Earlier versions were checked with unit and browser suites. The latest multi-floor shelter, raider and resident changes have not been tested or built, as requested.

Production files are in `dist/`. Run `npm run preview` to serve them at **http://127.0.0.1:4173/**. Open through an HTTP server, not `file://`. The development-only `window.__afterlight` test interface is omitted from production builds.

## Source

| File | Purpose |
| --- | --- |
| `src/world.js` | First-person rendering, Blender geometry, weather, enemies and residents |
| `src/physics.js` | Capsule movement, stairs, collision, visibility and NPC pathfinding |
| `src/field.js` | Weapons, carried supplies, weather, base duties, crew rewards and migration |
| `src/state.js` | Original survival economy, upgrades, events, recruitment and ending |
| `src/main.js` | Controls, backpack, interaction tasks, audio and saving |
| `src/style.css` | Full-screen game, minimal HUD and on-demand panels |

## Local navigation and courier bicycle

The north-up minimap follows you through a 240 × 180 metre area, with nearby building footprints, roads, supply caches, shelter and parked bicycle. M opens/closes the full archipelago map. Scroll or use +/− to zoom, drag to pan, and use Centre on me to locate yourself. Click land, a marker, or a destination in the collapsible list to set a saved waypoint. The dashed line and distance indicate the direct bearing, not a traversable road route. The minimap keeps distant destinations at its edge. Clear marker removes the waypoint; the percentage button resets zoom and pan. Cache status includes the next resupply day.

A courier bicycle is parked three metres east of the departure position outside Shelter 07. Look at it and press E to mount. W pedals, A/D steer, S or Space brakes, and E brakes and dismounts. Mouse look remains independent of steering. Speed reaches 50 km/h on roads and 29 km/h off road; coasting slows naturally. The wheelbase collides with walls and cannot enter open water. Dismounting chooses a clear side. The bike stays where parked across shelter visits, death/rescue, save-slot changes and reloads; reload resumes on foot. Weapons are unavailable while riding. Touch movement arrows and E work with the same controls.

The original bicycle was authored in the live Blender instance using Blender MCP. `art/afterlight-bike.blend` contains the editable scene; `tools/create_bike.py` rebuilds the asset; `public/models/shelter_bike.glb` is the exported game asset with separate wheel pivots. Blender and in-game previews are under `art/qa/`.

Navigation validation: `npm run test:navigation` covers actual browser controls, parking persistence, map selection, zoom/pan, HUD visibility and mobile sizing; `npm run test:coast` covers settlement/cache access and bridge connectivity. Unit tests cover bike collision, water boundaries, safe dismounts, migration and minimap tracking.

## Shelter floors and resident routines

The shelter is now a reception area, lift and central corridor with six open bays per floor. Expansion plans are beside the radio. Select a floor, select a bay, then choose the room type. A built room can be upgraded, moved into an empty bay or swapped with another room. The lift reaches each completed floor; up to nine floors can be built. Reactor rooms can only be placed or swapped into floors 8 and 9. Empty bays remain open and walkable. Existing fixed-wing saves migrate their rooms into the new bays.

The room choices are hospital, kitchen, bedrooms, workshop, garden, water filter room, storage room, gym and nuclear reactor. The first floor begins with hospital, kitchen, bedrooms and workshop, leaving two bays for the player's choices. Work controls sit in the appropriate rooms; an engineer works in the workshop, a botanist in the garden, a cook in the kitchen, a medic in the hospital and a scavenger in storage. Workers without their preferred room wait until it is built. At night residents lie in assigned bunks; morning moves them to their work rooms. Extra bedrooms and bunks add actual sleeping places as well as resident capacity. All shelter fixtures use warm amber lighting.

The radio's invitation can be sent once each day. It has an exact 10% chance to bring in an available survivor, provided a bed is free. The original long-range relief broadcast remains available through its existing upgrade and day requirements.

Three Blender-authored raider models carry rifles pointing along their forward direction, and their attack tracer begins at the rifle muzzle. The editable assets are `art/afterlight-raiders.blend` and `art/afterlight-shelter-equipment.blend`; the reproducible Blender MCP scripts are `tools/create_raiders.py` and `tools/create_shelter_equipment.py`.

The changes in this section have not been tested or built, at the user's request.
