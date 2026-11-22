import { readFileSync } from 'node:fs';
import { Mesh, Raycaster, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createStadium } from './stadium';

const dir = new URL('../../../pipeline/prototypes/downtown-ground/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('ground.json', dir), 'utf8'));
const bytes = new Uint8Array(readFileSync(new URL('ground.i16', dir)));
const ground = new GroundGrid(manifest, bytes.buffer);
const stadium: VBuilding = {
  id: 'c102d61f-1027-4d71-8024-57c8eabc3a58', h: 93, floors: null,
  rings: [[[-813.72, -294.28], [-875.32, -297.01], [-931.03, -275.22], [-969.37, -247.51], [-977.55, -241.04],
  [-997.44, -195.66], [-1005.48, -142.44], [-987.02, -107.04], [-986.39, -102.18], [-948.47, -58.29],
  [-896.44, -41.85], [-834.68, -40], [-780.07, -61.44], [-732.31, -95.87], [-728.51, -106.96], [-712.23, -141.95],
  [-705.09, -193.88], [-722.28, -234.08], [-759.53, -277.95], [-810.68, -291.68]]]
};
const neighbor = { ...stadium, id: 'ordinary-building' };

describe('Mercedes-Benz Stadium on the measured board', () => {
  it('closes and grounds the cut plinth where the surveyed outline crosses the western edge', () => {
    expect(ground.sample(-1005.48, -142.44)).toBeNull();
    const model = createStadium([neighbor, stadium], ground)!;
    expect(model.buildings).toEqual([neighbor]);
    model.group.updateMatrixWorld(true);
    for (const obj of model.group.children) {
      const mesh = obj as Mesh;
      mesh.geometry.computeBoundingBox();
      expect(mesh.geometry.boundingBox!.min.x).toBeGreaterThanOrEqual(-1000);
    }
    for (const z of [-168, -155, -141]) {
      const y = ground.sample(-1000, z)! - manifest.vertical.sceneZeroNavd88M + 0.5;
      const hit = new Raycaster(new Vector3(-1003, y, z), new Vector3(1, 0, 0), 0, 4).intersectObject(model.group, true)[0];
      expect(hit.point.x).toBeCloseTo(-1000, 4);
    }
  });

  it('covers the centre with a continuous petal roof rising above the fixed outer shell', () => {
    const { group } = createStadium([stadium], ground)!;
    group.updateMatrixWorld(true);
    const roof = (x: number, z: number) => new Raycaster(new Vector3(x, 180, z), new Vector3(0, -1, 0))
      .intersectObject(group, true)[0];
    for (let i = 0; i < 48; i++) {
      const angle = (i + 0.3) * Math.PI / 24;
      // The swept folds must meet the petal curb around the entire aperture.
      for (const radius of [65, 75, 85, 95]) {
        const hit = roof(-857 + radius * Math.cos(angle), -155.5 + radius * Math.sin(angle));
        expect(hit.point.y - group.position.y).toBeGreaterThan(55);
      }
      for (const radius of [2, 12, 38, 55]) {
        const hit = roof(-857 + radius * Math.cos(angle), -155.5 + radius * Math.sin(angle));
        expect(hit.object.name).toBe('Eight closed roof petals');
        expect(hit.point.y - group.position.y).toBeGreaterThan(82);
      }
    }
    expect(roof(-750, -155).object.name).toBe('Fixed roof and shell');
    expect(roof(-857, -155.5).point.y - group.position.y).toBeCloseTo(93, 2);
  });

  it('preserves the input list on missing footprint, mismatched registration or an on-board terrain void', () => {
    expect(createStadium([neighbor], ground)).toBeNull();
    expect(createStadium([{ ...stadium, rings: [] }], ground)).toBeNull();
    const data = bytes.slice();
    const row = (-155 - manifest.bounds.minZ) / manifest.stepM;
    new DataView(data.buffer).setInt16(2 * row * manifest.cols, manifest.noData, true);
    const input = [neighbor, stadium];
    expect(createStadium(input, new GroundGrid(manifest, data.buffer))).toBeNull();
    expect(input).toEqual([neighbor, stadium]);
  });
});
