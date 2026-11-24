/** Structural evidence is provided by the caller. Coordinates and width are scene metres. */
export interface OpenSlot {
  start: readonly [x: number, bedY: number, z: number];
  end: readonly [x: number, bedY: number, z: number];
  halfWidthM: number;
  crossAxis?: readonly [number, number];
}

type Plane = (x: number, y: number, z: number) => number;

export function slotPlanes({ start, end, halfWidthM, crossAxis }: OpenSlot) {
  const [x, y, z] = start;
  const dx = end[0] - x, dy = end[1] - y, dz = end[2] - z;
  const length = Math.hypot(dx, dz);
  if (![...start, ...end, halfWidthM].every(Number.isFinite) || !length || halfWidthM <= 0) {
    throw new Error('Invalid open-slot segment');
  }
  const [vx, vz] = crossAxis ?? [dz / length, -dx / length];
  const determinant = dx * vz - dz * vx;
  const along = (px: number, pz: number) => ((px - x) * vz - (pz - z) * vx) * length / determinant;
  const across = (px: number, pz: number) => (dx * (pz - z) - dz * (px - x)) / determinant;
  const planes: Plane[] = [
    (px, _y, pz) => along(px, pz), (px, _y, pz) => length - along(px, pz),
    (px, _y, pz) => halfWidthM - across(px, pz), (px, _y, pz) => halfWidthM + across(px, pz),
    (px, py, pz) => py - (y + along(px, pz) * dy / length) - 1e-6,
  ];
  const wx = halfWidthM * Math.abs(vx), wz = halfWidthM * Math.abs(vz);
  return { planes, minX: Math.min(x, end[0]) - wx, maxX: Math.max(x, end[0]) + wx,
    minZ: Math.min(z, end[2]) - wz, maxZ: Math.max(z, end[2]) + wz };
}

/** Subtract an oriented slot from one convex terrain face. All split vertices stay on
 * the original terrain plane. A slot narrower than a grid cell still has exact ends. */
export function subtractSlot(face: number[], planes: Plane[], positions: number[],
  add: (x: number, y: number, z: number) => number): number[][] {
  let inside = face;
  const kept: number[][] = [];
  for (const plane of planes) {
    const distances = inside.map(i => plane(positions[3*i], positions[3*i+1], positions[3*i+2]));
    if (distances.every(d => d <= 0)) return [face];
    if (distances.every(d => d >= 0)) continue;
    const positive: number[] = [], negative: number[] = [];
    for (let i = 0; i < inside.length; i++) {
      const j = (i + 1) % inside.length;
      const a = inside[i], b = inside[j], da = distances[i], db = distances[j];
      if (da >= 0) positive.push(a);
      if (da <= 0) negative.push(a);
      if (da * db < 0) {
        const t = da / (da - db);
        const mix = (axis: number) => positions[3*a+axis] + t * (positions[3*b+axis] - positions[3*a+axis]);
        const cut = add(mix(0), mix(1), mix(2));
        positive.push(cut);
        negative.push(cut);
      }
    }
    if (negative.length >= 3) kept.push(negative);
    inside = positive;
  }
  return kept;
}

/** Split one convex terrain face by a convex region: the part inside every plane
 * (distance >= 0) and the pieces outside, sharing their cut vertices. Split
 * vertices stay on the face's own plane. */
export function splitConvex(face: number[], planes: Plane[], positions: number[],
  add: (x: number, y: number, z: number) => number): { inside: number[] | null; outside: number[][] } {
  let inside = face;
  const outside: number[][] = [];
  for (const plane of planes) {
    const distances = inside.map(i => plane(positions[3*i], positions[3*i+1], positions[3*i+2]));
    if (distances.every(d => d <= 0)) return { inside: null, outside: [face] };
    if (distances.every(d => d >= 0)) continue;
    const positive: number[] = [], negative: number[] = [];
    for (let i = 0; i < inside.length; i++) {
      const j = (i + 1) % inside.length;
      const a = inside[i], b = inside[j], da = distances[i], db = distances[j];
      if (da >= 0) positive.push(a);
      if (da <= 0) negative.push(a);
      if (da * db < 0) {
        const t = da / (da - db);
        const mix = (axis: number) => positions[3*a+axis] + t * (positions[3*b+axis] - positions[3*a+axis]);
        const cut = add(mix(0), mix(1), mix(2));
        positive.push(cut);
        negative.push(cut);
      }
    }
    if (negative.length >= 3) outside.push(negative);
    inside = positive;
  }
  return { inside: inside.length >= 3 ? inside : null, outside };
}
