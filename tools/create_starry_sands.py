"""Original Starry Sands rebuilding kit, authored and exported in live Blender via MCP.

Run from Blender's Python environment. Game coordinates are X east, Y up, Z south;
the helpers convert them to Blender's Z-up coordinates. Building entrances face +Z.
"""
import bpy
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(r'C:\Users\hamze\Home\Desktop\Folder_1\Post-Nuclear war game')
OUT = ROOT / 'public' / 'models'
OUT.mkdir(parents=True, exist_ok=True)

scene = bpy.data.scenes.get('Starry Sands / Rebuilding Kit')
if scene is None:
    scene = bpy.data.scenes.new('Starry Sands / Rebuilding Kit')
bpy.context.window.scene = scene
for obj in list(scene.objects):
    bpy.data.objects.remove(obj, do_unlink=True)


def material(name, rgb, metallic=0, roughness=.78, glow=0):
    key = 'Starry Sands / ' + name
    mat = bpy.data.materials.get(key) or bpy.data.materials.new(key)
    mat.use_nodes = True
    shader = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    shader.inputs['Base Color'].default_value = (*rgb, 1)
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = roughness
    if glow:
        shader.inputs['Emission Color'].default_value = (*rgb, 1)
        shader.inputs['Emission Strength'].default_value = glow
    mat.diffuse_color = (*rgb, 1)
    return mat


stone = material('sunwashed plaster', (.58, .54, .44))
cream = material('repaired cream walls', (.80, .76, .64))
concrete = material('reclaimed concrete', (.38, .41, .39))
steel = material('reclaimed steel', (.30, .34, .33), .55)
dark = material('dark window frames', (.11, .17, .18), .4)
wood = material('oiled salvaged timber', (.44, .29, .17))
rust = material('old oxidised sheet metal', (.47, .24, .15), .36)
blue = material('coastal blue paint', (.18, .42, .49), .2)
teal = material('hospital teal', (.22, .52, .48))
red = material('clinic red', (.72, .14, .12))
yellow = material('safety yellow', (.90, .66, .22))
white = material('clean enamel', (.88, .88, .79), .06)
glass = material('recycled blue glass', (.15, .32, .37), .16, .24)
green = material('garden leaves', (.24, .48, .26))
deep_green = material('olive leaves', (.16, .33, .20))
soil = material('rich farm soil', (.26, .19, .13))
sand = material('sandstone trim', (.72, .62, .43))
water = material('well water', (.11, .38, .49), .25, .2)
light = material('warm electric light', (1.0, .72, .35), .03, .35, 2)
electric = material('reactor blue light', (.17, .69, .83), .05, .26, 2.4)
cloth = material('washed woven cloth', (.60, .43, .29))


def root(name):
    obj = bpy.data.objects.new(name, None)
    scene.collection.objects.link(obj)
    obj['authoring'] = 'Original Starry Sands rebuild asset made in Blender MCP'
    return obj


def mesh_obj(parent, name, points, faces, mat):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(points, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    obj.parent = parent
    mesh.materials.append(mat)
    return obj


def xyz(p):
    return (p[0], -p[2], p[1])


def box(parent, name, pos, size, mat):
    x, y, z = pos
    w, h, d = size
    points = [xyz((x+sx*w/2, y+sy*h/2, z+sz*d/2))
              for sx, sy, sz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),
                                 (-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    return mesh_obj(parent, name, points,
                    [(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)], mat)


def cylinder(parent, name, pos, radius, height, mat, sides=10):
    x, y, z = pos
    pts = [xyz((x+math.cos(2*math.pi*i/sides)*radius, y+dy*height/2,
                z+math.sin(2*math.pi*i/sides)*radius))
           for dy in (-1,1) for i in range(sides)]
    faces = [tuple(reversed(range(sides))), tuple(range(sides, 2*sides))]
    faces += [(i,(i+1)%sides,(i+1)%sides+sides,i+sides) for i in range(sides)]
    return mesh_obj(parent, name, pts, faces, mat)


def beam(parent, name, start, end, radius, mat, sides=8):
    a, b = Vector(xyz(start)), Vector(xyz(end))
    direction = (b-a).normalized()
    side = direction.cross(Vector((0,0,1)))
    if side.length < .05:
        side = direction.cross(Vector((1,0,0)))
    side.normalize()
    up = direction.cross(side).normalized()
    pts = []
    for center in (a,b):
        pts.extend(tuple(center + radius*(math.cos(2*math.pi*i/sides)*side+
                                          math.sin(2*math.pi*i/sides)*up)) for i in range(sides))
    faces = [tuple(reversed(range(sides))), tuple(range(sides,2*sides))]
    faces += [(i,(i+1)%sides,(i+1)%sides+sides,i+sides) for i in range(sides)]
    return mesh_obj(parent, name, pts, faces, mat)


def shell(parent, width, depth, height, wall=cream, roof=blue, opening=2.5):
    box(parent, 'FLOOR_repaired slab', (0,.08,0), (width,.16,depth), concrete)
    box(parent, 'WALL_rear masonry', (0,height/2,-depth/2), (width,height,.2), wall)
    for sign in (-1,1):
        box(parent, 'WALL_side masonry', (sign*width/2,height/2,0), (.22,height,depth), wall)
        reach = (width-opening)/2
        box(parent, 'WALL_entrance pier', (sign*(opening/2+reach/2),height/2,depth/2),
            (reach,height,.23), wall)
        box(parent, 'corner plaster trim', (sign*(width/2-.1),height/2,depth/2+.14),
            (.19,height,.12), sand)
        box(parent, 'side reused window', (sign*(width/2+.13),1.8,-.7),
            (.07,1.0,1.4), glass)
        box(parent, 'side window sill', (sign*(width/2+.15),1.22,-.7),
            (.15,.1,1.65), wood)
    box(parent, 'WALL_door lintel', (0,height-.28,depth/2), (opening,.56,.23), wall)
    box(parent, 'roof deck', (0,height+.09,0), (width+.55,.18,depth+.55), roof)
    for sign in (-1,1):
        box(parent, 'roof edge', (sign*(width/2+.18),height+.26,0), (.17,.23,depth+.65), steel)
    box(parent, 'front rain gutter', (0,height+.19,depth/2+.28), (width+.7,.12,.16), steel)
    box(parent, 'porch landing', (0,.11,depth/2+.85), (opening+1,.18,1.65), wood)


def cross(parent, x, y, z, mat=red):
    box(parent, 'medical cross horizontal', (x,y,z), (1.15,.24,.05), mat)
    box(parent, 'medical cross vertical', (x,y,z+.005), (.24,1.15,.05), mat)


def solar(parent, x, y, z, width=1.8):
    box(parent, 'solar black frame', (x,y,z), (width,.1,1.25), dark)
    box(parent, 'solar blue photovoltaic glass', (x,y+.055,z), (width-.12,.025,1.12), glass)
    for i in (-.25,.25):
        box(parent, 'solar cell line', (x+i*width,y+.07,z), (.035,.01,1.08), steel)
    box(parent, 'solar median', (x,y+.07,z), (width-.1,.01,.03), steel)


def planter(parent, x, z, size=1.4):
    box(parent, 'planter timber sides', (x,.37,z), (size,.63,size*.72), wood)
    box(parent, 'planter topsoil', (x,.71,z), (size-.13,.05,size*.72-.13), soil)
    for dx in (-.34,0,.34):
        beam(parent, 'green shoot stem', (x+dx,.74,z), (x+dx,1.04,z), .035, deep_green, 6)
        box(parent, 'green edible leaf', (x+dx,1.05,z), (.27,.07,.17), green)


def bed(parent, x, z, color=blue):
    box(parent, 'patient or resident cot frame', (x,.5,z), (1.13,.2,2.1), steel)
    box(parent, 'cot mattress', (x,.65,z), (1.03,.14,1.92), white)
    box(parent, 'cot blanket', (x,.75,z+.35), (1.01,.09,1.2), color)
    box(parent, 'cot pillow', (x,.74,z-.72), (.66,.11,.33), cream)
    for sx in (-.47,.47):
        for sz in (-.87,.87):
            box(parent, 'cot leg', (x+sx,.26,z+sz), (.09,.5,.09), steel)


assets = []

home = root('renovated_home'); assets.append(home)
shell(home, 8, 7.5, 3.2, cream, blue)
box(home, 'repaired front door swung open', (-1.35,1.28,4.38), (.08,2.5,1.35), wood)
box(home, 'door window', (-1.29,1.9,4.38), (.025,.52,.55), glass)
box(home, 'window left', (-2.66,1.7,3.89), (1.25,.9,.05), glass)
box(home, 'window right', (2.66,1.7,3.89), (1.25,.9,.05), glass)
for x in (-2.45,2.45):
    box(home, 'window flower box', (x,1.1,4), (1.35,.25,.35), wood)
    box(home, 'flowers and herbs', (x,1.27,4), (1.2,.15,.28), green)
bed(home, -2,-1.4)
box(home, 'family dining table', (1.5,.8,-1.2), (2.0,.15,1.2), wood)
for z in (-2.2,-.2): box(home, 'dining bench', (1.5,.43,z), (1.8,.14,.38), wood)
box(home, 'storage cupboard', (2.75,1,-2.9), (1.0,1.9,.55), blue)
solar(home, 1.8,3.26,-1.2,2)

clinic = root('renovated_clinic'); assets.append(clinic)
shell(clinic, 10.2, 9.3, 3.5, white, teal, 2.8)
box(clinic, 'clinic enamel entrance header', (0,3.0,4.76), (3.2,.42,.09), teal)
cross(clinic, 0,2.9,4.83)
for x in (-3.1,3.1):
    box(clinic, 'clinic front window', (x,1.85,4.79), (1.6,1.35,.06), glass)
    box(clinic, 'clinic privacy sill', (x,1.1,4.85), (1.7,.15,.25), white)
bed(clinic, -3,-2.3,teal)
bed(clinic, 3,-2.3,teal)
box(clinic, 'triage desk', (0,.8,1.6), (2.7,.18,1.1), wood)
box(clinic, 'medical cabinet', (-4,1.1,0), (.8,2.0,1.3), white)
box(clinic, 'medical cabinet', (4,1.1,0), (.8,2.0,1.3), white)
for x in (-2.1,2.1):
    beam(clinic, 'IV stand', (x,.1,-3), (x,2.1,-3), .035, steel)
    box(clinic, 'IV saline bag', (x+.16,1.86,-3), (.18,.35,.11), white)
box(clinic, 'radio medicine monitor', (0,1.28,1.3), (.74,.64,.08), dark)

shop = root('renovated_shop'); assets.append(shop)
shell(shop, 9.7, 8.4, 3.3, stone, rust, 3.2)
box(shop, 'market awning valance', (0,2.65,5.1), (10.3,.2,1.8), cloth)
for x in (-3.4,3.4): beam(shop, 'awning support', (x,.15,5.8), (x,2.7,5.8), .09, steel)
box(shop, 'shop counter', (0,.92,2.5), (6.0,.2,1.25), wood)
for x in (-3.5,3.5):
    box(shop, 'produce crate', (x,.47,1.15), (1.5,.9,1.2), wood)
    box(shop, 'fresh supplies', (x,.96,1.15), (1.25,.14,.9), green if x<0 else yellow)
for z in (-2.7,-1.1):
    box(shop, 'supply shelf', (-3.4,1.35,z), (1.1,.12,1.25), wood)
    box(shop, 'supply shelf', (3.4,1.35,z), (1.1,.12,1.25), wood)
box(shop, 'shop blue shutters', (0,2.8,4.29), (2.6,.42,.08), blue)

school = root('renovated_school'); assets.append(school)
shell(school, 10.5, 9.5, 3.6, cream, blue, 2.9)
box(school, 'classroom fascia', (0,3.08,4.82), (4.5,.42,.08), yellow)
box(school, 'chalkboard', (0,2.05,-4.62), (4.1,1.65,.08), dark)
box(school, 'chalkboard wooden rail', (0,1.18,-4.51), (4.5,.12,.2), wood)
box(school, 'teacher desk', (0,.85,-2.9), (2.3,.18,1.05), wood)
for x in (-3,0,3):
    for z in (-.6,1.35):
        box(school, 'student desk', (x,.77,z), (1.35,.13,.75), wood)
        box(school, 'student desk legs', (x,.39,z), (1.25,.74,.08), steel)
        box(school, 'student stool', (x,.45,z+.8), (.75,.13,.39), blue)
box(school, 'book shelf', (4.12,1.28,-2.8), (.72,2.4,2.25), wood)
for z in (-3.55,-3,-2.45):
    box(school, 'recovered books', (4.1,1.35,z), (.53,.42,.16), red if z<-3.3 else green)
box(school, 'school front window', (-3.3,1.9,4.9), (1.7,1.2,.06), glass)
box(school, 'school front window', (3.3,1.9,4.9), (1.7,1.2,.06), glass)

farm = root('renovated_farm'); assets.append(farm)
box(farm, 'FLOOR_farm walk', (0,.06,0), (11,.12,9.5), sand)
for x in (-4.5,4.5):
    for z in (-3.6,3.6):
        beam(farm, 'greenhouse steel upright', (x,0,z), (x,3.4,z), .09, steel)
        beam(farm, 'greenhouse arch', (x,3.4,z), (0,4.4,z), .07, steel)
for z in (-3.5,3.5):
    beam(farm, 'roof ridge support', (0,4.4,z), (0,4.4,-z), .07, steel)
box(farm, 'shade cloth left', (-2.5,3.7,0), (5.1,.07,8.1), glass)
box(farm, 'shade cloth right', (2.5,3.7,0), (5.1,.07,8.1), glass)
for x in (-3.5,3.5):
    for z in (-2.3,.2,2.7):
        box(farm, 'raised food bed', (x,.43,z), (2.3,.7,1.7), wood)
        box(farm, 'fertile bed soil', (x,.81,z), (2.15,.09,1.55), soil)
        for dx in (-.6,0,.6):
            beam(farm, 'crop stem', (x+dx,.86,z), (x+dx,1.25,z), .03, green, 6)
            box(farm, 'vegetable leaves', (x+dx,1.25,z), (.25,.13,.24), deep_green)
box(farm, 'irrigation tank', (0,.75,-3.3), (1.3,1.5,1.2), blue)
beam(farm, 'irrigation pipe', (0,1,-3.3), (0,1,3.7), .045, steel)

power = root('renovated_power'); assets.append(power)
shell(power, 10.4, 9.2, 3.8, concrete, steel, 3.3)
box(power, 'electrical front fascia', (0,3.25,4.72), (3.8,.45,.08), yellow)
for x in (-3,3):
    box(power, 'switchgear cabinet', (x,1.3,-2.6), (1.75,2.5,1.1), blue)
    box(power, 'electric glowing readout', (x,1.9,-1.99), (1.25,.56,.05), electric)
    for i in (-.4,0,.4):
        cylinder(power, 'switchgear dial', (x+i,1.2,-1.94), .08,.07,yellow)
for x in (-2,2):
    cylinder(power, 'power transformer', (x,1.13,.45), .8,2.2,steel)
    cylinder(power, 'transformer top', (x,2.3,.45), .9,.18,dark)
    beam(power, 'transformer cable', (x,2.2,.45), (x,3.36,-2.4), .095, dark)
box(power, 'battery rack', (0,.8,2.7), (3.2,1.45,.8), dark)
for x in (-1.1,0,1.1): box(power, 'battery face', (x,.9,3.12), (.76,.8,.04), electric)
solar(power, -2.6,3.94,-.5,2.4)
solar(power, 2.6,3.94,-.5,2.4)

pot = root('town_planter'); assets.append(pot)
planter(pot, 0, 0, 2.0)
for x in (-.86,.86): box(pot, 'reclaimed metal corner', (x,.36,0), (.08,.65,1.52), steel)

bench = root('town_bench'); assets.append(bench)
box(bench, 'timber bench seat', (0,.55,0), (2.35,.16,.7), wood)
box(bench, 'timber bench back', (0,1.04,-.31), (2.35,.82,.13), wood)
for x in (-.96,.96):
    box(bench, 'bench supports', (x,.29,0), (.1,.57,.68), steel)
    box(bench, 'bench arms', (x,.82,0), (.12,.1,.72), steel)

lamp = root('town_lamp'); assets.append(lamp)
beam(lamp, 'steel lamp post', (0,0,0), (0,4.2,0), .095, steel)
beam(lamp, 'lamp curved arm', (0,4.05,0), (.7,4.35,.15), .07, steel)
box(lamp, 'warm lantern housing', (.72,4.1,.15), (.5,.48,.48), dark)
box(lamp, 'working lantern pane', (.72,4.1,.4), (.39,.35,.05), light)
box(lamp, 'lamp solar cap', (.37,4.49,.05), (1.12,.08,.64), glass)

sign = root('town_sign'); assets.append(sign)
for x in (-1.55,1.55): beam(sign, 'sign timber post', (x,0,0), (x,2.6,0), .11, wood)
box(sign, 'blank town notice board', (0,2.17,.06), (3.55,.72,.15), blue)
box(sign, 'notice border', (0,2.17,.15), (3.25,.51,.035), cream)
box(sign, 'notice inset', (0,2.17,.18), (3.0,.33,.03), dark)

fence = root('town_fence'); assets.append(fence)
for x in (-1.9,0,1.9):
    beam(fence, 'fence upright', (x,0,0), (x,1.45,0), .085, wood)
    box(fence, 'post cap', (x,1.49,0), (.23,.1,.23), blue)
for y in (.45,1.1): box(fence, 'fence rail', (0,y,0), (4.05,.13,.13), wood)

array = root('town_solar_array'); assets.append(array)
for x in (-1.8,1.8):
    beam(array, 'solar support', (x,0,-.45), (x,2.0,-.45), .085, steel)
    beam(array, 'solar support', (x,0,.55), (x,1.25,.55), .085, steel)
box(array, 'solar frame', (0,1.85,0), (4.6,.12,2.5), dark)
for x in (-1.52,0,1.52): solar(array, x,1.93,0,1.45)
box(array, 'inverter', (0,.5,-1.1), (1.1,.9,.5), blue)
box(array, 'inverter light', (0,.7,-.84), (.26,.11,.03), electric)

link = root('town_reactor_link'); assets.append(link)
box(link, 'reactor distribution foundation', (0,.16,0), (2.8,.32,2.5), concrete)
box(link, 'armoured switch box', (0,1.25,0), (1.75,2.1,1.2), steel)
box(link, 'blue distribution face', (0,1.53,.62), (1.5,.95,.06), blue)
for x in (-.43,0,.43): box(link, 'powered circuit meter', (x,1.58,.66), (.25,.46,.04), electric)
for x in (-.8,.8): beam(link, 'power conduit', (x,.24,-.4), (x,2.1,-.4), .08, dark)
box(link, 'warning stripe', (0,.4,.64), (1.65,.13,.05), yellow)

play = root('town_playground'); assets.append(play)
for x in (-1.8,1.8):
    for z in (-.75,.75): beam(play, 'playground swing frame', (x,0,z), (x,2.8,0), .075, blue)
beam(play, 'swing top beam', (-2,2.75,0), (2,2.75,0), .08, yellow)
for x in (-.95,.95):
    for dx in (-.36,.36): beam(play, 'swing chain', (x+dx,2.67,0), (x+dx,.85,0), .025, steel, 6)
    box(play, 'swing seat', (x,.78,0), (.9,.1,.36), wood)
box(play, 'soft sand under swings', (0,.025,0), (5.1,.05,3.0), sand)

well = root('town_well'); assets.append(well)
cylinder(well, 'well stone ring', (0,.58,0), 1.12,1.12,stone,12)
cylinder(well, 'well inner water', (0,1.16,0), .78,.04,water,12)
for x in (-1.05,1.05): beam(well, 'well canopy post', (x,1.05,0), (x,2.7,0), .09, wood)
box(well, 'well canopy', (0,2.78,0), (2.8,.2,2.25), blue)
beam(well, 'well turning axle', (-1.1,2.05,0), (1.1,2.05,0), .09, wood)
beam(well, 'well bucket rope', (0,2.05,0), (0,1.18,0), .025, cloth, 6)

tree = root('town_street_tree'); assets.append(tree)
beam(tree, 'living tree trunk', (0,0,0), (0,3.8,0), .2, wood)
for x,z in [(-.9,0),(.85,.2),(0,-.8),(0,.9)]:
    beam(tree, 'tree bough', (0,2.75,0), (x,4.1,z), .13, wood)
    cylinder(tree, 'leaf cluster', (x,4.35,z), .85,1.45,green,7)
cylinder(tree, 'central leafy canopy', (0,4.15,0), 1.12,1.9,deep_green,8)
box(tree, 'protected tree pit', (0,.06,0), (2.2,.12,2.2), soil)

stall = root('town_market_stall'); assets.append(stall)
for x in (-1.7,1.7):
    for z in (-1.25,1.25): beam(stall, 'market canopy post', (x,0,z), (x,2.55,z), .08, steel)
box(stall, 'bright patched canopy', (0,2.63,0), (3.8,.12,2.8), cloth)
box(stall, 'barter counter', (0,.82,.15), (3.2,.2,.86), wood)
for x in (-1,0,1): box(stall, 'stock basket', (x,1.04,.1), (.66,.34,.58), green if x<0 else rust)
box(stall, 'storage shelves', (0,.85,-1.05), (3.1,1.6,.44), blue)

greenhouse = root('town_greenhouse'); assets.append(greenhouse)
box(greenhouse, 'FLOOR_greenhouse path', (0,.05,0), (7.5,.1,6.6), sand)
for x in (-3.5,3.5):
    for z in (-3,3): beam(greenhouse, 'greenhouse upright', (x,0,z), (x,3.2,z), .06, steel)
    box(greenhouse, 'greenhouse side glass', (x,2.1,0), (.05,2.2,5.9), glass)
box(greenhouse, 'greenhouse skylight', (0,3.25,0), (7.3,.07,6.3), glass)
for x in (-2.1,2.1):
    for z in (-1.5,1.5): planter(greenhouse,x,z,1.55)

watch = root('town_watch_post'); assets.append(watch)
for x in (-1.55,1.55):
    for z in (-1.4,1.4): beam(watch, 'watchtower leg', (x,0,z), (x,4.8,z), .14, wood)
box(watch, 'FLOOR_watch platform', (0,4.2,0), (3.8,.2,3.5), wood)
for x in (-1.8,1.8): box(watch, 'platform rail', (x,4.94,0), (.11,1.2,3.4), blue)
for z in (-1.6,1.6): box(watch, 'platform rail', (0,4.94,z), (3.6,1.2,.11), blue)
box(watch, 'watch roof', (0,5.7,0), (4.1,.16,3.8), rust)
for i in range(7): box(watch, 'ladder rung', (-1.52,.55+i*.5,1.46), (.95,.075,.09), steel)

tower = root('town_water_tower'); assets.append(tower)
for x in (-1.3,1.3):
    for z in (-1.3,1.3): beam(tower, 'water tower leg', (x,0,z), (x,5.2,z), .11, steel)
box(tower, 'water tower platform', (0,5.3,0), (3.6,.17,3.6), wood)
cylinder(tower, 'clean water reservoir', (0,6.35,0), 1.5,2.1,blue,12)
cylinder(tower, 'reservoir roof', (0,7.45,0), 1.57,.14,steel,12)
beam(tower, 'water feed pipe', (1.7,.1,0), (1.7,6.3,0), .095, dark)
for i in range(10): box(tower, 'access ladder rung', (-1.38,.55+i*.49,1.34), (.76,.07,.08), yellow)


for asset in assets:
    bpy.ops.object.select_all(action='DESELECT')
    asset.select_set(True)
    for child in asset.children_recursive:
        child.select_set(True)
    bpy.context.view_layer.objects.active = asset
    bpy.ops.export_scene.gltf(filepath=str(OUT / (asset.name + '.glb')),
                              use_selection=True, export_animations=False)

for i, asset in enumerate(assets):
    asset.location = xyz(((i % 5) * 17, 0, (i // 5) * 17))

scene.camera = None
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'art' / 'afterlight-starry-sands.blend'))
print('Starry Sands Blender MCP kit exported:', len(assets), 'original GLB models')
print([asset.name for asset in assets])
