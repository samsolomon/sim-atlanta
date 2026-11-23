import { Box3, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import fixtures from './fixtures/midtown-landmarks.json';
import { createMidtownLandmark } from './midtown-landmarks';

const sites: VBuilding[] = fixtures.map(site => ({
  ...site,
  rings: site.rings.map(ring => ring.map(([x,z]) => [x,z])),
}));
it.each(sites)('replaces only the validated $name footprint at scene grade', (site) => {
  const model = createMidtownLandmark(sites, site, -6, () => -2)!;
  expect(model.buildings).toEqual(sites.filter((s) => s !== site));
  const bounds = new Box3().setFromObject(model.group);
  expect(bounds.min.y).toBeCloseTo(-6.35);
  const tower = site === sites[0];
  expect(Math.abs(bounds.max.y - (-2 + (tower ? 311.8 : 28)))).toBeLessThan(0.1);
  const lights = (model.group.children[1] as Mesh).material as MeshLambertMaterial;
  model.setNight(1);
  expect(lights.emissiveIntensity).toBeGreaterThan(0);
  model.setNight(0);
  expect(lights.emissiveIntensity).toBe(0);
  if (tower) {
    // Cast horizontally through an empty bay in the crown, then through the solid office floors.
    const ray = new Raycaster();
    const hits = (height: number, offset: number) => {
      const start = model.group.localToWorld(new Vector3(offset, height, 45));
      const end = model.group.localToWorld(new Vector3(offset, height, 0));
      ray.set(start, end.sub(start).normalize());
      return ray.intersectObjects(model.group.children).length;
    };
    expect([1, 2, 3, 4, 5].some((x) => hits(271.5, x) === 0)).toBe(true);
    expect(hits(100, 1)).toBeGreaterThan(0);
  }
});
it.each(sites)('keeps the generic building when the $name source or terrain is incomplete', (site) => {
  expect(createMidtownLandmark(sites, site, null, () => 0)).toBeNull();
  expect(createMidtownLandmark(sites, site, 0, () => null)).toBeNull();
  const cropped = {
    ...site,
    rings: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
      ],
    ],
  } as VBuilding;
  expect(createMidtownLandmark([cropped], cropped, 0, () => 0)).toBeNull();
});
