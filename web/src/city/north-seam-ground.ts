// Private mount helper. Call sync after both area.update calls and before render.
import type { BufferGeometry } from 'three';

const edgeZ = -5700;
type Vec = [number, number, number];
type Vertex = { i: number; y: number; faceSum: Vec; original: Vec };

function rim(geometry: BufferGeometry) {
  const pos = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
  const index = geometry.getIndex();
  if (!index) throw new Error('Expected indexed row terrain');
  const nodes = new Map<number, Vertex>();
  for (let i = 0; i < pos.count; i++) {
    if (pos.getZ(i) !== edgeZ) continue;
    const x = pos.getX(i);
    if (nodes.has(x)) throw new Error('Duplicate terrain rim vertex at ' + x);
    nodes.set(x, { i, y: pos.getY(i), faceSum: [0, 0, 0],
      original: [normal.getX(i), normal.getY(i), normal.getZ(i)] });
  }
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i), b = index.getX(i+1), c = index.getX(i+2);
    if (pos.getZ(a) !== edgeZ && pos.getZ(b) !== edgeZ && pos.getZ(c) !== edgeZ) continue;
    const ux = pos.getX(b)-pos.getX(a), uy = pos.getY(b)-pos.getY(a), uz = pos.getZ(b)-pos.getZ(a);
    const vx = pos.getX(c)-pos.getX(a), vy = pos.getY(c)-pos.getY(a), vz = pos.getZ(c)-pos.getZ(a);
    for (const id of [a,b,c]) {
      if (pos.getZ(id) !== edgeZ) continue;
      const sum = nodes.get(pos.getX(id))!.faceSum;
      sum[0] += uy*vz-uz*vy;
      sum[1] += uz*vx-ux*vz;
      sum[2] += ux*vy-uy*vx;
    }
  }
  return { pos, normal, index, nodes };
}

export function rowJoinNormals() {
  // Carving replaces attributes in-place on the existing geometry. LOD replaces
  // the geometry. Cache by position identity so a newly tessellated rim is read.
  const cache = new WeakMap<object, ReturnType<typeof rim>>();
  let previousA: ReturnType<typeof rim> | undefined, previousB: typeof previousA;
  function get(g: BufferGeometry) {
    const pos = g.getAttribute('position');
    let r = cache.get(pos);
    if (!r || r.normal !== g.getAttribute('normal') || r.index !== g.getIndex()) {
      r = rim(g);
      cache.set(pos, r);
    }
    return r;
  }
  function reset() {
    for (const r of [previousA, previousB]) {
      if (!r) continue;
      for (const v of r.nodes.values()) r.normal.setXYZ(v.i, ...v.original);
      r.normal.needsUpdate = true;
    }
    previousA = previousB = undefined;
  }
  return {
    reset,
    sync(north: BufferGeometry, south: BufferGeometry) {
      const a = get(north), b = get(south);
      if (previousA === a && previousB === b) return;
      reset();
      previousA = a;
      previousB = b;
      for (const [x, p] of a.nodes) {
        const q = b.nodes.get(x);
        if (!q || Math.abs(p.y - q.y) > .001) continue;
        const u = p.faceSum, v = q.faceSum;
        const nx = u[0]+v[0], ny = u[1]+v[1], nz = u[2]+v[2], len = Math.hypot(nx,ny,nz);
        if (!len) continue;
        a.normal.setXYZ(p.i,nx/len,ny/len,nz/len);
        b.normal.setXYZ(q.i,nx/len,ny/len,nz/len);
      }
      a.normal.needsUpdate = b.normal.needsUpdate = true;
    },
  };
}

type Visit = (ax:number,ay:number,az:number,bx:number,by:number,bz:number,cx:number,cy:number,cz:number)=>void;
type Triangles = {trianglesIn(x0:number,x1:number,z0:number,z1:number,visit:Visit):void};
type Ground = ((x:number,z:number)=>number|null) & { triangles?: Triangles };
type Bounds = { minX:number; maxX:number; minZ:number; maxZ:number };

/** Use the final drawn near surfaces for the shared building/yard stage after both rows mount. */
export function joinedPlacementGround(north: Ground, south: Ground, bounds: Bounds): Ground {
  const sample = (x:number, z:number) => {
    if (!(x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ)) return null;
    return (z < edgeZ ? north : south)(x,z);
  };
  const nt = north.triangles, st = south.triangles;
  if (!nt || !st) return sample;
  const triangles: Triangles = {
    trianglesIn(x0,x1,z0,z1,visit) {
      x0 = Math.max(x0,bounds.minX); x1 = Math.min(x1,bounds.maxX);
      z0 = Math.max(z0,bounds.minZ); z1 = Math.min(z1,bounds.maxZ);
      if (x0 >= x1 || z0 >= z1) return;
      if (z0 < edgeZ) nt.trianglesIn(x0,x1,z0,Math.min(z1,edgeZ),visit);
      if (z1 > edgeZ) st.trianglesIn(x0,x1,Math.max(z0,edgeZ),z1,visit);
    },
  };
  return Object.assign(sample,{triangles});
}
