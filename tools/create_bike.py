"""Run through Blender MCP. Metre scale; front points along Blender +Y / glTF -Z."""
import bpy, math
from mathutils import Vector, Quaternion
from pathlib import Path
ROOT = Path(r'C:\Users\hamze\Home\Desktop\Folder_1\Post-Nuclear war game')
scene = bpy.data.scenes.new('Shelter 07 courier bicycle')
bpy.context.window.scene = scene
parts = []
def material(name, color, metal=0):
    m=bpy.data.materials.new('Bike / '+name); m.use_nodes=True
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value=(*color,1); p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=.68
    m.diffuse_color=(*color,1); return m
green=material('chipped olive enamel',(.19,.26,.16),.5)
steel=material('worn steel',(.38,.39,.34),.85)
rubber=material('rubber',(.022,.026,.022))
leather=material('saddle',(.105,.065,.034))
canvas=material('canvas panniers',(.34,.30,.17))
rust=material('rust',(.29,.115,.045),.3)
lamp=material('headlamp glass',(.85,.78,.52),.25)
def finish(o,name,mat,parent=None):
    o.name=name; o.data.materials.append(mat)
    if parent:o.parent=parent
    parts.append(o);return o
def tube(name,a,b,r,mat,parent=None):
    a,b=Vector(a),Vector(b);d=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=10,radius=r,depth=d.length,location=(a+b)/2)
    o=bpy.context.object;o.rotation_euler=d.to_track_quat('Z','Y').to_euler()
    return finish(o,name,mat,parent)
def box(name,p,s,mat):
    bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.scale=s
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(o,name,mat)
def ring(name,center,radius,thick,mat,parent):
    verts=[];faces=[]
    for i in range(40):
        a=i*math.tau/40
        for j in range(8):
            b=j*math.tau/8; r=radius+thick*math.cos(b)
            verts.append((center[0]+thick*math.sin(b),center[1]+r*math.sin(a),center[2]+r*math.cos(a)))
    for i in range(40):
        for j in range(8):faces.append((i*8+j,((i+1)%40)*8+j,((i+1)%40)*8+(j+1)%8,i*8+(j+1)%8))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o);finish(o,name,mat,parent)
    for p in mesh.polygons:p.use_smooth=True
for name,y in [('rear',-.65),('front',.65)]:
    pivot=bpy.data.objects.new('wheel_'+name,None);scene.collection.objects.link(pivot);pivot.location=(0,y,.37);parts.append(pivot)
    ring('Tyre '+name,(0,0,0),.325,.045,rubber,pivot)
    ring('Rim '+name,(0,0,0),.285,.014,steel,pivot)
    tube('Hub '+name,(-.08,0,0),(.08,0,0),.04,steel,pivot)
    for i in range(20):
        a=i*math.tau/20;tube('Spoke',((i%2-.5)*.12,0,0),(0,.28*math.sin(a),.28*math.cos(a)),.004,steel,pivot)
    for i in range(32):
        a=i*math.tau/32;tube('Tread',(-.035,.367*math.sin(a),.367*math.cos(a)),(.035,.367*math.sin(a+.035),.367*math.cos(a+.035)),.012,rubber,pivot)
rear=(0,-.65,.37);crank=(0,-.08,.32);seat=(0,-.25,.93);head=(0,.43,.94);fork=(0,.5,.69)
for a,b in [(rear,crank),(crank,seat),(seat,head),(head,crank),(seat,rear),(head,fork)]:tube('Olive frame',a,b,.029,green)
for x in [-.075,.075]:
    tube('Fork',(x,.5,.76),(x,.65,.37),.022,steel)
    tube('Rear stay',(x,-.25,.86),(x,-.65,.37),.018,green)
tube('Seat post',seat,(0,-.27,1.03),.024,steel)
box('Leather saddle',(0,-.29,1.05),(.24,.31,.07),leather)
tube('Stem',head,(0,.43,1.15),.023,steel)
tube('Handlebar',(-.38,.40,1.15),(.38,.40,1.15),.021,steel)
for x in [-1,1]:
    tube('Rubber grip',(x*.25,.4,1.15),(x*.4,.4,1.15),.031,rubber)
    tube('Brake lever',(x*.26,.43,1.13),(x*.37,.49,1.12),.009,steel)
    tube('Crank arm',(x*.11,-.08,.32),(x*.11,-.08+x*.15,.32),.014,steel)
    box('Pedal',(x*.18,-.08+x*.15,.32),(.13,.10,.03),rubber)
    tube('Rack support',(x*.12,-.65,.37),(x*.16,-.64,.83),.012,steel)
    box('Canvas pannier',(x*.22,-.66,.62),(.16,.35,.34),canvas)
    box('Pannier strap',(x*.31,-.66,.63),(.012,.05,.35),leather)
box('Cargo rack',(0,-.67,.85),(.35,.46,.035),steel)
box('Bedroll',(0,-.67,.94),(.43,.21,.15),canvas)
for x in [-.13,.13]:box('Bedroll tie',(x,-.67,1.02),(.035,.23,.018),leather)
tube('Chain upper',(.09,-.65,.4),(.09,-.08,.43),.009,rust)
tube('Chain lower',(.09,-.65,.33),(.09,-.08,.22),.009,rust)
tube('Headlamp housing',(0,.47,1.05),(0,.58,1.05),.065,steel)
tube('Headlamp lens',(0,.58,1.05),(0,.585,1.05),.052,lamp)
box('Rear reflector',(0,-.91,.86),(.08,.015,.06),rust)
tube('Kickstand',(-.08,-.15,.4),(-.3,-.27,.025),.012,steel)
# Select only this new asset, preserving the previously open scene.
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0]
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/shelter_bike.glb'),use_selection=True)
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_distance=3.4
        area.spaces.active.region_3d.view_location=(0,0,.6)
        area.spaces.active.region_3d.view_rotation=Quaternion((.82,.36,.18,.39)).normalized()
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/afterlight-bike.blend'),copy=True)
print('Bicycle exported:',len(parts),'parts')
