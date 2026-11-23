import { DoubleSide, Group, Mesh, MeshLambertMaterial, ShapeUtils, Vector2 } from 'three';
import { Builder, pointInRing, rng, type P2 } from '../vignette/geom';
import type { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';

const id = 'e10bc2d8-2376-4e1b-969c-4eca7a3f2eb4';
const angle = Math.atan2(27.76, 42.46),
  cos = Math.cos(angle),
  sin = Math.sin(angle);
const stone = '#d9d6c9',
  reveal = '#969a93',
  glass = '#56666c';
export function createRussellBuilding(buildings: VBuilding[], grid: GroundGrid) {
  const building = buildings.find((b) => b.id === id);
  if (!building || building.rings.length !== 1) return null;
  const ring = building.rings[0];
  const local = ring.map(([x, z]): P2 => [
    (x + 399.36) * cos + (z - 17.54) * sin,
    -(x + 399.36) * sin + (z - 17.54) * cos,
  ]);
  if (
    ![
      [2, 2],
      [48, 75],
      [72, 25],
    ].every(([u, v]) => pointInRing(u, v, local))
  )
    return null;
  const grades = ring.map(([x, z]) => grid.sample(x, z));
  if (!grades.every((y): y is number => y !== null && Number.isFinite(y))) return null;
  const base = Math.min(...grades) - 0.4,
    shell = new Builder(),
    lamps = new Builder(),
    random = rng(1979);
  function box(u: number, v: number, w: number, d: number, lo: number, hi: number, c: string) {
    shell.box(w, hi - lo, d, u + w / 2, (lo + hi) / 2, v + d / 2, c);
  }
  const width = 50.72,
    length = 78.4,
    lobby = 327.2;
  // Dark setback under a continuous pale frame at the foot of the tower.
  box(1.8, 1.8, width - 3.6, length - 3.6, base, lobby, glass);
  for (const u of [0, width - 1.1]) for (let v = 0; v < length; v += 12.85) box(u, v, 1.1, 1.3, base, lobby, stone);
  for (const v of [0, length - 1.1]) for (let u = 0; u < width; u += 9.9) box(u, v, 1.3, 1.1, base, lobby, stone);
  box(0, 0, width, length, lobby, 421.82, stone);
  // Along both streets the bands are divided into groups of four panes by projecting piers.
  function facade(alongV: boolean, face: number, span: number, sign: number, groups: number) {
    const pt = (s: number, y: number, offset: number) =>
      alongV ? [face + offset * sign, y, s] : [s, y, face + offset * sign];
    function panel(l: number, r: number, lo: number, hi: number, offset: number, c: string, batch = shell) {
      batch.quad(pt(l, lo, offset), pt(r, lo, offset), pt(r, hi, offset), pt(l, hi, offset), c);
    }
    const pitch = 3.92,
      bay = (span - 1.5) / groups;
    for (let k = 0; k < 23; k++) {
      const y = lobby + 1.0 + k * pitch;
      for (let j = 0; j < groups; j++) {
        const a = 0.75 + j * bay;
        panel(a + 0.55, a + bay - 0.4, y, y + 2.39, 0.045, '#454e50');
        for (let i = 0; i < 4; i++) {
          const start = a + 0.61 + (i * (bay - 1.1)) / 4;
          const n = random();
          panel(
            start,
            start + (bay - 1.1) / 4 - 0.12,
            y + 0.14,
            y + 2.28,
            0.09,
            n < 0.54 ? '#607378' : '#4e6068',
            n < 0.135 ? lamps : shell,
          );
        }
      }
      const sill = y - 0.08;
      shell.quad(
        pt(0.25, sill, 0.04),
        pt(span - 0.25, sill, 0.04),
        pt(span - 0.25, sill + 0.23, 0.41),
        pt(0.25, sill + 0.23, 0.41),
        reveal,
      );
    }
    for (let i = 0; i <= groups; i++) {
      const a = 0.75 + i * bay;
      if (alongV) box(face + (sign < 0 ? -0.23 : 0), a - 0.24, 0.23, 0.48, lobby, 421.8, stone);
      else box(a - 0.24, face + (sign < 0 ? -0.23 : 0), 0.48, 0.23, lobby, 421.8, stone);
    }
  }
  facade(true, 0, length, -1, 8);
  facade(true, width, length, 1, 8);
  facade(false, 0, width, -1, 5);
  facade(false, length, width, 1, 5);
  // Recessed end terraces and ribbed, almost windowless screen above the regular office bands.
  box(0.45, 10.1, width - 0.9, 59.4, 421.82, 426.55, '#b9b8af');
  for (const u of [0, width - 0.48]) {
    box(u, 0, 0.48, length, 421.82, 426.55, '#b9b8af');
    for (let v = 0.15; v < length - 0.2; v += 1.35) box(u - 0.06, v, 0.6, 0.22, 422.0, 426.55, stone);
  }
  for (const v of [0, length - 0.42]) {
    box(0, v, width, 0.42, 421.82, 426.55, '#b9b8af');
    for (let u = 0.5; u < width - 0.5; u += 1.35) box(u, v - 0.05, 0.2, 0.52, 422, 426.55, stone);
  }
  box(12.9, 32.7, 8.8, 12.2, 426.55, 432.8, '#b0afa4');
  box(21.7, 33.3, 13, 11.2, 426.55, 429.55, '#a8a99f');
  // The plaza deck stands above the DEM's bare rail grade. The returns on both
  // sides of the pavilion cluster at 324 m. Keep the approaches at that level.
  const plaza = 324.1,
    floor = 327.45,
    roof = 339.1;
  // Keep the deck on the surveyed footprint. Adjacent steps, paths and the
  // low circular structure have their own records in the City bake.
  for (let i = 0; i < local.length; i++) {
    const [u, v] = local[i],
      [x, z] = local[(i + 1) % local.length];
    shell.quad([u, base, v], [x, base, z], [x, plaza, z], [u, plaza, v], '#bdb8aa');
  }
  for (const [a, b, c] of ShapeUtils.triangulateShape(
    local.map(([u, v]) => new Vector2(u, v)),
    [],
  )) {
    const at = (i: number) => [local[i][0], plaza, local[i][1]];
    shell.tri(at(a), at(c), at(b), '#bebbb1');
  }
  box(50.5, 22, 12, 5.8, plaza, 330.2, '#879899');
  // The mapped ground outline catches small projections. The renovated upper
  // volume has a continuous convex flank and a single tall glazed street end.
  const pavilion: P2[] = [
    [59.7, 22.4],
    [62.1, 19.4],
    [69, 19.25],
    [74.3, 19.9],
    [77.25, 21.4],
    [78.3, 22.6],
    [78.3, 29.1],
    [76.4, 30.45],
    [73.1, 31.55],
    [69, 31.85],
    [65, 31.05],
    [61.6, 29.75],
    [59.7, 28.0],
  ];
  for (const [a, b, c] of ShapeUtils.triangulateShape(
    pavilion.map(([u, v]) => new Vector2(u, v)),
    [],
  )) {
    const point = (i: number) => [pavilion[i][0], roof, pavilion[i][1]];
    shell.tri(point(a), point(c), point(b), '#d2d2c7');
  }
  for (let i = 0; i < pavilion.length; i++) {
    const [u, v] = pavilion[i],
      [x, z] = pavilion[(i + 1) % pavilion.length];
    const at = (t: number, y: number) => [u + (x - u) * t, y, v + (z - v) * t];
    shell.quad(at(0, plaza), at(1, plaza), at(1, floor), at(0, floor), '#667b80');
    const front = u === 78.3 && x === 78.3;
    shell.quad(at(0, floor), at(1, floor), at(1, roof), at(0, roof), '#deded5');
    if (front) {
      const face = (t: number, y: number) => [u + 0.07, y, v + (z - v) * t];
      for (let bay = 0; bay < 4; bay++)
        for (let row = 0; row < 5; row++) {
          const l = 0.095 + bay * 0.203,
            r = l + 0.19,
            lo = plaza + 0.25 + row * 2.53;
          shell.quad(face(l, lo), face(r, lo), face(r, lo + 2.45), face(l, lo + 2.45), '#81999e');
        }
      continue;
    }
    const dx = x - u,
      dz = z - v,
      length = Math.hypot(dx, dz);
    if (length < 5) continue;
    // Offset from the exterior on either winding of the source footprint.
    const out = pointInRing((u + x) / 2 - (dz * 0.1) / length, (v + z) / 2 + (dx * 0.1) / length, pavilion) ? -1 : 1;
    const pane = (t: number, y: number) => [
      u + t * dx - (out * dz * 0.08) / length,
      y,
      v + t * dz + (out * dx * 0.08) / length,
    ];
    for (const y of [329, 332.65, 336.1])
      shell.quad(pane(0.17, y), pane(0.7, y), pane(0.7, y + 0.7), pane(0.17, y + 0.7), glass);
  }
  const group = new Group();
  group.name = 'Richard B. Russell Federal Building';
  group.rotation.y = -angle;
  group.position.set(-399.36, -grid.manifest.vertical.sceneZeroNavd88M, 17.54);
  const body = new Mesh(shell.geometry(), new MeshLambertMaterial({ vertexColors: true, side: DoubleSide }));
  body.castShadow = body.receiveShadow = true;
  group.add(body);
  const panes = new Mesh(
    lamps.geometry(),
    new MeshLambertMaterial({ vertexColors: true, side: DoubleSide, emissive: '#e5d3aa', emissiveIntensity: 0 }),
  );
  group.add(panes);
  return {
    group,
    buildings: buildings.filter((b) => b !== building),
    setNight(night: number) {
      panes.material.emissiveIntensity = night * 0.76;
    },
  };
}
