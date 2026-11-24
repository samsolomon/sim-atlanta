import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { FREIGHT_LENGTH, freightGeometry } from './freight-stock';

describe('enclosed autorack', () => {
  it('fits the Multi-Max envelope and Plate J height', () => {
    expect(FREIGHT_LENGTH.autorack).toBeCloseTo((93 + 10 / 12) * 0.3048, 1);
    for (const low of [false, true]) {
      const g = freightGeometry('autorack', { low });
      g.computeBoundingBox();
      const b = g.boundingBox!;
      expect(b.min.y).toBeCloseTo(0, 4);
      expect(b.max.z - b.min.z).toBeLessThanOrEqual(FREIGHT_LENGTH.autorack + 0.05);
      expect(b.max.x - b.min.x).toBeLessThanOrEqual((10 + 8.44 / 12) * 0.3048 + 0.02);
      expect(b.max.y).toBeLessThanOrEqual(19 * 0.3048 + 0.02);
      expect(g.getAttribute('position').count / 3).toBeLessThanOrEqual(low ? 1000 : 2400);
      g.dispose();
    }
  });
  it('faces the roof and end gables outward', () => {
    const g = freightGeometry('autorack');
    const pos = g.getAttribute('position');
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), mid = new THREE.Vector3();
    let roof = 0;
    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
      // Roof and gable triangles are the only ones reaching the 5.79 m ridge.
      if (Math.max(a.y, b.y, c.y) < 5.7) continue;
      n.subVectors(b, a).cross(c.clone().sub(a));
      mid.addVectors(a, b).add(c).divideScalar(3);
      if (Math.abs(n.z) > Math.abs(n.x) && Math.abs(n.z) > Math.abs(n.y)) expect(Math.sign(n.z)).toBe(Math.sign(mid.z)); // gable
      else { expect(n.y).toBeGreaterThan(0); roof++; }
    }
    expect(roof).toBe(4);
    g.dispose();
  });
});
