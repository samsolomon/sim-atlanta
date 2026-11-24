import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

export const medicalGarageId = '770fb440-8914-43bb-8223-38494fec539b';

export function createMedicalGarage(buildings: VBuilding[], grid: GroundGrid) {
  const site = buildings.find((b) => b.id === medicalGarageId);
  const plan = (id: string) =>
    site?.parts?.find((p) => p.id === 'overture:' + id)?.rings[0].map(([x, z]): P2 => [x - 485, z + 1259]);
  const original = plan('bdd899a4-005f-3636-89f3-f2647b5ea245');
  const addition = plan('d62bcf1f-1bc2-382f-a309-2686033e779b');
  const head = plan('09e9a822-d8c5-3a0a-a430-2046e588be65');
  if (!original || !addition || !head) return null;
  const s = landmarkShell(
    buildings,
    grid,
    medicalGarageId,
    'Medical Arts parking garage',
    [485, -1259],
    [1, 0],
    [[0, 0]],
  );
  if (!s) return null;
  const concrete = '#c3bdb1',
    deck = '#827f79',
    buff = '#ad9678';
  // April 2019 lidar, absolute NAVD88. The small head occupies a hole in the
  // original roof outline. Its walls meet the adjacent roof at 317.5 m.
  s.prism(original, s.base, 317.5, buff, deck);
  s.prism(head, 317.5, 322.6, concrete, '#8a8780');
  // Survey photographs 4–5 show a pale concrete frame, a blank brick south
  // elevation and dark openings at the Alexander Street end.
  function strip(a: P2, b: P2, lo: number, hi: number, color: string, offset: number) {
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      length = Math.hypot(dx, dz);
    const ox = (-dz / length) * offset,
      oz = (dx / length) * offset;
    s!.body.quad(
      [a[0] + ox, lo, a[1] + oz],
      [a[0] + ox, hi, a[1] + oz],
      [b[0] + ox, hi, b[1] + oz],
      [b[0] + ox, lo, b[1] + oz],
      color,
    );
  }
  for (let i = 0; i < 4; i++) {
    const a = original[i],
      b = original[i + 1];
    const between = (t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const bays = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 6));
    for (const top of [310.7, 314.1, 317.5]) {
      strip(a, b, top - 0.45, top, concrete, 0.08);
      for (let j = 0; j < bays; j++) {
        strip(between(j / bays), between((j + 0.09) / bays), top - 3.4, top - 0.45, concrete, 0.08);
        if (i < 3)
          strip(
            between((j + 0.16) / bays),
            between((j + 0.92) / bays),
            top - 2.55,
            top - 0.62,
            '#444440',
            0.07,
          );
      }
    }
  }
  // The northern extension has open sides. Place the columns inside its
  // footprint, with the floor edges continuous around the angled highway side.
  const cx = addition.reduce((v, p) => v + p[0], 0) / addition.length;
  const cz = addition.reduce((v, p) => v + p[1], 0) / addition.length;
  for (const [i, a] of addition.entries()) {
    const b = addition[(i + 1) % addition.length];
    // The common edge runs under the original garage. Keep it accessible.
    if (i !== 4) {
      const inset = (p: P2): P2 => [p[0] * 0.94 + cx * 0.06, p[1] * 0.94 + cz * 0.06];
      for (const y of [310.7, 314.1]) strip(inset(a), inset(b), y + 0.75, y + 0.86, '#978768', 0);
    }
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 7);
    for (let j = 0; j < n; j++) {
      const x = (a[0] + ((b[0] - a[0]) * j) / n) * 0.94 + cx * 0.06;
      const z = (a[1] + ((b[1] - a[1]) * j) / n) * 0.94 + cz * 0.06;
      s.prism(
        [
          [x - 0.25, z - 0.25],
          [x + 0.25, z - 0.25],
          [x + 0.25, z + 0.25],
          [x - 0.25, z + 0.25],
        ],
        s.base,
        314.96,
        concrete,
        concrete,
      );
    }
  }
  for (const y of [307.5, 310.7, 314.1]) s.prism(addition, y - 0.32, y, concrete, deck);
  return s.finish();
}
