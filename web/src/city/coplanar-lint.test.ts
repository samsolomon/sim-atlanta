import { BufferGeometry, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial } from 'three';
import { expect, it } from 'vitest';
import { coplanarLayers } from './skin-kit';

/** A vertical 4 x 3 m quad facing +z (or -z when `back`), at depth z, far from the origin like City. */
function quad(z: number, back = false, x0 = 900, x1 = 904) {
  const [a, b, c, d] = [[x0, 300, z], [x1, 300, z], [x1, 303, z], [x0, 303, z]];
  const tris = back ? [a, c, b, a, d, c] : [a, b, c, a, c, d];
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(tris.flat(), 3));
  return new Mesh(g, new MeshBasicMaterial());
}
const group = (...meshes: Mesh[]) => { const g = new Group(); for (const m of meshes) g.add(m); return g; };

it('flags a layer 1 cm off its wall and reports the gap', () => {
  const r = coplanarLayers(group(quad(-700), quad(-700 + 0.01)));
  expect(r.pairs).toBeGreaterThan(0);
  expect(r.worst!.gap).toBeCloseTo(0.01, 3);
});

it('passes layers 4 cm off, back-to-back faces, one quad\'s halves, and edge-touching neighbours', () => {
  expect(coplanarLayers(group(quad(-700), quad(-700 + 0.04))).pairs).toBe(0);
  expect(coplanarLayers(group(quad(-700), quad(-700 + 0.01, true))).pairs).toBe(0);
  expect(coplanarLayers(group(quad(-700))).pairs).toBe(0);
  expect(coplanarLayers(group(quad(-700, false, 900, 904), quad(-700.01, false, 904, 908))).pairs).toBe(0);
});
