import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { FREIGHT_LENGTH, freightGeometry } from './freight-stock';

describe('aluminum coal hopper', () => {
  it('fits the 4,323 cu ft envelope, with the heap a little above the rim', () => {
    expect(FREIGHT_LENGTH.coalLoaded).toBeCloseTo((53 + 1 / 12) * 0.3048, 2);
    for (const kind of ['coalLoaded', 'coalEmpty'] as const) for (const low of [false, true]) {
      const g = freightGeometry(kind, { low });
      g.computeBoundingBox();
      const b = g.boundingBox!;
      expect(b.min.y).toBeCloseTo(0, 4);
      expect(b.max.z - b.min.z).toBeLessThanOrEqual(FREIGHT_LENGTH[kind] + 0.05);
      expect(b.max.x - b.min.x).toBeLessThanOrEqual((10 + 8 / 12) * 0.3048 + 0.02);
      expect(b.max.y).toBeLessThanOrEqual((13 + 4 / 12) * 0.3048 + (kind === 'coalLoaded' ? 0.4 : 0.02));
      expect(g.getAttribute('position').count / 3).toBeLessThanOrEqual(low ? 850 : 2000);
      g.dispose();
    }
  });
  it('shows each sloped end sheet from outside as well as inside', () => {
    const g = freightGeometry('coalEmpty');
    const pos = g.getAttribute('position');
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const facing = { out: 0, in: 0 };
    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
      const n = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
      // Slope sheets are the only faces tilted between vertical and horizontal along the car.
      if (Math.abs(n.z) < 0.3 || Math.abs(n.y) < 0.3 || Math.abs(n.x) > 0.3) continue;
      const mid = (a.z + b.z + c.z) / 3;
      if (Math.sign(n.z) === Math.sign(mid)) facing.out++; else facing.in++;
    }
    expect(facing.out).toBeGreaterThanOrEqual(4);
    expect(facing.in).toBeGreaterThanOrEqual(4);
    g.dispose();
  });
});
