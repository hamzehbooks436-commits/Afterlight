"""Four explorable abandoned buildings, authored/exported in live Blender MCP."""
import importlib.util
import json
import os
from mathutils import Quaternion

ROOT = r'C:\Users\hamze\Home\Desktop\Folder_1\Post-Nuclear war game'
spec = importlib.util.spec_from_file_location('afterlight_wasteland_helpers', os.path.join(ROOT, 'tools', 'create_wasteland.py'))
kit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(kit)
bpy = kit.bpy
box, beam, mesh = kit.box, kit.beam, kit.mesh


def door_front(width=2.8, half=6, height=3.4, material='plaster'):
    side = (half * 2 - width) / 2
    for x in (-(width + side) / 2, (width + side) / 2):
        box('WALL_front_pier', (x, height / 2, 5), (side, height, .4), material)
    box('WALL_front_lintel', (0, height - .3, 5), (width, .6, .4), material)


def open_shell(name, material='plaster'):
    kit.start(name)
    box('FLOOR_ground', (0, -.12, 0), (12, .24, 10), 'concrete')
    door_front(material=material)
    box('WALL_back', (0, 1.7, -5), (12, 3.4, .4), material)
    for x in (-6, 6):
        box('WALL_side', (x, 1.7, 0), (.4, 3.4, 10), material)


def rowhouse():
    open_shell('ruin_rowhouse', 'brick')
    # Narrow upper storey, broken roofline, front balconies and painted doorway.
    box('FLOOR_upper', (0, 3.45, -1), (12, .25, 8), 'concrete')
    for x in (-6, 6):
        box('WALL_upper_side', (x, 5.05, -1), (.4, 3.1, 8), 'brick')
    box('WALL_upper_back', (0, 5.05, -5), (12, 3.1, .4), 'brick')
    for x in (-4.5, 0, 4.5):
        box('WALL_upper_pier', (x, 5.05, 3), (2.0, 3.1, .35), 'plaster')
        box('balcony_slab', (x, 3.47, 3.8), (2.3, .18, 1.9), 'concrete')
        for side in (-1, 1):
            beam('balcony_rail', (x + side, 3.6, 4.65), (x + side, 4.35, 4.65), .045, 'rust')
        beam('balcony_top', (x - 1, 4.35, 4.65), (x + 1, 4.35, 4.65), .045, 'rust')
    box('roof_remnant', (-3, 6.75, -3), (6, .28, 4), 'concrete')
    beam('exposed_rebar', (2, 6.7, -4), (3.7, 7.4, -2), .05, 'rust')
    box('painted_door', (-4.3, 1.15, 5.24), (1.1, 2.3, .12), 'red')
    box('interior_cupboard', (3.8, .8, -3.8), (2.2, 1.6, .75), 'wood')
    kit.export()


def warehouse():
    open_shell('ruin_warehouse', 'steel')
    # Sawtooth industrial roof and open loading bay make a very different skyline.
    for x in (-5.7, -2.8, .2, 3.2, 5.7):
        beam('roof_truss', (x, 3.4, -4.8), (x, 5.9, 0), .11, 'rust')
        beam('roof_truss', (x, 5.9, 0), (x, 3.7, 4.7), .11, 'rust')
    for x in (-3.8, 3.8):
        box('roof_sheet', (x, 5.15, -2.3), (3.1, .16, 4), 'steel')
    box('loading_ramp', (0, .22, 6.1), (4.6, .44, 2), 'concrete')
    for x in (-5.2, 5.2):
        box('WALL_pillar', (x, 2.5, 4.9), (.75, 5, .75), 'brick')
        box('warehouse_window', (x, 3.7, 1), (.12, 1.1, 2.4), 'black')
    for x in (-3.7, .3, 3.7):
        box('steel_crate', (x, .65, -3.4), (1.6, 1.3, 1.3), 'rust')
    box('gantry', (0, 4.5, -2.4), (10, .18, .35), 'steel')
    beam('hanging_chain', (1, 4.5, -2.4), (1, 2.7, -2.4), .04, 'rust')
    kit.export()


def clinic():
    open_shell('ruin_clinic', 'plaster')
    # Low medical wing, flat canopy, intact treatment partition and rooftop tank.
    box('roof_remnant', (-2, 3.7, -3.4), (8, .25, 3), 'concrete')
    box('entry_canopy', (0, 3.15, 6), (5.3, .2, 2.5), 'concrete')
    for x in (-2.4, 2.4):
        box('canopy_post', (x, 1.5, 7), (.16, 3, .16), 'steel')
    box('WALL_exam_partition', (2.2, 1.5, -3), (.24, 3, 3.6), 'plaster')
    box('exam_bed', (4, .65, -3.5), (1.4, .3, 2.4), 'steel')
    box('exam_mattress', (4, .85, -3.5), (1.3, .16, 2.2), 'cloth')
    box('medicine_shelf', (-4.5, 1.5, -4.45), (2.1, 2.8, .45), 'steel')
    for y in (.6, 1.3, 2.0, 2.7):
        box('shelf_board', (-4.5, y, -4.1), (2.2, .08, .6), 'rust')
    box('roof_tank', (-3.6, 4.5, -3.5), (1.6, 1.4, 1.6), 'rust')
    box('red_cross_vertical', (0, 3.45, 5.18), (.2, .55, .05), 'red')
    box('red_cross_horizontal', (0, 3.45, 5.2), (.55, .2, .05), 'red')
    kit.export()


def fuel_station():
    open_shell('ruin_fuel_station', 'brick')
    # Garage and forecourt with a large, damaged canopy and two rusted pumps.
    box('roof_remnant', (0, 3.55, -2), (12, .28, 5.7), 'concrete')
    for x in (-5.1, 5.1):
        box('canopy_post', (x, 2.25, 8.2), (.32, 4.5, .32), 'steel')
    box('canopy', (0, 4.6, 8), (12.8, .28, 7.2), 'red')
    box('canopy_trim', (0, 4.38, 11.5), (12.8, .26, .18), 'rust')
    for x in (-3.2, 3.2):
        box('pump_base', (x, .18, 8.5), (1.2, .35, 1.4), 'concrete')
        box('pump_casing', (x, 1.1, 8.5), (.8, 1.55, .65), 'red')
        box('pump_face', (x, 1.55, 8.86), (.5, .4, .06), 'black')
        beam('fuel_hose', (x + .36, 1.3, 8.7), (x + .9, .3, 8.75), .045, 'black')
    box('garage_workbench', (-4.2, .65, -3.6), (2.4, 1.3, .8), 'wood')
    box('tyre_stack', (4.2, .58, -3.6), (1.1, 1.16, 1.1), 'black')
    kit.export()


for build in (rowhouse, warehouse, clinic, fuel_station):
    build()

for i, asset in enumerate(kit.assets):
    asset.location = (i * 20, 0, 0)
for area in bpy.context.screen.areas:
    if area.type == 'VIEW_3D':
        area.spaces.active.region_3d.view_distance = 75
        area.spaces.active.region_3d.view_location = (30, 0, 3)
        area.spaces.active.region_3d.view_rotation = Quaternion((.86, .4, .15, .26)).normalized()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'art', 'afterlight-abandoned-buildings.blend'))
with open(os.path.join(ROOT, 'public', 'models', 'abandoned-buildings-manifest.json'), 'w') as handle:
    json.dump({'authoring': 'Original abandoned buildings created through live Blender MCP', 'blender': bpy.app.version_string, 'assets': [a.name + '.glb' for a in kit.assets]}, handle, indent=2)
print('ABANDONED BUILDINGS', [a.name for a in kit.assets])
