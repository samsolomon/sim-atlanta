import * as THREE from 'three';
import details from '../../../pipeline/prototypes/piedmont-edge/details.json';
import { Builder, type P2 } from '../vignette/geom';
import { g0, landscapeMesh, retainingEdge, type Ground } from '../landscape/primitives';

/**
 * Piedmont Park's Active Oval: two softball fields, two soccer fields and the sand
 * volleyball courts inside the gravel loop. Field outlines, the hub and the west
 * retaining walls are reported (OSM); the skinned infields, chalk, backstops, goals
 * and nets are illustrative, sized to the sports' standard dimensions and checked
 * against aerial and ground photographs (no field lights: the fields are unlit).
 *
 * Ground photographs show domed backstops and red-bordered nets over blue court tapes.
 *
 * Flat detail is painted into the board's ground map, so it costs nothing and shows
 * on both tiers. The standing hardware is one opaque and one see-through mesh, high tier only.
 */
type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };
const oval = details.oval;
const HUB = oval.hub.at as P2;
const PARK = '#adbe90', CLAY = '#c69c80', SAND = '#dcd0b0', CHALK = '#eeece2';
const STEEL = '#8a8f94', WHITE = '#f1f0ea', LINK = '#5b6168', NET = '#f4f3ee', NET_RED = '#c8463a', TAPE = '#3d5aa8';

const sub = (a: P2, b: P2): P2 => [a[0] - b[0], a[1] - b[1]];
const add = (a: P2, b: P2, k = 1): P2 => [a[0] + b[0] * k, a[1] + b[1] * k];
const unit = (v: P2): P2 => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
const contains = (b: Bounds, [x, z]: P2) => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;

/** A softball field from its mapped outline: the two longest edges are the foul lines, meeting at home. */
export function diamond(ring: P2[]) {
  const edges = ring.map((a, i) => [a, ring[(i + 1) % ring.length]] as [P2, P2])
    .sort((p, q) => Math.hypot(...sub(q[1], q[0])) - Math.hypot(...sub(p[1], p[0])));
  const [[a, b], [c, d]] = edges;
  // Intersect the two foul lines.
  const r = sub(b, a), s = sub(d, c), den = r[0] * s[1] - r[1] * s[0];
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den;
  const home = add(a, r, t);
  // Each foul line points away from home, toward the outfield.
  const away = (p: P2, q: P2) => unit(Math.hypot(...sub(p, home)) > Math.hypot(...sub(q, home)) ? sub(p, home) : sub(q, home));
  const first = away(a, b), third = away(c, d);
  return { home, first, third, mid: unit(add(first, third)) };
}

/** A rectangular pitch: its centre, the unit long axis and the half length and width. */
export function rectangle(ring: P2[]) {
  const c: P2 = [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length];
  const e0 = sub(ring[1], ring[0]), e1 = sub(ring[2], ring[1]);
  const [long, short] = Math.hypot(...e0) >= Math.hypot(...e1) ? [e0, e1] : [e1, e0];
  return { c, u: unit(long), v: unit(short), hl: Math.hypot(...long) / 2, hw: Math.hypot(...short) / 2 };
}

// Beach courts are 16 × 8 m; two sit side by side, crosswise in the mapped sand.
function courts(ring: P2[]) {
  const r = rectangle(ring);
  return [-1, 1].map(side => ({ c: add(r.c, r.u, side * 7), along: r.v, across: r.u }));
}

/** Paints the infields, sand and chalk into the board's ground map (both tiers). */
export function paintActiveOval(ctx: CanvasRenderingContext2D, bounds: Bounds) {
  if (!contains(bounds, HUB)) return;
  const poly = (pts: P2[]) => { ctx.beginPath(); pts.forEach(([x, z], i) => i ? ctx.lineTo(x, z) : ctx.moveTo(x, z)); ctx.closePath(); };
  const line = (a: P2, b: P2, w = .12) => { ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineWidth = w; ctx.strokeStyle = CHALK; ctx.stroke(); };
  const ring = (c: P2, r: number, w = .12) => { ctx.beginPath(); ctx.arc(c[0], c[1], r, 0, Math.PI * 2); ctx.lineWidth = w; ctx.strokeStyle = CHALK; ctx.stroke(); };
  // The oval is one park lawn: the fields carry no darker turf of their own.
  for (const f of [...oval.softball, ...oval.soccer]) {
    poly(f.ring as P2[]);
    ctx.fillStyle = PARK; ctx.fill();
    ctx.lineWidth = .7; ctx.strokeStyle = PARK; ctx.stroke();
  }
  for (const f of oval.softball) {
    const { home, first, third, mid } = diamond(f.ring as P2[]);
    // A fully skinned infield: a fan from home whose back arc centres near the pitcher's circle.
    const p = add(home, mid, 14), a0 = add(home, first, 24), a1 = add(home, third, 24);
    const r = Math.hypot(...sub(a0, p));
    const t0 = Math.atan2(a0[1] - p[1], a0[0] - p[0]), t1 = Math.atan2(a1[1] - p[1], a1[0] - p[0]);
    // Sweep through the outfield side of the pitcher's circle.
    const tm = Math.atan2(mid[1], mid[0]);
    const norm = (t: number) => ((t - tm + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    const from = tm + norm(t0), to = tm + norm(t1);
    ctx.beginPath(); ctx.moveTo(...home); ctx.lineTo(...a0);
    ctx.arc(p[0], p[1], r, from, to, from > to);
    ctx.closePath();
    ctx.fillStyle = CLAY; ctx.fill();
    // The dirt around home spreads past the foul lines to the backstop.
    const apron = add(home, mid, 1.5);
    ctx.beginPath(); ctx.arc(apron[0], apron[1], 7.5, 0, Math.PI * 2); ctx.fill();
    // Foul lines to the mapped outfield edge, and the 60 ft (18.3 m) bases.
    line(home, add(home, first, 58)); line(home, add(home, third, 58));
    ctx.fillStyle = CHALK;
    for (const base of [add(home, first, 18.3), add(home, mid, 25.9), add(home, third, 18.3)]) ctx.fillRect(base[0] - .3, base[1] - .3, .6, .6);
    ring(add(home, mid, 13.1), 2.4);
  }
  for (const f of oval.soccer) {
    const { c, u, v, hl, hw } = rectangle(f.ring as P2[]);
    const at = (s: number, t: number): P2 => add(add(c, u, s), v, t);
    poly([at(-hl, -hw), at(hl, -hw), at(hl, hw), at(-hl, hw)]);
    ctx.lineWidth = .12; ctx.strokeStyle = CHALK; ctx.stroke();
    line(at(0, -hw), at(0, hw));
    ring(c, 9.15);
    for (const end of [-1, 1]) {
      const box = (depth: number, half: number) => {
        ctx.beginPath(); ctx.moveTo(...at(end * hl, -half)); ctx.lineTo(...at(end * (hl - depth), -half));
        ctx.lineTo(...at(end * (hl - depth), half)); ctx.lineTo(...at(end * hl, half));
        ctx.lineWidth = .12; ctx.strokeStyle = CHALK; ctx.stroke();
      };
      box(16.5, Math.min(20.16, hw - 1)); box(5.5, 9.16);
      const spot = at(end * (hl - 11), 0);
      ctx.fillStyle = CHALK; ctx.fillRect(spot[0] - .2, spot[1] - .2, .4, .4);
    }
  }
  for (const f of oval.volleyball) {
    poly(f.ring as P2[]);
    ctx.fillStyle = SAND; ctx.fill();
    for (const k of courts(f.ring as P2[])) {
      const at = (s: number, t: number): P2 => add(add(k.c, k.along, s), k.across, t);
      poly([at(-8, -4), at(8, -4), at(8, 4), at(-8, 4)]);
      // Blue boundary tapes.
      ctx.lineWidth = .1; ctx.strokeStyle = TAPE; ctx.stroke();
    }
  }
}

/** A square steel member from a to b. */
function member(b: Builder, a: number[], c: number[], w: number, color: string) {
  const d = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]), len = d.length();
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2),
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()),
    new THREE.Vector3(1, 1, 1));
  b.box(w, len, w, 0, 0, 0, color, m);
}

/** A domed softball backstop, as at the Active Oval: a quarter-sphere cage of steel hoops and chain link behind the plate, open toward the field. */
function backstop(frame: Builder, mesh: Builder, ground: Ground, home: P2, mid: P2) {
  const R = 4.6, c = add(home, mid, -1.2), back: P2 = [-mid[0], -mid[1]], side: P2 = [-mid[1], mid[0]];
  const y0 = g0(ground, ...c);
  const at = (phi: number, theta: number) => {
    const r = R * Math.cos(theta), p = add(add(c, back, r * Math.cos(phi)), side, r * Math.sin(phi));
    return [p[0], y0 + R * .95 * Math.sin(theta), p[1]];
  };
  const PHI = 6, THETA = 3;
  const phi = (i: number) => -Math.PI / 2 + Math.PI * i / PHI, theta = (j: number) => Math.PI / 2 * j / THETA;
  for (let i = 0; i < PHI; i++) for (let j = 0; j < THETA; j++)
    mesh.quad(at(phi(i), theta(j)), at(phi(i + 1), theta(j)), at(phi(i + 1), theta(j + 1)), at(phi(i), theta(j + 1)), LINK);
  // Hoops from the ground to the crown, the open front arch and a ground rail.
  for (let i = 0; i <= PHI; i++) for (let j = 0; j < THETA; j++) member(frame, at(phi(i), theta(j)), at(phi(i), theta(j + 1)), .07, STEEL);
  for (let i = 0; i < PHI; i++) for (const j of [0, 1]) member(frame, at(phi(i), theta(j)), at(phi(i + 1), theta(j)), .06, STEEL);
}

/** A full-size goal (7.32 × 2.44 m) on the goal line, net sloping 2 m back. */
function goal(frame: Builder, mesh: Builder, ground: Ground, centre: P2, out: P2) {
  const side: P2 = [-out[1], out[0]], y0 = g0(ground, ...centre);
  const p = (s: number, d: number, h: number) => { const q = add(add(centre, side, s), out, d); return [q[0], y0 + h, q[1]]; };
  for (const s of [-3.66, 3.66]) {
    member(frame, p(s, 0, 0), p(s, 0, 2.44), .12, WHITE);
    member(frame, p(s, 0, 2.44), p(s, 1, 2.2), .05, WHITE);
    member(frame, p(s, 2, 0), p(s, 1, 2.2), .05, WHITE);
  }
  member(frame, p(-3.72, 0, 2.44), p(3.72, 0, 2.44), .12, WHITE);
  member(frame, p(-3.66, 1, 2.2), p(3.66, 1, 2.2), .05, WHITE);
  member(frame, p(-3.66, 2, .03), p(3.66, 2, .03), .05, WHITE);
  mesh.quad(p(-3.66, 1, 2.2), p(3.66, 1, 2.2), p(3.66, 0, 2.44), p(-3.66, 0, 2.44), NET);
  mesh.quad(p(-3.66, 2, 0), p(3.66, 2, 0), p(3.66, 1, 2.2), p(-3.66, 1, 2.2), NET);
  for (const s of [-3.66, 3.66]) mesh.quad(p(s, 0, 0), p(s, 2, 0), p(s, 1, 2.2), p(s, 0, 2.44), NET);
}

/** A beach volleyball net: posts 0.5 m outside the sidelines, a 1 m mesh with its top at 2.43 m. */
function volleyNet(frame: Builder, mesh: Builder, ground: Ground, c: P2, across: P2) {
  const y0 = g0(ground, ...c);
  const p = (t: number, h: number) => { const q = add(c, across, t); return [q[0], y0 + h, q[1]]; };
  for (const t of [-4.5, 4.5]) member(frame, p(t, -.1), p(t, 2.55), .1, STEEL);
  // Red-bordered nets, as on the courts today.
  member(frame, p(-4.5, 2.4), p(4.5, 2.4), .07, NET_RED);
  member(frame, p(-4.5, 1.43), p(4.5, 1.43), .05, NET_RED);
  for (const t of [-4.45, 4.45]) member(frame, p(t, 1.43), p(t, 2.43), .05, NET_RED);
  mesh.quad(p(-4.45, 1.43), p(4.45, 1.43), p(4.45, 2.37), p(-4.45, 2.37), '#2f3338');
}

/** The standing hardware, high tier only: one opaque mesh (frames, retaining walls) and one see-through mesh (chain link, nets). */
export function activeOval(bounds: Bounds, ground: Ground, quality: 'high' | 'low') {
  if (quality === 'low' || !contains(bounds, HUB)) return null;
  const frame = new Builder(), mesh = new Builder();
  for (const f of oval.softball) {
    const { home, mid } = diamond(f.ring as P2[]);
    backstop(frame, mesh, ground, home, mid);
  }
  for (const f of oval.soccer) {
    const { c, u, hl } = rectangle(f.ring as P2[]);
    for (const end of [-1, 1]) goal(frame, mesh, ground, add(c, u, end * hl), [u[0] * end, u[1] * end]);
  }
  for (const f of oval.volleyball) for (const k of courts(f.ring as P2[])) volleyNet(frame, mesh, ground, k.c, k.across);
  for (const w of oval.walls) retainingEdge(frame, w.pts as P2[], ground, { quality });
  const solid = landscapeMesh(frame);
  solid.mesh.name = 'active-oval';
  const geometry = mesh.geometry();
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: .38, depthWrite: false, side: THREE.DoubleSide });
  const see = new THREE.Mesh(geometry, material);
  see.name = 'active-oval-mesh';
  const group = new THREE.Group();
  group.name = 'Active Oval';
  group.add(solid.mesh, see);
  return {
    group,
    triangles: solid.triangles + mesh.pos.length / 9,
    dispose() { solid.dispose(); geometry.dispose(); material.dispose(); },
  };
}
