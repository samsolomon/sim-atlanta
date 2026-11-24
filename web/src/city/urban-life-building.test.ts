import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { detachedParts, footprintReport } from './skin-kit';
import { createUrbanLifeBuilding } from './urban-life-building';

// Downtown board outline, with the round cores simplified to within 11 cm.
const site: VBuilding = {
  id: 'c2886eef-1a96-49f6-b58b-bcf297d0cee6',
  floors: 12,
  h: null,
  rings: [[
    [560.69, 184.16], [558.71, 186.47], [558.00, 185.92], [556.71, 185.53],
    [555.82, 185.58], [554.60, 186.15], [553.96, 186.80], [553.54, 187.61],
    [553.37, 188.50], [553.46, 189.40], [553.79, 190.24], [554.36, 190.96],
    [555.10, 191.48], [555.95, 191.77], [556.86, 191.79], [557.73, 191.54],
    [558.81, 190.76], [559.08, 190.13], [570.27, 199.97], [564.97, 205.99],
    [580.29, 219.13], [585.23, 213.33], [595.51, 222.29], [594.78, 223.39],
    [594.57, 224.26], [594.62, 225.16], [595.14, 226.38], [595.76, 227.03],
    [596.52, 227.48], [597.83, 227.71], [598.69, 227.54], [599.48, 227.14],
    [600.12, 226.52], [600.70, 225.33], [600.78, 224.44], [600.45, 223.14],
    [599.93, 222.40], [613.78, 206.16], [615.03, 206.68], [615.94, 206.70],
    [616.81, 206.47], [617.90, 205.67], [618.54, 204.48], [618.66, 203.56],
    [618.54, 202.66], [618.15, 201.84], [617.54, 201.16], [616.33, 200.54],
    [614.98, 200.48], [613.75, 201.01], [612.84, 202.02], [596.82, 188.05],
    [597.65, 187.04], [598.00, 185.76], [597.80, 184.45], [597.37, 183.68],
    [596.74, 183.05], [595.55, 182.50], [594.25, 182.49], [593.05, 183.03],
    [592.18, 184.02], [576.59, 170.43], [577.20, 169.78], [577.61, 168.99],
    [577.76, 167.66], [577.37, 166.39], [576.47, 165.39], [575.26, 164.86],
    [573.94, 164.88], [573.11, 165.21], [572.13, 166.10], [571.61, 167.33],
    [571.56, 168.23], [571.96, 169.51], [572.50, 170.21], [571.36, 171.55],
    [551.64, 154.37], [552.78, 153.03], [553.55, 153.48], [554.42, 153.69],
    [555.31, 153.65], [556.15, 153.36], [557.18, 152.50], [557.61, 151.71],
    [557.81, 150.84], [557.76, 149.94], [557.46, 149.09], [556.93, 148.37],
    [556.22, 147.81], [554.95, 147.42], [554.06, 147.48], [553.22, 147.79],
    [552.06, 147.32], [542.33, 159.38], [534.56, 167.43], [535.77, 168.73],
    [534.67, 169.49], [534.16, 170.24], [533.84, 171.56], [533.95, 172.46],
    [534.57, 173.66], [535.24, 174.26], [536.05, 174.65], [536.94, 174.80],
    [537.83, 174.68], [539.01, 174.02], [539.80, 172.94], [540.07, 171.61],
    [539.76, 170.30], [538.93, 169.23], [540.89, 166.91],
  ]],
};

it('separates the surveyed roof levels, keeps the brick cores inside the footprint and preserves other buildings', () => {
  const datum = 323.8;
  const grid = new GroundGrid({
    version: 1, rows: 2, cols: 2, stepM: 110,
    bounds: { minX: 520, maxX: 630, minZ: 135, maxZ: 245 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: datum },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  }, new Int16Array(4).fill(3080).buffer);
  const neighbour = { ...site, id: 'neighbour' };
  expect(createUrbanLifeBuilding([neighbour], grid)).toBeNull();
  const model = createUrbanLifeBuilding([site, neighbour], grid)!;
  expect(model.buildings).toEqual([neighbour]);
  expect(footprintReport(model.group, site.rings, { maxProjection: 0.3, top: 362.11 - datum }).count).toBe(0);
  expect(detachedParts(model.group, site.rings)).toEqual([]);

  function roofAt(x: number, z: number) {
    const ray = new Raycaster(new Vector3(x, 80, z), new Vector3(0, -1, 0));
    return ray.intersectObject(model.group)[0]!.point.y + datum;
  }
  expect(roofAt(545, 165)).toBeCloseTo(326.3, 1);
  expect(roofAt(580, 190)).toBeCloseTo(357.8, 1);
  expect(roofAt(574.68, 167.9)).toBeCloseTo(360.5, 1);
  expect(roofAt(587, 192)).toBeCloseTo(362.1, 1);
  expect(roofAt(575, 209)).toBeCloseTo(321.6, 1);
});
