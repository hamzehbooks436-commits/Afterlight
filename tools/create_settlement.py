"""Blender MCP authoring for the living scrap-built town and Shelter 09 hospital."""
import bpy
from pathlib import Path
from mathutils import Vector

ROOT=Path(r'C:\Users\hamze\Home\Desktop\Folder_1\Post-Nuclear war game')
scene=bpy.data.scenes.get('Southwest settlement and Shelter 09') or bpy.data.scenes.new('Southwest settlement and Shelter 09')
bpy.context.window.scene=scene
for obj in list(scene.objects):bpy.data.objects.remove(obj,do_unlink=True)

def material(name,color,metal=0,glow=0):
    m=bpy.data.materials.new('Settlement / '+name);m.use_nodes=True
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=.78
    if glow:
        p.inputs['Emission Color'].default_value=(*color,1)
        p.inputs['Emission Strength'].default_value=glow
    m.diffuse_color=(*color,1)
    return m

iron=material('weathered steel',(.23,.27,.27),.67)
rust=material('rust red',(.42,.21,.12),.52)
cream=material('old cream paint',(.69,.65,.52))
wood=material('reclaimed boards',(.38,.27,.17))
dark=material('tarred timber',(.14,.16,.15))
canvas=material('patched canvas',(.41,.46,.37))
blue=material('salvaged blue panels',(.22,.39,.47),.35)
yellow=material('warning paint',(.81,.61,.23))
red=material('hospital cross red',(.78,.17,.15))
white=material('hospital enamel',(.73,.78,.72))
glass=material('reused glass',(.14,.26,.26),.15)
green=material('garden green',(.24,.39,.27))
orange=material('trade awning',(.72,.39,.20))
skin_light=material('warm skin',(.66,.43,.31))
skin_medium=material('olive skin',(.47,.31,.21))
skin_dark=material('deep skin',(.27,.17,.13))
hair_dark=material('dark hair',(.10,.09,.08))
hair_grey=material('grey hair',(.39,.39,.35))
hair_brown=material('brown hair',(.25,.15,.10))
teal=material('medic scrubs',(.15,.46,.43))
apron=material('leather apron',(.35,.24,.16))
purple=material('trader coat',(.37,.29,.45))

def asset(name):
    root=bpy.data.objects.new(name,None);scene.collection.objects.link(root)
    root['authoring']='Blender MCP original scrap settlement asset'
    return root

def box(root,name,loc,size,mat):
    x,y,z=loc;w,h,d=size
    bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-z,y))
    o=bpy.context.object;o.name=name;o.dimensions=(w,d,h)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(mat);o.parent=root
    return o

def beam(root,name,a,b,r,mat):
    a=Vector((a[0],-a[2],a[1]));b=Vector((b[0],-b[2],b[1]));d=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=r,depth=d.length,location=(a+b)/2)
    o=bpy.context.object;o.name=name;o.rotation_euler=d.to_track_quat('Z','Y').to_euler()
    o.data.materials.append(mat);o.parent=root
    return o

def shelter_shell(root,w,d,h,wall=iron):
    box(root,'FLOOR_plate',(0,.04,0),(w,.16,d),wood)
    box(root,'WALL_back',(0,h/2,-d/2),(w,h,.18),wall)
    for side in [-1,1]:
        box(root,'WALL_side',(side*w/2,h/2,0),(.18,h,d),wall)
        box(root,'WALL_front',(side*(w/4+.7),h/2,d/2),(w/2-1.4,h,.18),wall)
    box(root,'roof frame',(0,h+.1,0),(w+.4,.22,d+.4),dark)
    for i in range(5):
        x=-w/2+(i+.5)*w/5
        box(root,'patched roof sheet',(x,h+.22,0),(w/5-.08,.07,d+.45),[iron,rust,blue,iron,wood][i])
    for x in [-w/2+.25,w/2-.25]:
        beam(root,'corner bracing',(x,.15,d/2-.2),(x,h-.2,d/2-.2),.09,yellow)

home=asset('settlement_home')
shelter_shell(home,6.8,6.5,2.8,wood)
box(home,'porch',(0,.07,4.1),(4.4,.16,2.1),wood)
for x in [-2.1,2.1]:beam(home,'porch upright',(x,.1,4.9),(x,2.8,4.9),.1,iron)
for x in [-1.36,1.36]:box(home,'door jamb',(x,1.35,3.32),(.14,2.7,.22),iron)
box(home,'door lintel',(0,2.7,3.32),(2.8,.2,.22),iron)
box(home,'reclaimed door',(0,1.3,3.31),(2.57,2.56,.07),wood)
box(home,'canvas repair',(0,1.84,3.36),(1.4,.52,.03),canvas)
box(home,'reused window',(-2.45,1.6,3.31),(.8,.7,.04),glass)
box(home,'sleep cot',(1.3,.37,-1.65),(2.2,.35,.9),dark)
box(home,'cot blanket',(1.3,.59,-1.65),(2,.08,.8),blue)
box(home,'water barrel',(-2.2,.55,-1.8),(.8,1.1,.8),rust)
box(home,'solar salvage',(1.8,3.01,-.9),(1.35,.07,1),blue)

workshop=asset('settlement_workshop')
shelter_shell(workshop,8.4,7.2,3.25,iron)
box(workshop,'wide sliding doorway',(0,2.95,3.61),(3.1,.5,.2),yellow)
for x in [-2.9,2.9]:
    box(workshop,'tool wall panel',(x,1.6,-3.48),(1.35,2.3,.08),wood)
    for y in [.8,1.4,2]:beam(workshop,'hanging tool',(x-.4,y,-3.38),(x+.4,y-.2,-3.38),.035,iron)
box(workshop,'repair table',(0,.85,-1.15),(3.6,.22,1.4),wood)
for x in [-1.5,1.5]:box(workshop,'bench leg',(x,.4,-1.15),(.16,.8,1.2),iron)
box(workshop,'generator carcass',(2.6,.7,1.25),(1.5,1.4,1.2),rust)
box(workshop,'machine face',(2.6,.85,1.87),(1.2,.8,.04),dark)
box(workshop,'scrap rack',(-2.7,1.05,1),(1.5,2,2.8),wood)

market=asset('settlement_market')
for x in [-4.2,4.2]:
    for z in [-3.1,3.1]:beam(market,'scaffold post',(x,0,z),(x,3.2,z),.12,iron)
box(market,'market deck',(0,.04,0),(9,.16,7),wood)
box(market,'patchwork awning',(0,3.25,0),(9.1,.13,7.2),orange)
for x in [-2.8,0,2.8]:
    box(market,'trade counter',(x,.9,-.4),(2.4,.24,1.35),wood)
    for zz in [-.75,-.1]:box(market,'stock crate',(x,1.26,zz),(.85,.48,.42),[green,blue,cream][int((x+2.8)/2.8)])
box(market,'back stores',(0,.75,-2.5),(7.3,1.5,.65),rust)
for x in [-3,0,3]:box(market,'hanging fabric',(x,2.85,3.1),(2.85,.42,.08),[canvas,cream,blue][int((x+3)/3)])

hospital=asset('shelter09_hospital')
shelter_shell(hospital,28,26,3.6,white)
# The underground ward is enclosed on every side. The front opening is sealed.
box(hospital,'WALL_sealed bunker entrance',(0,1.8,13),(2.9,3.6,.28),iron)
box(hospital,'sealed hatch face',(0,1.8,13.17),(2.56,3.2,.06),blue)
box(hospital,'sealed hatch warning',(0,2.75,13.22),(1.8,.13,.03),yellow)
for side in [-1,1]:
    box(hospital,'concrete bunker wing',(side*13.1,1.65,0),(1.1,3.3,25.5),iron)
    box(hospital,'hospital cross arm',(side*11.6,2.85,13.18),(.72,.17,.06),red)
    box(hospital,'hospital cross stem',(side*11.6,2.85,13.19),(.17,.72,.06),red)
    for room_z in [-9,-3,3,9]:
        for offset in [-2.1,2.1]:
            box(hospital,'WALL_corridor room front',(side*2.6,1.72,room_z+offset),(.18,3.44,1.8),white)
    for partition_z in [-6,0,6]:
        box(hospital,'WALL_patient room divider',(side*8.25,1.72,partition_z),(11.1,3.44,.18),white)
for room_index,room_z in enumerate([-9,-3,3,9]):
    for side in [-1,1]:
        x=side*8.2
        number=room_index*2+(0 if side<0 else 1)+1
        box(hospital,f'WALL_patient bed {number:02d}',(x,.65,room_z),(2.2,.28,3.1),white)
        box(hospital,f'mattress {number:02d}',(x,.85,room_z),(2,.16,2.8),cream)
        box(hospital,f'pillow {number:02d}',(x,.97,room_z-1.05),(1.25,.1,.55),white)
        box(hospital,f'patient gown {number:02d}',(x,1.12,room_z-.18),(.67,.22,1.15),[teal,blue,canvas,white][room_index])
        box(hospital,f'patient face {number:02d}',(x,1.14,room_z-1.02),(.38,.26,.36),[skin_light,skin_medium,skin_dark][number%3])
        box(hospital,f'patient hair {number:02d}',(x,1.26,room_z-1.15),(.4,.08,.26),[hair_dark,hair_brown,hair_grey][number%3])
        box(hospital,f'patient blanket {number:02d}',(x,1.08,room_z+.74),(1.82,.11,1.15),[blue,green,canvas,cream][room_index])
        box(hospital,f'patient cabinet {number:02d}',(side*11.7,1.1,room_z),(1.2,2,.65),blue)
        beam(hospital,f'IV stand {number:02d}',(x+side*1.5,.1,room_z-1),(x+side*1.5,2.05,room_z-1),.045,iron)
        box(hospital,f'IV bag {number:02d}',(x+side*1.5,1.8,room_z-.75),(.16,.38,.08),white)
for zz in [-9,-3,3,9]:
    box(hospital,'ward corridor light',(0,3.4,zz),(1.2,.12,.55),yellow)
beam(hospital,'repaired ventilation',(0,3.45,-12),(0,3.45,12),.18,iron)
box(hospital,'triage desk',(0,.72,7.4),(3,.24,1),wood)
box(hospital,'triage monitor',(0,1.22,7.1),(.9,.7,.08),glass)
box(hospital,'medicine trolley',(1.55,.63,4.9),(.65,1.15,.5),white)
box(hospital,'hospital generator',(-11.7,.8,10.8),(1.5,1.6,1.6),rust)
# The clinical ward is four metres underground. The old bunker roof is below the island surface.
for child in hospital.children_recursive:child.location.z-=4.2
box(hospital,'FLOOR_surface entrance',(0,.04,17.5),(5.6,.16,5),iron)
box(hospital,'WALL_surface back',(0,1.45,15),(5.6,2.9,.18),iron)
for side in [-1,1]:
    box(hospital,'WALL_surface side',(side*2.72,1.45,17.5),(.16,2.9,5),iron)
    box(hospital,'surface door jamb',(side*1.18,1.42,20),(.2,2.84,.2),yellow)
box(hospital,'surface entrance roof',(0,2.98,17.5),(5.8,.2,5.2),rust)
box(hospital,'surface hatch',(0,.14,17.1),(2.1,.06,2),dark)
box(hospital,'surface hatch trim',(0,.18,17.1),(2.3,.05,.12),yellow)
box(hospital,'shelter 09 sign',(0,2.55,20.05),(3.4,.35,.06),blue)
box(hospital,'red hospital cross',(0,2.55,20.08),(.25,.25,.03),red)

def person(name,skin,coat,hair,headwear,accessory,height=1.72):
    root=asset(name)
    box(root,'boots L',(-.19,.11,0),(.24,.22,.4),dark)
    box(root,'boots R',(.19,.11,0),(.24,.22,.4),dark)
    box(root,'trousers L',(-.18,.58,0),(.25,.78,.29),iron)
    box(root,'trousers R',(.18,.58,0),(.25,.78,.29),iron)
    box(root,'jacket',(0,1.22,0),(.67,.83,.4),coat)
    for side in [-1,1]:
        box(root,'arm',(side*.47,1.21,0),(.2,.75,.25),coat)
        box(root,'hand',(side*.47,.77,0),(.18,.16,.22),skin)
    box(root,'neck',(0,1.69,0),(.16,.19,.17),skin)
    box(root,'face',(0,1.84,0),(.39,.42,.35),skin)
    box(root,'hair',(0,2.1,-.04),(.42,.17,.38),hair)
    if headwear=='cap':
        box(root,'cap crown',(0,2.16,0),(.51,.17,.43),coat)
        box(root,'cap brim',(0,2.1,.29),(.48,.05,.3),coat)
    elif headwear=='hood':
        box(root,'hood left',(-.24,1.91,0),(.12,.5,.42),coat)
        box(root,'hood right',(.24,1.91,0),(.12,.5,.42),coat)
    elif headwear=='bandana':box(root,'head band',(0,2.02,.18),(.45,.08,.07),accessory)
    if accessory:
        box(root,'chest strap',(0,1.25,.23),(.5,.1,.04),accessory)
    return root

medic=person('settler_medic',skin_dark,teal,hair_dark,'bandana',white)
box(medic,'medical satchel',(.56,.83,.22),(.42,.48,.28),white)
box(medic,'satchel red cross',(.56,.86,.38),(.22,.07,.02),red)
trader=person('settler_trader',skin_medium,purple,hair_brown,'hood',yellow)
box(trader,'trade pouch',(-.55,.78,.22),(.45,.45,.28),wood)
mechanic=person('settler_mechanic',skin_light,apron,hair_grey,'cap',yellow)
box(mechanic,'tool apron',(0,1.03,.29),(.5,.54,.08),rust)
guard=person('settler_guard',skin_dark,blue,hair_dark,'cap',cream)
box(guard,'shoulder armor',(-.5,1.5,0),(.4,.24,.47),iron)
box(guard,'shoulder armor',(.5,1.5,0),(.4,.24,.47),iron)
resident=person('settler_resident',skin_medium,canvas,hair_brown,'bandana',orange)
box(resident,'water carrier',(.58,.76,.12),(.35,.65,.35),blue)
nurse=person('settler_nurse',skin_light,white,hair_brown,'cap',teal)
box(nurse,'supply satchel',(-.56,.82,.18),(.36,.43,.27),teal)
box(nurse,'field mask',(0,1.8,.2),(.34,.13,.04),white)

assets=[home,workshop,market,hospital,medic,trader,mechanic,guard,resident,nurse]
for root in assets:
    bpy.ops.object.select_all(action='DESELECT')
    root.select_set(True)
    for child in root.children_recursive:child.select_set(True)
    bpy.context.view_layer.objects.active=root
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models'/f'{root.name}.glb'),use_selection=True,export_animations=False)
for i,root in enumerate(assets):root.location.x=(i%4)*22;root.location.y=(i//4)*22
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art'/'afterlight-southwest-settlement.blend'))
print('Created',len(assets),'original Blender assets for the southwest settlement')
