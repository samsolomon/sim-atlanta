import { existsSync, readFileSync } from 'node:fs';
import { Color } from 'three';
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
  // Colonial: two storeys at 150 m² and up outside Ansley Park; eaves at 3.2, 6.2 and 9.2 m.
  const pin = (...ids: string[]) => Object.fromEntries(ids.map(id => [id, { style: 'colonial' as const }]));
  const plan = residential(city([long, square, ell]), undefined, undefined, undefined, 'high', pin('long', 'square', 'ell'));
  expect(plan.count).toBe(3);
  for (const b of [long, square, ell]) {
    const { finish, drawn, top } = roof(b, plan);
    expect(finish.parapet).toBe(0);
    // A house facade: clapboard, brick, stucco or shingle, drawn without shader windows (styles 7–10).
    expect([7, 8, 9, 10]).toContain(finish.windowStyle);
    // Two storeys inferred above 150 m² outside Ansley Park; the ridge rises 0.72 × half-depth, capped at 4.5 m.
    expect(drawn.h).toBeCloseTo(6.2, 5);
    expect(top).toBeGreaterThan(drawn.h! + (b === ell ? .9 : 1.5));
  }
  // The L plan's roof never reaches over its empty corner.
  const out = new Builder();
  plan.finishFor(ell)!.dressRoof!(out, ell.rings[0], plan.city.buildings.find(x => x.id === 'ell')!.h!, new Builder());
  // Roof vertices sit at or above the eave; inner-corner windows below it now face into the notch, as they should.
  const ellEave = plan.city.buildings.find(x => x.id === 'ell')!.h!;
  for (let i = 0; i < out.pos.length; i += 3) if (out.pos[i + 1] >= ellEave - 1e-6) expect(out.pos[i] > 68.01 && out.pos[i + 2] > 8.01).toBe(false);
  // A one-storey cottage under 150 m² (Home Park bungalows); the same plan in Ansley Park is two storeys.
  const cottage = house('cottage', rect(11, 9));
  expect(residential(city([cottage]), undefined, undefined, undefined, 'high', pin('cottage')).city.buildings[0].h).toBeCloseTo(3.2, 5);
  const ansley = house('ansley', rect(11, 9, 1300, -3950));
  expect(residential(city([ansley]), undefined, undefined, undefined, 'high', pin('ansley')).city.buildings[0].h).toBeCloseTo(6.2, 5);
  // Storeys read from the eave: one, two and three storeys at about 3, 6 and 9 m.
  const tall = house('tall', rect(12, 10));
  expect(residential(city([tall]), undefined, undefined, undefined, 'high', { tall: { style: 'colonial', storeys: 3 } }).city.buildings[0].h).toBeCloseTo(9.2, 5);
});

it('keeps reported roof shapes and leaves offices, big blocks and existing finishes alone', () => {
  const [hippedId] = Object.entries(tags).find(([, v]) => v[0] === 'hipped')!;
  const tagged = house(hippedId, rect(16, 8));
  const office = { ...house('office', rect(14, 8)), cls: 'office' };
  const block = house('block', rect(40, 30));
  const irwin = house('osm:way:270493826', [[0, 0], [10, 0], [10, 14], [0, 14]]);
  // Pin both to Colonial, whose pitch (0.72 × half-depth) the ridge check below assumes.
  const colonial = { [hippedId]: { style: 'colonial' as const }, plain: { style: 'colonial' as const } };
  const plan = residential(city([tagged, office, block, irwin]), irwinHouseFinish, undefined, undefined, 'high', colonial);
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
  expect(ridgeEnd(untagged, residential(city([untagged]), undefined, undefined, undefined, 'high', colonial))).toBeGreaterThan(15.9);
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

it('composes a modest set of windows and lights about a third of rooms', () => {
  // Windows count by their glass: lit glass goes to the lit builder, dark glass is #4c5a60.
  let total = 0, glowing = 0;
  for (let i = 0; i < 30; i++) {
    const b = house(`colonial-${i}`, rect(12, 9, i * 30, 0));
    const plan = residential(city([b]), undefined, undefined, undefined, 'high', { [b.id]: { style: 'colonial', storeys: 2 } });
    const out = new Builder(), lit = new Builder();
    plan.finishFor(b)!.dressRoof!(out, b.rings[0], plan.city.buildings[0].h!, lit);
    const dark = new Color('#4c5a60');
    let darkVerts = 0;
    for (let v = 0; v < out.col.length; v += 3)
      if (Math.abs(out.col[v] - dark.r) < 1e-4 && Math.abs(out.col[v + 1] - dark.g) < 1e-4 && Math.abs(out.col[v + 2] - dark.b) < 1e-4) darkVerts++;
    total += (darkVerts + lit.pos.length / 3) / 6;
    glowing += lit.pos.length / 18;
  }
  // A two-storey Colonial: about 20–30 sashes (pairs count twice), well under the ~48 of the old tiled grid.
  expect(total / 30).toBeGreaterThan(8);
  expect(total / 30).toBeLessThan(32);
  expect(glowing / total).toBeGreaterThan(.2);
  expect(glowing / total).toBeLessThan(.5);
});
