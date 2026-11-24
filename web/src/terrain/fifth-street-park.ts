import { DoubleSide, Group, Matrix4, Mesh, MeshLambertMaterial } from 'three';
import landbridges from '../city/fixtures/midtown-connector/landbridges.json';
import { StaticLandmarkMaterial } from '../materials/landmark-batch';
import { applySurfaces, surfaceDefaults, SurfacePainter, surfaces } from '../materials';
import { Builder, pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import type { RolloutSpecies } from '../trees/rollout';

/**
 * The Fifth Street park deck over the Connector (Georgia Tech, 2007): a 68 m wide land bridge
 * carrying a 48 ft roadway, two 24 ft sidewalks and two landscaped decks.
 *
 * Sources: ASPIRE Winter 2008 ("Fifth Street Bridge"), Roads & Bridges "Tying a Tech", a 2007
 * Wikimedia Commons photo (CC BY-SA) and the Smallwood project photos (copyrighted, reference
 * only: no texture is taken from them). Cross-section, north to south: a 75 ft landscaped deck
 * with an open lawn, a curved low wall and planting tiers stepping up to a 9 ft outer wall; a
 * 24 ft sidewalk; the roadway (two lanes, a turn lane, two bike lanes); a 24 ft sidewalk under a
 * tubular-steel trellis; and a deck of about 52 ft with a lawn strip and tiers. The outer edges
 * are from the 2018 lidar (the first 1 m bin where the freeway shows through, every 10 m along).
 *
 * Estimated (no published figure): tier heights between the published 1.5 ft and 9 ft, the
 * curved wall's line, trellis spacing, the lamp spacing, heights and arms (from the photos), tree
 * positions beyond the canopy map, and all night lighting: the one dusk photo shows warm lamps
 * and uplit trees, but no night photograph of the deck exists.
 */
const deck = landbridges[0];
/** Offsets from the mapped Fifth Street centreline, north positive (metres). */
export const FIFTH_PARK = {
  roadHalf: 7.3,
  walkOuter: 14.6,
  /** Lidar deck edges: 36.6 + 31.4 = 68.0 m (ASPIRE: 223 ft 3 in = 68.05 m). */
  north: 36.6,
  south: -31.4,
  /** The profile blends to bare earth over its last metres (midtown-connector-decks.ts). */
  blendM: 6,
} as const;

// A straight frame along the deck: s from the east abutment (Williams Street) westward, t north.
// The mapped centreline departs from this chord by under 0.1 m.
const east = deck.pts[0] as P2, west = deck.pts.at(-1) as P2;
const LENGTH = Math.hypot(west[0] - east[0], west[1] - east[1]);
const T: P2 = [(west[0] - east[0]) / LENGTH, (west[1] - east[1]) / LENGTH];
const N: P2 = [-T[1], T[0]];
/** World plan position of a deck point. */
export const parkPoint = (s: number, t: number): P2 => [east[0] + T[0] * s + N[0] * t, east[1] + T[1] * s + N[1] * t];
const stations = (deck.pts as P2[]).map(([x, z]) => (x - east[0]) * T[0] + (z - east[1]) * T[1]);
/** Measured deck height (NAVD88) at a station. */
export function parkDeckNavd88(s: number) {
  if (s <= stations[0]) return deck.heights[0];
  for (let i = 1; i < stations.length; i++) if (s <= stations[i]) {
    const u = (s - stations[i - 1]) / (stations[i] - stations[i - 1]);
    return deck.heights[i - 1] + u * (deck.heights[i] - deck.heights[i - 1]);
  }
  return deck.heights.at(-1)!;
}

// Williams Street runs north from the east abutment, inside the widened footprint. The north
// deck ends at its west sidewalk: 5.5 m west of the mapped centreline (a 4 m street and walk).
const WILLIAMS: P2[] = [[111.31, -2554.26], [108.72, -2563.41], [103.84, -2595.64]];
function williamsX(z: number) {
  for (let i = 1; i < WILLIAMS.length; i++) {
    const [ax, az] = WILLIAMS[i - 1], [bx, bz] = WILLIAMS[i];
    if (z <= az && z >= bz) return ax + (bx - ax) * (z - az) / (bz - az);
  }
  return WILLIAMS.at(-1)![0];
}
/** The station where the deck starts at offset t: the abutment, or Williams Street's sidewalk. */
export function parkEastEnd(t: number) {
  if (t <= FIFTH_PARK.walkOuter) return 0;
  const [, z] = parkPoint(0, t);
  const edge = williamsX(z) - 5.5;
  // s where parkPoint(s, t)[0] reaches the edge (T is nearly due west).
  return Math.max(0, (parkPoint(0, t)[0] - edge) / -T[0]);
}

/** The whole deck's plan outline (closed ring). */
export function parkOutline(): P2[] {
  const ring: P2[] = [];
  for (let t = FIFTH_PARK.south; t <= FIFTH_PARK.north + 1e-6; t += 2) ring.push(parkPoint(parkEastEnd(t), t));
  ring.push(parkPoint(parkEastEnd(FIFTH_PARK.north), FIFTH_PARK.north));
  ring.push(parkPoint(LENGTH, FIFTH_PARK.north), parkPoint(LENGTH, FIFTH_PARK.south));
  return ring;
}
const OUTLINE = parkOutline();
export const onFifthStreetPark = (x: number, z: number) => pointInRing(x, z, OUTLINE);

/** Where the deck sits in a board: the run midtown-connector-decks.ts profiles from this fixture. */
export const fifthStreetParkFits = (b: { minX: number; maxX: number; minZ: number; maxZ: number }) =>
  OUTLINE.every(([x, z]) => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ);

// Colours: the photographs' light grey ribbed precast, red-brick curb bands and the board's park and garden greens (ground-map.ts).
const PRECAST = '#cdc8bd', PRECAST_RIB = '#b6b1a6', CAP = '#d9d5cb', LAWN = '#adbe90', BED = '#94ad78',
  BRICK = '#a24c35', IRON = '#26272a', TRELLIS = '#d1d7d9', VINE = '#4f7438', BENCH = '#7a6a58',
  LINE_WHITE = '#e9e7df', LINE_YELLOW = '#d9b23a', ACORN = '#f1e4c2', LIT_LAWN = LAWN;
const UNDERSIDE_M = 1.6; // deck top to the girders' underside (estimated)

type Planting = { x: number; z: number; y: number; species: RolloutSpecies; heightM: number; spreadM: number };

/**
 * The park deck's structure, landscape, trellis and lamps, plus its trees (drawn by the shared
 * rollout batch at deck height). `ground` is used only below the two abutments; inside the
 * footprint it returns the freeway.
 */
export function fifthStreetPark(bounds: { minX: number; maxX: number; minZ: number; maxZ: number }, sceneZero: number,
  ground: (x: number, z: number) => number | null, canopy: readonly (readonly number[])[] = []) {
  if (!fifthStreetParkFits(bounds)) return null;
  const body = new Builder(), lights = new Builder(), painter = new SurfacePainter(body);
  const top = (s: number) => parkDeckNavd88(s) - sceneZero;
  const P = (s: number, t: number, lift: number) => { const [x, z] = parkPoint(s, t); return [x, top(s) + lift, z]; };
  const step = 3;
  const along = (from: number, to: number) => {
    const out: number[] = [];
    for (let s = from; s < to; s += step) out.push(s);
    out.push(to);
    return out;
  };
  // A horizontal band between offsets t0 < t1 (from each offset's east end to the west end).
  function band(t0: number, t1: number, lift: number, color: string, west = LENGTH) {
    const from = Math.max(parkEastEnd(t0), parkEastEnd(t1));
    const ss = along(from, west);
    for (let i = 1; i < ss.length; i++) body.quad(P(ss[i - 1], t0, lift), P(ss[i], t0, lift), P(ss[i], t1, lift), P(ss[i - 1], t1, lift), color);
  }
  // A vertical face at offset t from lift y0 to y1.
  function face(t: number, y0: number, y1: number, color: string, from = parkEastEnd(t), to = LENGTH) {
    const ss = along(from, to);
    for (let i = 1; i < ss.length; i++) body.quad(P(ss[i - 1], t, y0), P(ss[i], t, y0), P(ss[i], t, y1), P(ss[i - 1], t, y1), color);
  }
  // A ribbed precast face: horizontal ribs every 0.45 m (two greys).
  function ribbed(t: number, y0: number, y1: number, from?: number, to?: number) {
    painter.paint(surfaces.concrete({ colour: 'light' }), () => {
      for (let y = y0, i = 0; y < y1 - 1e-6; y += 0.45, i++) face(t, y, Math.min(y1, y + 0.45), i % 2 ? PRECAST_RIB : PRECAST, from, to);
    });
  }

  // Each landscaped deck: outer offset, and the tiers stepping up toward it. The north lawn's
  // inner edge is a curved low wall; tier heights rise from 0.45 m to the 2.75 m (9 ft) outer wall.
  const sides = [
    { sign: 1, outer: FIFTH_PARK.north, lawn: 0.6, tiers: [[0, 1.25], [0.45, 1.95], [0.78, 2.75]] as const, curve: 3.5, lawnTo: 0.62 },
    { sign: -1, outer: -FIFTH_PARK.south, lawn: 0.5, tiers: [[0, 1.3], [0.55, 2.0], [0.85, 2.75]] as const, curve: 0, lawnTo: 0.6 },
  ];
  const plantings: Planting[] = [];
  const lifts: { sign: number; liftAt: (s: number, d: number) => number }[] = [];
  for (const side of sides) {
    const o = side.outer, w = FIFTH_PARK.walkOuter;
    const t = (d: number) => side.sign * d;
    // The boundary between lawn and tiers at station s (the curved wall on the north deck).
    const tierStart = (s: number) => w + (o - w) * side.lawnTo + side.curve * Math.sin(Math.PI * s / LENGTH);
    /** Surface height above the deck at distance d out from the centreline. */
    const liftAt = (s: number, d: number) => {
      if (d < w) return 0.12;
      const start = tierStart(s);
      if (d < start) return side.lawn;
      return side.tiers.reduce<number>((h, [f, th]) => d >= start + (o - start) * f ? th : h, side.lawn);
    };
    const from = Math.max(parkEastEnd(t(w)), parkEastEnd(t(o)));
    const ss = along(from, LENGTH);
    // Low seat wall between sidewalk and lawn (0.3 m wide caps), with two sloped-walk openings.
    const openings = [0.3, 0.68].map(f => f * LENGTH);
    painter.paint(surfaces.concrete({ colour: 'light' }), () => {
      for (let i = 1; i < ss.length; i++) {
        const a = ss[i - 1], b = ss[i], mid = (a + b) / 2;
        if (openings.some(c => Math.abs(mid - c) < 2)) {
          // A sloped walk up to the lawn.
          body.quad(P(a, t(w), 0.13), P(b, t(w), 0.13), P(b, t(w + 1.5), side.lawn), P(a, t(w + 1.5), side.lawn), CAP);
          continue;
        }
        body.quad(P(a, t(w), 0.1), P(b, t(w), 0.1), P(b, t(w), side.lawn + 0.05), P(a, t(w), side.lawn + 0.05), PRECAST);
        body.quad(P(a, t(w), side.lawn + 0.05), P(b, t(w), side.lawn + 0.05), P(b, t(w + 0.35), side.lawn + 0.05), P(a, t(w + 0.35), side.lawn + 0.05), CAP);
      }
    });
    // Lawn, from the seat wall to the tiers.
    for (let i = 1; i < ss.length; i++) {
      const a = ss[i - 1], b = ss[i];
      const inner = (s: number) => openings.some(c => Math.abs(s - c) < 2) ? w + 1.5 : w + 0.35;
      body.quad(P(a, t(inner(a)), side.lawn), P(b, t(inner(b)), side.lawn), P(b, t(tierStart(b)), side.lawn), P(a, t(tierStart(a)), side.lawn), LAWN);
    }
    // Tiers: a planting bed on top and a ribbed riser facing the lawn.
    side.tiers.forEach(([f, h], k) => {
      const lo = (s: number) => tierStart(s) + (o - tierStart(s)) * f;
      const hi = (s: number) => k + 1 < side.tiers.length ? tierStart(s) + (o - tierStart(s)) * side.tiers[k + 1][0] : o;
      const below = k ? side.tiers[k - 1][1] : side.lawn;
      for (let i = 1; i < ss.length; i++) {
        const a = ss[i - 1], b = ss[i];
        const last = k + 1 === side.tiers.length;
        body.quad(P(a, t(lo(a)), h), P(b, t(lo(b)), h), P(b, t(hi(b)), h), P(a, t(hi(a)), h), last ? CAP : BED);
        painter.paint(surfaces.concrete({ colour: 'light' }), () =>
          body.quad(P(a, t(lo(a)), below), P(b, t(lo(b)), below), P(b, t(lo(b)), h), P(a, t(lo(a)), h), k % 2 ? PRECAST_RIB : PRECAST));
      }
    });
    // The outer wall: ribbed precast from the girders to the 9 ft cap, hiding the freeway.
    ribbed(t(o), -UNDERSIDE_M, 2.75);
    // A black iron fence on the north cap (photographed); the south cap has none visible.
    if (side.sign > 0) {
      for (let s = from + 1; s < LENGTH - 0.5; s += 2.4) {
        const [x, y, z] = P(s, t(o - 0.3), 2.75);
        body.box(0.05, 1.1, 0.05, x, y + 0.55, z, IRON);
      }
      for (const lift of [3.4, 3.8]) {
        const rail = (s: number) => P(s, t(o - 0.3), lift);
        for (let i = 1; i < ss.length; i++) {
          const a = rail(ss[i - 1]), b = rail(ss[i]);
          body.quad(a, b, [b[0], b[1] + 0.05, b[2]], [a[0], a[1] + 0.05, a[2]], IRON);
        }
      }
    }
    // Underside, from the sidewalk's own slab out to the outer wall.
    band(Math.min(t(w), t(o)), Math.max(t(w), t(o)), -UNDERSIDE_M, '#77746d');
    // End walls: the abutments below each landscaped deck, down to bare earth.
    for (const end of ['east', 'west'] as const) {
      const pts: number[][][] = [];
      for (let d = w; d <= o + 1e-6; d += 1.5) {
        const dd = Math.min(d, o), s = end === 'east' ? parkEastEnd(t(dd)) : LENGTH;
        const [x, z] = parkPoint(s, t(dd));
        const lid = liftAt(s, dd);
        const g = ground(x, z);
        pts.push([[x, Math.min(g ?? top(s) - UNDERSIDE_M, top(s) - UNDERSIDE_M), z], [x, top(s) + lid, z]]);
      }
      painter.paint(surfaces.concrete({ colour: 'light' }), () => {
        for (let i = 1; i < pts.length; i++) body.quad(pts[i - 1][0], pts[i][0], pts[i][1], pts[i - 1][1], PRECAST);
      });
    }
    // Trees on the tiers and the lawn (positions estimated; the lidar shows canopy along both
    // decks): conifers on the north deck's outer tier, young deciduous trees elsewhere.
    const rows = side.sign > 0
      ? [{ tier: true, frac: 0.62, every: 10, species: 'loblolly-pine' as const, h: 10, r: 4 }, { tier: false, frac: 0.5, every: 14, species: 'willow-oak' as const, h: 7.5, r: 6 }]
      : [{ tier: false, frac: 0.55, every: 11, species: 'sweetgum' as const, h: 8, r: 5.5 }];
    for (const row of rows) for (let s = from + 6; s < LENGTH - 5; s += row.every) {
      const start = tierStart(s), d = row.tier ? start + (o - start) * row.frac : w + (start - w) * row.frac;
      const [x, z] = parkPoint(s, t(d));
      plantings.push({ x, z, y: top(s) + liftAt(s, d), species: row.species, heightM: row.h, spreadM: row.r });
    }
    lifts.push({ sign: side.sign, liftAt });
  }
  // Canopy-map crowns that stood on the freeway below now stand on the deck at their mapped size.
  for (const [x, z, h, r] of canopy) {
    if (!onFifthStreetPark(x, z)) continue;
    const s = (x - east[0]) * T[0] + (z - east[1]) * T[1], d = (x - east[0]) * N[0] + (z - east[1]) * N[1];
    if (Math.abs(d) < FIFTH_PARK.walkOuter + 1) continue; // never on the street or a sidewalk
    if (plantings.some(p => Math.hypot(p.x - x, p.z - z) < 4)) continue;
    const at = Math.max(0, Math.min(LENGTH, s)), lift = lifts.find(l => Math.sign(d) === l.sign)!.liftAt(at, Math.abs(d));
    plantings.push({ x, z, y: top(at) + lift, species: 'willow-oak', heightM: Math.max(5, h), spreadM: Math.max(3, 2 * r) });
  }

  // Brick paver bands at both curbs, then the roadway's paint (the inventory lanes are not
  // published: an 11 ft turn lane and two bike lanes inside the curbs, estimated).
  const paved = [FIFTH_PARK.blendM, LENGTH - FIFTH_PARK.blendM] as const;
  const strip = (t0: number, t1: number, lift: number, color: string) => {
    const ss = along(paved[0], paved[1]);
    for (let i = 1; i < ss.length; i++) body.quad(P(ss[i - 1], t0, lift), P(ss[i], t0, lift), P(ss[i], t1, lift), P(ss[i - 1], t1, lift), color);
  };
  painter.paint(surfaces.brick({ colour: 'commonRed' }), () => {
    strip(FIFTH_PARK.roadHalf, FIFTH_PARK.roadHalf + 1.6, 0.135, BRICK);
    strip(-FIFTH_PARK.roadHalf - 1.6, -FIFTH_PARK.roadHalf, 0.135, BRICK);
  });
  for (const t of [1.68, -1.68]) strip(t - 0.08, t + 0.08, 0.15, LINE_YELLOW);
  for (const t of [5.6, -5.6]) strip(t - 0.08, t + 0.08, 0.15, LINE_WHITE);

  // The trellis along the south sidewalk: one row of square pale-grey posts, wide flat beams
  // reaching over the walk and its benches, and the vines grown over them.
  const trellis = [12, LENGTH - 12] as const, postT = -FIFTH_PARK.walkOuter + 0.5;
  for (let s = trellis[0]; s <= trellis[1]; s += 4.8) {
    const [x, y, z] = P(s, postT, 0.12);
    body.box(0.3, 3.7, 0.3, x, y + 1.85, z, TRELLIS);
  }
  for (let s = trellis[0]; s <= trellis[1] + 1e-6; s += 1.6) {
    const a = P(s, postT - 0.6, 3.82), b = P(s, -FIFTH_PARK.roadHalf - 1.9, 3.82);
    const along2 = [T[0] * 0.12, T[1] * 0.12];
    body.quad([a[0] - along2[0], a[1], a[2] - along2[1]], [b[0] - along2[0], b[1], b[2] - along2[1]], [b[0] + along2[0], b[1], b[2] + along2[1]], [a[0] + along2[0], a[1], a[2] + along2[1]], TRELLIS);
    body.quad([a[0] - along2[0], a[1] - 0.3, a[2] - along2[1]], [b[0] - along2[0], b[1] - 0.3, b[2] - along2[1]], [b[0] - along2[0], b[1], b[2] - along2[1]], [a[0] - along2[0], a[1], a[2] - along2[1]], TRELLIS);
  }
  for (const t of [postT, -FIFTH_PARK.roadHalf - 2.2]) {
    const ss = along(trellis[0], trellis[1]);
    for (let i = 1; i < ss.length; i++) body.quad(P(ss[i - 1], t, 3.52), P(ss[i], t, 3.52), P(ss[i], t, 3.82), P(ss[i - 1], t, 3.82), TRELLIS);
  }
  {
    // Vines: an uneven leafy mat over the beams.
    const ss = along(trellis[0], trellis[1]);
    for (let i = 1; i < ss.length; i++) {
      const a = ss[i - 1], b = ss[i], bump = (s: number) => 3.95 + 0.25 * Math.sin(s * 1.7) ** 2;
      body.quad(P(a, postT - 0.4, bump(a)), P(b, postT - 0.4, bump(b)), P(b, -FIFTH_PARK.roadHalf - 2.6, bump(b) - 0.1), P(a, -FIFTH_PARK.roadHalf - 2.6, bump(a) - 0.1), VINE);
    }
  }
  // Benches under the trellis, along the walk.
  for (let s = trellis[0] + 2.4; s < trellis[1]; s += 9.6) {
    const [x, y, z] = P(s, -FIFTH_PARK.walkOuter + 1.6, 0.12);
    const m = new Matrix4().makeRotationY(Math.atan2(-T[1], T[0])).setPosition(x, y, z);
    body.box(1.8, 0.45, 0.55, 0, 0.225, 0, BENCH, m);
  }

  // Lamps (from the photos): black shepherd's-crook poles at both curbs, about every 15 m, with
  // a clear acorn pendant over the road; shorter post-top lanterns between them.
  const lampRow = (t: number, inward: number) => {
    for (let s = 9, k = 0; s < LENGTH - 6; s += 7.5, k++) {
      const [x, y, z] = P(s, t, 0.12);
      if (k % 2 === 0) {
        body.box(0.16, 4.6, 0.16, x, y + 2.3, z, IRON);
        const [hx, , hz] = P(s, t + inward * 0.9, 0);
        body.box(0.08, 0.08, 0.9, (x + hx) / 2, y + 4.65, (z + hz) / 2, IRON);
        body.box(0.08, 0.35, 0.08, hx, y + 4.45, hz, IRON);
        lights.box(0.34, 0.5, 0.34, hx, y + 4.0, hz, ACORN);
      } else {
        body.box(0.12, 3.1, 0.12, x, y + 1.55, z, IRON);
        lights.box(0.32, 0.42, 0.32, x, y + 3.3, z, ACORN);
      }
    }
  };
  lampRow(FIFTH_PARK.roadHalf + 0.5, -1);
  lampRow(-FIFTH_PARK.roadHalf - 0.5, 1);
  // Ground uplights at each tree (estimated): a warm pool of light on the lawn or bed at night.
  for (const p of plantings) {
    const r = 0.36;
    const ring = Array.from({ length: 6 }, (_, i) => [p.x + r * Math.cos(i * Math.PI / 3), p.y + 0.03, p.z + r * Math.sin(i * Math.PI / 3)]);
    for (let i = 1; i < 5; i++) lights.tri(ring[0], ring[i + 1], ring[i], LIT_LAWN);
  }

  const group = new Group();
  group.name = 'Fifth Street park deck';
  const shell = new Mesh(body.geometry(), new StaticLandmarkMaterial());
  // The profiled roadway and walkways bias their depth toward the camera. Match
  // that bias so their asphalt cannot obscure the surveyed-height curb bands.
  shell.material.polygonOffset = true;
  shell.material.polygonOffsetFactor = -1;
  shell.material.polygonOffsetUnits = -2;
  if (painter.painted && surfaceDefaults.enabled) {
    shell.geometry.setAttribute('aSurface', painter.attribute());
    applySurfaces(shell.material);
  }
  shell.castShadow = shell.receiveShadow = true;
  const lamps = new Mesh(lights.geometry(), new MeshLambertMaterial({ vertexColors: true, side: DoubleSide, emissive: '#ffcf8a', emissiveIntensity: 0 }));
  lamps.receiveShadow = true;
  group.add(shell, lamps);
  return {
    group,
    buildings: [] as VBuilding[],
    plantings,
    setNight(night: number) { lamps.material.emissiveIntensity = night * 0.9; },
  };
}
