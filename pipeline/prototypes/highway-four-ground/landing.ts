import type { GroundYield } from '../../../web/src/terrain/surface-build';

type Vertex = readonly [number, number, number];
interface LandingTriangle {
  way: number;
  points: readonly [Vertex, Vertex, Vertex];
}

/** Clip the board to each emitted approach plane. Lower-only carving blends
 * back into existing ground wherever that ground falls below the road. */
export function eastLandingYields(triangles: readonly LandingTriangle[]): GroundYield[] {
  const yields: GroundYield[] = [];
  for (const {way, points} of triangles) {
    if (way !== 38983384 && way !== 369529886) continue;
    // Use the same vertex precision as the BufferGeometry on the GPU.
    const [a,b,c] = points.map(vertex => vertex.map(Math.fround));
    const bx = b[0]-a[0], bz = b[2]-a[2], cx = c[0]-a[0], cz = c[2]-a[2];
    const det = bx*cz-cx*bz;
    if (Math.abs(det) < 1e-6) continue;
    const dyX = ((b[1]-a[1])*cz-(c[1]-a[1])*bz)/det;
    const dyZ = (bx*(c[1]-a[1])-cx*(b[1]-a[1]))/det;
    yields.push({
      ring: [a,b,c].map(([x,,z]) => [x,z]),
      floor: (x,z) => a[1]+dyX*(x-a[0])+dyZ*(z-a[2])-.002,
    });
  }
  return yields;
}
