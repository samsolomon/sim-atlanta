import { Builder, type P2 } from './geom';
import { SEDAN } from './vehicles';

/** A static road sedan facing along (dx, dz), in the deck's vertex-colour batch. */
export function appendParkedSedan(b: Builder, center: P2, pavement: number, dx: number, dz: number, paint: string) {
  const at = (along: number, across: number, up: number) => [
    center[0] + along * dx - across * dz,
    pavement + up,
    center[1] + along * dz + across * dx,
  ];
  const ring = (rear: number, front: number, halfWidth: number, y: number) => [
    at(rear, -halfWidth, y),
    at(front, -halfWidth, y),
    at(front, halfWidth, y),
    at(rear, halfWidth, y),
  ];
  const join = (bottom: number[][], top: number[][], colour: string) => {
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      b.quad(bottom[i], bottom[j], top[j], top[i], colour);
    }
  };

  const half = SEDAN.width / 2,
    end = SEDAN.length / 2;
  const sill = ring(-end, end, half, SEDAN.sill);
  const ends = [
    at(-end + 0.06, -half, 0.8),
    at(end - 0.08, -half, 0.74),
    at(end - 0.08, half, 0.74),
    at(-end + 0.06, half, 0.8),
  ];
  const windows = ring(-1.9, 0.95, half, 0.94);
  b.quad(sill[3], sill[2], sill[1], sill[0], '#323437');
  b.quad(sill[0], sill[3], ends[3], ends[0], paint);
  b.quad(sill[1], sill[2], ends[2], ends[1], paint);
  for (const [rear, front] of [
    [0, 1],
    [3, 2],
  ]) {
    b.quad(sill[rear], sill[front], ends[front], ends[rear], paint);
    b.quad(ends[rear], ends[front], windows[front], windows[rear], paint);
  }
  b.quad(ends[0], windows[0], windows[3], ends[3], paint);
  b.quad(windows[1], ends[1], ends[2], windows[2], paint);

  for (const front of [-1, 1]) {
    const capHeight = front > 0 ? 0.74 : 0.8,
      retreat = front > 0 ? 0.08 : 0.06;
    const lens = (across: number, y: number) =>
      at(front * (end + 0.006 - (retreat * (y - SEDAN.sill)) / (capHeight - SEDAN.sill)), across, y);
    for (const side of [-1, 1]) {
      b.quad(
        lens(side * 0.49, 0.58),
        lens(side * 0.83, 0.58),
        lens(side * 0.83, 0.71),
        lens(side * 0.49, 0.71),
        front > 0 ? '#d5d9cb' : '#a74e45'
      );
    }
  }
  const roof = ring(-1.15, 0.2, 0.7, SEDAN.roof);
  join(windows, roof, '#50616b');
  b.quad(roof[0], roof[1], roof[2], roof[3], paint);

  const r = SEDAN.tireRadius;
  // A flat contact patch at y=0 puts real rubber on the roof. The far upper
  // tread is inside the body. Omit those hidden faces from the static batch.
  const tire: P2[] = [
    [-0.42, 0],
    [0.42, 0],
    [1, 0.58],
    [1, 1.42],
    [0.42, 2],
    [-0.42, 2],
    [-1, 1.42],
    [-1, 0.58],
  ];
  for (const side of [-1, 1]) {
    const outside = side * (half + 0.08),
      inside = side * (half - 0.18);
    for (const axle of [-0.31 * SEDAN.length, 0.31 * SEDAN.length]) {
      const face = tire.map(([z, y]) => at(axle + z * r, outside, y * r));
      for (let i = 1; i < face.length - 1; i++) b.tri(face[0], face[i], face[i + 1], '#242528');
      for (const i of [1, 2, 6, 7]) {
        const j = (i + 1) % tire.length;
        b.quad(
          face[i],
          face[j],
          at(axle + tire[j][0] * r, inside, tire[j][1] * r),
          at(axle + tire[i][0] * r, inside, tire[i][1] * r),
          '#292a2a'
        );
      }
      const hub = outside + side * 0.008;
      b.quad(
        at(axle - 0.13, hub, r),
        at(axle, hub, r + 0.12),
        at(axle + 0.13, hub, r),
        at(axle, hub, r - 0.12),
        '#9a9b93'
      );
    }
    // A dark B-pillar separates the side glass, at the actual glass surface.
    b.quad(
      at(-0.5, side * (half + 0.004), 0.94),
      at(-0.4, side * (half + 0.004), 0.94),
      at(-0.4, side * 0.704, SEDAN.roof),
      at(-0.5, side * 0.704, SEDAN.roof),
      '#30383b'
    );
  }
}
