"""Original Afterlight low-poly assets. Execute in Blender through Blender MCP.
Keeps the existing scene; creates an isolated Afterlight asset workshop.
"""
import bpy, math, os, json, random
from mathutils import Vector, Quaternion

ROOT = r'C:\Users\hamze\Home\Desktop\Folder_1\Post-Nuclear war game'
OUT = os.path.join(ROOT, 'public', 'models')
os.makedirs(OUT, exist_ok=True)
scene = bpy.data.scenes.new('Afterlight - Model Workshop')
bpy.context.window.scene = scene
materials = {}
assets = []
root = None

def material(name, color, metal=0, glow=0):
    m = bpy.data.materials.new('Afterlight / ' + name)
    m.use_nodes = True
    srgb = tuple(int(color[i:i+2], 16)/255 for i in (0,2,4))
    rgb = tuple(v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in srgb)
    m.diffuse_color = (*rgb, 1)
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = (*rgb,1)
    p.inputs['Roughness'].default_value = .76
    p.inputs['Metallic'].default_value = metal
    if glow:
        p.inputs['Emission Color'].default_value = (*rgb,1)
        p.inputs['Emission Strength'].default_value = glow
    materials[name] = m
    return m

for args in [('concrete','72776b'),('edge','9da393'),('floor','969080'),('dark','262e2d',.2),('steel','4c5a52',.35),('olive','67785c'),('canvas','a5a378'),('rust','995c40'),('orange','da8b42'),('cream','d6d2b4'),('skin','c0a077'),('glass','344d4c',.25),('water','76a5a3',.1),('red','a85b4d'),('wood','8a7050'),('soil','514e3e'),('leaf','95ae6c'),('light','ebca81',0,1.5),('screen','aad4b1',0,.8),('mutant','54664c'),('toxic','c5df6c',0,1.1),('black','1f2626')]:
    material(*args)

def group(name, loc=(0,0,0), parent=None):
    o = bpy.data.objects.new(name, None)
    scene.collection.objects.link(o)
    o.location = loc
    o.parent = parent
    return o

def start(name):
    global root
    root = group(name)
    root['created_with'] = 'Blender MCP'
    root['artist'] = 'Afterlight original procedural model'
    assets.append(root)

def mesh(name, verts, faces, mat, loc=(0,0,0), parent=None, bevel=0):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    o = bpy.data.objects.new(name, data)
    scene.collection.objects.link(o)
    o.location = loc
    o.parent = parent if parent is not None else root
    o.data.materials.append(materials[mat])
    if bevel:
        b = o.modifiers.new('Soft manufactured edges', 'BEVEL')
        b.width = bevel
        b.segments = 2
    return o

def box(name, loc, size, mat, bevel=.025, parent=None):
    x,y,z = [a/2 for a in size]
    v=[(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]
    f=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    return mesh(name,v,f,mat,loc,parent,bevel)

def cylinder(name, loc, radius, depth, mat, vertices=12, top=None, parent=None):
    r2 = radius if top is None else top
    v=[]
    for z,r in [(-depth/2,radius),(depth/2,r2)]:
        v += [(math.cos(i*2*math.pi/vertices)*r,math.sin(i*2*math.pi/vertices)*r,z) for i in range(vertices)]
    f=[tuple(reversed(range(vertices))),tuple(range(vertices,2*vertices))]
    f += [(i,(i+1)%vertices,(i+1)%vertices+vertices,i+vertices) for i in range(vertices)]
    return mesh(name,v,f,mat,loc,parent)

def beam(name,a,b,r,mat,top=None):
    a,b=Vector(a),Vector(b)
    o=cylinder(name,(a+b)/2,r,(b-a).length,mat,8,top)
    o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
    return o

def save_asset():
    bpy.ops.object.select_all(action='DESELECT')
    root.select_set(True)
    for o in root.children_recursive: o.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,root.name+'.glb'),use_selection=True,use_active_scene=True,export_apply=True,export_animations=False)
    print('EXPORTED',root.name,len(root.children_recursive))

# A traveller in an orange expedition jacket with mask, boots and canvas backpack.
start('survivor')
for side,x in [('L',-.19),('R',.19)]:
    pivot=group('leg_'+side,(x,0,.77),root)
    box('trouser_'+side,(0,0,-.24),(.29,.34,.51),'olive',parent=pivot)
    box('boot_'+side,(0,-.09,-.60),(.32,.49,.23),'dark',parent=pivot)
box('jacket',(0,0,1.1),(.77,.46,.70),'orange',.08)
box('belt',(0,-.01,.82),(.79,.49,.11),'dark')
box('zipper',(0,-.241,1.14),(.045,.024,.56),'cream',.003)
for x in [-.23,.23]: box('pocket',(x,-.26,1.00),(.19,.075,.16),'canvas')
for side,x in [('L',-.5),('R',.5)]:
    pivot=group('arm_'+side,(x,0,1.36),root)
    box('sleeve_'+side,(0,0,-.22),(.23,.36,.50),'orange',parent=pivot)
    box('glove_'+side,(0,-.03,-.51),(.22,.26,.20),'dark',parent=pivot)
box('hood',(0,.035,1.67),(.57,.53,.56),'olive',.10)
box('face',(0,-.12,1.64),(.44,.33,.38),'skin',.06)
box('goggles',(0,-.304,1.73),(.44,.08,.14),'dark')
for x in [-.115,.115]: box('lens',(x,-.35,1.74),(.15,.015,.083),'water',.005)
box('respirator',(0,-.31,1.53),(.30,.17,.15),'steel')
box('backpack',(0,.34,1.13),(.59,.32,.63),'canvas',.07)
box('bedroll',(0,.38,1.51),(.64,.30,.19),'cream',.07)
save_asset()

start('bunk')
for x in [-.56,.56]:
    for y in [-1.02,1.02]:
        cylinder('bedpost',(x,y,1.05),.065,2.1,'steel')
for z in [.45,1.48]:
    box('steel_frame',(0,0,z),(1.28,2.23,.15),'dark')
    box('mattress',(0,0,z+.13),(1.13,2.08,.22),'canvas',.07)
    box('folded_blanket',(0,-.33,z+.265),(1.14,1.25,.07),'olive')
    box('pillow',(0,.75,z+.28),(.77,.39,.14),'cream',.065)
for z in [.25,.58,.91,1.24]: box('ladder_rung',(.66,-.44,z),(.09,.7,.055),'steel')
for y in [-.81,-.07]: cylinder('ladder_pole',(.66,y,.87),.03,1.68,'steel')
save_asset()

start('generator')
box('skid',(0,0,.12),(2.00,1.27,.22),'dark')
box('engine',(0,0,.70),(1.72,1.04,1.07),'olive',.08)
box('orange_panel',(.39,-.55,.74),(.73,.07,.75),'orange')
for z in [.41,.52,.63,.74,.85,.96]: box('vent',(-.42,-.557,z),(.53,.035,.045),'black',.003)
box('meter',(.39,-.60,.90),(.42,.025,.20),'dark')
box('meter_glass',(.39,-.621,.91),(.30,.009,.095),'screen',.001)
for x in [.2,.56]: box('switch',(x,-.615,.58),(.10,.04,.10),'red')
cylinder('exhaust',(-.61,.3,1.58),.105,.77,'steel')
cylinder('exhaust_cap',(-.61,.3,1.99),.16,.06,'dark')
box('fuel_tank',(.40,.1,1.37),(.62,.65,.29),'rust')
cylinder('fuel_cap',(.40,.1,1.55),.095,.07,'dark')
save_asset()

start('water_tank')
for x in [-.53,.53]:
    for y in [-.4,.4]: box('tank_foot',(x,y,.19),(.12,.12,.38),'steel')
cylinder('cistern',(0,0,1.21),.70,1.71,'water',16)
for z in [.47,.77,1.67,1.99]: cylinder('tank_band',(0,0,z),.718,.065,'steel',16)
cylinder('lid',(0,0,2.09),.75,.12,'cream',16)
beam('tap_pipe',(0,-.65,.60),(0,-.98,.60),.07,'steel')
box('tap_handle',(0,-.87,.73),(.22,.045,.045),'orange')
box('tank_label',(0,-.699,1.32),(.38,.035,.44),'cream')
box('water_mark',(0,-.722,1.33),(.09,.02,.28),'water')
save_asset()

start('workbench')
for x in [-1.04,1.04]:
    for y in [-.39,.39]: box('leg',(x,y,.46),(.11,.11,.92),'steel')
box('shelf',(0,0,.28),(2.20,.91,.09),'olive')
box('table_top',(0,0,1.02),(2.4,1.1,.18),'wood')
box('pegboard',(0,.46,1.65),(2.34,.12,1.13),'olive')
for x in [-.92,-.65,-.38,-.11,.16,.43,.70,.97]:
    for z in [1.31,1.56,1.81,2.06]: box('peg',(x,.389,z),(.025,.03,.025),'dark',.002)
for x,z in [(-.67,1.7),(-.15,1.5),(.3,1.9)]:
    box('tool_handle',(x,.30,z),(.065,.06,.35),'orange')
    box('tool_head',(x,.30,z+.16),(.22,.075,.09),'steel')
box('toolbox',(.63,-.03,1.30),(.69,.46,.4),'rust')
box('toolbox_handle',(.63,-.03,1.54),(.27,.07,.08),'dark')
cylinder('tin',(-.72,-.15,1.26),.13,.32,'cream')
save_asset()

start('radio')
box('cabinet',(0,0,.44),(1.72,.82,.88),'olive')
box('desk',(0,0,.93),(2.03,1.02,.13),'wood')
box('transceiver',(0,.05,1.28),(1.18,.57,.56),'steel')
box('radio_display',(-.25,-.253,1.36),(.49,.033,.17),'screen')
for x in [.20,.42]:
    o=cylinder('radio_knob',(x,-.289,1.30),.067,.07,'black');o.rotation_euler[0]=math.pi/2
for x in [-.43,-.32,-.21,-.10]: box('speaker_grille',(x,-.27,1.17),(.04,.02,.12),'dark')
beam('antenna',(.42,.22,1.57),(.70,.22,2.56),.016,'cream')
box('notebook',(-.78,-.19,1.03),(.33,.40,.04),'cream')
box('microphone',(.79,-.19,1.23),(.10,.14,.36),'dark')
save_asset()

start('crate')
box('supply_box',(0,0,.44),(1.12,.85,.87),'olive',.055)
box('lid',(0,0,.91),(1.18,.90,.13),'canvas')
for x in [-.39,.39]: box('strap',(x,0,.50),(.10,.89,.94),'steel')
box('label',(0,-.433,.52),(.34,.019,.23),'cream',.005)
box('latch',(0,-.48,.81),(.13,.10,.18),'orange')
save_asset()

start('planter')
box('raised_bed',(0,0,.4),(2.22,1.23,.8),'wood')
box('soil',(0,0,.81),(2.06,1.08,.05),'soil')
for x in [-.7,0,.7]:
    for y in [-.3,.3]:
        beam('stalk',(x,y,.83),(x,y,1.24),.023,'olive')
        for z,side in [(1.,1),(1.12,-1)]:
            o=box('leaf',(x+side*.11,y,z),(.28,.15,.055),'leaf',.03);o.rotation_euler[1]=side*-.42
save_asset()

start('dead_tree')
beam('trunk',(0,0,0),(.12,.09,3.9),.27,'soil',.08)
for a,b,r in [((.04,0,1.5),(-1.35,.14,2.8),.14),((-.85,.1,2.3),(-.94,.12,3.35),.075),((.08,0,2.1),(1.03,-.32,3.38),.12),((.60,-.17,2.79),(1.7,-.06,2.98),.065),((.10,.09,3.5),(.68,.30,4.5),.06)]: beam('dead_branch',a,b,r,'soil',.025)
save_asset()

start('ruin')
box('foundation',(0,0,.14),(4.3,3.5,.28),'concrete')
box('rear_wall',(0,1.62,1.35),(4.1,.26,2.7),'concrete')
box('side_wall',(-1.94,.31,1.14),(.26,2.6,2.28),'concrete')
box('broken_wall',(1.94,.62,.81),(.26,2,.1+1.5),'edge')
box('window_dark',(.27,1.474,1.54),(1.19,.07,.94),'dark')
for x in [-.39,.93]: box('window_jamb',(x,1.42,1.55),(.10,.12,1.18),'edge')
for z in [.97,2.1]: box('window_sill',(.27,1.4,z),(1.42,.22,.10),'edge')
box('window_cross',(.27,1.41,1.54),(.05,.10,1.03),'rust')
for i in range(7):
    x=-1.7+i*.55
    box('exposed_brick',(x,1.6,2.72+(i%3)*.10),(.43,.29,.24),'edge')
random.seed(6)
for i in range(10):
    o=box('rubble',(random.uniform(-1.7,1.7),random.uniform(-1.4,1.2),.37),(random.uniform(.2,.6),random.uniform(.2,.5),.25),'concrete')
    o.rotation_euler[2]=random.random()*3
save_asset()

start('wreck')
box('chassis',(0,0,.49),(1.75,3.75,.39),'dark')
box('rust_body',(0,0,.80),(1.79,3.65,.63),'rust',.13)
box('cabin',(0,.02,1.38),(1.56,1.96,.82),'rust',.14)
for y in [-.99,1.01]: box('windshield',(0,y,1.52),(1.29,.035,.43),'glass')
for x in [-.79,.79]: box('side_window',(x,.02,1.52),(.035,1.57,.44),'glass')
for x in [-.91,.91]:
    for y in [-1.19,1.19]:
        o=cylinder('tire',(x,y,.46),.43,.23,'black');o.rotation_euler[1]=math.pi/2
        o=cylinder('rim',(x*1.135,y,.46),.21,.017,'steel');o.rotation_euler[1]=math.pi/2
for x in [-.55,.55]: box('headlight',(x,-1.839,.85),(.33,.02,.22),'cream')
box('bumper',(0,-1.9,.5),(1.87,.16,.15),'steel')
save_asset()

start('mutant')
box('haunch',(0,.25,.99),(.84,1.85,.81),'mutant',.19)
box('shoulders',(0,-.37,1.16),(1.03,.93,.97),'mutant',.18)
box('skull',(0,-1.0,1.20),(.70,.76,.68),'mutant',.10)
box('jaw',(0,-1.4,1.03),(.51,.5,.29),'dark',.06)
for x in [-.25,.25]:
    box('glowing_eye',(x,-1.384,1.36),(.12,.04,.1),'toxic',.012)
    beam('ear',(x,-.86,1.48),(x*1.45,-.76,1.96),.13,'mutant',.018)
for x in [-.39,.39]:
    for y in [-.55,.91]:
        beam('crooked_leg',(x,y,.91),(x*1.36,y-.16,.37),.14,'mutant',.10)
        beam('paw',(x*1.36,y-.16,.37),(x*1.45,y-.40,.14),.10,'dark',.11)
        for dx in [-.07,.07]: beam('claw',(x*1.45+dx,y-.39,.13),(x*1.45+dx,y-.67,.09),.035,'cream',.005)
for i in range(6):
    y=-.5+i*.29
    beam('irradiated_spine',(0,y,1.42),(0,y+.08,1.90-abs(i-2)*.08),.12,'toxic',.005)
beam('tail',(0,1.07,1.12),(.5,1.93,.81),.12,'mutant',.07)
beam('tail_tip',(.5,1.93,.81),(.66,2.36,1.21),.07,'mutant',.015)
save_asset()

start('shelter')
box('foundation',(0,0,-.42),(18.8,14.8,.82),'dark',.12)
box('floor',(0,0,-.06),(18,14,.16),'floor')
for x in range(-8,9,2): box('floor_seam',(x,0,.029),(.016,13.95,.009),'concrete',0)
for y in range(-6,7,2): box('floor_seam',(0,y,.031),(17.95,.016,.009),'concrete',0)
# Tall rear and left walls, a cutaway on the camera-facing sides.
box('rear_wall',(0,6.94,1.55),(18.8,.48,3.2),'concrete',.06)
box('west_wall',(-9.08,0,1.55),(.48,14.3,3.2),'concrete',.06)
box('front_cutaway',(0,-7.08,.23),(18.8,.48,.57),'concrete')
box('east_cutaway',(9.08,0,.23),(.48,14.3,.57),'concrete')
for x in [-8.65,-3.05,3.05,8.65]:
    box('rear_pillar',(x,6.54,1.55),(.37,.39,3.21),'edge')
    box('ceiling_stub',(x,6.0,3.14),(.43,1.44,.29),'edge')
for y in [-5.8,0,5.8]: box('side_pillar',(-8.71,y,1.54),(.34,.39,3.2),'edge')
for z in [.28,.54]: beam('service_pipe',(-8.73,6.58,z),(8.63,6.58,z),.055,'steel')
beam('overhead_pipe',(-8.66,6.48,2.72),(8.55,6.48,2.72),.065,'rust')
for x in [-6,0,6]:
    box('lamp_housing',(x,6.54,2.64),(1.38,.23,.24),'dark')
    box('fluorescent',(x,6.395,2.62),(1.18,.09,.12),'light')
box('door_frame',(7.30,6.63,1.26),(2.16,.38,2.58),'dark')
box('blast_door',(7.30,6.39,1.23),(1.86,.24,2.39),'olive',.09)
for x in [6.72,7.88]: box('door_rib',(x,6.23,1.23),(.12,.13,2.03),'steel')
o=cylinder('door_wheel',(7.30,6.16,1.20),.31,.12,'orange',12);o.rotation_euler[0]=math.pi/2
box('door_lamp',(7.30,6.33,2.72),(.33,.12,.13),'screen')
# Low partitions preserve readability of the complete shelter.
box('dorm_partition',(-3.05,2.90,.62),(.22,7.13,1.24),'concrete')
box('utility_partition',(3.05,4.40,.60),(.22,4.2,1.2),'concrete')
box('dorm_threshold',(-5.96,-.62,.04),(5.6,.09,.03),'orange',0)
box('utility_threshold',(5.86,2.25,.04),(5.5,.09,.03),'orange',0)
save_asset()

# Arrange a visible workshop without changing any exported asset's local origin.
for index,a in enumerate(assets):
    if a.name == 'shelter': a.location=(0,17,0)
    else: a.location=((index%6)*4.6-11.5,(index//6)*5.5-6,0)
scene.world = bpy.data.worlds.new('Afterlight Workshop World')
scene.world.color=(.3,.3,.3)
for area in bpy.context.screen.areas:
    if area.type == 'VIEW_3D':
        area.spaces.active.region_3d.view_distance=36
        area.spaces.active.region_3d.view_location=(0,7,0)
        area.spaces.active.region_3d.view_rotation=Quaternion((.82,.41,.18,.35)).normalized()
        area.spaces.active.shading.color_type='MATERIAL'
os.makedirs(os.path.join(ROOT,'art'),exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'art','afterlight-models.blend'))
manifest={'authoring':'Original models created in live Blender through Blender MCP','blender':bpy.app.version_string,'assets':[a.name+'.glb' for a in assets]}
with open(os.path.join(OUT,'manifest.json'),'w') as f: json.dump(manifest,f,indent=2)
print(json.dumps(manifest))
