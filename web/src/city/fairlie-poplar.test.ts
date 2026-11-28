import { describe, expect, it } from 'vitest';
import { Raycaster, Vector3 } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import fixture from './fixtures/fairlie-poplar.json';
import { aderholdId, createFairliePoplar, haasHowellId, standardBuildingId, theatricalOutfitId } from './fairlie-poplar';
import { detachedParts } from './skin-kit';

const zero = 323.8;
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 600,
    bounds: { minX: 100, maxX: 700, minZ: -400, maxZ: 200 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: zero },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(3210).buffer,
);
const sites = fixture as unknown as VBuilding[];
const other: VBuilding = { id: 'x', h: 10, floors: 3, rings: [[[150, 100], [160, 100], [160, 110], [150, 110]]] };

// [name, id, a roof point clear of plant (x, z), lidar ground NAVD88, lidar roof p50 above it]
const roofs = [
  ['Haas-Howell', haasHowellId, [175.6, -296.3], 322.9, 30.1],
  ['Standard Building', standardBuildingId, [179.5, -366.1], 320.6, 40.1],
  ['Aderhold', aderholdId, [250.9, -274.6], 322.6, 22.2],
  ['the Theatrical Outfit', theatricalOutfitId, [184.2, -347.7], 320.9, 9.2],
] as const;

describe('Fairlie–Poplar block', () => {
  const model = createFairliePoplar([...sites, other], grid)!;
  model.group.updateMatrixWorld(true);

  it('draws all four buildings as one landmark with one body and one lamps mesh', () => {
    expect(model.buildings).toEqual([other]);
    const meshes: unknown[] = [];
    model.group.traverse(o => { if ((o as { isMesh?: boolean }).isMesh) meshes.push(o); });
    expect(meshes).toHaveLength(2);
    expect(detachedParts(model.group, sites.flatMap(b => b.rings))).toEqual([]);
  });

  for (const [name, , [x, z], ground, roof] of roofs) {
    it(`puts ${name} at its lidar roof`, () => {
      const hit = new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0];
      expect(Math.abs(hit.point.y + zero - ground - roof)).toBeLessThan(0.35);
    });
  }

  it('leaves out a building that is not on the board', () => {
    const partial = createFairliePoplar([...sites.filter(b => b.id !== aderholdId), other], grid)!;
    expect(partial.buildings).toEqual([other]);
  });

  it('draws the other three when Haas-Howell is not on the board', () => {
    const partial = createFairliePoplar([...sites.filter(b => b.id !== haasHowellId), other], grid);
    expect(partial?.buildings).toEqual([other]);
  });

  it('draws the other three when the shell rejects Haas-Howell', () => {
    const holed = sites.map(b => b.id === haasHowellId ? { ...b, rings: [b.rings[0], b.rings[0]] } : b);
    const partial = createFairliePoplar([...holed, other], grid);
    expect(partial?.buildings.map(b => b.id)).toEqual([haasHowellId, other.id]);
  });
});
