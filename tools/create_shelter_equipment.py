"""Blender MCP authored Shelter 07 lift, airlock, radio room and reactor."""
import bpy,math
from mathutils import Vector
from pathlib import Path
ROOT=Path(r'C:\Users\hamze\Home\Desktop\Folder_1\Post-Nuclear war game')
old=bpy.data.scenes.get('Shelter 07 lift and reactor')
if old:
 bpy.context.window.scene=next(s for s in bpy.data.scenes if s!=old)
 for obj in list(old.objects):bpy.data.objects.remove(obj,do_unlink=True)
 bpy.data.scenes.remove(old)
scene=bpy.data.scenes.new('Shelter 07 lift and reactor')
bpy.context.window.scene=scene

def mat(name,rgb,metal=0,glow=0):
 m=bpy.data.materials.new('Shelter equipment / '+name);m.use_nodes=True
 p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
 p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=.68
 if glow:p.inputs['Emission Color'].default_value=(*rgb,1);p.inputs['Emission Strength'].default_value=glow
 m.diffuse_color=(*rgb,1);return m
iron=mat('painted iron',(.29,.33,.29),.65);steel=mat('brushed steel',(.48,.48,.41),.8);rust=mat('oxidized copper',(.35,.2,.12),.6);amber=mat('warm indicator',(.92,.54,.19),0,2);black=mat('dark controls',(.07,.08,.07));cream=mat('stencil paint',(.65,.59,.4))
concrete=mat('sealed concrete',(.32,.34,.32));sage=mat('sage enamel',(.24,.39,.35),.35);ivory=mat('warm enamel',(.68,.67,.59),.2);hazard=mat('safety yellow',(.85,.61,.2),.1);red=mat('emergency red',(.7,.16,.12),.15,1.2);glass=mat('dark glass',(.055,.14,.14),.35);cyan=mat('indicator cyan',(.24,.8,.75),0,2)
wood=mat('reclaimed oak',(.39,.28,.17));linen=mat('table runner',(.62,.58,.45))
def cube(root,name,loc,size,material):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material);o.parent=root;return o
def tube(root,name,a,b,r,material):
 a,b=Vector(a),Vector(b);d=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=r,depth=d.length,location=(a+b)/2);o=bpy.context.object;o.name=name;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.data.materials.append(material);o.parent=root;return o
def gamebox(root,name,loc,size,material):
 x,y,z=loc;w,h,d=size
 return cube(root,name,(x,-z,y),(w,d,h),material)
def gametube(root,name,a,b,r,material):
 return tube(root,name,(a[0],-a[2],a[1]),(b[0],-b[2],b[1]),r,material)
def new_asset(name):
 root=bpy.data.objects.new(name,None);scene.collection.objects.link(root);root['authoring']='Original Shelter 07 architecture made through Blender MCP';return root
def export(root):
 bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
 for o in root.children_recursive:o.select_set(True)
 bpy.context.view_layer.objects.active=root
 bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models'/f'{root.name}.glb'),use_selection=True,export_animations=False)
 print('Exported',root.name,len(root.children_recursive))
root=new_asset('shelter_lift')
# A finished shaft enclosure: the lift is entered from the reception floor at +Z.
gamebox(root,'FLOOR_lift sill',(0,.025,1.23),(3.2,.05,.38),steel)
gamebox(root,'lift rear concrete',(0,1.8,-1.16),(3.28,3.6,.28),concrete)
for x in [-1.57,1.57]:
 gamebox(root,'WALL_lift side',(x,1.8,-.06),(.18,3.6,2.38),concrete)
 gamebox(root,'sage side panel',(x*.94,1.7,-.02),(.06,3.12,2.05),sage)
 gamebox(root,'front jamb',(x,1.66,1.17),(.33,3.32,.28),steel)
 gamebox(root,'amber door reveal',(x*.89,1.67,1.33),(.045,3.14,.04),amber)
 gamebox(root,'lower bumper',(x, .2,1.35),(.28,.16,.14),hazard)
gamebox(root,'overhead beam',(0,3.35,1.17),(3.28,.55,.32),steel)
gamebox(root,'header inset',(0,3.35,1.35),(1.8,.34,.05),black)
gamebox(root,'ceiling hood',(0,3.54,.12),(3.28,.12,2.46),concrete)
for x in [-.58,.58]:
 gamebox(root,'lift leaf',(x,1.67,1.22),(1.13,2.95,.12),iron)
 gamebox(root,'door lower armor',(x,.47,1.3),(1.02,.52,.025),steel)
 gamebox(root,'door upper window',(x,2.42,1.3),(.7,.35,.025),glass)
 for yy in [.35,2.95]:gamebox(root,'door fastener',(x,yy,1.32),(.065,.065,.02),cream)
gamebox(root,'door center seal',(0,1.67,1.32),(.055,2.95,.025),black)
gamebox(root,'floor display',(0,3.35,1.39),(.22,.21,.025),cyan)
gamebox(root,'control pedestal',(1.85,1.18,1.16),(.42,2.12,.42),iron)
gamebox(root,'control face',(1.85,1.44,1.39),(.32,1.36,.035),black)
for i in range(9):gamebox(root,'floor key',(1.85,.9+i*.11,1.42),(.18,.045,.015),amber if i==0 else ivory)
gamebox(root,'call light',(1.85,1.95,1.42),(.17,.1,.02),cyan)
export(root)
root=new_asset('shelter_airlock')
# Portal geometry overlaps the actual end wall; no floating door slab.
for x in [-1.72,1.72]:
 gamebox(root,'bulkhead pier',(x,1.83,0),(.47,3.66,.84),concrete)
 gamebox(root,'inner steel jamb',(x*.86,1.56,-.44),(.18,3.12,.15),steel)
 gamebox(root,'yellow hazard stripe',(x*.84,.15,-.54),(.15,.12,.04),hazard)
gamebox(root,'bulkhead head',(0,3.35,0),(3.7,.65,.84),concrete)
gamebox(root,'bulkhead sill',(0,.09,0),(3.7,.18,.84),steel)
gamebox(root,'door leaf',(0,1.64,.04),(2.92,2.96,.24),iron)
gamebox(root,'door inset',(0,1.7,-.104),(2.52,2.5,.045),sage)
gamebox(root,'door armor',(0,.55,-.14),(2.48,.58,.03),steel)
gamebox(root,'view slit',(0,2.36,-.146),(1.18,.22,.02),glass)
for x in [-1.22,1.22]:
 for yy in [.39,1.25,2.14,2.9]:gamebox(root,'latch rivet',(x,yy,-.15),(.08,.08,.03),ivory)
gamebox(root,'seal housing',(0,3.04,-.18),(2.5,.13,.08),black)
gamebox(root,'status strip',(0,3.04,-.23),(1.52,.045,.02),cyan)
gamebox(root,'airlock console',(2.2,1.35,-.68),(.52,1.5,.28),steel)
gamebox(root,'airlock screen',(2.2,1.61,-.84),(.35,.32,.025),glass)
gamebox(root,'airlock ready lamp',(2.2,1.18,-.84),(.22,.1,.025),amber)
for x in [-1.5,1.5]:gametube(root,'pressure line',(x,3.1,-.72),(x,3.1,-1.8),.07,steel)
export(root)
root=new_asset('shelter_reception')
# Only ceiling and floor details: no railings or blue half walls around the lift.
for x in [-9.8,-5.2,-.6,4,8.5]:
 gamebox(root,'ceiling cassette',(x,3.47,0),(3.7,.12,1.45),black)
 gamebox(root,'diffused downlight',(x,3.38,0),(2.8,.025,.35),ivory)
for z in [-11,-7,-3,1,5,9]:
 gamebox(root,'central floor guide',(0,.012,z),(1.9,.012,.055),hazard)
gamebox(root,'reception line left',(-2,.013,0),(.045,.015,22),cream)
gamebox(root,'reception line right',(2,.013,0),(.045,.015,22),cream)
export(root)
root=new_asset('shelter_radio_room')
# Eight by twelve metre communications room, entered through a central door.
gamebox(root,'WALL_radio_partition',(-4,1.8,0),(.22,3.6,12),concrete)
for x in [-2.63,2.63]:gamebox(root,'WALL_radio_entry',(x,1.8,5.94),(2.74,3.6,.18),concrete)
gamebox(root,'WALL_radio_lintel',(0,3.3,5.94),(2.52,.6,.22),steel)
for x in [-1.3,1.3]:gamebox(root,'radio door jamb',(x,1.5,5.84),(.17,3,.2),steel)
gamebox(root,'radio threshold',(0,.045,5.88),(2.55,.09,.38),hazard)
gamebox(root,'rear acoustic panel',(0,1.77,-5.83),(7.6,3.28,.08),sage)
for x in [-3.45,3.45]:
 gamebox(root,'wall acoustic panel',(x,1.72,-5.75),(.42,2.65,.11),black)
 for z in [-4.6,-2.4,-.2,2,4.2]:gamebox(root,'sound baffle',(x,2.55,z),(.12,1.1,.7),black)
for z in [-4,0,4]:
 gamebox(root,'ceiling beam',(0,3.46,z),(7.5,.16,.22),steel)
 gamebox(root,'linear light',(0,3.36,z),(4.7,.035,.15),ivory)
for x in [-3.4,3.4]:gametube(root,'overhead conduit',(x,3.35,-5.4),(x,3.35,5.3),.06,steel)
# The special feature is a backlit signal atlas with three concentric scan rings.
gamebox(root,'signal atlas frame',(0,2.08,-5.67),(5.8,2.35,.18),black)
gamebox(root,'signal atlas glass',(0,2.08,-5.54),(5.4,1.95,.025),glass)
for radius in [.42,.83,1.24]:
 for j in range(32):
  a=j*math.tau/32;b=(j+1)*math.tau/32
  gametube(root,'signal scan ring',(1.15+radius*math.cos(a),2.04+radius*math.sin(a),-5.51),(1.15+radius*math.cos(b),2.04+radius*math.sin(b),-5.51),.015,cyan if radius<1 else amber)
for x,y in [(-1.9,1.7),(-1.1,2.35),(.1,1.56),(2.35,2.62)]:
 gamebox(root,'signal waypoint',(x,y,-5.49),(.085,.085,.025),amber)
gamebox(root,'atlas title strip',(-1.5,2.98,-5.49),(2.1,.075,.025),ivory)
# Built-in operator counter: radio, map and duty controls are placed here in game.
gamebox(root,'WALL_operator desk',(0,.7,-3.35),(5.7,1.4,.9),iron)
gamebox(root,'operator worktop',(0,1.43,-3.35),(5.95,.13,1.08),ivory)
for x in [-2.3,2.3]:
 gamebox(root,'console deck',(x,1.57,-3.52),(1.05,.18,.55),black)
 gamebox(root,'console display',(x,1.76,-3.7),(.62,.35,.05),cyan)
for x in [-1.8,-.9,0,.9,1.8]:gamebox(root,'control key',(x,1.55,-2.89),(.34,.035,.1),amber)
gamebox(root,'radio transmitter body',(0,1.77,-3.48),(1.12,.55,.52),black)
gamebox(root,'radio frequency display',(0,1.83,-3.19),(.65,.18,.025),cyan)
for x in [-.4,.4]:gamebox(root,'radio tuning dial',(x,1.62,-3.19),(.16,.11,.03),ivory)
gametube(root,'radio aerial',(.42,2.02,-3.65),(.62,3.05,-3.8),.025,steel)
for x in [-2.65,2.65]:
 gamebox(root,'equipment rack',(x,1.15,.5),(.7,2.3,1.8),iron)
 for yy in [.42,.77,1.12,1.47,1.82]:
  gamebox(root,'receiver shelf',(x,yy,1.46),(.57,.22,.045),black)
  gamebox(root,'receiver lamp',(x-.17,yy,1.49),(.08,.055,.02),cyan)
for x in [-3.84,3.84]:
 gamebox(root,'wall planning console',(x,1.66,1.55),(.12,1.55,1.8),black)
 for z in [.95,1.55,2.15]:gamebox(root,'planning status lamp',(x*.98,1.75,z),(.035,.12,.25),amber if z<1.5 else cyan)
gamebox(root,'room entry light',(0,3.06,5.79),(.75,.12,.035),amber)
export(root)
root=new_asset('shelter_computer_station')
# Beige CRT workstation with a recognizable late-1990s desktop and proper desk.
gamebox(root,'WALL_computer desk',(0,.68,0),(2.3,1.36,1.05),iron)
gamebox(root,'desk top',(0,1.4,0),(2.45,.12,1.18),ivory)
for x in [-1.08,1.08]:gamebox(root,'desk edge',(x,.72,.49),(.11,1.3,.08),steel)
gamebox(root,'tower case',(.88,1.84,-.18),(.42,.7,.56),ivory)
gamebox(root,'tower slot',(.88,2.01,.105),(.24,.04,.02),black)
gamebox(root,'tower power',(.88,1.69,.105),(.07,.07,.02),cyan)
gamebox(root,'CRT stand',(-.28,1.54,-.31),(.35,.18,.27),steel)
gamebox(root,'CRT lower shell',(-.28,1.76,-.34),(1.05,.32,.68),ivory)
gamebox(root,'CRT display shell',(-.28,2.13,-.39),(1.13,.85,.45),ivory)
gamebox(root,'CRT bezel',(-.28,2.13,-.11),(.98,.68,.035),black)
gamebox(root,'desktop screen',(-.28,2.14,-.083),(.84,.54,.02),sage)
gamebox(root,'desktop taskbar',(-.28,1.91,-.065),(.82,.07,.02),steel)
gamebox(root,'desktop titlebar',(-.35,2.3,-.065),(.64,.055,.02),cyan)
for x in [-.57,-.34,-.11]:gamebox(root,'desktop icon',(x,2.16,-.063),(.065,.075,.02),ivory)
gamebox(root,'CRT power',(.17,1.77,-.08),(.045,.045,.025),amber)
gamebox(root,'keyboard base',(-.33,1.51,.33),(1.18,.1,.39),ivory)
for x in [-.8,-.6,-.4,-.2,0,.2]:
 for z in [.22,.36]:gamebox(root,'keyboard key',(x,1.57,z),(.14,.02,.075),cream)
gamebox(root,'mouse',(.55,1.51,.38),(.16,.08,.23),ivory)
gamebox(root,'chair seat',(0,.53,1.14),(.8,.12,.64),black)
gamebox(root,'chair back',(0,1.12,1.46),(.85,1.08,.12),black)
gametube(root,'chair stem',(0,.08,1.13),(0,.52,1.13),.055,steel)
export(root)
root=new_asset('shelter_server_rack')
gamebox(root,'WALL_server cabinet',(0,1.35,0),(1.1,2.7,.85),black)
gamebox(root,'server side panel',(-.53,1.35,0),(.04,2.57,.8),steel)
gamebox(root,'server side panel',(.53,1.35,0),(.04,2.57,.8),steel)
for yy in [.38,.7,1.02,1.34,1.66,1.98,2.3]:
 gamebox(root,'server drawer',(0,yy,.445),(.94,.24,.04),iron)
 for x in [-.34,-.21]:gamebox(root,'server LED',(x,yy,.475),(.045,.04,.02),cyan if yy>1.3 else amber)
gamebox(root,'server vent',(0,2.58,.44),(.7,.055,.04),steel)
export(root)
root=new_asset('shelter_mess_table')
# One coherent kitchen furnishing: a sturdy communal table and two matched benches.
gamebox(root,'oak table top',(0,.82,0),(3.35,.16,1.28),wood)
gamebox(root,'inset table runner',(0,.915,0),(2.75,.025,.42),linen)
for x in [-1.42,1.42]:
 for z in [-.43,.43]:gamebox(root,'table leg',(x,.39,z),(.17,.78,.17),steel)
for z in [-1.14,1.14]:
 gamebox(root,'bench seat',(0,.46,z),(2.95,.13,.38),wood)
 gamebox(root,'bench support',(0,.4,z),(2.55,.08,.14),steel)
 for x in [-1.25,1.25]:gamebox(root,'bench leg',(x,.21,z),(.13,.42,.13),steel)
for x in [-.8,.8]:
 gamebox(root,'enamel plate',(x,.945,0),(.36,.025,.31),ivory)
 gamebox(root,'tin cup',(x+.32,.97,-.18),(.11,.1,.11),steel)
gamebox(root,'shared lamp base',(0,.96,0),(.17,.07,.17),iron)
gamebox(root,'shared lamp glow',(0,1.07,0),(.14,.16,.14),amber)
export(root)
root=bpy.data.objects.new('shelter_reactor',None);scene.collection.objects.link(root)
cube(root,'reactor footing',(0,0,.15),(3.2,3.0,.3),steel)
for x in [-1.1,1.1]:
 for y in [-1.1,1.1]:cube(root,'shield pillar',(x,y,1.3),(.27,.27,2.4),iron)
for z in [.65,1.45,2.3]:
 bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.78,depth=.28,location=(0,0,z));o=bpy.context.object;o.name='containment ring';o.data.materials.append(steel);o.parent=root
bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.62,depth=2.0,location=(0,0,1.45));o=bpy.context.object;o.name='shielded reactor vessel';o.data.materials.append(iron);o.parent=root
for x in [-.64,.64]:
 cube(root,'observation panel',(x,-.62,1.5),(.11,.065,1.42),amber)
 tube(root,'coolant pipe',(x,-.1,2.35),(x,-.1,2.95),.11,rust)
 tube(root,'coolant return',(x,-.1,.5),(x,-1.28,.5),.09,rust)
for x in [-.45,0,.45]:cube(root,'control meter',(x,-1.4,1.05),(.28,.08,.23),amber)
cube(root,'control bench',(0,-1.3,.65),(1.8,.5,.75),iron)
cube(root,'warning stripe',(0,-1.48,.3),(1.8,.05,.07),cream)
export(root)
# Spread the two assets in the editable workshop without changing export origins.
bpy.data.objects['shelter_lift'].location.x=-15
bpy.data.objects['shelter_airlock'].location.x=-9
bpy.data.objects['shelter_reception'].location.x=8
bpy.data.objects['shelter_radio_room'].location.x=18
bpy.data.objects['shelter_computer_station'].location.x=30
bpy.data.objects['shelter_server_rack'].location.x=34
bpy.data.objects['shelter_mess_table'].location.x=39
bpy.data.objects['shelter_reactor'].location.x=45
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/afterlight-shelter-equipment.blend'),copy=True)
