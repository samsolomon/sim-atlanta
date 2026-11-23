import * as THREE from 'three';
import type { TransportRun } from '../terrain/transport-data';
import { Builder, Line, type P2 } from '../vignette/geom';
import { pierObstacles } from '../terrain/pier-clearance';

type Ground = (x: number, z: number) => number | null;

export const NORTH_LINE = 'MARTA North Line';
/** Steepest designed grade on the open North Line (inferred; typical heavy-rail limit). */
export const MAX_GRADE = 0.035;
/** Clear height under a girder soffit over a road (16 ft interstate minimum). */
export const SOFFIT_CLEARANCE = 4.9;
/** Rail level above the slab top on the plinths. */
const DECK = 0.15;
/** Default girder depth (slab top to soffit) before span lengths are known. */
export const GIRDER_DEPTH = 2.05;
/** Continuous cast-in-place box girders run about span/28 deep, within these limits. */
export function girderDepthFor(span: number) {
  return THREE.MathUtils.clamp(span / 28, 1.85, 2.6);
}
/** Ballast tread top above the highest ground across its width. */
const TREAD_LIFT = 0.13;
const STEP = 2;
/** Metres from the tunnel mouth still inside the portal hood. */
const MOUTH = 6;

/**
 * North of the portal the guideway draws the North Line itself, so the generic
 * strips skip it. The runs stay in the row data for crossings and placement.
 */
export function northLineRail(row: string, rail: TransportRun[]) {
  if (row !== 'brookwood-station') return rail;
  return rail.map((run) => (run.name === NORTH_LINE ? { ...run, replaced: true } : run));
}

function crossing(a: P2, b: P2, c: P2, d: P2): P2 | null {
  const r = [b[0] - a[0], b[1] - a[1]],
    q = [d[0] - c[0], d[1] - c[1]];
  const den = r[0] * q[1] - r[1] * q[0];
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * q[1] - (c[1] - a[1]) * q[0]) / den,
    u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [a[0] + t * r[0], a[1] + t * r[1]] : null;
}

function nearestOn(line: Line, x: number, z: number) {
  let best = { d: Infinity, s: 0, x: 0, z: 0 };
  for (let i = 1; i < line.pts.length; i++) {
    const [ax, az] = line.pts[i - 1],
      [bx, bz] = line.pts[i];
    const dx = bx - ax,
      dz = bz - az,
      l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    const px = ax + t * dx,
      pz = az + t * dz,
      d = Math.hypot(x - px, z - pz);
    if (d < best.d) best = { d, s: line.cum[i - 1] + t * Math.sqrt(l2), x: px, z: pz };
  }
  return best;
}

/**
 * One designed profile shared by both tracks: on bare earth it rides the highest
 * ground between the outer rails, and over a span it keeps the deck at least
 * SOFFIT_CLEARANCE under its girder. A grade-limited envelope joins the
 * two, so bridge ends meet their banks without a step.
 */
type Road = { cls: string; pts: P2[] };
const UNDER = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'service']);

export function northLineProfile(
  tracks: Line[],
  runs: readonly TransportRun[],
  ground: Ground,
  roads: readonly Road[] = [],
  depthAt: (station: number) => number = () => GIRDER_DEPTH,
) {
  const [a, b] = tracks;
  const spans = runs.filter((r) => r.name === NORTH_LINE && r.kind === 'bridge').map((r) => new Line(r.pts));
  const centre: { x: number; z: number; s: number; nx: number; nz: number; half: number; bridge: boolean; clear: number | null }[] = [];
  for (let s = 0; s <= a.length; s += STEP) {
    const p = a.at(s),
      q = nearestOn(b, p.x, p.z);
    const x = (p.x + q.x) / 2,
      z = (p.z + q.z) / 2;
    const near = spans.map((l) => ({ l, n: nearestOn(l, x, z) })).filter(({ n }) => n.d < 3.2);
    const bridge = near.some(({ l, n }) => n.s > 0.5 && n.s < l.length - 0.5);
    centre.push({ x, z, s, nx: -p.dz, nz: p.dx, half: q.d / 2 + 2.1, bridge, clear: null });
  }
  // Clearance applies only where a mapped road crosses under a span: stations within
  // 6 m of the crossing keep SOFFIT_CLEARANCE above that road's ground. A road running
  // alongside on the bank does not count, and a span over a creek simply joins its banks.
  const under = roads.filter((r) => UNDER.has(r.cls) && r.pts.length > 1);
  const spanRuns = runs.filter((r) => r.name === NORTH_LINE && r.kind === 'bridge');
  for (const road of under)
    for (let i = 1; i < road.pts.length; i++)
      for (const span of spanRuns)
        for (let j = 1; j < span.pts.length; j++) {
          const hit = crossing(road.pts[i - 1], road.pts[i], span.pts[j - 1], span.pts[j]);
          if (!hit) continue;
          const g = ground(hit[0], hit[1]);
          if (g === null) continue;
          for (const c of centre)
            if (c.bridge && Math.hypot(c.x - hit[0], c.z - hit[1]) < 6) c.clear = Math.max(c.clear ?? -Infinity, g);
        }
  const depth = centre.map((_, i) => depthAt(i));
  const target = centre.map((c, i) => {
    if (c.clear !== null) return c.clear + SOFFIT_CLEARANCE + DECK + depth[i];
    // Inside the portal hood the grid blends in the hillside over the tunnel; the
    // mouth takes its height from the open cut beyond.
    if (c.s < MOUTH) return -Infinity;
    // The crest is taken between the outer rails plus 1 m: an embankment crest lies
    // there, while a cut's side slopes (smeared into the 5 m grid) lie beyond it.
    let top = -Infinity;
    const half = c.half - 1.1;
    const samples: { o: number; h: number }[] = [];
    for (let k = 0; k <= 10; k++) {
      const o = -half + (2 * half * k) / 10;
      const h = ground(c.x + c.nx * o, c.z + c.nz * o);
      if (h !== null) samples.push({ o, h });
    }
    if (!samples.length) return -Infinity;
    // In a walled cut both shoulders stand above the track floor; take the crest
    // only between each track's running rails there.
    const tracksOnly = samples.filter(({ o }) => Math.abs(Math.abs(o) - (c.half - 2.1)) <= 0.75);
    const floor = Math.max(...(tracksOnly.length ? tracksOnly : samples).map(({ h }) => h));
    const cut = samples[0].h > floor + 0.5 && samples[samples.length - 1].h > floor + 0.5;
    top = cut ? floor : Math.max(...samples.map(({ h }) => h));
    return top + TREAD_LIFT;
  });
  // Grade-limited upper envelope, a 20 m moving average for vertical curves, then the
  // envelope again: an upper envelope of cones is itself grade-limited and never
  // drops below a target.
  const cone = (f: number[]) =>
    centre.map((c, i) => {
      let h = f[i];
      for (let j = 0; j < centre.length; j++) h = Math.max(h, f[j] - MAX_GRADE * 0.9 * Math.abs(c.s - centre[j].s));
      return h;
    });
  let height = cone(target);
  for (let pass = 0; pass < 2; pass++)
    height = height.map((_, i) => {
      let sum = 0,
        n = 0;
      for (let j = Math.max(0, i - 5); j <= Math.min(height.length - 1, i + 5); j++) {
        sum += height[j];
        n++;
      }
      return sum / n;
    });
  height = cone(height.map((h, i) => Math.max(h, target[i])));
  // Each track reads the shared profile at the matching distance along track a,
  // which defines the centre stations. Projecting onto the spine instead would
  // zigzag where the two tracks' span ends are staggered.
  const onA = (s: number) => {
    const i = THREE.MathUtils.clamp(Math.floor(s / STEP), 0, centre.length - 2),
      f = THREE.MathUtils.clamp(s / STEP - i, 0, 1);
    return height[i] + (height[i + 1] - height[i]) * f;
  };
  const perTrack = new Map<Line, Float64Array>();
  for (const line of tracks) {
    const h = new Float64Array(Math.ceil(line.length) + 1);
    for (let u = 0; u < h.length; u++) {
      const p = line.at(Math.min(u, line.length));
      h[u] = onA(line === a ? u : nearestOn(a, p.x, p.z).s);
    }
    perTrack.set(line, h);
  }
  const bridgeAt = (line: Line, along: number) => {
    const p = line.at(THREE.MathUtils.clamp(along, 0, line.length));
    return spans.some((l) => nearestOn(l, p.x, p.z).d < 0.6);
  };
  return {
    centre,
    depth,
    height,
    target,
    bridgeAt,
    /** Tread top (scene y) on a track at a distance along it. */
    at(line: Line, along: number) {
      const h = perTrack.get(line)!;
      const u = THREE.MathUtils.clamp(along, 0, h.length - 1),
        i = Math.min(h.length - 2, Math.floor(u));
      return h[i] + (h[i + 1] - h[i]) * (u - i);
    },
  };
}

export type NorthLineProfile = ReturnType<typeof northLineProfile>;

/** Third rail centre from the track centre: outside the running rail. */
const THIRD_RAIL = 1.45;
const COVER = '#d8d2bf',
  CONDUCTOR = '#57585a',
  BRACKET = '#3f3d3a';
const BALLAST = '#7e7363',
  BALLAST_SIDE = '#6b6153',
  SLEEPER = '#523f33',
  RAIL = '#a69b8c',
  CONCRETE = '#a7a49b',
  GIRDER = '#97948b',
  SOFFIT = '#7f7c75',
  WALL = '#9d998f';

/** Ballasted track on bare earth, and a shared concrete deck and box girder on spans. */
export function northLineGuideway(tracks: Line[], profile: NorthLineProfile, ground: Ground) {
  const body = new Builder();
  for (const line of tracks) {
    const other = tracks.find((t) => t !== line)!;
    const stations: number[] = [];
    for (let s = 0; s < line.length; s += 1) stations.push(s);
    stations.push(line.length);
    let prev: { l: number[]; r: number[]; p: { x: number; z: number }; nx: number; nz: number; h: number; bridge: boolean; innerLeft: boolean | null } | null = null;
    for (const along of stations) {
      const p = line.at(along),
        h = profile.at(line, along),
        bridge = profile.bridgeAt(line, along);
      const nx = -p.dz,
        nz = p.dx;
      // Where the other track is close, widen the inner edge to meet its bed, so the
      // two lifted strips read as one double-track embankment with no slot between.
      const q = nearestOn(other, p.x, p.z);
      const shared = q.d < 7;
      const innerLeft = shared ? (q.x - p.x) * nx + (q.z - p.z) * nz < 0 : null;
      const inner = shared ? Math.max(2.1, q.d / 2 + 0.02) : 2.1;
      const left = innerLeft === true ? inner : 2.1,
        right = innerLeft === false ? inner : 2.1;
      const l = [p.x - nx * left, h, p.z - nz * left],
        r = [p.x + nx * right, h, p.z + nz * right];
      if (prev && !bridge && !prev.bridge) {
        body.quad(prev.l, l, r, prev.r, BALLAST);
        const sides: [number[], number[]][] = [];
        if (!(shared && innerLeft === true)) sides.push([prev.l, l]);
        if (!(shared && innerLeft === false)) sides.push([r, prev.r]);
        for (const [e0, e1] of sides) {
          const g0 = ground(e0[0], e0[2]),
            g1 = ground(e1[0], e1[2]);
          if (g0 !== null && g1 !== null && (e0[1] - g0 > 0.05 || e1[1] - g1 > 0.05))
            // A tall drop beside the bed reads as a cast retaining wall, as at the photographed north abutment.
            body.quad(e0, e1, [e1[0], Math.min(g1, e1[1]) - 0.15, e1[2]], [e0[0], Math.min(g0, e0[1]) - 0.15, e0[2]],
              Math.max(e0[1] - g0, e1[1] - g1) > 1.2 ? WALL : BALLAST_SIDE);
        }
      }
      // A sleeper every metre on ballast; on a span the rails sit on concrete plinths.
      if (!bridge) orientedBox(body, p.x, p.z, p.dx, p.dz, h - 0.02, h + 0.04, 0.125, 1.3, SLEEPER);
      else orientedBox(body, p.x, p.z, p.dx, p.dz, h - 0.2, h, 0.5, 1.15, CONCRETE);
      if (prev)
        for (const o of [-0.7175, 0.7175]) {
          const w = 0.04;
          const a0 = (d: number) => [prev!.p.x + prev!.nx * (o + d), prev!.h + 0.07, prev!.p.z + prev!.nz * (o + d)];
          const a1 = (d: number) => [p.x + nx * (o + d), h + 0.07, p.z + nz * (o + d)];
          body.quad(a0(-w), a1(-w), a1(w), a0(w), RAIL);
        }
      // Covered third rail on the field side, away from the other track (750 V,
      // per OSM; the side and cover colour are inferred, never photographed).
      if (prev) {
        const side = innerLeft === true ? 1 : -1;
        const at = (q: { x: number; z: number }, qnx: number, qnz: number, y: number, d: number) =>
          [q.x + qnx * (THIRD_RAIL * side + d), y, q.z + qnz * (THIRD_RAIL * side + d)];
        const y0 = prev.h + 0.3,
          y1 = h + 0.3;
        // Cover board on top, its outer skirt down to the rail.
        body.quad(at(prev.p, prev.nx, prev.nz, y0, -0.16), at(p, nx, nz, y1, -0.16), at(p, nx, nz, y1, 0.16), at(prev.p, prev.nx, prev.nz, y0, 0.16), COVER);
        body.quad(at(prev.p, prev.nx, prev.nz, y0 - 0.2, 0.16 * side), at(p, nx, nz, y1 - 0.2, 0.16 * side), at(p, nx, nz, y1, 0.16 * side), at(prev.p, prev.nx, prev.nz, y0, 0.16 * side), CONDUCTOR);
        if (Math.round(along) % 4 === 0) {
          const [bx, , bz] = at(p, nx, nz, h, 0);
          orientedBox(body, bx, bz, p.dx, p.dz, h, h + 0.3, 0.06, 0.12, BRACKET);
        }
      }
      prev = { l, r, p, nx, nz, h, bridge, innerLeft };
    }
  }
  // Shared deck and box girder along the centre over each span.
  const c = profile.centre;
  let start = -1;
  for (let i = 0; i <= c.length; i++) {
    const on = i < c.length && c[i].bridge;
    if (on && start < 0) start = i;
    if (!on && start >= 0) {
      deckRun(body, profile, Math.max(0, start - 1), Math.min(c.length - 1, i));
      start = -1;
    }
  }
  const mesh = new THREE.Mesh(body.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  mesh.name = 'North Line guideway';
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** A box aligned with the track direction (dx, dz): half-lengths along and across. */
export function orientedBox(body: Builder, x: number, z: number, dx: number, dz: number, lo: number, hi: number, along: number, across: number, color: string) {
  const nx = -dz,
    nz = dx;
  const c = (u: number, v: number, y: number) => [x + dx * u + nx * v, y, z + dz * u + nz * v];
  const corners: [number, number][] = [
    [-along, -across],
    [along, -across],
    [along, across],
    [-along, across],
  ];
  body.quad(c(...corners[0], hi), c(...corners[3], hi), c(...corners[2], hi), c(...corners[1], hi), color);
  for (let i = 0; i < 4; i++) {
    const [u0, v0] = corners[i],
      [u1, v1] = corners[(i + 1) % 4];
    body.quad(c(u0, v0, lo), c(u0, v0, hi), c(u1, v1, hi), c(u1, v1, lo), color);
  }
}

/** Cast-in-place box girder: thin overhanging slab, sloped webs, flat soffit. */
function deckRun(body: Builder, profile: NorthLineProfile, i0: number, i1: number) {
  const c = profile.centre;
  const section = (i: number) => {
    const p = c[i],
      top = profile.height[i] - DECK,
      w = p.half - 2.1 + 2.6;
    const at = (o: number, y: number) => [p.x + p.nx * o, y, p.z + p.nz * o];
    return {
      slabL: at(-w, top),
      slabR: at(w, top),
      edgeL: at(-w, top - 0.35),
      edgeR: at(w, top - 0.35),
      webTopL: at(-(w - 1.5), top - 0.35),
      webTopR: at(w - 1.5, top - 0.35),
      botL: at(-(w - 2.4), top - profile.depth[i]),
      botR: at(w - 2.4, top - profile.depth[i]),
    };
  };
  for (let i = i0; i < i1; i++) {
    const a = section(i),
      b = section(i + 1);
    body.quad(a.slabL, b.slabL, b.slabR, a.slabR, CONCRETE);
    body.quad(a.slabL, a.edgeL, b.edgeL, b.slabL, CONCRETE);
    body.quad(a.slabR, b.slabR, b.edgeR, a.edgeR, CONCRETE);
    body.quad(a.edgeL, a.webTopL, b.webTopL, b.edgeL, SOFFIT);
    body.quad(a.edgeR, b.edgeR, b.webTopR, a.webTopR, SOFFIT);
    body.quad(a.webTopL, a.botL, b.botL, b.webTopL, GIRDER);
    body.quad(a.webTopR, b.webTopR, b.botR, a.botR, GIRDER);
    body.quad(a.botL, a.botR, b.botR, b.botL, SOFFIT);
  }
  for (const i of [i0, i1]) {
    const s = section(i);
    body.quad(s.slabL, s.slabR, s.edgeR, s.edgeL, CONCRETE);
    body.quad(s.webTopL, s.webTopR, s.botR, s.botL, GIRDER);
  }
}

type RoadLike = { cls: string; sub?: string | null; pts: P2[] };

/**
 * Pier stations along each span: single rectangular columns about 20-45 m apart
 * (longer where carriageways leave no gore), set where neither a rendered connector lane nor a mapped road (at its
 * drawn width plus 1 m) falls under the footprint.
 */
export function northLinePiers(
  profile: NorthLineProfile,
  roads: readonly RoadLike[],
  onLanes: (x: number, z: number) => boolean,
  rail: readonly TransportRun[] = [],
  ground: Ground = () => null,
) {
  const c = profile.centre;
  const clear = pierObstacles(roads, onLanes, rail.filter((r) => r.name !== NORTH_LINE));
  const clearAt = (i: number) => clear(c[i].x, c[i].z, c[i].nx, c[i].nz);
  // Keep piers out of the channel a roadless span crosses: not on its lowest 1.5 m.
  const low = (i: number, from: number, to: number) => {
    for (let j = from; j <= to; j++) if (c[j].clear !== null) return false;
    const g = ground(c[i].x, c[i].z);
    if (g === null) return false;
    let min = Infinity;
    for (let j = from; j <= to; j++) min = Math.min(min, ground(c[j].x, c[j].z) ?? Infinity);
    return g < min + 1.5;
  };
  const piers: number[] = [];
  let start = -1;
  for (let i = 0; i <= c.length; i++) {
    const on = i < c.length && c[i].bridge;
    if (on && start < 0) start = i;
    if (!on && start >= 0) {
      const end = i - 1;
      let last = c[start].s;
      while (c[end].s - last > 45) {
        let pick = -1;
        for (let j = start; j <= end; j++) {
          const d = c[j].s - last;
          if (d < 20 || d > 45 || c[end].s - c[j].s < 10) continue;
          if (clearAt(j) && !low(j, start, end)) pick = j; // the farthest clear station keeps spans long
        }
        // No clear ground within 45 m: span the carriageways to the nearest clear gore.
        if (pick < 0)
          for (let j = start; j <= end; j++)
            if (c[j].s - last > 45 && c[end].s - c[j].s >= 10 && clearAt(j) && !low(j, start, end)) {
              pick = j;
              break;
            }
        if (pick < 0) break;
        piers.push(pick);
        last = c[pick].s;
      }
      start = -1;
    }
  }
  return piers;
}

const PIER = '#9b978d',
  RAILING = '#b9bcb8';

/** Piers, railings, abutment walls and the small deck lamps of the spans. */
export function northLineStructure(profile: NorthLineProfile, piers: number[], ground: Ground) {
  const body = new Builder(),
    lights = new Builder();
  const c = profile.centre;
  for (const i of piers) {
    const p = c[i];
    const corners = [-1.1, 1.1].flatMap((u) => [-1, 1].map((v) => ground(p.x + p.nz * u + p.nx * v, p.z - p.nx * u + p.nz * v)));
    if (corners.some((g) => g === null)) continue;
    const g = Math.min(...(corners as number[]));
    const soffit = profile.height[i] - DECK - profile.depth[i];
    if (g >= soffit - 1.5) continue;
    // Plain rectangular column with a flared cap under the girder (from the photographs).
    orientedBox(body, p.x, p.z, p.nz, -p.nx, g - 0.4, soffit - 1.1, 1.1, 1.0, PIER);
    orientedBox(body, p.x, p.z, p.nz, -p.nx, soffit - 1.1, soffit - 0.5, 1.1, 1.6, PIER);
    orientedBox(body, p.x, p.z, p.nz, -p.nx, soffit - 0.5, soffit + 0.05, 1.2, 2.2, PIER);
  }
  let start = -1;
  for (let i = 0; i <= c.length; i++) {
    const on = i < c.length && c[i].bridge;
    if (on && start < 0) start = i;
    if (!on && start >= 0) {
      const i0 = Math.max(0, start - 1),
        i1 = Math.min(c.length - 1, i);
      // Pipe railings along both deck edges: posts every 2 m, top and mid rails.
      for (const side of [-1, 1]) {
        let prev: number[][] | null = null;
        for (let j = i0; j <= i1; j++) {
          const p = c[j],
            w = p.half - 2.1 + 2.5,
            top = profile.height[j] - 0.15;
          const x = p.x + p.nx * w * side,
            z = p.z + p.nz * w * side;
          orientedBox(body, x, z, p.nz, -p.nx, top, top + 1.1, 0.04, 0.04, RAILING);
          const rails = [
            [x, top + 1.08, z],
            [x, top + 0.55, z],
          ];
          if (prev)
            for (let k = 0; k < 2; k++) {
              const a = prev[k],
                b = rails[k];
              body.quad(a, b, [b[0], b[1] + 0.05, b[2]], [a[0], a[1] + 0.05, a[2]], RAILING);
            }
          prev = rails;
        }
      }
      // Abutment end walls from the soffit down to the bank, set 0.2 m behind the
      // girder's end cap and following the ground across their width.
      for (const [j, back] of [
        [i0, -1],
        [i1, 1],
      ] as const) {
        const p = c[j],
          w = p.half - 2.1 + 2.6,
          top = profile.height[j] - 0.5;
        const tx = p.nz * back * 0.2,
          tz = -p.nx * back * 0.2;
        const edge = [-1, -0.5, 0, 0.5, 1].map((f) => {
          const x = p.x + p.nx * w * f + tx,
            z = p.z + p.nz * w * f + tz;
          return [x, ground(x, z), z] as const;
        });
        for (let k = 1; k < edge.length; k++) {
          const [ax, ag, az] = edge[k - 1],
            [bx, bg, bz] = edge[k];
          if (ag === null || bg === null || top - Math.min(ag, bg) < 0.3) continue;
          body.quad([ax, ag - 0.3, az], [ax, top, az], [bx, top, bz], [bx, bg - 0.3, bz], WALL);
        }
      }
      // A small pole lamp on the railing at mid-span (one is visible in the photographs).
      const m = c[Math.round((i0 + i1) / 2)],
        w = m.half - 2.1 + 2.5,
        top = profile.height[Math.round((i0 + i1) / 2)] - 0.15;
      orientedBox(body, m.x + m.nx * w, m.z + m.nz * w, m.nz, -m.nx, top, top + 3.2, 0.05, 0.05, RAILING);
      lights.box(0.35, 0.18, 0.35, m.x + m.nx * (w - 0.3), top + 3.2, m.z + m.nz * (w - 0.3), '#fff1d4');
      start = -1;
    }
  }
  const mesh = new THREE.Mesh(body.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  mesh.name = 'North Line spans';
  mesh.castShadow = mesh.receiveShadow = true;
  const lamps = new THREE.Mesh(lights.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#fff1d4', emissiveIntensity: 0 }));
  lamps.name = 'North Line span lamps';
  return { mesh, lamps };
}

/** Girder depth at each centre station from the span between its supports. */
export function northLineDepths(profile: NorthLineProfile, piers: number[]) {
  const c = profile.centre;
  const depth = c.map(() => GIRDER_DEPTH);
  let start = -1;
  for (let i = 0; i <= c.length; i++) {
    const on = i < c.length && c[i].bridge;
    if (on && start < 0) start = i;
    if (!on && start >= 0) {
      const supports = [Math.max(0, start - 1), ...piers.filter((j) => j > start && j < i - 1), Math.min(c.length - 1, i)];
      for (let k = 1; k < supports.length; k++) {
        const d = girderDepthFor(c[supports[k]].s - c[supports[k - 1]].s);
        for (let j = supports[k - 1]; j <= supports[k]; j++) depth[j] = Math.max(j === supports[k - 1] && k > 1 ? depth[j] : 0, d);
      }
      start = -1;
    }
  }
  return depth;
}
