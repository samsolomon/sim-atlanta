import { readFileSync } from 'node:fs';
import { Raycaster, Vector3, type Mesh } from 'three';
import type { VBuilding } from '../vignette/world';
import { irwinHouseFinish } from './irwin-houses';
import { afterEach, expect, it, vi } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import { createDowntownTerrain } from '../terrain/model';
import type { JoiningEdge } from '../terrain/surface';
import { boardPoint, eastJoin, northBounds, northSouthJoin, northWestJoin } from './board-footprint';
import { loadNorth, verifyNorth } from './sweet-auburn-board';

function baked(folder: string) {
  const base = new URL('../../../pipeline/prototypes/' + folder + '/', import.meta.url);
  const bytes = Uint8Array.from(readFileSync(new URL('ground.i16', base))).buffer;
  return new GroundGrid(JSON.parse(readFileSync(new URL('ground.json', base), 'utf8')), bytes);
}

afterEach(() => vi.unstubAllGlobals());

it.each(['high', 'low'] as const)('joins the rendered ground, skirts and triple corner on %s', quality => {
  const west = baked('downtown-ground'), south = baked('king-memorial/ground'), north = baked('sweet-auburn/ground');
  verifyNorth(west, south, north);
  vi.stubGlobal('document', { createElement: () => ({ getContext: () =>
    ({ scale() {}, translate() {}, fillRect() {}, setLineDash() {},
      // The downtown board paints its Robinson College frontage strip even with no buildings.
      beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {} }) }) });
  const area = (g: GroundGrid, join: JoiningEdge[]) => createDowntownTerrain(g,
    { bounds: g.manifest.bounds, buildings: [], roads: [], rail: [] }, [], { quality, join });
  const w = area(west, [eastJoin, northWestJoin]), s = area(south, [eastJoin, northSouthJoin]),
    n = area(north, [northWestJoin, northSouthJoin]);
  try {
    w.openJoin(); s.openJoin();
    for (const board of [w,s]) expect(board.board.getObjectByName('joining edge 1')?.visible).toBe(true);
    w.openJoin(1); s.openJoin(1); n.openJoin(); n.openJoin(1);
    for (const model of [w,s,n]) {
      for (const child of model.board.children as Mesh[]) {
        if (!child.visible) continue;
        const pos = child.geometry.getAttribute('position');
        for (let i = 0; i < pos.count; i += 3) {
          const xs = [0,1,2].map(j => pos.getX(i+j)), zs = [0,1,2].map(j => pos.getZ(i+j));
          if (xs.every(x => x === 1000)) expect(Math.min(...zs) >= 640 || Math.max(...zs) <= -520).toBe(true);
          if (zs.every(z => z === 280)) expect(Math.max(...xs) <= 1000 || Math.min(...xs) >= 1800).toBe(true);
        }
      }
    }
    for (let d = 0; d <= 800; d += 2.5) {
      const z = northBounds.minZ + d, x = northBounds.minX + d;
      const westY = w.groundAt(1000,z)!, southY = s.groundAt(x,280)!;
      expect(n.groundAt(1000,z)).toBeCloseTo(westY, 5);
      expect(n.groundAt(x,280)).toBeCloseTo(southY, 5);
      expect(n.groundAt(x,280)).toBeCloseTo(north.sample(x,280)! - 323.8, 4);
      expect(n.groundAt(1000,z)).toBeCloseTo(north.sample(1000,z)! - 323.8, 4);
    }
    expect(w.groundAt(1000,280)).toBe(s.groundAt(1000,280));
    expect(boardPoint(w.bounds,true,1300,-200,true)).toEqual({x:1300,z:-200});
    expect(boardPoint(w.bounds,true,1300,-200)).toEqual({x:1000,z:-200});
  } finally { for (const region of [w,s,n]) region.dispose(); }
});

it('rejects a tile with a changed south seam node before opening either wall', () => {
  const north = baked('sweet-auburn/ground'), south = baked('king-memorial/ground');
  const original = south.sample.bind(south);
  vi.spyOn(south,'sample').mockImplementation((x,z) => x === 1150 && z === 280 ? null : original(x,z));
  expect(() => verifyNorth(baked('downtown-ground'), south, north)).toThrow(/shared ground/);
});


it.each(['high', 'low'] as const)('keeps the Irwin porch decks above their sloping front yards on %s', quality => {
  const grid = baked('sweet-auburn/ground');
  const url = new URL('../../../pipeline/prototypes/sweet-auburn/context.json', import.meta.url);
  const context = JSON.parse(readFileSync(url, 'utf8')) as { buildings: VBuilding[] };
  const buildings = context.buildings.filter(b => irwinHouseFinish(b));
  expect(buildings.map(b => b.id).sort()).toEqual(['osm:way:270493826', 'osm:way:270493832', 'osm:way:270493845']);
  vi.stubGlobal('document', { createElement: () => ({ getContext: () =>
    ({ scale() {}, translate() {}, fillRect() {}, setLineDash() {},
      // The downtown board paints its Robinson College frontage strip even with no buildings.
      beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {} }) }) });
  const area = createDowntownTerrain(grid, { bounds: grid.manifest.bounds, buildings, roads: [], rail: [] }, [],
    { quality, finishFor: irwinHouseFinish });
  try {
    for (const [x,z] of [[1420,-406], [1444,-407], [1451,-407], [1510,-407]]) {
      const grade = area.groundAt(x,z)!;
      // Start below the porch roof, between the posts and the front door.
      const ray = new Raycaster(new Vector3(x,grade+2.2,z), new Vector3(0,-1,0));
      const hit = ray.intersectObject(area.scenery,true)[0];
      expect(hit?.point.y).toBeGreaterThan(grade+.35);
    }
  } finally { area.dispose(); }
});

it.each(['high', 'low'] as const)('places the measured Sweet Auburn landmark roofs on their lidar heights on %s', async quality => {
  const root = new URL('../../../pipeline/prototypes/sweet-auburn/', import.meta.url);
  vi.stubGlobal('fetch', async (url: string) => {
    const name = url.split('/').pop()!;
    const file = new URL(name === 'context.json' ? name : 'ground/' + name, root);
    return new Response(Uint8Array.from(readFileSync(file)).buffer);
  });
  const ctx = new Proxy({}, { get: () => () => undefined });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  const area = await loadNorth('/data', baked('downtown-ground'), baked('king-memorial/ground'),
    quality, -45, new AbortController().signal);
  try {
    // These points are inside the two flat roof runs, the two service volumes,
    // and the open entrance court inside the L.
    for (const [x,z,navd] of [[1524,-151,343.05], [1501,-128,343.05], [1516,-134,346.12], [1523,-128,348.74]]) {
      const ray = new Raycaster(new Vector3(x,80,z),new Vector3(0,-1,0));
      const hit = ray.intersectObject(area.scenery,true)[0];
      expect(hit.point.y + area.grid.manifest.vertical.sceneZeroNavd88M).toBeCloseTo(navd, 2);
    }
    for (const [x, z, navd] of [
      [1110, -197, 320.02], [1111, -216, 317.24], // Odd Fellows tower, front and rear
      [1068, -194, 304.07], [1083, -209.2, 310.02], // Auditorium storefront and hall ridge
      [1608.45, -148, 320.1], [1625, -148, 312.8], // Heritage nave and education wing
      [1027.175, -226, 315.65], [1017.85, -198.3, 315.85], [1031.7, -198.6, 336.72], // Big Bethel
    ]) {
      const ray = new Raycaster(new Vector3(x, 80, z), new Vector3(0, -1, 0));
      const hit = ray.intersectObject(area.scenery, true)[0];
      expect(hit.point.y + area.grid.manifest.vertical.sceneZeroNavd88M).toBeCloseTo(navd, 2);
    }
    const lightwell = new Raycaster(new Vector3(1617.7, 80, -146), new Vector3(0, -1, 0));
    expect(lightwell.intersectObject(area.scenery, true).every(hit => hit.point.y < -18)).toBe(true);
    const courtyard = new Raycaster(new Vector3(1508,80,-146),new Vector3(0,-1,0));
    expect(courtyard.intersectObject(area.scenery,true).every(hit => hit.point.y < 10)).toBe(true);
  } finally { area.dispose(); }
});
