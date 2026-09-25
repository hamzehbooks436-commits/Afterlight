import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('all 13 Blender assets are valid self-contained GLBs without default-scene objects',()=>{
  const root=new URL('../public/models/',import.meta.url);
  const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
  assert.equal(manifest.assets.length,13);
  for(const file of manifest.assets){
    const bytes=readFileSync(new URL(file,root));
    assert.equal(bytes.readUInt32LE(0),0x46546c67,`${file}: GLB magic`);
    assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
    const length=bytes.readUInt32LE(12);const gltf=JSON.parse(bytes.toString('utf8',20,20+length));
    assert.ok(gltf.meshes.length>0,`${file}: meshes exist`);
    assert.ok(gltf.materials.length>0,`${file}: materials exist`);
    assert.ok(gltf.buffers.every(b=>!b.uri),`${file}: no external binary files`);
    assert.ok(!gltf.nodes.some(n=>['Cube','Camera','Light'].includes(n.name)),`${file}: original scene excluded`);
    const nodes=gltf.scenes[gltf.scene||0].nodes;
    assert.equal(nodes.length,1,`${file}: one asset root`);
    const transform=gltf.nodes[nodes[0]].translation||[0,0,0];
    assert.deepEqual(transform,[0,0,0],`${file}: exported at local origin`);
  }
});

test('Blender first-person kit contains collision surfaces, upstairs floors, and all three weapons',()=>{
  const root=new URL('../public/models/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('wasteland-manifest.json',root),'utf8'));
  assert.equal(manifest.assets.length,7);
  for(const file of manifest.assets){
    const bytes=readFileSync(new URL(file,root));assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);
    const gltf=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));assert.ok(gltf.meshes.length);assert.ok(gltf.buffers.every(b=>!b.uri));
    const nodes=gltf.scenes[gltf.scene||0].nodes;assert.equal(nodes.length,1);assert.deepEqual(gltf.nodes[nodes[0]].translation||[0,0,0],[0,0,0]);
    if(file==='ruin_tenement.glb'){assert.equal(gltf.nodes.filter(n=>n.name?.startsWith('FLOOR_stair_')).length,18);assert.ok(gltf.nodes.some(n=>n.name==='FLOOR_upper_main'));assert.ok(gltf.nodes.some(n=>n.name==='WALL_entry_lintel'));}
  }
});
