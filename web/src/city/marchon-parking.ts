import { type Builder, pointInRing, type P2 } from '../vignette/geom';
import { appendParkedSedan } from '../vignette/parked-sedan';

// October 2023 NAIP, registered to the mapped roof. The long southern edge
// anchors the parking rows. Distances run east along it and north toward rail.
export function dressMarchonDeck(batch: Builder, ring: P2[], roof: number) {
  const length = Math.hypot(81.16, -29.87), dx = 81.16 / length, dz = -29.87 / length;
  const at = (u: number, v: number): P2 => [1416.11 + u * dx + v * dz, 556.11 + u * dz - v * dx];
  const stripe = (u0: number, u1: number, v0: number, v1: number) => {
    const p = (u: number, v: number) => {
      const [x, z] = at(u, v);
      return [x, roof + 0.04, z];
    };
    batch.quad(p(u0, v0), p(u1, v0), p(u1, v1), p(u0, v1), '#ece6d4');
  };
  const paints = ['#909c9c', '#cdc7b7', '#996456', '#687c86'];
  // The gap between the rail-side row and the paired inner rows is the driving aisle.
  // Occupancy is fixed and illustrative. The data does not resolve ramp grades.
  for (const [row, v] of [28, 15, 9.6].entries()) {
    const first = row === 2 ? 19 : 6;
    for (let spot = 0, u = first; u < 77; u += 2.7, spot++) {
      const corners = [at(u - 1.35, v - 2.6), at(u + 1.35, v - 2.6),
        at(u + 1.35, v + 2.6), at(u - 1.35, v + 2.6)];
      if (!corners.every(([x, z]) => pointInRing(x, z, ring))) continue;
      stripe(u - 1.35, u - 1.19, v - 2.55, v + 2.55);
      const head = row === 1 ? v - 2.55 : v + 2.39;
      stripe(u - 1.35, u + 1.35, head, head + 0.16);
      if ((spot + 3 * row) % 11 !== 2) continue;
      const direction = row === 1 ? -1 : 1;
      appendParkedSedan(batch, at(u, v), roof, direction * dz, -direction * dx, paints[(spot + row) % paints.length]);
    }
  }
}
