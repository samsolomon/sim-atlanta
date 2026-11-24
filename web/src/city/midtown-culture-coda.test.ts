import { expect, it } from 'vitest';
import { Box3, Mesh, Raycaster, Vector3 } from 'three';
import { readFileSync } from 'node:fs';
import type { VBuilding } from '../vignette/world';
import { createCoda, codaIds } from './midtown-culture-coda';

const buildings: VBuilding[] = JSON.parse(
  readFileSync(
    new URL('../../../pipeline/prototypes/square-board/midtown-south/context.json', import.meta.url),
    'utf8',
  ),
).buildings;

it('replaces each of the three Coda footprints independently, keeping the west arcade open', () => {
  const sites = buildings.filter((b) => codaIds.has(b.id));
  expect(sites).toHaveLength(3);
  for (const site of sites) {
    expect(createCoda(buildings, site, 299, () => null)).toBeNull();
    const model = createCoda(buildings, site, 299, () => 300)!;
    expect(model.buildings).toEqual(buildings.filter((b) => b !== site));
    if (site.id !== 'osm:way:714119667') continue;
    const shell = model.group.children[0] as Mesh;
    model.group.updateMatrixWorld(true);
    const fromArcade = new Vector3(273, 302, -2382);
    const passage = new Raycaster(fromArcade, new Vector3(0, 0, 1), 0, 12);
    expect(passage.intersectObject(shell)).toHaveLength(0);
    for (const origin of [fromArcade, new Vector3(353, 302, -2385)]) {
      const ceiling = new Raycaster(origin, new Vector3(0, 1, 0)).intersectObject(shell)[0];
      expect(ceiling.point.y).toBeCloseTo(319.2, 3);
    }
    expect(new Box3().setFromObject(shell, true).max.y).toBeCloseTo(418.9, 3);
  }
});
