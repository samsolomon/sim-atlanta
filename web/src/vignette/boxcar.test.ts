import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { FREIGHT_LENGTH, freightGeometry } from './freight-stock';

describe('boxcar paint variants', () => {
  const units = ['boxcar', 'boxcarFaded', 'boxcarBlue'] as const;
  it('share one envelope and differ only in vertex colour (plus faded patches)', () => {
    const [oxide, faded, blue] = units.map((u) => freightGeometry(u));
    const box = (g: THREE.BufferGeometry) => (g.computeBoundingBox(), g.boundingBox!);
    for (const g of [faded, blue]) expect(box(g).equals(box(oxide))).toBe(true);
    expect(Array.from(blue.getAttribute('position').array)).toEqual(Array.from(oxide.getAttribute('position').array));
    expect(Array.from(blue.getAttribute('color').array)).not.toEqual(Array.from(oxide.getAttribute('color').array));
    // Three painted-out patches per side, two triangles each.
    expect(faded.getAttribute('position').count - oxide.getAttribute('position').count).toBe(3 * 2 * 2 * 3);
    for (const u of units) expect(FREIGHT_LENGTH[u]).toBe(16.8);
    [oxide, faded, blue].forEach((g) => g.dispose());
  });

  it('faces every painted-out patch outward', () => {
    const g = freightGeometry('boxcarFaded');
    const p = g.getAttribute('position'), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    let patches = 0;
    for (let i = 0; i < p.count; i += 3) {
      a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
      // Patches are the only triangles lying flat in the plane x = ±1.523.
      if (![a, b, c].every((v) => Math.abs(Math.abs(v.x) - 1.523) < 1e-4)) continue;
      patches++;
      const n = b.sub(a).cross(c.sub(a));
      expect(Math.sign(n.x)).toBe(Math.sign(a.x));
    }
    expect(patches).toBe(12);
    g.dispose();
  });
});
