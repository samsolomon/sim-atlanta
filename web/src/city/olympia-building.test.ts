import { expect, it } from 'vitest';
import { Color, type Mesh, type MeshBasicMaterial } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createOlympia, olympiaId } from './olympia-building';

// The staged outline (downtown vignette.json) on flat ground at 318.5 m NAVD88.
const site: VBuilding = {
  id: olympiaId, h: 27.5, floors: 2, cls: 'retail', name: 'Olympia Building',
  rings: [[[180.12, -49.8], [214.9, -27.06], [235.0, -58.02], [185.25, -57.84]]],
} as VBuilding;
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 600,
    bounds: { minX: -100, maxX: 500, minZ: -300, maxZ: 300 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(3185).buffer,
);

it('lights the billboard and offices through one night-only overlay, with no lamp mesh', () => {
  const model = createOlympia([site], grid)!;
  const meshes = model.group.children as Mesh[];
  // The batched body, plus the overlay: no lamp mesh, which would cost its own night draw.
  expect(meshes).toHaveLength(2);
  const glow = meshes.find(m => (m.material as MeshBasicMaterial).transparent)!;
  expect(glow).toBeDefined();
  model.setNight(0);
  expect(glow.visible).toBe(false);
  model.setNight(1);
  expect(glow.visible).toBe(true);
  expect((glow.material as MeshBasicMaterial).opacity).toBe(1);
  // A transparent double-sided material draws twice unless it is forced to one pass.
  expect((glow.material as MeshBasicMaterial).forceSinglePass).toBe(true);
  // The sign glows in its own colours, not one neutral white: at least four distinct hues.
  const c = glow.geometry.attributes.color, hues = new Set<number>(), hsl = { h: 0, s: 0, l: 0 };
  for (let i = 0; i < c.count; i++) {
    new Color(c.getX(i), c.getY(i), c.getZ(i)).getHSL(hsl);
    if (hsl.s > 0.4) hues.add(Math.round(hsl.h * 12));
  }
  expect(hues.size).toBeGreaterThanOrEqual(4);
  // The offices glow too: lit panes add the warm white a lamp mesh would (#f7ecd8 at 0.75),
  // below the sign, where the building's three storeys are.
  const warm = new Color('#f7ecd8').multiplyScalar(0.75), p = glow.geometry.attributes.position;
  let panes = 0;
  for (let i = 0; i < c.count; i++)
    if (Math.abs(c.getX(i) - warm.r) + Math.abs(c.getY(i) - warm.g) + Math.abs(c.getZ(i) - warm.b) < 1e-3 && p.getY(i) < 318.5 + 12) panes++;
  expect(panes).toBeGreaterThan(0);
});
