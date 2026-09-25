"""Afterlight first-person asset kit. Run in the live Blender MCP connection.

Coordinates passed to helpers use game space: X right, Y up, Z south.
The existing model workshop and default scene are preserved.
"""
import bpy, math, os, json, random
from mathutils import Vector, Quaternion

ROOT = r'C:\Users\hamze\Home\Desktop\Folder_1\Post-Nuclear war game'
OUT = os.path.join(ROOT, 'public', 'models')
scene = bpy.data.scenes.get('Afterlight - Fallout Kit') or bpy.data.scenes.new('Afterlight - Fallout Kit')
bpy.context.window.scene = scene
materials, assets = {}, [o for o in scene.objects if o.type == 'EMPTY' and o.get('authoring')]
random.seed(721)

def material(name, color, metal=0, glow=0):
    m = bpy.data.materials.new('Fallout / '+name)
    m.use_nodes = True
    rgb = [int(color[i:i+2],16)/255 for i in (0,2,4)]
    rgb = [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    m.diffuse_color = (*rgb,1)
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = (*rgb,1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = .85
    if glow:
        p.inputs['Emission Color'].default_value = (*rgb,1)
        p.inputs['Emission Strength'].default_value = glow
    materials[name] = m

for args in [('concrete','69665e'),('plaster','9b9380'),('edge','b0a38a'),('brick','654839'),('steel','343c3b',.6),('rust','80513b',.3),('wood','564431'),('black','171c1d'),('cloth','6b7255'),('brass','b59755',.6),('red','a1513e'),('glass','314846',.4),('glow','bac47a',0,.8)]:
    material(*args)

def start(name):
    global root, asset_name
    asset_name = name
    # Rebuild only this script's own asset in its dedicated scene.
    previous = next((a for a in assets if a.name == name), None)
    if previous:
        assets.remove(previous)
        for obj in list(previous.children_recursive): bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.objects.remove(previous, do_unlink=True)
    root = bpy.data.objects.new(name,None)
    scene.collection.objects.link(root)
    root['authoring'] = 'Original asset created through Blender MCP'
    assets.append(root)

def mesh(name, verts, faces, mat):
    data = bpy.data.meshes.new(name)
    data.from_pydata([(x,-z,y) for x,y,z in verts],[],faces)
    data.update()
    o = bpy.data.objects.new(name,data)
    scene.collection.objects.link(o)
    o.parent = root
    data.materials.append(materials[mat])
    return o

def box(name, pos, size, mat):
    x,y,z=pos; w,h,d=[a/2 for a in size]
    v=[(x-w,y-h,z+d),(x+w,y-h,z+d),(x+w,y-h,z-d),(x-w,y-h,z-d),(x-w,y+h,z+d),(x+w,y+h,z+d),(x+w,y+h,z-d),(x-w,y+h,z-d)]
    return mesh(name,v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat)

def beam(name,a,b,r,mat,vertices=8):
    a,b=Vector((a[0],-a[2],a[1])),Vector((b[0],-b[2],b[1]))
    axis=(b-a).normalized()
    u=axis.cross(Vector((0,0,1)))
    if u.length < .01: u=axis.cross(Vector((0,1,0)))
    u.normalize(); v=axis.cross(u)
    points=[p+r*(math.cos(i*math.tau/vertices)*u+math.sin(i*math.tau/vertices)*v) for p in [a,b] for i in range(vertices)]
    faces=[tuple(reversed(range(vertices))),tuple(range(vertices,vertices*2))]+[(i,(i+1)%vertices,(i+1)%vertices+vertices,i+vertices) for i in range(vertices)]
    return mesh(name,[(p.x,p.z,-p.y) for p in points],faces,mat)

def export():
    for o in bpy.context.selected_objects: o.select_set(False)
    root.select_set(True)
    for o in root.children_recursive:o.select_set(True)
    bpy.context.view_layer.objects.active=root
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,asset_name+'.glb'),use_selection=True,use_active_scene=True,export_apply=True,export_animations=False)
    print('EXPORTED',asset_name,len(root.children_recursive))

def window_wall(z,y,width=14):
    # Genuine openings: no glass or invisible geometry across the windows.
    box('WALL_sill',(0,y+.48,z),(width,.96,.34),'brick')
    box('WALL_lintel',(0,y+3.15,z),(width,.7,.34),'concrete')
    for x in [-6.75,-3.5,0,3.5,6.75]:box('WALL_pier',(x,y+1.98,z),(.5,2.1,.38),'plaster')

def ruin_tenement():
    start('ruin_tenement')
    box('FLOOR_ground',(0,-.12,0),(14,.24,12),'concrete')
    # Four metre front entrance, a back door, exposed window bays.
    for x in [-4.5,4.5]:box('WALL_front',(x,1.7,6),(5,3.4,.4),'plaster')
    box('WALL_entry_lintel',(0,3.13,6),(4,.54,.4),'concrete')
    for x in [-4.5,4.5]:box('WALL_back',(x,1.7,-6),(5,3.4,.4),'brick')
    box('WALL_back_lintel',(0,3.13,-6),(4,.54,.4),'concrete')
    for x in [-7,7]:
        box('WALL_side_sill',(x,.48,0),(.4,.96,12),'brick')
        box('WALL_side_lintel',(x,3.18,0),(.4,.64,12),'concrete')
        for z in [-5.8,-2,2,5.8]:box('WALL_side_pier',(x,1.95,z),(.46,2.0,.55),'plaster')
    # Ground-floor partition with a real interior door.
    box('WALL_partition',(-2.6,1.5,-.6),(.22,3,5.8),'plaster')
    box('WALL_partition_short',(-2.6,1.5,4.6),(.22,3,2.8),'plaster')
    # Upstairs slab leaves an open stairwell along the east wall.
    box('FLOOR_upper_main',(-1.8,3.48,0),(10.4,.24,12),'concrete')
    box('FLOOR_upper_landing',(5.2,3.48,-4.95),(3.6,.24,2.1),'concrete')
    for i in range(18):
        height=(i+1)*.2
        box('FLOOR_stair_%02d'%i,(5.05,height/2,4.45-i*.46),(2.5,height,.47),'concrete')
    for z in [-3.8,-1.2,1.4,4.0]:beam('railing',(3.67,max(.2,(4.45-z)/.46*.2),z),(3.67,max(.2,(4.45-z)/.46*.2)+1,z),.035,'rust')
    beam('handrail',(3.67,1.2,4.4),(3.67,4.6,-3.8),.055,'rust')
    window_wall(-6,3.6)
    window_wall(6,3.6)
    box('WALL_upper_west',(-7,5.15,-2.6),(.4,3.1,6.8),'plaster')
    box('WALL_upper_east',(7,5.15,-3.5),(.4,3.1,5),'brick')
    # Shattered roof fingers and irregular blast-torn concrete profile.
    for x in [-6,-3,0,3,6]:
        reach=random.uniform(1.6,4.8)
        box('roof_remnant',(x,7,-6+reach/2),(2.1,.28,reach),'concrete')
        beam('exposed_rebar',(x,7.15,-6+reach),(x+.15,7.05,-4+reach),.032,'rust')
    for x in [-7,7]:
        v=[(x-.2,6.6,-6),(x+.2,6.6,-6),(x+.2,8.9,-6),(x-.2,8.9,-6),(x-.2,6.6,-1),(x+.2,6.6,-1),(x+.2,7.1,-2),(x-.2,7.1,-2)]
        mesh('blast_torn_wall',v,[(0,1,2,3),(4,7,6,5),(0,4,5,1),(3,2,6,7),(0,3,7,4),(1,5,6,2)],'brick')
    for i in range(18):
        x=random.uniform(-6.6,2.7);z=random.uniform(-5.4,5.2)
        box('loose_brick',(x,3.7,z),(.3,.14,.18),'brick')
    # Ruined furniture inside; collision tags make it tangible in the game.
    box('WALL_counter',(-5.3,.65,-4.8),(2.8,1.3,.8),'wood')
    for x in [-5.7,-4.3]:box('cabinet_door',(x,.65,-4.37),(1.25,1.13,.08),'cloth')
    export()

def ruin_store():
    start('ruin_store')
    box('FLOOR_ground',(0,-.12,0),(12,.24,10),'concrete')
    box('WALL_rear',(0,1.7,-5),(12,3.4,.35),'brick')
    for x in [-6,6]:box('WALL_sides',(x,1.7,0),(.35,3.4,10),'plaster')
    for x in [-4.2,4.2]:box('WALL_shopfront',(x,1.55,5),(3.6,3.1,.38),'concrete')
    box('WALL_sign_header',(0,3.3,5),(12,.6,.4),'cloth')
    box('roof_back',(0,3.62,-3.4),(12,.28,3.2),'concrete')
    for x in [-4,0,4]:
        beam('buckled_roof_beam',(x,3.55,-5),(x+.5,3.9,3),.1,'rust')
        for z in [-4,-1,2]:beam('hanging_wire',(x,3.6,z),(x+.2,2.7,z+.1),.02,'black')
    for x in [-4.2,4.2]:
        box('WALL_shelving',(x,.88,-2.6),(1.15,1.76,3.7),'steel')
        for y in [.3,.85,1.4]:box('shelf_trim',(x,y,-.73),(1.25,.06,.15),'rust')
    box('WALL_counter',(1.2,.55,1.4),(3,1.1,.7),'wood')
    export()

def weapons():
    start('scavenger_pistol')
    box('steel_slide',(0,.02,-.18),(.105,.12,.34),'steel')
    box('receiver',(0,-.055,-.13),(.10,.045,.27),'black')
    grip=box('wrapped_grip',(0,-.15,-.015),(.095,.2,.095),'wood')
    for y in [-.09,-.13,-.17,-.21]:box('grip_wrap',(0,y,.037),(.101,.019,.009),'cloth')
    beam('barrel',(0,.015,-.25),(0,.015,-.395),.027,'black',12)
    beam('bore',(0,.015,-.396),(0,.015,-.397),.015,'black',12)
    for x in [-.047,.047]:box('rear_sight',(x,.095,-.04),(.014,.025,.045),'brass')
    box('front_sight',(0,.09,-.33),(.012,.022,.025),'brass')
    for z in [-.08,-.06,-.04]:box('slide_serration',(.054,.028,z),(.004,.067,.008),'rust')
    beam('trigger_guard',(0,-.078,-.18),(0,-.16,-.12),.012,'steel')
    beam('trigger_guard',(0,-.16,-.12),(0,-.15,-.045),.012,'steel')
    export()
    start('service_rifle')
    box('receiver',(0,0,-.24),(.12,.15,.4),'steel')
    box('handguard',(0,-.015,-.55),(.115,.13,.25),'wood')
    for z in [-.47,-.52,-.57,-.62]:box('handguard_band',(0,-.015,z),(.123,.139,.018),'black')
    box('stock',(0,-.035,.14),(.11,.2,.36),'wood')
    box('stock_pad',(0,-.035,.325),(.12,.22,.035),'black')
    box('grip',(0,-.16,-.10),(.09,.22,.09),'black')
    box('magazine',(0,-.22,-.3),(.075,.32,.12),'steel')
    beam('barrel',(0,.025,-.60),(0,.025,-.95),.025,'black',12)
    beam('gas_tube',(0,.07,-.52),(0,.07,-.86),.018,'rust')
    box('front_sight',(0,.107,-.84),(.023,.09,.038),'steel')
    box('rear_sight',(0,.1,-.13),(.07,.04,.05),'black')
    beam('charging_handle',(.06,.03,-.17),(.115,.03,-.17),.018,'brass')
    export()
    start('scrap_pipe')
    beam('pipe',(0,-.12,.08),(0,.08,-.8),.034,'rust',10)
    for i in range(8):beam('tape',(0,-.11+i*.01,.03-i*.045),(0,-.10+i*.01,.005-i*.045),.04,'cloth',10)
    beam('elbow',(0,.08,-.8),(.16,.08,-.8),.045,'steel',10)
    export()

def props():
    start('rubble_cluster')
    for i in range(20):
        x=random.uniform(-2.5,2.5);z=random.uniform(-2.1,2.1);h=random.uniform(.12,.6)
        o=box('concrete_fragment',(x,h/2,z),(random.uniform(.3,1.4),h,random.uniform(.3,1.2)),'concrete' if i%3 else 'brick')
        o.rotation_euler[2]=random.uniform(-.8,.8)
    for i in range(4):beam('twisted_rebar',(-1+i*.7,.1,-1),(random.uniform(-1,1),random.uniform(.5,1.2),random.uniform(-1,1)),.025,'rust')
    export()
    start('fallout_barrel')
    beam('barrel',(0,.06,0),(0,.94,0),.34,'cloth',16)
    for y in [.12,.38,.72,.91]:beam('steel_rim',(0,y,0),(0,y+.025,0),.355,'rust',16)
    box('warning_label',(0,.56,.337),(.34,.33,.012),'brass')
    beam('cap',(.16,.96,0),(.16,.99,0),.045,'black',10)
    export()

def finish():
    for i,a in enumerate(assets):
        a.location=((i%4)*18,(i//4)*18,0)
    scene.world=bpy.data.worlds.new('Fallout Workshop World')
    scene.world.color=(.35,.35,.35)
    for area in bpy.context.screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_distance=32
            area.spaces.active.region_3d.view_location=(8,0,2)
            area.spaces.active.region_3d.view_rotation=Quaternion((.82,.4,.18,.35)).normalized()
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'art','afterlight-wasteland.blend'))
    manifest={'authoring':'Original first-person assets created in live Blender through Blender MCP','blender':bpy.app.version_string,'assets':[a.name+'.glb' for a in assets]}
    with open(os.path.join(OUT,'wasteland-manifest.json'),'w') as f:json.dump(manifest,f,indent=2)
    print(json.dumps(manifest))

if __name__=='__main__':
    ruin_tenement()
    ruin_store()
    weapons()
    props()
    finish()
