import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { along, faces, litHash, outwardSign, seedOf, wound } from './skin-kit';

export const regionsPlazaId = 'osm:way:269843399';
const origin: P2 = [303.9, -3678.6];

// Regions Plaza (1180 West Peachtree, 2001): a square stone-and-glass office tower with notched
// corners, an arched top storey and a truncated hip roof. Heights are the April 2019 lidar per
// mapped part: notched corners 84.4 m, main parapet 96.8 m, hip roof flat at about 104 m.
const W = 24.8, D = 21.8; // half-widths of the plan (x east, z south) about the origin
const notchX = 10.1, notchZ = 7.4; // the corner notches, from the mapped corner parts
const corner = 84.4, parapet = 96.8, hipTop = 104, rail = 105.2;
// The facade, counted from the photos (see docs/log/ui/regions-plaza/README.md): a base about five
// storeys tall (the arched lobby, then a row of small square windows), and above it five tiers of
// three office floors each, every tier framed by a stone spandrel band. Each structural bay holds a
// pair of tall multi-pane windows.
const base = 20.4, tiers = 5, perTier = 3, tier = (corner - base) / tiers, storey = tier / perTier;
const bay = 7.1, win = 2.35, mullion = 0.55;

// The stone is a pale, near-neutral ivory: in a 2014 photo with both towers in the same sun it reads
// lighter and much greyer than One Atlantic Center's pink granite (#ccaea0 there), and its shaded
// face reads neutral grey at golden hour. Exported for the test.
export const regionsStone = '#ddd6cc';
const stoneShade = '#cfc8be', band = '#ebe6dd';
// Glass base #737c86: HSV saturation 14%, value 53%, near-neutral as the glass rules ask for dark
// glass. The light frames and stone gaps between panes keep the facade reading lighter than its
// neighbour's dark strips.
const glass = ['#737c86', '#707983', '#76808a'];
// The hip roof is cool slate-grey standing-seam metal (2014 and 2025 photos), not copper.
export const regionsRoof = '#6b7378';
const roofDeck = '#5e6569';

export function createRegionsPlaza(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const shell = landmarkShell(buildings, grid, site.id, 'Regions Plaza', origin, [1, 0], [[0, 0], [-20, -18], [20, 18]]);
  if (!shell) return null;
  const floor = site.floorY === undefined ? shell.base + 0.35 : site.floorY + grid.manifest.vertical.sceneZeroNavd88M;
  const footing = Math.min(floor, shell.base) - 0.65;
  const { body, lights } = shell;
  const seed = seedOf(site.id);

  const box: P2[] = wound([[-W, -D], [W, -D], [W, D], [-W, D]], 1);
  // The cross: the box with its four corners notched out above the corner roofs.
  const cross: P2[] = wound([
    [-W + notchX, -D], [W - notchX, -D], [W - notchX, -D + notchZ], [W, -D + notchZ],
    [W, D - notchZ], [W - notchX, D - notchZ], [W - notchX, D], [-W + notchX, D],
    [-W + notchX, D - notchZ], [-W, D - notchZ], [-W, -D + notchZ], [-W + notchX, -D + notchZ],
  ], 1);
  const out = outwardSign(box);

  shell.prism(box, footing, floor + corner, regionsStone, stoneShade);
  shell.prism(cross, floor + corner, floor + parapet, regionsStone, stoneShade);

  const pane = (a: P2, b: P2, length: number, u0: number, u1: number, y0: number, y1: number, lit: boolean, color: string) => {
    const p = along(a, b, length, u0, 0.07 * out), q = along(a, b, length, u1, 0.07 * out);
    (lit ? lights : body).quad([p[0], y0, p[1]], [p[0], y1, p[1]], [q[0], y1, q[1]], [q[0], y0, q[1]], color);
  };
  const hband = (a: P2, b: P2, length: number, y: number, h: number, proud: number) => {
    const p = along(a, b, length, -proud, proud * out), q = along(a, b, length, length + proud, proud * out);
    body.quad([p[0], y, p[1]], [p[0], y + h, p[1]], [q[0], y + h, q[1]], [q[0], y, q[1]], band);
  };

  faces(box, (a, b, length, face) => {
    const bays = Math.max(1, Math.round(length / bay)), pitch = length / bays;
    // Window pairs centred in each bay, between wide stone piers.
    const pairs: [number, number][] = [];
    for (let k = 0; k < bays; k++) {
      const c = (k + 0.5) * pitch;
      pairs.push([c - mullion / 2 - win, c - mullion / 2], [c + mullion / 2, c + mullion / 2 + win]);
    }
    // The shaft: five tiers of three floors. Each floor of each window is one pane, lit per office.
    for (let t = 0; t < tiers; t++) {
      const y0 = floor + base + t * tier + 0.9, y1 = floor + base + (t + 1) * tier - 0.35;
      const h = (y1 - y0) / perTier;
      for (let f = 0; f < perTier; f++) {
        const row = t * perTier + f;
        pairs.forEach(([u0, u1], i) => {
          const lit = litHash(seed, face, row, i) < 0.1;
          const color = glass[Math.floor(litHash(seed, face, row, i + 4096) * glass.length)];
          pane(a, b, length, u0, u1, y0 + f * h + 0.1, y0 + (f + 1) * h - 0.1, lit, color);
        });
      }
    }
    // Spandrel bands at every tier line, the deepest under the shaft and at the corner roofs.
    for (let t = 0; t <= tiers; t++) hband(a, b, length, floor + base + t * tier - 0.45, 0.9, t === 0 || t === tiers ? 0.35 : 0.2);
    // Base: tall lobby windows in each bay, a row of small square windows above them, and the arched
    // entrance at the middle of each face.
    const mid = length / 2;
    pairs.forEach(([u0, u1], i) => {
      if (Math.abs((u0 + u1) / 2 - mid) < 3.4) return;
      pane(a, b, length, u0 + 0.3, u1 - 0.3, floor + 0.6, floor + 13.6, litHash(seed, face + 8, 0, i) < 0.5, glass[0]);
      pane(a, b, length, u0 + 0.5, u1 - 0.5, floor + 15.4, floor + 18.2, litHash(seed, face + 8, 1, i) < 0.3, glass[1]);
    });
    const m0 = along(a, b, length, mid - 2.9, 0.1 * out), m1 = along(a, b, length, mid + 2.9, 0.1 * out);
    const yA = floor + 12.2;
    lights.quad([m0[0], footing, m0[1]], [m0[0], yA, m0[1]], [m1[0], yA, m1[1]], [m1[0], footing, m1[1]], glass[0]);
    for (let k = 0; k < 6; k++) {
      const s0 = Math.PI * k / 6, s1 = Math.PI * (k + 1) / 6;
      const r0 = along(a, b, length, mid - 2.9 * Math.cos(s0), 0.1 * out), r1 = along(a, b, length, mid - 2.9 * Math.cos(s1), 0.1 * out);
      lights.tri([m0[0] / 2 + m1[0] / 2, yA, m0[1] / 2 + m1[1] / 2], [r0[0], yA + 2.9 * Math.sin(s0), r0[1]], [r1[0], yA + 2.9 * Math.sin(s1), r1[1]], glass[0]);
    }
  });

  // The arched top storey on the cross: tall round-headed windows, lit by the crown wash at night.
  faces(cross, (a, b, length, face) => {
    if (length < 8) return;
    const count = Math.round(length / 3.6);
    for (let k = 0; k < count; k++) {
      const u = (k + 0.5) * length / count;
      const p = along(a, b, length, u - 0.8, 0.06 * out), q = along(a, b, length, u + 0.8, 0.06 * out), c = along(a, b, length, u, 0.06 * out);
      const y0 = floor + corner + 2.4, y1 = floor + parapet - 3.6;
      const target = (k + face) % 3 ? lights : body;
      target.quad([p[0], y0, p[1]], [p[0], y1, p[1]], [q[0], y1, q[1]], [q[0], y0, q[1]], glass[1]);
      target.tri([p[0], y1, p[1]], [c[0], y1 + 0.8, c[1]], [q[0], y1, q[1]], glass[1]);
    }
  });

  // Pointed stone finials: on every pier of the corner roofs, and at the corners of the cross.
  const finial = (x: number, z: number, y0: number, r: number, h: number) => {
    const sq: P2[] = [[x - r, z - r], [x + r, z - r], [x + r, z + r], [x - r, z + r]];
    sq.forEach(([px, pz], i) => {
      const [nx, nz] = sq[(i + 1) % 4];
      body.tri([px, y0, pz], [nx, y0, nz], [x, y0 + h, z], band);
    });
  };
  faces(box, (a, b, length) => {
    const bays = Math.max(1, Math.round(length / bay)), pitch = length / bays;
    for (let k = 0; k < bays; k++) {
      const [x, z] = along(a, b, length, k * pitch, -0.6 * out);
      // Only where the corner roof is exposed, outside the cross.
      if (Math.abs(x) > W - notchX + 0.4 && Math.abs(z) > D - notchZ + 0.4) finial(x, z, floor + corner, 0.55, 3.2);
    }
  });
  cross.forEach(([x, z]) => finial(x - Math.sign(x) * 0.6, z - Math.sign(z) * 0.6, floor + parapet, 0.7, 3.4));

  // The truncated hip roof: four slate slopes up to a flat deck with a rail. The metal is in the lamp
  // mesh so the floodlit crown glows as one even surface at night.
  const r0: P2[] = [[-W + 4.2, -D + 4.2], [W - 4.2, -D + 4.2], [W - 4.2, D - 4.2], [-W + 4.2, D - 4.2]];
  const r1: P2[] = [[-12, -9.1], [12, -9.1], [12, 9.1], [-12, 9.1]];
  shell.prism(r0, floor + parapet - 0.2, floor + parapet, stoneShade, stoneShade);
  for (let i = 0; i < 4; i++) {
    const a0 = r0[i], b0 = r0[(i + 1) % 4], a1 = r1[i], b1 = r1[(i + 1) % 4];
    const y0 = floor + parapet, y1 = floor + hipTop;
    lights.quad([a0[0], y0, a0[1]], [a1[0], y1, a1[1]], [b1[0], y1, b1[1]], [b0[0], y0, b0[1]], regionsRoof);
  }
  lights.quad([r1[0][0], floor + hipTop, r1[0][1]], [r1[3][0], floor + hipTop, r1[3][1]], [r1[2][0], floor + hipTop, r1[2][1]], [r1[1][0], floor + hipTop, r1[1][1]], roofDeck);
  faces(r1, (a, b) => {
    body.quad([a[0], floor + hipTop, a[1]], [a[0], floor + rail, a[1]], [b[0], floor + rail, b[1]], [b[0], floor + hipTop, b[1]], band);
  });
  // The night wash is cool white, as in the night photo: the crown glows pale, not gold like its neighbour's.
  return shell.finish('#f2ece0', 0.55);
}
