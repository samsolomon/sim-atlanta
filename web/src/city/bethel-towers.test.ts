import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { Mesh, Raycaster, Vector3, type BufferGeometry } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { bethelPodiumId, bethelTowersId, createBethel } from './bethel-towers';
import { detachedParts } from './skin-kit';

const buildings: VBuilding[] = JSON.parse(readFileSync(new URL(
  '../../../pipeline/prototypes/sweet-auburn/context.json', import.meta.url), 'utf8')).buildings;

/** Flat ground at 295.8 m NAVD88 on Auburn Avenue. */
const grid = new GroundGrid({
  version: 1, rows: 2, cols: 2, stepM: 400,
  bounds: { minX: 800, maxX: 1200, minZ: -500, maxZ: -100 },
  encoding: 'signed int16 little-endian',
  vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
  scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
}, new Int16Array(4).fill(2958).buffer);

const tris = (g: { children: unknown[] }) => g.children
  .map(child => ((child as Mesh).geometry as BufferGeometry).getAttribute('position').count / 3).reduce((a, b) => a + b, 0);

it('replaces Bethel Towers and its Auburn Avenue podium at the lidar heights, not the mapped 62.7 m', () => {
  const tower = buildings.find(b => b.id === bethelTowersId)!, podium = buildings.find(b => b.id === bethelPodiumId)!;
  const t = createBethel(buildings, grid)!, p = t;
  // One shell claims both sites, so they share one lamps mesh; a second call finds nothing left.
  expect(t.buildings).not.toContain(tower);
  expect(t.buildings).not.toContain(podium);
  expect(t.buildings).toHaveLength(buildings.length - 2);
  expect(createBethel(t.buildings, grid)).toBeNull();
  expect(t.group.children).toHaveLength(2); // the shell and one lamps mesh
  expect(tris(t.group)).toBeLessThanOrEqual(2400);
  const roof = (g: typeof t.group, x: number, z: number) => {
    g.updateMatrixWorld(true);
    const hit = new Raycaster(new Vector3(x, 400, z), new Vector3(0, -1, 0)).intersectObject(g)[0];
    return hit ? hit.point.y + 300 : null;
  };
  expect(roof(t.group, 1015, -252)).toBeCloseTo(342.5, 0); // slab roof
  expect(roof(t.group, 1003, -248)).toBeCloseTo(347.6, 0); // west mechanical box
  expect(roof(p.group, 1032, -248)).toBeCloseTo(300.5, 0); // garage deck
  expect(roof(p.group, 1005, -196)).toBeCloseTo(303, 0); // Auburn shops
  // Off the tower, only the Auburn frontage strip (x 1000-1011.5, z -200 to -192.8) rises above the deck.
  p.group.updateMatrixWorld(true);
  const above: number[][] = [];
  p.group.traverse(o => {
    const pos = (o as Mesh).geometry?.getAttribute('position');
    if (pos) for (let i = 0; i < pos.count; i++) {
      const v = new Vector3().fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      const inTower = v.x > 999.7 && v.x < 1025.3 && v.z > -261.5 && v.z < -243.6;
      if (!inTower && v.y + 300 > 300.6 && !(v.x > 999.9 && v.x < 1011.6 && v.z > -200.1 && v.z < -192.7)) above.push([v.x, v.y + 300, v.z]);
    }
  });
  expect(above).toEqual([]);
  expect(detachedParts(t.group, [...tower.rings, ...podium.rings])).toEqual([]);
});
