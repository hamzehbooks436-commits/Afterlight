"""Original modular shelter kit, executed in live Blender through Blender MCP."""
import bpy, os, math, json, importlib.util
from mathutils import Quaternion
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec=importlib.util.spec_from_file_location('fallout_helpers',os.path.join(ROOT,'tools','create_wasteland.py'))
k=importlib.util.module_from_spec(spec);spec.loader.exec_module(k)
k.scene=bpy.data.scenes.get('Afterlight - Shelter Expansion') or bpy.data.scenes.new('Afterlight - Shelter Expansion')
bpy.context.window.scene=k.scene
k.assets=[o for o in k.scene.objects if o.type=='EMPTY' and o.get('authoring')]
for args in [('enamel','aec1b5',.25),('teal','426f69',.35),('linen','d2c9aa'),('leaf','73934b'),('soil','332b20'),('light','e3dab4',0,2),('screen','76d7c4',0,1.5)]:k.material(*args)
b=k.box;beam=k.beam

def shell():
    k.start('shelter_room')
    b('FLOOR_room',(0,-.12,0),(10,.24,12),'concrete')
    b('WALL_ceiling',(0,3.65,0),(10,.2,12),'concrete')
    for x in [-4.9,4.9]:b('WALL_side',(x,1.8,0),(.2,3.6,12),'plaster')
    b('WALL_back',(0,1.8,-5.9),(10,3.6,.2),'plaster')
    for x in [-3.1,3.1]:b('WALL_front',(x,1.8,5.9),(3.8,3.6,.2),'plaster')
    b('WALL_door_lintel',(0,3.2,5.9),(2.4,.8,.2),'steel')
    for x in [-1.3,1.3]:b('door_trim',(x,1.4,5.75),(.13,2.8,.3),'teal')
    for x in [-4.76,4.76]:
        b('painted_lower_wall',(x,.5,0),(.035,1,11.7),'teal')
        b('skirting',(x,.12,0),(.07,.16,11.7),'steel')
        for z in [-4,-1,2,5]:b('rib',(x,1.8,z),(.16,3.5,.18),'steel')
    for z in [-4,0,4]:
        b('ceiling_crossbeam',(0,3.4,z),(9.7,.2,.18),'steel')
        b('strip_light',(0,3.48,z),(2,.06,.3),'light')
    for x in [-3.7,3.7]:beam('ceiling_pipe',(x,3.22,-5.7),(x,3.22,5.7),.07,'rust',12)
    for x in range(-4,5):b('floor_seam',(x,.006,0),(.014,.008,11.8),'steel')
    for z in range(-5,6):b('floor_seam',(0,.006,z),(9.8,.008,.014),'steel')
    k.export()

def hospital():
    k.start('hospital_bed')
    b('WALL_bed_frame',(0,.56,0),(1.15,.15,2.3),'steel')
    b('mattress',(0,.72,0),(1.06,.25,2.1),'linen');b('pillow',(0,.9,-.72),(.85,.15,.42),'enamel')
    b('blanket',(0,.86,.4),(1.08,.06,1.15),'teal')
    for x in [-.48,.48]:
        for z in [-.9,.9]:beam('legs',(x,.1,z),(x,.55,z),.04,'steel',12)
        for z in [-1.1,1.1]:beam('bedposts',(x,.2,z),(x,1.15,z),.045,'enamel',12)
    for z in [-1.1,1.1]:beam('rail',(-.48,1.15,z),(.48,1.15,z),.04,'enamel',12)
    beam('iv_stand',(.85,0,-.5),(.85,2.2,-.5),.025,'steel',12)
    beam('iv_base',(.5,.08,-.5),(1.2,.08,-.5),.025,'steel',12)
    b('iv_bag',(.9,1.85,-.5),(.16,.32,.1),'enamel')
    b('monitor_case',(-.9,1.3,-.7),(.5,.45,.18),'steel');b('monitor_screen',(-.9,1.3,-.6),(.42,.34,.02),'screen')
    k.export()

def farm():
    k.start('hydroponic_rack')
    for x in [-1.4,1.4]:
        for z in [-.55,.55]:beam('rack_leg',(x,0,z),(x,2.5,z),.045,'steel',10)
    for y in [.65,1.65]:
        b('WALL_grow_tray',(0,y,0),(3,.18,1.2),'enamel');b('soil',(0,y+.1,0),(2.8,.04,1),'soil')
        b('grow_light',(0,y+.74,0),(2.6,.07,.12),'light')
        for x in [-1,-.5,0,.5,1]:
            for z in [-.28,.28]:
                beam('stem',(x,y+.1,z),(x,y+.48,z),.016,'leaf',6)
                for d in [-1,1]:
                    k.mesh('leaf',[(x,y+.2,z),(x+d*.24,y+.4,z-.09),(x+d*.31,y+.44,z),(x+d*.1,y+.4,z+.09)],[(0,1,2,3)],'leaf')
    beam('feed_pipe',(-1.5,.25,-.6),(1.5,.25,-.6),.065,'teal',12)
    k.export()

def kitchen():
    k.start('kitchen_range')
    b('WALL_cabinet',(0,.48,0),(3.4,.96,.85),'teal');b('counter',(0,1,0),(3.6,.12,1),'enamel')
    for x in [-1.1,0,1.1]:
        b('door',(x,.49,.44),(1.02,.82,.05),'enamel');beam('handle',(x-.2,.76,.49),(x+.2,.76,.49),.025,'steel',10)
    for x in [-1.1,-.45]:
        for z in [-.22,.22]:beam('burner',(x,1.06,z),(x,1.1,z),.17,'steel',16)
    beam('cooking_pot',(-1.1,1.1,.22),(-1.1,1.46,.22),.21,'steel',20)
    b('sink',(.9,1.07,0),(.8,.03,.62),'steel');beam('tap',(.9,1.1,-.35),(.9,1.55,-.35),.035,'steel',12)
    beam('tap_spout',(.9,1.55,-.35),(.9,1.55,-.05),.035,'steel',12)
    b('hood',(-.8,2.3,0),(1.8,.25,1),'steel');b('extractor',(-.8,2.8,-.2),(.6,.8,.45),'steel')
    k.export()

shell();hospital();farm();kitchen()
for i,a in enumerate(k.assets):a.location=(i*13,0,0)
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_distance=23
        area.spaces.active.region_3d.view_location=(15,0,1)
        area.spaces.active.region_3d.view_rotation=Quaternion((.83,.42,.16,.32)).normalized()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'art','afterlight-shelter.blend'))
with open(os.path.join(ROOT,'public','models','shelter-manifest.json'),'w') as f:json.dump({'authoring':'Original assets made through live Blender MCP','assets':[a.name+'.glb' for a in k.assets]},f,indent=2)
print('Shelter kit complete:',len(k.assets),'assets')
