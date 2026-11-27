import * as THREE from 'three';
import details from '../../../pipeline/prototypes/piedmont-edge/details.json';
import { Builder, pointInRing, segDist, type P2 } from '../vignette/geom';
import { FURNITURE, type FurnitureKind } from '../landscape/furniture';
import { landscapeMesh, type Ground } from '../landscape/primitives';
import { roadWidth, type TerrainCity } from '../terrain/transport-data';
import { gateFrame, piedmontGates } from './piedmont-gates';

/**
 * Piedmont Park's small details, board by board:
 *  - the 10th Street entrance at Charles Allen Drive (granite piers and walls), on both tiers like the other gates;
 *  - park furniture at the 57 mapped OSM points (benches, drinking fountains, grills, bins, a picnic site), high tier only;
 *  - a map kiosk inside each main entrance (10th, 12th and 14th Streets), high tier only.
 * Furniture positions are reported; the models, the kiosk positions and every dimension are illustrative.
 */
const ENTRANCES = ['10th Street', '12th Street', '14th Street'];
type Bounds = TerrainCity['bounds'];
const inside = (b: Bounds, [x, z]: P2) => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;

/** The nearest paved way to a point: its distance, its half width and the unit direction toward it. */
function nearestWay(city: TerrainCity, [x, z]: P2) {
  let best = { d: Infinity, half: 0, to: [1, 0] as P2 };
  for (const r of city.roads) {
    if (r.bridge || r.tunnel) continue;
    for (let i = 1; i < r.pts.length; i++) {
      const a = r.pts[i - 1], c = r.pts[i];
      if (Math.min(a[0], c[0]) > x + 20 || Math.max(a[0], c[0]) < x - 20 || Math.min(a[1], c[1]) > z + 20 || Math.max(a[1], c[1]) < z - 20) continue;
      const d = segDist(x, z, a, c);
      if (d >= best.d) continue;
      const ex = c[0] - a[0], ez = c[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * ex + (z - a[1]) * ez) / (ex * ex + ez * ez || 1)));
      const px = a[0] + ex * t - x, pz = a[1] + ez * t - z, l = Math.hypot(px, pz) || 1;
      best = { d, half: roadWidth(r) / 2, to: [px / l, pz / l] };
    }
  }
  return best;
}

/** Stands a piece beside the nearest way: clear of its paving by `gap`, facing it. */
export function placeBeside(city: TerrainCity, at: P2, gap = .6): { at: P2; facing: number } {
  const w = nearestWay(city, at);
  if (!Number.isFinite(w.d) || w.d > 15) return { at, facing: 0 };
  const push = Math.max(0, w.half + gap - w.d);
  const p: P2 = [at[0] - w.to[0] * push, at[1] - w.to[1] * push];
  return { at: p, facing: Math.atan2(w.to[1], w.to[0]) };
}

export function piedmontPark(city: TerrainCity, ground: Ground, quality: 'high' | 'low') {
  const b = city.bounds;
  const group = new THREE.Group();
  group.name = 'Piedmont Park details';
  const gates = ENTRANCES.filter(n => n === '10th Street' && inside(b, gateFrame(n).at));
  const gate = gates.length ? piedmontGates(ground, gates) : null;
  if (gate) group.add(gate.group);
  let furniture: ReturnType<typeof landscapeMesh> | null = null, pieces = 0;
  const f = new Builder();
  // Both tiers: the Active Oval's picnic shelters and the Peace Monument.
  for (const ring of SHELTERS) if (ring.every(p => inside(b, p))) { picnicShelter(f, ring, ground); pieces++; }
  if (inside(b, PEACE)) { peaceMonument(f, PEACE, ground); pieces++; }
  // Low tier keeps the benches at the lake, where the overlooks are; high draws every mapped piece.
  const lake = city.ground?.find(g => g.name === 'Lake Clara Meer' && g.kind === 'water')?.rings[0] as P2[] | undefined;
  const nearLake = (at: P2) => !!lake && lake.some((q, i) => segDist(at[0], at[1], q, lake[(i + 1) % lake.length]) < 25);
  if (quality === 'low') for (const p of details.furniture) {
    if (p.kind !== 'bench' || !inside(b, p.at as P2) || !nearLake(p.at as P2)) continue;
    const spot = placeBeside(city, p.at as P2);
    FURNITURE.bench(f, spot.at, ground, spot.facing);
    pieces++;
  }
  if (quality === 'high') {
    for (const p of details.furniture) {
      if (!inside(b, p.at as P2)) continue;
      const spot = placeBeside(city, p.at as P2);
      FURNITURE[p.kind as FurnitureKind](f, spot.at, ground, spot.facing);
      pieces++;
    }
    for (const name of ENTRANCES) {
      const g = gateFrame(name), along: P2 = [-g.inward[1], g.inward[0]];
      const at: P2 = [g.at[0] + g.inward[0] * 6 + along[0] * (g.opening / 2 + 2.5), g.at[1] + g.inward[1] * 6 + along[1] * (g.opening / 2 + 2.5)];
      if (!inside(b, at)) continue;
      // The map faces people walking in through the gate.
      const spot = placeBeside(city, at, .8);
      FURNITURE.kiosk(f, spot.at, ground, Math.atan2(-g.inward[1], -g.inward[0]));
      pieces++;
    }
  }
  if (f.pos.length) {
    furniture = landscapeMesh(f);
    furniture.mesh.name = 'piedmont-furniture';
    group.add(furniture.mesh);
  }
  if (!group.children.length) return null;
  let triangles = 0;
  group.traverse(o => { if (o instanceof THREE.Mesh) triangles += (o.geometry.getAttribute('position')?.count ?? 0) / 3; });
  return {
    group, pieces, triangles,
    setNight(n: number) { gate?.setNight(n); },
    dispose() {
      group.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); } });
      furniture?.dispose();
    },
  };
}

const onEdge = ([x, z]: P2, ring: P2[]) => ring.some((a, i) => segDist(x, z, a, ring[(i + 1) % ring.length]) < .05);

/** The stretches of a path that lie inside a ring, split exactly where it crosses the edge. */
function stretchesInside(pts: P2[], ring: P2[]): P2[][] {
  const out: P2[][] = [];
  let run: P2[] = [];
  const end = () => { if (run.length > 1) out.push(run); run = []; };
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], dx = pts[i][0] - ax, dz = pts[i][1] - az;
    const cuts = [0, 1];
    for (let j = 0; j < ring.length; j++) {
      const [px, pz] = ring[j], [qx, qz] = ring[(j + 1) % ring.length], ex = qx - px, ez = qz - pz;
      const cross = dx * ez - dz * ex;
      if (Math.abs(cross) < 1e-9) continue;
      const t = ((px - ax) * ez - (pz - az) * ex) / cross, u = ((px - ax) * dz - (pz - az) * dx) / cross;
      if (t > 0 && t < 1 && u >= 0 && u <= 1) cuts.push(t);
    }
    cuts.sort((x, y) => x - y);
    const at = (t: number): P2 => [ax + dx * t, az + dz * t];
    for (let k = 1; k < cuts.length; k++) {
      if (cuts[k] - cuts[k - 1] < 1e-9) continue;
      const mid = at((cuts[k] + cuts[k - 1]) / 2);
      // A path along the edge counts as inside on every side (point-in-ring alone keeps only some).
      if (!pointInRing(mid[0], mid[1], ring) && !onEdge(mid, ring)) { end(); continue; }
      if (!run.length) run.push(at(cuts[k - 1]));
      run.push(at(cuts[k]));
    }
  }
  end();
  return out;
}

const length = (pts: P2[]) => pts.reduce((n, p, i) => i ? n + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0, 0);

/** Piedmont Park's mapped outline, or undefined on a board without it. */
export const piedmontRing = (city: TerrainCity) =>
  city.ground?.find(g => g.name === 'Piedmont Park' && g.kind === 'park')?.rings[0] as P2[] | undefined;

/**
 * Piedmont Park's main paths, for dim path lamps (World.buildLights dimPaths): the stretches
 * inside the park of every pedestrian promenade, and of every footway with at least 100 m inside
 * it. The park's paths carry no lit=yes tag in OSM; the photographs show black acorn-globe posts
 * about 4 m tall along the main loops. Which paths are lit, and the 30 m spacing, are illustrative.
 */
export function piedmontLampPaths(city: TerrainCity): P2[][] {
  const park = piedmontRing(city);
  if (!park) return [];
  return city.roads.flatMap(r => {
    if (r.bridge || r.tunnel || (r.cls !== 'pedestrian' && r.cls !== 'footway')) return [];
    const inside = stretchesInside(r.pts as P2[], park);
    return r.cls === 'footway' && inside.reduce((n, pts) => n + length(pts), 0) < 100 ? [] : inside;
  });
}

/**
 * The Active Oval's two open picnic shelters (OSM ways 182398397 and 182398398, traced from
 * Bing: reported footprints) at the loop's east edge. The form is estimated from photographs:
 * a low, wide hipped roof in mid-to-dark grey with deep eaves on dark timber posts
 * (https://commons.wikimedia.org/wiki/File:Piedmont_Park%27s_Active_Oval_under_a_threatening_summer_sky.jpg).
 * Eave 2.8 m and rise 1.8 m are estimates.
 */
const SHELTERS: P2[][] = [
  [[1547.3, -3612.2], [1560.8, -3609.3], [1565, -3629.1], [1551.5, -3631.9]],
  [[1576.8, -3658.5], [1583.1, -3659.7], [1581.5, -3668.4], [1575.1, -3667.2]],
];
function picnicShelter(b: Builder, ring: P2[], ground: Ground) {
  const y = Math.min(...ring.map(([x, z]) => ground(x, z) ?? Infinity));
  if (!Number.isFinite(y)) return;
  const eave = y + 2.8, cx = ring.reduce((a, p) => a + p[0], 0) / 4, cz = ring.reduce((a, p) => a + p[1], 0) / 4;
  const ins = (p: P2, k: number): P2 => [cx + (p[0] - cx) * k, cz + (p[1] - cz) * k];
  // Posts at the corners and mid-sides, set in from the eaves.
  for (let i = 0; i < 4; i++) for (const t of [0, .5]) {
    const p = ring[i], q = ring[(i + 1) % 4], at = ins([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t], .82);
    b.box(.25, eave - y, .25, at[0], (y + eave) / 2, at[1], '#4a3d33');
  }
  // Hipped roof: a ridge along the longer axis.
  const l01 = Math.hypot(ring[1][0] - ring[0][0], ring[1][1] - ring[0][1]), l12 = Math.hypot(ring[2][0] - ring[1][0], ring[2][1] - ring[1][1]);
  const [p0, p1, p2, p3] = l01 > l12 ? [ring[0], ring[1], ring[2], ring[3]] : [ring[1], ring[2], ring[3], ring[0]];
  const mid = (u: P2, v: P2): P2 => [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2];
  const e0 = mid(p0, p3), e1 = mid(p1, p2), k = Math.min(l01, l12) / 2 / Math.max(l01, l12);
  const r0: P2 = [e0[0] + (e1[0] - e0[0]) * k, e0[1] + (e1[1] - e0[1]) * k], r1: P2 = [e1[0] + (e0[0] - e1[0]) * k, e1[1] + (e0[1] - e1[1]) * k];
  const top = eave + 1.8, ROOF = '#5d6166', HIP = '#53575c';
  b.quad([p0[0], eave, p0[1]], [p1[0], eave, p1[1]], [r1[0], top, r1[1]], [r0[0], top, r0[1]], ROOF);
  b.quad([p2[0], eave, p2[1]], [p3[0], eave, p3[1]], [r0[0], top, r0[1]], [r1[0], top, r1[1]], ROOF);
  b.tri([p3[0], eave, p3[1]], [p0[0], eave, p0[1]], [r0[0], top, r0[1]], HIP);
  b.tri([p1[0], eave, p1[1]], [p2[0], eave, p2[1]], [r1[0], top, r1[1]], HIP);
}

/**
 * The Peace Monument (1911, Allen George Newman) just inside the 14th Street gate: OSM node
 * 13700001532 (reported position). A dark bronze angel of Peace, right arm raised, staying a
 * kneeling Confederate soldier, on a battered light-grey stone pedestal over two broad steps,
 * front to the west (the gate); visible and uncovered in September 2020 photographs
 * (https://commons.wikimedia.org/wiki/File:Peace_Monument,_Atlanta_1.jpg). No dimensions are
 * published: about 6.5 m overall, with a 4.8 m bottom step, are estimates scaled from photographs.
 */
const PEACE: P2 = [1307.3, -3619.4];
function peaceMonument(b: Builder, [x, z]: P2, ground: Ground) {
  const y = ground(x, z);
  if (y === null) return;
  const STONE = '#c3c0b8', STEP = '#b2afa7', BRONZE = '#3e3b31';
  b.box(4.8, .35, 4.8, x, y + .175, z, STEP);
  b.box(4.0, .35, 4.0, x, y + .525, z, STEP);
  // Battered pedestal as two stacked frusta (wide base, cap), drawn as boxes stepping in.
  b.box(2.8, 1.2, 2.8, x, y + 1.3, z, STONE);
  b.box(2.4, 1.6, 2.4, x, y + 2.7, z, STONE);
  b.box(2.7, .3, 2.7, x, y + 3.65, z, STONE);
  const base = y + 3.8;
  // The bronze group: the soldier kneeling at the front (west), the angel behind him standing
  // with her raised right arm and a wing sweeping back.
  b.box(.9, 1.2, .8, x - .45, base + .6, z + .1, BRONZE);
  b.box(.6, 2.4, .7, x + .35, base + 1.2, z, BRONZE);
  b.box(.18, 1.0, .18, x + .2, base + 2.9, z + .3, BRONZE);
  b.tri([x + .55, base + 2.2, z - .2], [x + 1.4, base + 1.4, z - .9], [x + .55, base + 1.0, z - .2], BRONZE);
  b.tri([x + .55, base + 2.2, z - .2], [x + .55, base + 1.0, z - .2], [x + 1.4, base + 1.4, z - .9], BRONZE);
}
