import { Mesh, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { createOneParkPlace, createTenParkPlace, oneParkPlaceId, tenParkPlaceId } from './park-place';
import { detachedParts } from './skin-kit';

const tenRing: [number, number][] = [[307.2, -31.0], [320.1, -50.8], [289.7, -58.3], [252.9, -1.9], [278.0, 14.6], [288.1, -1.5], [283.3, -4.9], [303.2, -33.7]];
const oneRing: [number, number][] = [[236.4, -12.9], [267.1, -58.2], [235.0, -58.0], [214.9, -27.1]];
const ten: VBuilding = { id: tenParkPlaceId, h: 30.6, floors: 0, rings: [tenRing] };
const one: VBuilding = { id: oneParkPlaceId, h: 21.2, floors: 0, rings: [oneRing] };
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 1000,
    bounds: { minX: 0, maxX: 1000, minZ: -500, maxZ: 500 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(3170).buffer,
);
const tris = (g: { children: unknown[] }) => (g.children as Mesh[]).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0);

it('draws each Park Place building at its own lidar height (Overture inverts them), nothing loose', () => {
  for (const tier of ['low', 'high'] as const) {
    const t = createTenParkPlace([ten, one], grid, tier)!;
    const o = createOneParkPlace(t.buildings, grid, tier)!;
    expect(o.buildings).toEqual([]);
    for (const [r, ring, x, z, h] of [[t, tenRing, 270, -20, 316.8 + 22.9], [o, oneRing, 240, -40, 317.4 + 35.3]] as const) {
      r.group.updateMatrixWorld(true);
      const y = new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(r.group, true)[0].point.y + 300;
      expect(y).toBeCloseTo(h, 1);
      expect(detachedParts(r.group, [ring])).toEqual([]);
    }
    if (tier === 'low') expect(tris(t.group) + tris(o.group)).toBeLessThan(1000);
  }
});
