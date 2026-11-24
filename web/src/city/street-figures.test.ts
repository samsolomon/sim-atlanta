import { Group, InstancedMesh, Matrix4, Mesh, MeshLambertMaterial, PerspectiveCamera } from 'three';
import { expect, it, vi } from 'vitest';
import { figureLooks } from './figure-looks';
import { Line } from '../vignette/geom';
import { createFigurePreview, StreetFigures } from './street-figures';
import { travelSpeed, type Traveller } from './walkways';

it.each(['walker', 'cyclist'] as const)('previews the detailed City %s in place through a complete cycle', kind => {
  const rider = kind === 'cyclist';
  const person: Traveller = { way: { line: new Line([[0, 0], [0, 25]]), from: 0, to: 25, trail: rider },
    rider, size: 1, look: 0, phase: 0, speed: travelSpeed(rider, .5) };
  const city = new StreetFigures([person], () => 0, false);
  const camera = new PerspectiveCamera(45, 1, .1, 100);
  camera.position.set(0, 2, 8);
  camera.lookAt(0, 1, 0);
  const preview = createFigurePreview(kind);
  for (const [look, cycle] of [0, .25, .75, 1].entries()) {
    person.look = look;
    preview.setLook(look);
    person.phase = cycle / preview.cyclesPerSecond * person.speed;
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
        expect(part.geometry.attributes.uv.array).toEqual(batch.geometry.attributes.uv.array);
        const map = (part.material as MeshLambertMaterial).map!;
        const rowOffset = batch.geometry.getAttribute('lookOffset').getX(i);
        expect(rowOffset).toBe(look / figureLooks.length);
        expect(map.offset.y).toBe(rowOffset);
        const matrix = new Matrix4();
        batch.getMatrixAt(i, matrix);
        matrix.premultiply(rootInverse);
        matrix.elements.forEach((value, j) => expect(part.matrix.elements[j]).toBeCloseTo(value, 6));
      }
    }
    expect(partIndex).toBe(rider ? 3 : 6);
    expect(preview.group.children).toHaveLength(partIndex);
  }
  camera.position.set(0, 2, 900);
  camera.far = 2000;
  camera.lookAt(0, 1, 0);
  camera.updateProjectionMatrix();
  city.update(0, camera, 800);
  const far = city.group.children.filter(m => m instanceof InstancedMesh && m.count) as InstancedMesh[];
  expect(far).toHaveLength(1);
  expect(far[0].geometry.getAttribute('lookOffset').getX(0)).toBe(person.look / figureLooks.length);
  city.dispose();
  preview.dispose();
});

it('uses multiple wardrobes, bag choices and frame paints within each skin tone', () => {
  const skins = new Set(figureLooks.map(look => look.skin));
  expect(skins.size).toBe(6);
  for (const skin of skins) {
    const subset = figureLooks.filter(look => look.skin === skin);
    for (const key of ['top', 'trousers', 'frame'] as const) expect(new Set(subset.map(look => look[key])).size).toBeGreaterThan(1);
    expect(subset.some(look => look.pack === null)).toBe(true);
    expect(new Set(subset.map(look => look.pack).filter(Boolean)).size).toBeGreaterThan(1);
  }
});

it('applies pack presence and the selected sRGB colours to the actual palette texture', () => {
  const preview = createFigurePreview('cyclist');
  const material = (preview.group.children[0] as Mesh).material as MeshLambertMaterial;
  const texture = material.map!;
  const image = texture.image as { data: Uint8Array; width: number };
  for (const [i, look] of figureLooks.entries()) {
    preview.setLook(i);
    const start = Math.round(texture.offset.y * figureLooks.length) * image.width * 4;
    for (const [col, value] of ['#ffffff', look.skin, look.top, look.trousers, look.pack, look.frame].entries()) {
      const pixel = image.data.slice(start + col * 4, start + (col + 1) * 4);
      expect(pixel[3]).toBe(value ? 255 : 0);
      if (value) expect(Array.from(pixel.slice(0, 3), byte => byte.toString(16).padStart(2, '0')).join('')).toBe(value.slice(1));
    }
  }
  expect(material.alphaTest).toBeGreaterThan(0);
  preview.dispose();
});

it('detaches a preview and releases each shared part, material and palette texture once', () => {
  const preview = createFigurePreview('walker');
  const parent = new Group();
  parent.add(preview.group);
  const parts = preview.group.children as Mesh[];
  const resources = new Set<{ dispose(): void }>(parts.flatMap(m => [m.geometry, ...[m.material].flat()]));
  resources.add((parts[0].material as MeshLambertMaterial).map!);
  const disposed = [...resources].map(resource => vi.spyOn(resource, 'dispose'));
  preview.dispose();
  expect(parent.children).toHaveLength(0);
  for (const dispose of disposed) expect(dispose).toHaveBeenCalledTimes(1);
});

it.each([true, false])('reuses City batches for museum visitors and empties them at night (low=%s)', low => {
  const figures = new StreetFigures([], () => null, low, () => 0);
  const camera = new PerspectiveCamera(60, 2, .1, 1500);
  camera.position.set(560, 170, -3830);
  camera.lookAt(560, 0, -3990);
  const meshes = figures.group.children as InstancedMesh[];
  expect(new Set(meshes.map(m => m.material)).size).toBe(1);
  figures.update(Date.parse('2026-11-20T13:00:00-05:00'), camera, 100);
  const count = () => meshes.reduce((sum, mesh) => sum + mesh.count, 0);
  expect(count()).toBe(low ? 8 : 14);
  figures.update(Date.parse('2026-11-20T23:00:00-05:00'), camera, 100);
  expect(count()).toBe(0);
  figures.dispose();
});
