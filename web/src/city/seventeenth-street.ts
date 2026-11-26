import { drapeTriangle, type TriangleSource } from "../terrain/drape";
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

const matchesEnds = (pts: P2[], start: number[], end: number[]) =>
  pts[0][0] === start[0] && pts[0][1] === start[1] && pts.at(-1)![0] === end[0] && pts.at(-1)![1] === end[1];

// The lidar deck continues through three ways tagged as ground. Keep their
// original routing lines. Split the rendered intervals at the two exposed toes.
export function seventeenthAccess(city: TerrainCity): TerrainCity {
  const runs = [...city.terrainTransport!.roads];
  const parts = survey.ramps.flatMap((r) => r.parts);
  const roads = city.roads.map((road) => {
    if (road.bridge || road.cls !== 'motorway' || road.sub !== 'link') return road;
    const part = parts.find((p) => matchesEnds(road.pts, p.start, p.end));
    if (!part) return road;
    const base = { cls: road.cls, sub: road.sub, name: road.name };
    const land = part.land as P2[];
    if (land.length) runs.push({ ...base, kind: 'ground', pts: land });
    const pts = land.length ? [land.at(-1)!, ...road.pts.slice(land.length - 1)] : road.pts;
    runs.push({ ...base, kind: 'bridge', pts });
    return { ...road, bridge: true };
  });
  return { ...city, roads, terrainTransport: { ...city.terrainTransport!, roads: runs } };
}

// Add to the terrain renderer's structural batch. Triangle offsets remain valid
// for the ordinary road-specific deckAt lookup, including the two ramp mouths.
export function drawSeventeenthStreet(
  city: TerrainCity,
  zero: number,
  ground: Ground,
  mesh: Builder,
  treads: Map<TransportRun, number[]>,
  replaced: Set<TransportRun>,
  footingTerrain?: TriangleSource,
) {
  if (city.bounds.minZ !== -4900 && city.bounds.minZ !== -4100) return;
  const runs = city.terrainTransport!.roads;
  const streets = runs.filter((r) => r.kind === 'bridge' && r.name === '17th Street Northwest');
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
  const ramps = survey.ramps.flatMap((ramp) => {
    const [first, last] = ramp.edgeX.map((x) => rows.findIndex((row) => row[ramp.side * 3] === x));
    return ramp.parts.flatMap((part, index) => {
      const owner = runs.find(
        (r) =>
          r.kind === 'bridge' &&
          r.cls === 'motorway' &&
          r.sub === 'link' &&
          matchesEnds(r.pts, part.land.at(-1) ?? part.start, part.end),
      );
      return owner
        ? [{ ...part, side: ramp.side, first, last, owner, joinsDeck: index === ramp.parts.length - 1 }]
        : [];
    });
  });
  const owners = [...streets, ...walks, ...mouths, ...ramps.map((r) => r.owner)];
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
  // The archived ramp polygons share two vertices with the bridge fascia.
  // Carry the three approach lanes up to that edge. Subdivide its final
  // row at every fascia vertex so both slopes meet on identical triangles.
  for (const ramp of ramps) {
    const { first, last, side, owner } = ramp;
    const left = point(first, side, 0),
      right = point(last, side, 0);
    const span = right[0] - left[0];
    const fractions = Array.from(
      { length: last - first + 1 },
      (_, k) => (point(first + k, side, 0)[0] - left[0]) / span,
    );
    const samples = ramp.rows;
    const apron = (station: number, f: number): Point => {
      if (station === samples.length) {
        const k = fractions.findIndex((t) => t >= f - 1e-8);
        if (k === 0) return left;
        return point(first + k - 1 + (f - fractions[k - 1]) / (fractions[k] - fractions[k - 1]), side, 0);
      }
      const row = samples[station];
      const x = mix(row[0], row[3], f),
        z = mix(row[1], row[4], f),
        y = mix(row[2], row[5], f) - zero;
      // At the exposed toe the 5 m terrain can rise through the lidar tread
      // between deck returns. Keep the wearing surface above that approach.
      const floor = ramp.land.length ? ground(x, z) : null;
      return [x, floor === null ? y : station === 0 ? floor + .02 : Math.max(y, floor + .07), z];
    };
    // Illustrative single-column bents stand clear of the mapped lower roads.
    for (const [station, fraction] of ramp.supports) {
      const top = apron(station, fraction);
      const baseY = ground(top[0], top[2]);
      if (baseY == null || baseY >= top[1] - 0.85) continue;
      const seat = (f: number): Point => {
        const p = apron(station, f);
        return [p[0], p[1] - 1.05, p[2]];
      };
      beam([top[0], baseY - 0.12, top[2]], seat(fraction), 1.25, 1.5, '#aa9e89', 1.65);
      beam(seat(0.06), seat(0.94), 1.55, 0.6, '#b8ab96');
    }
    const upstream = ramps.find((p) => p.end[0] === ramp.start[0] && p.end[1] === ramp.start[1]);
    const downstream = ramps.find((p) => ramp.end[0] === p.start[0] && ramp.end[1] === p.start[1]);
    const intervals = samples.length - (ramp.joinsDeck ? 0 : 1);
    for (let i = 0; i < intervals; i++) {
      // The shared endpoint belongs to either source way. Register its two
      // adjacent faces for both owners, including float32 rounding at the seam.
      const roadOwners = [owner];
      if (upstream && i === 0) roadOwners.push(upstream.owner);
      if (downstream && i === intervals - 1) roadOwners.push(downstream.owner);
      for (let k = 1; k < fractions.length; k++) {
        const f = fractions[k - 1],
          g = fractions[k];
        quad(apron(i, f), apron(i + 1, f), apron(i + 1, g), apron(i, g), '#a49e92', roadOwners);
      }
      const down = (p: Point): Point => [p[0], p[1] - 0.85, p[2]];
      const a = apron(i, 0),
        b = apron(i + 1, 0),
        c = apron(i + 1, 1),
        d = apron(i, 1);
      quad(a, b, down(b), down(a), '#a39983');
      quad(c, d, down(d), down(c), '#a39983');
      quad(down(a), down(b), down(c), down(d), '#a39983');
      // Low concrete edge barriers end at the crossing, outside the turning lanes.
      for (const [edge, inside] of [
        [0, 0.022],
        [1, 0.978],
      ]) {
        const p = apron(i, edge),
          q = apron(i + 1, edge),
          u = apron(i, inside),
          v = apron(i + 1, inside);
        const up = (p: Point): Point => [p[0], p[1] + 0.7, p[2]];
        quad(p, q, up(q), up(p), '#ad9f89');
        quad(up(p), up(q), up(v), up(u), '#c7bda9');
        quad(u, v, up(v), up(u), '#ad9f89');
      }
      function paint(f: number, t: number): Point {
        const p = apron(i, f),
          q = apron(i + 1, f);
        return [mix(p[0], q[0], t), mix(p[1], q[1], t) + 0.026, mix(p[2], q[2], t)];
      }
      for (let lane = 1; lane < ramp.lanes; lane++) {
        const f = lane / ramp.lanes;
        quad(paint(f - 0.005, 0), paint(f + 0.005, 0), paint(f + 0.005, 1), paint(f - 0.005, 1), '#ddd9c8');
      }
      if (ramp.joinsDeck && i === intervals - 2) {
        // Left / left / right in the travel direction at both terminal ramps.
        for (let lane = 0; lane < 3; lane++) {
          const f = (lane + 0.5) / 3,
            left = side === 1 ? -1 : 1,
            turn = (side === 1 ? lane < 2 : lane > 0) ? left : -left;
          quad(
            paint(f - 0.01, 0.15),
            paint(f + 0.01, 0.15),
            paint(f + 0.01, 0.65),
            paint(f - 0.01, 0.65),
            '#e2ddd0',
          );
          quad(
            paint(f, 0.58),
            paint(f + turn * 0.045, 0.58),
            paint(f + turn * 0.045, 0.65),
            paint(f, 0.65),
            '#e2ddd0',
          );
          mesh.tri(
            paint(f + turn * 0.043, 0.49),
            paint(f + turn * 0.086, 0.62),
            paint(f + turn * 0.043, 0.76),
            '#e2ddd0',
          );
        }
      }
    }
  }
  if (!streets.length) return;
  // Four-sided tapered members, including the corbel caps and canopy ribs.
  function beam(a: Point, b: Point, w: number, v: number, color: string, topW = w, seatFoot = false) {
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
    if (seatFoot && footingTerrain) {
      // Clip the bottom face on the drawn terrain. Carry each split of the
      // perimeter up the shaft side, retaining its original cap and footprint.
      for (const ids of [[0,1,2],[0,2,3]]) {
        const below = ids.map(i => [lo[i][0], a[1]-50, lo[i][2]]);
        drapeTriangle(footingTerrain,below[0],below[1],below[2],0,(p,q,r) => {
          mesh.tri(p.slice(0,3),q.slice(0,3),r.slice(0,3),color);
          for (const [v,u] of [[p,q],[q,r],[r,p]]) {
            const opposite = [0,1,2].find(k => Math.abs(v[k+3])<1e-8 && Math.abs(u[k+3])<1e-8);
            if (opposite===undefined) continue;
            const i=ids[(opposite+1)%3], j=ids[(opposite+2)%3];
            if (Math.abs(i-j)===2) continue; // interior diagonal
            const cap = (point: typeof p) => [0,1,2].map(k =>
              point[3]*hi[ids[0]][k]+point[4]*hi[ids[1]][k]+point[5]*hi[ids[2]][k]);
            mesh.quad(v.slice(0,3),u.slice(0,3),cap(u),cap(v),color);
          }
        });
      }
      quad(hi[0],hi[1],hi[2],hi[3],color);
      return;
    }
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
      beam(base, top, 1.35, 1.65, concrete, 2.15, true);
      beam(top, seat(f, -2.05), 2.3, 2.2, concrete, 3.3);
    }
    beam(seat(0.035, -2.2), seat(0.965, -2.2), 2.1, 1.15, concrete);
  }
  for (let i = 0; i < end; i++) {
    const x = point(i + 0.5, 0.5, 0)[0];
    const connection = ramps.find((r) => r.joinsDeck && i >= r.first && i < r.last);
    const northMouth = connection?.side === 0,
      southMouth = connection?.side === 1;
    const turnOwners = connection ? [...mouths, connection.owner] : mouths;
    strip(i, i + 1, 0.205, 0.845, 0, '#a49e92', [...streets, ...turnOwners, ...crossings]);
    for (const [left, right, opening] of [
      [0, 0.205, northMouth],
      [0.845, 1, southMouth],
    ] as const) {
      const side = left === 0 ? 0 : 1;
      const corner = ramps.find((r) => r.joinsDeck && r.side === side && (i + 1 === r.first || i === r.last));
      if (corner) {
        const curb = side === 0 ? right : left;
        const at = corner.first === i + 1 ? i + 1 : i,
          away = at === i ? 1 : -1;
        const a = point(i, curb, 0),
          b = point(i + 1, curb, 0),
          edge = point(i, side, 0);
        const length = Math.hypot(a[0] - b[0], a[2] - b[2]),
          walkWidth = Math.hypot(a[0] - edge[0], a[2] - edge[2]);
        const radius = Math.min(2.4, length, walkWidth);
        const advance = (away * radius) / length;
        // Three facets ease the sidewalk around the turn. Both the roadway
        // and the raised curb use the same boundary through the corner.
        strip(
          Math.min(at + advance, at + away),
          Math.max(at + advance, at + away),
          left,
          right,
          0.15,
          '#d2c5b2',
          walks,
        );
        let s0 = at,
          f0 = curb + (((side === 0 ? -1 : 1) * radius) / walkWidth) * Math.abs(right - left);
        for (let n = 1; n <= 3; n++) {
          const theta = (n * Math.PI) / 6;
          const s1 = at + advance * (1 - Math.cos(theta)),
            f1 =
              curb +
              (((side === 0 ? -1 : 1) * radius * (1 - Math.sin(theta))) / walkWidth) * Math.abs(right - left);
          quad(
            point(s0, side, 0.15),
            point(s1, side, 0.15),
            point(s1, f1, 0.15),
            point(s0, f0, 0.15),
            '#d2c5b2',
            walks,
          );
          quad(point(s0, f0, 0), point(s1, f1, 0), point(s1, curb, 0), point(s0, curb, 0), '#a49e92', [
            ...streets,
            corner.owner,
          ]);
          quad(point(s0, f0, 0), point(s1, f1, 0), point(s1, f1, 0.15), point(s0, f0, 0.15), concrete);
          s0 = s1;
          f0 = f1;
        }
        continue;
      }
      strip(
        i,
        i + 1,
        left,
        right,
        opening ? 0 : 0.15,
        opening ? '#a49e92' : '#d2c5b2',
        opening ? [...walks, ...turnOwners] : walks,
      );
    }
    if (connection) {
      const [l, r] = northMouth ? [0.045, 0.135] : [0.875, 0.965];
      const length = point(i + 1, connection.side, 0)[0] - point(i, connection.side, 0)[0];
      const count = Math.max(1, Math.round(length / 1.25));
      for (let j = 0; j < count; j++)
        strip(i + (j + 0.23) / count, i + (j + 0.77) / count, l, r, 0.024, '#ddd9c8');
    } else {
      strip(i, i + 1, 0.513, 0.52, 0.03, '#d9b257');
      for (const f of [0.248, 0.344, 0.43, 0.606, 0.695, 0.795]) {
        const solid = f === 0.248 || f === 0.795 || f === 0.344 || f === 0.695;
        if (f === 0.344 || f === 0.695) strip(i, i + 1, f + 0.005, f + 0.009, 0.036, '#ddd9c8');
        strip(i, solid ? i + 1 : i + 0.43, f - 0.002, f + 0.002, 0.036, '#ddd9c8');
      }
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
    if (x > -113 && x < 87 && !southMouth) {
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
  // The other two archived crossings lead across both carriageways.
  for (const walk of crossings) {
    let a = walk.pts[0],
      b = walk.pts.at(-1)!;
    if (Math.abs(b[1] - a[1]) < 20) continue;
    if (a[1] > b[1]) [a, b] = [b, a];
    const sign = (p: Point) => (b[0] - a[0]) * (p[2] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    function marking(f: number, offset: number) {
      const k = rows.findIndex((_, i) => sign(point(i, f, 0)) <= 0);
      if (k <= 0) return null;
      const l = point(k - 1, f, 0),
        r = point(k, f, 0);
      const s = k - 1 + sign(l) / (sign(l) - sign(r));
      const ds = offset / Math.hypot(l[0] - r[0], l[2] - r[2]);
      return point(s + ds, f, 0.043);
    }
    for (let f = 0.207; f < 0.835; f += 0.033) {
      const a = marking(f, -1.25),
        b = marking(f, 1.25),
        c = marking(f + 0.016, 1.25),
        d = marking(f + 0.016, -1.25);
      if (a && b && c && d) quad(a, b, c, d, '#ddd9c8');
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
