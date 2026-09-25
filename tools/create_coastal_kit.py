"""Original coastal settlement assets; executed in live Blender through MCP."""
import bpy, math, os
from mathutils import Quaternion
ROOT=r'C:\Users\hamze\Home\Desktop\Folder_1\Post-Nuclear war game'
scene=bpy.data.scenes.new('Afterlight - Coastal Archipelago')
bpy.context.window.scene=scene
assets=[]
def mat(name,c):
    m=bpy.data.materials.new('Coast / '+name);m.use_nodes=True
    rgb=tuple((v/255/12.92 if v/255<=.04045 else ((v/255+.055)/1.055)**2.4) for v in c)
    m.diffuse_color=(*rgb,1)
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Roughness'].default_value=.85
    return m
stone=mat('weathered limestone',(174,163,133));roof=mat('aged terracotta',(133,67,43));wood=mat('salt worn timber',(91,75,55));dark=mat('window recess',(37,48,45));metal=mat('iron',(69,77,72))
def start(name):
    global root
    root=bpy.data.objects.new(name,None);scene.collection.objects.link(root);assets.append(root)
def mesh(name,v,f,m):
    g=bpy.data.meshes.new(name);g.from_pydata([(x,-z,y) for x,y,z in v],[],f);g.update()
    o=bpy.data.objects.new(name,g);scene.collection.objects.link(o);o.parent=root;o.data.materials.append(m);return o
def box(name,x,y,z,w,h,d,m):
    return mesh(name,[(x+a*w/2,y+b*h/2,z+c*d/2) for a,b,c in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(1,2,6,5),(0,4,7,3)],m)
def gable(x,y,z,w,h,d):
    mesh('terracotta roof',[(x-w/2,y,z-d/2),(x+w/2,y,z-d/2),(x,y+h,z-d/2),(x-w/2,y,z+d/2),(x+w/2,y,z+d/2),(x,y+h,z+d/2)],[(0,2,1),(3,4,5),(0,3,5,2),(2,5,4,1),(0,1,4,3)],roof)
start('coastal_house')
box('FLOOR_house',0,-.08,0,10,.16,9,stone)
for x in [-4.8,4.8]:box('WALL_side',x,1.8,0,.4,3.6,9,stone)
box('WALL_back',0,1.8,-4.3,10,3.6,.4,stone)
for x in [-3.1,3.1]:box('WALL_front',x,1.8,4.3,3.8,3.6,.4,stone)
box('WALL_door_lintel',0,3.2,4.3,2.4,.8,.4,stone)
gable(0,3.6,0,10.8,2.4,9.8)
for x in [-3,3]:
    box('shutter',x,2.1,4.52,1.2,1.5,.08,wood)
    for dx in [-.4,0,.4]:box('slat',x+dx,2.1,4.58,.07,1.5,.08,dark)
box('chimney',3,5.7,-2,.8,2,.9,stone)
box('table',-2,.8,-1,2,.15,1,wood)
start('coastal_tower')
for x in [-3.8,3.8]:box('WALL_tower',x,9,0,.5,18,8,stone)
box('WALL_tower_back',0,9,-3.8,8,18,.5,stone)
for x in [-2.7,2.7]:box('WALL_tower_front',x,9,3.8,2.6,18,.5,stone)
box('WALL_tower_lintel',0,10.5,3.8,2.8,15,.5,stone)
for h in [5,11,17.7]:box('stone cornice',0,h,0,8.8,.35,8.8,stone)
for x in [-3.1,3.1]:
    for z in [-3.1,3.1]:box('bell pillar',x,20,z,.7,4.5,.7,stone)
box('bell',0,20,0,1.5,1.7,1.5,metal)
mesh('spire',[(-4.8,22,-4.8),(4.8,22,-4.8),(4.8,22,4.8),(-4.8,22,4.8),(0,31,0)],[(0,4,1),(1,4,2),(2,4,3),(3,4,0),(0,1,2,3)],roof)
box('finial',0,31.4,0,.16,1.8,.16,metal)
start('coastal_bridge')
box('bridge deck',0,-.3,0,12,.6,20,stone)
for x in [-5.8,5.8]:
    box('parapet',x,.65,0,.4,1.3,20,stone)
    for z in [-9,0,9]:box('pier',x,-2,z,1.3,4,1.3,stone)
    for z in [-7,-3,3,7]:box('capstone',x,1.35,z,.65,.16,3,stone)
start('coastal_boat')
mesh('hull',[(-2,0,-5),(2,0,-5),(2.5,0,2),(0,0,7),(-2.5,0,2),(-1.3,-1.5,-4),(1.3,-1.5,-4),(0,-1.5,5)],[(0,1,6,5),(1,2,7,6),(2,3,7),(3,4,7),(4,0,5,7),(5,6,7),(0,4,3,2,1)],wood)
box('cabin',0,1,-2,3,2,3,stone);box('mast',0,5,1,.2,10,.2,wood)
mesh('torn sail',[(.2,9,1),(.2,3,1),(.2,3,5),(.2,5,4),(.2,5.2,5.3)],[(0,1,2,3,4)],stone)
import io_scene_gltf2
formats=[i[0] for i in io_scene_gltf2.get_format_items(None,bpy.context)]
assert 'GLB' in formats
for a in assets:
    bpy.ops.object.select_all(action='DESELECT')
    for o in [a,*a.children_recursive]:o.select_set(True)
    bpy.context.view_layer.objects.active=a
    bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'public','models',a.name+'.glb'),export_format='GLB',use_selection=True,use_active_scene=True)
for i,a in enumerate(assets):a.location.x=i*22
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_distance=100
        area.spaces.active.region_3d.view_location=(30,0,10)
        area.spaces.active.region_3d.view_rotation=Quaternion((.86,.40,.13,.27)).normalized()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'art','afterlight-coastal-kit.blend'))
print('EXPORTED', [a.name for a in assets])
