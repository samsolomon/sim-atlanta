import { expect, it } from 'vitest';
import { Box3 } from 'three';
import { readFileSync } from 'node:fs';
import type { VBuilding } from '../vignette/world';
import { createTechLandmark, techIds } from './midtown-culture-tech';

it('replaces the two audited grandstands and the administration building independently', () => {
  const archive = new URL('../../../pipeline/prototypes/square-board/midtown-south/context.json', import.meta.url);
  const buildings: VBuilding[] = JSON.parse(readFileSync(archive, 'utf8')).buildings;
  for (const site of buildings.filter(b => techIds.has(b.id))) {
    const model = createTechLandmark(buildings, site, -8, () => 0)!;
    expect(model.buildings.length).toBe(buildings.length - 1);
    expect(model.buildings).not.toContain(site);
    const box = new Box3().setFromObject(model.group);
    expect(box.max.y).toBeGreaterThan(30);
    expect(box.min.y).toBeLessThan(0);
    expect(createTechLandmark(buildings, site, null, () => 0)).toBeNull();
  }
  expect(buildings.filter(b => techIds.has(b.id))).toHaveLength(3);
});
