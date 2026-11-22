import { PerspectiveCamera } from 'three';
import { expect, it } from 'vitest';
import { Line } from '../vignette/geom';
import { createTrailPlanting } from './trail-planting';
import type { Traveller } from './walkways';

const way = { line: new Line([[-806.32, -1089.27], [-787.79, -1091.27], [-771.01, -1093.55]]), from: 2, to: 32, trail: true };
const traveller: Traveller = { way, rider: true, phase: 0, speed: 4, size: 1, look: 0 };
const ground = (x: number, z: number) => .01 * (x + 800) + .02 * (z + 1090);
const camera = new PerspectiveCamera(22, 1, 1, 5000);
camera.position.set(-790, 70, -1000);

it('only plants the identified ground run with usable terrain', () => {
  const bridge = new Line([[-771.01, -1093.55], [-533.57, -1132.46]]);
  expect(createTrailPlanting([{ ...traveller, way: { ...way, line: bridge } }], ground, false)).toBeNull();
  expect(createTrailPlanting([{ ...traveller, way: { ...way, trail: false } }], ground, false)).toBeNull();
  expect(createTrailPlanting([traveller], () => null, false)).toBeNull();
});

it('keeps the roots and earth flecks fixed and restores the rest pose for reduced motion', () => {
  const layer = createTrailPlanting([traveller], ground, false)!;
  const pos = layer.mesh.geometry.getAttribute('position');
  const rest = Array.from(pos.array);
  layer.update(1900, camera, 840, false);
  expect(layer.mesh.visible).toBe(true);
  let roots = 0, flecks = 0, moving = 0;
  for (let i = 0; i < pos.count; i++) {
    const [x, y, z] = rest.slice(3 * i, 3 * i + 3);
    const height = y - ground(x, z);
    if (height < .025) {
      expect(pos.getX(i)).toBe(x);
      expect(pos.getZ(i)).toBe(z);
      if (height < .005) roots++;
      else flecks++;
    } else if (pos.getX(i) !== x) moving++;
  }
  expect(Math.min(roots, flecks, moving)).toBeGreaterThan(0);
  layer.update(1900, camera, 840, true);
  expect(Array.from(pos.array)).toEqual(rest);
  layer.update(6300, camera, 840, true);
  expect(Array.from(pos.array)).toEqual(rest);
  layer.dispose();
});

it('uses fewer blades on low and skips mesh uploads and draws at overview scale', () => {
  const low = createTrailPlanting([traveller], ground, true)!;
  const high = createTrailPlanting([traveller], ground, false)!;
  expect(low.mesh.geometry.getAttribute('position').count).toBeLessThan(high.mesh.geometry.getAttribute('position').count);
  const far = camera.clone();
  far.position.set(-790, 2200, -1090);
  low.update(1000, far, 840, false);
  expect(low.mesh.visible).toBe(false);
  expect(low.mesh.geometry.getAttribute('position')).toHaveProperty('version', 0);
  low.dispose();
  high.dispose();
});
