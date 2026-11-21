/**
 * The vignette's static world, built in the browser from vignette.json:
 * a diorama board (heightfield top, clay strata on the cut edges, walnut plinth), streets,
 * sidewalks, the MARTA line (tunnel portal, open cut, viaduct), freight tracks,
 * detailed buildings and trees.
 */
import * as THREE from 'three';
import { Builder, hashStr, Line, pointInRing, rng, segDist, type P2 } from './geom';
import { leafState } from './time';

export interface VBuilding {
  id: string;
  h: number | null;
  floors: number | null;
  rings: P2[][];
}
export interface VRoad {
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

/** The MARTA alignment through the vignette: centreline + elevation (m) by distance. */
export interface Alignment {
  line: Line;
  elev: (s: number) => number;
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
  private gridStep = 2.5;
  private nx: number;
  private nz: number;
  private hf: Float32Array;
  readonly trees: { x: number; y: number; z: number; s: number; c: number; th?: number }[] = [];
  /** Real trees from a canopy height map: [x, z, height m, crown radius m]. */
  realTrees: [number, number, number, number][] | null = null;

  constructor(
    readonly data: VData,
    readonly marta: Alignment,
  ) {
    this.b = data.bounds;
    this.nx = Math.round((this.b.maxX - this.b.minX) / this.gridStep) + 1;
    this.nz = Math.round((this.b.maxZ - this.b.minZ) / this.gridStep) + 1;
    this.hf = new Float32Array(this.nx * this.nz);
    this.computeHeights();
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
    const m = this.marta;
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
    for (let j = 0; j < nz - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
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

    // Walnut plinth with a little lip.
    const pl = new THREE.Mesh(new THREE.BoxGeometry(W + 16, 6, D + 16), new THREE.MeshLambertMaterial({ color: PAL.walnut }));
    pl.position.set((b.minX + b.maxX) / 2, bottom - 3, (b.minZ + b.maxZ) / 2);
    pl.receiveShadow = true;
    this.group.add(pl);
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
    const blocks = this.data.buildings.map((bd) => bd.rings[0]);
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
      if (g.kind === 'parking') this.layoutStalls(outer, blocks, marks, st.lift);
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
    const nearStreet = (x: number, z: number, d: number) => streets.some((r) => r.pts.some((p, i) => i > 0 && segDist(x, z, r.pts[i - 1], p) < d + (WIDTH[r.cls] ?? 7) / 2));
    const clearSpot = (x: number, z: number) => this.inBounds(x, z, 2) && !blocks.some((r) => pointInRing(x, z, r) || edgeDist(x, z, r) < 1) && !nearStreet(x, z, 1.5) && this.ground(x, z) > -0.5;
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
    for (const [x, z] of this.data.points?.crossing ?? []) {
      if (!this.inBounds(x, z, 2)) continue;
      let best: { d: number; r: VRoad; a: P2; c: P2 } | null = null;
      for (const r of drivable)
        for (let i = 1; i < r.pts.length; i++) {
          const d = segDist(x, z, r.pts[i - 1], r.pts[i]);
          if (!best || d < best.d) best = { d, r, a: r.pts[i - 1], c: r.pts[i] };
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
  private layoutStalls(ring: P2[], blocks: P2[][], marks: Builder, lift: number) {
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
    const ok = (x: number, z: number) => pointInRing(x, z, ring) && edgeDist(x, z, ring) > 1.2 && !blocks.some((r) => pointInRing(x, z, r)) && this.inBounds(x, z, 1);
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

  /** Both MARTA tracks: ballast, ties, rails, third rail, open-cut walls, portal and viaduct. */
  buildMarta() {
    const m = this.marta;
    const b = new Builder();
    const inB = (s: number) => {
      const p = m.line.at(s);
      return this.inBounds(p.x, p.z, -2);
    };
    let s0 = 0;
    while (s0 < m.line.length && !inB(s0)) s0 += 2;
    let s1 = m.line.length;
    while (s1 > s0 && !inB(s1)) s1 -= 2;
    // Visible from where the trackbed is shallow enough to be open.
    let sv = s0;
    while (sv < s1 && m.elev(sv) < PORTAL_E) sv += 1;
    const ey = (s: number) => m.elev(s);
    const deckTop = (s: number) => ey(s) + 0.05;
    const tieM = new THREE.Matrix4();
    const ties: THREE.Matrix4[] = [];
    for (const off of [-2.1, 2.1]) {
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
    // Open cut retaining walls, and the portal headwall where the cut becomes a tunnel.
    let portalDone = false;
    for (let s = sv; s < s1; s += 2) {
      const e = ey(s);
      if (e < -0.4) {
        for (const d of [-5.2, 5.2]) b.wall(m.line, d, () => e - 0.2, () => 0.6, PAL.concrete, 2, s, Math.min(s + 2, s1));
        if (!portalDone) {
          const p = m.line.at(s);
          const rot = new THREE.Matrix4().makeRotationY(Math.atan2(p.dx, p.dz)).setPosition(p.x, 0, p.z);
          b.box(12, -e + 1.2, 1.2, 0, (e + 1.2) / 2 + 0.1, -0.6, PAL.concrete, rot);
          b.box(12.6, 0.5, 1.6, 0, 1.0, -0.6, PAL.concreteDark, rot);
          b.box(9.6, -e - 0.5, 0.2, 0, e + (-e - 0.5) / 2, 0.05, '#1c1d22', rot); // dark mouth
          portalDone = true;
        }
      }
    }
    // Viaduct: box-girder deck, parapets and piers wherever the track is well above ground.
    for (let s = sv; s < s1; s += 2) {
      const p = m.line.at(s);
      const e = ey(s);
      const g = this.ground(p.x, p.z);
      if (e - g < 2.2) continue;
      const rot = new THREE.Matrix4().makeRotationY(Math.atan2(p.dx, p.dz)).setPosition(p.x, 0, p.z);
      b.box(10.4, 1.6, 2.02, 0, e - 0.75, 0, PAL.concrete, rot);
      for (const d of [-5.05, 5.05]) b.box(0.3, 1.1, 2.02, d, e + 0.55, 0, PAL.concreteDark, rot);
      if (Math.round(s) % 26 === 0 || Math.round(s) % 26 === 1) {
        const hgt = e - 1.55 - g;
        b.box(2.2, hgt, 2.6, 0, g + hgt / 2, 0, PAL.concrete, rot);
        b.box(8, 1.0, 2.8, 0, e - 2.0, 0, PAL.concreteDark, rot); // pier cap
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
          // Through-girder bridge over the highway.
          const rot = new THREE.Matrix4().makeRotationY(Math.atan2(p.dx, p.dz)).setPosition(p.x, 0, p.z);
          for (const d of [-2.6, 2.6]) b.box(0.35, 2.2, 2.45, d, 0.9, 0, PAL.girder, rot);
          b.box(5.6, 0.6, 2.45, 0, -0.1, 0, PAL.girder, rot);
        }
      }
    }
    const mesh = new THREE.Mesh(b.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    mesh.castShadow = mesh.receiveShadow = true;
    this.group.add(mesh, instanced(new THREE.BoxGeometry(2.6, 0.16, 0.24), PAL.tie, ties));
  }

  // ---- buildings ----------------------------------------------------------------------

  buildBuildings() {
    const b = new Builder();
    const style: number[] = [];
    const base: number[] = [];
    const clutter: THREE.Matrix4[] = [];
    const clutterCol: THREE.Color[] = [];
    const m4 = new THREE.Matrix4();
    for (const bd of this.data.buildings) {
      const outer = bd.rings[0];
      if (!outer || outer.length < 3) continue;
      const h = bd.h ?? (bd.floors ? bd.floors * 3.6 : 8);
      const r = rng(hashStr(bd.id));
      // Massing class decides the material: brick low-rise, stone/concrete mid-rise, glass towers.
      // Mid-rises mix brick, stone with punched windows, and ribbon-window offices.
      const kind = h < 16 ? 0 : h < 42 ? (r() < 0.45 ? 0 : 1) : 2;
      const tall = h >= 16;
      const wallCol = pick(r, kind === 0 && tall ? ['#c9b49a', '#b98a6a', '#d8c9b0', '#a9583f', '#e0d6c4'] : kind === 0 ? ['#a9583f', '#b86a4b', '#9a4c39', '#c98f6b', '#d7c3a2'] : kind === 1 ? ['#d9cdb5', '#cfc5b4', '#c1b6a3', '#e1d8c6', '#b9b0a3'] : ['#8fa4b6', '#9fb0bd', '#7f93a4', '#a8b8c2']);
      let gmin = Infinity;
      for (const p of outer) gmin = Math.min(gmin, this.ground(p[0], p[1]));
      const y0 = Math.min(0, gmin) - 0.5;
      const before = b.pos.length / 3;
      // Walls (run to h + parapet), roof slightly below the parapet top.
      const parapet = h > 6 ? 1.1 : 0;
      for (const ring of bd.rings)
        for (let i = 0; i < ring.length; i++) {
          const a = ring[i];
          const c = ring[(i + 1) % ring.length];
          b.quad([a[0], y0, a[1]], [c[0], y0, c[1]], [c[0], h + parapet, c[1]], [a[0], h + parapet, a[1]], wallCol);
        }
      const wallVerts = b.pos.length / 3 - before;
      const contour = outer.map((p) => new THREE.Vector2(p[0], p[1]));
      const holes = bd.rings.slice(1).map((ring) => ring.map((p) => new THREE.Vector2(p[0], p[1])));
      const tris = THREE.ShapeUtils.triangulateShape(contour, holes);
      const all = [...contour, ...holes.flat()];
      // Roofs: white membrane, gravel, tar and the odd green roof.
      const roofCol = pick(r, kind === 2 ? ['#9aa3a8', '#b7bcbf'] : ['#e9e7e1', '#d8d4cb', '#bdb8ad', '#9d9a94', '#c9c2b2', '#e9e7e1', '#8fa66b']);
      for (const t of tris) b.tri([all[t[0]].x, h, all[t[0]].y], [all[t[1]].x, h, all[t[1]].y], [all[t[2]].x, h, all[t[2]].y], roofCol);
      const roofVerts = b.pos.length / 3 - before - wallVerts;
      for (let i = 0; i < wallVerts; i++) {
        style.push(kind);
        base.push(y0 < -1 ? y0 + 0.5 : 0);
      }
      for (let i = 0; i < roofVerts; i++) {
        style.push(-1);
        base.push(0);
      }
      // Rooftop clutter: HVAC units, vents and a stair/elevator penthouse on bigger roofs.
      const area = ringArea(outer);
      const xs = outer.map((p) => p[0]);
      const zs = outer.map((p) => p[1]);
      const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
      const n = Math.min(8, Math.floor(area / 220));
      let placed = 0;
      for (let k = 0; k < n * 6 && placed < n; k++) {
        const x = x0 + r() * (x1 - x0);
        const z = z0 + r() * (z1 - z0);
        if (!pointInRing(x, z, outer) || edgeDist(x, z, outer) < 3) continue;
        const big = placed === 0 && h > 20 && area > 600;
        const [w, hh, l] = big ? [6 + r() * 3, 3.5, 5 + r() * 3] : [1.6 + r() * 2.4, 1 + r() * 0.8, 1.6 + r() * 3];
        m4.makeRotationY(Math.atan2(outer[1][1] - outer[0][1], outer[1][0] - outer[0][0]));
        m4.scale(new THREE.Vector3(w, hh, l)).setPosition(x, h + hh / 2, z);
        clutter.push(m4.clone());
        clutterCol.push(new THREE.Color(big ? wallCol : r() < 0.7 ? PAL.hvac : '#8f9498'));
        placed++;
      }
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

  buildTrees() {
    const r = rng(20261120);
    const blocks = this.data.buildings.map((bd) => bd.rings[0]);
    const drivable = this.data.roads.filter((x) => DRIVABLE.has(x.cls) || x.cls === 'pedestrian' || x.cls === 'footway');
    const rails = this.data.rail.map((x) => x.pts);
    const clearOf = (x: number, z: number) => {
      if (!this.inBounds(x, z, 3)) return false;
      if (this.ground(x, z) < -0.6) return false;
      for (const ring of blocks) if (pointInRing(x, z, ring) || edgeDist(x, z, ring) < 2.5) return false;
      for (const rd of drivable) {
        const w = (WIDTH[rd.cls] ?? 4) / 2 + (rd.cls === 'footway' ? 0.8 : 1.5);
        for (let i = 1; i < rd.pts.length; i++) if (segDist(x, z, rd.pts[i - 1], rd.pts[i]) < w) return false;
      }
      for (const pts of rails) for (let i = 1; i < pts.length; i++) if (segDist(x, z, pts[i - 1], pts[i]) < 7) return false;
      for (let s = 0; s < this.marta.line.length; s += 6) {
        const p = this.marta.line.at(s);
        if (Math.hypot(p.x - x, p.z - z) < 9) return false;
      }
      return true;
    };
    if (this.realTrees) {
      // Trees where Atlanta's trees really are, sized from the canopy height map.
      for (const [x, z, h, cr] of this.realTrees) {
        if (!this.inBounds(x, z, 1)) continue;
        if (blocks.some((ring) => pointInRing(x, z, ring))) continue;
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
    this.canopy = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), leafMat, n * 2);
    // Pines: two stacked five-sided cones.
    const pine = new THREE.ConeGeometry(1, 1.6, 6);
    pine.translate(0, 0.8, 0);
    this.pines = new THREE.InstancedMesh(pine, leafMat, n * 2);
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
    this.trees.forEach((t) => {
      const trunkH = t.th ?? 2 + t.s * 0.6;
      const kind = t.c < 0.18 ? 'pine' : t.c < 0.26 ? 'magnolia' : 'deciduous';
      if (kind === 'pine') {
        // Loblolly: tall bare trunk, tufted crown.
        for (const [dy, sc] of [
          [trunkH + t.s * 0.6, 1.25],
          [trunkH + t.s * 1.7, 0.9],
        ]) {
          m.compose(new THREE.Vector3(t.x, t.y + dy, t.z), q.identity(), new THREE.Vector3(1.6 * t.s * sc, 1.9 * t.s * sc, 1.6 * t.s * sc));
          pines.setMatrixAt(kp, m);
          pines.setColorAt(kp, c.set('#3f6b45').offsetHSL(0, 0, (t.c - 0.1) * 0.3));
          kp++;
        }
        canopy.setMatrixAt(k++, zero);
        canopy.setMatrixAt(k++, zero);
        return;
      }
      let scale = 1;
      if (kind === 'magnolia') c.set('#3d6a44');
      else {
        const offset = (t.c * 997) % 1 * 28 - 14;
        const st = leafState(doy, offset);
        const species = fall[Math.floor(((t.c * 7.3) % 1) * fall.length)];
        const green = summer[Math.floor(((t.c * 3.1) % 1) * summer.length)];
        if (st.stage === 'summer') c.set(green);
        else if (st.stage === 'spring') c.set(spring).lerp(new THREE.Color(green), st.t);
        else if (st.stage === 'turning') c.set(green).lerp(new THREE.Color(species), Math.min(1, st.t * 1.3));
        else if (st.stage === 'dropping') c.set(species).lerp(brown, st.t * 0.6);
        scale = st.canopy;
      }
      for (const [dx, dy, dz, sc] of [
        [0, trunkH + t.s * 1.7, 0, 1],
        [t.s * 0.7, trunkH + t.s * 1.1, t.s * 0.4, 0.72],
      ]) {
        if (scale < 0.05) {
          canopy.setMatrixAt(k++, zero);
          continue;
        }
        q.setFromEuler(new THREE.Euler(t.c * 3, t.c * 7, 0));
        const s = (0.55 + 0.45 * scale) * sc;
        m.compose(new THREE.Vector3(t.x + dx, t.y + dy - (1 - scale) * t.s * 0.4, t.z + dz), q, new THREE.Vector3(2.4 * t.s * s, 2.1 * t.s * s, 2.4 * t.s * s));
        canopy.setMatrixAt(k, m);
        canopy.setColorAt(k, c.clone().offsetHSL(0, 0, (sc - 1) * 0.15));
        k++;
      }
    });
    pines.count = kp;
    for (const im of [canopy, pines]) {
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
  }

  /** Street lights: posts with glowing heads and soft pools of light on the pavement at night. */
  buildLights() {
    const r = rng(311);
    const spots: { x: number; z: number; y: number; ang: number }[] = [];
    for (const rd of this.data.roads) {
      if (!DRIVABLE.has(rd.cls) || rd.cls === 'service') continue;
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
        if (!this.inBounds(x, z, 3)) continue;
        if (this.data.buildings.some((bd) => pointInRing(x, z, bd.rings[0]))) continue;
        spots.push({ x, z, y: rd.bridge ? Math.max(0, this.ground(x, z)) : this.ground(x, z), ang: Math.atan2(-p.nx * side, -p.nz * side) });
      }
    }
    const m = new THREE.Matrix4();
    const post = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.16, 7, 5).translate(0, 3.5, 0), new THREE.MeshLambertMaterial({ color: '#4a4f55' }), spots.length);
    this.lampHeads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.25, 1.4), new THREE.MeshBasicMaterial({ color: '#8a8f94' }), spots.length);
    spots.forEach((sp, i) => {
      m.makeTranslation(sp.x, sp.y, sp.z);
      post.setMatrixAt(i, m);
      m.makeRotationY(sp.ang).setPosition(sp.x, sp.y + 7, sp.z);
      this.lampHeads!.setMatrixAt(i, m);
    });
    post.castShadow = true;
    this.group.add(post, this.lampHeads);
    this.bakeLightMap(spots);
  }

  /**
   * Night light on the ground: warm pools from every street lamp (and a glow under lit
   * storefronts) painted into a texture over the board, added to the ground, street and
   * lot materials in proportion to the night factor.
   */
  private bakeLightMap(spots: { x: number; z: number }[]) {
    const b = this.b;
    const PX = 1.0; // metres per texel
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
      grad.addColorStop(0, `rgba(${rgb},${a})`);
      grad.addColorStop(0.35, `rgba(${rgb},${a * 0.55})`);
      grad.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = grad;
      g.fillRect(px - r / PX, pz - r / PX, (2 * r) / PX, (2 * r) / PX);
    };
    for (const sp of spots) pool(sp.x, sp.z, 17, '255,196,128', 0.85); // ~3000 K LED/sodium mix
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
    this.group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.userData.lit) return;
      const mat = mesh.material as THREE.MeshLambertMaterial;
      mat.onBeforeCompile = (sh) => {
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
      mat.customProgramCacheKey = () => 'lightmapped';
      mat.needsUpdate = true;
    });
  }
  private lightMap?: THREE.Texture;
  private lampHeads?: THREE.InstancedMesh;

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

export const PORTAL_E = -5.5; // track elevation where the cut is covered over (train roof ≈ 4 m)

/** Clip a ring to the board rectangle (Sutherland–Hodgman). */
function clipRing(ring: P2[], b: { minX: number; maxX: number; minZ: number; maxZ: number }): P2[] {
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
      .replace('#include <common>', '#include <common>\nattribute float aStyle;\nattribute float aBase;\nvarying float vStyle;\nvarying float vBase;\nvarying vec3 vWPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvStyle = aStyle; vBase = aBase;\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uNight;\nvarying float vStyle;\nvarying float vBase;\nvarying vec3 vWPos;\nfloat hh(vec2 p){return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453);}')
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        float litWin = 0.0;
        float litLevel = 1.0;
        if (vStyle > -0.5) {
          vec3 fN = normalize(cross(dFdx(vWPos), dFdy(vWPos)));
          vec3 tng = normalize(vec3(-fN.z, 0.0, fN.x));
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
