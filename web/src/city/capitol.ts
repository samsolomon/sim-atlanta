/**
 * The Georgia State Capitol (1889), replacing its generic 29 m extrusion. Sources and every
 * dimension's status are in docs/capitol.md.
 *
 * Heights are above HABS GA-2109's 0'-0" datum, the lowest exterior grade, anchored to the lowest
 * ground under the footprint. That anchor is an estimate.
 * Marks taken from HABS sheet 34:
 * - 149'-7" (45.6 m): drum colonnade top
 * - 162'-9" (49.6 m): dome spring
 * - 195'-9" (59.7 m): dome crown
 * - 207'-7" (63.3 m): lantern base
 * - 226'-2" (68.9 m): lantern cornice
 * - 233'-10" (71.3 m): lantern top
 * - 259'-7" (79.1 m): statue top
 * Wing, portico and drum-base heights are scaled from sheets 13 (west elevation) and 34
 * (1:128), to about ±0.5 m.
 */
import * as THREE from 'three';
import { Builder } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';

/** Overture footprint (OSM way 113041732), 84.9 × 107.5 m along its axes; HABS gives 83.0 × 106.0 m. */
export const CAPITOL_ID = '7c9beafb-b0fd-48e0-a815-a6daa864a0db';
/** Building frame: u runs toward the east front (Capitol Ave), v toward the south wing. */
const ANGLE = 33.13 * Math.PI / 180;
const ux = Math.cos(ANGLE), uz = Math.sin(ANGLE);
const CENTRE: [number, number] = [315.0, 538.4];
/** The cross's crossing, from the footprint's projections. The OSM dome part's centre is 0.6 m away. */
export const DOME_UV: [number, number] = [4.6, -2.3];
/** Footprint extents in the frame; a ring that has moved more than TOL means a different bake. */
const EXTENT = { u: [-42.5, 42.4], v: [-53.7, 53.7] } as const;
const TOL = 1.5;

/** Heights above the datum, in metres. */
export const H = {
  base: 10.2,        // rusticated ground storey (sheet 13, scaled)
  cornice: 24.0,     // wing cornice and balustrade (sheet 13, scaled)
  portico: 20.5,     // column capitals (sheet 13, scaled)
  landing: 2.3,      // entrance landing above grade (sheet 13, scaled)
  eastDoor: 2.2,     // east door sill above the lowest grade (sheet 20, scaled)
  entablature: 22.6, // portico entablature top (sheet 13, scaled)
  pediment: 26.6,    // pediment apex (sheet 13, scaled)
  clerestory: 30.3,  // atrium clerestory roofs (sheet 13, scaled)
  drumBase: 35.5,    // colonnade base (sheets 13 and 34, scaled)
  colonnade: 45.6,   // 149'-7"
  spring: 49.6,      // 162'-9"
  crown: 59.7,       // 195'-9"
  lanternBase: 63.3, // 207'-7"
  lanternCornice: 68.9, // 226'-2"
  lanternTop: 71.3,  // 233'-10"
  statue: 79.1,      // 259'-7"
} as const;
/** Radii, scaled: drum about 22 m and dome 20 m across (OSM's dome part is 19.8 m). */
const R = { drum: 11.6, colonnade: 10.4, columns: 11.2, attic: 10.8, dome: 10.0, platform: 3.4, lantern: 2.2 } as const;

const stone = '#d8d0bd', rustic = '#c4baa5', roof = '#8d8e8a', glass = '#5d6a74', shade = '#b9b09c';
const gold = '#d6a537', goldDeep = '#b98a2c', statue = '#c9b78c';
type GroundAt = (x: number, z: number) => number | null;

const toFrame = ([x, z]: readonly number[]) => {
  const dx = x - CENTRE[0], dz = z - CENTRE[1];
  return [dx * ux + dz * uz, -dx * uz + dz * ux] as [number, number];
};
const toScene = (u: number, v: number) => [CENTRE[0] + u * ux - v * uz, CENTRE[1] + u * uz + v * ux] as [number, number];

function cylinder(b: Builder, r: number, y0: number, y1: number, u: number, v: number, color: string, segments = 16, r1 = r) {
  const g = new THREE.CylinderGeometry(r1, r, y1 - y0, segments, 1, false);
  g.translate(u, (y0 + y1) / 2, v);
  b.addGeometry(g, color);
}

/** A vertical prism over a polygon (frame coordinates), from y0 to y1, walls in two colour bands. */
function prism(b: Builder, poly: [number, number][], y0: number, y1: number, wall: (y0: number, y1: number) => [number, number, string][], top: string) {
  for (let i = 0; i < poly.length; i++) {
    const [au, av] = poly[i], [bu, bv] = poly[(i + 1) % poly.length];
    for (const [lo, hi, col] of wall(y0, y1)) b.quad([au, lo, av], [bu, lo, bv], [bu, hi, bv], [au, hi, av], col);
  }
  const tris = THREE.ShapeUtils.triangulateShape(poly.map(([u, v]) => new THREE.Vector2(u, v)), []);
  for (const [i, j, k] of tris) b.tri([poly[i][0], y1, poly[i][1]], [poly[j][0], y1, poly[j][1]], [poly[k][0], y1, poly[k][1]], top);
}

/** An arched opening on the plane u = const (facing −u): a rectangle to the spring, then a half-round head. */
function arch(b: Builder, u: number, vc: number, half: number, y0: number, spring: number, color: string, segments = 6) {
  b.quad([u, y0, vc - half], [u, y0, vc + half], [u, spring, vc + half], [u, spring, vc - half], color);
  for (let k = 0; k < segments; k++) {
    const a0 = Math.PI * k / segments, a1 = Math.PI * (k + 1) / segments;
    b.tri([u, spring, vc], [u, spring + Math.sin(a0) * half, vc + Math.cos(a0) * half], [u, spring + Math.sin(a1) * half, vc + Math.cos(a1) * half], color);
  }
}

/** A pediment standing on the wall plane u = uFace, its roof sloping back `depth` metres (side −1 west, +1 east). */
function pediment(b: Builder, uFace: number, side: 1 | -1, v0: number, v1: number, eave: number, apex: number, depth = 3) {
  const back = uFace - side * depth, mid = (v0 + v1) / 2;
  for (const u of [uFace, back]) b.tri([u, eave, v0], [u, eave, v1], [u, apex, mid], stone);
  b.quad([uFace, eave, v0], [back, eave, v0], [back, apex, mid], [uFace, apex, mid], roof);
  b.quad([uFace, apex, mid], [back, apex, mid], [back, eave, v1], [uFace, eave, v1], roof);
}

/**
 * Window bays on a polygon's walls: one row in the rusticated ground storey and the tall second-
 * and third-floor windows (sheet 13). The roughly 3.8 m bay is scaled; the per-wall count is fitted
 * to each wall. Lit panes go to `lit` for night.
 */
function windows(b: Builder, lit: Builder, poly: [number, number][], y: (h: number) => number, seed: number) {
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const [au, av] = poly[i], [bu, bv] = poly[(i + 1) % poly.length];
    area += au * bv - bu * av;
  }
  const out = area > 0 ? -1 : 1; // outward normal sign for this winding
  let s = seed;
  const random = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const rows: [number, number][] = [[3.4, 6.2], [11.4, 15.6], [16.9, 20.6]];
  for (let i = 0; i < poly.length; i++) {
    const [au, av] = poly[i], [bu, bv] = poly[(i + 1) % poly.length];
    const len = Math.hypot(bu - au, bv - av);
    if (len < 3.2) continue;
    const tu = (bu - au) / len, tv = (bv - av) / len;
    const nu = -tv * out * 0.06, nv = tu * out * 0.06;
    const bays = Math.max(1, Math.round(len / 3.8)), bay = len / bays, half = Math.min(0.8, bay * 0.22);
    for (let k = 0; k < bays; k++) {
      const c = (k + 0.5) * bay;
      const p = (d: number, h: number, o = 1) => [au + tu * (c + d) + nu * o, y(h), av + tv * (c + d) + nv * o];
      for (const [h0, h1] of rows) {
        b.quad(p(-half, h0), p(half, h0), p(half, h1), p(-half, h1), '#46505a');
        if (h0 > 10 && random() < 0.3) lit.quad(p(-half + 0.1, h0 + 0.2, 2.5), p(half - 0.1, h0 + 0.2, 2.5), p(half - 0.1, h1 - 0.2, 2.5), p(-half + 0.1, h1 - 0.2, 2.5), '#e0bd88');
      }
    }
  }
}

/**
 * Build only when the generic footprint is present, unchanged, and on measured ground. Otherwise
 * return null and leave the generic building in place. The caller batches the returned buildings
 * and owns the returned group.
 */
export function createCapitol(buildings: VBuilding[], groundAt: GroundAt) {
  const generic = buildings.find((b) => b.id === CAPITOL_ID);
  const ring = generic?.rings[0];
  if (!ring || ring.length < 8) return null;
  const local = ring.map(toFrame);
  const us = local.map((p) => p[0]), vs = local.map((p) => p[1]);
  if (Math.abs(Math.min(...us) - EXTENT.u[0]) > TOL || Math.abs(Math.max(...us) - EXTENT.u[1]) > TOL ||
      Math.abs(Math.min(...vs) - EXTENT.v[0]) > TOL || Math.abs(Math.max(...vs) - EXTENT.v[1]) > TOL) return null;
  const grades = ring.map(([x, z]) => groundAt(x, z));
  if (grades.some((g) => g === null || !Number.isFinite(g))) return null;
  // HABS 0'-0" is the lowest exterior grade; the walls run a metre below it.
  const datum = Math.min(...(grades as number[]));
  const y = (h: number) => datum + h;
  const bottom = datum - 1;

  const b = new Builder(), g = new Builder(), lit = new Builder();
  // Wings and central block: the footprint without the west portico projection (u < −30).
  const body = local.filter(([u]) => u >= -30);
  prism(b, body, bottom, y(H.cornice), (y0, y1) => [[y0, y(H.base), rustic], [y(H.base), y1 - 0.9, stone], [y1 - 0.9, y1, shade]], roof);
  windows(b, lit, body, y, 1889);
  // West portico: a pavilion (u −37.4 to −26) fronted by six columns on rusticated piers in the
  // mapped forward projection (u −42.3 to −37.4, v −13.9 to 8.4), then entablature and pediment.
  const pu = -37.4, fu = -40.4, [f0, f1] = [-13.6, 8.1];
  prism(b, [[pu, -14.0], [-26, -14.0], [-26, 9.6], [pu, 9.6]], bottom, y(H.entablature), (y0, y1) => [[y0, y(H.base), rustic], [y(H.base), y1, stone]], roof);
  const cv = Array.from({ length: 6 }, (_, i) => f0 + 1.2 + i * (f1 - f0 - 2.4) / 5);
  // Ground storey (sheet 13): a rusticated pier under each column, with five arched bays between.
  // The middle three bays are the entrance doors above a full-width flight; the outer two are windows.
  for (const v of cv) b.box(pu - fu, y(H.base) - bottom, 1.9, (fu + pu) / 2, (bottom + y(H.base)) / 2, v, rustic);
  b.box(pu - fu, 0.9, f1 - f0, (fu + pu) / 2, y(H.base) - 0.45, (f0 + f1) / 2, shade); // impost course
  const face = pu - 0.06;
  for (let i = 0; i < 5; i++) {
    const vc = (cv[i] + cv[i + 1]) / 2, door = i > 0 && i < 4;
    arch(b, face, vc, 1.15, y(door ? H.landing : 3.4), y(6.6), door ? '#3a332c' : '#46505a');
    if (!door) b.quad([face, y(2.5), vc - 1.15], [face, y(2.5), vc + 1.15], [face, y(3.2), vc + 1.15], [face, y(3.2), vc - 1.15], shade);
    // Upper storey: tall arched windows between the columns, over balustrade panels.
    arch(b, face, vc, 1.2, y(11.6), y(18.2), '#46505a');
    b.quad([face, y(H.base) + 0.2, vc - 1.3], [face, y(H.base) + 0.2, vc + 1.3], [face, y(11.3), vc + 1.3], [face, y(11.3), vc - 1.3], shade);
  }
  // Steps: grade to the door landing (about 2.3 m, scaled) across the five bays, then a landing
  // between the piers up to the doors. Pedestals cap both ends.
  const treads = 7, run = (fu - -42.3) / treads, w0 = cv[0] + 0.95, w1 = cv[5] - 0.95;
  for (let t = 0; t < treads; t++) {
    const top = y(H.landing * (t + 1) / treads);
    b.box(run, top - bottom, w1 - w0, -42.3 + (t + 0.5) * run, (top + bottom) / 2, (w0 + w1) / 2, rustic);
  }
  b.box(pu - fu, y(H.landing) - bottom, w1 - w0, (fu + pu) / 2, (y(H.landing) + bottom) / 2, (w0 + w1) / 2, rustic);
  for (const v of [cv[0], cv[5]]) b.box(1.7, y(2.9) - bottom, 1.4, -41.4, (y(2.9) + bottom) / 2, v, rustic);
  for (let i = 0; i < 6; i++) cylinder(b, 0.75, y(H.base), y(H.portico), fu + 1.2, cv[i], stone, 10, 0.68);
  prism(b, [[fu, f0], [pu, f0], [pu, f1], [fu, f1]], y(H.portico), y(H.entablature), () => [[y(H.portico), y(H.entablature), stone]], shade);
  const apex = y(H.pediment), eave = y(H.entablature), mid = (f0 + f1) / 2;
  for (const u of [fu, -26]) b.tri([u, eave, f0], [u, eave, f1], [u, apex, mid], stone);
  for (const [va, vb] of [[f0, mid], [mid, f1]] as const) {
    const ya = va === mid ? apex : eave, yb = vb === mid ? apex : eave;
    b.quad([fu, ya, va], [-26, ya, va], [-26, yb, vb], [fu, yb, vb], roof);
  }
  // End-pavilion pediments on both fronts, and the east front's central pediment, arched door and
  // stair (sheets 13 and 20). Pediment heights are scaled to about ±0.5 m.
  const sill = y(H.cornice) - 0.6, peak = y(H.cornice) + 1.6;
  for (const [v0, v1] of [[-51.6, -37.5], [32.1, 46.3]]) pediment(b, -22.3, -1, v0, v1, sill, peak);
  for (const [v0, v1] of [[-51.5, -37.0], [32.5, 46.8]]) pediment(b, 31.6, 1, v0, v1, sill, peak);
  pediment(b, 42.1, 1, -8.9, 5.4, sill, y(H.cornice) + 2.0, 4);
  arch(b, 42.16, -1.55, 1.3, y(H.eastDoor), y(5.8), '#3a332c');
  for (let t = 0; t < 5; t++) {
    const top = y(H.eastDoor * (t + 1) / 5), u = 42.1 + (4 - t + 0.5) * 0.45;
    b.box(0.45, top - bottom, 8.6, u, (top + bottom) / 2, -1.55, rustic);
  }
  // Atrium clerestories over the north and south wings (spans from sheet 13; depth estimated).
  for (const [v0, v1] of [[-38.2, -17.6], [13.2, 33.8]]) {
    prism(b, [[-6, v0], [14, v0], [14, v1], [-6, v1]], y(H.cornice), y(H.clerestory),
      (y0, y1) => [[y0, y0 + 1.2, stone], [y0 + 1.2, y1 - 0.8, glass], [y1 - 0.8, y1, shade]], roof);
    // Piers between the arched clerestory windows (four per side on sheet 13).
    for (let k = 0; k <= 4; k++) {
      const v = v0 + (v1 - v0) * k / 4, u = -6 + 20 * k / 4;
      for (const uu of [-6.05, 14.05]) b.box(0.25, H.clerestory - H.cornice - 2, 0.9, uu, y(H.cornice) + 1.2 + (H.clerestory - H.cornice - 2) / 2, v, stone);
      for (const vv of [v0 - 0.05, v1 + 0.05]) b.box(0.9, H.clerestory - H.cornice - 2, 0.25, u, y(H.cornice) + 1.2 + (H.clerestory - H.cornice - 2) / 2, vv, stone);
    }
  }
  // Drum: plain base, colonnade around a recessed core, attic.
  const [du, dv] = DOME_UV;
  cylinder(b, R.drum, y(H.cornice) - 0.5, y(H.drumBase), du, dv, stone, 20);
  cylinder(b, R.colonnade, y(H.drumBase), y(H.colonnade), du, dv, shade, 20);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    cylinder(b, 0.42, y(H.drumBase), y(H.colonnade) - 1.0, du + Math.cos(a) * R.columns, dv + Math.sin(a) * R.columns, stone, 6);
  }
  cylinder(b, R.columns + 0.6, y(H.colonnade) - 1.0, y(H.colonnade), du, dv, stone, 20);
  cylinder(b, R.attic, y(H.colonnade), y(H.spring), du, dv, stone, 20);
  // Gold leaf (1959) covers the dome and lantern.
  const dome = new THREE.SphereGeometry(R.dome, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.scale(1, (H.crown - H.spring) / R.dome, 1);
  dome.translate(du, y(H.spring), dv);
  g.addGeometry(dome, gold);
  cylinder(g, R.platform, y(H.crown) - 0.6, y(H.lanternBase), du, dv, goldDeep, 12);
  cylinder(g, R.lantern, y(H.lanternBase), y(H.lanternCornice), du, dv, gold, 12);
  const cap = new THREE.SphereGeometry(R.lantern + 0.2, 12, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  cap.scale(1, (H.lanternTop - H.lanternCornice) / (R.lantern + 0.2), 1);
  cap.translate(du, y(H.lanternCornice), dv);
  g.addGeometry(cap, goldDeep);
  // Miss Freedom on her pedestal, torch raised.
  cylinder(b, 0.9, y(H.lanternTop), y(H.lanternTop) + 1.8, du, dv, statue, 8);
  cylinder(b, 0.45, y(H.lanternTop) + 1.8, y(H.statue) - 1.3, du, dv, statue, 6, 0.3);
  cylinder(b, 0.12, y(H.statue) - 1.3, y(H.statue), du + 0.25, dv, statue, 5);

  const group = new THREE.Group();
  group.name = 'Georgia State Capitol';
  group.rotation.y = -ANGLE;
  group.position.set(CENTRE[0], 0, CENTRE[1]);
  const stoneGeometry = b.geometry(), goldGeometry = g.geometry();
  const stoneMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  // A broad, warm, view-dependent highlight from the scene's own lights; no environment map.
  const goldMaterial = new THREE.MeshPhongMaterial({
    vertexColors: true, side: THREE.DoubleSide, emissive: new THREE.Color(0, 0, 0),
    specular: new THREE.Color('#ffd27a'), shininess: 14,
  });
  const masonry = new THREE.Mesh(stoneGeometry, stoneMaterial);
  masonry.name = 'Capitol masonry';
  const leaf = new THREE.Mesh(goldGeometry, goldMaterial);
  leaf.name = 'Capitol gold dome and lantern';
  for (const m of [masonry, leaf]) { m.castShadow = m.receiveShadow = true; group.add(m); }
  const litGeometry = lit.geometry();
  const litMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    transparent: true, depthWrite: false, forceSinglePass: true,
  });
  const offices = new THREE.Mesh(litGeometry, litMaterial);
  offices.name = 'Capitol lit windows';
  offices.visible = false;
  group.add(offices);
  return {
    group,
    buildings: buildings.filter((x) => x.id !== CAPITOL_ID),
    datum,
    dome: { centre: toScene(du, dv), radius: R.dome },
    eastDoor: toScene(42.1, -1.55),
    triangles: (stoneGeometry.attributes.position.count + goldGeometry.attributes.position.count) / 3,
    /** The dome is floodlit after dark. */
    setNight(dark: number) {
      const d = Math.min(1, Math.max(0, dark));
      goldMaterial.emissive.setRGB(0.42, 0.29, 0.07).multiplyScalar(d);
      offices.visible = d > 0.01;
      litMaterial.color.setScalar(0.7 * d);
    },
    dispose() {
      group.removeFromParent();
      stoneGeometry.dispose(); goldGeometry.dispose(); litGeometry.dispose();
      stoneMaterial.dispose(); goldMaterial.dispose(); litMaterial.dispose();
    },
  };
}
