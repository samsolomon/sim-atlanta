import type { BuildingFinish, VBuilding } from '../vignette/world';

// Grant Street, November 2025: dark street-floor glazing, paired sashes and
// stacked recessed balconies. The setback and division into bays are illustrative.
const grantFace: NonNullable<BuildingFinish['drawFace']> = (mesh, a, b, base, top, litGlass) => {
  if (Math.max(a[0], b[0]) > 1394 || Math.min(a[0], b[0]) < 1391) return false;
  const from = a[1] < b[1] ? a : b,
    to = from === a ? b : a;
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  if (length < 3) return false;
  const dx = (to[0] - from[0]) / length,
    dz = (to[1] - from[1]) / length;
  const point = (u: number, y: number, inset: number) => [
    from[0] + dx * u + dz * inset,
    y,
    from[1] + dz * u - dx * inset,
  ];
  const panel = (l: number, r: number, y: number, h: number, d: number, c: string, batch = mesh) =>
    batch.quad(point(l, y, d), point(r, y, d), point(r, h, d), point(l, h, d), c);
  const n = Math.round(length / 4.2),
    store = base + 4,
    level = (top - 0.7 - store) / 4;
  for (let i = 0; i < n; i++) {
    const l = (i * length) / n,
      r = ((i + 1) * length) / n;
    panel(l, r, base - 0.5, store, 0, '#46474b');
    panel(l + 0.3, r - 0.3, base + 0.65, store - 0.44, -0.04, '#69777b', i % 7 === 1 ? litGlass : mesh);
    for (let floor = 0; floor < 4; floor++) {
      const y = store + floor * level,
        h = y + level;
      if (i % 2) {
        panel(l, r, y, h, 1.05, '#59616a');
        mesh.quad(point(l, y, 0), point(l, y, 1.05), point(l, h, 1.05), point(l, h, 0), '#b4b5af');
        mesh.quad(point(r, y, 1.05), point(r, y, 0), point(r, h, 0), point(r, h, 1.05), '#b4b5af');
        for (const sy of [y, h])
          mesh.quad(point(l, sy, 0), point(r, sy, 0), point(r, sy, 1.05), point(l, sy, 1.05), '#adb1b2');
        panel(l, r, y, y + 0.23, 0, '#d2d2cc');
        panel(l, r, y + 0.25, y + 0.88, 0.1, '#4b5055');
      } else {
        panel(l, r, y, h, 0, '#dcdcd7');
        const middle = (l + r) / 2;
        // A sparse fixed choice of interiors is illustrative. Recesses stay dark.
        const windows = (i / 2 + floor * 3) % 5 === 1 ? litGlass : mesh;
        panel(l + 0.5, middle - 0.06, y + 1.0, h - 0.55, -0.035, '#5e707c', windows);
        panel(middle + 0.06, r - 0.5, y + 1.0, h - 0.55, -0.035, '#5e707c', windows);
      }
    }
  }
  panel(0, length, top - 0.7, top, 0, '#d8d9d4');
  return true;
};

export function marchonFinish(building: VBuilding): BuildingFinish | undefined {
  if (building.id === 'osm:way:897345399') return { wall: '#8c8276', roof: '#b2aea5' };
  if (building.id === 'osm:relation:17262953') return { wall: '#d3d4d1', roof: '#b4b7b3', drawFace: grantFace };
  if (building.id === 'osm:way:1254383435' || building.id === 'osm:way:1254383436')
    return { wall: '#cfd0c9', roof: '#b1b4af' };
}
