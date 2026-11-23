import survey from './fixtures/seventeenth-street.json';
import { Builder, pointInRing, type P2 } from '../vignette/geom';
import type { TerrainCity, TransportRun } from '../terrain/transport-data';

type Ground = (x: number, z: number) => number | null;
type Point = [number, number, number];
const rows = survey.rows;
const outline: P2[] = [
  ...rows.map((r) => [r[0], r[1]] as P2),
  ...rows.map((r) => [r[3], r[4]] as P2).reverse(),
];
const mix = (a: number, b: number, f: number) => a + (b - a) * f;

// Add to the terrain renderer's structural batch. Triangle offsets remain valid
// for the ordinary road-specific deckAt lookup, including the two ramp mouths.
export function drawSeventeenthStreet(
  city: TerrainCity,
  zero: number,
  ground: Ground,
  mesh: Builder,
  treads: Map<TransportRun, number[]>,
  replaced: Set<TransportRun>,
) {
  if (city.bounds.minZ !== -4900 || city.bounds.maxZ !== -4100) return;
  const runs = city.terrainTransport!.roads;
  const streets = runs.filter((r) => r.kind === 'bridge' && r.name === '17th Street Northwest');
  if (!streets.length) return;
  const walks = runs.filter(
    (r) =>
      r.kind === 'bridge' &&
      r.cls === 'footway' &&
      r.pts.every(
        ([x, z]) => pointInRing(x, z, outline) || outline.some((p) => Math.hypot(x - p[0], z - p[1]) < 0.15),
      ),
  );
  const mouths = runs.filter(
    (r) => r.cls === 'motorway' && r.sub === 'link' && r.pts.every(([x, z]) => pointInRing(x, z, outline)),
  );
  const crossings = walks.filter((w) => w.sub === 'crossing');
  const owners = [...streets, ...walks, ...mouths];
  owners.forEach((r) => {
    replaced.add(r);
    treads.set(r, []);
  });

  // Each row runs north to south. Interpolate short chords of the two mapped
  // fascia lines and their lidar-derived carriageway heights.
  function point(s: number, f: number, lift: number): Point {
    const i = Math.min(Math.floor(s), rows.length - 2),
      a = rows[i],
      b = rows[i + 1];
    return [
      mix(mix(a[0], a[3], f), mix(b[0], b[3], f), s - i),
      mix(mix(a[2], a[5], f), mix(b[2], b[5], f), s - i) - zero + lift,
      mix(mix(a[1], a[4], f), mix(b[1], b[4], f), s - i),
    ];
  }
  function quad(a: Point, b: Point, c: Point, d: Point, color: string, roads: TransportRun[] = []) {
    const i = mesh.pos.length / 3;
    mesh.quad(a, b, c, d, color);
    for (const r of roads) treads.get(r)!.push(i, i + 3);
  }
  function strip(
    a: number,
    b: number,
    left: number,
    right: number,
    h: number,
    color: string,
    roads?: TransportRun[],
  ) {
    quad(point(a, left, h), point(b, left, h), point(b, right, h), point(a, right, h), color, roads);
  }
  function panel(a: number, b: number, f: number, lower: number, upper: number, color: string) {
    quad(point(a, f, lower), point(b, f, lower), point(b, f, upper), point(a, f, upper), color);
  }
  // Four-sided tapered members, including the corbel caps and canopy ribs.
  function beam(a: Point, b: Point, w: number, v: number, color: string, topW = w) {
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      dz = b[2] - a[2];
    const flat = Math.hypot(dx, dz),
      len = Math.hypot(flat, dy);
    if (!len) return;
    const nx = flat ? -dz / flat : 1,
      nz = flat ? dx / flat : 0;
    const ux = (dy * nz) / len,
      uy = -flat / len,
      uz = (-dy * nx) / len;
    const corners = (p: Point, width: number): Point[] =>
      [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ].map(([i, j]) => [
        p[0] + (i * width * nx) / 2 + (j * v * ux) / 2,
        p[1] + (j * v * uy) / 2,
        p[2] + (i * width * nz) / 2 + (j * v * uz) / 2,
      ]);
    const lo = corners(a, w),
      hi = corners(b, topW);
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      quad(lo[i], lo[j], hi[j], hi[i], color);
    }
    quad(hi[0], hi[1], hi[2], hi[3], color);
  }
  const end = rows.length - 1,
    yellow = '#d8ac36',
    pale = '#ddd7b9',
    concrete = '#bcaf94';
  // Pier rows inferred from orthophoto/side elevations, in gaps between
  // through roads. Longitudinal girders deepen over the pier caps.
  const seats = [-135, -75, -22, 26, 62];
  for (const x of seats) {
    const i = rows.findIndex((r) => (r[0] + r[3]) / 2 >= x);
    const previous = point(i - 1, 0.5, 0),
      next = point(i, 0.5, 0);
    const s = i - 1 + (x - previous[0]) / (next[0] - previous[0]);
    // The western carriageways cross the rows at a skew.
    const seat = (f: number, h: number) => point(s + (x === -75 ? 0.68 * (f - 0.5) : 0), f, h);
    for (const f of [0.13, 0.38, 0.62, 0.87]) {
      const top = seat(f, -2.8),
        base: Point = [top[0], ground(top[0], top[2]) ?? top[1], top[2]];
      beam(base, top, 1.35, 1.65, concrete, 2.15);
      beam(top, seat(f, -2.05), 2.3, 2.2, concrete, 3.3);
    }
    beam(seat(0.035, -2.2), seat(0.965, -2.2), 2.1, 1.15, concrete);
  }
  for (let i = 0; i < end; i++) {
    const x = point(i + 0.5, 0.5, 0)[0];
    const northMouth = x > -115 && x < -101,
      southMouth = x > 86 && x < 102;
    strip(i, i + 1, 0.205, 0.845, 0, '#a49e92', [...streets, ...mouths, ...crossings]);
    for (const [left, right, opening] of [
      [0, 0.205, northMouth],
      [0.845, 1, southMouth],
    ] as const) {
      strip(
        i,
        i + 1,
        left,
        right,
        opening ? 0 : 0.15,
        opening ? '#a49e92' : '#d2c5b2',
        opening ? [...walks, ...mouths] : walks,
      );
    }
    strip(i, i + 1, 0.513, 0.52, 0.03, '#d9b257');
    for (const f of [0.248, 0.344, 0.43, 0.606, 0.695, 0.795]) {
      const solid = f === 0.248 || f === 0.795 || f === 0.344 || f === 0.695;
      if (f === 0.344 || f === 0.695) strip(i, i + 1, f + 0.005, f + 0.009, 0.036, '#ddd9c8');
      strip(i, solid ? i + 1 : i + 0.43, f - 0.002, f + 0.002, 0.036, '#ddd9c8');
    }
    strip(i, i + 1, 0, 1, -0.55, '#9e997f');
    for (const f of [0, 0.19, 0.39, 0.6, 0.81, 1]) {
      const depth = (s: number) =>
        1.25 + 1.25 * Math.max(0, 1 - Math.min(...seats.map((x) => Math.abs(point(s, f, 0)[0] - x))) / 20);
      // Inverted trapezoidal box. Both inclined webs and the bottom flange
      // remain visible looking along the Connector underneath the deck.
      const axis = Math.max(0.022, Math.min(0.978, f));
      for (const side of [-1, 1]) {
        quad(
          point(i, axis + side * 0.022, -0.18),
          point(i + 1, axis + side * 0.022, -0.18),
          point(i + 1, axis + side * 0.012, -depth(i + 1)),
          point(i, axis + side * 0.012, -depth(i)),
          yellow,
        );
      }
      quad(
        point(i, axis - 0.012, -depth(i)),
        point(i + 1, axis - 0.012, -depth(i + 1)),
        point(i + 1, axis + 0.012, -depth(i + 1)),
        point(i, axis + 0.012, -depth(i)),
        '#bc9735',
      );
    }
    for (const f of [0, 1]) {
      if (f === 0 ? northMouth : southMouth) continue;
      panel(i, i + 1, f, -0.23, 0.73, concrete);
      for (const h of [0.94, 1.17]) beam(point(i, f, h), point(i + 1, f, h), 0.09, 0.1, pale);
      for (const s of [i, i + 0.5]) beam(point(s, f, 0.62), point(s, f, 1.21), 0.12, 0.11, pale);
      if (f === 0 && x > -104 && x < 85) {
        for (const s of [i, i + 0.5]) beam(point(s, 0.004, 0.65), point(s, -0.008, 2.55), 0.12, 0.12, pale);
        for (const h of [1.53, 2.05, 2.55])
          beam(point(i, -0.006, h), point(i + 1, -0.006, h), 0.09, 0.09, pale);
        if (i % 3 === 0) {
          // Rectangular planters and the inset parapet fixtures visible along the open walk.
          beam(point(i, 0.095, 0.43), point(i + 0.5, 0.095, 0.43), 1.12, 0.56, '#a99c87');
          beam(point(i, 0.095, 0.75), point(i + 0.5, 0.095, 0.75), 0.98, 0.14, '#6f7350');
          beam(point(i, 0.012, 0.52), point(i + 0.08, 0.012, 0.52), 0.12, 0.16, '#e4dfc6');
        }
      }
    }
    if (x > -113 && x < 87) {
      // South-side open lattice curls inward over the promenade.
      for (const s of [i, i + 0.5]) {
        const knee = point(s, 0.99, 3.0),
          bend = point(s, 0.972, 3.72);
        beam(point(s, 1, 0.72), knee, 0.13, 0.17, pale);
        beam(knee, bend, 0.14, 0.18, pale);
        beam(bend, point(s, 0.918, 4.08), 0.14, 0.18, pale);
      }
      if (i % 4 === 0) {
        beam(point(i, 0.905, 0.66), point(i + 0.37, 0.905, 0.66), 0.52, 0.18, '#a49680');
        for (const s of [i + 0.04, i + 0.33])
          beam(point(s, 0.905, 0.16), point(s, 0.905, 0.58), 0.26, 0.29, concrete);
      }
      for (const [f, h] of [
        [1, 1.65],
        [0.995, 2.34],
        [0.982, 3.42],
        [0.953, 3.86],
        [0.918, 4.08],
      ])
        beam(point(i, f, h), point(i + 1, f, h), 0.095, 0.1, pale);
    }
  }
  for (const s of [0, end]) {
    const foot = (p: Point): Point => [p[0], Math.min(p[1], ground(p[0], p[2]) ?? p[1]) - 0.3, p[2]];
    const a = point(s, 0, -0.55),
      b = point(s, 1, -0.55);
    quad(a, b, foot(b), foot(a), concrete);
  }
}

// Share the surveyed end row with the terrain renderer. Its bank mesh uses
// the adjoining streets' paint and supplies the same triangle height to traffic.
export function seventeenthPortals(city: TerrainCity) {
  if (city.bounds.minZ !== -4900 || !city.roads.some((r) => r.bridge && r.name === '17th Street Northwest'))
    return [];
  return [
    [rows[0], [-1, -0.025]],
    [rows.at(-1)!, [0.982, -0.189]],
  ].map(([row, direction]) => ({
    edge: [
      [row[0], row[1], row[2] - 0.12],
      [row[3], row[4], row[5] - 0.12],
    ],
    direction,
    curbs: [0.205, 0.845],
  }));
}

// The two elevated ramps that terminate on 17th already have independent
// motorway owners. Draw their existing ribbons on the surveyed profile.
export function seventeenthRamp(run: TransportRun, ground: Ground, zero: number): TransportRun {
  if (run.cls !== 'motorway' || run.sub !== 'link') return run;
  const ramp = survey.ramps.find((r) => r.points[0][0] === run.pts[0][0] && r.points[0][1] === run.pts[0][1]);
  if (!ramp) return run;
  const [x, z] = run.pts[0],
    bank = ground(x, z);
  const delta = bank === null ? 0 : bank + zero - ramp.heights[0];
  return {
    ...run,
    pts: ramp.points as P2[],
    deckNavd88M: ramp.heights.map(
      (h, i) => h + delta * Math.max(0, 1 - Math.hypot(ramp.points[i][0] - x, ramp.points[i][1] - z) / 25),
    ),
  };
}
