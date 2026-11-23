import * as THREE from 'three';
import type { TransportRun } from '../terrain/transport-data';
import { Builder, Line, type P2 } from '../vignette/geom';

type Ground = (x: number, z: number) => number | null;

export const NORTH_LINE = 'MARTA North Line';
/** Steepest designed grade on the open North Line (inferred; typical heavy-rail limit). */
export const MAX_GRADE = 0.035;
/** Deck top to ground beneath a span: 4.9 m road clearance plus the ~2 m box girder. */
export const BRIDGE_CLEARANCE = 6.9;
/** Ballast tread top above the highest ground across its width. */
const TREAD_LIFT = 0.13;
const STEP = 2;

/**
 * North of the portal the guideway draws the North Line itself, so the generic
 * strips skip it. The runs stay in the row data for crossings and placement.
 */
export function northLineRail(row: string, rail: TransportRun[]) {
  if (row !== 'brookwood-station') return rail;
  return rail.map((run) => (run.name === NORTH_LINE ? { ...run, replaced: true } : run));
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
 * ground across both treads, and over a span it keeps the deck at least
 * BRIDGE_CLEARANCE above the ground beneath. A grade-limited envelope joins the
 * two, so bridge ends meet their banks without a step.
 */
export function northLineProfile(tracks: Line[], runs: readonly TransportRun[], ground: Ground) {
  const [a, b] = tracks;
  const spans = runs.filter((r) => r.name === NORTH_LINE && r.kind === 'bridge').map((r) => new Line(r.pts));
  const centre: { x: number; z: number; s: number; nx: number; nz: number; half: number; bridge: boolean }[] = [];
  for (let s = 0; s <= a.length; s += STEP) {
    const p = a.at(s),
      q = nearestOn(b, p.x, p.z);
    const x = (p.x + q.x) / 2,
      z = (p.z + q.z) / 2;
    const bridge = spans.some((l) => nearestOn(l, x, z).d < 3.2);
    centre.push({ x, z, s, nx: -p.dz, nz: p.dx, half: q.d / 2 + 2.1, bridge });
  }
  const target = centre.map((c) => {
    let top = -Infinity;
    const half = c.bridge ? c.half + 0.6 : c.half;
    for (let k = 0; k <= 10; k++) {
      const o = -half + (2 * half * k) / 10;
      const h = ground(c.x + c.nx * o, c.z + c.nz * o);
      if (h !== null) top = Math.max(top, h);
    }
    return top + (c.bridge ? BRIDGE_CLEARANCE : TREAD_LIFT);
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
    let prev: { l: number[]; r: number[]; bridge: boolean } | null = null;
    for (let s = 0; s <= line.length + 1e-6; s += 1) {
      const along = Math.min(s, line.length);
      const p = line.at(along),
        h = profile.at(line, along),
        bridge = profile.bridgeAt(line, along);
      const nx = -p.dz,
        nz = p.dx;
      const l = [p.x - nx * 2.1, h, p.z - nz * 2.1],
        r = [p.x + nx * 2.1, h, p.z + nz * 2.1];
      if (prev && !bridge && !prev.bridge) {
        body.quad(prev.l, l, r, prev.r, BALLAST);
        for (const [e0, e1] of [
          [prev.l, l],
          [r, prev.r],
        ]) {
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
      if (prev) {
        for (const o of [-0.7175, 0.7175]) {
          const a0 = [prev.l[0] + (prev.r[0] - prev.l[0]) * (0.5 + o / 4.2), prev.l[1] + 0.07, prev.l[2] + (prev.r[2] - prev.l[2]) * (0.5 + o / 4.2)];
          const a1 = [l[0] + (r[0] - l[0]) * (0.5 + o / 4.2), l[1] + 0.07, l[2] + (r[2] - l[2]) * (0.5 + o / 4.2)];
          const w = 0.04;
          body.quad(
            [a0[0] - nx * w, a0[1], a0[2] - nz * w],
            [a1[0] - nx * w, a1[1], a1[2] - nz * w],
            [a1[0] + nx * w, a1[1], a1[2] + nz * w],
            [a0[0] + nx * w, a0[1], a0[2] + nz * w],
            RAIL,
          );
        }
      }
      prev = { l, r, bridge };
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
      top = profile.height[i] - 0.15,
      w = p.half - 2.1 + 2.6;
    const at = (o: number, y: number) => [p.x + p.nx * o, y, p.z + p.nz * o];
    return {
      slabL: at(-w, top),
      slabR: at(w, top),
      edgeL: at(-w, top - 0.35),
      edgeR: at(w, top - 0.35),
      webTopL: at(-(w - 1.5), top - 0.35),
      webTopR: at(w - 1.5, top - 0.35),
      botL: at(-(w - 2.4), top - 2.05),
      botR: at(w - 2.4, top - 2.05),
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
