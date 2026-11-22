import { MathUtils } from 'three';
import type { GroundManifest } from '../terrain/grid';

type Bounds = GroundManifest['bounds'];
export const eastBounds: Bounds = { minX: 1000, maxX: 1800, minZ: 280, maxZ: 640 };
export const northBounds: Bounds = { minX: 1000, maxX: 1800, minZ: -520, maxZ: 280 };
export const northWestJoin = { x: northBounds.minX, minZ: northBounds.minZ, maxZ: northBounds.maxZ };
export const northSouthJoin = { z: northBounds.maxZ, minX: northBounds.minX, maxX: northBounds.maxX };
export function nearNorth(x: number, z: number) {
  return x >= northBounds.minX - 160 && x <= northBounds.maxX + 160 &&
    z >= northBounds.minZ - 100 && z <= northBounds.maxZ + 100;
}
export const eastJoin = { x: eastBounds.minX, minZ: eastBounds.minZ, maxZ: eastBounds.maxZ };

export function nearEast(x: number, z: number) {
  return (
    x >= eastBounds.minX - 160 &&
    x <= eastBounds.maxX + 160 &&
    z >= eastBounds.minZ - 100 &&
    z <= eastBounds.maxZ + 100
  );
}

/** Nearest point in the union of the two rectangles, including the two re-entrant corners. */
export function boardPoint(west: Bounds, joined: boolean, x: number, z: number, north = false) {
  const clamp = MathUtils.clamp;
  const wx = clamp(x, west.minX, west.maxX),
    wz = clamp(z, west.minZ, west.maxZ);
  if (joined && x > west.maxX) {
    const ex = clamp(x, eastBounds.minX, eastBounds.maxX),
      ez = clamp(z, north ? northBounds.minZ : eastBounds.minZ, eastBounds.maxZ);
    if (Math.hypot(x - ex, z - ez) < Math.hypot(x - wx, z - wz)) return { x: ex, z: ez };
  }
  return { x: wx, z: wz };
}
