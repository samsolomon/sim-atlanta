import { readFileSync, existsSync } from 'node:fs';
import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { northConnectorTransport } from '../square-board/connector-ground';
import { southConnectorTransport } from '../square-board/south-connector-decks';
import { GroundGrid } from './grid';
import { GroundSurface } from './surface';
import { bridgeApproaches } from './bridge-approaches';
import { junctionPortals, drawJunctionDecks } from './junction-decks';
import { streetPortals } from './street-bridges';
import { createSurfaceTransport } from './transport';
import { Builder, Line } from '../vignette/geom';
import type { TerrainCity } from './transport-data';

const src = new URL('../../../pipeline/prototypes/', import.meta.url);
const staged = new URL('../../public/data/scene/downtown/vignette.json', import.meta.url);
const json = (url: URL) => JSON.parse(readFileSync(url, 'utf8'));
const downtown = existsSync(staged) ? (json(staged) as TerrainCity) : null;
function board(name: string) {
  const dir = new URL(name === 'downtown' ? 'downtown-ground/' : 'square-board/' + name + '/', src);
  const grid = new GroundGrid(
    json(new URL('ground.json', dir)),
    Uint8Array.from(readFileSync(new URL('ground.i16', dir))).buffer,
  );
  const city: TerrainCity =
    name === 'downtown'
      ? downtown!
      : name === 'north-band'
        ? northConnectorTransport(json(new URL('context.json', dir)))
        : southConnectorTransport(json(new URL('context.json', dir)));
  return { grid, city };
}

for (const name of ['downtown', 'north-band', 'south-band']) {
  it.skipIf(name === 'downtown' && !downtown)(
    'joins the surveyed curb and roadway elevations to exposed land on ' + name,
    () => {
      const { grid, city } = board(name),
        zero = grid.manifest.vertical.sceneZeroNavd88M;
      const terrain = new GroundSurface(grid, 'high');
      const bare = (x: number, z: number) => terrain.sampleScene(x, z);
      const portals = [...streetPortals(city), ...junctionPortals(city)];
      const approach = bridgeApproaches(portals, zero, bare, city.bounds, city.roads);
      const transport = createSurfaceTransport(city, grid, approach.groundAt);
      transport.group.updateMatrixWorld(true);
      let checked = 0;
      try {
        for (const {
          edge: [a, b],
          curbs,
          direction: [dx, dz],
        } of portals) {
          if (bare(a[0], a[1]) === null || bare(b[0], b[1]) === null) continue;
          for (const [f, lift] of [
            [curbs[0] / 2, 0.27],
            [0.5, 0.12],
            [(1 + curbs[1]) / 2, 0.27],
          ]) {
            const x = a[0] + f * (b[0] - a[0]),
              z = a[1] + f * (b[1] - a[1]);
            const y = a[2] + f * (b[2] - a[2]) - zero + lift;
            // Probe inside the first bank triangle (the exact edge uses float vertices).
            const h = approach.groundAt(x + dx * 0.08, z + dz * 0.08)!;
            expect(Math.abs(h - y), name + ' ' + [x, z]).toBeLessThan(0.04);
            const ray = new Raycaster(
              new Vector3(x - dx * 0.08, y + 0.7, z - dz * 0.08),
              new Vector3(0, -1, 0),
              0,
              1.2,
            );
            const hit = ray.intersectObject(transport.group, true)[0];
            expect(hit, 'missing deck tread at ' + [x, z]).toBeDefined();
            expect(Math.abs(hit.point.y - h), 'lip at ' + [x, z]).toBeLessThan(0.055);
            if (f === 0.5) {
              // A query on the exact surveyed edge used to fall through the
              // float32 triangle and return ground up to 8.6 m below the street.
              expect(Math.abs(approach.groundAt(x,z)! - y)).toBeLessThan(.13);
              let previous = approach.groundAt(x,z)!, grade = 0;
              for (let s=1; s<=40; s++) {
                const height = approach.groundAt(x+dx*s,z+dz*s);
                if(height === null) break;
                const nextGrade=height-previous;
                expect(Math.abs(nextGrade)).toBeLessThan(.12);
                if(s>1) expect(Math.abs(grade-nextGrade)).toBeLessThan(.045);
                previous=height;
                grade=nextGrade;
              }
            }
            let prior = h;
            for (let s = 1; s <= 72; s++) {
              const p = approach.groundAt(x + dx * s, z + dz * s);
              if (p === null) break;
              const g = bare(x + dx * s, z + dz * s)!;
              if (Math.abs(p - g) < 0.025) break;
              expect(Math.abs(p - prior), name + ' approach at ' + [x, z, s]).toBeLessThan(0.42);
              prior = p;
            }
            checked++;
          }
        }
        if (name === 'south-band') {
          const link = city.roads.find((r) => r.cls === 'motorway' && r.pts.at(-1)![0] === 355.33)!;
          const main = city.roads.find((r) => r.cls === 'motorway' && !r.sub)!;
          const [x, z] = link.pts.at(-1)!;
          expect(approach.groundAt(x, z, link)! - bare(x, z)!).toBeGreaterThan(4);
          expect(approach.groundAt(x, z, main)).toBe(bare(x, z));
          // The branch reaches the same upper support as Capitol, then descends
          // along its own curved source way toward the freeway.
          const line = new Line([...link.pts].reverse());
          let previous = approach.groundAt(x, z, link)!;
          for (let s = 1; s <= 75; s++) {
            const p = line.at(s),
              height = approach.groundAt(p.x, p.z, link)!;
            expect(Math.abs(height - previous)).toBeLessThan(0.5);
            previous = height;
          }
          const end = line.at(75);
          expect(previous).toBeCloseTo(bare(end.x, end.z)!, 2);
        }
        expect(checked).toBe(({ downtown: 13, 'north-band': 3, 'south-band': 1 }[name] ?? 0) * 3);
      } finally {
        transport.dispose();
        approach.geometry.dispose();
        approach.walls.dispose();
        terrain.geometry.dispose();
      }
    },
  );
}

it.skipIf(!downtown)('carries the Baker junction and its two slips above the open Connector', () => {
  const { grid, city } = board('downtown');
  const zero = grid.manifest.vertical.sceneZeroNavd88M;
  const terrain = new GroundSurface(grid, 'high');
  const bare = (x: number, z: number) => terrain.sampleScene(x, z);
  const approach = bridgeApproaches(junctionPortals(city), zero, bare, city.bounds, city.roads);
  const deck = createSurfaceTransport(city, grid, approach.groundAt);
  try {
    const runs = drawJunctionDecks(city, zero, new Builder(), new Map()).filter((r) => r.pts[0][0] > 800);
    expect(runs.filter((r) => r.cls === 'secondary')).toHaveLength(8);
    const slips = runs.filter((r) => r.sub === 'link');
    expect(slips).toHaveLength(2);
    for (const r of slips) {
      const [x, z] = r.pts[Math.floor(r.pts.length / 2)];
      expect(deck.deckAt(x, z, r)! + zero).toBeGreaterThan(298);
      expect(approach.groundAt(x, z)).toBe(bare(x, z));
    }
    const r = runs.find((r) => r.pts[0][0] === 876.72 && r.pts.at(-1)![0] === 838.35)!;
    const x = 876.72,
      z = -922.69;
    expect(deck.deckAt(x, z, r)! + zero).toBeCloseTo(300.13, 1);
    expect(deck.deckAt(x, z, r)! - bare(x, z)!).toBeGreaterThan(5);
    expect(deck.deckAt(920, -970, r)).toBeNull();
    expect(deck.deckAt(876, -971, r)).toBeNull();
    expect(runs.some((r) => r.cls === 'motorway')).toBe(false);
  } finally {
    deck.dispose();
    approach.geometry.dispose();
    approach.walls.dispose();
    terrain.geometry.dispose();
  }
});
