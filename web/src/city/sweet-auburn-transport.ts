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
  return { ...context, roads, terrainTransport: { version: 1, roads: runs, rail: [] } };
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
