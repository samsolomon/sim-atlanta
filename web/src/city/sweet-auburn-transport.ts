import * as THREE from 'three';
import decks from '../../../pipeline/prototypes/connector-footprint/sweet-auburn-decks.json';
import { GroundGrid, type GroundManifest } from '../terrain/grid';
import { deckWeightAt, laneGain, rampSpans } from '../terrain/ramp-decks';
import type { TerrainCity, TransportRun } from '../terrain/transport-data';
import { Builder, Line, type P2 } from '../vignette/geom';

const wayKey = (start: number[], end: number[]) => start.join(',') + '/' + end.join(',');
const roofNodes = new Set(decks.underpass.nodes.map(([index]) => index));
const profiles = new Map(decks.roads.map(row => [wayKey(row.start, row.end), row.spans]));

/** OSM ways split for lane and destination changes along the same viaduct.
 * The lidar bridge-deck class also covers runs between tagged bridge ways.
 * Keep the original directed centerlines for routing and draw each supported
 * interval on the same profile sampled by vehicles. */
export function auburnTransport(context: TerrainCity): TerrainCity {
  const runs: TransportRun[] = [];
  const roads = context.roads.map(road => {
    if (road.tunnel || road.pts.length < 2) return road;
    // Stacked ramps (ramp-decks.json) are registered on whole OSM ways, so a board
    // road clipped at a seam still finds its own measured spans.
    const surveyed = road.cls === 'motorway' && profiles.get(wayKey(road.pts[0], road.pts.at(-1)!));
    const ramp = road.cls === 'motorway' && !surveyed;
    const spans = surveyed || (ramp && rampSpans(road.pts));
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
      // Ramp tie rows (ramp-decks.json) meet the drawn terrain.
      const deckWeight = samples?.some(r => r[2]) ? stations.map(s => deckWeightAt(samples, s)) : undefined;
      const widenInto = ramp && deckNavd88M ? laneGain(pts) : undefined;
      runs.push({ ...base, pts, kind: deckNavd88M || road.bridge ? 'bridge' : 'ground', deckNavd88M,
        ...(deckWeight && { deckWeight }), ...(widenInto && { widenInto }) });
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
  // The misclassified roof: within 30 m of a board node underpass_grid edits
  // (sweet-auburn-decks.json underpass.nodes, on the 161 x 161 Sweet Auburn grid
  // from (1000, -520) at 5 m): the 15 m reach deck-survey.py uses to put these
  // decks on the freeway top plus half a slab. Only stations there may carve, and
  // only ground that would show through the tread (transport.ts).
  const overRoof = (x: number, z: number) => {
    const col = Math.round((x - 1000) / 5), row = Math.round((z + 520) / 5);
    for (let dr = -6; dr <= 6; dr++) for (let dc = -6; dc <= 6; dc++)
      if (roofNodes.has((row + dr) * 161 + col + dc) && Math.hypot(dr, dc) * 5 <= 30) return true;
    return false;
  };
  for (const run of runs) {
    if (run.kind !== 'bridge' || run.cls !== 'motorway' || !run.deckNavd88M) continue;
    if (run.pts.some(([x, z]) => overRoof(x, z))) run.yieldsGround = overRoof;
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
// A profiled way joins the fusion when it comes within 30 m of the viaduct; the
// adjacency test below then keeps only those running beside a fused deck.
const nearViaduct = (run: TransportRun) => run.pts.some(([x, z]) =>
  x >= VIADUCT.minX-30 && x <= VIADUCT.maxX+30 && z >= VIADUCT.minZ-30 && z <= VIADUCT.maxZ+30);

export function viaductSurfaces(runs: TransportRun[]) {
  const decks = runs.filter(r => r.kind === 'bridge' && r.cls === 'motorway' && r.deckNavd88M && r.pts.length > 1 && nearViaduct(r));
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
  const members = new Map<number, number[]>();
  decks.forEach((_, i) => {
    const g = find(i);
    if (!members.has(g)) members.set(g, []);
    members.get(g)!.push(i);
  });
  const fused = new Set(decks.filter((_, i) => members.get(find(i))!.length > 1));
  // An abutment is an end with no other fused deck within 12 m: the survey tied it
  // to class-2 ground. A handoff is an end where an unfused run continues on its own
  // profile. Ties at both enter the fit itself as heavily weighted samples across
  // the end row, so the one surface lands each abutment flat on its tie and every
  // member still samples the same function: no slab can step against another.
  const nearFused = (owner: TransportRun, [x, z]: readonly number[]) => [...fused].some(o => o !== owner &&
    o.pts.some((a, k) => k > 0 && segmentDistance(x, z, o.pts[k-1], a) < 12));
  const groups = new Map<number, (readonly [number, number, number, number])[]>();
  // A least-squares fit only approaches a tie; within 1.5 m of a tie row the surface
  // eases onto it exactly. The ease depends on position alone, so members agree.
  const rows: { end: readonly number[]; ux: number; uz: number; tie: number }[] = [];
  decks.forEach((run, i) => {
    const g = find(i);
    if (!groups.has(g)) groups.set(g, []);
    const pool = groups.get(g)!;
    pool.push(...samples[i].map(([x, z, h]) => [x, z, h, 1] as const));
    if (!fused.has(run)) return;
    for (const [end, next, h] of [[run.pts[0], run.pts[1], run.deckNavd88M![0]], [run.pts.at(-1)!, run.pts.at(-2)!, run.deckNavd88M!.at(-1)!]] as const) {
      // Tie an end where an unfused run continues (it keeps its own profile), and an
      // abutment with no other fused deck nearby.
      const receiver = runs.find(o => o !== run && !fused.has(o) && o.cls === 'motorway' &&
        [o.pts[0], o.pts.at(-1)!].some(q => Math.hypot(q[0]-end[0], q[1]-end[1]) < .01));
      if (!receiver && nearFused(run, end)) continue;
      // At a handoff, land on the height the receiving run draws at the shared vertex.
      const tie = receiver?.deckNavd88M
        ? (Math.hypot(receiver.pts[0][0]-end[0], receiver.pts[0][1]-end[1]) < .01 ? receiver.deckNavd88M[0] : receiver.deckNavd88M.at(-1)!)
        : h;
      const dx = next[0]-end[0], dz = next[1]-end[1], l = Math.hypot(dx, dz) || 1;
      for (let o = -12; o <= 12; o += 1.5) pool.push([end[0] - o*dz/l, end[1] + o*dx/l, tie, 400] as const);
      rows.push({ end, ux: dx/l, uz: dz/l, tie });
    }
  });
  decks.forEach((run, i) => {
    const pool = groups.get(find(i))!;
    if (!fused.has(run)) return;
    const fitted = (x: number, z: number): number | null => {
      // Weighted least squares for h = c + gx*dx + gz*dz around (x, z), with a
      // small ridge on the slopes so samples along one line give no crossfall.
      // Grouping is transitive, so a ramp below a flyover can share a group with
      // it through intermediate ways. Fit only samples on this run's own level.
      const level = nearest(run, x, z).h;
      let w0 = 0, sx = 0, sz = 0, sh = 0, sxx = 0, sxz = 0, szz = 0, sxh = 0, szh = 0;
      for (const [px, pz, ph, weight] of pool) {
        const dx = px-x, dz = pz-z, d2 = dx*dx+dz*dz;
        if (d2 > 900 || Math.abs(ph-level) > 1.5) continue;
        const w = weight*Math.exp(-d2/(weight > 1 ? 18 : 128));
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
      let value = fitted(x, z);
      if (value === null) return null;
      for (const { end, ux, uz, tie } of rows) {
        const along = (x-end[0])*ux + (z-end[1])*uz, across = Math.abs((z-end[1])*ux - (x-end[0])*uz);
        if (along < -.5 || along > 1.5 || across > 12) continue;
        value = tie + Math.max(0, Math.min(1, along/1.5))*(value - tie);
      }
      return value;
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
