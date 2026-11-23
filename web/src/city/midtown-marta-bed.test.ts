import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { brookwoodGrid } from './brookwood';
import railRows from './fixtures/midtown-rail.json';
import { midtownFoundations } from './midtown-foundations';
import { BRIDGE_CLEARANCE, MAX_GRADE, northLineProfile } from './midtown-marta-guideway';
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
  const area = createDowntownTerrain(grid, midtownConnectorDecks(auburnTransport(context)), [], { quality, join: joins(row) });
  try {
    const tracks = northLineTracks(rows, -5700);
    expect(tracks).toHaveLength(2);
    const profile = northLineProfile(tracks, rows, area.groundAt);
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
        if (profile.bridgeAt(line, s)) continue;
        for (let o = -2; o <= 2.01; o += 0.5) {
          const g = area.groundAt(p.x - p.dz * o, p.z + p.dx * o);
          if (g !== null) through = Math.max(through, g - h);
        }
      }
    profile.centre.forEach((c, i) => {
      if (!c.bridge) return;
      spanSamples++;
      for (let o = -c.half; o <= c.half + 0.01; o += 1) {
        const g = area.groundAt(c.x + c.nx * o, c.z + c.nz * o);
        if (g !== null) soffit = Math.min(soffit, profile.height[i] - 2.2 - g);
      }
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
    expect(spanSamples).toBeGreaterThan(100);
    expect(through).toBeLessThan(0);
    expect(soffit).toBeGreaterThan(BRIDGE_CLEARANCE - 2.2 - 0.25);
    expect(grade).toBeLessThan(MAX_GRADE + 0.005);
    expect(split).toBeLessThan(0.05);
  } finally {
    area.dispose();
  }
});
