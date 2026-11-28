import { expect, it } from 'vitest';
import { Mesh, Raycaster, Vector3, type BufferGeometry } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createImperialHotel, imperialHotelId } from './imperial-hotel';
import { detachedParts, footprintReport } from './skin-kit';

// The downtown site as the pipeline writes it (web/public/data/scene/downtown/vignette.json).
const site: VBuilding = {
  id: imperialHotelId, h: 36.5, floors: 8,
  rings: [[[540.02, -1119.9], [578.85, -1116.15], [580.24, -1130.52], [555.04, -1132.94], [555.37, -1136.45], [541.75, -1137.76],
    [538.72, -1138.05], [537.92, -1129.7], [537.0, -1120.19]]],
  parts: [
    { id: 'overture:4b3f52fe-7414-31dc-8558-dd55c50d5b2a', h: 36.5, rings: [[[546.86, -1128.33], [549.14, -1128.1], [549.05, -1127.2], [547.68, -1127.33],
      [547.54, -1125.92], [546.56, -1126.02], [546.22, -1122.66], [551.48, -1122.13], [552.04, -1127.62], [553.95, -1127.43], [554.52, -1133.02], [547.41, -1133.75]]] },
    { id: 'overture:922b219b-c091-3abd-b70a-8d2d102eeea7', h: 36.5, rings: [[[540.02, -1119.9], [578.85, -1116.15], [580.24, -1130.52], [555.04, -1132.94],
      [555.37, -1136.45], [541.75, -1137.76], [540.93, -1129.39]]] },
    { id: 'overture:09ca5bb1-77ad-362e-adde-b70306e84025', h: 4.6, rings: [[[537.0, -1120.19], [540.02, -1119.9], [540.93, -1129.39], [541.75, -1137.76],
      [538.72, -1138.05], [537.92, -1129.7]]] },
  ],
} as VBuilding;

/** Flat ground at 312.5 m NAVD88 on Peachtree Street. */
const grid = new GroundGrid({
  version: 1, rows: 2, cols: 2, stepM: 400,
  bounds: { minX: 400, maxX: 800, minZ: -1300, maxZ: -900 },
  encoding: 'signed int16 little-endian',
  vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
  scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
}, new Int16Array(4).fill(3125).buffer);

const tris = (g: { children: unknown[] }) => g.children
  .map(child => ((child as Mesh).geometry as BufferGeometry).getAttribute('position').count / 3).reduce((a, b) => a + b, 0);

it('replaces the Imperial Hotel at the lidar heights, not the mapped 36.5 m, with its Peachtree arcade', () => {
  const other = { id: 'other', h: 10, floors: 3, rings: [[[0, 0], [1, 0], [1, 1]]] } as VBuilding;
  const m = createImperialHotel([site, other], grid)!;
  expect(m.buildings).toEqual([other]);
  expect(tris(m.group)).toBeLessThanOrEqual(2400);
  const roof = (x: number, z: number) => {
    m.group.updateMatrixWorld(true);
    const hit = new Raycaster(new Vector3(x, 400, z), new Vector3(0, -1, 0)).intersectObject(m.group)[0];
    return hit ? hit.point.y + 300 : null;
  };
  expect(roof(570, -1124)).toBeCloseTo(344.5, 0); // main roof
  expect(roof(550, -1131)).toBeCloseTo(346.3, 0); // stair and lift penthouse
  expect(roof(538.5, -1128)).toBeCloseTo(317.5, 0); // the Peachtree arcade, 5 m
  // Downtown is outside skin-footprint.test.ts, so the same check runs here: everything within the
  // default 2.5 m of the outline (the bays project 0.85 m) and no loose parts.
  const r = footprintReport(m.group, site.rings, { bottom: 312.5 - 300 - 8 });
  expect(r.worst).toBe(0);
  expect(r.vertical).toBe(0);
  expect(r.outside).toBeLessThan(1);
  expect(detachedParts(m.group, site.rings)).toEqual([]);
  // The bays' canted sides (about 1 m long) carry a pane per floor: 6 stacks x 2 sides x 8 floors.
  let canted = 0;
  m.group.traverse(o => {
    const pos = (o as Mesh).geometry?.getAttribute('position');
    if (!pos) return;
    for (let i = 0; i + 2 < pos.count; i += 3) {
      const [a, b, c] = [i, i + 1, i + 2].map(j => new Vector3().fromBufferAttribute(pos, j));
      const n = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
      if (Math.abs(n.x) > 0.6 && Math.abs(n.x) < 0.95 && Math.abs(n.y) < 0.1) canted++;
    }
  });
  expect(canted).toBeGreaterThan(6 * 2 * 8 * 2);
  // The arcade's arches run the whole Peachtree front, mapped as two edges (north and south halves).
  // A level ray from Peachtree at door height meets a lit door (the lamps mesh), not bare brick.
  const lamps = m.group.children[1];
  const door = (z: number) => new Raycaster(new Vector3(530, 314 - 300, z), new Vector3(1, 0, 0)).intersectObject(m.group)[0]?.object;
  expect(door(-1125.5)).toBe(lamps); // the second arch, on the northern edge
  expect(door(-1132.7)).toBe(lamps); // the fourth arch, on the southern edge
  // Round heads, not flat ones: 3.7 m up, the glass reaches the middle of an arch but not its sides.
  const head = (z: number) => new Raycaster(new Vector3(530, 312.5 - 300 + 3.7, z), new Vector3(1, 0, 0)).intersectObject(m.group)[0]?.object;
  expect(head(-1125.55)).toBe(lamps);
  expect(head(-1125.55 - 1.1)).not.toBe(lamps);
  expect(head(-1125.55 + 1.1)).not.toBe(lamps);
});
