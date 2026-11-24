import * as THREE from 'three';
import type { Builder, P2 } from '../vignette/geom';
import { g0, type Ground } from './primitives';

/**
 * Park furniture as reusable low-poly pieces, sized from Piedmont Park photographs
 * (dimensions estimated). Each piece stands at a point on the ground and faces `facing`
 * (radians, measured like Math.atan2(dz, dx): the direction its front looks toward).
 *
 *   bench(b, [x, z], ground, angle);
 *
 * Models are illustrative; where a caller places them from mapped points, positions are reported.
 */
export type FurnitureKind = 'bench' | 'bin' | 'fountain' | 'grill' | 'picnic' | 'kiosk';

const IRON = '#1f2224', SLAT = '#7a5a3e', BIN = '#2b3a30', FOUNTAIN = '#2f4236', BOWL = '#9aa3a0';
const GRILL = '#262626', WOOD = '#8a6a4a', PANEL = '#26282a', MAP = '#e6e0cf', MAP_PARK = '#9fba86', MAP_LAKE = '#86a9bd';

/** A frame at (x, z) on the ground: local +z is the piece's front, local +x its right. */
function frame(at: P2, ground: Ground, facing: number) {
  const y = g0(ground, ...at);
  // Local +z must point along `facing` in world x/z.
  const m = new THREE.Matrix4().compose(new THREE.Vector3(at[0], y, at[1]),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2 - facing), new THREE.Vector3(1, 1, 1));
  return (b: Builder, w: number, h: number, l: number, x: number, yy: number, z: number, color: string) => b.box(w, h, l, x, yy, z, color, m);
}

/** A 1.8 m park bench: black cast-iron ends, wood seat slats and backrest, seat 0.45 m up. */
export function bench(b: Builder, at: P2, ground: Ground, facing = 0) {
  const box = frame(at, ground, facing);
  for (const x of [-.82, .82]) {
    box(b, .07, .45, .5, x, .225, 0, IRON);
    box(b, .07, .5, .07, x, .68, -.24, IRON);
  }
  box(b, 1.8, .05, .46, 0, .45, 0, SLAT);
  box(b, 1.8, .26, .04, 0, .74, -.25, SLAT);
}

/** A slatted litter bin, 0.55 m across and 0.9 m tall, as an octagonal drum. */
export function bin(b: Builder, at: P2, ground: Ground) {
  const y = g0(ground, ...at), r = .28, h = .9;
  const ring = Array.from({ length: 8 }, (_, i) => [at[0] + Math.cos(i * Math.PI / 4) * r, at[1] + Math.sin(i * Math.PI / 4) * r]);
  for (let i = 0; i < 8; i++) {
    const [ax, az] = ring[i], [cx, cz] = ring[(i + 1) % 8];
    b.quad([ax, y - .05, az], [cx, y - .05, cz], [cx, y + h, cz], [ax, y + h, az], BIN);
    b.tri([at[0], y + h + .03, at[1]], [cx, y + h, cz], [ax, y + h, az], IRON);
  }
}

/** A pedestal drinking fountain: a 0.3 m post to a bowl at 0.9 m. */
export function fountain(b: Builder, at: P2, ground: Ground, facing = 0) {
  const box = frame(at, ground, facing);
  box(b, .28, .82, .28, 0, .41, 0, FOUNTAIN);
  box(b, .46, .1, .4, 0, .87, .04, BOWL);
}

/** A charcoal grill on a post: a 0.6 m firebox at 0.8 m. */
export function grill(b: Builder, at: P2, ground: Ground, facing = 0) {
  const box = frame(at, ground, facing);
  box(b, .09, .7, .09, 0, .35, 0, GRILL);
  box(b, .6, .22, .4, 0, .8, 0, GRILL);
}

/** A picnic table: 1.8 m top at 0.75 m, with a bench each side. */
export function picnicTable(b: Builder, at: P2, ground: Ground, facing = 0) {
  const box = frame(at, ground, facing);
  box(b, 1.8, .05, .75, 0, .75, 0, WOOD);
  for (const z of [-.62, .62]) box(b, 1.8, .05, .26, 0, .45, z, WOOD);
  for (const x of [-.7, .7]) box(b, .08, .72, 1.4, x, .36, 0, IRON);
}

/** A park map kiosk: a dark 1.3 × 1.6 m framed panel on two posts, the map face toward `facing`. No text or logos. */
export function kiosk(b: Builder, at: P2, ground: Ground, facing = 0) {
  const box = frame(at, ground, facing);
  for (const x of [-.72, .72]) box(b, .1, 2.3, .1, x, 1.15, 0, PANEL);
  box(b, 1.34, 1.6, .1, 0, 1.4, 0, PANEL);
  // A cream map sheet with the park's green and its lake, so it never reads as an empty frame against the lawn.
  box(b, 1.14, 1.36, .02, 0, 1.4, .06, MAP);
  box(b, .7, .9, .01, -.1, 1.38, .075, MAP_PARK);
  box(b, .26, .22, .01, -.02, 1.5, .082, MAP_LAKE);
  box(b, 1.5, .1, .2, 0, 2.3, 0, PANEL);
}

export const FURNITURE: Record<FurnitureKind, (b: Builder, at: P2, ground: Ground, facing?: number) => void> = {
  bench, bin, fountain, grill, picnic: picnicTable, kiosk,
};
