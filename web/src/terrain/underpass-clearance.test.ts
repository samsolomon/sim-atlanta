import { readFileSync, existsSync } from 'node:fs';
import { Box3, BufferGeometry, Mesh, Triangle, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { northConnectorGround, northConnectorTransport } from '../square-board/connector-ground';
import { southConnectorTransport } from '../square-board/south-connector-decks';
import { cityRoadHeight } from '../city/road-height';
import { PlacementIndex } from '../vignette/spatial';
import { GroundGrid } from './grid';
import { GroundSurface } from './surface';
import { bridgeApproaches } from './bridge-approaches';
import { junctionPortals } from './junction-decks';
import { streetPortals } from './street-bridges';
import { ribbons, sectionAt, stripePoint } from './connector-corridor';
import { createSurfaceTransport } from './transport';
import type { TerrainCity } from './transport-data';
import { underpassLights } from './underpass-lights';

const src = new URL('../../../pipeline/prototypes/', import.meta.url);
const downtown = new URL('../../public/data/scene/downtown/vignette.json', import.meta.url);
const json = (u: URL) => JSON.parse(readFileSync(u, 'utf8'));
for (const quality of ['low', 'high'] as const)
  for (const name of ['downtown', 'north-band', 'south-band'])
    it.skipIf(name === 'downtown' && !existsSync(downtown))(
      'sweeps a long vehicle under the surveyed street decks on ' + name + ' at ' + quality,
      () => {
        const d = new URL(name === 'downtown' ? 'downtown-ground/' : 'square-board/' + name + '/', src);
        const bytes = Uint8Array.from(readFileSync(new URL('ground.i16', d))).buffer,
          manifest = json(new URL('ground.json', d));
        const grid =
          name === 'north-band' ? northConnectorGround(manifest, bytes) : new GroundGrid(manifest, bytes);
        const city: TerrainCity =
          name === 'downtown'
            ? json(downtown)
            : name === 'north-band'
              ? northConnectorTransport(json(new URL('context.json', d)))
              : southConnectorTransport(json(new URL('context.json', d)));
        const floor = new GroundSurface(grid, quality),
          bare = floor.sampleScene.bind(floor);
        const bank = bridgeApproaches(
          [...streetPortals(city), ...junctionPortals(city)],
          manifest.vertical.sceneZeroNavd88M,
          bare,
          city.bounds,
          city.roads,
        );
        const decks = createSurfaceTransport(city, grid, bank.groundAt),
          light = underpassLights(city, floor)!;
        const at = cityRoadHeight(city, bank.groundAt, decks.deckAt);
        const index = new PlacementIndex<{ tri: Triangle; name: string }>(18);
        function add(g: BufferGeometry, name: string) {
          const p = g.getAttribute('position');
          for (let i = 0; i < p.count; i += 3) {
            const vs = [i, i + 1, i + 2].map((j) => new Vector3().fromBufferAttribute(p, j));
            index.add(
              { tri: new Triangle(...(vs as [Vector3, Vector3, Vector3])), name },
              vs.map((v) => [v.x, v.z]),
              11,
            );
          }
        }
        add(bank.walls, 'approach wall');
        add(bank.geometry, 'approach tread');
        for (const m of [...decks.group.children, ...light.group.children])
          if (m instanceof Mesh && m.name !== 'Underpass pavement illumination') add(m.geometry, m.name);
        // An illustrative 18 m × 2.55 m box with 4.1 m overall height. Allow
        // 0.30 m below the body for tyres. Pitch follows front and rear axle samples.
        const box = new Box3(new Vector3(-1.275, 0.3, -9), new Vector3(1.275, 4.1, 9));
        let count = 0,
          min = Infinity;
        const bad = new Map<string, string>(),
          owners = new Set<number>();
        for (const r of ribbons) {
          if (r.kind === 'bridge') continue;
          const road = {
            cls: 'motorway',
            name: 'Downtown Connector',
            sub: r.link ? 'link' : null,
            pts: r.pts,
            bridge: false,
            tunnel: r.kind === 'tunnel',
          };
          for (let s = 0; s <= r.line.length; s += 3)
            for (let lane = 0; lane < r.lanes; lane++) {
              const f = (lane + 0.5) / r.lanes,
                [x, z] = stripePoint(sectionAt(r, s), f);
              const roof = light.ceiling(x, z);
              if (roof === null) continue;
              const y = at(x, z, road);
              expect(y, String([r.id, x, z])).not.toBeNull();
              const { dx, dz } = r.line.at(s),
                fore = bare(x + dx * 7, z + dz * 7),
                aft = bare(x - dx * 7, z - dz * 7);
              const bodyY = fore !== null && aft !== null ? (fore + aft) / 2 : y!;
              const pitch = fore !== null && aft !== null ? (fore - aft) / 14 : 0;
              owners.add(r.id);
              count++;
              min = Math.min(min, roof - y!);
              const local = (v: Vector3) => {
                const along = (v.x - x) * dx + (v.z - z) * dz;
                return new Vector3((v.x - x) * dz - (v.z - z) * dx, v.y - bodyY - along * pitch, along);
              };
              floor.trianglesNear(x, z, 11, (a, b, c) => {
                const pos = floor.geometry.getAttribute('position');
                const sample = (j: number) => local(new Vector3().fromBufferAttribute(pos, j));
                if (box.intersectsTriangle(new Triangle(sample(a), sample(b), sample(c)))) {
                  const key = r.id + ' terrain';
                  if (!bad.has(key)) bad.set(key, [x, z, s, lane].join(','));
                }
              });
              for (const { tri, name } of index.at(x, z)) {
                if (box.intersectsTriangle(new Triangle(local(tri.a), local(tri.b), local(tri.c)))) {
                  const key = r.id + ' ' + name;
                  if (!bad.has(key)) bad.set(key, [x.toFixed(1), z.toFixed(1), s, lane].join(','));
                }
              }
            }
        }
        expect(count).toBeGreaterThanOrEqual({ downtown: 1599, 'north-band': 143, 'south-band': 37 }[name]!);
        expect(min).toBeGreaterThan(4.2);
        expect([...bad.entries()]).toEqual([]);
        if (name === 'downtown')
          for (const id of [1051688674, 1051688675, 1051688672, 963910432]) expect(owners.has(id)).toBe(true);
        decks.dispose();
        floor.geometry.dispose();
        bank.walls.dispose();
        bank.geometry.dispose();
        light.group.traverse((m) => {
          if (m instanceof Mesh) {
            m.geometry.dispose();
            m.material.dispose();
          }
        });
      },
    );
