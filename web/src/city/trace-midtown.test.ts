import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { Mesh, Vector3, type BufferGeometry } from 'three';
import { GroundGrid } from '../terrain/grid';
import { pointInRing } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { createTraceMidtown, traceMidtownId } from './trace-midtown';

const buildings: VBuilding[] = JSON.parse(readFileSync(new URL(
  '../../../pipeline/prototypes/square-board/midtown-south/context.json', import.meta.url), 'utf8')).buildings;
/** Flat ground at 303.7 m NAVD88 around the site. */
const grid = new GroundGrid({
  version: 1, rows: 2, cols: 2, stepM: 400,
  bounds: { minX: 400, maxX: 800, minZ: -2640, maxZ: -2240 },
  encoding: 'signed int16 little-endian',
  vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
  scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
}, new Int16Array(4).fill(3037).buffer);

it('stands every roof pavilion on the tower roof', () => {
  const site = buildings.find(b => b.id === traceMidtownId)!;
  const roof = site.parts!.find(p => p.id === 'osm:way:1345268687')!.rings[0];
  const model = createTraceMidtown(buildings, site, grid, 'high')!;
  model.group.updateMatrixWorld(true);
  const points: [number, number, number][] = [];
  model.group.traverse(o => {
    if (!(o instanceof Mesh)) return;
    const p = (o.geometry as BufferGeometry).getAttribute('position'), v = new Vector3();
    for (let i = 0; i < p.count; i++) points.push(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).toArray());
  });
  // Only the pavilions rise more than a metre above the main roof.
  const top = Math.max(...points.map(q => q[1]));
  const crowns = points.filter(q => q[1] > top - 0.5);
  expect(crowns.length).toBeGreaterThan(20);
  expect(crowns.filter(([x, , z]) => !pointInRing(x, z, roof))).toEqual([]);
});
