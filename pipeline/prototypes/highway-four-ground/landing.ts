import { cornerReach, type GroundYield } from '../../../web/src/terrain/surface-build';
import type { Build } from '../../../web/src/core/slice';

type Vertex = readonly [number, number, number];
const landingFloors = new WeakSet<GroundYield>();

interface LandingTriangle {
  way: number;
  points: readonly [Vertex, Vertex, Vertex];
}

/** Clip the board to each emitted approach plane. Lower-only carving blends
 * back into existing ground wherever that ground falls below the road. */
export function eastLandingYields(triangles: readonly LandingTriangle[]): GroundYield[] {
  const yields: GroundYield[] = [];
  for (const {way, points} of triangles) {
    if (way !== 38983384 && way !== 369529886 && way !== 38983378) continue;
    // Use the same vertex precision as the BufferGeometry on the GPU.
    const [a,b,c] = points.map(vertex => vertex.map(Math.fround));
    const bx = b[0]-a[0], bz = b[2]-a[2], cx = c[0]-a[0], cz = c[2]-a[2];
    const det = bx*cz-cx*bz;
    if (Math.abs(det) < 1e-6) continue;
    const dyX = ((b[1]-a[1])*cz-(c[1]-a[1])*bz)/det;
    const dyZ = (bx*(c[1]-a[1])-cx*(b[1]-a[1]))/det;
    const yieldFace: GroundYield = {
      ring: [a,b,c].map(([x,,z]) => [x,z]),
      floor: (x,z) => a[1]+dyX*(x-a[0])+dyZ*(z-a[2])-.002,
    };
    landingFloors.add(yieldFace);
    yields.push(yieldFace);
  }
  return yields;
}

// A clipped face can have zero area in double precision and acquire a thin
// footprint when its coordinates are uploaded as floats. Its unlowered boundary
// vertices then reappear above the tread. Seat those vertices on the same plane.
export function* seatLandingEdges(pos: number[], footprints: readonly GroundYield[]): Build<void> {
  const buckets = new Map<string, { face: GroundYield; minX: number; maxX: number; minZ: number; maxZ: number }[]>();
  const cell = (v: number) => Math.floor(v / 5);
  for (const face of footprints) {
    if (!landingFloors.has(face)) continue;
    const xs = face.ring.map(p => p[0]), zs = face.ring.map(p => p[1]);
    // The box a seated vertex must lie in. A sliver no wider than the tolerance also seats
    // vertices along its whole line, so it keeps no box.
    const [a, b, c] = face.ring;
    const cross = (b[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(b[1]-a[1]);
    const around = face.ring.reduce((sum, p, i) => sum + Math.hypot(face.ring[(i+1)%3][0]-p[0], face.ring[(i+1)%3][1]-p[1]), 0);
    const reach = Math.abs(cross)/around > .002 ? cornerReach(face.ring, Math.sign(cross)) : Infinity;
    const margin = reach*.001+1e-6;
    const boxed = { face, minX: Math.min(...xs)-margin, maxX: Math.max(...xs)+margin, minZ: Math.min(...zs)-margin, maxZ: Math.max(...zs)+margin };
    for (let i = cell(Math.min(...xs)-.001); i <= cell(Math.max(...xs)+.001); i++) {
      for (let j = cell(Math.min(...zs)-.001); j <= cell(Math.max(...zs)+.001); j++) {
        const key = i+','+j;
        const group = buckets.get(key);
        if (group) group.push(boxed);
        else buckets.set(key,[boxed]);
      }
    }
  }
  if (!buckets.size) return;
  for (let i=0; i<pos.length; i+=3) {
    if (i % 12288 === 12285) yield 'ground rows';
    const x = Math.fround(pos[i]), z = Math.fround(pos[i+2]);
    if (x < 1470 || x > 1545 || z < -6300 || z > -6190) continue;
    for (const { face, minX, maxX, minZ, maxZ } of buckets.get(cell(x)+','+cell(z)) ?? []) {
      if (x < minX || x > maxX || z < minZ || z > maxZ) continue;
      let positive = false, negative = false;
      const ring = face.ring;
      for (let j=0; j<ring.length; j++) {
        const a=ring[j], b=ring[(j+1)%ring.length];
        const dx=b[0]-a[0], dz=b[1]-a[1];
        const side=dx*(z-a[1])-dz*(x-a[0]);
        const tolerance=.001*Math.hypot(dx,dz);
        if (side>tolerance) positive=true;
        if (side< -tolerance) negative=true;
      }
      if (!(positive && negative)) pos[i+1]=Math.min(pos[i+1],face.floor(x,z));
    }
  }
}
