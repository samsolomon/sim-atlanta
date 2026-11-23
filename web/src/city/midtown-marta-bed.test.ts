import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { brookwoodGrid } from './brookwood';
import railRows from './fixtures/midtown-rail.json';
import { midtownFoundations } from './midtown-foundations';
import * as THREE from 'three';
import { BRIDGE_CLEARANCE, MAX_GRADE, northLineGuideway, northLinePiers, northLineProfile } from './midtown-marta-guideway';
import { inConnectorLanes } from '../terrain/connector-paint';
import { roadWidth } from '../terrain/transport-data';
import { segDist } from '../vignette/geom';
import { northLineTracks } from './midtown-marta-rail';
import { auburnTransport } from './sweet-auburn-transport';
import { joins } from '../square-board/sections';
import { midtownConnectorDecks } from '../terrain/midtown-connector-decks';
import { midtownConnectorGround } from '../terrain/midtown-connector-ground';
import { createDowntownTerrain } from '../terrain/model';
import type { TransportRun } from '../terrain/transport-data';

afterEach(() => vi.unstubAllGlobals());
const row = 'brookwood-station';
const read = (name: string) =>
  readFileSync(new URL('../../../pipeline/prototypes/square-board/' + row + '/' + name, import.meta.url));

// The North Line guideway owns one designed profile from the portal to the north
// edge. Check it against the rendered terrain the way City mounts the row.
it.each(['low', 'high'] as const)('keeps the North Line guideway on its terrain and over its roads on %s', { timeout: 60000 }, (quality) => {
  const ctx = new Proxy({}, { get: () => () => {} });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx, width: 1, height: 1 }) });
  const manifest = JSON.parse(read('ground.json').toString());
  const grid = brookwoodGrid(manifest, midtownConnectorGround(manifest, Uint8Array.from(read('ground.i16')).buffer));
  const context = midtownFoundations(JSON.parse(read('context.json').toString()), grid.manifest.vertical.sceneZeroNavd88M);
  const rows = railRows[row] as TransportRun[];
  context.terrainTransport = { version: 1, roads: [], rail: rows };
  const city = midtownConnectorDecks(auburnTransport(context));
  const area = createDowntownTerrain(grid, city, [], { quality, join: joins(row) });
  try {
    const tracks = northLineTracks(rows, -5700);
    expect(tracks).toHaveLength(2);
    const profile = northLineProfile(tracks, rows, area.groundAt, city.roads);
    let through = -Infinity,
      soffit = Infinity,
      grade = 0,
      split = 0,
      spanSamples = 0;
    for (const line of tracks)
      for (let s = 0; s + 1 <= line.length; s += 1) {
        const p = line.at(s),
          h = profile.at(line, s);
        const gr = Math.abs(profile.at(line, s + 1) - h);
        grade = Math.max(grade, gr);
        // The first 6 m lie inside the portal hood, over the smeared hillside.
        if (profile.bridgeAt(line, s) || s < 6) continue;
        // Rail to rail plus 0.3 m; cut slopes may rise beside the ballast shoulder.
        for (let o = -1; o <= 1.01; o += 0.25) {
          const g = area.groundAt(p.x - p.dz * o, p.z + p.dx * o);
          if (g !== null) through = Math.max(through, g - h);
        }
      }
    profile.centre.forEach((c, i) => {
      if (c.clear === null) return;
      spanSamples++;
      soffit = Math.min(soffit, profile.height[i] - 2.2 - c.clear);
    });
    // Both tracks read one height across the shared deck.
    const [a, b] = tracks;
    for (let s = 0; s < a.length; s += 5) {
      if (!profile.bridgeAt(a, s)) continue;
      const p = a.at(s);
      let best = { d: Infinity, u: 0 };
      for (let u = 0; u < b.length; u += 0.5) {
        const q = b.at(u),
          d = Math.hypot(q.x - p.x, q.z - p.z);
        if (d < best.d) best = { d, u };
      }
      split = Math.max(split, Math.abs(profile.at(a, s) - profile.at(b, best.u)));
    }
    // How far the bed floats above the centreline ground on bare earth.
    const lifts: number[] = [];
    for (const line of tracks)
      for (let s = 0; s < line.length; s += 1) {
        if (profile.bridgeAt(line, s)) continue;
        const p = line.at(s),
          g = area.groundAt(p.x, p.z);
        if (g !== null) lifts.push(profile.at(line, s) - g);
      }
    lifts.sort((x, y) => x - y);
    const p95 = lifts[Math.floor(lifts.length * 0.95)];
    // The rendered mesh carries the same rail level as the profile trains read.
    const mesh = northLineGuideway(tracks, profile, area.groundAt);
    const ray = new THREE.Raycaster();
    let meshGap = 0;
    for (const line of tracks)
      for (let s = 10; s < line.length - 10; s += 37) {
        const p = line.at(s);
        // Between the rails, so the ray meets ballast or the plinth.
        ray.set(new THREE.Vector3(p.x - p.dz * 0.35, 900, p.z + p.dx * 0.35), new THREE.Vector3(0, -1, 0));
        const top = ray.intersectObject(mesh)[0]?.point.y;
        if (top !== undefined) meshGap = Math.max(meshGap, Math.abs(top - profile.at(line, s)));
      }
    const mouth = Math.max(...tracks.map((l) => profile.at(l, 0) - (area.groundAt(l.at(0).x, l.at(0).z) ?? -Infinity)));
    // Piers stand clear of every rendered lane and mapped road at its drawn width.
    const piers = northLinePiers(profile, city.roads, (x, z) => inConnectorLanes(x, z, 1));
    const onA = piers.filter((i) => profile.centre[i].z > -5410);
    expect(onA.length).toBeGreaterThanOrEqual(3);
    for (const i of piers) {
      const c = profile.centre[i];
      expect(inConnectorLanes(c.x, c.z, 1.2)).toBe(false);
      for (const road of city.roads)
        for (let k = 1; k < road.pts.length; k++)
          expect(segDist(c.x, c.z, road.pts[k - 1], road.pts[k])).toBeGreaterThan(roadWidth(road) / 2 + 1.2);
    }
    expect(spanSamples).toBeGreaterThan(30);
    expect(through).toBeLessThan(0);
    expect(soffit).toBeGreaterThan(BRIDGE_CLEARANCE - 2.2 - 0.25);
    expect(grade).toBeLessThan(MAX_GRADE + 0.005);
    expect(split).toBeLessThan(0.05);
    // Bare-earth bed stays near its ground; the approach embankments to the spans lift the 95th percentile.
    expect(p95).toBeLessThan(2.5);
    expect(meshGap).toBeLessThan(0.05);
    expect(mouth).toBeLessThan(0.5);
  } finally {
    area.dispose();
  }
});
