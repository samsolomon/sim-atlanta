import { Color, Group, InstancedMesh, Matrix4, Mesh, PerspectiveCamera } from 'three';
import { expect, it, vi } from 'vitest';
import { Line } from '../vignette/geom';
import { createFigurePreview, StreetFigures } from './street-figures';
import type { Traveller } from './walkways';

it.each(['walker', 'cyclist'] as const)('previews the detailed City %s in place through a complete cycle', kind => {
  const rider = kind === 'cyclist';
  const person: Traveller = { way: { line: new Line([[0, 0], [0, 25]]), from: 0, to: 25, trail: rider },
    rider, size: 1, tint: 0, phase: 0, speed: 1 };
  const city = new StreetFigures([person], () => 0, false);
  const camera = new PerspectiveCamera(45, 1, .1, 100);
  camera.position.set(0, 2, 8);
  camera.lookAt(0, 1, 0);
  const preview = createFigurePreview(kind);
  for (const cycle of [0, .25, .75, 1]) {
    person.phase = cycle * 2 * Math.PI / (rider ? 1.55 : 4.1);
    // Change the camera slightly to refresh City's batches at the same clock.
    camera.position.y += .001;
    city.update(0, camera, 800);
    preview.setPhase(cycle);
    const batches = city.group.children.filter(m => m instanceof InstancedMesh && m.count > 0) as InstancedMesh[];
    const rootInverse = new Matrix4();
    batches[0].getMatrixAt(0, rootInverse);
    rootInverse.invert();
    let partIndex = 0;
    for (const batch of batches) {
      for (let i = 0; i < batch.count; i++) {
        const part = preview.group.children[partIndex++] as Mesh;
        expect(part.geometry.attributes.position.array).toEqual(batch.geometry.attributes.position.array);
        expect(part.geometry.attributes.color.array).toEqual(batch.geometry.attributes.color.array);
        const tint = new Color();
        if (batch.instanceColor) batch.getColorAt(i, tint);
        expect(part.material).toMatchObject({ color: { r: expect.closeTo(tint.r), g: expect.closeTo(tint.g), b: expect.closeTo(tint.b) } });
        const matrix = new Matrix4();
        batch.getMatrixAt(i, matrix);
        matrix.premultiply(rootInverse);
        matrix.elements.forEach((value, j) => expect(part.matrix.elements[j]).toBeCloseTo(value, 6));
      }
    }
    expect(partIndex).toBe(rider ? 3 : 6);
    expect(preview.group.children).toHaveLength(partIndex);
  }
  city.dispose();
  preview.dispose();
});

it('detaches a preview and releases each shared part and tint once', () => {
  const preview = createFigurePreview('walker');
  const parent = new Group();
  parent.add(preview.group);
  const parts = preview.group.children as Mesh[];
  const resources = new Set(parts.flatMap(m => [m.geometry, ...[m.material].flat()]));
  const disposed = [...resources].map(resource => vi.spyOn(resource, 'dispose'));
  preview.dispose();
  expect(parent.children).toHaveLength(0);
  for (const dispose of disposed) expect(dispose).toHaveBeenCalledTimes(1);
});
