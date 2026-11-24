import { runSync } from '../core/slice';
import landuse from '../../../pipeline/prototypes/residential/landuse.json';
import { pradoYieldSigns } from '../terrain/ansley-street-edge';
import * as THREE from 'three';
import tagged from '../../../pipeline/prototypes/residential/tags.json';
import { inAnsley, roadWidth, type TerrainCity } from '../terrain/transport-data';
import { Builder, hashStr, pointInRing, rng, type P2 } from '../vignette/geom';
import { flowerBed, hedge, landscapeMesh } from '../landscape/primitives';
import { GroundCover } from '../landscape/ground-cover';
import type { GroundYield } from '../terrain/surface';
import { yardTerrace } from './yard-terrace';
import type { BuildingFinish, VBuilding } from '../vignette/world';

/**
 * Pitched roofs, porches and chimneys for small residential footprints across
 * the rectangle. OSM roof:shape and building:material are reported where
 * tagged (pipeline/prototypes/residential/tags.json); everything else is
 * inferred from the footprint (shape, storeys) or illustrative (palette,
 * porch, chimney). Heights: OSM height is the ridge, so walls stop at the eave.
 */
const HOMES = new Set(['house', 'detached', 'semidetached_house', 'bungalow', 'terrace']);
const residentialLand = new Set(landuse.lowRiseCandidates);
const otherUse = new Set(landuse.otherUse);
const tags = tagged as unknown as Record<string, [string | null, string | null, string | null]>;

type Shape = 'gabled' | 'hipped' | 'pyramidal';
export type HouseStyle = 'colonial' | 'craftsman' | 'tudor' | 'apartment';
/** Lab and test overrides: pin a footprint's style, siding, wall colour or storeys. */
export type HouseForce = Partial<{ style: HouseStyle; siding: Siding; wall: string; storeys: number; form: 'foursquare' | 'limestone' | 'white-brick' }>;
type Plan = { style: HouseStyle; storeys: number; doorS: number; doors: number[]; id: string; wind: number; overhang: number; dormerEdge: P2[] | null;
  concave: boolean; porchFoot?: number; front: P2[] | null; frontFoot?: number; siding: Siding; doorColor: string;
  crossGable: boolean; dormers: number; quality: 'high' | 'low'; shape: Shape; eave: number; rise: number; centre: P2; u: P2; long: number; half: number;
  wall: string; roof: string; trim: string; porch: P2[] | null; chimney: boolean; brick: boolean;
  /** Window frame colour (white trim, or black steel on newer Ansley houses). */
  frame: string;
  /** An American Foursquare: hipped, two storeys, a full-width porch with a balustrade and a centre dormer. */
  foursquare: boolean };

// Material families, each with its own colour range (Sam's notes, checked against Street View
// in Ansley Park and Home Park). Repeated entries weight the common colours.
export type Siding = 'clapboard' | 'brick' | 'stucco' | 'shingle' | 'ashlar';
export const FAMILIES: Record<Siding, string[]> = {
  // Lap siding: white, cream, pale yellow, sage, grey-blue, muted green; the occasional deep red or navy.
  // Values sit a little above Street View so they survive the City colour grade.
  clapboard: ['#f5f2ea', '#f5f2ea', '#f0e8d4', '#f1e3ad', '#c6cfae', '#bcc8d2', '#a8b594', '#f0e8d4', '#8e423a', '#4b5a70'],
  // Brick: warm red-orange, deep red, brown, tan, and some painted white brick.
  brick: ['#b8603f', '#b8603f', '#934634', '#80583f', '#c6a27a', '#efebe2'],
  // Cedar shingle: weathered brown or grey.
  // Ansley adds painted shingle: grey-blue, and the odd dark green (Sam's walk, 2026-11-23).
  shingle: ['#8e7055', '#9d8467', '#9c9990', '#88867e', '#8d9cab', '#8d9cab', '#5a6b58'],
  // Stucco: cream, pink-beige, pale ochre.
  stucco: ['#f1e9d4', '#ebd2bd', '#e6cd98'],
  // Limestone ashlar (newer Ansley houses): pale warm cream.
  ashlar: ['#e4dccb', '#e8e0cf', '#ddd4c1'],
};
// Weathered mid-greys and warm browns, with a little muted green and red: roofs no longer dominate.
const ASPHALT = ['#8f8a83', '#857e76', '#9a8d7e', '#8a7a6a', '#7c8a80', '#8e6f63', '#99938b', '#7e858a', '#7a8a72'];
const SLATE = ['#6f7880', '#68727b'];
// Newer Ansley houses: cream limestone or white-painted brick under dark slate, with black steel windows.
const LIMESTONE = '#e4dccb', WHITE_BRICK = '#efebe2', DARK_SLATE = ['#545b63', '#4c535b'], STEEL = '#22262a';
// Foursquares and Colonial Revival: white or pale-grey clapboard.
const FOURSQUARE = ['#f5f2ea', '#f5f2ea', '#e4e5e0', '#eef0ee'];
const TERRACOTTA = ['#94604c', '#9d6a52', '#87574a'];
const DOORS = ['#2f3a34', '#5b2a24', '#2b2f3a', '#3b2c22', '#6a5d4b', '#1f2224'];
// Shader sidings 7–10: the 3–6 textures without shader windows; houses draw their own windows.
const STYLE: Record<Siding, number> = { clapboard: 7, brick: 8, stucco: 9, shingle: 10, ashlar: 12 };

function area(ring: P2[]) {
  let a = 0;
  for (let i = 0; i < ring.length; i++) { const [x0, z0] = ring[i], [x1, z1] = ring[(i + 1) % ring.length]; a += x0 * z1 - x1 * z0; }
  return Math.abs(a) / 2;
}

/** Minimum-area oriented rectangle from the footprint's edge directions. */
function oriented(ring: P2[]) {
  let best: { u: P2; long: number; half: number; centre: P2; area: number } | null = null;
  for (let i = 0; i < ring.length; i++) {
    const [x0, z0] = ring[i], [x1, z1] = ring[(i + 1) % ring.length], len = Math.hypot(x1 - x0, z1 - z0);
    if (len < .5) continue;
    const u: P2 = [(x1 - x0) / len, (z1 - z0) / len], v: P2 = [-u[1], u[0]];
    const a = ring.map(p => p[0] * u[0] + p[1] * u[1]), b = ring.map(p => p[0] * v[0] + p[1] * v[1]);
    const [a0, a1, b0, b1] = [Math.min(...a), Math.max(...a), Math.min(...b), Math.max(...b)];
    const box = (a1 - a0) * (b1 - b0);
    if (best && box >= best.area) continue;
    const ca = (a0 + a1) / 2, cb = (b0 + b1) / 2, centre: P2 = [u[0] * ca + v[0] * cb, u[1] * ca + v[1] * cb];
    best = a1 - a0 >= b1 - b0
      ? { u, long: (a1 - a0) / 2, half: (b1 - b0) / 2, centre, area: box }
      : { u: v, long: (b1 - b0) / 2, half: (a1 - a0) / 2, centre, area: box };
  }
  return best;
}

/** Distance from a point to the nearest kerb (centreline distance minus half the road's width). */
function roadIndex(city: TerrainCity) {
  const cells = new Map<string, [P2, P2, number][]>();
  for (const r of city.roads) {
    if (r.bridge || r.tunnel || ['footway', 'path', 'steps', 'cycleway', 'service'].includes(r.cls)) continue;
    for (let i = 1; i < r.pts.length; i++) {
      const a = r.pts[i - 1], b = r.pts[i], half = roadWidth(r) / 2;
      for (let x = Math.floor(Math.min(a[0], b[0]) / 40); x <= Math.floor(Math.max(a[0], b[0]) / 40); x++)
        for (let z = Math.floor(Math.min(a[1], b[1]) / 40); z <= Math.floor(Math.max(a[1], b[1]) / 40); z++)
        {
          const key = `${x},${z}`, list = cells.get(key);
          if (list) list.push([a, b, half]); else cells.set(key, [[a, b, half]]);
        }
    }
  }
  return (x: number, z: number) => {
    let best = Infinity;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const [a, b, half] of cells.get(`${Math.floor(x / 40) + i},${Math.floor(z / 40) + j}`) ?? []) {
      const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
      best = Math.min(best, Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz) - half);
    }
    return best;
  };
}

function plan(b: VBuilding, street: (x: number, z: number) => number, quality: 'high' | 'low', force?: HouseForce): Plan | null {
  const ring = b.rings[0];
  // Pieces clipped at a board seam (`id/n`) keep the generic box on both sides,
  // since neither half can be roofed as one house.
  if (b.id.includes('/') || b.rings.length !== 1 || !ring || ring.length < 4 || b.parts?.length || otherUse.has(b.id)) return null;
  const size = area(ring);
  const specificHouse = b.cls === 'house' || b.cls === 'detached';
  const generalResidential = b.cls === 'residential' ||
    ((!b.cls || b.cls === 'yes' || b.cls === 'building') && residentialLand.has(b.id));
  if (!HOMES.has(b.cls ?? '') && !generalResidential) return null;
  if (size < 25 || (b.floors ?? 0) > 3 || (b.h ?? 0) > 14) return null;
  // A residential district or broad residential tag can include apartment slabs and towers.
  // Require positive low-rise evidence; preserve named blocks and the original mass otherwise.
  if (generalResidential && (!(b.floors || b.h) || (b.h ?? 0) > 11.5 || b.name || size > 800)) return null;
  // A compact multi-unit block can carry a house tag even without a courtyard.
  if (size > 1000 || (size > 450 && b.name)) return null;
  if (!specificHouse && !generalResidential && size > 450) return null;
  const box = oriented(ring);
  if (!box || box.half < 2) return null;
  const [shapeTag, material] = tags[b.id] ?? [null, null, null];
  const r = rng(hashStr(b.id));
  const fill = size / (4 * box.long * box.half), aspect = box.long / box.half;
  // A ridge through an L or courtyard plan would roof empty ground. Concave
  // plans get a low hip-and-deck roof that follows the footprint instead.
  if (size > 900 && box.long * 2 > 45 && (aspect > 2.4 || fill < .75)) return null;
  if (generalResidential && size > 450 && (aspect > 2 || fill < .85)) return null;
  const concave = fill < .85;
  // The front is the frontage nearest a mapped street; door, stoop or porch face it.
  let front: P2[] | null = null, best = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], c = ring[(i + 1) % ring.length], len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    if (len < 3) continue;
    const d = street((a[0] + c[0]) / 2, (a[1] + c[1]) / 2);
    if (d < best) { best = d; front = [a, c]; }
  }
  if (best > 40) front = null;
  const frontLen = front ? Math.hypot(front[1][0] - front[0][0], front[1][1] - front[0][1]) : 0;
  const ansley = inAnsley(...box.centre);
  const f = force ?? {};
  // Only less specific housing types use footprint proportions to choose a multi-unit form.
  const multi = (size <= 450 || !specificHouse) && ((size > 220 && aspect > 1.8) || size > 330);
  // Style by neighbourhood (Street View): Ansley Park is Colonial and Tudor revival among
  // Craftsman houses; Home Park and the other side streets are mostly Craftsman bungalows.
  const pickStyle = r();
  const style: HouseStyle = f.style ?? (multi ? 'apartment' : ansley ? (pickStyle < .35 ? 'colonial' : pickStyle < .65 ? 'tudor' : 'craftsman')
    : (pickStyle < .65 ? 'craftsman' : pickStyle < .9 ? 'colonial' : 'tudor'));
  // Roof form by style; OSM roof:shape wins on rectangular plans. Colonials are side-gabled or
  // hipped, Craftsman houses front-gabled (ridge running back from the street), Tudors side-gabled
  // under their steep front gable, apartments low-hipped. Pyramids only where tagged.
  const formRoll = r();
  let shape: Shape = !concave && (shapeTag === 'gabled' || shapeTag === 'hipped' || shapeTag === 'pyramidal') ? shapeTag
    : concave ? 'hipped' : style === 'apartment' ? 'hipped' : style === 'colonial' ? (formRoll < .6 ? 'gabled' : 'hipped') : 'gabled';
  if (style === 'tudor' && !concave && !shapeTag) shape = 'gabled';
  // Ridge axis: along the street for side-gabled forms, across it for Craftsman front gables.
  let axis = box;
  if (front && !concave && style !== 'apartment') {
    const e: P2 = [(front[1][0] - front[0][0]) / frontLen, (front[1][1] - front[0][1]) / frontLen];
    const u: P2 = style === 'craftsman' ? [-e[1], e[0]] : e, v: P2 = [-u[1], u[0]];
    const a = ring.map(q => q[0] * u[0] + q[1] * u[1]), c = ring.map(q => q[0] * v[0] + q[1] * v[1]);
    const ca = (Math.min(...a) + Math.max(...a)) / 2, cc = (Math.min(...c) + Math.max(...c)) / 2;
    axis = { u, long: (Math.max(...a) - Math.min(...a)) / 2, half: (Math.max(...c) - Math.min(...c)) / 2,
      centre: [u[0] * ca + v[0] * cc, u[1] * ca + v[1] * cc], area: box.area };
    // A side-gabled or hipped roof on a front narrower than the house is deep: the ridge then runs
    // back from the street instead (otherwise a hip would collapse into an untagged pyramid).
    if (style !== 'craftsman' && axis.long < axis.half) axis = { ...axis, u: v, long: axis.half, half: axis.long };
  }
  // Pitch by style: Craftsman about 7/12, steep Tudor, low apartment hips.
  const rise = style === 'craftsman' ? Math.min(3.6, Math.max(1.5, axis.half * .58))
    : style === 'tudor' ? Math.min(6, Math.max(2.2, axis.half * 1.1))
    : style === 'apartment' ? Math.min(2, Math.max(1.2, axis.half * .35)) : Math.min(4.5, Math.max(1.6, axis.half * .72));
  // Storeys: OSM levels or height are reported; otherwise inferred from style, size and place.
  // A half storey (1.5) is a one-storey eave with dormers in the roof.
  const tagged = b.floors || (b.h ? Math.max(1, Math.round(Math.max(3, b.h - rise) / 3)) : 0);
  const storeys = f.storeys ?? (tagged || (style === 'apartment' ? (ansley && size > 300 ? 3 : 2) : style === 'craftsman' ? (size > 110 ? 1.5 : 1)
    : style === 'tudor' ? (ansley ? 2 : 1.5) : ansley || size >= 150 ? 2 : 1));
  // A reported height sets the eave (height is the ridge); storeys then only place windows.
  const eave = b.h && !f.storeys ? Math.max(3, b.h - rise) : Math.floor(storeys) * 3 + .2;
  const pick = r();
  const kind: Siding = f.siding ?? (material === 'brick' ? 'brick' : material === 'wood' ? 'clapboard'
    : style === 'apartment' ? (pick < .75 ? 'brick' : pick < .9 ? 'stucco' : 'clapboard')
    : style === 'tudor' ? (pick < .7 ? 'brick' : 'stucco')
    : style === 'colonial' ? (pick < .45 ? 'brick' : pick < .9 ? 'clapboard' : 'shingle')
    : ansley ? (pick < .55 ? 'clapboard' : pick < .85 ? 'shingle' : 'brick') : (pick < .75 ? 'clapboard' : pick < .9 ? 'shingle' : 'brick'));
  const palette = kind === 'shingle' && !ansley ? FAMILIES.shingle.slice(0, 4) : FAMILIES[kind];
  const roofs = kind === 'stucco' && r() < .6 ? TERRACOTTA : (kind === 'brick' || style === 'tudor') && ansley && r() < .25 ? SLATE : ASPHALT;
  // Door by style: centred on a Colonial, off-centre under a Craftsman porch, beside a Tudor gable.
  const doorS = style === 'colonial' ? 0 : style === 'craftsman' ? -.2 * frontLen : style === 'apartment' ? -.25 * frontLen : .22 * frontLen;
  // Apartments have an entry at each end of the front.
  const doors = style === 'apartment' ? [-.25 * frontLen, .25 * frontLen] : [doorS];
  // Craftsman houses nearly always have a porch, Colonials a small portico, Tudors a stoop.
  // Terrace and semi-detached halves share frontage, so they get no porch of their own.
  const porchRoll = r();
  const porch = front && frontLen >= 4 && b.cls !== 'terrace' && b.cls !== 'semidetached_house'
    && porchRoll < (style === 'craftsman' ? .9 : style === 'colonial' ? .55 : style === 'apartment' ? 0 : .1) ? front : null;
  const along = front ? Math.abs((front[1][0] - front[0][0]) * axis.u[0] + (front[1][1] - front[0][1]) * axis.u[1]) / frontLen : 0;
  // Tudors always show a steep front gable; others sometimes get a cross gable on a long front.
  const crossRoll = r();
  const crossGable = !concave && shape !== 'pyramidal' && style !== 'apartment' && along > .7 && axis.long > 4.5 && (style === 'tudor' || crossRoll < .35);
  // Both dormer rolls are always drawn, so a house keeps its colours on either tier.
  // Half storeys always get dormers; under a 2.7 m rise a dormer's roof would cross the main ridge.
  const dormerRoll = r(), pairRoll = r();
  const halfStorey = storeys % 1 !== 0;
  // Front-gabled half storeys put their dormers on the side slopes instead of the front.
  const dormerEdge: P2[] | null = !concave && shape === 'gabled' ? (along > .7 ? front
    : halfStorey ? ring.map((a, i) => [a, ring[(i + 1) % ring.length]] as P2[])
      .filter(([a, d]) => Math.abs((d[0] - a[0]) * axis.u[0] + (d[1] - a[1]) * axis.u[1]) / (Math.hypot(d[0] - a[0], d[1] - a[1]) || 1) > .9)
      .sort((x, y) => Math.hypot(y[1][0] - y[0][0], y[1][1] - y[0][1]) - Math.hypot(x[1][0] - x[0][0], x[1][1] - x[0][1]))[0] ?? null : null) : null;
  const dormers = dormerEdge && rise >= (halfStorey ? 2 : 2.7) && quality === 'high'
    ? (halfStorey ? (pairRoll < .5 ? 1 : 2) : dormerRoll < .5 ? 0 : pairRoll < .6 ? 1 : 2) : 0;
  const wall = f.wall ?? palette[Math.floor(r() * palette.length)];
  // Trim: white or cream on siding; contrasting on brick (cream on red and brown, dark on painted white).
  const trim = kind === 'brick' ? (wall === '#efebe2' ? '#2f3a34' : '#efe7d2') : r() < .7 ? '#f6f3ea' : '#ece2c8';
  // Ring winding, so each wall's outward normal is exact even on L and T plans.
  const wind = ring.reduce((a, q, i) => { const n = ring[(i + 1) % ring.length]; return a + q[0] * n[1] - n[0] * q[1]; }, 0) > 0 ? 1 : -1;
  // Eave and rake overhang by style: deep Craftsman eaves, tighter Tudor ones.
  const overhang = style === 'craftsman' ? .6 : style === 'tudor' || style === 'apartment' ? .3 : .45;
  const plan: Plan = { style, storeys, doorS, doors, id: b.id, wind, overhang, dormerEdge, concave, shape, eave, rise, centre: axis.centre, u: axis.u, long: axis.long, half: axis.half, front, siding: kind,
    doorColor: DOORS[Math.floor(r() * DOORS.length)], crossGable, dormers, quality,
    wall, roof: roofs[Math.floor(r() * roofs.length)],
    trim, porch, chimney: !concave && (kind === 'brick' || style === 'tudor' ? r() < .8 : r() < .45), brick: kind === 'brick', frame: trim, foursquare: false };
  const finished = f.form || (ansley && !f.style && !f.siding && !f.wall) ? ansleyForms(plan, b, size, frontLen, !!shapeTag, !!tagged, f.form) : plan;
  if (size <= 450) return finished;
  // Wide footprints reach the style pitch cap quickly. Give the half-storey a
  // knee wall and keep at least two thirds of the visible elevation in siding.
  const wallHeight = Math.floor(finished.storeys) * 3.25 + (finished.storeys % 1 ? 1.05 : .3);
  const roofRise = Math.min(finished.rise, b.h ? b.h / 3 : wallHeight / 2);
  return { ...finished, eave: b.h ? b.h - roofRise : wallHeight, rise: roofRise,
    dormers: roofRise < 2 ? 0 : finished.dormers };
}

/**
 * Ansley Park's larger houses (Sam's walk, 2026-11-23), from their own random stream so every other
 * house keeps its look: American Foursquares among the Colonials, and newer limestone or
 * white-brick houses with slate roofs and black steel windows among the Tudors. Illustrative.
 */
function ansleyForms(p: Plan, b: VBuilding, size: number, frontLen: number, roofTagged: boolean, storeysTagged: boolean,
  form?: 'foursquare' | 'limestone' | 'white-brick'): Plan {
  const r = rng(hashStr(b.id + ':ansley'));
  let four = r(), fresh = r(), colour = r();
  const slate = r();
  if (form) { four = form === 'foursquare' ? 0 : 1; fresh = form === 'foursquare' ? 1 : 0; colour = form === 'limestone' ? 0 : .9; }
  if (p.style === 'colonial' && !p.concave && p.front && frontLen >= 7 && size >= 90 && four < .45) {
    const shape: Shape = roofTagged ? p.shape : 'hipped';
    const rise = Math.min(3.6, Math.max(2.2, p.half * .6)), storeys = storeysTagged ? p.storeys : 2;
    const eave = b.h ? Math.max(3, b.h - rise) : Math.floor(storeys) * 3 + .2;
    return { ...p, foursquare: true, shape, rise, storeys, eave, siding: 'clapboard', brick: false, doorS: 0, doors: [0],
      wall: FOURSQUARE[Math.floor(colour * FOURSQUARE.length)], trim: '#f6f3ea', frame: '#f6f3ea', porch: p.front, chimney: true,
      // One hipped centre dormer on the front slope (high tier).
      dormerEdge: shape === 'hipped' ? p.front : p.dormerEdge, dormers: p.quality === 'high' && rise >= 2.7 ? 1 : 0, crossGable: false, overhang: .5 };
  }
  if ((p.style === 'tudor' || form) && fresh < .3) {
    const limestone = colour < .55;
    return { ...p, siding: limestone ? 'ashlar' : 'brick', brick: !limestone, wall: limestone ? LIMESTONE : WHITE_BRICK,
      roof: DARK_SLATE[Math.floor(slate * DARK_SLATE.length)], frame: STEEL, trim: limestone ? '#e2d9c3' : '#f2efe8', doorColor: '#2a2f33' };
  }
  return p;
}

/** Edges offset inward by d, intersected pairwise: the deck of a hip-and-deck roof. */
function inset(ring: P2[], d: number): P2[] {
  let signed = 0;
  for (let i = 0; i < ring.length; i++) { const [x0, z0] = ring[i], [x1, z1] = ring[(i + 1) % ring.length]; signed += x0 * z1 - x1 * z0; }
  const s = signed > 0 ? 1 : -1, n = ring.length;
  const lines = ring.map((a, i) => {
    const c = ring[(i + 1) % n], len = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
    const nx = -(c[1] - a[1]) / len * s, nz = (c[0] - a[0]) / len * s;
    // The left normal of an anticlockwise ring points inside.
    return { p: [a[0] + nx * d, a[1] + nz * d] as P2, v: [(c[0] - a[0]) / len, (c[1] - a[1]) / len] as P2 };
  });
  return ring.map((a, i) => {
    const l0 = lines[(i + n - 1) % n], l1 = lines[i];
    const det = l0.v[0] * l1.v[1] - l0.v[1] * l1.v[0];
    if (Math.abs(det) < 1e-6) return l1.p;
    const t = ((l1.p[0] - l0.p[0]) * l1.v[1] - (l1.p[1] - l0.p[1]) * l1.v[0]) / det;
    return [l0.p[0] + l0.v[0] * t, l0.p[1] + l0.v[1] * t];
  });
}

function roofFor(p: Plan, b: Builder, outer: P2[], eave: number, far = false) {
  const { centre: c, u, long, half, rise } = p;
  // Far away (see house-lod.ts) the roof is its bare planes: no overhang, fascia, soffit or ridge trim.
  // Eaves and rakes overhang the walls (0.3–0.6 m by style), with a fascia board and a soffit, so
  // every wall gets a shadow line under the roof edge. The roof plane simply extends outward and
  // down, so gables and dormers built on it stay on the same plane.
  const ov = far ? 0 : p.overhang, low = eave - ov * rise / half, ring = far ? outer : inset(outer, -ov);
  // 0.7 × the roof colour in display (sRGB) terms, so the shadow under the eave reads.
  const soffit = '#' + [1, 3, 5].map(i => Math.round(parseInt(p.roof.slice(i, i + 2), 16) * .7).toString(16).padStart(2, '0')).join('');
  const edge = (a: P2, d: P2, oa: P2, od: P2) => {
    if (far) return;
    b.quad([a[0], low - .2, a[1]], [d[0], low - .2, d[1]], [d[0], low, d[1]], [a[0], low, a[1]], p.trim);
    // The low tier keeps the fascia (the shadow line) and drops the soffit.
    if (p.quality === 'high') b.quad([oa[0], eave, oa[1]], [od[0], eave, od[1]], [d[0], low - .2, d[1]], [a[0], low - .2, a[1]], soffit);
  };
  if (p.concave) {
    // Low hip skirt to an inset deck: it stays over the walls on L and T plans.
    const d = Math.min(1.6, half * .45), top = eave + Math.min(1.4, d * .9), inner = inset(outer, d);
    for (let i = 0; i < ring.length; i++) {
      const j = (i + 1) % ring.length;
      b.quad([ring[i][0], low, ring[i][1]], [ring[j][0], low, ring[j][1]], [inner[j][0], top, inner[j][1]], [inner[i][0], top, inner[i][1]], p.roof);
      edge(ring[i], ring[j], outer[i], outer[j]);
    }
    for (let i = 1; i + 1 < inner.length; i++) b.tri([inner[0][0], top, inner[0][1]], [inner[i][0], top, inner[i][1]], [inner[i + 1][0], top, inner[i + 1][1]], p.roof);
    return;
  }
  const reachAt = (extra: number) => p.shape === 'gabled' ? long + extra + .01 : p.shape === 'pyramidal' ? 0 : Math.max(0, long - half);
  const ridge = (x: number, z: number, reach: number): number[] => {
    const t = Math.max(-reach, Math.min(reach, (x - c[0]) * u[0] + (z - c[1]) * u[1]));
    return [c[0] + u[0] * t, eave + rise, c[1] + u[1] * t];
  };
  const reach = reachAt(ov);
  // Every overhanging eave edge rises to its nearest ridge point; gable ends get no roof face.
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], d = ring[(i + 1) % ring.length], ra = ridge(...a, reach), rd = ridge(...d, reach);
    const end = Math.hypot(ra[0] - rd[0], ra[2] - rd[2]) < 1e-3;
    if (end && p.shape === 'gabled') continue;
    const ea = [a[0], low, a[1]], ed = [d[0], low, d[1]];
    if (end) b.tri(ea, ed, ra, p.roof);
    else b.quad(ea, ed, rd, ra, p.roof);
    edge(a, d, outer[i], outer[(i + 1) % outer.length]);
  }
  if (p.shape === 'gabled') {
    // Rake fascia: a trim board along each sloping roof edge past the gable wall.
    if (!far) for (let i = 0; i < ring.length; i++) {
      const a = ring[i], d = ring[(i + 1) % ring.length], ra = ridge(...a, reach), rd = ridge(...d, reach);
      if (Math.hypot(ra[0] - rd[0], ra[2] - rd[2]) >= 1e-3) continue;
      for (const q of [a, d]) b.quad([q[0], low - .2, q[1]], [q[0], low, q[1]], [ra[0], ra[1], ra[2]], [ra[0], ra[1] - .2, ra[2]], p.trim);
    }
    // Gable walls stand on the wall plane under the rake overhang.
    for (let i = 0; i < outer.length; i++) {
      const a = outer[i], d = outer[(i + 1) % outer.length], ra = ridge(...a, long), rd = ridge(...d, long);
      if (Math.hypot(ra[0] - rd[0], ra[2] - rd[2]) < 1e-3) b.tri([a[0], eave, a[1]], [d[0], eave, d[1]], ra, p.wall);
    }
    if (!far) for (const s of [-1, 1]) {
      // Trim the ridge ends so the rake reads in the ink pass.
      const e = [c[0] + u[0] * s * reach, eave + rise, c[1] + u[1] * s * reach];
      b.box(.14, .14, .14, e[0], e[1], e[2], p.trim);
    }
  }
}

/** Lowest and highest 3DEP ground over the footprint's ring and a 2.5 m interior grid. */
function relief(ring: P2[], ground: (x: number, z: number) => number | null) {
  const points: P2[] = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], c = ring[(i + 1) % ring.length], n = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1])));
    for (let k = 0; k < n; k++) points.push([a[0] + (c[0] - a[0]) * k / n, a[1] + (c[1] - a[1]) * k / n]);
  }
  const xs = ring.map(p => p[0]), zs = ring.map(p => p[1]);
  for (let x = Math.ceil(Math.min(...xs) / 2.5) * 2.5; x < Math.max(...xs); x += 2.5)
    for (let z = Math.ceil(Math.min(...zs) / 2.5) * 2.5; z < Math.max(...zs); z += 2.5)
      if (pointInRing(x, z, ring)) points.push([x, z]);
  const heights = points.map(p => ground(...p)).filter((h): h is number => h !== null);
  return heights.length ? [Math.min(...heights), Math.max(...heights)] : null;
}

/** Frame on a wall edge (the front by default): s along it, o outward. */
function frontFrame(p: Plan, edge: P2[] = p.front!) {
  const [a, d] = edge, len = Math.hypot(d[0] - a[0], d[1] - a[1]);
  const e: P2 = [(d[0] - a[0]) / len, (d[1] - a[1]) / len], m: P2 = [(a[0] + d[0]) / 2, (a[1] + d[1]) / 2];
  // The left normal of an anticlockwise ring points inside, so outward is its reverse.
  const n: P2 = [e[1] * p.wind, -e[0] * p.wind];
  const at = (s: number, o: number, y: number) => [m[0] + e[0] * s + n[0] * o, y, m[1] + e[1] * s + n[1] * o];
  return { len, e, n, m, at };
}

/** A gable on a sloping wall edge at `s` along it: gable wall, two roof planes into the main slope, a gable window. */
function crossGable(p: Plan, b: Builder, edge: P2[], s: number, eave: number) {
  const { len, at } = frontFrame(p, edge);
  const gw = Math.min(len * .22, 2.6), ga = Math.min(p.rise * (p.style === 'tudor' ? .98 : .9), gw * (p.style === 'tudor' ? 1.7 : .95)), t = ga * p.half / p.rise;
  const l = at(s - gw, .02, eave), r = at(s + gw, .02, eave), apex = at(s, .02, eave + ga), ridge = at(s, -t, eave + ga);
  b.tri(l, r, apex, p.wall);
  b.tri(l, apex, ridge, p.roof);
  b.tri(r, ridge, apex, p.roof);
  b.quad(at(s - .45, .04, eave + ga * .25), at(s + .45, .04, eave + ga * .25), at(s + .45, .04, eave + ga * .62), at(s - .45, .04, eave + ga * .62), '#8fa4b2');
}

/**
 * Windows composed by wall and style, not tiled: a composed front, one or two per storey on
 * the sides, fewer and smaller at the rear, a small attic window in each gable end, and a trim
 * belt between floors so storeys read. About a third of rooms glow at night (`lit`).
 */
function windows(p: Plan, b: Builder, lit: Builder, outer: P2[], base: number, eave: number) {
  const r = rng(hashStr(p.id + '/windows')), floors = Math.floor(p.storeys), high = p.quality === 'high';
  const fn: P2 | null = p.front ? (() => { const f = frontFrame(p); return f.n; })() : null;
  const sameEdge = (a: P2, d: P2) => p.front && Math.hypot(a[0] - p.front[0][0], a[1] - p.front[0][1]) < 1e-6 && Math.hypot(d[0] - p.front[1][0], d[1] - p.front[1][1]) < 1e-6;
  const shutters = p.style === 'colonial' && r() < .55;
  const belt = p.brick ? '#cfc6b4' : p.trim;
  for (let i = 0; i < outer.length; i++) {
    const a = outer[i], d = outer[(i + 1) % outer.length], len = Math.hypot(d[0] - a[0], d[1] - a[1]);
    if (len < 1.8) continue;
    const { at, n } = frontFrame(p, [a, d]);
    const role = sameEdge(a, d) ? 'front' : fn && n[0] * fn[0] + n[1] * fn[1] < -.7 ? 'rear' : 'side';
    // A window unit: a white frame around `n` sashes (shared mullions only inside a deliberate
    // pair or Craftsman triple), sky-toned glass rather than black voids, a white meeting rail, and
    // dark shutters on some Colonials. Units never touch each other.
    const placed: [number, number][] = [];
    const win = (s: number, sill: number, w: number, h: number, n = 1) => {
      const total = n * w + (n - 1) * .12;
      if (Math.abs(s) + total / 2 > len / 2 - .35) return;
      // At least the unit's own width of wall to its neighbours.
      if (placed.some(([c, t]) => Math.abs(c - s) < (t + total) / 2 + Math.min(t, total))) return;
      placed.push([s, total]);
      const y0 = base + sill, y1 = y0 + h;
      b.quad(at(s - total / 2 - .12, .03, y0 - .12), at(s + total / 2 + .12, .03, y0 - .12), at(s + total / 2 + .12, .03, y1 + .12), at(s - total / 2 - .12, .03, y1 + .12), p.frame);
      // Lit and unlit panes share a colour by day; only the night glow tells them apart.
      const glass = r() < .33 ? lit : b;
      for (let k = 0; k < n; k++) {
        const c = s - total / 2 + w / 2 + k * (w + .12);
        glass.quad(at(c - w / 2, .045, y0), at(c + w / 2, .045, y0), at(c + w / 2, .045, y1), at(c - w / 2, .045, y1), '#8fa4b2');
      }
      b.quad(at(s - total / 2, .05, y0 + h * .47), at(s + total / 2, .05, y0 + h * .47), at(s + total / 2, .05, y0 + h * .53), at(s - total / 2, .05, y0 + h * .53), p.frame);
      if (shutters && high && role === 'front') for (const side of [-1, 1]) {
        const x0 = s + side * (total / 2 + .14), x1 = s + side * (total / 2 + .52);
        b.quad(at(Math.min(x0, x1), .04, y0), at(Math.max(x0, x1), .04, y0), at(Math.max(x0, x1), .04, y1), at(Math.min(x0, x1), .04, y1), '#26302b');
      }
    };
    for (let k = 0; k < floors; k++) {
      // Under a porch the ground-floor lights sit on the deck and stop below its roof.
      const porchRow = k === 0 && !!p.porch && role === 'front';
      const sill = k * 3 + .9 + (porchRow ? .4 : 0), h = Math.min(1.5, porchRow ? 2.7 - sill : 1.5);
      // Doors claim their wall first, so windows keep clear of them.
      placed.length = 0;
      if (k === 0 && role === 'front') for (const d of p.doors) placed.push([d, 1.3]);
      if (p.style === 'apartment') {
        // Period apartments: single windows in regular bays on every wall, every storey.
        if (!high && (role === 'rear' || k > 0 && role === 'side')) continue;
        const bays = Math.max(1, Math.floor(len / 3.4));
        for (let j = 0; j < bays; j++) win(((j + .5) / bays - .5) * len, sill, .9, h);
      } else if (role === 'front') {
        // Two or three windows per floor plus the door: symmetric singles or pairs on a Colonial,
        // one grouped triple on a Craftsman, a grouped pair beside the Tudor gable.
        if (p.style === 'colonial') {
          const pair = len > 10 ? 2 : 1;
          for (const t of k === 0 ? [-.3, .3] : len > 8 ? [-.3, 0, .3] : [-.25, .25]) win(t * len, sill, .9, h, k === 0 ? pair : 1);
        } else if (p.style === 'craftsman') {
          // The grouped triple, else a pair, else a single, moving out until it clears the door.
          if (k === 0) {
            const before = placed.length;
            for (const n of len > 7 ? [3, 2, 1] : [2, 1]) {
              for (const t of [.22, .28, .33]) { win(t * len, sill, .8, h, n); if (placed.length > before) break; }
              if (placed.length > before) break;
            }
          }
          else for (const t of [-.22, .22]) win(t * len, sill, .9, h);
        } else {
          win(-.22 * len, sill, .8, h, k === 0 ? 2 : 1);
        }
      } else if (role === 'side') {
        // The low tier keeps ground-floor side windows only, and no rear windows.
        if (!high && k > 0) continue;
        for (const t of len > 9 ? [-.22, .22] : [0]) win(t * len, sill, .9, h);
      } else if (high) {
        win(-.25 * len, sill + .3, .8, 1.2);
        if (k === 0 && len > 8) win(.25 * len, sill + .3, .8, 1.2);
      }
    }
    // A trim belt at each floor line, so one, two and three storeys read apart.
    for (let k = 1; k < floors; k++) {
      const y = base + k * 3 + .02;
      b.quad(at(-len / 2, .035, y), at(len / 2, .035, y), at(len / 2, .035, y + .14), at(-len / 2, .035, y + .14), belt);
    }
    // Attic window in each gable end (walls across the ridge on a gabled roof).
    // ...only where the gable is still at least a metre wide at the window's top.
    // (The spacing record is per storey: the attic light sits above all of it.)
    if (p.shape === 'gabled' && !p.concave && Math.abs((d[0] - a[0]) * p.u[0] + (d[1] - a[1]) * p.u[1]) / len < .3 && len < p.half * 2.2
      && p.half * (1 - (p.rise * .3 + .9) / p.rise) >= .5 && (placed.length = 0) === 0)
      win(0, eave - base + p.rise * .3, .7, .8);
  }
}

/** Door, stoop, corner boards, cross gables and dormers. */
function houseDetail(p: Plan, b: Builder, outer: P2[], eave: number, base: number) {
  if (p.front) {
    const { len, at } = frontFrame(p);
    // Front door with a white surround; under the porch, or on a stoop with steps.
    // Under a porch the door stands on the deck (0.55 m up); otherwise on the floor, above a stoop.
    const sill = p.porch ? .55 : 0;
    for (const s of p.doors) {
      b.quad(at(s - .62, .03, base + sill + .05), at(s + .62, .03, base + sill + .05), at(s + .62, .03, base + sill + 2.4), at(s - .62, .03, base + sill + 2.4), p.trim);
      b.quad(at(s - .48, .05, base + sill + .1), at(s + .48, .05, base + sill + .1), at(s + .48, .05, base + sill + 2.2), at(s - .48, .05, base + sill + 2.2), p.doorColor);
      if (p.porch) continue;
      const foot = Math.min(base - .2, p.frontFoot ?? base - .2), rise = base - foot;
      const box = (s0: number, s1: number, o0: number, o1: number, y0: number, y1: number, c: string) => {
        const q = [at(s0, o0, 0), at(s1, o0, 0), at(s1, o1, 0), at(s0, o1, 0)];
        b.quad(...q.map(v => [v[0], y1, v[2]]) as [number[], number[], number[], number[]], c);
        for (let k = 0; k < 4; k++) b.quad([q[k][0], y0, q[k][2]], [q[(k + 1) % 4][0], y0, q[(k + 1) % 4][2]], [q[(k + 1) % 4][0], y1, q[(k + 1) % 4][2]], [q[k][0], y1, q[k][2]], c);
      };
      box(s - .85, s + .85, 0, 1.3, foot - .2, base, '#9a948a');
      const steps = Math.min(6, Math.ceil(rise / .18));
      for (let k = 1; k < steps; k++) box(s - .75, s + .75, 1.3 + (k - 1) * .3, 1.3 + k * .3, foot - .2, base - rise * k / steps, '#9a948a');
    }
  }
  if (p.quality === 'high' && (p.siding === 'clapboard' || p.siding === 'shingle')) {
    // White corner boards on painted and shingled walls, 2 cm proud of each wall along its own outward normal.
    for (let i = 0; i < outer.length; i++) {
      const v = outer[i], prev = outer[(i + outer.length - 1) % outer.length], next = outer[(i + 1) % outer.length];
      for (const o of [prev, next]) {
        const l = Math.hypot(o[0] - v[0], o[1] - v[1]) || 1, ux = (o[0] - v[0]) / l, uz = (o[1] - v[1]) / l;
        let nx = -uz, nz = ux;
        const mx = (v[0] + o[0]) / 2, mz = (v[1] + o[1]) / 2;
        if ((mx - p.centre[0]) * nx + (mz - p.centre[1]) * nz < 0) { nx = -nx; nz = -nz; }
        const ox = nx * .02, oz = nz * .02;
        b.quad([v[0] + ox, base + .75, v[1] + oz], [v[0] + ux * .16 + ox, base + .75, v[1] + uz * .16 + oz], [v[0] + ux * .16 + ox, eave, v[1] + uz * .16 + oz], [v[0] + ox, eave, v[1] + oz], p.trim);
      }
    }
  }
  // Long plans read as barns under one ridge: break them with side gables, staggered
  // toward opposite ends, on both long walls.
  if (!p.concave && p.shape !== 'pyramidal' && p.long > 2 * p.half && p.long > 4.5) {
    const sides = outer.map((a, i) => [a, outer[(i + 1) % outer.length]] as P2[]).filter(([a, d]) => {
      const len = Math.hypot(d[0] - a[0], d[1] - a[1]);
      const isFront = p.front && Math.hypot(a[0] - p.front[0][0], a[1] - p.front[0][1]) < 1e-6 && Math.hypot(d[0] - p.front[1][0], d[1] - p.front[1][1]) < 1e-6;
      return len > p.long * 1.6 && Math.abs((d[0] - a[0]) * p.u[0] + (d[1] - a[1]) * p.u[1]) / len > .9 && !isFront;
    });
    sides.forEach((edge, k) => crossGable(p, b, edge, (k % 2 ? .25 : -.25) * Math.hypot(edge[1][0] - edge[0][0], edge[1][1] - edge[0][1]), eave));
  }
  if (p.front && p.crossGable) crossGable(p, b, p.front, 0, eave);
  if (!p.dormerEdge) return;
  // Dormers sit on the slope above `dormerEdge`: the front, or a side slope on front-gabled houses.
  const { len, at } = frontFrame(p, p.dormerEdge);
  // That slope climbs `rise` over `half` metres inward from its wall.
  const roofAt = (t: number) => eave + p.rise * Math.min(1, t / p.half);
  const onFront = !!p.front && p.dormerEdge === p.front;
  for (let k = 0; k < p.dormers; k++) {
    // Gabled dormers on the front slope, set back a third of the way up.
    // Beside a cross gable, dormers move out toward the ends rather than colliding with it.
    const gable = p.crossGable && onFront, spread = gable ? .32 : .26;
    // Dormer height scales with the pitch, so it stays under the ridge on lower roofs.
    const s = (p.dormers === 1 ? (gable ? spread : 0) : k ? spread : -spread) * len, t0 = p.half * .35, y0 = roofAt(t0), top = y0 + Math.min(1.25, p.rise * .45), w = .85;
    if (gable && Math.abs(s) < 2.8) continue;
    const t1 = (top + .5 - eave) * p.half / p.rise;
    b.quad(at(s - w, -t0, y0), at(s + w, -t0, y0), at(s + w, -t0, top), at(s - w, -t0, top), p.wall);
    b.quad(at(s - .45, -t0 + .02, y0 + .25), at(s + .45, -t0 + .02, y0 + .25), at(s + .45, -t0 + .02, top - .2), at(s - .45, -t0 + .02, top - .2), '#8fa4b2');
    const tTop = (top - eave) * p.half / p.rise;
    for (const side of [-w, w]) b.tri(at(s + side, -t0, y0), at(s + side, -t0, top), at(s + side, -tTop, top), p.wall);
    b.tri(at(s - w - .1, -t0 + .15, top), at(s + w + .1, -t0 + .15, top), at(s, -t0 + .15, top + .5), p.wall);
    b.quad(at(s - w - .1, -t0 + .15, top), at(s, -t0 + .15, top + .5), at(s, -t1, top + .5), at(s - w - .1, -tTop, top), p.roof);
    b.quad(at(s, -t0 + .15, top + .5), at(s + w + .1, -t0 + .15, top), at(s + w + .1, -tTop, top), at(s, -t1, top + .5), p.roof);
  }
}

// Two rectangular walks overlap when neither rectangle has an edge separating them.
function frontWalksOverlap(a: P2[], b: P2[]) {
  for (const ring of [a,b]) for (let i=0; i<2; i++) {
    const p=ring[i], q=ring[i+1], nx=q[1]-p[1], nz=p[0]-q[0];
    const project=([x,z]: P2)=>x*nx+z*nz;
    const aa=a.map(project), bb=b.map(project);
    if (Math.max(...aa)<=Math.min(...bb) || Math.max(...bb)<=Math.min(...aa)) return false;
  }
  return true;
}

const WALK = '#cbc6ba', DRIVE = '#b2ada3';

/**
 * Yards by rule from the house, its front wall and the nearest mapped street (there are no
 * parcel lines): a front walk from the door toward the street, a driveway along the side away
 * from the door (dropped if it would cross another building), foundation shrubs on a pine-straw
 * or mulch strip along the front, and on some houses a small bed by the walk and a clipped hedge
 * near the street. The low tier keeps walks and driveways. All `illustrative`.
 */
/** Yard landscaping as a build that yields once per house (core/slice.ts). */
function* yards(plans: Map<string, Plan>, all: VBuilding[], ground: (x: number, z: number) => number | null,
  street: (x: number, z: number) => number, quality: 'high' | 'low', city: TerrainCity, treeTrunks: readonly (readonly number[])[]) {
  const b = new Builder(), cover = new GroundCover(), high = quality === 'high';
  if (high) pradoYieldSigns(b,city.bounds,ground);
  const yields: GroundYield[] = [], terraceSites: { id:string; at:P2; triangles:number }[] = [];
  const classes = new Map(all.map(b=>[b.id,b.cls]));
  // Footprint index, so drives and walks never cross another building.
  const cells = new Map<string, P2[][]>();
  for (const o of all) {
    const ring = o.rings[0];
    if (!ring) continue;
    const xs = ring.map(q => q[0]), zs = ring.map(q => q[1]);
    for (let x = Math.floor(Math.min(...xs) / 20); x <= Math.floor(Math.max(...xs) / 20); x++)
      for (let z = Math.floor(Math.min(...zs) / 20); z <= Math.floor(Math.max(...zs) / 20); z++) {
        const k = `${x},${z}`, list = cells.get(k);
        if (list) list.push(ring); else cells.set(k, [ring]);
      }
  }
  const blocked = (x: number, z: number) => (cells.get(`${Math.floor(x / 20)},${Math.floor(z / 20)}`) ?? []).some(ring => pointInRing(x, z, ring));
  // A strip is clear only if its centre and both edges miss every footprint along its length.
  const stripBlocked = (a: P2, c: P2, w: number) => {
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1, ux = (c[0] - a[0]) / len, uz = (c[1] - a[1]) / len;
    for (let t = 0; t <= len; t += .5) for (const o of [-w / 2, 0, w / 2])
      if (blocked(a[0] + ux * t - uz * o, a[1] + uz * t + ux * o)) return true;
    return false;
  };
  // Off the board (null ground) a quad is simply not drawn.
  const y = (x: number, z: number, lift: number) => { const v = ground(x, z); return v === null ? null : v + lift; };
  // A flat strip draped on the ground between two points, `w` wide.
  const strip = (a: P2, c: P2, w: number, color: string, endHeight?: number) => {
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    if (len < .5) return;
    const ux = (c[0] - a[0]) / len, uz = (c[1] - a[1]) / len, nx = -uz * w / 2, nz = ux * w / 2, n = Math.ceil(len);
    const startHeight = endHeight === undefined ? 0 : (ground(...a) ?? endHeight) + .04;
    let clearance = 0;
    for (let k = 0; k < n; k++) {
      const p0 = [a[0] + ux * len * k / n, a[1] + uz * len * k / n], p1 = [a[0] + ux * len * (k + 1) / n, a[1] + uz * len * (k + 1) / n];
      const ys = [y(p0[0] + nx, p0[1] + nz, .04), y(p1[0] + nx, p1[1] + nz, .04), y(p1[0] - nx, p1[1] - nz, .04), y(p0[0] - nx, p0[1] - nz, .04)];
      if (endHeight !== undefined && k === n - 1) ys[1] = ys[2] = endHeight;
      if (ys.some(v => v === null)) continue;
      if (endHeight !== undefined) {
        const t0 = k / n, t1 = (k + 1) / n;
        const ramp = endHeight - startHeight;
        clearance = Math.min(clearance, ys[0]! - (startHeight + ramp*t0), ys[3]! - (startHeight + ramp*t0),
          ys[1]! - (startHeight + ramp*t1), ys[2]! - (startHeight + ramp*t1));
      }
      b.quad([p0[0] + nx, ys[0]!, p0[1] + nz], [p1[0] + nx, ys[1]!, p1[1] + nz], [p1[0] - nx, ys[2]!, p1[1] - nz], [p0[0] - nx, ys[3]!, p0[1] - nz], color);
    }
    if (endHeight !== undefined) {
      // One plane below every walk vertex also clears the interiors of all walk triangles.
      // The small margin keeps the terrain skirt outside the rounded mesh coordinates.
      const half = w / 2 + .03;
      const corner = (p: P2, side: number, along: number): P2 =>
        [p[0] - uz*half*side + ux*along, p[1] + ux*half*side + uz*along];
      yields.push({
        ring: [corner(a,1,-.03), corner(c,1,.03), corner(c,-1,.03), corner(a,-1,-.03)],
        floor: (x,z) => startHeight + clearance - .04 + (endHeight-startHeight)*((x-a[0])*ux+(z-a[1])*uz)/len,
      });
    }
  };
  // How far from a point along a direction before the sidewalk (1.5 m from the kerb) or another
  // building, within 30 m; a deep setback gets the full distance it covered.
  const reach = (x: number, z: number, dx: number, dz: number, max = 30) => {
    for (let t = .5; t <= max; t += .5) {
      const px = x + dx * t, pz = z + dz * t;
      if (street(px, pz) < 1.5 || blocked(px, pz)) return t - .5;
    }
    return max;
  };
  // Only qualifying terraces query neighbouring walks. Cache drawn approaches across nearby lots.
  const frontWalks = new Map<Plan, P2[][]>();
  const sharedApproach = (owner: Plan, approach: P2[]) => {
    for (const other of plans.values()) {
      if (other === owner || !other.front || other.concave) continue;
      const { m, e, n } = frontFrame(other);
      if (Math.hypot(m[0]-approach[0][0], m[1]-approach[0][1]) > 70 + Math.abs(other.doorS)) continue;
      let rings = frontWalks.get(other);
      if (!rings) {
        rings = [];
        const start = other.porch ? 3.3 : 2.2;
        for (const ds of other.doors) {
          const a: P2 = [m[0]+ds*e[0]+start*n[0], m[1]+ds*e[1]+start*n[1]];
          const length = reach(...a, ...n);
          const c: P2 = [a[0]+length*n[0], a[1]+length*n[1]];
          if (length <= 1 || stripBlocked(a,c,1.2)) continue;
          const edge = (p: P2, side: number): P2 => [p[0]+side*.6*e[0],p[1]+side*.6*e[1]];
          rings.push([edge(a,1),edge(c,1),edge(c,-1),edge(a,-1)]);
        }
        frontWalks.set(other,rings);
      }
      if (rings.some(ring => frontWalksOverlap(approach,ring))) return true;
    }
    return false;
  };
  for (const p of plans.values()) {
    if (!p.front || p.concave) continue;
    // One house per step: each lot draws from its own seeded stream, so yielding never reorders it.
    yield 'yard';
    const { len, e, n, m } = frontFrame(p);
    const at = (s: number, o: number): P2 => [m[0] + e[0] * s + n[0] * o, m[1] + e[1] * s + n[1] * o];
    const r = rng(hashStr(p.id + '/yard'));
    // Walks start past the 2.4 m porch and its steps, or past the stoop.
    const porchDepth = p.porch ? 2.4 + .9 : 1.3 + .3 * 3;
    // A front walk from every entry (two on apartments) to the street.
    const mainDoor=at(p.doorS,porchDepth);
    const walk=reach(mainDoor[0],mainDoor[1],n[0],n[1]);
    const cls=classes.get(p.id);
    const terrace=high && inAnsley(...p.centre) && p.style!=='apartment' && cls!=='terrace' && cls!=='semidetached_house'
      ? yardTerrace(b,{at,ground,street,clear:(a,c,w)=>!stripBlocked(a,c,w),width:len,door:p.doorS,walkStart:porchDepth,walkEnd:porchDepth+walk,
        sharedApproach:ring=>sharedApproach(p,ring),newer:p.frame===STEEL,piers:rng(hashStr(p.id+':terrace'))()<.4,bounds:city.bounds,trees:treeTrunks}) : null;
    if(terrace){yields.push(...terrace.yields);terraceSites.push({id:p.id,at:terrace.at,triangles:terrace.triangles});}
    for (const ds of p.doors) {
      const door = at(ds, porchDepth), w = reach(door[0], door[1], n[0], n[1]);
      const end=terrace && ds===p.doorS ? at(ds,terrace.walkStop) : at(ds,porchDepth+w);
      if (w > 1 && !stripBlocked(door,end,1.2)) strip(door,end,1.2,WALK, ds === p.doorS ? terrace?.stairTop : undefined);
    }
    // Driveway on the side away from the door, along the side wall and out to the street.
    const side = p.doorS <= 0 ? 1 : -1, dx = side * (len / 2 + 1.8);
    const back = at(dx, -Math.min(8, p.half * 2)), front = at(dx, 0);
    const out = reach(front[0], front[1], n[0], n[1]), driveRoll = r();
    const driveEnd: P2 = [front[0] + n[0] * out, front[1] + n[1] * out];
    if (out > 1 && driveRoll < .6 && !stripBlocked(back, driveEnd, 3)) strip(back, driveEnd, 3, DRIVE);
    if (!high) continue;
    // Foundation planting: a pine-straw or mulch strip with shrubs, broken at the door. A full
    // Craftsman porch covers the front; around a half porch the planting runs beside it.
    const straw = r() < .6 ? 'pine-straw' : 'mulch';
    const halfPorch = p.porch ? Math.max(3.6, Math.min(len * .5, 6)) / 2 + .3 : 1.2;
    const c0 = p.porch ? Math.max(-len / 2 + halfPorch, Math.min(len / 2 - halfPorch, p.doorS)) : p.doorS;
    // Gaps around the porch or every entry (apartments have two), then plant the runs between.
    const gaps = (p.porch ? [c0] : p.doors).map(g => [g - halfPorch, g + halfPorch]).sort((x, y) => x[0] - y[0]);
    const runs: [number, number][] = [];
    let from = -len / 2 + .3;
    for (const [g0, g1] of gaps) { runs.push([from, g0]); from = g1; }
    runs.push([from, len / 2 - .3]);
    for (const [s0, s1] of runs) {
      if (s1 - s0 < 1.5 || (p.porch && p.style === 'craftsman')) continue;
      cover.patch([at(s0, .05), at(s1, .05), at(s1, 1.3), at(s0, 1.3)], ground, straw, { lift: .03 });
      // Set 1.05 m out, so even the largest jittered shrub stays clear of the facade.
      hedge(b, [at(s0 + .5, 1.05), at(s1 - .5, 1.05)], ground, { clipped: false, height: 1.1, width: .8, lumps: 1, spacing: 1.4, seed: p.id + s0 });
    }
    // A small bed beside the walk on some houses.
    if (walk > 3 && r() < .3 && !terrace) {
      const s = p.doorS + 1.1, o0 = porchDepth + .6, o1 = Math.min(walk + porchDepth - .6, o0 + 2.4);
      if (o1 - o0 > 1) flowerBed(b, [at(s, o0), at(s + 1.4, o0), at(s + 1.4, o1), at(s, o1)], ground, { doy: 300, quality, density: .7, seed: p.id + 'bed' });
    }
    // A clipped hedge near the street on some lots, broken at the walk.
    if (walk > 4 && r() < .25 && !terrace) {
      // Broken at every walk.
      const o = porchDepth + walk - .8, cuts = [...p.doors].sort((x, y) => x - y);
      let s0 = -len / 2;
      cuts.forEach((d, k) => { if (d - 1 - s0 > 1) hedge(b, [at(s0, o), at(d - 1, o)], ground, { height: .9, width: .6, quality, seed: p.id + 'h' + k }); s0 = d + 1; });
      if (len / 2 - s0 > 1) hedge(b, [at(s0, o), at(len / 2, o)], ground, { height: .9, width: .6, quality, seed: p.id + 'hz' });
    }
  }
  return { b, cover, yields, terraceSites };
}

/**
 * Residential finishes plus the eave-height adjustment, for one board's city.
 * `ground` (the rendered surface, scene metres) lets a lowered eave keep clear of a hillside:
 * such houses get the hillside floor rule from midtown-foundations.
 */
export function residential(...args: Parameters<typeof buildResidential>) {
  return runSync(buildResidential(...args));
}

/** residential() as a build that yields every few houses (core/slice.ts). */
export function* buildResidential(city: TerrainCity, existing?: (b: VBuilding) => BuildingFinish | undefined,
  ground?: (x: number, z: number) => number | null, footing?: (b: VBuilding) => number | null, quality: 'high' | 'low' = 'high',
  force?: Record<string, HouseForce>, footprints?: VBuilding[], treeTrunks: readonly (readonly number[])[] = []) {
  const street = roadIndex(city);
  const plans = new Map<string, Plan>();
  const toHouse = (b: (typeof city.buildings)[number]) => {
    if (existing?.(b)) return b;
    const p = plan(b, street, quality, force?.[b.id]);
    if (!p) return b;
    plans.set(b.id, p);
    // Walls stop at the eave; the pitched roof carries the rest of the height.
    const range = ground && relief(b.rings[0], ground);
    if (p.front && ground) {
      // Porch decks and stoops run down to the lowest ground in front; a porch on stilts is dropped.
      const [a, d] = p.front, len = Math.hypot(d[0] - a[0], d[1] - a[1]);
      let nx = -(d[1] - a[1]) / len, nz = (d[0] - a[0]) / len;
      const mx = (a[0] + d[0]) / 2, mz = (a[1] + d[1]) / 2;
      if ((mx - p.centre[0]) * nx + (mz - p.centre[1]) * nz < 0) { nx = -nx; nz = -nz; }
      const under = [0, .5, 1].flatMap(t => [0, 2.3].map(o => ground(a[0] + (d[0] - a[0]) * t + nx * o, a[1] + (d[1] - a[1]) * t + nz * o)))
        .filter((h): h is number => h !== null);
      p.porchFoot = p.frontFoot = under.length ? Math.min(...under) : undefined;
    }
    // World stands walls on `footing` unless a floor is already fitted.
    const base = b.floorY ?? footing?.(b) ?? range?.[0];
    let floorY: number | undefined;
    if (range && base !== undefined && base !== null && base + p.eave < range[1] + .1) {
      const [low, high] = range;
      // Same rule as the baked hillside grades: mid-grade, raised for a door uphill.
      floorY = Math.max((low + high) / 2, high - p.eave + Math.min(p.eave, 2.4));
    }
    const floor = floorY ?? b.floorY ?? base ?? undefined;
    if (p.porch && floor !== undefined && p.porchFoot !== undefined && floor + .55 - p.porchFoot > 1.5) p.porch = null;
    return floorY === undefined ? { ...b, h: p.eave, floors: null } : { ...b, h: p.eave, floors: null, floorY };
  };
  const buildings: ReturnType<typeof toHouse>[] = [];
  for (const b of city.buildings) {
    buildings.push(toHouse(b));
    // Each house's plan reads only its own footprint and the shared street index.
    if (buildings.length % 8 === 0) yield 'residential';
  }
  const finishFor = (b: VBuilding): BuildingFinish | undefined => {
    const own = existing?.(b);
    if (own) return own;
    const p = plans.get(b.id);
    if (!p) return undefined;
    return {
      wall: p.wall, roof: p.roof, parapet: 0, windowStyle: STYLE[p.siding],
      dressRoof(builder, outer, eave, litGlass) {
        roofFor(p, builder, outer, eave);
        const base = eave - p.eave;
        windows(p, builder, litGlass, outer, base, eave);
        if (p.chimney) {
          // Brick stack on the ridge line toward one end.
          const t = p.shape === 'pyramidal' ? 0 : p.long * .55, x = p.centre[0] + p.u[0] * t, z = p.centre[1] + p.u[1] * t;
          builder.box(.7, p.rise + 1.6, .9, x, eave - .5 + (p.rise + 1.6) / 2, z, p.brick ? '#6e3b30' : '#8a5444');
        }
        houseDetail(p, builder, outer, eave, base);
        if (p.porch) {
          const [a, d] = p.porch, len = Math.hypot(d[0] - a[0], d[1] - a[1]);
          const ex: P2 = [(d[0] - a[0]) / len, (d[1] - a[1]) / len];
          // Outward normal: away from the footprint centre.
          let n: P2 = [-ex[1], ex[0]];
          const m: P2 = [(a[0] + d[0]) / 2, (a[1] + d[1]) / 2];
          if ((m[0] - p.centre[0]) * n[0] + (m[1] - p.centre[1]) * n[1] < 0) n = [-n[0], -n[1]];
          // Deep front porches (2.4 m): full-front on Craftsman houses, half-front on Colonials,
          // with columns, a shed roof that reads from the street, and steps down from the door.
          const full = p.style === 'craftsman' || p.foursquare;
          const w = full ? Math.min(len * .85, 10) : Math.max(3.6, Math.min(len * .5, 6)), depth = 2.4;
          const c0 = full ? 0 : Math.max(-len / 2 + w / 2, Math.min(len / 2 - w / 2, p.doorS));
          const at = (s: number, o: number): P2 => [m[0] + ex[0] * (s + c0) + n[0] * o, m[1] + ex[1] * (s + c0) + n[1] * o];
          const quadBox = (s0: number, s1: number, o0: number, o1: number, y0: number, y1: number, color: string) => {
            const q = [at(s0, o0), at(s1, o0), at(s1, o1), at(s0, o1)];
            const top = q.map(([x, z]) => [x, y1, z]), bot = q.map(([x, z]) => [x, y0, z]);
            builder.quad(top[0], top[1], top[2], top[3], color);
            for (let k = 0; k < 4; k++) builder.quad(bot[k], bot[(k + 1) % 4], top[(k + 1) % 4], top[k], color);
          };
          const deckFoot = Math.min(base - .3, (p.porchFoot ?? base) - .2);
          quadBox(-w / 2, w / 2, 0, depth, deckFoot, base + .55, '#9a948a');
          // Square white columns: four across a full porch, three on a half porch.
          const cols = p.quality === 'low' ? 2 : full ? 4 : 3;
          for (let k = 0; k < cols; k++) {
            const s = -w / 2 + .2 + (w - .4) * k / (cols - 1);
            quadBox(s - .14, s + .14, depth - .32, depth - .04, base + .55, Math.min(base + 2.95, eave - p.overhang * p.rise / p.half - .65), p.trim);
          }
          if (p.foursquare) {
            // A white balustrade along the porch front, open at the steps: rails, and balusters on the high tier.
            const ds = p.doorS - c0, deck = base + .55;
            for (const [s0, s1] of [[-w / 2 + .1, ds - .85], [ds + .85, w / 2 - .1]] as [number, number][]) {
              if (s1 - s0 < .4) continue;
              quadBox(s0, s1, depth - .24, depth - .12, deck + .82, deck + .9, p.trim);
              quadBox(s0, s1, depth - .22, depth - .14, deck + .06, deck + .12, p.trim);
              if (p.quality === 'high') for (let k = s0 + .3; k < s1 - .15; k += .45) quadBox(k - .03, k + .03, depth - .2, depth - .16, deck + .12, deck + .82, p.trim);
            }
          }
          // Shed roof falling from the wall to the porch front, with a fascia.
          // It starts under the main fascia line, so a one-storey eave never cuts through it.
          const top = Math.min(base + 3.35, eave - p.overhang * p.rise / p.half - .25), front = top - .4;
          const p0 = at(-w / 2 - .2, -.05), p1 = at(w / 2 + .2, -.05), p2 = at(w / 2 + .2, depth + .35), p3 = at(-w / 2 - .2, depth + .35);
          builder.quad([p0[0], top, p0[1]], [p1[0], top, p1[1]], [p2[0], front, p2[1]], [p3[0], front, p3[1]], p.roof);
          builder.quad([p3[0], front - .2, p3[1]], [p2[0], front - .2, p2[1]], [p2[0], front, p2[1]], [p3[0], front, p3[1]], p.trim);
          // Steps from the deck down to the yard at the door.
          const ds = p.doorS - c0, drop = base + .55 - (p.porchFoot ?? base - .3);
          const steps = p.quality === 'low' ? 2 : Math.max(2, Math.min(5, Math.ceil(drop / .18)));
          for (let k = 1; k <= steps; k++) quadBox(ds - .75, ds + .75, depth + (k - 1) * .3, depth + k * .3, deckFoot, base + .55 - drop * k / (steps + 1), '#9a948a');
        }
      },
    };
  };
  /** The far version of every house (house-lod.ts): the same walls and colours under a bare roof, no windows,
   * porch, chimney or trim. Siding styles 7–10 keep the shader's windows off, so day colour matches the near version. */
  const farFinishFor = (b: VBuilding): BuildingFinish | undefined => {
    const own = existing?.(b);
    if (own) return own;
    const p = plans.get(b.id);
    if (!p) return undefined;
    return { wall: p.wall, roof: p.roof, parapet: 0, windowStyle: STYLE[p.siding], dressRoof(builder, outer, eave) { roofFor(p, builder, outer, eave, true); } };
  };
  return {
    city: { ...city, buildings }, finishFor, farFinishFor, count: plans.size,
    /** Whether a building is one of the planned houses. */
    isHouse: (id: string) => plans.has(id),
    /** Read-only view of a house's plan (style, roof shape, ridge direction), for tests and the lab. */
    planOf(id: string) { const p = plans.get(id); return p && { style: p.style, shape: p.shape, ridge: p.u, storeys: p.storeys, roof: p.roof }; },
    /** A house as one box (its plan's oriented rectangle, eave, half the roof rise, wall and roof
     *  colours), for the far-far form (city/house-lod.ts). */
    boxOf(id: string) { const p = plans.get(id); return p ? { centre: p.centre, u: p.u, long: p.long, half: p.half, height: p.eave + p.rise / 2, wall: p.wall, roof: p.roof } : null; },
    /** Yard landscaping for every planned house: one primitives draw and one ground-cover draw. */
    yards() { return runSync(buildYards()); },
    /** yards() as a build that yields once per house, for sliced area builds. */
    buildYards,
  };
  function* buildYards() {
      if (!ground || !plans.size) return null;
      // Every footprint blocks yards, including landmark sites already removed from `city`.
      const { b, cover, yields, terraceSites } = yield* yards(plans, footprints ?? city.buildings, ground, street, quality, city, treeTrunks);
      yield;
      const group = new THREE.Group();
      group.name = 'yards';
      group.userData.perf = 'landscape';
      const land = landscapeMesh(b), covers = cover.triangles ? cover.mesh({ quality }) : null;
      group.add(land.mesh);
      if (covers) group.add(covers.mesh);
      return { group, yields, terraceSites, triangles: land.triangles + cover.triangles, dispose() { land.dispose(); covers?.dispose(); } };
  }
}
