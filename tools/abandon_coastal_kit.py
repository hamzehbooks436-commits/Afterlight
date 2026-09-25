"""Damage the coastal kit in the live Blender scene and re-export game assets."""
import bpy, math, os, random
ROOT=r'C:\Users\hamze\Home\Desktop\Folder_1\Post-Nuclear war game'
scene=bpy.context.scene
assets=[o for o in scene.objects if o.type=='EMPTY' and o.name.startswith('coastal_')]
wood=bpy.data.materials.get('Coast / salt worn timber');stone=bpy.data.materials.get('Coast / weathered limestone')
dark=bpy.data.materials.get('Coast / window recess')
def mesh(parent,name,v,f,mat):
    g=bpy.data.meshes.new(name);g.from_pydata([(x,-z,y) for x,y,z in v],[],f);g.update()
    o=bpy.data.objects.new(name,g);scene.collection.objects.link(o);o.parent=parent;o.data.materials.append(mat);return o
def box(parent,name,x,y,z,w,h,d,mat):
    return mesh(parent,name,[(x+a*w/2,y+b*h/2,z+c*d/2) for a,b,c in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(1,2,6,5),(0,4,7,3)],mat)
house=next(a for a in assets if a.name=='coastal_house')
for o in list(house.children):
    if o.name.startswith('terracotta roof'):bpy.data.objects.remove(o,do_unlink=True)
    elif o.name.startswith('WALL_side'):
        for v in o.data.vertices:
            if v.co.z>3 and v.co.y<0:v.co.z-=1.2+abs(v.co.y)*.12
# Partial roof with open centre, splintered rafters and jagged edges.
mesh(house,'collapsed roof west',[(-5.4,3.6,-4.9),(0,6,-4.9),(0,6,-2),(-2,5,-1),(-3.2,4.6,1),(-5.4,3.6,2)],[(0,1,2,3,4,5)],wood)
mesh(house,'broken roof east',[(0,6,4.9),(5.4,3.6,4.9),(5.4,3.6,-4.9),(3,4.6,-4.9),(2.1,5,-1),(3,4.6,1),(0,6,2)],[(0,1,2,3,4,5,6)],wood)
for z in [-4,-2,0,2,4]:
    mesh(house,'exposed rafter',[(-5,3.6,z),(-5,3.8,z),(0,6,z),(0,5.8,z)],[(0,1,2,3)],wood)
for x in [-3,3]:
    box(house,'empty window',x,2.1,4.62,1.5,1.7,.03,dark)
    for y in [1.65,2.3]:
        mesh(house,'boarded window',[(x-1,y-.08,4.68),(x+1,y+.27,4.68),(x+1,y+.48,4.68),(x-1,y+.13,4.68)],[(0,1,2,3)],wood)
box(house,'soot scar',1.65,2.6,4.53,.7,1.9,.025,dark)
random.seed(54)
for i in range(20):
    x=random.uniform(-6,6);z=random.uniform(-5,5)
    if abs(x)<1.5 and z>0:continue
    box(house,'fallen masonry',x,.15,z,.3+random.random(),.3,.25+random.random(),stone)
tower=next(a for a in assets if a.name=='coastal_tower')
for o in list(tower.children):
    if o.name.startswith('spire'):
        for v in o.data.vertices:
            if v.co.z>25:v.co.x+=2;v.co.z-=4
    if o.name.startswith('finial'):bpy.data.objects.remove(o,do_unlink=True)
box(tower,'blackened tower scar',-2.4,11,4.07,1.4,10,.03,dark)
boat=next(a for a in assets if a.name=='coastal_boat')
for o in list(boat.children):
    if o.name.startswith('torn sail'):bpy.data.objects.remove(o,do_unlink=True)
mesh(boat,'shredded sail',[(.2,9,1),(.2,7,1),(.2,6.7,2),(.2,7.2,3)],[(0,1,2,3)],stone)
for a in assets:
    pos=a.location.copy();a.location=(0,0,0)
    for o in bpy.data.objects:o.select_set(False)
    for o in [a,*a.children_recursive]:o.select_set(True)
    bpy.context.view_layer.objects.active=a
    bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'public','models',a.name+'.glb'),export_format='GLB',use_selection=True,use_active_scene=True)
    a.location=pos
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'art','afterlight-coastal-kit.blend'))
print('Abandoned coastal kit exported')
