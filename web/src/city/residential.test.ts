import { existsSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import tags from '../../../pipeline/prototypes/residential/tags.json';
import { residential } from './residential';
import { irwinHouseFinish } from './irwin-houses';
import { Builder, type P2 } from '../vignette/geom';
import type { TerrainCity } from '../terrain/transport-data';
import type { VBuilding } from '../vignette/world';

const rect = (w: number, d: number, x = 0, z = 0): P2[] => [[x, z], [x + w, z], [x + w, z + d], [x, z + d]];
const house = (id: string, ring: P2[], extra: Partial<VBuilding> = {}) => ({ id, cls: 'house', h: null, floors: null, rings: [ring], ...extra }) as VBuilding;
const city = (buildings: VBuilding[]) => ({ bounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 }, buildings,
  roads: [{ cls: 'residential', name: 'Test St', bridge: false, tunnel: false, pts: [[-50, -6], [50, -6]] }], rail: [] }) as unknown as TerrainCity;

function roof(b: VBuilding, plan: ReturnType<typeof residential>) {
  const out = new Builder();
  const finish = plan.finishFor(b)!;
  const drawn = plan.city.buildings.find(x => x.id === b.id)!;
  finish.dressRoof!(out, b.rings[0], drawn.h!, new Builder());
  const ys: number[] = [];
  for (let i = 1; i < out.pos.length; i += 3) ys.push(out.pos[i]);
  return { finish, drawn, top: Math.max(...ys), count: out.pos.length / 3 };
}

it('infers gables, hips and pyramids from the footprint, with eave-height walls and no parapet', () => {
  const long = house('long', rect(18, 9)), square = house('square', rect(13, 13, 30)), ell = house('ell', [[60, 0], [76, 0], [76, 8], [68, 8], [68, 18], [60, 18]]);
  const plan = residential(city([long, square, ell]));
  expect(plan.count).toBe(3);
  for (const b of [long, square, ell]) {
    const { finish, drawn, top } = roof(b, plan);
    expect(finish.parapet).toBe(0);
    // A house facade: clapboard, brick, stucco or shingle (shader styles 3–6).
    expect([3, 4, 5, 6]).toContain(finish.windowStyle);
    // Two storeys inferred above 150 m² outside Ansley Park; the ridge rises 0.72 × half-depth, capped at 4.5 m.
    expect(drawn.h).toBeCloseTo(2 * 3.05 + .4, 5);
    expect(top).toBeGreaterThan(drawn.h! + (b === ell ? .9 : 1.5));
  }
  // The L plan's roof never reaches over its empty corner.
  const out = new Builder();
  plan.finishFor(ell)!.dressRoof!(out, ell.rings[0], plan.city.buildings.find(x => x.id === 'ell')!.h!, new Builder());
  for (let i = 0; i < out.pos.length; i += 3) expect(out.pos[i] > 68.01 && out.pos[i + 2] > 8.01).toBe(false);
  // A one-storey cottage under 150 m² (Home Park bungalows); the same plan in Ansley Park is two storeys.
  const cottage = house('cottage', rect(11, 9));
  expect(residential(city([cottage])).city.buildings[0].h).toBeCloseTo(3.45, 5);
  const ansley = house('ansley', rect(11, 9, 1300, -3950));
  expect(residential(city([ansley])).city.buildings[0].h).toBeCloseTo(6.5, 5);
});

it('keeps reported roof shapes and leaves offices, big blocks and existing finishes alone', () => {
  const [hippedId] = Object.entries(tags).find(([, v]) => v[0] === 'hipped')!;
  const tagged = house(hippedId, rect(16, 8));
  const office = { ...house('office', rect(14, 8)), cls: 'office' };
  const block = house('block', rect(40, 30));
  const irwin = house('osm:way:270493826', [[0, 0], [10, 0], [10, 14], [0, 14]]);
  const plan = residential(city([tagged, office, block, irwin]), irwinHouseFinish);
  expect(plan.count).toBe(1);
  expect(plan.city.buildings.find(b => b.id === 'office')!.h).toBeNull();
  expect(plan.city.buildings.find(b => b.id === 'block')!.h).toBeNull();
  // A long plan would gable, but the OSM tag says hipped: its ridge stops short of the ends.
  const ridgeEnd = (b: VBuilding, p: ReturnType<typeof residential>) => {
    const out = new Builder(), drawn = p.city.buildings.find(x => x.id === b.id)!;
    p.finishFor(b)!.dressRoof!(out, b.rings[0], drawn.h!, new Builder());
    // Ridge vertices sit at eave + rise (0.72 × the 4 m half-depth); chimneys stand above it.
    const ridge = drawn.h! + 2.88;
    const xs = out.pos.filter((_, i) => i % 3 === 0 && Math.abs(out.pos[i + 1] - ridge) < 1e-4 && out.pos[i + 2] > 0 && out.pos[i + 2] < 8);
    return Math.max(...xs);
  };
  const untagged = house('plain', rect(16, 8));
  expect(ridgeEnd(untagged, residential(city([untagged])))).toBeGreaterThan(15.9);
  expect(ridgeEnd(tagged, plan)).toBeLessThan(13);
});

it('reports how many footprints change in each row', () => {
  const proto = new URL('../../../pipeline/prototypes/square-board/', import.meta.url);
  const staged = new URL('../../public/data/scene/', import.meta.url);
  const rows = ['north-band', 'north-corner', 'south-band', 'south-corner', 'midtown-south', 'midtown-central', 'midtown-upper', 'brookwood-south', 'brookwood-station'];
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row] = residential(JSON.parse(readFileSync(new URL(row + '/context.json', proto), 'utf8'))).count;
  for (const [name, file] of [['downtown', 'downtown/vignette.json'], ['king', 'king-memorial/context.json'], ['auburn', 'sweet-auburn/context.json']])
    if (existsSync(new URL(file, staged))) counts[name] = residential(JSON.parse(readFileSync(new URL(file, staged), 'utf8'))).count;
  console.log('residential footprints per row', JSON.stringify(counts));
  // Triangle budget for the house detail drawn by dressRoof (roofs, gables, dormers, porches, stoops, trim), per tier.
  const budget: Record<string, number> = {};
  for (const quality of ['high', 'low'] as const) {
    let total = 0, houses = 0;
    for (const row of rows) {
      const city = JSON.parse(readFileSync(new URL(row + '/context.json', proto), 'utf8'));
      const plan = residential(city, undefined, undefined, undefined, quality);
      for (const b of plan.city.buildings) {
        const finish = plan.finishFor(b);
        if (!finish?.dressRoof) continue;
        const out = new Builder();
        finish.dressRoof(out, b.rings[0], b.h!, new Builder());
        total += out.pos.length / 9;
        houses++;
      }
    }
    budget[quality] = total;
    budget[quality + 'PerHouse'] = Math.round(total / houses);
  }
  console.log('residential detail triangles', JSON.stringify(budget));
  expect(budget.low).toBeLessThan(budget.high);
  expect(counts['brookwood-south']).toBeGreaterThan(500);
  expect(counts['midtown-upper']).toBeGreaterThan(300);
});
