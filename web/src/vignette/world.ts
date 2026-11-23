/**
 * The vignette's static world, built in the browser from vignette.json:
 * a diorama board (heightfield top, clay strata on the cut edges, walnut plinth), streets,
 * sidewalks, the MARTA line (tunnel portal, open cut, viaduct), freight tracks,
 * detailed buildings and trees.
 */
import * as THREE from 'three';
import { appendWoodruffWall, woodruffLot } from './woodruff-shopfronts';
import { appendParkingDeck } from './parking-deck';
import { Builder, hashStr, Line, pointInRing, rng, segDist, type P2 } from './geom';
import { leafState } from './time';
import { PlacementIndex } from './spatial';

/** Centre-to-track offset on the drawn double-track MARTA corridor, metres. */
export const MARTA_TRACK_OFFSET = 2.1;

export interface VBuilding {
  /** Inferred finished floor in scene metres on a sloped site. */
  floorY?: number;
  cls?: string | null;
  id: string;
  h: number | null;
  floors: number | null;
  rings: P2[][];
}
export interface BuildingFinish {
  wall: string;
  roof: string;
  plainWalls?: boolean;
  fallbackHeight?: number;
  /** Supplies roof fixtures in place of the generic rooftop equipment. */
  dressRoof?: (builder: Builder, outer: P2[], roof: number) => void;
  drawRing?: (builder: Builder, ring: P2[], hole: boolean, base: number, top: number, litGlass: Builder) => void;
}
export interface VRoad {
  id?: string;
  cls: string;
  sub?: string | null;
  name: string | null;
  bridge: boolean;
  tunnel: boolean;
  pts: P2[];
}
export interface VRail {
  cls: string;
  name: string | null;
  flags: string[];
  pts: P2[];
}
export interface VGround {
  kind: string;
  sub: string | null;
  name: string | null;
  rings: P2[][];
}
export interface VData {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  buildings: VBuilding[];
  roads: VRoad[];
  rail: VRail[];
  ground?: VGround[];
  points?: Record<string, P2[]>;
  lines?: Record<string, P2[][]>;
}

/**
 * How a board is built. East Portal is a small sculpted board (`trench` terrain, dense trees);
 * the City board is ~10× larger, so it is flat with a coarse grid and lighter trees.
 */
export interface WorldOptions {
  terrain: 'trench' | 'flat';
  /** Leaf clumps per deciduous canopy (10 on desktop, fewer on phones). */
  clumps: number;
  /** Largest side of the night light map in texels. */
  lightMapMax: number;
}
export const EAST_PORTAL: WorldOptions = { terrain: 'trench', clumps: 10, lightMapMax: 4096 };

/** The MARTA alignment through the vignette: centreline + elevation (m) by distance. */
export interface Alignment {
  line: Line;
  elev: (s: number) => number;
  /** Known exposure at this distance. Unclassified or older data uses the schematic profile. */
  openToSky?: (s: number) => boolean | undefined;
  /** Track in sight beneath a modeled platform roof or through a station entrance. */
  visibleInStation?: (s: number) => boolean;
  /** Observed cover at this distance, if any. A station roof is not a tunnel mouth: no portal. */
  coverAt?: (s: number) => 'open' | 'covered' | 'roofed' | undefined;
  /** Observed structure at this distance, if any (terrain alignments). */
  formAt?: (s: number) => 'tunnel' | 'cut' | 'grade' | 'station' | 'viaduct' | undefined;
  /** Local vertical reference of the schematic rail profile, in scene metres. Defaults to zero. */
  referenceY?: (s: number) => number;
}

function profileHeight(m: Alignment, s: number) {
  return m.elev(s) - (m.referenceY?.(s) ?? 0);
}

/**
 * Whether an open run [sv, s1] gets a tunnel portal at each end: only where the track is deep
 * below its surroundings and the next stretch isn't a station roof (track under a canopy
 * continues under a roof, not into a tunnel mouth). The far end of the line never gets one.
 */
export function portalEnds(m: Alignment, sv: number, s1: number): [boolean, boolean] {
  if (m.coverAt) {
    // Terrain alignment: a mouth wherever open track continues into hidden track that is a
    // tunnel (observed covered tunnel/cut, or unobserved legacy tunnel). Station roofs and
    // buildings are not tunnel mouths, and depth relative to the 5 m DEM is not a reliable test.
    const mouth = (s: number) => {
      if (s < 0 || s > m.line.length || trackInDaylight(m, s)) return false;
      const cover = m.coverAt!(s);
      const form = m.formAt?.(s);
      return cover !== 'roofed' && form !== 'station' && form !== 'viaduct';
    };
    return [mouth(sv - 1), s1 < m.line.length && mouth(s1 + 1)];
  }
  return [
    profileHeight(m, sv) < PORTAL_E + 1,
    profileHeight(m, s1) < PORTAL_E + 1 && s1 < m.line.length,
  ];
}

/** Portal headwall depth below the rim: terrain portals get at least a full tunnel mouth. */
const PORTAL_MIN_DEPTH = 6;

export function trackInDaylight(m: Alignment, s: number) {
  return m.openToSky?.(s) ?? (profileHeight(m, s) >= PORTAL_E);
}

export function trackVisible(m: Alignment, s: number) {
  return trackInDaylight(m, s) || m.visibleInStation?.(s) === true;
}

export const PAL = {
  grass: '#8fae6a',
  grassDark: '#7a9a58',
  dirt: '#b99b74',
  clay: '#b4593a', // Georgia red clay
  clayDeep: '#8f4430',
  rock: '#7d7468',
  walnut: '#4a3426',
  sidewalk: '#d9d3c7',
  asphalt: '#5d5f66',
  asphaltHwy: '#54565d',
  lineWhite: '#eeeae0',
  lineYellow: '#e6c04a',
  concrete: '#c9c4b9',
  concreteDark: '#a7a197',
  ballast: '#8d877d',
  ballastFreight: '#7f746a',
  tie: '#5b4636',
  tieConcrete: '#9b968c',
  rail: '#6b625b',
  railRust: '#7a5242',
  girder: '#7d8a84',
  roof: '#bdb8ad',
  hvac: '#d6d3cc',
};

const WIDTH: Record<string, number> = { motorway: 13, trunk: 14, primary: 13, secondary: 11, tertiary: 9, residential: 7.5, unclassified: 7, service: 4.5, pedestrian: 5, footway: 2, steps: 2, cycleway: 2 };
const DRIVABLE = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'service']);

const TRENCH = 6.5; // the Downtown Connector runs below street level here

export class World {
  readonly group = new THREE.Group();
  /** 0 by day → 1 at night: lit windows. */
  readonly night = { value: 0 };
  readonly b: VData['bounds'];
  private gridStep: number;
  private nx: number;
  private nz: number;
  private hf: Float32Array;
  private blocks = new PlacementIndex<P2[]>();
  /** Flat board only: open-cut MARTA runs (below grade, open to the sky) to leave out of the ground. */
  private cuts: { line: Line; s0: number; s1: number }[] = [];
  /** The cuts' centrelines sampled every metre, bucketed on a 10 m grid. */
  private cutGrid = new Map<number, P2[]>();
  /** Each cut's two ends with outward unit tangents: the slot stops square at the portal. */
  private cutEnds: [number, number, number, number][] = [];
  readonly trees: { x: number; y: number; z: number; s: number; c: number; th?: number }[] = [];
  /** Real trees from a canopy height map: [x, z, height m, crown radius m]. */
  realTrees: [number, number, number, number][] | null = null;

  readonly opts: WorldOptions;
  constructor(
    readonly data: VData,
    /** The sculpted MARTA alignment (East Portal); City lays MARTA track separately. */
    readonly marta: Alignment | null,
    opts: WorldOptions = EAST_PORTAL,
  ) {
    this.opts = opts;
    for (const bd of data.buildings) this.blocks.add(bd.rings[0], bd.rings[0], 2.5);
    this.b = data.bounds;
    // A flat board needs no fine heightfield: a coarse grid keeps the ground mesh small.
    this.gridStep = opts.terrain === 'flat' ? 20 : 2.5;
    this.nx = Math.round((this.b.maxX - this.b.minX) / this.gridStep) + 1;
    this.nz = Math.round((this.b.maxZ - this.b.minZ) / this.gridStep) + 1;
    this.hf = new Float32Array(this.nx * this.nz);
    if (opts.terrain === 'trench') this.computeHeights();
  }

  // ---- terrain ------------------------------------------------------------------------

  private computeHeights() {
    const { b, gridStep: st } = this;
    const hwy = this.data.roads.filter((r) => r.cls === 'motorway');
    const surf = this.data.roads.filter((r) => DRIVABLE.has(r.cls) && r.cls !== 'motorway' && r.cls !== 'service' && !r.bridge);
    const near = (x: number, z: number, roads: VRoad[], max: number) => {
      let best = max;
      for (const r of roads)
        for (let i = 1; i < r.pts.length; i++) {
          const a = r.pts[i - 1];
          const c = r.pts[i];
          if (Math.min(a[0], c[0]) - best > x || Math.max(a[0], c[0]) + best < x || Math.min(a[1], c[1]) - best > z || Math.max(a[1], c[1]) + best < z) continue;
          best = Math.min(best, segDist(x, z, a, c));
        }
      return best;
    };
    const m = this.marta!;
    for (let j = 0; j < this.nz; j++)
      for (let i = 0; i < this.nx; i++) {
        const x = b.minX + i * st;
        const z = b.minZ + j * st;
        let h = 0;
        const d = near(x, z, hwy, 40);
        if (d < 40) {
          // Trench: full depth under the carriageways, grassy slopes to street level.
          const depth = TRENCH * (1 - smooth(9, 22, d));
          // Ramps rise to meet surface streets.
          const lift = smooth(8, 50, near(x, z, surf, 50));
          h = -depth * lift;
        }
        // MARTA open cut between the portal and street level.
        let bestS = -1;
        let bestD = 12;
        for (let s = 0; s <= m.line.length; s += 4) {
          const p = m.line.at(s);
          const dd = Math.hypot(p.x - x, p.z - z);
          if (dd < bestD) {
            bestD = dd;
            bestS = s;
          }
        }
        if (bestS >= 0) {
          const e = m.elev(bestS);
          if (e < -0.2 && e > PORTAL_E - 0.5 && bestD < 6.5) h = Math.min(h, e - 0.1);
        }
        this.hf[j * this.nx + i] = h;
      }
  }

  ground(x: number, z: number) {
    const { b, gridStep: st, nx, nz } = this;
    const fx = Math.min(Math.max((x - b.minX) / st, 0), nx - 1.001);
    const fz = Math.min(Math.max((z - b.minZ) / st, 0), nz - 1.001);
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    const tx = fx - i;
    const tz = fz - j;
    const h = (ii: number, jj: number) => this.hf[jj * nx + ii];
    return (h(i, j) * (1 - tx) + h(i + 1, j) * tx) * (1 - tz) + (h(i, j + 1) * (1 - tx) + h(i + 1, j + 1) * tx) * tz;
  }

  inBounds(x: number, z: number, pad = 0) {
    const b = this.b;
    return x > b.minX + pad && x < b.maxX - pad && z > b.minZ + pad && z < b.maxZ - pad;
  }

  buildBoard() {
    const { b, gridStep: st, nx, nz } = this;
    const pos: number[] = [];
    const col: number[] = [];
    const c = new THREE.Color();
    const grass = new THREE.Color(PAL.grass);
    const slope = new THREE.Color(PAL.grassDark);
    const dirt = new THREE.Color(PAL.dirt);
    const vtx = (i: number, j: number) => {
      const h = this.hf[j * nx + i];
      const x = b.minX + i * st;
      const z = b.minZ + j * st;
      c.copy(grass);
      if (h < -0.3) c.lerp(slope, Math.min(1, -h / 3));
      // Speckle so large lawns aren't flat.
      const n = Math.sin(x * 0.37 + z * 0.11) * Math.sin(z * 0.29 - x * 0.07);
      c.lerp(dirt, Math.max(0, n) * 0.18);
      pos.push(x, h, z);
      col.push(c.r, c.g, c.b);
    };
    // Cells near an open cut (flat board) are drawn as 1 m sub-quads, leaving out the slot.
    const sub = (i: number, j: number) => {
      const n = Math.round(st);
      const x0 = b.minX + i * st;
      const z0 = b.minZ + j * st;
      const ss = st / n;
      const quad = (xa: number, xb: number, za: number, zb: number) => {
        for (const [x, z] of [[xa, za], [xa, zb], [xb, za], [xb, za], [xa, zb], [xb, zb]]) {
          c.copy(grass);
          const n2 = Math.sin(x * 0.37 + z * 0.11) * Math.sin(z * 0.29 - x * 0.07);
          c.lerp(dirt, Math.max(0, n2) * 0.18);
          pos.push(x, 0, z);
          col.push(c.r, c.g, c.b);
        }
      };
      // One quad per run of kept sub-cells in each row.
      for (let v = 0; v < n; v++) {
        const za = z0 + v * ss;
        let run = -1;
        for (let u = 0; u <= n; u++) {
          const keep = u < n && !this.inCut(x0 + (u + 0.5) * ss, za + ss / 2);
          if (keep && run < 0) run = u;
          if (!keep && run >= 0) {
            quad(x0 + run * ss, x0 + u * ss, za, za + ss);
            run = -1;
          }
        }
      }
    };
    const nearCut = (i: number, j: number) => this.nearCutPts(b.minX + (i + 0.5) * st, b.minZ + (j + 0.5) * st, st / 2 + CUT_HALF);
    for (let j = 0; j < nz - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        if (nearCut(i, j)) {
          sub(i, j);
          continue;
        }
        vtx(i, j);
        vtx(i, j + 1);
        vtx(i + 1, j);
        vtx(i + 1, j);
        vtx(i, j + 1);
        vtx(i + 1, j + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    const top = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
    top.userData.lit = true;
    top.receiveShadow = true;
    this.group.add(top);

    // Cut edges: strata down to the plinth, following the terrain line.
    const bottom = -18;
    const sk = new Builder();
    const strata = (y: number) => (y > -1.2 ? PAL.dirt : y > -7 ? PAL.clay : y > -13 ? PAL.clayDeep : PAL.rock);
    const bands = [0.5, -1.2, -7, -13, bottom];
    const edge = (pts: P2[]) => {
      for (let k = 1; k < pts.length; k++) {
        const [x0, z0] = pts[k - 1];
        const [x1, z1] = pts[k];
        const t0 = this.ground(x0, z0);
        const t1 = this.ground(x1, z1);
        for (let q = 1; q < bands.length; q++) {
          const hi0 = Math.min(t0, bands[q - 1]);
          const hi1 = Math.min(t1, bands[q - 1]);
          const lo0 = Math.min(t0, bands[q]);
          const lo1 = Math.min(t1, bands[q]);
          if (hi0 - lo0 < 1e-3 && hi1 - lo1 < 1e-3) continue;
          sk.quad([x0, lo0, z0], [x1, lo1, z1], [x1, hi1, z1], [x0, hi0, z0], strata((Math.min(hi0, hi1) + Math.max(lo0, lo1)) / 2));
        }
      }
    };
    const run = (fx: (t: number) => P2, n: number) => edge(Array.from({ length: n + 1 }, (_, k) => fx(k / n)));
    const W = b.maxX - b.minX;
    const D = b.maxZ - b.minZ;
    run((t) => [b.minX + t * W, b.minZ], Math.ceil(W / st));
    run((t) => [b.maxX, b.minZ + t * D], Math.ceil(D / st));
    run((t) => [b.maxX - t * W, b.maxZ], Math.ceil(W / st));
    run((t) => [b.minX, b.maxZ - t * D], Math.ceil(D / st));
    const skirt = new THREE.Mesh(sk.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    this.group.add(skirt);

    this.buildPlinth(bottom);
  }

  /** Walnut plinth with a little lip, under either board surface. */
  buildPlinth(bottom: number) {
    const b = this.b;
    const W = b.maxX - b.minX, D = b.maxZ - b.minZ;
    const pl = new THREE.Mesh(new THREE.BoxGeometry(W + 16, 6, D + 16), new THREE.MeshLambertMaterial({ color: PAL.walnut }));
    pl.position.set((b.minX + b.maxX) / 2, bottom - 3, (b.minZ + b.maxZ) / 2);
    pl.receiveShadow = true;
    this.group.add(pl);
    return pl;
  }

  // ---- streets ------------------------------------------------------------------------

  buildStreets() {
    const side = new Builder();
    const road = new Builder();
    const marks = new Builder();
    const decks = new Builder();
    const clip = (r: VRoad) => r.pts.filter((p) => this.inBounds(p[0], p[1], -1));
    const order = ['footway', 'steps', 'cycleway', 'pedestrian', 'service', 'unclassified', 'residential', 'tertiary', 'secondary', 'primary', 'trunk', 'motorway'];
    const roads = [...this.data.roads].sort((a, b) => order.indexOf(a.cls) - order.indexOf(b.cls));
    for (const r of roads) {
      const pts = clip(r);
      if (pts.length < 2) continue;
      const w = r.sub === 'parking_aisle' ? 6.4 : r.cls === 'motorway' && r.sub === 'link' ? 6.5 : WIDTH[r.cls] ?? 0;
      if (!w || r.tunnel) continue;
      const line = new Line(pts);
      const hwy = r.cls === 'motorway' && r.sub !== 'link';
      const y = (lift: number) => (_s: number, x: number, z: number) => (r.bridge ? Math.max(0, this.ground(x, z)) : this.ground(x, z)) + lift;
      if (!DRIVABLE.has(r.cls)) {
        side.ribbon(line, w, y(0.16), r.cls === 'pedestrian' ? '#e2dccf' : PAL.sidewalk, 2);
        continue;
      }
      if (r.cls !== 'motorway' && r.cls !== 'service') side.ribbon(line, w + 6, y(0.14), PAL.sidewalk, 2);
      road.ribbon(line, w, y(0.2), hwy ? PAL.asphaltHwy : PAL.asphalt, 2);
      // Lane markings
      if (hwy) {
        for (const off of [-3.2, 0, 3.2]) dashes(marks, line.offset(off, 2), y(0.24), PAL.lineWhite, 3, 9);
        for (const off of [-6.2, 6.2]) marks.ribbon(line.offset(off, 2), 0.18, y(0.24), PAL.lineWhite, 3);
      } else if (w >= 9) {
        for (const off of [-0.18, 0.18]) marks.ribbon(line.offset(off, 2), 0.14, y(0.24), PAL.lineYellow, 3);
        // Lane dashes come from the traffic model's lanes (traffic.ts), so cars sit between them.
      }
      // Overpass decks: concrete fascia where the street crosses the sunken highway.
      if (r.bridge) {
        for (let s = 0; s < line.length; s += 2) {
          const p = line.at(s);
          const below = this.ground(p.x, p.z);
          if (below < -1) {
            for (const sd of [-1, 1]) {
              const x = p.x + p.nx * (w / 2 + 3) * sd;
              const z = p.z + p.nz * (w / 2 + 3) * sd;
              decks.box(0.5, 1.6, 2.05, 0, 0, 0, PAL.concrete, new THREE.Matrix4().makeRotationY(Math.atan2(p.dx, p.dz)).setPosition(x, -0.5, z));
              decks.box(0.4, 1.0, 2.05, 0, 0, 0, PAL.concreteDark, new THREE.Matrix4().makeRotationY(Math.atan2(p.dx, p.dz)).setPosition(x, 0.8, z));
            }
          }
        }
      }
    }
    const mk = (bld: Builder, offset: number) => {
      const m = new THREE.Mesh(bld.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -offset, polygonOffsetUnits: -offset * 4 }));
      m.receiveShadow = true;
      m.userData.lit = true;
      this.group.add(m);
    };
    mk(side, 1);
    mk(road, 2);
    mk(marks, 3);
    const dm = new THREE.Mesh(decks.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true }));
    dm.castShadow = dm.receiveShadow = true;
    this.group.add(dm);
  }

  // ---- ground cover -------------------------------------------------------------------

  /** Parking stalls found by buildGround, for parked cars: centre and heading. */
  readonly stalls: { x: number; y: number; z: number; ang: number }[] = [];

  /**
   * Paint real ground cover over the lawn: parking lots (asphalt, stall lines), plazas,
   * sports pitches, construction sites, platforms, and zebra crossings.
   */
  buildGround() {
    const fill = new Builder();
    const marks = new Builder();
    const b = this.b;
    const STYLE: Record<string, { color: string; lift: number } | undefined> = {
      parking: { color: '#6e7075', lift: 0.1 },
      pedestrian: { color: '#d6cdbd', lift: 0.12 },
      platform: { color: '#cfc9bd', lift: 0.3 },
      pitch: { color: '#5f9a4a', lift: 0.08 },
      construction: { color: '#a8865e', lift: 0.06 },
      meadow: { color: '#a5b46e', lift: 0.04 },
      garden: { color: '#6f9a52', lift: 0.05 },
      brownfield: { color: '#a99a7c', lift: 0.05 },
    };
    const order = ['meadow', 'garden', 'brownfield', 'construction', 'pitch', 'pedestrian', 'parking', 'platform'];
    const ground = [...(this.data.ground ?? [])].filter((g) => STYLE[g.kind]).sort((a, c) => order.indexOf(a.kind) - order.indexOf(c.kind));
    for (const g of ground) {
      const st = STYLE[g.kind]!;
      const outer = clipRing(g.rings[0], b);
      if (outer.length < 3) continue;
      const holes = g.rings.slice(1).map((h) => clipRing(h, b)).filter((h) => h.length >= 3);
      const contour = outer.map((p) => new THREE.Vector2(p[0], p[1]));
      const hv = holes.map((h) => h.map((p) => new THREE.Vector2(p[0], p[1])));
      const all = [...contour, ...hv.flat()];
      const y = (v: THREE.Vector2) => Math.max(this.ground(v.x, v.y), -0.5) + st.lift;
      for (const t of THREE.ShapeUtils.triangulateShape(contour, hv)) {
        const [a, c, d] = [all[t[0]], all[t[1]], all[t[2]]];
        fill.tri([a.x, y(a), a.y], [c.x, y(c), c.y], [d.x, y(d), d.y], st.color);
      }
      if (g.kind === 'parking') this.layoutStalls(outer, marks, st.lift);
      if (g.kind === 'pitch') {
        // Touchline: the polygon outline inset 1.5 m.
        const ring = new Line([...outer, outer[0]]);
        marks.ribbon(ring.offset(-1.5, 1), 0.15, (_s, x, z) => this.ground(x, z) + st.lift + 0.03, '#f2f0ea', 1);
      }
    }
    // Unmapped lots, inferred from parking aisles that aren't inside a mapped lot: pave
    // a stall's depth either side of the aisle and stripe stalls along it.
    const lots = ground.filter((g) => g.kind === 'parking').map((g) => g.rings[0]);
    const streets = this.data.roads.filter((r) => DRIVABLE.has(r.cls) && r.cls !== 'service');
    const streetIndex = new PlacementIndex<{ a: P2; b: P2; width: number }>();
    for (const r of streets) for (let i = 1; i < r.pts.length; i++) {
      const seg = { a: r.pts[i - 1], b: r.pts[i], width: (WIDTH[r.cls] ?? 7) / 2 };
      streetIndex.add(seg, [seg.a, seg.b], seg.width + 1.5);
    }
    const nearStreet = (x: number, z: number) => streetIndex.at(x, z).some((s) => segDist(x, z, s.a, s.b) < 1.5 + s.width);
    const clearSpot = (x: number, z: number) => this.inBounds(x, z, 2) && !this.blocks.at(x, z).some((r) => pointInRing(x, z, r) || edgeDist(x, z, r) < 1) && !nearStreet(x, z) && this.ground(x, z) > -0.5;
    for (const r of this.data.roads) {
      if (r.sub !== 'parking_aisle' || r.pts.length < 2) continue;
      const line = new Line(r.pts);
      const mid = line.at(line.length / 2);
      if (lots.some((ring) => pointInRing(mid.x, mid.z, ring))) continue;
      for (let s = 1.3; s < line.length - 1.3; s += 2.6)
        for (const side of [-1, 1]) {
          const p = line.at(s);
          const off = 3.2 + 2.7;
          const x = p.x + p.nx * off * side;
          const z = p.z + p.nz * off * side;
          const back = [p.x + p.nx * (off + 2.4) * side, p.z + p.nz * (off + 2.4) * side];
          if (!clearSpot(x, z) || !clearSpot(back[0], back[1])) continue;
          const y = this.ground(x, z) + 0.1;
          const ang = Math.atan2(p.nx * side, p.nz * side);
          const m = new THREE.Matrix4().makeRotationY(ang).setPosition(x, y, z);
          fill.box(2.62, 0.02, 5.6, 0, 0, 0, '#6e7075', m);
          marks.box(0.12, 0.02, 5.4, 1.3, 0.03, 0, '#e9e6de', m);
          this.stalls.push({ x, y, z, ang: ang + Math.PI });
        }
    }

    // Zebra crossings: stripes parallel to the road, spanning its width.
    const drivable = this.data.roads.filter((r) => DRIVABLE.has(r.cls) && r.cls !== 'motorway');
    const crossingIndex = new PlacementIndex<{ r: VRoad; a: P2; c: P2 }>();
    for (const r of drivable) for (let i = 1; i < r.pts.length; i++) {
      const seg = { r, a: r.pts[i - 1], c: r.pts[i] };
      crossingIndex.add(seg, [seg.a, seg.c], 3);
    }
    for (const [x, z] of this.data.points?.crossing ?? []) {
      if (!this.inBounds(x, z, 2)) continue;
      let best: { d: number; r: VRoad; a: P2; c: P2 } | null = null;
      for (const seg of crossingIndex.at(x, z)) {
        const d = segDist(x, z, seg.a, seg.c);
        if (!best || d < best.d) best = { d, ...seg };
      }
      if (!best || best.d > 3) continue;
      const w = WIDTH[best.r.cls] ?? 7;
      const len = Math.hypot(best.c[0] - best.a[0], best.c[1] - best.a[1]) || 1;
      const dx = (best.c[0] - best.a[0]) / len;
      const dz = (best.c[1] - best.a[1]) / len;
      const yy = (best.r.bridge ? Math.max(0, this.ground(x, z)) : this.ground(x, z)) + 0.25;
      const m = new THREE.Matrix4().makeRotationY(Math.atan2(dx, dz)).setPosition(x, yy, z);
      for (let o = -w / 2 + 0.6; o <= w / 2 - 0.4; o += 1.1) marks.box(0.55, 0.02, 3.2, o, 0, 0, '#f2f0ea', m);
    }
    const mk = (bld: Builder, off: number) => {
      const mesh = new THREE.Mesh(bld.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -off, polygonOffsetUnits: -off * 4 }));
      mesh.userData.lit = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    };
    mk(fill, 1.5);
    mk(marks, 3.5);
  }

  /** Rows of 2.6 m × 5.4 m stalls either side of 6.5 m aisles, along the lot's longest edge. */
  private layoutStalls(ring: P2[], marks: Builder, lift: number) {
    let best = 0;
    let ang = 0;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const c = ring[(i + 1) % ring.length];
      const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
      if (l > best) {
        best = l;
        ang = Math.atan2(c[1] - a[1], c[0] - a[0]);
      }
    }
    const ux = Math.cos(ang);
    const uz = Math.sin(ang);
    const vx = -uz;
    const vz = ux;
    // Lot extent in the (u, v) frame.
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const [x, z] of ring) {
      const u = x * ux + z * uz;
      const v = x * vx + z * vz;
      u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
    }
    const ok = (x: number, z: number) => pointInRing(x, z, ring) && edgeDist(x, z, ring) > 1.2 && !this.blocks.at(x, z).some((r) => pointInRing(x, z, r)) && this.inBounds(x, z, 1);
    const SW = 2.6;
    const SL = 5.4;
    const module = SL * 2 + 6.5;
    for (let v = v0 + 2 + SL / 2; v < v1 - SL / 2; v += module) {
      for (const side of [0, 1]) {
        const vc = v + side * (SL + 6.5); // two facing rows around each aisle
        if (vc > v1 - 1) continue;
        for (let u = u0 + 2; u < u1 - 2; u += SW) {
          const x = u * ux + vc * vx;
          const z = u * uz + vc * vz;
          if (!ok(x, z) || !ok(x + vx * (SL / 2 - 0.4), z + vz * (SL / 2 - 0.4)) || !ok(x - vx * (SL / 2 - 0.4), z - vz * (SL / 2 - 0.4))) continue;
          const y = this.ground(x, z) + lift;
          this.stalls.push({ x, y, z, ang: Math.atan2(vx, vz) + (side ? Math.PI : 0) });
          // Divider line on one side of each stall.
          const m = new THREE.Matrix4().makeRotationY(Math.atan2(vx, vz)).setPosition(x - ux * (SW / 2), y + 0.03, z - uz * (SW / 2));
          marks.box(0.12, 0.02, SL, 0, 0, 0, '#e9e6de', m);
        }
      }
    }
  }

  // ---- rail ---------------------------------------------------------------------------

  /** Stretches of an alignment inside the board and shallow enough to be daylight. */
  private openRuns(m: Alignment) {
    const runs: [number, number][] = [];
    let open: number | null = null;
    for (let s = 0; s <= m.line.length; s += 1) {
      const p = m.line.at(s);
      const ok = this.inBounds(p.x, p.z, -2) && trackVisible(m, s);
      if (ok && open == null) open = s;
      if (!ok && open != null) {
        if (s - open > 4) runs.push([open, s]);
        open = null;
      }
    }
    if (open != null && m.line.length - open > 4) runs.push([open, m.line.length]);
    return runs;
  }

  /**
   * A flat board has no heightfield to sculpt, so an open cut would sit under the ground mesh.
   * Call before `buildBoard` with every alignment `buildMarta` will draw: the board then leaves
   * a slot over each below-grade open stretch, and `buildMarta` lays the cut's floor.
   */
  setOpenCuts(als: Alignment[]) {
    if (this.opts.terrain !== 'flat') return;
    for (const m of als)
      for (const [sv, s1] of this.openRuns(m)) {
        let a: number | null = null;
        for (let s = sv; s <= s1; s += 1) {
          const below = profileHeight(m, s) < CUT_E;
          if (below && a == null) a = s;
          if ((!below || s + 1 > s1) && a != null) {
            this.cuts.push({ line: m.line, s0: a, s1: s });
            const p0 = m.line.at(a);
            const p1 = m.line.at(s);
            this.cutEnds.push([p0.x, p0.z, -p0.dx, -p0.dz], [p1.x, p1.z, p1.dx, p1.dz]);
            for (let t = a; t <= s; t += 1) {
              const p = m.line.at(t);
              const k = cutKey(Math.floor(p.x / CUT_CELL), Math.floor(p.z / CUT_CELL));
              const bucket = this.cutGrid.get(k);
              if (bucket) bucket.push([p.x, p.z]);
              else this.cutGrid.set(k, [[p.x, p.z]]);
            }
            a = null;
          }
        }
      }
  }

  /** Is (x, z) within `r` of an open-cut centreline sample (`round`: Euclidean, else a square)? */
  private nearCutPts(x: number, z: number, r: number, round = false) {
    if (!this.cutGrid.size) return false;
    for (let j = Math.floor((z - r) / CUT_CELL); j <= Math.floor((z + r) / CUT_CELL); j++)
      for (let i = Math.floor((x - r) / CUT_CELL); i <= Math.floor((x + r) / CUT_CELL); i++) {
        const bucket = this.cutGrid.get(cutKey(i, j));
        if (!bucket) continue;
        for (const [px, pz] of bucket) {
          if (round ? Math.hypot(px - x, pz - z) < r : Math.abs(px - x) < r && Math.abs(pz - z) < r) return true;
        }
      }
    return false;
  }

  /** Inside an open-cut slot (flat board): within the walls of a below-grade open stretch. */
  private inCut(x: number, z: number) {
    if (!this.nearCutPts(x, z, CUT_HALF, true)) return false;
    // Not beyond either end of the cut (that's ground over the tunnel).
    return !this.cutEnds.some(([ex, ez, tx, tz]) => Math.hypot(ex - x, ez - z) < CUT_HALF * 1.5 && (x - ex) * tx + (z - ez) * tz > 0);
  }

  /**
   * Both MARTA tracks along an alignment: ballast, ties, rails, third rail, open-cut walls,
   * tunnel portals and viaduct. Only the open parts are drawn (deeper than the portal is tunnel),
   * so one alignment can surface, dive and surface again across a big board.
   */
  buildMarta(m: Alignment | null = this.marta, pierAllowed?: (x: number, z: number) => boolean) {
    if (!m) return;
    const b = new Builder();
    const runs = this.openRuns(m);
    if (!runs.length) return;
    // Terrain boards (referenceY) subtract a slot from the ground over each cut, like the flat board.
    const slotted = this.cuts.length > 0 || m.referenceY != null;
    const coping = slotted ? [m.line.offset(-CUT_HALF, 2), m.line.offset(CUT_HALF, 2)] : [];
    const ey = (s: number) => m.elev(s);
    const tieM = new THREE.Matrix4();
    const ties: THREE.Matrix4[] = [];
    for (const [sv, s1] of runs) {
      for (const off of [-MARTA_TRACK_OFFSET, MARTA_TRACK_OFFSET]) {
        const tl = m.line.offset(off, 2);
        b.ribbon(tl, 3.6, (s) => ey(s) + 0.25, PAL.ballast, 2, sv, s1);
        for (const r of [-0.72, 0.72]) b.ribbon(tl.offset(r, 2), 0.12, (s) => ey(s) + 0.55, PAL.rail, 2, sv, s1);
        b.ribbon(tl.offset(off > 0 ? 1.35 : -1.35, 2), 0.18, (s) => ey(s) + 0.6, '#b9b2a6', 2, sv, s1); // third rail cover
        for (let s = sv; s < s1; s += 0.9) {
          const p = tl.at(s);
          tieM.makeRotationY(Math.atan2(p.dx, p.dz)).setPosition(p.x, ey(s) + 0.42, p.z);
          ties.push(tieM.clone());
        }
      }
      // Open-cut retaining walls, and a portal headwall wherever the cut becomes a tunnel.
      const portal = (s: number, flip: boolean) => {
        const e = m.coverAt ? Math.min(profileHeight(m, s), -PORTAL_MIN_DEPTH) : profileHeight(m, s);
        const rim = m.referenceY?.(s) ?? 0;
        const p = m.line.at(s);
        const rot = new THREE.Matrix4().makeRotationY(Math.atan2(p.dx, p.dz) + (flip ? Math.PI : 0)).setPosition(p.x, rim, p.z);
        b.box(12, -e + 1.2, 1.2, 0, (e + 1.2) / 2 + 0.1, -0.6, PAL.concrete, rot);
        b.box(12.6, 0.5, 1.6, 0, 1.0, -0.6, PAL.concreteDark, rot);
        b.box(9.6, -e - 0.5, 0.2, 0, e + (-e - 0.5) / 2, 0.05, '#1c1d22', rot); // dark mouth
      };
      for (let s = sv; s < s1; s += 2) {
        const e = ey(s);
        const rim = m.referenceY?.(s) ?? 0;
        if (e - rim < CUT_E) for (const d of [-5.2, 5.2]) b.wall(m.line, d, () => e - 0.2, () => rim + 0.6, PAL.concrete, 2, s, Math.min(s + 2, s1));
        // A flat board has a slot, not sculpted ground, over the cut: give it a floor.
        if (slotted && e - rim < CUT_E) {
          b.ribbon(m.line, CUT_HALF * 2 + 0.6, () => e - 0.05, PAL.concreteDark, 2, s, Math.min(s + 2, s1));
          // Coping along the wall tops hides the slot's 1 m stepped edge.
          for (const cl of coping) b.ribbon(cl, 1.8, () => rim + 0.62, PAL.concrete, 2, s, Math.min(s + 2, s1));
        }
      }
      const [atStart, atEnd] = portalEnds(m, sv, s1);
      if (atStart) portal(sv, false);
      if (atEnd) portal(s1, true);
      // Viaduct: box-girder deck, parapets and piers wherever the track is well above ground.
      let lastPierS = -Infinity, seekingPier = false;
      for (let s = sv; s < s1; s += 2) {
        const p = m.line.at(s);
        const e = ey(s);
        const g = this.ground(p.x, p.z);
        if (e - g < 2.2) { seekingPier = false; continue; }
        const rot = new THREE.Matrix4().makeRotationY(Math.atan2(p.dx, p.dz)).setPosition(p.x, 0, p.z);
        b.box(10.4, 1.6, 2.02, 0, e - 0.75, 0, PAL.concrete, rot);
        for (const d of [-5.05, 5.05]) b.box(0.3, 1.1, 2.02, d, e + 0.55, 0, PAL.concreteDark, rot);
        // If the nominal station falls in a travel lane, keep looking along the
        // deck for the next safe bank or median. Keep adjacent piers apart.
        if (Math.round(s) % 26 < 2) seekingPier = true;
        if (seekingPier && s - lastPierS >= 14) {
          const offset = pierAllowed
            ? [0, -3.2, 3.2].find(d => pierAllowed(p.x + d * p.nx, p.z + d * p.nz))
            : 0;
          if (offset === undefined) continue;
          const base = offset ? this.ground(p.x + offset * p.nx, p.z + offset * p.nz) : g;
          const hgt = e - 1.55 - base;
          if (hgt <= 0) continue;
          seekingPier = false;
          lastPierS = s;
          b.box(2.2, hgt, 2.6, offset, base + hgt / 2, 0, PAL.concrete, rot);
          b.box(8, 1.0, 2.8, 0, e - 2.0, 0, PAL.concreteDark, rot); // pier cap
        }
      }
    }
    const mesh = new THREE.Mesh(b.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    mesh.castShadow = mesh.receiveShadow = true;
    this.group.add(mesh);
    this.group.add(instanced(new THREE.BoxGeometry(2.6, 0.18, 0.3), PAL.tieConcrete, ties));
  }

  buildFreight() {
    const b = new Builder();
    const ties: THREE.Matrix4[] = [];
    const tm = new THREE.Matrix4();
    for (const r of this.data.rail) {
      if (r.cls !== 'standard_gauge' || r.flags.includes('is_tunnel')) continue;
      const pts = r.pts.filter((p) => this.inBounds(p[0], p[1], -1));
      if (pts.length < 2) continue;
      const line = new Line(pts);
      const y = (_s: number, x: number, z: number) => Math.max(0, this.ground(x, z));
      b.ribbon(line, 4.2, (s, x, z) => y(s, x, z) + 0.2, PAL.ballastFreight, 2);
      for (const o of [-0.72, 0.72]) b.ribbon(line.offset(o, 2), 0.12, (s, x, z) => y(s, x, z) + 0.5, PAL.railRust, 2);
      for (let s = 0; s < line.length; s += 0.8) {
        const p = line.at(s);
        tm.makeRotationY(Math.atan2(p.dx, p.dz)).setPosition(p.x, y(s, p.x, p.z) + 0.37, p.z);
        ties.push(tm.clone());
        const g = this.ground(p.x, p.z);
        if (g < -1 && Math.round(s / 0.8) % 3 === 0) {
          // Deck-girder bridge over the highway: a slim steel deck with a low railing,
          // light enough that parallel tracks don't merge into one slab.
          const rot = new THREE.Matrix4().makeRotationY(Math.atan2(p.dx, p.dz)).setPosition(p.x, 0, p.z);
          b.box(4.6, 0.35, 2.45, 0, 0.0, 0, '#8d969c', rot); // deck
          b.box(3.2, 0.9, 2.45, 0, -0.6, 0, '#6f787e', rot); // girder below the deck
          for (const d of [-2.25, 2.25]) b.box(0.08, 0.7, 2.45, d, 0.55, 0, '#a7afb4', rot); // railing
        }
      }
    }
    const mesh = new THREE.Mesh(b.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    mesh.castShadow = mesh.receiveShadow = true;
    this.group.add(mesh, instanced(new THREE.BoxGeometry(2.6, 0.16, 0.24), PAL.tie, ties));
  }

  /** Streetcar rails are embedded in the street: no ballast, ties or third rail. */
  buildTram() {
    const b = new Builder();
    for (const r of this.data.rail) {
      if (r.cls !== 'tram' || r.flags.includes('is_tunnel') || r.pts.length < 2) continue;
      const line = new Line(r.pts);
      for (const off of [-0.7175, 0.7175]) {
        const rail = line.offset(off, 1);
        b.ribbon(rail, 0.24, (_s, x, z) => this.ground(x, z) + 0.27, '#393c40', 1);
        b.ribbon(rail, 0.09, (_s, x, z) => this.ground(x, z) + 0.29, '#b6b5ae', 1);
      }
    }
    const mesh = new THREE.Mesh(b.geometry(), new THREE.MeshLambertMaterial({
      vertexColors: true, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -16,
    }));
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  // ---- buildings ----------------------------------------------------------------------

  buildBuildings(foundationY?: (building: VBuilding) => number | null, maxRoofUnits = 8, finishFor?: (building: VBuilding) => BuildingFinish | undefined) {
    const b = new Builder();
    const shopLights = new Builder();
    const style: number[] = [];
    const base: number[] = [];
    const clutter: THREE.Matrix4[] = [];
    const clutterCol: THREE.Color[] = [];
    const m4 = new THREE.Matrix4();
    for (const bd of this.data.buildings) {
      const outer = bd.rings[0];
      if (!outer || outer.length < 3) continue;
      const footing = foundationY ? foundationY(bd) : 0;
      if (footing === null) continue;
      const originY = bd.floorY ?? footing;
      const finish = finishFor?.(bd);
      const h = bd.h ?? (bd.floors ? bd.floors * 3.6 : finish?.fallbackHeight ?? 8);
      const r = rng(hashStr(bd.id));
      // Massing class decides the material: brick low-rise, stone/concrete mid-rise, glass towers.
      // Mid-rises mix brick, stone with punched windows, and ribbon-window offices.
      const kind = h < 16 ? 0 : h < 42 ? (r() < 0.45 ? 0 : 1) : 2;
      const tall = h >= 16;
      const wallCol = finish?.wall ?? pick(r, kind === 0 && tall ? ['#c9b49a', '#b98a6a', '#d8c9b0', '#a9583f', '#e0d6c4'] : kind === 0 ? ['#a9583f', '#b86a4b', '#9a4c39', '#c98f6b', '#d7c3a2'] : kind === 1 ? ['#d9cdb5', '#cfc5b4', '#c1b6a3', '#e1d8c6', '#b9b0a3'] : ['#8fa4b6', '#9fb0bd', '#7f93a4', '#a8b8c2']);
      let foot = footing;
      if (!foundationY) for (const p of outer) foot = Math.min(foot, this.ground(p[0], p[1]));
      const y0 = foot - 0.5;
      const roofY = originY + h;
      const before = b.pos.length / 3;
      if (appendParkingDeck(b, bd, y0, originY, roofY)) {
        for (let i = before; i < b.pos.length / 3; i++) {
          style.push(-1);
          base.push(0);
        }
        continue;
      }
      // Walls (run to h + parapet), roof slightly below the parapet top.
      const parapet = h > 6 ? 1.1 : 0;
      const shop = woodruffLot(bd);
      for (const [ringIndex, ring] of bd.rings.entries()) {
        if (finish?.drawRing) {
          const first = b.pos.length / 3;
          finish.drawRing(b, ring, ringIndex > 0, foot, roofY + parapet, shopLights);
          for (let j = first; j < b.pos.length / 3; j++) style.push(-1);
          continue;
        }
        for (let i = 0; i < ring.length; i++) {
          const a = ring[i];
          const c = ring[(i + 1) % ring.length];
          const first = b.pos.length / 3;
          if (shop && appendWoodruffWall(shop, a, c, originY, roofY + parapet, b, shopLights)) {
            for (let j = first; j < b.pos.length / 3; j++) style.push(-1);
            continue;
          }
          const wallKind = finish?.plainWalls ? -1 : finish ? 0 : kind;
          style.push(wallKind, wallKind, wallKind, wallKind, wallKind, wallKind);
          b.quad([a[0], y0, a[1]], [c[0], y0, c[1]], [c[0], roofY + parapet, c[1]], [a[0], roofY + parapet, a[1]], wallCol);
        }
      }
      const wallVerts = b.pos.length / 3 - before;
      const contour = outer.map((p) => new THREE.Vector2(p[0], p[1]));
      const holes = bd.rings.slice(1).map((ring) => ring.map((p) => new THREE.Vector2(p[0], p[1])));
      const tris = THREE.ShapeUtils.triangulateShape(contour, holes);
      const all = [...contour, ...holes.flat()];
      // Roofs: white membrane, gravel, tar and the odd green roof.
      const roofCol = finish?.roof ?? pick(r, kind === 2 ? ['#9aa3a8', '#b7bcbf'] : ['#e9e7e1', '#d8d4cb', '#bdb8ad', '#9d9a94', '#c9c2b2', '#e9e7e1', '#8fa66b']);
      for (const t of tris) b.tri([all[t[0]].x, roofY, all[t[0]].y], [all[t[1]].x, roofY, all[t[1]].y], [all[t[2]].x, roofY, all[t[2]].y], roofCol);
      finish?.dressRoof?.(b, outer, roofY);
      const roofVerts = b.pos.length / 3 - before - wallVerts;
      for (let i = 0; i < wallVerts; i++) {
        base.push(foundationY ? originY : (y0 < -1 ? y0 + 0.5 : 0));
      }
      for (let i = 0; i < roofVerts; i++) {
        style.push(-1);
        base.push(0);
      }
      if (finish?.dressRoof) continue;
      // Rooftop clutter: HVAC units, vents and a stair/elevator penthouse on bigger roofs.
      const area = ringArea(outer);
      const xs = outer.map((p) => p[0]);
      const zs = outer.map((p) => p[1]);
      const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
      const n = Math.min(maxRoofUnits, Math.floor(area / 220));
      let placed = 0;
      for (let k = 0; k < n * 6 && placed < n; k++) {
        const x = x0 + r() * (x1 - x0);
        const z = z0 + r() * (z1 - z0);
        if (!pointInRing(x, z, outer) || edgeDist(x, z, outer) < 3) continue;
        const big = placed === 0 && h > 20 && area > 600;
        const [w, hh, l] = big ? [6 + r() * 3, 3.5, 5 + r() * 3] : [1.6 + r() * 2.4, 1 + r() * 0.8, 1.6 + r() * 3];
        m4.makeRotationY(Math.atan2(outer[1][1] - outer[0][1], outer[1][0] - outer[0][0]));
        m4.scale(new THREE.Vector3(w, hh, l)).setPosition(x, roofY + hh / 2, z);
        clutter.push(m4.clone());
        clutterCol.push(new THREE.Color(big ? wallCol : r() < 0.7 ? PAL.hvac : '#8f9498'));
        placed++;
      }
    }
    // Painted shop glass shares the building draw. Only this glass receives the
    // subdued interior light when the City's existing night uniform comes up.
    for (let i = 0; i < shopLights.pos.length; i += 3) {
      b.pos.push(shopLights.pos[i], shopLights.pos[i+1], shopLights.pos[i+2]);
      b.col.push(shopLights.col[i], shopLights.col[i+1], shopLights.col[i+2]);
      style.push(-2);
      base.push(0);
    }
    const g = b.geometry();
    g.setAttribute('aStyle', new THREE.Float32BufferAttribute(style, 1));
    g.setAttribute('aBase', new THREE.Float32BufferAttribute(base, 1));
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    patchFacades(mat, this.night);
    const mesh = new THREE.Mesh(g, mat);
    mesh.castShadow = mesh.receiveShadow = true;
    this.group.add(mesh);
    const cm = instanced(new THREE.BoxGeometry(1, 1, 1), '#ffffff', clutter);
    clutterCol.forEach((c, i) => cm.setColorAt(i, c));
    this.group.add(cm);
  }

  // ---- trees --------------------------------------------------------------------------

  buildTrees(leafGeometry: THREE.BufferGeometry = new THREE.DodecahedronGeometry(1, 0)) {
    const r = rng(20261120);
    const drivable = this.data.roads.filter((x) => DRIVABLE.has(x.cls) || x.cls === 'pedestrian' || x.cls === 'footway');
    const rails = this.data.rail.map((x) => x.pts);
    const clearOf = (x: number, z: number) => {
      if (!this.inBounds(x, z, 3)) return false;
      if (this.ground(x, z) < -0.6) return false;
      for (const ring of this.blocks.at(x, z)) if (pointInRing(x, z, ring) || edgeDist(x, z, ring) < 2.5) return false;
      for (const rd of drivable) {
        const w = (WIDTH[rd.cls] ?? 4) / 2 + (rd.cls === 'footway' ? 0.8 : 1.5);
        for (let i = 1; i < rd.pts.length; i++) if (segDist(x, z, rd.pts[i - 1], rd.pts[i]) < w) return false;
      }
      for (const pts of rails) for (let i = 1; i < pts.length; i++) if (segDist(x, z, pts[i - 1], pts[i]) < 7) return false;
      for (let s = 0; this.marta && s < this.marta.line.length; s += 6) {
        const p = this.marta.line.at(s);
        if (Math.hypot(p.x - x, p.z - z) < 9) return false;
      }
      return true;
    };
    if (this.realTrees) {
      // Trees where Atlanta's trees really are, sized from the canopy height map.
      for (const [x, z, h, cr] of this.realTrees) {
        if (!this.inBounds(x, z, 1)) continue;
        if (this.blocks.at(x, z).some((ring) => pointInRing(x, z, ring))) continue;
        const sz = Math.min(4.5, Math.max(0.7, cr / 2.3));
        const y = this.ground(x, z);
        this.trees.push({ x, y, z, s: sz, c: r(), th: Math.max(1.2, h - 4.2 * sz) });
      }
    } else {
    // Street trees along the sidewalks of city streets.
    for (const rd of this.data.roads) {
      if (!['secondary', 'tertiary', 'residential', 'unclassified', 'pedestrian'].includes(rd.cls) || rd.bridge) continue;
      const line = new Line(rd.pts);
      const w = WIDTH[rd.cls] / 2 + 2.2;
      for (let s = 4 + r() * 6; s < line.length; s += 10 + r() * 5)
        for (const sd of [-1, 1]) {
          const p = line.at(s);
          const x = p.x + p.nx * w * sd;
          const z = p.z + p.nz * w * sd;
          if (r() < 0.8 && clearOf(x, z)) this.addTree(x, z, r, 0.85);
        }
    }
    // Atlanta's canopy: scatter trees through open ground, thicker away from the core.
    for (let x = this.b.minX; x < this.b.maxX; x += 7)
      for (let z = this.b.minZ; z < this.b.maxZ; z += 7) {
        const jx = x + (r() - 0.5) * 6;
        const jz = z + (r() - 0.5) * 6;
        if (r() < 0.42 && clearOf(jx, jz)) this.addTree(jx, jz, r, 1);
      }
    // Slopes of the highway trench get scrubby trees too.
    for (let i = 0; i < 4000; i++) {
      const x = this.b.minX + r() * (this.b.maxX - this.b.minX);
      const z = this.b.minZ + r() * (this.b.maxZ - this.b.minZ);
      const g = this.ground(x, z);
      if (g < -1 && g > -TRENCH + 1.6 && r() < 0.5) this.addTree(x, z, r, 0.8, g);
    }
    }
    const n = this.trees.length;
    const leafMat = new THREE.MeshLambertMaterial({ flatShading: true });
    // Canopies are clusters of small faceted leaf clumps (after the reference style), not one blob.
    this.canopy = new THREE.InstancedMesh(leafGeometry, leafMat, n * this.opts.clumps);
    // Pines: two stacked five-sided cones.
    const pine = new THREE.ConeGeometry(1, 1.6, 7);
    pine.translate(0, 0.8, 0);
    this.pines = new THREE.InstancedMesh(pine, leafMat, n * PINE_TIERS);
    this.trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.24, 1, 5).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: '#6b4f3a' }), n);
    // Bare-branch crowns, hidden inside the canopy until the leaves drop.
    const br = new Builder();
    const rb = rng(5);
    for (let i = 0; i < 6; i++) {
      const g = new THREE.CylinderGeometry(0.05, 0.1, 1.6, 4).translate(0, 0.8, 0);
      g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.5 + rb() * 0.5, (i / 6) * Math.PI * 2, 0, 'YXZ')));
      br.addGeometry(g, '#6b5444');
    }
    br.addGeometry(new THREE.CylinderGeometry(0.06, 0.14, 1.8, 4).translate(0, 0.9, 0), '#6b5444');
    this.branches = new THREE.InstancedMesh(br.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true }), n);
    for (const im of [this.canopy, this.pines, this.trunks, this.branches]) {
      im.castShadow = true;
      im.receiveShadow = true;
      this.group.add(im);
    }
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    this.trees.forEach((t, i) => {
      const trunkH = t.th ?? 2 + t.s * 0.6;
      m.compose(new THREE.Vector3(t.x, t.y, t.z), q.identity(), new THREE.Vector3(t.s * 0.8, trunkH, t.s * 0.8));
      this.trunks!.setMatrixAt(i, m);
      q.setFromEuler(new THREE.Euler(0, t.c * 40, 0));
      m.compose(new THREE.Vector3(t.x, t.y + trunkH * 0.85, t.z), q, new THREE.Vector3(t.s * 1.3, t.s * 1.3, t.s * 1.3));
      this.branches!.setMatrixAt(i, m);
    });
  }

  private canopy?: THREE.InstancedMesh;
  private pines?: THREE.InstancedMesh;
  private trunks?: THREE.InstancedMesh;
  private branches?: THREE.InstancedMesh;
  private seasonDoy = -1;

  /**
   * Dress the trees for a day of the year. About a quarter are evergreen (loblolly pines and
   * magnolias); the rest are oaks, maples, tulip poplars and sweetgums that each turn and drop
   * on their own few-week schedule.
   */
  setSeason(doy: number) {
    if (doy === this.seasonDoy || !this.canopy || !this.pines) return;
    this.seasonDoy = doy;
    const canopy = this.canopy;
    const pines = this.pines;
    const clumps = this.opts.clumps;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const c = new THREE.Color();
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    const summer = ['#5f8f4e', '#6e9d55', '#4f7f45', '#7ea65f', '#5a8a58'];
    const spring = '#a9cf6a';
    // Fall colour by species: maple red, sweetgum burgundy, oak russet, poplar gold.
    const fall = ['#c43a26', '#8e2f3a', '#a8662f', '#e0b04a', '#d0782f'];
    const brown = new THREE.Color('#8a6a48');
    let k = 0;
    let kp = 0;
    const tint = new THREE.Color();
    const v = new THREE.Vector3();
    const sc3 = new THREE.Vector3();
    this.trees.forEach((t) => {
      const trunkH = t.th ?? 2 + t.s * 0.6;
      const kind = t.c < 0.18 ? 'pine' : t.c < 0.26 ? 'magnolia' : 'deciduous';
      const r = rng(Math.floor(t.c * 1e9) + 7);
      if (kind === 'pine') {
        // Loblolly pine: tall bare trunk, a crown of stacked tiers narrowing to the top.
        for (let i = 0; i < PINE_TIERS; i++) {
          const f = i / (PINE_TIERS - 1);
          const w = (1.55 - f * 1.05) * t.s;
          const h = (1.5 - f * 0.4) * t.s;
          q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.12, r() * 6.3, (r() - 0.5) * 0.12));
          m.compose(v.set(t.x, t.y + trunkH + i * 1.05 * t.s, t.z), q, sc3.set(w, h, w));
          pines.setMatrixAt(kp, m);
          pines.setColorAt(kp, c.set('#355f3c').offsetHSL((r() - 0.5) * 0.02, 0, (f - 0.5) * 0.12 + (t.c - 0.1) * 0.2));
          kp++;
        }
        for (let i = 0; i < clumps; i++) canopy.setMatrixAt(k++, zero);
        return;
      }
      let canopyLeft = 1;
      if (kind === 'magnolia') c.set('#2f5c3a');
      else {
        const offset = (t.c * 997) % 1 * 28 - 14;
        const st = leafState(doy, offset);
        const species = fall[Math.floor(((t.c * 7.3) % 1) * fall.length)];
        const green = summer[Math.floor(((t.c * 3.1) % 1) * summer.length)];
        if (st.stage === 'summer') c.set(green);
        else if (st.stage === 'spring') c.set(spring).lerp(new THREE.Color(green), st.t);
        else if (st.stage === 'turning') c.set(green).lerp(new THREE.Color(species), Math.min(1, st.t * 1.3));
        else if (st.stage === 'dropping') c.set(species).lerp(brown, st.t * 0.6);
        canopyLeft = st.canopy;
      }
      // A rounded crown of clumps: top clumps catch the sun, lower ones sit in shade.
      const R = 2.3 * t.s;
      const cx = t.x;
      const cy = t.y + trunkH + R * 0.85;
      const cz = t.z;
      const showing = Math.round(clumps * canopyLeft);
      for (let i = 0; i < clumps; i++) {
        // Even-ish spread on an ellipsoid shell, plus one clump in the middle.
        const u = (i + 0.5) / clumps;
        const phi = Math.acos(1 - 1.6 * u);
        const th = i * 2.399 + t.c * 6.3;
        const rad = i === 0 ? 0 : 0.48 + r() * 0.16;
        const ox = Math.sin(phi) * Math.cos(th) * rad * R;
        const oy = (Math.cos(phi) * 0.75 - 0.05) * rad * R;
        const oz = Math.sin(phi) * Math.sin(th) * rad * R;
        if (i >= showing) {
          canopy.setMatrixAt(k++, zero);
          continue;
        }
        const size = R * (i === 0 ? 0.7 : 0.5 + r() * 0.14);
        q.setFromEuler(new THREE.Euler(r() * 6.3, r() * 6.3, r() * 6.3));
        m.compose(v.set(cx + ox, cy + oy - (1 - canopyLeft) * R * 0.3, cz + oz), q, sc3.set(size, size * 0.85, size));
        canopy.setMatrixAt(k, m);
        const height = oy / R; // −0.5 (underside) … +0.75 (top)
        tint.copy(c).offsetHSL((r() - 0.5) * 0.03, (r() - 0.5) * 0.08, height * 0.09 + (r() - 0.5) * 0.06);
        canopy.setColorAt(k, tint);
        k++;
      }
    });
    pines.count = kp;
    for (const im of [canopy, pines]) {
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
  }

  /** Street lights: posts with glowing heads and soft pools of light on the pavement at night.
   * `mapped` restricts street lamps to chosen roads and adds lower lamps along mapped lit
   * paths and at mapped lamp nodes. */
  buildLights(board?: THREE.Mesh, groundAt?: (x: number, z: number) => number | null,
    inTravelLane?: (x: number, z: number) => boolean,
    mapped?: { include: (rd: VRoad) => boolean; paths: [number, number][][]; lamps: [number, number][]; lowDetail?: boolean }) {
    const r = rng(311);
    const spots: { x: number; z: number; y: number; ang: number; h?: number; pool?: number }[] = [];
    const clear = (x: number, z: number) => this.inBounds(x, z, 3) && !inTravelLane?.(x, z) &&
      !this.blocks.at(x, z).some((ring) => pointInRing(x, z, ring));
    for (const pts of mapped?.paths ?? []) {
      // Pedestrian-scale lamps every 24 m beside each mapped lit path.
      const line = new Line(pts);
      for (let s = 4 + r() * 8; s < line.length; s += 24) {
        const p = line.at(s), x = p.x + p.nx * 1.4, z = p.z + p.nz * 1.4;
        const y = clear(x, z) ? (groundAt ? groundAt(x, z) : this.ground(x, z)) : null;
        if (y !== null) spots.push({ x, z, y, ang: Math.atan2(-p.nx, -p.nz), h: 4, pool: 9 });
      }
    }
    for (const [x, z] of mapped?.lamps ?? []) {
      const y = clear(x, z) ? (groundAt ? groundAt(x, z) : this.ground(x, z)) : null;
      if (y !== null) spots.push({ x, z, y, ang: 0, h: 6, pool: 14 });
    }
    for (const rd of this.data.roads) {
      if (!DRIVABLE.has(rd.cls) || rd.cls === 'service' || (mapped && !mapped.include(rd))) continue;
      // The Connector has tall lights every ~50 m along both shoulders; streets every 28 m, alternating sides.
      const hwy = rd.cls === 'motorway' && rd.sub !== 'link';
      if (rd.cls === 'motorway' && !hwy) continue;
      const line = new Line(rd.pts);
      const w = (WIDTH[rd.cls] ?? 7) / 2 + 1.2;
      let side = 1;
      for (let s = 8 + r() * 10; s < line.length; s += hwy ? 50 : 28) {
        const p = line.at(s);
        const x = p.x + p.nx * w * side;
        const z = p.z + p.nz * w * side;
        side = -side;
        if (!this.inBounds(x, z, 3) || inTravelLane?.(x, z)) continue;
        if (this.blocks.at(x, z).some((ring) => pointInRing(x, z, ring))) continue;
        const y = groundAt ? groundAt(x, z) : rd.bridge ? Math.max(0, this.ground(x, z)) : this.ground(x, z);
        if (y === null) continue;
        spots.push({ x, z, y, ang: Math.atan2(-p.nx * side, -p.nz * side) });
      }
    }
    const m = new THREE.Matrix4();
    // Thin posts barely read at the low tier: four open sides instead of five with caps.
    const sides = mapped?.lowDetail ? 4 : 5;
    const post = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.16, 7, sides, 1, !!mapped?.lowDetail).translate(0, 3.5, 0), new THREE.MeshLambertMaterial({ color: '#4a4f55' }), spots.length);
    this.lampHeads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.25, 1.4), new THREE.MeshBasicMaterial({ color: '#8a8f94' }), spots.length);
    const scale = new THREE.Matrix4();
    spots.forEach((sp, i) => {
      const h = sp.h ?? 7;
      m.makeTranslation(sp.x, sp.y, sp.z).multiply(scale.makeScale(1, h / 7, 1));
      post.setMatrixAt(i, m);
      m.makeRotationY(sp.ang).setPosition(sp.x, sp.y + h, sp.z);
      if (h < 7) m.multiply(scale.makeScale(h / 7, 1, h / 7));
      this.lampHeads!.setMatrixAt(i, m);
    });
    post.castShadow = true;
    this.group.add(post, this.lampHeads);
    this.bakeLightMap(spots, board);
  }

  /**
   * Night light on the ground: warm pools from every street lamp (and a glow under lit
   * storefronts) painted into a texture over the board, added to the ground, street and
   * lot materials in proportion to the night factor.
   */
  private bakeLightMap(spots: { x: number; z: number; pool?: number }[], board?: THREE.Mesh) {
    const b = this.b;
    const PX = Math.max(1, Math.max(b.maxX - b.minX, b.maxZ - b.minZ) / this.opts.lightMapMax); // metres per texel
    const c = document.createElement('canvas');
    c.width = Math.ceil((b.maxX - b.minX) / PX);
    c.height = Math.ceil((b.maxZ - b.minZ) / PX);
    const g = c.getContext('2d')!;
    g.fillStyle = '#000';
    g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'lighter';
    const pool = (x: number, z: number, r: number, rgb: string, a: number) => {
      const px = (x - b.minX) / PX;
      const pz = (z - b.minZ) / PX;
      const grad = g.createRadialGradient(px, pz, 0, px, pz, r / PX);
      if (!grad) return; // headless canvas stubs in tests
      grad.addColorStop(0, `rgba(${rgb},${a})`);
      grad.addColorStop(0.35, `rgba(${rgb},${a * 0.55})`);
      grad.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = grad;
      g.fillRect(px - r / PX, pz - r / PX, (2 * r) / PX, (2 * r) / PX);
    };
    for (const sp of spots) pool(sp.x, sp.z, sp.pool ?? 17, '255,196,128', sp.pool ? 0.6 : 0.85); // ~3000 K LED/sodium mix
    // Shopfront spill along building edges at street level.
    for (const bd of this.data.buildings) {
      const ring = bd.rings[0];
      for (let i = 0; i < ring.length; i += 2) pool(ring[i][0], ring[i][1], 6, '255,214,160', 0.18);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.lightMap = tex;
    const uniforms = {
      uLightMap: { value: tex },
      uLmBounds: { value: new THREE.Vector4(b.minX, b.minZ, b.maxX - b.minX, b.maxZ - b.minZ) },
      uNight: this.night,
    };
    const lightSurface = (o: THREE.Object3D) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.userData.lit && mesh !== board) return;
      const mat = mesh.material as THREE.MeshLambertMaterial;
      const compile = mat.onBeforeCompile.bind(mat);
      const key = mat.customProgramCacheKey();
      mat.onBeforeCompile = (sh, renderer) => {
        compile(sh, renderer);
        Object.assign(sh.uniforms, uniforms);
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vLmPos;')
          .replace('#include <project_vertex>', '#include <project_vertex>\nvLmPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform sampler2D uLightMap;\nuniform vec4 uLmBounds;\nuniform float uNight;\nvarying vec3 vLmPos;')
          .replace(
            '#include <opaque_fragment>',
            `vec2 lmUv = (vLmPos.xz - uLmBounds.xy) / uLmBounds.zw;
            vec3 lm = texture2D(uLightMap, vec2(lmUv.x, 1.0 - lmUv.y)).rgb;
            outgoingLight += diffuseColor.rgb * lm * uNight * 2.2;
            #include <opaque_fragment>`,
          );
      };
      mat.customProgramCacheKey = () => key + ':lightmapped';
      mat.needsUpdate = true;
    };
    this.group.traverse(lightSurface);
    if (board) lightSurface(board);
  }
  private lightMap?: THREE.Texture;
  private lampHeads?: THREE.InstancedMesh;

  dispose() {
    const materials = new Set<THREE.Material>();
    this.group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      if (mesh instanceof THREE.InstancedMesh) mesh.dispose();
      for (const mat of Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []) materials.add(mat);
    });
    for (const mat of materials) mat.dispose();
    this.lightMap?.dispose();
  }

  private wetMats?: THREE.MeshLambertMaterial[];
  private wet = -1;
  /** Rain darkens every surface a little (wet asphalt, roofs and grass). */
  setWet(w: number) {
    if (Math.abs(w - this.wet) < 0.01) return;
    this.wet = w;
    if (!this.wetMats) {
      this.wetMats = [];
      this.group.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshLambertMaterial | undefined;
        if (m && m instanceof THREE.MeshLambertMaterial && m.vertexColors) this.wetMats!.push(m);
      });
    }
    for (const m of this.wetMats) m.color.setScalar(1 - 0.3 * w);
  }

  /** Called each frame with the night factor (0 day … 1 night). */
  setNight(n: number) {
    this.night.value = n;
    if (this.lampHeads) (this.lampHeads.material as THREE.MeshBasicMaterial).color.set('#8a8f94').lerp(new THREE.Color('#ffe2a8'), n);
  }

  private addTree(x: number, z: number, r: () => number, scale: number, y = this.ground(x, z)) {
    this.trees.push({ x, y, z, s: (1.1 + r() * 0.9) * scale, c: r() });
  }
}

export const PORTAL_E = -5.5;
/** Flat board: track below this is in an open cut, so the board leaves a slot over it. */
export const CUT_E = -0.4;
/** Half-width of that slot: the cut's retaining walls (buildMarta) stand at ±5.2 m. */
export const CUT_HALF = 5.2;
const CUT_CELL = 10;
const cutKey = (i: number, j: number) => (i + 4096) * 8192 + (j + 4096);
const PINE_TIERS = 4; // track elevation where the cut is covered over (train roof ≈ 4 m)

/** Clip a ring to the board rectangle (Sutherland–Hodgman). */
export function clipRing(ring: P2[], b: { minX: number; maxX: number; minZ: number; maxZ: number }): P2[] {
  let pts = ring;
  const edges: [(p: P2) => boolean, (a: P2, c: P2) => P2][] = [
    [(p) => p[0] >= b.minX, (a, c) => lerpAt(a, c, (b.minX - a[0]) / (c[0] - a[0]))],
    [(p) => p[0] <= b.maxX, (a, c) => lerpAt(a, c, (b.maxX - a[0]) / (c[0] - a[0]))],
    [(p) => p[1] >= b.minZ, (a, c) => lerpAt(a, c, (b.minZ - a[1]) / (c[1] - a[1]))],
    [(p) => p[1] <= b.maxZ, (a, c) => lerpAt(a, c, (b.maxZ - a[1]) / (c[1] - a[1]))],
  ];
  for (const [inside, cut] of edges) {
    const out: P2[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const c = pts[(i + 1) % pts.length];
      const ia = inside(a);
      const ic = inside(c);
      if (ia) out.push(a);
      if (ia !== ic) out.push(cut(a, c));
    }
    pts = out;
    if (pts.length < 3) return [];
  }
  return pts;
}
function lerpAt(a: P2, c: P2, t: number): P2 {
  return [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t];
}

function smooth(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function pick<T>(r: () => number, xs: T[]) {
  return xs[Math.floor(r() * xs.length)];
}

function ringArea(ring: P2[]) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  return Math.abs(a / 2);
}

function edgeDist(x: number, z: number, ring: P2[]) {
  let d = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) d = Math.min(d, segDist(x, z, ring[j], ring[i]));
  return d;
}

function dashes(b: Builder, line: Line, y: (s: number, x: number, z: number) => number, color: string, on: number, period: number) {
  for (let s = 0; s + on < line.length; s += period) b.ribbon(line, 0.16, y, color, on, s, s + on);
}

function instanced(geo: THREE.BufferGeometry, color: string, mats: THREE.Matrix4[]) {
  const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color }), Math.max(1, mats.length));
  mats.forEach((m, i) => im.setMatrixAt(i, m));
  im.count = mats.length;
  im.castShadow = im.receiveShadow = true;
  return im;
}

/**
 * Facades: punched windows on brick, ribbon windows on stone, curtain wall on towers,
 * storefront glass at street level. Computed per fragment from world position.
 */
function patchFacades(mat: THREE.Material, night: { value: number }) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = night;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aStyle;\nattribute float aBase;\nvarying float vStyle;\nvarying float vBase;\nvarying vec3 vWPos;\nvarying vec3 vWN;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvStyle = aStyle; vBase = aBase;\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uNight;\nvarying float vStyle;\nvarying float vBase;\nvarying vec3 vWPos;\nvarying vec3 vWN;\nfloat hh(vec2 p){vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z);}')
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        float litWin = vStyle < -1.5 ? 1.0 : 0.0;
        float litLevel = 0.46;
        if (vStyle > -0.5) {
          // The wall's real (per-face) normal: exact, unlike screen-space derivatives, which are
          // noisy at city-scale coordinates and made windows speckle and shimmer.
          vec3 fN = normalize(vWN);
          vec3 tng = normalize(vec3(-fN.z, 0.0, fN.x) + vec3(1e-5, 0.0, 0.0));
          float u = dot(vWPos, tng);
          float y = vWPos.y - vBase;
          vec3 glass = vec3(0.24, 0.30, 0.38);
          vec3 frame = diffuseColor.rgb * 0.82;
          float st = floor(vStyle + 0.5);
          float win = 0.0;
          if (y < 4.2 && y > 0.4) {
            // Storefront: tall panes with mullions, a band above.
            float f = fract(u / 3.2);
            win = step(0.08, f) * step(f, 0.92) * step(0.5, y) * step(y, 3.4);
          } else if (st < 0.5) {
            vec2 c = vec2(u / 2.6, (y - 4.2) / 3.4);
            vec2 f = fract(c);
            win = step(0.3, f.x) * step(f.x, 0.72) * step(0.22, f.y) * step(f.y, 0.78);
            if (f.y < 0.2 && f.y > 0.12) diffuseColor.rgb *= 0.9; // sill line
          } else if (st < 1.5) {
            float f = fract((y - 4.2) / 3.6);
            float g = fract(u / 1.8);
            win = step(0.38, f) * step(f, 0.9) * step(0.06, g);
          } else {
            float f = fract((y - 4.2) / 3.8);
            float g = fract(u / 1.5);
            win = step(0.2, f) * (0.85 + 0.15 * step(0.08, g));
            glass = mix(vec3(0.42, 0.55, 0.66), vec3(0.62, 0.72, 0.80), clamp(y / 140.0, 0.0, 1.0));
          }
          // Where windows shrink below ~2 px, fade the pattern to its average so walls don't shimmer.
          vec2 fw = fwidth(vec2(u / 2.6, y / 3.4));
          float clarity = 1.0 - smoothstep(0.25, 0.6, max(fw.x, fw.y));
          win = mix(0.4, win, clarity);
          float tint = 0.9 + 0.2 * hh(floor(vec2(u / 2.6, y / 3.4)));
          // Night: about a third of offices and homes still lit; shopfronts mostly lit.
          float cellH = hh(floor(vec2(u / 2.6, y / 3.4)) + 17.0);
          litWin = win * (y < 4.2 ? step(0.25, cellH) : step(0.66, cellH));
          litLevel = 0.45 + 0.6 * fract(cellH * 7.13);
          diffuseColor.rgb = mix(diffuseColor.rgb, glass * tint, win);
          diffuseColor.rgb = mix(diffuseColor.rgb, frame, (1.0 - win) * step(y, 0.4));
        }`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(1.0, 0.72, 0.4) * litWin * uNight * litLevel;`,
      );
  };
}
