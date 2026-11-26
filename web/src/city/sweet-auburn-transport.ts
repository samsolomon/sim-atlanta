import * as THREE from 'three';
import decks from '../../../pipeline/prototypes/connector-footprint/sweet-auburn-decks.json';
import { GroundGrid, type GroundManifest } from '../terrain/grid';
import type { TerrainCity, TransportRun } from '../terrain/transport-data';
import { Builder, Line, type P2 } from '../vignette/geom';

const wayKey = (start: number[], end: number[]) => start.join(',') + '/' + end.join(',');
const profiles = new Map(decks.roads.map(row => [wayKey(row.start, row.end), row.spans]));

/** OSM ways split for lane and destination changes along the same viaduct.
 * The lidar bridge-deck class also covers runs between tagged bridge ways.
 * Keep the original directed centerlines for routing and draw each supported
 * interval on the same profile sampled by vehicles. */
export function auburnTransport(context: TerrainCity): TerrainCity {
  const runs: TransportRun[] = [];
  const roads = context.roads.map(road => {
    if (road.tunnel || road.pts.length < 2) return road;
    const spans = road.cls === 'motorway' && profiles.get(wayKey(road.pts[0], road.pts.at(-1)!));
    const base = { cls: road.cls, name: road.name, sub: road.sub ?? undefined };
    if (!spans) {
      if (road.bridge) runs.push({ ...base, pts: road.pts, kind: 'bridge' });
      return road;
    }
    const line = new Line(road.pts);
    // The survey stores distance to the millimetre; polygon and route endpoints
    // stay on the full-precision vertices shared with adjoining source ways.
    const station = (s: number) => Math.abs(line.length-s) < .001 ? line.length : s;
    function slice(start: number, end: number, samples?: number[][]) {
      if (end-start < .001) return;
      const stations = [...new Set([start, end, ...line.cum.filter(s => s > start && s < end),
        ...(samples ?? []).map(p => station(p[0]))])].sort((a,b) => a-b);
      const pts: P2[] = stations.map(s => {
        if (s === 0) return road.pts[0];
        if (s === line.length) return road.pts.at(-1)!;
        const p = line.at(s);
        return [p.x,p.z];
      });
      let k = 1;
      const deckNavd88M = samples && stations.map(s => {
        while (k+1 < samples.length && station(samples[k][0]) < s) k++;
        const [a,b] = [samples[k-1], samples[k]];
        return a[1] + (b[1]-a[1]) * (s-station(a[0])) / (station(b[0])-station(a[0]));
      });
      runs.push({ ...base, pts, kind: deckNavd88M || road.bridge ? 'bridge' : 'ground', deckNavd88M });
    }
    let last = 0;
    for (const span of spans) {
      const start = station(span[0][0]), end = station(span.at(-1)![0]);
      slice(last, start);
      slice(start, end, span);
      last = end;
    }
    slice(last, line.length);
    return { ...road, bridge: true };
  });
  viaductSurfaces(runs);
  // The 2019 classifier labels the freeway roof over Leonard Tate as bare earth, so
  // the board beside the street opening keeps the freeway's own height. Decks there
  // lower the drawn ground under their slab (transport.ts) so it cannot show through.
  const street = context.roads.find(r => r.name === 'Leonard Tate Street Southeast' && r.pts[0]?.[0] === 1095.9 && r.pts[0]?.[1] === 134);
  if (street) for (const run of runs) {
    if (run.kind !== 'bridge' || run.cls !== 'motorway' || !run.deckNavd88M) continue;
    if (run.pts.some(([x, z]) => street.pts.some((a, k) => k > 0 && segmentDistance(x, z, street.pts[k-1], a) < 30))) run.yieldsGround = true;
  }
  return { ...context, roads, terrainTransport: { version: 1, roads: runs, rail: context.terrainTransport?.rail ?? [] } };
}



function segmentDistance(x: number, z: number, [ax, az]: readonly number[], [bx, bz]: readonly number[]) {
  const dx = bx-ax, dz = bz-az, t = Math.max(0, Math.min(1, ((x-ax)*dx+(z-az)*dz)/((dx*dx+dz*dz) || 1)));
  return Math.hypot(x-ax-t*dx, z-az-t*dz);
}

/** The Sweet Auburn viaduct is one structure carrying several mapped ways: both
 * directions, the managed lane and the ramps that share its deck. Each way's
 * lidar profile is a centreline median, so drawing every way flat across its own
 * width stepped neighbouring slabs 0.4 to 0.8 m apart where the real deck has a
 * continuous 2 to 3% crossfall. Ways that run side by side at nearly the same
 * height form one viaduct; a local weighted plane through all of its samples is
 * the surface both edges of every slab sample. Crossing flyovers differ in height
 * or heading and keep their own profile. Only the Auburn-Edgewood structure fuses:
 * elsewhere on the board a profiled span lands flush on its own ground tie. */
const VIADUCT = { minX: 1150, maxX: 1265, minZ: -250, maxZ: 40 };
const onViaduct = (run: TransportRun) => run.pts.filter(([x, z]) =>
  x >= VIADUCT.minX && x <= VIADUCT.maxX && z >= VIADUCT.minZ && z <= VIADUCT.maxZ).length * 2 >= run.pts.length;

export function viaductSurfaces(runs: TransportRun[]) {
  const decks = runs.filter(r => r.kind === 'bridge' && r.cls === 'motorway' && r.deckNavd88M && r.pts.length > 1 && onViaduct(r));
  const samples = decks.map(r => r.pts.map((p, i) => [p[0], p[1], r.deckNavd88M![i]] as const));
  // Nearest point on a run's centreline: distance, unit heading and interpolated height.
  function nearest(run: TransportRun, x: number, z: number) {
    let best = { d: Infinity, h: 0, ux: 0, uz: 0, s: 0 }, along = 0;
    for (let i = 1; i < run.pts.length; i++) {
      const [ax, az] = run.pts[i-1], [bx, bz] = run.pts[i], dx = bx-ax, dz = bz-az, l2 = dx*dx+dz*dz;
      if (!l2) continue;
      const t = Math.max(0, Math.min(1, ((x-ax)*dx+(z-az)*dz)/l2)), d = Math.hypot(x-ax-t*dx, z-az-t*dz);
      const l = Math.sqrt(l2);
      if (d < best.d) {
        const p = run.deckNavd88M!;
        best = { d, h: p[i-1]+t*(p[i]-p[i-1]), ux: dx/l, uz: dz/l, s: along+t*l };
      }
      along += l;
    }
    return best;
  }
  const parent = decks.map((_, i) => i);
  const find = (i: number): number => parent[i] === i ? i : (parent[i] = find(parent[i]));
  for (let a = 0; a < decks.length; a++) for (let b = a+1; b < decks.length; b++) {
    // Side by side or end to end on the same deck: within a carriageway and a
    // median of each other, parallel within 25 degrees, and within 1.2 m.
    let hits = 0;
    for (let i = 0; i < decks[a].pts.length; i++) {
      const [x, z, h] = samples[a][i], j = Math.min(i+1, decks[a].pts.length-1), k = Math.max(0, j-1);
      const hx = decks[a].pts[j][0]-decks[a].pts[k][0], hz = decks[a].pts[j][1]-decks[a].pts[k][1], hl = Math.hypot(hx, hz) || 1;
      const n = nearest(decks[b], x, z);
      if (n.d < 22 && Math.abs(n.h-h) < 1.2 && Math.abs((hx*n.ux+hz*n.uz)/hl) > Math.cos(25*Math.PI/180)) hits++;
    }
    if (hits >= 2 || (hits >= 1 && decks[a].pts.length <= 3)) parent[find(a)] = find(b);
  }
  const groups = new Map<number, (readonly [number, number, number])[]>();
  decks.forEach((_, i) => {
    const g = find(i);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(...samples[i]);
  });
  // An end no other profiled run shares is an abutment, where the survey tied the
  // profile to class-2 ground. Fade from the run's own profile there to the shared
  // surface 15 m in, so the deck still lands on the ground it was tied to.
  const ends = decks.flatMap(r => [r.pts[0], r.pts.at(-1)!]);
  const shared = (p: readonly number[]) => ends.filter(q => Math.hypot(q[0]-p[0], q[1]-p[1]) < .01).length > 1;
  // Free ends are abutments tied to class-2 ground. Each anchors a line across the
  // deck through the end, square to its run; one fade field over the whole viaduct
  // lands every end row flat on its tie, and joined runs agree at every point.
  // A lane that ends on another fused deck, at its end or mid-span (the managed
  // lane at Edgewood), merges on the structure and is no abutment.
  const onFusedDeck = (owner: TransportRun, [x, z]: readonly number[]) => decks.some(o => o !== owner &&
    o.pts.some((a, k) => k > 0 && segmentDistance(x, z, o.pts[k-1], a) < 1));
  const anchors = decks.flatMap(r => ([[r.pts[0], r.pts[1]], [r.pts.at(-1)!, r.pts.at(-2)!]] as const)
    .filter(([end]) => !onFusedDeck(r, end)));
  const fade = (x: number, z: number) => {
    let d = Infinity;
    for (const [end, next] of anchors) {
      const dx = next[0]-end[0], dz = next[1]-end[1], l = Math.hypot(dx, dz) || 1;
      const along = ((x-end[0])*dx + (z-end[1])*dz)/l, across = Math.abs(((z-end[1])*dx - (x-end[0])*dz)/l);
      d = Math.min(d, Math.hypot(Math.abs(along), Math.max(0, across-20)));
    }
    return Math.max(0, Math.min(1, (d-2)/13));
  };
  decks.forEach((run, i) => {
    const pool = groups.get(find(i))!;
    if (pool.length === samples[i].length) return;
    const fitted = (x: number, z: number): number | null => {
      // Weighted least squares for h = c + gx*dx + gz*dz around (x, z), with a
      // small ridge on the slopes so samples along one line give no crossfall.
      // Grouping is transitive, so a ramp below a flyover can share a group with
      // it through intermediate ways. Fit only samples on this run's own level.
      const level = nearest(run, x, z).h;
      let w0 = 0, sx = 0, sz = 0, sh = 0, sxx = 0, sxz = 0, szz = 0, sxh = 0, szh = 0;
      for (const [px, pz, ph] of pool) {
        const dx = px-x, dz = pz-z, d2 = dx*dx+dz*dz;
        if (d2 > 900 || Math.abs(ph-level) > 1.5) continue;
        const w = Math.exp(-d2/128);
        w0 += w; sx += w*dx; sz += w*dz; sh += w*ph;
        sxx += w*dx*dx; sxz += w*dx*dz; szz += w*dz*dz; sxh += w*dx*ph; szh += w*dz*ph;
      }
      if (w0 < .05) return null;
      const ridge = 2*w0;
      // Solve [[w0,sx,sz],[sx,sxx+r,sxz],[sz,sxz,szz+r]] [c,gx,gz] = [sh,sxh,szh].
      const m = [[w0, sx, sz, sh], [sx, sxx+ridge, sxz, sxh], [sz, sxz, szz+ridge, szh]];
      for (let c = 0; c < 3; c++) {
        let r = c;
        for (let k = c+1; k < 3; k++) if (Math.abs(m[k][c]) > Math.abs(m[r][c])) r = k;
        [m[c], m[r]] = [m[r], m[c]];
        if (Math.abs(m[c][c]) < 1e-9) return null;
        for (let k = 0; k < 3; k++) if (k !== c) {
          const f = m[k][c]/m[c][c];
          for (let q = c; q < 4; q++) m[k][q] -= f*m[c][q];
        }
      }
      return m[0][3]/m[0][0];
    };
    run.deckSurface = (x, z) => {
      const surface = fitted(x, z);
      if (surface === null) return surface;
      const weight = fade(x, z);
      if (weight === 1) return surface;
      const own = nearest(run, x, z);
      return own.h + weight*(surface - own.h);
    };
  });
}

/** In the Leonard Tate underpass the DEM classifies the overhead freeway as
 * bare earth. Lower the display grid along the mapped street to the grade
 * between its two exposed portal samples. The original asset stays registered
 * to the unmodified neighboring boards. */
export function auburnGround(manifest: GroundManifest, bytes: ArrayBuffer) {
  // The corrections address specific encoded grid nodes, so mixed cache
  // generations must keep the ground they actually loaded.
  if (manifest.sha256 !== decks.underpass.groundSha256) return new GroundGrid(manifest, bytes);
  const rendered = bytes.slice(0), cells = new DataView(rendered);
  for (const [index, value] of decks.underpass.nodes) cells.setInt16(2*index, value, true);
  return new GroundGrid(manifest, rendered);
}

/** The two mapped sidewalks bound Leonard Tate's walls in the 2025 street view.
 * The original DEM supplies the embankment height at the top of each panel. */
export function leonardTateWalls(city: TerrainCity, original: GroundGrid, ground: GroundGrid) {
  const builder = new Builder();
  const zero = ground.manifest.vertical.sceneZeroNavd88M;
  const sides = new Map([[1086.79,-1], [1100.13,1]]);
  for (const way of city.roads) {
    const side = sides.get(way.pts[0]?.[0]);
    if (!side || way.sub !== 'sidewalk') continue;
    const line = new Line(way.pts);
    const spans = Math.ceil(line.length / 3.6);
    let previous: number[][] | undefined;
    for (let i = 0; i <= spans; i++) {
      const p = line.at(line.length * i / spans);
      const x = p.x + 1.15*side*p.nx, z = p.z + 1.15*side*p.nz;
      const deck = original.sample(x+2*side*p.nx,z+2*side*p.nz), floor = ground.sample(x,z);
      if (deck === null || floor === null) { previous = undefined; continue; }
      const edge = [[x,floor-zero-1,z], [x,Math.max(deck-.3,floor)-zero,z]];
      if (previous) builder.quad(previous[0], previous[1], edge[1], edge[0],
        i % 3 === 0 ? '#acaaa1' : '#b8b6ab');
      previous = edge;
    }
  }
  const wall = new THREE.Mesh(builder.geometry(), new THREE.MeshLambertMaterial({
    vertexColors:true, side:THREE.DoubleSide,
  }));
  wall.name = 'Leonard Tate underpass walls';
  wall.castShadow = wall.receiveShadow = true;
  return wall;
}
