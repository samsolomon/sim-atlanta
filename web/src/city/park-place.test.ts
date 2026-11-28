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

it('stands the Ten Park Place shopfront panes clear of the stone base', () => {
  const t = createTenParkPlace([ten, one], grid)!;
  t.group.updateMatrixWorld(true);
  const base = 317 - 300 - 0.35, shopTop = 316.8 - 300 + 4.6, v = new Vector3(), off: number[] = [];
  t.group.traverse(o => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    const position = mesh.geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
      if (v.y < base + 0.5 || v.y > shopTop - 0.3) continue;
      off.push(Math.min(...tenRing.map(([ax, az], k) => {
        const [bx, bz] = tenRing[(k + 1) % tenRing.length], dx = bx - ax, dz = bz - az;
        const u = Math.max(0, Math.min(1, ((v.x - ax) * dx + (v.z - az) * dz) / (dx * dx + dz * dz)));
        return Math.hypot(v.x - ax - dx * u, v.z - az - dz * u);
      })));
    }
  });
  expect(off.length).toBeGreaterThan(0);
  // The stone base stands 6 cm off the wall; coplanar layers keep 4 cm apart.
  expect(Math.min(...off)).toBeGreaterThan(0.099);
});
