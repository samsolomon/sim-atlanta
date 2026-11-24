import { existsSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createH5Courtland, h5CourtlandId } from './h5-courtland';
import { detachedParts, footprintReport } from './skin-kit';

const scene = new URL('../../public/data/scene/downtown/', import.meta.url);
const vignette = new URL('vignette.json', scene);

it.skipIf(!existsSync(vignette))('replaces the staged Courtland footprint and keeps the portal attached', () => {
  const buildings: VBuilding[] = JSON.parse(readFileSync(vignette, 'utf8')).buildings;
  const manifest = JSON.parse(readFileSync(new URL('ground.json', scene), 'utf8'));
  const heights = Uint8Array.from(readFileSync(new URL('ground.i16', scene)));
  const grid = new GroundGrid(manifest, heights.buffer);
  const site = buildings.find(b => b.id === h5CourtlandId)!;
  const model = createH5Courtland(buildings, grid)!;
  expect(model.buildings).not.toContain(site);
  expect(model.buildings).toHaveLength(buildings.length - 1);
  expect(footprintReport(model.group, site.rings).count).toBe(0);
  expect(detachedParts(model.group, site.rings)).toHaveLength(0);
});
