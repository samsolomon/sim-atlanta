import { existsSync, readFileSync } from 'node:fs';
import { Color, Mesh } from 'three';
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

it('keeps a shallow Foursquare roof below its ridge, including dormer geometry', () => {
  const b = house('shallow-foursquare', rect(12, 8));
  const homes = residential(city([b]), undefined, undefined, undefined, 'high', {
    [b.id]: { style: 'colonial', form: 'foursquare', storeys: 2 },
  });
  const finish = homes.finishFor(b)!;
  const eave = homes.city.buildings[0].h!;
  const drawn = new Builder();
  finish.dressRoof!(drawn, b.rings[0], eave, new Builder());
  const color = new Color(finish.roof!);
  const roofHeights: number[] = [];
  for (let i = 0; i < drawn.pos.length; i += 3) {
    if (Math.abs(drawn.col[i] - color.r) < 1e-6 && Math.abs(drawn.col[i + 1] - color.g) < 1e-6
      && Math.abs(drawn.col[i + 2] - color.b) < 1e-6) roofHeights.push(drawn.pos[i + 1]);
  }
  expect(roofHeights.length).toBeGreaterThan(0);
  expect(Math.max(...roofHeights)).toBeLessThanOrEqual(eave + 2.4 + 1e-6);
});

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
  // ...beyond its 0.45 m eave overhang.
  for (let i = 0; i < out.pos.length; i += 3) if (out.pos[i + 1] >= ellEave - 1e-6) expect(out.pos[i] > 68.7 && out.pos[i + 2] > 8.7).toBe(false);
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
  // Pin both to Tudor: always side-gabled unless OSM says otherwise, pitch 1.1 × half-depth.
  const colonial = { [hippedId]: { style: 'tudor' as const }, plain: { style: 'tudor' as const } };
  const plan = residential(city([tagged, office, block, irwin]), irwinHouseFinish, undefined, undefined, 'high', colonial);
  expect(plan.count).toBe(1);
  expect(plan.city.buildings.find(b => b.id === 'office')!.h).toBeNull();
  expect(plan.city.buildings.find(b => b.id === 'block')!.h).toBeNull();
  // A long plan would gable, but the OSM tag says hipped: its ridge stops short of the ends.
  const ridgeEnd = (b: VBuilding, p: ReturnType<typeof residential>) => {
    const out = new Builder(), drawn = p.city.buildings.find(x => x.id === b.id)!;
    p.finishFor(b)!.dressRoof!(out, b.rings[0], drawn.h!, new Builder());
    // Ridge vertices sit at eave + rise (1.1 × the 4 m half-depth); chimneys stand above it.
    const ridge = drawn.h! + 4.4;
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
  // Windows count by their glass: lit glass goes to the lit builder, unlit sky-toned glass is #8fa4b2.
  let total = 0, glowing = 0;
  for (let i = 0; i < 30; i++) {
    const b = house(`colonial-${i}`, rect(12, 9, i * 30, 0));
    const plan = residential(city([b]), undefined, undefined, undefined, 'high', { [b.id]: { style: 'colonial', storeys: 2 } });
    const out = new Builder(), lit = new Builder();
    plan.finishFor(b)!.dressRoof!(out, b.rings[0], plan.city.buildings[0].h!, lit);
    const dark = new Color('#8fa4b2');
    let darkVerts = 0;
    for (let v = 0; v < out.col.length; v += 3)
      if (Math.abs(out.col[v] - dark.r) < 1e-4 && Math.abs(out.col[v + 1] - dark.g) < 1e-4 && Math.abs(out.col[v + 2] - dark.b) < 1e-4) darkVerts++;
    total += (darkVerts + lit.pos.length / 3) / 6;
    glowing += lit.pos.length / 18;
  }
  // A two-storey Colonial: about 12–22 sashes (pairs count twice), never the ~48 of a tiled grid.
  expect(total / 30).toBeGreaterThan(8);
  expect(total / 30).toBeLessThan(24);
  expect(glowing / total).toBeGreaterThan(.2);
  expect(glowing / total).toBeLessThan(.5);
});

it('orients ridges by style: Craftsman front gables run back from the street, Tudor ridges along it', () => {
  // The street runs along x at z = -6, so each front is the z = 0 edge.
  const craftsman = house('craft', rect(10, 14)), tudor = house('tudor', rect(14, 10, 30));
  const plan = residential(city([craftsman, tudor]), undefined, undefined, undefined, 'high', { craft: { style: 'craftsman' }, tudor: { style: 'tudor' } });
  const c = plan.planOf('craft')!, t = plan.planOf('tudor')!;
  expect(c.shape).toBe('gabled');
  expect(Math.abs(c.ridge[1])).toBeCloseTo(1, 5);
  expect(t.shape).toBe('gabled');
  expect(Math.abs(t.ridge[0])).toBeCloseTo(1, 5);
  // A deep Colonial (front narrower than the house) never collapses into an untagged pyramid.
  // (Deep lots face the same street, so the front-derived axis is the one under test.)
  for (let i = 0; i < 10; i++) {
    const deep = house(`deep-${i}`, rect(8, 12, -45 + i * 9, 0));
    const one = residential(city([deep]), undefined, undefined, undefined, 'high', { [deep.id]: { style: 'colonial' } }).planOf(deep.id)!;
    expect(one.shape).not.toBe('pyramidal');
  }
});

it('lays yards by rule: walks stop short of the roadway, nothing lands inside a footprint', () => {
  // Two neighbouring houses facing the street along z = -6.
  const a = house('yard-a', rect(10, 9, -20, 6)), b = house('yard-b', rect(10, 9, -4, 6));
  const flat = () => 0;
  for (const quality of ['high', 'low'] as const) {
    const plan = residential(city([a, b]), undefined, flat, () => 0, quality, { 'yard-a': { style: 'colonial' }, 'yard-b': { style: 'craftsman' } });
    const layer = plan.yards()!;
    expect(layer).not.toBeNull();
    const points: number[][] = [];
    layer.group.traverse(o => {
      if (!(o instanceof Mesh)) return;
      const p = o.geometry.getAttribute('position');
      for (let i = 0; i < p.count; i++) points.push([p.getX(i), p.getZ(i)]);
    });
    expect(points.length).toBeGreaterThan(0);
    const inside = (x: number, z: number, r: number[][]) => {
      let c = false;
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > z) !== (r[j][1] > z) && x < (r[j][0] - r[i][0]) * (z - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c;
      return c;
    };
    for (const [x, z] of points) {
      // The residential street's kerb is 3.5 m from its centreline (z = -6); yards stop 1.5 m short of it.
      expect(z).toBeGreaterThan(-6 + 3.5 + 1.5 - .7);
      for (const h of [a, b]) expect(inside(x, z, h.rings[0].map(([px, pz]) => [px + .02 * Math.sign(px - (h.rings[0][0][0] + 5)), pz]))).toBe(false);
    }
    layer.dispose();
  }
});

it('reports the yard budget per row and tier', () => {
  const proto = new URL('../../../pipeline/prototypes/square-board/', import.meta.url);
  const rows = ['north-band', 'north-corner', 'south-band', 'midtown-south', 'midtown-central', 'midtown-upper', 'brookwood-south', 'brookwood-station'];
  const totals: Record<string, number> = {};
  for (const quality of ['high', 'low'] as const) {
    let sum = 0;
    for (const row of rows) {
      const plan = residential(JSON.parse(readFileSync(new URL(row + '/context.json', proto), 'utf8')), undefined, () => 0, () => 0, quality);
      const layer = plan.yards();
      if (layer) { sum += layer.triangles; layer.dispose(); }
    }
    totals[quality] = sum;
  }
  // Measured 367,462 high and 60,122 low across these rows; ceilings catch a regression.
  expect(totals.high).toBeLessThan(420000);
  expect(totals.low).toBeLessThan(70000);
  expect(totals.low).toBeLessThan(totals.high);
});

it('adds terraced yards only for detached Ansley houses on the high tier', () => {
  const b=house('terrace-fixture',rect(12,10,1200,-4000));
  const c={...city([b]),bounds:{minX:1000,maxX:1400,minZ:-4200,maxZ:-3800},
    roads:[{cls:'residential',name:'Test St',bridge:false,tunnel:false,pts:[[1100,-4020],[1300,-4020]]}]} as TerrainCity;
  const ground=(x:number,z:number)=>(z+4020)*.15+(x-1200)*.1;
  for(const quality of ['high','low'] as const){
    const yard=residential(c,undefined,ground,undefined,quality).yards()!;
    expect(yard.terraceSites.length).toBe(quality==='high'?1:0);
    expect(yard.yields.length).toBe(quality==='high'?3:0);
    if (quality === 'high') {
      const corners = yard.yields[2].ring.slice(2);
      const midX = (corners[0][0] + corners[1][0]) / 2;
      const midZ = (corners[0][1] + corners[1][1]) / 2;
      const walk = new Color('#cbc6ba');
      for (const [x,z] of corners) {
        const heights: number[] = [];
        yard.group.traverse(mesh => {
          if (!(mesh instanceof Mesh)) return;
          const pos = mesh.geometry.getAttribute('position'), color = mesh.geometry.getAttribute('color');
          for (let i = 0; i < pos.count; i++) {
            if (Math.abs(pos.getX(i)-x)<.001 && Math.abs(pos.getZ(i)-z)<.001 &&
                Math.abs(color.getX(i)-walk.r)<.001) heights.push(pos.getY(i));
          }
        });
        expect(heights.length).toBeGreaterThan(0);
        for (const height of heights) expect(height).toBeCloseTo(ground(midX,midZ)+.04,5);
      }
    }
    yard.dispose();
  }
  for(const cls of ['terrace','semidetached_house']){
    const yard=residential({...c,buildings:[{...b,cls}]},undefined,ground).yards();
    expect(yard?.terraceSites.length??0).toBe(0);yard?.dispose();
  }
});
