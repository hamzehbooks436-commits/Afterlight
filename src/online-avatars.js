import * as THREE from 'three';

export class OnlineAvatars{
  constructor(world,uid){this.world=world;this.uid=uid;this.peers={};this.models=new Map();}
  setPeers(peers){this.peers=peers||{};}
  clear(){for(const model of this.models.values()){model.group.removeFromParent();model.label.material.map.dispose();model.label.material.dispose();model.label.geometry.dispose();model.ring.geometry.dispose();model.ring.material.dispose();}this.models.clear();}
  create(uid,peer){
    const group=new THREE.Group(),survivor=this.world.assets.survivor?.clone(true);
    if(survivor){survivor.scale.setScalar(.86);group.add(survivor);}
    const ring=new THREE.Mesh(new THREE.RingGeometry(.54,.61,32),new THREE.MeshBasicMaterial({color:0x6be4dc,side:THREE.DoubleSide,transparent:true,opacity:.8}));ring.rotation.x=-Math.PI/2;ring.position.y=.04;group.add(ring);
    const canvas=document.createElement('canvas');canvas.width=384;canvas.height=80;const context=canvas.getContext('2d');context.fillStyle='rgba(10,25,29,.82)';context.fillRect(0,0,384,80);context.font='bold 40px sans-serif';context.fillStyle='#c8f8ef';context.textAlign='center';context.textBaseline='middle';context.fillText(peer.name||'Survivor',192,42,350);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const label=new THREE.Mesh(new THREE.PlaneGeometry(2.8,.58),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide}));label.position.y=2.4;group.add(label);
    this.world.active.add(group);this.models.set(uid,{group,label,ring});return this.models.get(uid);
  }
  update(dt,zone){
    for(const [uid,model] of this.models)if(!this.peers[uid]||this.peers[uid].zone!==zone||Date.now()-this.peers[uid].at>20000||model.group.parent!==this.world.active){model.group.removeFromParent();this.models.delete(uid);}
    for(const [uid,peer] of Object.entries(this.peers)){
      if(uid===this.uid||peer.zone!==zone||Date.now()-peer.at>20000)continue;
      const model=this.models.get(uid)||this.create(uid,peer),p=model.group.position;
      if(!model.ready){p.set(peer.x,peer.y,peer.z);model.ready=true;}
      else p.lerp(new THREE.Vector3(peer.x,peer.y,peer.z),Math.min(1,dt*10));
      model.group.rotation.y=peer.yaw||0;model.label.rotation.y=-model.group.rotation.y;
    }
  }
}
