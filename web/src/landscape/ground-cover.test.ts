import { expect, it } from 'vitest';
import { COVERS, GroundCover } from './ground-cover';
import type { P2 } from '../vignette/geom';

// A 2.4 m bank across z = -3…3: a flat outline fill would float above the lower lawn.
const bank = (_x: number, z: number) => { const t = Math.max(0, Math.min(1, (3 - z) / 6)); return 2.4 * t * t * (3 - 2 * t); };

it('drapes every cover on the ground, exactly inside its ring, in one draw', () => {
  const ring: P2[] = [[-16, -16], [16, -16], [16, 16], [-16, 16]];
  const high = new GroundCover(), low = new GroundCover();
  for (const [i, cover] of COVERS.entries()) {
    high.patch(ring.map(([x, z]) => [x + i * 40, z] as P2), bank, cover);
    low.patch(ring.map(([x, z]) => [x + i * 40, z] as P2), bank, cover, { quality: 'low' });
  }
  const built = high.mesh();
  expect(built.draws).toBe(1);
  expect(low.triangles).toBeLessThan(high.triangles / 2);
  const p = built.mesh.geometry.getAttribute('position'), kind = built.mesh.geometry.getAttribute('aCover');
  for (let i = 0; i < p.count; i++) {
    // Each vertex sits 2 cm above the slope: none floats over the lower lawn.
    expect(p.getY(i) - bank(p.getX(i), p.getZ(i))).toBeCloseTo(.02, 4);
    const x = p.getX(i) - Math.round(kind.getX(i)) * 40;
    expect(Math.abs(x) <= 16 + 1e-4 && Math.abs(p.getZ(i)) <= 16 + 1e-4).toBe(true);
  }
  built.dispose();
});
