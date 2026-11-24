import { ShapeUtils, Vector2 } from 'three';
import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

const precast = '#cbc3b2',
  bands = '#bcb5a7',
  glass = '#4c5659',
  // Double-width panes on Marquis Two's north wall catch more sky than the narrow ones.
  wideGlass = '#7d8f95';

/** Mapped Overture height, which the 2018 USGS lidar puts on the centre bar's crown. */
export const MARQUIS_HEIGHT = 115.2;
/** Lidar: centre crowns reach 427.8–428.0 m NAVD88 and the side-bay roofs 418.9–419.0 m. */
export const MARQUIS_CROWN_STEP = 8.4;
const FLOORS = 26,
  BAY = 1.55,
  LOBBY = 11.6,
  TRANSFER = 1.8,
  PARAPET = 1.5;

const rect = (x: number, z: number, w: number, d: number): P2[] => [
  [x - w / 2, z - d / 2], [x + w / 2, z - d / 2],
  [x + w / 2, z + d / 2], [x - w / 2, z + d / 2],
];

/** Joins collinear ring edges, so a mapping node mid-wall does not restart the bay rhythm. */
export function wallRuns(ring: P2[]): [P2, P2][] {
  const n = ring.length;
  const dir = (i: number) => {
    const a = ring[(i + n) % n], b = ring[(i + 1) % n];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  };
  const corner = (i: number) => {
    const p = dir(i - 1), q = dir(i);
    return p[0] * q[0] + p[1] * q[1] < 0.9995;
  };
  const start = ring.findIndex((_, i) => corner(i));
  if (start < 0) return [];
  const runs: [P2, P2][] = [];
  let from = start;
  for (let k = 1; k <= n; k++) {
    const i = (start + k) % n;
    if (k === n || corner(i)) {
      runs.push([ring[from], ring[i]]);
      from = i;
    }
  }
  return runs;
}

/** Bay line skipped by the elongated V on a given course, or none. Apexes sit at the lobby. */
export function vLines(bays: number, floor: number, count = 3): Set<number> {
  const lines = new Set<number>();
  const half = bays / count / 2;
  for (let k = 0; k < count; k++) {
    const centre = (k + 0.5) * bays / count,
      spread = ((floor + 0.5) / FLOORS) * half;
    for (const x of [centre - spread, centre + spread]) {
      const line = Math.round(x);
      if (line > 0 && line < bays) lines.add(line);
    }
  }
  return lines;
}

interface MarquisSpec {
  id: string;
  name: string;
  origin: P2;
  axis: P2;
  probes: P2[];
  /** Local v range of the projecting centre bar, read from the mapped ring's end notches. */
  centre: [number, number];
  /** Double-width panes in elongated Vs on the north (−v) wall. */
  northVs?: boolean;
  seed: number;
}

/**
 * The shared Marquis shaft: a recessed double-height lobby, glazing behind precast
 * spandrels and piers, side bays stopping 8.4 m below the centre bar's slotted crown.
 */
function marquisTower(buildings: VBuilding[], grid: GroundGrid, spec: MarquisSpec) {
  const s = landmarkShell(buildings, grid, spec.id, spec.name, spec.origin, spec.axis, spec.probes);
  if (!s) return null;
  const ring = ShapeUtils.isClockWise(s.ring.map(([x, z]) => new Vector2(x, z)))
    ? [...s.ring].reverse()
    : s.ring;
  const shaft = s.base + LOBBY,
    start = shaft + TRANSFER,
    crown = s.base + MARQUIS_HEIGHT,
    sideTop = crown - MARQUIS_CROWN_STEP,
    sideGlass = sideTop - PARAPET,
    pitch = (sideGlass - start) / FLOORS,
    centreGlass = sideGlass + pitch;
  const xs = ring.map(([x]) => x),
    [v0, v1] = spec.centre;
  const centre: P2[] = [
    [Math.min(...xs) - 0.03, v0], [Math.max(...xs) + 0.03, v0],
    [Math.max(...xs) + 0.03, v1], [Math.min(...xs) - 0.03, v1],
  ];

  s.prism(ring, shaft, start, precast, bands);
  s.prism(ring, start, sideGlass, glass, '#8c8980');
  s.prism(ring, sideGlass, sideTop, precast, '#96938a');
  s.prism(centre, sideGlass, centreGlass, glass, '#8c8980');
  s.prism(centre, centreGlass, crown, precast, '#a8a398');

  const face = (a: P2, b: P2) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    const point = (t: number, y: number, depth: number) => [
      a[0] + t * dx + depth * dz / length,
      y,
      a[1] + t * dz - depth * dx / length,
    ];
    const panel = (l: number, r: number, lo: number, hi: number, depth: number, color: string, lit = false) =>
      (lit ? s.lights : s.body).quad(point(l, lo, depth), point(l, hi, depth),
        point(r, hi, depth), point(r, lo, depth), color);
    return { length, panel, bays: Math.max(1, Math.round(length / BAY)), normal: [dz / length, -dx / length] };
  };
  const lit = (floor: number, bay: number, edge: number) =>
    (floor * 29 + bay * 17 + edge * 41 + spec.seed) % 83 === 0;
  const pier = 0.25, band = pitch * 0.355;

  // Spandrels cross continuous piers; each run draws one strip per pier and floor.
  wallRuns(ring).forEach(([a, b], edge) => {
    const { length, panel, bays, normal } = face(a, b);
    if (length < 3) return; // The glazed strips between the three bays.
    const vs = spec.northVs && normal[1] < -0.9 && length > 40;
    const half = pier / length;
    for (let line = 0; line <= bays; line++) {
      const t = line / bays, l = Math.max(0, t - half), r = Math.min(1, t + half);
      if (!vs) {
        panel(l, r, start, sideGlass, 0.12, precast);
        continue;
      }
      for (let floor = 0; floor < FLOORS; floor++) {
        if (vLines(bays, floor).has(line)) continue;
        const y = start + floor * pitch;
        panel(l, r, y, y + pitch, 0.12, precast);
      }
    }
    for (let floor = 0; floor < FLOORS; floor++) {
      const y = start + floor * pitch;
      panel(0, 1, y, y + band, 0.14, bands);
      const wide = vs ? vLines(bays, floor) : new Set<number>();
      for (const line of wide) {
        const l = (line - 1) / bays + half, r = (line + 1) / bays - half;
        panel(l, r, y + band, y + pitch, 0.03, wideGlass, lit(floor, line, edge));
      }
      for (let bay = 0; bay < bays; bay++) {
        if (wide.has(bay) || wide.has(bay + 1) || !lit(floor, bay, edge)) continue;
        panel(bay / bays + half, (bay + 1) / bays - half, y + band, y + pitch, 0.025, glass, true);
      }
    }
  });

  // The centre bar carries one more course, then the crown's recessed slots.
  for (let i = 0; i < 4; i++) {
    const a = centre[i], b = centre[(i + 1) % 4];
    const { length, panel, bays } = face(a, b);
    const half = pier / length;
    panel(0, 1, sideGlass, sideGlass + band, 0.14, bands);
    for (let line = 0; line <= bays; line++) {
      const t = line / bays;
      panel(Math.max(0, t - half), Math.min(1, t + half), sideGlass, centreGlass, 0.12, precast);
    }
    for (let bay = 0; bay < bays; bay++) {
      panel(bay / bays + 0.28 / length, (bay + 1) / bays - 0.28 / length,
        centreGlass + 1.2, crown - 1.1, 0.02, '#5d5f5b');
    }
  }
  return { s, shaft, start, pitch, crown };
}

export function createMarquisOne(buildings: VBuilding[], grid: GroundGrid) {
  const tower = marquisTower(buildings, grid, {
    id: 'd36a5d7e-165d-4008-a4be-6d32c4c55f0b', name: 'Marquis One',
    origin: [552, -810], axis: [1, 0.015], probes: [[0, 0], [-25, -12], [25, 12]],
    centre: [-5.55, 3.7], seed: 0,
  });
  if (!tower) return null;
  const { s, shaft } = tower;

  // The inset double-height lobby exposes the piers under the three shaft bays.
  s.prism(rect(1, 0, 48, 28), s.base, shaft, glass, '#98958b');
  for (const x of [-26.2, 26.2]) {
    for (const z of x < 0 ? [-13, -5, 5, 13] : [-13, 0, 13]) {
      s.body.box(1.1, shaft - s.base, 1.1, x, (shaft + s.base) / 2, z, precast);
    }
  }

  avenueStair(s, grid.sample(525.2, -810.4) ?? s.base, -23.05, 0);

  // Harris Street's tower-side vestibule has the surviving half-barrel hood.
  const harrisGrade = grid.sample(565, -794) ?? s.base;
  const spring = harrisGrade + 3.3, radius = 2.1;
  for (const x of [10.9, 15.1]) {
    s.body.box(0.3, spring - s.base, 2.2, x, (s.base + spring) / 2, 15.1, bands);
  }
  s.body.box(3.9, spring - s.base, 0.1, 13, (s.base + spring) / 2, 14.06, '#343e42');
  for (let segment = 0; segment < 8; segment++) {
    const arch = (i: number, z: number) => {
      const angle = i * Math.PI / 8;
      return [radius * Math.cos(angle) + 13, spring + radius * Math.sin(angle), z];
    };
    s.body.quad(arch(segment, 16.2), arch(segment + 1, 16.2),
      arch(segment + 1, 14), arch(segment, 14), '#a69b88');
  }
  return s.finish('#f9d8a9', 0.43);
}

export function createMarquisTwo(buildings: VBuilding[], grid: GroundGrid) {
  const origin: P2 = [553, -902], axis: P2 = [1, 0.0155];
  const tower = marquisTower(buildings, grid, {
    id: '2b0270ee-9f6a-44c9-bf0d-e6fb20e6c47c', name: 'Marquis Two',
    origin, axis, probes: [[0, 0], [-25, -13], [25, 14]],
    centre: [-5.08, 4.17], northVs: true, seed: 37,
  });
  if (!tower) return null;
  const { s, shaft } = tower;
  const angle = Math.atan2(axis[1], axis[0]), c = Math.cos(angle), n = Math.sin(angle);
  const world = (u: number, v: number): [number, number] => [origin[0] + u * c - v * n, origin[1] + u * n + v * c];

  s.prism(rect(0.25, 0.48, 49, 28.5), s.base, shaft, glass, '#98958b');
  for (const x of [-26, 26.5]) {
    for (const z of x < 0 ? [-13, -6.4, 5.4, 13.6] : [-13, 0.5, 13.6]) {
      s.body.box(1.1, shaft - s.base, 1.1, x, (shaft + s.base) / 2, z, precast);
    }
  }

  // The same lion-flanked stair climbs from Peachtree Center Avenue into the centre bay.
  avenueStair(s, grid.sample(...world(-27.6, -0.45)) ?? s.base, -24.3, -0.45);

  // Baker Street's tower-side door never had a barrel hood: a flat precast lintel only.
  const bakerGrade = grid.sample(...world(13, -16)) ?? s.base;
  const head = bakerGrade + 3.3;
  for (const x of [10.9, 15.1]) {
    s.body.box(0.3, head - s.base, 1.6, x, (s.base + head) / 2, -14.6, bands);
  }
  s.body.box(3.9, head - s.base, 0.1, 13, (s.base + head) / 2, -13.86, '#343e42');
  s.body.box(4.6, 0.55, 1.9, 13, head + 0.27, -14.75, '#a69b88');
  s.lights.box(3.1, 2.6, 0.03, 13, bakerGrade + 1.4, -13.9, '#665e50');
  return s.finish('#f9d8a9', 0.43);
}

type Shell = NonNullable<ReturnType<typeof landmarkShell>>;

/** Granite-walled stair from the avenue sidewalk to a glazed lobby wall at local `door`. */
function avenueStair(s: Shell, grade: number, door: number, z: number) {
  const landing = grade + 1.8;
  s.body.box(0.08, 4.3, 8, door, landing + 2.15, z, '#333e42');
  s.body.box(2.6, 0.45, 8.8, door - 1.25, landing + 4.5, z, bands);
  for (const dz of [-3.8, 0, 3.8]) {
    s.body.box(0.12, 4.3, 0.12, door - 0.1, landing + 2.15, z + dz, '#8b8272');
  }
  for (let step = 0; step < 4; step++) {
    const top = grade + (step + 1) * 0.45;
    s.body.box(1, top - s.base, 7.6, door - 3.5 + step, (s.base + top) / 2, z, '#676760');
  }
  s.lights.box(0.025, 3.3, 3.1, door - 0.08, landing + 1.65, z, '#665e50');
}
