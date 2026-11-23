import { Box3, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import { createDowntownTerrain } from '../terrain/model';
import type { VBuilding } from '../vignette/world';
import fixtures from './fixtures/midtown-landmarks.json';
import { createMidtownLandmark } from './midtown-landmarks';

const sites: VBuilding[] = fixtures.map((site) => ({
  ...site,
  rings: site.rings.map((ring) => ring.map(([x, z]) => [x, z])),
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
it('seats the terraced frame on the roof and lights the separate faceted obelisk at night', () => {
  const model = createMidtownLandmark(sites, sites[0], -1, () => 0)!;
  const roof = new Box3().setFromObject(model.group.children[0]);
  const crown = model.group.getObjectByName('Terraced rose steel') as Mesh;
  const obelisk = model.group.getObjectByName('Faceted obelisk') as Mesh;
  const steel = new Box3().setFromObject(crown),
    tip = new Box3().setFromObject(obelisk);
  expect(steel.min.y).toBeCloseTo(roof.max.y, 1);
  expect(tip.min.y).toBeCloseTo(285.2);
  expect(tip.max.y - tip.min.y).toBeCloseTo(26.6);
  const frameLight = crown.material as MeshLambertMaterial,
    tipLight = obelisk.material as MeshLambertMaterial;
  model.setNight(0);
  expect(frameLight.emissiveIntensity).toBe(0);
  expect(tipLight.emissiveIntensity).toBe(0);
  model.setNight(1);
  expect(frameLight.emissiveIntensity).toBeGreaterThan(1);
  expect(tipLight.emissiveIntensity).toBeGreaterThan(1);
  expect(tipLight.emissive.b).toBeGreaterThan(frameLight.emissive.b);
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

afterEach(() => vi.unstubAllGlobals());

it('mounts both models in terrain, suppresses their generic roofs and forwards night lighting', () => {
  const ctx = new Proxy({}, { get: () => () => {} });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  const bounds = { minX: 450, maxX: 650, minZ: -2150, maxZ: -1850 };
  const grid = new GroundGrid(
    {
      version: 1,
      rows: 61,
      cols: 41,
      stepM: 5,
      bounds,
      scaleM: 0.1,
      offsetM: 0,
      encoding: 'signed int16 little-endian',
      noData: -32768,
      vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
      sha256: '',
    },
    new Int16Array(61 * 41).fill(3000).buffer,
  );
  const area = createDowntownTerrain(grid, { bounds, buildings: sites, roads: [], rail: [] }, [], {
    quality: 'low',
  });
  try {
    area.setNight(1);
    const bank = area.scenery.getObjectByName('Bank of America Plaza')!;
    const fox = area.scenery.getObjectByName('Fox Theatre')!;
    const generic = area.scenery.children.filter((child) => child !== bank && child !== fox);
    area.group.updateMatrixWorld(true);
    for (const [model, x, z] of [
      [bank, 505, -1886],
      [fox, 555, -2080],
    ] as const) {
      const ray = new Raycaster(new Vector3(x, 500, z), new Vector3(0, -1, 0));
      expect(ray.intersectObject(model).length).toBeGreaterThan(0);
      expect(ray.intersectObjects(generic)).toHaveLength(0);
      expect(((model.children[1] as Mesh).material as MeshLambertMaterial).emissiveIntensity).toBeGreaterThan(0);
    }
  } finally {
    area.dispose();
  }
});
