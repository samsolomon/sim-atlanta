import type { BufferAttribute } from 'three';

// Interpolate on the same triangle as the GPU. A bridge end can be banked on
// one edge, so interpolating across its full quad would give a different height.
export function triangleHeight(p: BufferAttribute, i: number, x: number, z: number) {
  const ax = p.getX(i),
    az = p.getZ(i);
  const bx = p.getX(i + 1) - ax,
    bz = p.getZ(i + 1) - az;
  const cx = p.getX(i + 2) - ax,
    cz = p.getZ(i + 2) - az;
  const det = bx * cz - bz * cx;
  if (Math.abs(det) < 1e-8) return null;
  const u = ((x - ax) * cz - (z - az) * cx) / det;
  const v = (bx * (z - az) - bz * (x - ax)) / det;
  // GPU vertex positions are float32; a source edge at City kilometre scale
  // can round tens of micrometres away from its double-precision query.
  const eps = 0.0001 / Math.abs(det);
  if (
    u < -eps * Math.hypot(cx, cz) ||
    v < -eps * Math.hypot(bx, bz) ||
    u + v > 1 + eps * Math.hypot(cx - bx, cz - bz)
  )
    return null;
  return (1 - u - v) * p.getY(i) + u * p.getY(i + 1) + v * p.getY(i + 2);
}
