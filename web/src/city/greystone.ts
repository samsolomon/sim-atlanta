/**
 * Greystone, Piedmont Park's 1926 granite bathhouse, and the Aquatic Center pool between it and
 * Lake Clara Meer (docs/piedmont-details.md). Plan positions are reported: the building parts
 * follow the OSM footprint (way 182313892), the pool sits at OSM's pool centre (about 34 × 26 m).
 * Walls, roofs, pergolas and lamps are estimated from photographs:
 *  - day, across the lake: light-grey granite ashlar, pale grey shingle roofs, a taller hipped
 *    centre pavilion with a round-arched entry, long one-storey wings with a window band, hipped
 *    end pavilions, white butterfly shade pergolas and twin-globe lamp posts on the pool deck,
 *    and a low granite lake wall with a buff coping
 *    (https://commons.wikimedia.org/wiki/File:View_of_the_Piedmont_Park_Aquatic_Center_and_the_midtown_Atlanta_skyline_from_across_Lake_Clara_Meer.jpg);
 *  - night: rows of warm globes along the deck and lit openings under the eaves, reflected in the
 *    lake (https://www.flickr.com/photos/31171751@N00/5167519050).
 * It reuses the Clara Meer materials (vertex-coloured stone, emissive lamps), so it adds no
 * shader program.
 */
import * as THREE from 'three';
import { Builder, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { waterLevel } from './clara-meer';

export const greystoneId = 'osm:way:182313892';
type Ground = (x: number, z: number) => number | null;

const GRANITE = '#c6c2b8', GRANITE_DARK = '#a9a59b', ROOF = '#a5aaaf', ROOF_RIDGE = '#979ca2', OPENING = '#34383d';
const COPING = '#c9bfa8', DECK = '#dcd8cf', POOL = '#5fb8c4', POOL_EDGE = '#eeeae0', WHITE = '#f1f0eb', IRON = '#1d2023';

/** One building part: an oriented rectangle (corners in order, the first edge along its length),
 *  its wall height and roof rise; `hip` slopes the ends too. Corners are OSM vertices. */
interface Part { c: [P2, P2, P2, P2]; wall: number; rise: number; hip: boolean; lake?: number }
const PARTS: Part[] = [
  // North end pavilion.
  { c: [[1602.9, -3508.7], [1605.4, -3500.6], [1616.4, -3504.0], [1614.2, -3511.8]], wall: 5.5, rise: 3.2, hip: true },
  // North wing, one storey with a window band on its lake (east) side.
  { c: [[1605.9, -3509.7], [1599.9, -3531.5], [1605.2, -3534.0], [1611.6, -3511.3]], wall: 4.4, rise: 2.2, hip: false, lake: 3 },
  // Centre pavilion: taller, hipped, with the round-arched entry toward the lake.
  { c: [[1591.2, -3531.5], [1591.2, -3550.5], [1609.0, -3549.8], [1607.6, -3531.5]], wall: 7.2, rise: 5.0, hip: true, lake: 2 },
  // South wing.
  { c: [[1601.1, -3553.3], [1611.5, -3574.9], [1616.7, -3572.0], [1605.8, -3550.1]], wall: 4.4, rise: 2.2, hip: false, lake: 2 },
  // South end pavilion.
  { c: [[1608.7, -3576.1], [1619.8, -3570.8], [1623.3, -3578.5], [1612.5, -3583.4]], wall: 5.5, rise: 3.2, hip: true },
];
/** The pool, traced from the leaf-off Esri World Imagery aerial (inferred): a rectangular lap
 *  pool and the free-form beach-entry lagoon south of it. The deck around them, and the lake
 *  wall along the OSM shore. */
const LAP: P2[] = [[1624.5, -3546.1], [1649.3, -3546.1], [1649.3, -3536.2], [1624.5, -3536.2]];
const LAGOON: P2[] = [[1622, -3532.2], [1638.8, -3533.2], [1641.3, -3529.2], [1646.3, -3523.3], [1645.8, -3516.3],
  [1641.8, -3511.4], [1633.9, -3510.4], [1626.4, -3511.4], [1622, -3517.3]];
const DECK_X: [number, number] = [1617.5, 1651.5], DECK_Z: [number, number] = [-3550, -3505];
const SHORE: P2[] = [[1647, -3488], [1660, -3577]];

const lerp = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export function createGreystone(buildings: VBuilding[], site: VBuilding, _base: number | null, ground: Ground) {
  if (site.id !== greystoneId) return null;
  const level = waterLevel(ground);
  const footprint = PARTS.flatMap(p => p.c);
  const grade = Math.min(...footprint.map(([x, z]) => ground(x, z) ?? Infinity));
  if (!Number.isFinite(grade) || level === null) return null;
  const stone = new Builder(), glow = new Builder(), lit = new Builder();

  for (const part of PARTS) {
    const [a, b, c, d] = part.c, y0 = grade - .4, y1 = grade + part.wall;
    // Walls, with a darker plinth course.
    for (const [p, q] of [[a, b], [b, c], [c, d], [d, a]] as [P2, P2][]) {
      stone.quad([p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], grade + .7, q[1]], [p[0], grade + .7, p[1]], GRANITE_DARK);
      stone.quad([p[0], grade + .7, p[1]], [q[0], grade + .7, q[1]], [q[0], y1, q[1]], [p[0], y1, p[1]], GRANITE);
    }
    // Roof: a ridge along the length, inset at the ends when hipped; small eaves.
    const mid = (p: P2, q: P2) => lerp(p, q, .5);
    const eave = (p: P2) => { const cx = (a[0] + b[0] + c[0] + d[0]) / 4, cz = (a[1] + b[1] + c[1] + d[1]) / 4; const l = Math.hypot(p[0] - cx, p[1] - cz) || 1; return [p[0] + (p[0] - cx) / l * .5, p[1] + (p[1] - cz) / l * .5] as P2; };
    const [ea, eb, ec, ed] = [a, b, c, d].map(eave);
    const width = Math.hypot(c[0] - b[0], c[1] - b[1]), length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const inset = part.hip ? Math.min(.45, width / 2 / Math.max(length, 1e-6)) : 0;
    const r0 = lerp(mid(ea, ed), mid(eb, ec), inset), r1 = lerp(mid(ea, ed), mid(eb, ec), 1 - inset), top = y1 + part.rise;
    stone.quad([ea[0], y1, ea[1]], [eb[0], y1, eb[1]], [r1[0], top, r1[1]], [r0[0], top, r0[1]], ROOF);
    stone.quad([ec[0], y1, ec[1]], [ed[0], y1, ed[1]], [r0[0], top, r0[1]], [r1[0], top, r1[1]], ROOF);
    if (part.hip) {
      stone.tri([ed[0], y1, ed[1]], [ea[0], y1, ea[1]], [r0[0], top, r0[1]], ROOF_RIDGE);
      stone.tri([eb[0], y1, eb[1]], [ec[0], y1, ec[1]], [r1[0], top, r1[1]], ROOF_RIDGE);
    } else {
      // Gable ends in granite.
      stone.tri([d[0], y1, d[1]], [a[0], y1, a[1]], [r0[0], top, r0[1]], GRANITE);
      stone.tri([b[0], y1, b[1]], [c[0], y1, c[1]], [r1[0], top, r1[1]], GRANITE);
    }
    // Openings, glowing warm at night (the lit material) and dark by day: the round-arched entry on
    // the centre pavilion's lake face (c→d), and a band of windows on every other face long
    // enough to hold one (the wings' window band; two or three on the pavilions' ends).
    const cx = (a[0] + b[0] + c[0] + d[0]) / 4, cz = (a[1] + b[1] + c[1] + d[1]) / 4;
    for (const [p, q] of [[a, b], [b, c], [c, d], [d, a]] as [P2, P2][]) {
      const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (len < 5) continue;
      // Outward normal, away from the part's centre.
      let nx = q[1] - p[1], nz = p[0] - q[0];
      const ml = lerp(p, q, .5);
      if (nx * (ml[0] - cx) + nz * (ml[1] - cz) < 0) { nx = -nx; nz = -nz; }
      const nl = Math.hypot(nx, nz) || 1;
      const faceGround = Math.max(grade, ...[0, .25, .5, .75, 1].map(t => { const m = lerp(p, q, t); return ground(m[0] + nx / nl, m[1] + nz / nl) ?? grade; }));
      const out = (t: number, h: number) => { const m = lerp(p, q, t); return [m[0] + nx / nl * .06, Math.min(faceGround + h, y1 - .3), m[1] + nz / nl * .06]; };
      // A quad wound to face along the outward normal (the lit material is front-sided).
      const pane = (t0: number, t1: number, h0: number, h1: number) => {
        const A = out(t0, h0), B = out(t1, h0), C = out(t1, h1), D = out(t0, h1);
        const ux = B[0] - A[0], uz = B[2] - A[2], fx = -uz, fz = ux; // (B-A) × up, the quad A,B,C,D's facing
        if (fx * nx + fz * nz > 0) lit.quad(A, B, C, D, OPENING); else lit.quad(A, D, C, B, OPENING);
      };
      const entry = part.lake !== undefined && part.wall > 6 && p === c;
      if (entry) {
        pane(.38, .62, .1, 4.6);
        for (let k = 0; k < 6; k++) {
          // Round arch over the entry, a fan of thin panes.
          const u0 = k / 6 * Math.PI, u1 = (k + 1) / 6 * Math.PI, w = .12, tc = .5;
          const A = out(tc, 4.6), B = out(tc - Math.cos(u0) * w, 4.6 + Math.sin(u0) * 1.4), C = out(tc - Math.cos(u1) * w, 4.6 + Math.sin(u1) * 1.4);
          lit.tri(A, B, C, OPENING); lit.tri(A, C, B, OPENING);
        }
        continue;
      }
      const n = Math.max(1, Math.floor(len / 3.8));
      for (let i = 0; i < n; i++) pane((i + .25) / n, (i + .75) / n, 1.6, Math.min(3.4, part.wall - .9));
    }
  }

  // Pool deck: a flat slab with skirts down to the ground, and the pool basin in it.
  const deckY = Math.max(...[[DECK_X[0], DECK_Z[0]], [DECK_X[1], DECK_Z[0]], [DECK_X[0], DECK_Z[1]], [DECK_X[1], DECK_Z[1]], [(DECK_X[0] + DECK_X[1]) / 2, (DECK_Z[0] + DECK_Z[1]) / 2]]
    .map(([x, z]) => ground(x, z) ?? grade)) + .15;
  const rect = (b: Builder, x0: number, x1: number, z0: number, z1: number, y: number, col: string) =>
    b.quad([x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0], col);
  // The deck slab, then the water drawn just above it with a white coping band.
  rect(stone, DECK_X[0], DECK_X[1], DECK_Z[0], DECK_Z[1], deckY, DECK);
  for (const poly of [LAP, LAGOON]) {
    const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length, cz = poly.reduce((a, p) => a + p[1], 0) / poly.length;
    const shrink = (p: P2, k: number): P2 => { const l = Math.hypot(p[0] - cx, p[1] - cz) || 1; return [p[0] - (p[0] - cx) / l * k, p[1] - (p[1] - cz) / l * k]; };
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], ai = shrink(a, .6), bi = shrink(b, .6);
      stone.quad([a[0], deckY + .04, a[1]], [b[0], deckY + .04, b[1]], [bi[0], deckY + .04, bi[1]], [ai[0], deckY + .04, ai[1]], POOL_EDGE);
      stone.tri([cx, deckY + .03, cz], [bi[0], deckY + .03, bi[1]], [ai[0], deckY + .03, ai[1]], POOL);
    }
  }
  for (const [x0, z0, x1, z1] of [[DECK_X[0], DECK_Z[0], DECK_X[1], DECK_Z[0]], [DECK_X[1], DECK_Z[0], DECK_X[1], DECK_Z[1]], [DECK_X[1], DECK_Z[1], DECK_X[0], DECK_Z[1]], [DECK_X[0], DECK_Z[1], DECK_X[0], DECK_Z[0]]]) {
    const g0 = Math.min(deckY - .1, (ground(x0, z0) ?? deckY) - .3), g1 = Math.min(deckY - .1, (ground(x1, z1) ?? deckY) - .3);
    stone.quad([x0, g0, z0], [x1, g1, z1], [x1, deckY, z1], [x0, deckY, z0], GRANITE_DARK);
  }

  // Three white butterfly shade pergolas along the deck in front of the building.
  for (const zc of [-3536, -3524, -3512]) {
    const x = DECK_X[0] + 2.5, half = 2.6, h = deckY + 3.2;
    for (const dz of [-half + .3, half - .3]) stone.box(.18, 3.2, .18, x, deckY + 1.6, zc + dz, WHITE);
    // Two canopy leaves rising outward from a central valley.
    stone.quad([x - 2, h + .5, zc - half], [x, h, zc - half], [x, h, zc + half], [x - 2, h + .5, zc + half], WHITE);
    stone.quad([x, h, zc - half], [x + 2, h + .5, zc - half], [x + 2, h + .5, zc + half], [x, h, zc + half], WHITE);
  }

  // Twin-globe lamp posts: along the deck's lake edge and in front of the building, as in the
  // photographs (count and spacing estimated).
  const lamps: P2[] = [];
  for (let z = DECK_Z[0] + 3; z <= DECK_Z[1] - 3; z += 7) lamps.push([DECK_X[1] - .8, z]);
  for (const z of [-3542, -3530, -3518, -3506]) lamps.push([DECK_X[0] + .8, z]);
  for (const [x, z] of lamps) {
    stone.box(.14, 3.6, .14, x, deckY + 1.8, z, IRON);
    stone.box(.9, .08, .08, x, deckY + 3.6, z, IRON);
    for (const dx of [-.42, .42]) glow.box(.34, .4, .34, x + dx, deckY + 3.85, z, '#ffd9a0');
  }

  // Lake wall along the deck's shore: a granite face from the water to the bank and a buff coping.
  for (let i = 0; i < 24; i++) {
    const p = lerp(SHORE[0], SHORE[1], i / 24), q = lerp(SHORE[0], SHORE[1], (i + 1) / 24);
    const yp = Math.max(level + .6, (ground(p[0], p[1]) ?? level) + .25), yq = Math.max(level + .6, (ground(q[0], q[1]) ?? level) + .25);
    stone.quad([p[0], level - .3, p[1]], [q[0], level - .3, q[1]], [q[0], yq, q[1]], [p[0], yp, p[1]], GRANITE_DARK);
    const n = [q[1] - p[1], p[0] - q[0]], l = Math.hypot(n[0], n[1]), w = .55;
    const pi: P2 = [p[0] - n[0] / l * w, p[1] - n[1] / l * w], qi: P2 = [q[0] - n[0] / l * w, q[1] - n[1] / l * w];
    stone.quad([p[0], yp, p[1]], [q[0], yq, q[1]], [qi[0], yq, qi[1]], [pi[0], yp, pi[1]], COPING);
  }

  const group = new THREE.Group();
  group.name = 'greystone';
  // The pool, its deck and the lake wall lie east of the bathhouse's OSM outline, as the leaf-off
  // aerial and the photo across the lake show; they belong to the site, up to about 47 m out.
  group.userData.footprint = { maxProjection: 48 };
  const make = (b: Builder, material: THREE.MeshLambertMaterial) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, material);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  // The Clara Meer materials exactly (same programs).
  make(stone, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  const lampMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#ffb45a', emissiveIntensity: 0 });
  const windowMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#ffc887', emissiveIntensity: 0 });
  make(glow, lampMaterial);
  make(lit, windowMaterial);
  return {
    buildings: buildings.filter(b => b.id !== site.id),
    group,
    /** Warm pools on the deck under each twin-globe post, for the row's night light map. */
    pools: lamps.map(at => ({ at, r: 6 })),
    triangles: (stone.pos.length + glow.pos.length + lit.pos.length) / 9,
    setNight(night: number) {
      lampMaterial.emissiveIntensity = night * 3;
      // Lit openings under the eaves: warm, but dimmer than the globes.
      windowMaterial.emissiveIntensity = night * 1.6;
    },
  };
}
