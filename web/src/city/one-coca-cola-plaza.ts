import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

export const oneCocaColaId = 'osm:way:536717630';

const precast = '#dfd9ca',
  shade = '#b9b2a3',
  glass = '#4b565b',
  lobbyGlass = '#55636a',
  roofDeck = '#9d9a92';

/**
 * One Coca-Cola Plaza (1979, 29 floors): a square cream precast tower whose deep
 * square windows read as an eggcrate grid between solid corner piers, under a blank
 * sign band. The red script signs are logos and are left off.
 */
export function createOneCocaColaPlaza(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const s = landmarkShell(buildings, grid, site.id, 'One Coca-Cola Plaza', [-464.6, -1886.8], [1, 0],
    [[0, 0], [-20, -20], [20, 20]]);
  if (!s) return null;

  // Lidar (April 2019): roof p50 116.0, p95 122.8, max 125.2 m above grade.
  const grade = s.base + 0.35;
  const half = 23.6, pier = 2.9;
  const lobbyTop = grade + 7.2,
    firstFloor = lobbyTop + 0.9,
    floors = 27,
    pitch = 3.86,
    gridTop = firstFloor + floors * pitch, // ≈ 112.3 m
    parapet = grade + 119.2,
    penthouse = grade + 122.8,
    pierTop = grade + 124.6;

  const sq = (h: number): P2[] => [[-h, -h], [h, -h], [h, h], [-h, h]];

  // Recessed lobby glazing under the tower; piers carry down to grade.
  s.prism(sq(half - 1.6), s.base, lobbyTop, lobbyGlass, roofDeck);
  s.prism(sq(half), lobbyTop, firstFloor, precast, precast);
  // Dark glass plane set back behind the precast grid.
  s.prism(sq(half - 0.75), firstFloor, gridTop, glass, glass);
  // Blank sign band and parapet; the lidar's 116 m median is the deck inside it.
  s.prism(sq(half), gridTop, parapet, precast, roofDeck);
  // Mechanical penthouse and screen, centred on the core.
  s.prism(sq(9.5), parapet, penthouse, shade, roofDeck);
  s.body.box(6, 1.2, 4, 3, penthouse + 0.6, -2, '#8f8c85');

  // The four corner piers rise above the parapet as solid shafts.
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    const cx = x * (half - pier / 2 + 0.25), cz = z * (half - pier / 2 + 0.25);
    s.body.box(pier, pierTop - s.base, pier, cx, (pierTop + s.base) / 2, cz, precast);
  }

  // Each face: 13 deep window bays between the corner piers. Front piers and
  // spandrels are flat strips over the recessed glass; lit panes sit just in
  // front of the glass in the lamp mesh.
  const bays = 13;
  const faces: [P2, P2][] = [
    [[-half, -half], [half, -half]],
    [[half, -half], [half, half]],
    [[half, half], [-half, half]],
    [[-half, half], [-half, -half]],
  ];
  faces.forEach(([a, b], f) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
    // Outward normal: the loop runs counter-clockwise in (x, z).
    const nx = dz / len, nz = -dx / len;
    const at = (t: number, y: number, out: number) =>
      [a[0] + t * dx + nx * out, y, a[1] + t * dz + nz * out];
    const quad = (l: number, r: number, lo: number, hi: number, out: number, color: string, lit = false) =>
      (lit ? s.lights : s.body).quad(at(l, lo, out), at(l, hi, out), at(r, hi, out), at(r, lo, out), color);
    // The grid meets the inner face of each corner shaft (set 0.25 m outboard).
    const t0 = (pier - 0.25) / len, t1 = 1 - (pier - 0.25) / len, w = (t1 - t0) / bays;
    const mullion = 0.72 / len;
    for (let i = 0; i <= bays; i++) {
      const c = t0 + i * w;
      quad(Math.max(t0, c - mullion), Math.min(t1, c + mullion), firstFloor, gridTop, 0, precast);
    }
    for (let j = 0; j < floors; j++) {
      const y = firstFloor + j * pitch;
      quad(t0, t1, y, y + 1.55, 0, precast);
      for (let i = 0; i < bays; i++) {
        // Offices: a sparse, stable set of late workers and cleaning crews.
        if ((j * 31 + i * 17 + f * 43) % 37 !== 0) continue;
        quad(t0 + i * w + mullion, t0 + (i + 1) * w - mullion, y + 1.55, y + pitch, -0.55, glass, true);
      }
    }
    quad(t0, t1, gridTop - 0.2, gridTop, 0, precast);
    // Lobby glow behind the recessed glazing.
    const inset = -1.4;
    quad(0.12, 0.88, grade + 0.2, lobbyTop - 1.2, inset, lobbyGlass, true);
    // Four columns per face carry the grid down past the recessed lobby.
    for (const i of [2, 5, 8, 11]) {
      const l = t0 + i * w - mullion, r = t0 + i * w + mullion;
      quad(l, r, s.base, lobbyTop, 0, precast);
      s.body.quad(at(l, s.base, -1.6), at(l, lobbyTop, -1.6), at(l, lobbyTop, 0), at(l, s.base, 0), shade);
      s.body.quad(at(r, s.base, 0), at(r, lobbyTop, 0), at(r, lobbyTop, -1.6), at(r, s.base, -1.6), shade);
    }
  });

  return s.finish('#f6d9a8', 0.5);
}
