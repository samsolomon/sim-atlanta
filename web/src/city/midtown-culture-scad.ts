import { Builder } from '../vignette/geom';
import { stairRun, landscapeMesh } from '../landscape/primitives';
import { localLandmarkShell } from './landmark-shell';
import { surfaces } from '../materials';
import type { VBuilding } from '../vignette/world';
import type { P2 } from '../vignette/geom';

export const scadAtlantaId = 'osm:way:265351173';
/** Mapped stepped parts; facade and lighting estimates documented in docs/scad-atlanta.md. */
export function createScadAtlanta(
  buildings: VBuilding[],
  site: VBuilding,
  base: number | null,
  groundAt: (x: number, z: number) => number | null,
) {
  if (site.id !== scadAtlantaId || base === null || site.rings.length !== 1 || !site.parts?.length) return null;
  const origin: P2 = [52, -4774],
    axis: P2 = [0.792, 0.61];
  const len = Math.hypot(...axis),
    c = axis[0] / len,
    sn = axis[1] / len;
  const local = ([x, z]: P2): P2 => [
    (x - origin[0]) * c + (z - origin[1]) * sn,
    -(x - origin[0]) * sn + (z - origin[1]) * c,
  ];
  const grade = groundAt(81, -4736);
  if (grade === null) return null;
  const s = localLandmarkShell(
    buildings,
    site,
    'SCAD Atlanta',
    origin,
    axis,
    [
      [0, 40],
      [0, -75],
    ],
    base - grade,
    grade,
  );
  if (!s) return null;
  const { body: b, lights, prism } = s,
    wall = '#50545a',
    concrete = '#a4a29a',
    glass = '#667779';
  prism(s.ring, s.base, 0.1, concrete, concrete, { wall: surfaces.concrete() });
  for (const part of site.parts) {
    if (part.rings.length !== 1 || !Number.isFinite(part.h) || part.h <= 0) return null;
    const ring = part.rings[0].map(local);
    const area = ring.reduce((sum, p, i) => {
      const q = ring[(i + 1) % ring.length];
      return sum + p[0] * q[1] - q[0] * p[1];
    }, 0);
    if (area < 0) ring.reverse();
    const mid = ring.reduce((n, p) => n + p[1], 0) / ring.length;
    const academic = mid > 5;
    const h = part.h;
    prism(ring, 0, h, academic ? wall : concrete, academic ? '#787b78' : '#858781', {
      wall: academic ? surfaces.precast({ width: 3.6, height: 3.3 }) : surfaces.concrete(),
      roof: surfaces.asphaltRoof(),
    });
    // Mapped part edges define recesses and terraces; keep windows above lower neighbours.
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i],
        d = ring[(i + 1) % ring.length];
      const dx = d[0] - a[0],
        dz = d[1] - a[1],
        length = Math.hypot(dx, dz);
      if (length < 8) continue;
      const nx = dz / length,
        nz = -dx / length;
      if (academic && h > 15) {
        s.facade(a, d, 3.8, h - 3.5, Math.max(1, Math.floor((h - 6) / 4)), 4.5, 0.42, 0.5, [glass, '#87908a'], 0.38);
        const n = Math.round(length / 4.5);
        s.paint(surfaces.precast({ width: 3.6, height: 3.3 }), () => {
          for (let k = 1; k < n; k++) {
            const x = a[0] + (dx * k) / n,
              z = a[1] + (dz * k) / n;
            const at = (t: number, y: number, out: number) => [
              x + (dx / length) * t + nx * out,
              y,
              z + (dz / length) * t + nz * out,
            ];
            b.quad(at(-0.36, 3.1, 0.55), at(-0.36, h, 0.55), at(0.36, h, 0.55), at(0.36, 3.1, 0.55), wall);
            for (const side of [-0.36, 0.36])
              b.quad(at(side, 3.1, 0), at(side, h, 0), at(side, h, 0.55), at(side, 3.1, 0.55), '#45494e');
          }
        });
      } else if (!academic) {
        // Open parking ribbons, interrupted by piers, under the mapped deck parapets.
        for (let y = 2; y < h - 1; y += 3.3) {
          const at = (t: number, yy: number) => [a[0] + dx * t + nx * 0.08, yy, a[1] + dz * t + nz * 0.08];
          b.quad(at(0, y - 0.7), at(0, y + 0.55), at(1, y + 0.55), at(1, y - 0.7), '#394347');
          for (let t = 3; t < length; t += 7) {
            b.quad(
              at((t - 0.35) / length, y - 0.7),
              at((t - 0.35) / length, y + 0.55),
              at((t + 0.35) / length, y + 0.55),
              at((t + 0.35) / length, y - 0.7),
              concrete,
            );
          }
        }
      }
    }
  }
  // Peachtree entrance: canopy, glazing and abstract illuminated display cases.
  // The exterior photo establishes the rhythm, not the copyrighted exhibition graphics.
  const face = 40.6,
    centre = 38;
  b.box(2.1, 0.35, 26, face + 0.7, 3.25, centre, '#353b41');
  lights.box(0.12, 2.7, 7, face + 0.12, 1.55, centre, '#b2c3af');
  for (const z of [centre - 10, centre + 10]) {
    b.box(0.16, 2.7, 2.1, face + 0.14, 1.55, z, '#d9d2b9');
    lights.box(0.18, 2.4, 1.8, face + 0.18, 1.55, z, '#e3bf80');
  }
  for (const z of [centre - 2.2, centre, centre + 2.2]) b.box(0.2, 2.65, 0.08, face + 0.21, 1.55, z, '#c3c8bf');
  lights.box(0.2, 0.45, 3.6, face + 0.25, 3.75, centre, '#b2ddf7');
  const world = (u: number, v: number): P2 => [origin[0] + c * u - sn * v, origin[1] + sn * u + c * v];
  const foot = world(face + 7, centre),
    threshold = world(face + 0.2, centre);
  if (groundAt(...foot) === null) return null;
  const steps = new Builder();
  const cut = stairRun(steps, foot, threshold, 5, groundAt, { toY: grade + 0.2 });
  const stairs = landscapeMesh(steps);
  const model = s.finish('#ffe4b1', 0.5);
  model.group.updateMatrix();
  stairs.mesh.geometry.applyMatrix4(model.group.matrix.clone().invert());
  model.group.add(stairs.mesh);
  return { ...model, yields: cut ? [cut] : [] };
}
