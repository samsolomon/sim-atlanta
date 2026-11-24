import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, litHash, seedOf } from './skin-kit';

export const wdGrantBuildingId = 'a9313126-a6d9-4c97-b401-93833c887542';
export const wdGrantRoof = 361.4; // NAVD88, from the 3DEP roof returns
export const wdGrantTop = 367.6;
const corniceTop = 362.8;
const origin: P2 = [117.93, -217.68];
const streetAxis: P2 = [36.33, 42.65];
const seed = seedOf(wdGrantBuildingId);
const stone = '#d5c8ad';
const trim = '#e2d6bf';
const glass = ['#737b80', '#777d80', '#7e858a'];
const occupancy = 0.08; // Illustrative, with no verified night observation.

/** 44 Broad Street. Photo and lidar evidence is in docs/log/ui/wd-grant-building/. */
export function createWdGrantBuilding(buildings: VBuilding[], grid: GroundGrid, quality: 'low' | 'high' = 'high') {
  const shell = landmarkShell(buildings, grid, wdGrantBuildingId, 'W. D. Grant Building',
    origin, streetAxis, [[5, 6], [51, 20], [27, 8]]);
  if (!shell) return null;

  const high = quality === 'high';
  // The staged outline starts at the Broad/Walton corner. Orient edges with the interior
  // on the left, as litFacade expects, regardless of the supplied ring winding.
  const area = shell.ring.reduce((sum, [x, z], i, ring) => {
    const [u, v] = ring[(i + 1) % ring.length];
    return sum + x * v - u * z;
  }, 0);
  const ring = area < 0 ? [...shell.ring].reverse() : shell.ring;
  const baseTop = 332.8;
  shell.prism(ring, shell.base, wdGrantRoof, '#a89a83', '#9d998d');

  ring.forEach((a, face) => {
    const b = ring[(face + 1) % ring.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length < 1) return;
    const ux = (b[0] - a[0]) / length, uz = (b[1] - a[1]) / length;
    const street = Math.max(a[1], b[1]) < 2 || Math.max(a[0], b[0]) < 2 || Math.min(a[0], b[0]) > 53;
    const at = (u: number, y: number, out: number) =>
      [a[0] + ux * u + uz * out, y, a[1] + uz * u - ux * out];
    const along = (u: number): P2 => [a[0] + ux * u, a[1] + uz * u];

    if (street) {
      // The stone elevation runs behind the sash and the two stringcourses.
      shell.body.quad(at(0, shell.base, 0.03), at(0, wdGrantRoof, 0.03),
        at(length, wdGrantRoof, 0.03), at(length, shell.base, 0.03), stone);
      for (const y of [baseTop, 357.0]) {
        shell.body.quad(at(0, y - 0.25, 0.09), at(0, y + 0.18, 0.09),
          at(length, y + 0.18, 0.09), at(length, y - 0.25, 0.09), trim);
      }
    }

    litFacade(shell, seed, face, a, b, baseTop + 0.5, wdGrantRoof - 0.85, 8,
      street ? 3.85 : 4.6, street ? 0.69 : 0.48, 0.69, glass, occupancy);
    if (!street) return;

    const middle = length / 2;
    const entryHalf = 1.8;
    const entryFoot = 322.2;
    const spring = 326.7;
    const archHeight = 1.55;
    const entry = '#747b7e';
    const drawEntry = litHash(seed, face, 20, 0) < occupancy ? shell.lights : shell.body;
    for (const [lo, hi] of [[0, middle - 2.25], [middle + 2.25, length]]) {
      litFacade(shell, seed, face + (lo === 0 ? 20 : 40), along(lo), along(hi),
        entryFoot - 0.2, baseTop - 0.45, 2, 3.85, 0.68, 0.86, glass, occupancy);
    }
    drawEntry.quad(at(middle - entryHalf, entryFoot, 0.08), at(middle - entryHalf, spring, 0.08),
      at(middle + entryHalf, spring, 0.08), at(middle + entryHalf, entryFoot, 0.08), entry);
    for (const sign of [-1, 1]) {
      const u = middle + sign * entryHalf;
      shell.body.quad(at(u, entryFoot, 0.13), at(u, spring, 0.13),
        at(u + sign * 0.38, spring, 0.13), at(u + sign * 0.38, entryFoot, 0.13), trim);
    }
    const segmentCount = high ? 8 : 4;
    const arch = (i: number, offset: number, out: number) => {
      const angle = Math.PI * i / segmentCount;
      return at(middle + (entryHalf + offset) * Math.cos(angle),
        spring + (archHeight + offset) * Math.sin(angle), out);
    };
    for (let i = 0; i < segmentCount; i++) {
      drawEntry.tri(at(middle, spring, 0.08), arch(i, 0, 0.08), arch(i + 1, 0, 0.08), entry);
      shell.body.quad(arch(i, 0, 0.13), arch(i, 0.38, 0.13),
        arch(i + 1, 0.38, 0.13), arch(i + 1, 0, 0.13), trim);
    }
  });

  // Offset the cornice through each corner so it makes a continuous roof silhouette.
  const cornice = ring.map(([x, z], i, r): P2 => {
    const [px, pz] = r[(i + r.length - 1) % r.length];
    const [nx, nz] = r[(i + 1) % r.length];
    const previous = Math.hypot(x - px, z - pz), next = Math.hypot(nx - x, nz - z);
    return [x + 0.51 * ((z - pz) / previous + (nz - z) / next),
      z - 0.51 * ((x - px) / previous + (nx - x) / next)];
  });
  ring.forEach(([x, z], i) => {
    const j = (i + 1) % ring.length;
    const [u, v] = ring[j];
    const [a, b] = cornice[i], [c, d] = cornice[j];
    const bottom = wdGrantRoof - 0.36;
    shell.body.quad([a, bottom, b], [a, corniceTop, b], [c, corniceTop, d], [c, bottom, d], trim);
    shell.body.quad([a, corniceTop, b], [x, corniceTop, z], [u, corniceTop, v], [c, corniceTop, d], '#a7a093');
    shell.body.quad([x, wdGrantRoof, z], [u, wdGrantRoof, v], [u, corniceTop, v], [x, corniceTop, z], '#9d998d');
    shell.body.quad([x, bottom, z], [a, bottom, b], [c, bottom, d], [u, bottom, v], trim);
  });
  shell.prism([[7, 16], [19, 16], [19, 19], [7, 19]], wdGrantRoof, wdGrantTop, '#a0937e', '#8c8678');
  shell.prism([[19, 13], [29, 13], [29, 16], [19, 16]], wdGrantRoof, 364.7, '#a0937e', '#8c8678');
  return shell.finish('#f4dcba', 0.48);
}
