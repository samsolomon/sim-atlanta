import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { afterEach, it, vi } from 'vitest';
import { brookwoodGrid } from './brookwood';
import railRows from './fixtures/midtown-rail.json';
import { midtownFoundations } from './midtown-foundations';
import { auburnTransport } from './sweet-auburn-transport';
import { northLineTracks } from './midtown-marta-rail';
import { joins } from '../square-board/sections';
import { midtownConnectorDecks } from '../terrain/midtown-connector-decks';
import { midtownConnectorGround } from '../terrain/midtown-connector-ground';
import { createDowntownTerrain } from '../terrain/model';
import { createSurfaceTransport } from '../terrain/transport';
import type { TransportRun } from '../terrain/transport-data';
import { Line } from '../vignette/geom';
afterEach(() => vi.unstubAllGlobals());
const row = 'brookwood-station';
const read = (name: string) => readFileSync(new URL('../../../pipeline/prototypes/square-board/' + row + '/' + name, import.meta.url));
it('probe', { timeout: 120000 }, () => {
  const ctx = new Proxy({}, { get: () => () => {} });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx, width: 1, height: 1 }) });
  const manifest = JSON.parse(read('ground.json').toString());
  const grid = brookwoodGrid(manifest, midtownConnectorGround(manifest, Uint8Array.from(read('ground.i16')).buffer));
  const zero = grid.manifest.vertical.sceneZeroNavd88M;
  const context = midtownFoundations(JSON.parse(read('context.json').toString()), zero);
  context.terrainTransport = { version: 1, roads: [], rail: railRows[row] as TransportRun[] };
  const city = midtownConnectorDecks(auburnTransport(context));
  const area = createDowntownTerrain(grid, city, [], { quality: 'high', join: joins(row) });
  const t = createSurfaceTransport(city, grid, area.groundAt);
  t.group.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  const hit = (name: string, x: number, z: number) => { ray.set(new THREE.Vector3(x, 900, z), new THREE.Vector3(0, -1, 0)); const o = t.group.getObjectByName(name); return o ? ray.intersectObject(o)[0]?.point.y : undefined; };
  const tracks = northLineTracks(railRows[row] as TransportRun[], -5700);
  for (const line of tracks) {
    const out: string[] = [];
    for (let s = 0; s < line.length; s += 10) {
      const p = line.at(s);
      const tread = hit('Freight track', p.x, p.z) ?? hit('Decks and embedded rails', p.x, p.z);
      out.push(`${s}:${tread === undefined ? '-' : (tread + zero).toFixed(1)}/${((area.groundAt(p.x, p.z) ?? NaN) + zero).toFixed(1)}`);
    }
    console.log('TRACK', line.pts[0], out.join(' '));
  }
  // Road surfaces under the long bridge: every road run crossing it.
  const bridge = new Line((railRows[row] as TransportRun[]).find(r => r.name === 'MARTA North Line' && r.kind === 'bridge' && r.pts.length === 18)!.pts as [number, number][]);
  for (const road of city.terrainTransport!.roads) {
    const L = new Line(road.pts);
    for (let s = 0; s < L.length; s += 1) {
      const p = L.at(s);
      for (let u = 0; u < bridge.length; u += 1) {
        const q = bridge.at(u);
        if (Math.hypot(q.x - p.x, q.z - p.z) < 0.7) {
          const y = t.deckAt(p.x, p.z, road);
          console.log('ROAD', road.name ?? road.cls, road.kind, 'at bridge s', u, 'surface', y === null ? '-' : (y + zero).toFixed(1), 'ground', ((area.groundAt(p.x, p.z) ?? NaN) + zero).toFixed(1));
          u = 1e9; s += 15;
        }
      }
    }
  }
});
