import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { brookwoodGrid } from './brookwood';
import railRows from './fixtures/midtown-rail.json';
import { midtownFoundations } from './midtown-foundations';
import { auburnTransport } from './sweet-auburn-transport';
import { joins } from '../square-board/sections';
import { midtownConnectorDecks } from '../terrain/midtown-connector-decks';
import { midtownConnectorGround } from '../terrain/midtown-connector-ground';
import { createDowntownTerrain } from '../terrain/model';
import { createSurfaceTransport } from '../terrain/transport';
import type { TransportRun } from '../terrain/transport-data';
import { Line } from '../vignette/geom';

afterEach(() => vi.unstubAllGlobals());
const read = (row: string, name: string) =>
  readFileSync(new URL('../../../pipeline/prototypes/square-board/' + row + '/' + name, import.meta.url));

// The North Line rides a 3DEP crest narrower than its tread near Brookwood. Sample the
// rendered guideway across its full width every metre and require it to stay on top
// of the rendered terrain, without floating far above the centreline.
// Only brookwood-station carries open North Line ground runs; brookwood-south has the tunnel.
for (const row of ['brookwood-station'] as const)
  it.each(['low', 'high'] as const)(`keeps the North Line bed above terrain in ${row} on %s`, { timeout: 60000 }, (quality) => {
    const ctx = new Proxy({}, { get: () => () => {} });
    vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx, width: 1, height: 1 }) });
    const manifest = JSON.parse(read(row, 'ground.json').toString());
    const grid = brookwoodGrid(manifest, midtownConnectorGround(manifest, Uint8Array.from(read(row, 'ground.i16')).buffer));
    const context = midtownFoundations(JSON.parse(read(row, 'context.json').toString()), grid.manifest.vertical.sceneZeroNavd88M);
    context.terrainTransport = { version: 1, roads: [], rail: railRows[row] as TransportRun[] };
    const city = midtownConnectorDecks(auburnTransport(context));
    const area = createDowntownTerrain(grid, city, [], { quality, join: joins(row) });
    const transport = createSurfaceTransport(city, grid, area.groundAt);
    try {
      transport.group.updateMatrixWorld(true);
      const tread = transport.group.getObjectByName('Freight track')!;
      const ray = new THREE.Raycaster();
      let samples = 0,
        worst = -Infinity;
      const lifts: number[] = [];
      const runs = city.terrainTransport!.rail.filter((r) => r.name === 'MARTA North Line' && r.kind === 'ground');
      for (const run of runs) {
        const line = new Line(run.pts);
        for (let s = 0.5; s < line.length; s += 1) {
          const p = line.at(s);
          for (let off = -2; off <= 2.01; off += 0.5) {
            const x = p.x - p.dz * off,
              z = p.z + p.dx * off;
            ray.set(new THREE.Vector3(x, 500, z), new THREE.Vector3(0, -1, 0));
            const top = ray.intersectObject(tread)[0]?.point.y,
              ground = area.groundAt(x, z);
            if (top === undefined || ground === null) continue;
            samples++;
            worst = Math.max(worst, ground - top);
            if (off === 0) lifts.push(top - ground);
          }
        }
      }
      expect(runs.length, row).toBeGreaterThan(0);
      expect(samples, row).toBeGreaterThan(300);
      expect(worst, row).toBeLessThan(0);
      lifts.sort((a, b) => a - b);
      expect(lifts[Math.floor(lifts.length * 0.95)], row).toBeLessThan(1);
    } finally {
      transport.dispose();
      area.dispose();
    }
  });
