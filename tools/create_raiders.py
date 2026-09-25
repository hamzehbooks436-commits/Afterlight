"""Three distinct Raider avatars, authored in the live Blender scene via Blender MCP."""
import bpy, math
from mathutils import Vector
from pathlib import Path
ROOT=Path(r'C:\Users\hamze\Home\Desktop\Folder_1\Post-Nuclear war game')
scene=bpy.data.scenes.new('Afterlight raider variants')
bpy.context.window.scene=scene

def mat(name,rgba,metal=0):
 m=bpy.data.materials.new('Raider / '+name);m.use_nodes=True
 node=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
 node.inputs['Base Color'].default_value=(*rgba,1);node.inputs['Metallic'].default_value=metal;node.inputs['Roughness'].default_value=.78
 m.diffuse_color=(*rgba,1);return m
black=mat('charcoal armor',(.065,.075,.067));steel=mat('worn steel',(.38,.38,.33),.7);skin=mat('skin',(.48,.31,.22));rust=mat('rust red',(.39,.16,.09));glass=mat('goggles',(.18,.27,.22),.25);cream=mat('bone paint',(.67,.62,.48))
variants=[('raider_scout',(.27,.28,.21),'hood'),('raider_guard',(.19,.22,.23),'helmet'),('raider_brute',(.3,.22,.16),'mask')]
def cube(name,loc,scale,material,parent):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material);o.parent=parent;return o
def tube(name,a,b,r,material,parent):
 a,b=Vector(a),Vector(b);d=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=r,depth=d.length,location=(a+b)/2);o=bpy.context.object;o.name=name;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.data.materials.append(material);o.parent=parent;return o
for name,color,style in variants:
 uniform=mat(name+' jacket',color)
 root=bpy.data.objects.new(name,None);scene.collection.objects.link(root)
 for x in [-.18,.18]:
  cube('cargo trousers',(x,0,.58),(.29,.37,.64),uniform,root);cube('heavy boot',(x,-.1,.16),(.35,.53,.31),black,root)
  cube('knee plate',(x,-.23,.47),(.25,.06,.16),steel,root)
 cube('layered torso',(0,0,1.18),(.72,.48,.77),uniform,root)
 cube('chest plate',(0,-.28,1.2),(.58,.11,.42),black if style!='brute' else steel,root)
 cube('belt',(0,0,.81),(.75,.52,.12),black,root)
 for x in [-.25,.25]:cube('ammo pouch',(x,-.31,.91),(.18,.14,.24),rust,root)
 cube('head',(0,-.03,1.72),(.47,.44,.47),skin,root)
 cube('face wrap',(0,-.28,1.62),(.48,.12,.2),black,root)
 cube('goggles',(0,-.31,1.79),(.46,.10,.14),glass,root)
 if style=='hood':
  cube('torn hood',(0,.06,1.98),(.6,.59,.23),uniform,root)
  cube('scarf tail',(-.3,.28,1.42),(.16,.16,.65),rust,root)
 elif style=='helmet':
  cube('ballistic helmet',(0,.03,2.03),(.61,.58,.25),steel,root)
  cube('helmet visor',(0,-.28,1.9),(.52,.13,.15),black,root)
  cube('radio aerial',(.27,.21,2.17),(.04,.04,.38),black,root)
 else:
  cube('reinforced mask',(0,-.34,1.64),(.5,.14,.27),steel,root)
  cube('shoulder plate left',(-.5,0,1.46),(.34,.59,.25),steel,root)
  cube('shoulder plate right',(.5,0,1.46),(.34,.59,.25),steel,root)
  cube('scar paint',(.2,-.39,1.58),(.05,.02,.26),rust,root)
 # Hands hold the weapon against the shoulder, with the muzzle pointing straight forward (-Y in Blender).
 tube('right sleeve',(.45,0,1.46),(.32,-.43,1.19),.15,uniform,root)
 tube('left sleeve',(-.45,0,1.46),(-.12,-.76,1.20),.15,uniform,root)
 cube('right glove',(.31,-.45,1.19),(.2,.25,.17),black,root)
 cube('left glove',(-.12,-.76,1.2),(.2,.23,.17),black,root)
 cube('rifle receiver',(.12,-.63,1.26),(.22,.72,.19),steel,root)
 cube('rifle stock',(.13,-.12,1.23),(.18,.52,.13),rust,root)
 cube('rifle magazine',(.12,-.66,1.09),(.14,.18,.29),black,root)
 tube('forward barrel',(.12,-.9,1.26),(.12,-1.5,1.26),.04,black,root)
 tube('muzzle brake',(.12,-1.46,1.26),(.12,-1.55,1.26),.066,steel,root)
 cube('sight',(.12,-1.04,1.37),(.09,.08,.09),black,root)
 bpy.ops.object.select_all(action='DESELECT')
 root.select_set(True)
 for o in root.children_recursive:o.select_set(True)
 bpy.context.view_layer.objects.active=root
 bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models'/f'{name}.glb'),use_selection=True,export_animations=False)
 print('Exported',name,len(root.children_recursive))
for x,name in [(-2.5,'raider_scout'),(0,'raider_guard'),(2.5,'raider_brute')]:bpy.data.objects[name].location.x=x
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/afterlight-raiders.blend'),copy=True)
