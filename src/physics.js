// Shared, deterministic capsule/box collision used by players, NPCs, and tests.
export const RADIUS=.28;
export const HEIGHT=1.72;
export const STEP=.26;

export function canOccupy(boxes,x,y,z,height=HEIGHT,radius=RADIUS,limit=145){
  if(Math.abs(x)>limit-radius||Math.abs(z)>limit-radius)return false;
  return !boxes.some(b=>x+radius>b.minX&&x-radius<b.maxX&&z+radius>b.minZ&&z-radius<b.maxZ&&y+height>b.minY+.015&&y+STEP<b.maxY);
}
export function floorHeight(floors,x,z,feet,radius=RADIUS){
  let floor=feet<-.5?-8:0;
  for(const b of floors)if(x+radius>b.minX&&x-radius<b.maxX&&z+radius>b.minZ&&z-radius<b.maxZ&&b.maxY<=feet+STEP+.01)floor=Math.max(floor,b.maxY);
  return floor;
}
// Recover positions embedded in scenery by loading, rebuilding a room, or falling.
export function nearestClearPosition(boxes,floors,p,limit=145,walkable=null){
  const clear=(x,y,z)=>canOccupy(boxes,x,y,z,HEIGHT,RADIUS,limit)&&(!walkable||walkable(x,z));
  if(clear(p.x,p.y,p.z))return {x:p.x,y:p.y,z:p.z};
  for(let radius=.4;radius<=4.01;radius+=.4){
    const count=Math.ceil(radius*16);
    for(let i=0;i<count;i++){
      const angle=i*2*Math.PI/count,x=p.x+Math.cos(angle)*radius,z=p.z+Math.sin(angle)*radius;
      const ground=floorHeight(floors,x,z,p.y);
      if(Math.abs(ground-p.y)>.4)continue;
      const y=Math.max(p.y,ground);
      if(clear(x,y,z))return {x,y,z};
    }
  }
  return null;
}
export function moveCapsule(boxes,floors,p,dx,dz,height=HEIGHT,limit=145,walkable=null){
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.12));
  for(let i=0;i<steps;i++){
    const nextX=p.x+dx/steps,nextZ=p.z+dz/steps;
    const stepX=Math.max(p.y,floorHeight(floors,nextX,p.z,p.y));
    if((!walkable||walkable(nextX,p.z))&&canOccupy(boxes,nextX,stepX,p.z,height,RADIUS,limit)){p.x=nextX;p.y=stepX;}
    const stepZ=Math.max(p.y,floorHeight(floors,p.x,nextZ,p.y));
    if((!walkable||walkable(p.x,nextZ))&&canOccupy(boxes,p.x,stepZ,nextZ,height,RADIUS,limit)){p.z=nextZ;p.y=stepZ;}
    const floor=floorHeight(floors,p.x,p.z,p.y);
    if(floor>p.y)p.y=floor;
  }
  return p;
}
export function segmentBlocked(a,b,boxes){
  // Slab intersection in all three dimensions, including floors and ceilings.
  for(const box of boxes){
    let near=.015,far=.985;
    for(const [axis,min,max] of [['x','minX','maxX'],['y','minY','maxY'],['z','minZ','maxZ']]){
      const d=b[axis]-a[axis];
      if(Math.abs(d)<1e-8){if(a[axis]<box[min]||a[axis]>box[max]){far=-1;break;}}
      else {const t1=(box[min]-a[axis])/d,t2=(box[max]-a[axis])/d;near=Math.max(near,Math.min(t1,t2));far=Math.min(far,Math.max(t1,t2));}
    }
    if(near<=far)return true;
  }
  return false;
}

export function findPath(boxes,start,goal,limit=11){
  const step=.65,key=(x,z)=>`${x},${z}`;
  const sx=Math.round(start.x/step),sz=Math.round(start.z/step),tx=Math.round(goal.x/step),tz=Math.round(goal.z/step);
  const open=[{x:sx,z:sz,g:0,f:0,parent:null}],best=new Map([[key(sx,sz),0]]);
  for(let iter=0;open.length&&iter<2500;iter++){
    open.sort((a,b)=>a.f-b.f);const n=open.shift();
    if(Math.hypot(n.x-tx,n.z-tz)<=1){const path=[{x:goal.x,z:goal.z}];for(let p=n;p.parent;p=p.parent)path.unshift({x:p.x*step,z:p.z*step});return path;}
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const x=n.x+dx,z=n.z+dz,g=n.g+1,k=key(x,z);
      if(g>=(best.get(k)??Infinity)||!canOccupy(boxes,x*step,0,z*step,HEIGHT,.3,limit))continue;
      best.set(k,g);open.push({x,z,g,f:g+Math.abs(tx-x)+Math.abs(tz-z),parent:n});
    }
  }
  return [];
}
