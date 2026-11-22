import { DoubleSide, Group, Mesh, MeshLambertMaterial } from 'three';
import type { GroundGrid } from '../terrain/grid';
import { Builder, hashStr, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';

const footprint: P2[] = [
  [-59.34, -366.52],
  [-79.87, -340.02],
  [-48.14, -303.86],
  [-19.44, -320.72],
];
const roof = 457.8,
  coping = 459.0; // Absolute elevations, USGS Georgia B2, 2018.
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function createCentennialTower(buildings: VBuilding[], grid: GroundGrid) {
  const tower = buildings.find((b) => b.id === '0f60407e-dc16-401f-8371-d8daed2807f1');
  if (!tower || tower.rings.length !== 1 || tower.rings[0].length !== 4) return null;
  // Restore the elevation drawing's face order even if a rebake rotates or reverses the ring.
  const corners = footprint.map(([x, z]) => tower.rings[0].find((p) => Math.hypot(p[0] - x, p[1] - z) < 2));
  if (!corners.every((p): p is P2 => p !== undefined)) return null;
  const grades = corners.map(([x, z]) => grid.sample(x, z));
  if (!grades.every((h): h is number => h !== null && Number.isFinite(h))) return null;
  const base = Math.min(...grades) - 0.45;
  const shell = new Builder(),
    windows = new Builder(),
    fins = new Builder();
  const at = ([x, z]: P2, h: number) => [x, h, z];
  shell.quad(at(corners[0], roof), at(corners[1], roof), at(corners[2], roof), at(corners[3], roof), '#a2a5a0');
  // Two distinct raised groups and a small taller unit occupy the measured roof deck.
  for (const [x, z, h, w, d] of [
    [-59, -338.2, 459.65, 5.6, 3.2],
    [-48, -326.8, 459.65, 5.3, 3.2],
    [-65.2, -340.6, 460.6, 1.8, 1.3],
  ]) {
    const point = (u: number, v: number, y: number) => [x + 0.66 * u - 0.752 * v, y, z + 0.752 * u + 0.66 * v];
    const ring = [
      [-w / 2, -d / 2],
      [w / 2, -d / 2],
      [w / 2, d / 2],
      [-w / 2, d / 2],
    ];
    for (let i = 0; i < 4; i++) {
      const [u, v] = ring[i],
        [a, b] = ring[(i + 1) % 4];
      shell.quad(point(u, v, roof), point(a, b, roof), point(a, b, h), point(u, v, h), '#828888');
    }
    shell.quad(
      point(-w / 2, -d / 2, h),
      point(-w / 2, d / 2, h),
      point(w / 2, d / 2, h),
      point(w / 2, -d / 2, h),
      '#b8bbb7'
    );
  }

  for (let face = 0; face < 4; face++) {
    const [x, z] = corners[face],
      [ex, ez] = corners[(face + 1) % 4];
    const width = Math.hypot(ex - x, ez - z),
      dx = (ex - x) / width,
      dz = (ez - z) / width;
    const p = (s: number, h: number, out: number) => [x + dx * s - dz * out, h, z + dz * s + dx * out];
    const panel = (l: number, r: number, bottom: number, top: number, out: number, c: string, batch = shell) =>
      batch.quad(p(l, bottom, out), p(r, bottom, out), p(r, top, out), p(l, top, out), c);
    // The full-width inverted triangles are on the park/garage and opposite long elevations.
    const broad = face === 1 || face === 3;
    panel(0, width, base, coping, 0, '#475965');
    const lobbyTop = 333.8;
    const bays = Math.round(width / 4.4);
    for (let i = 0; i < bays; i++) {
      const l = (i * width) / bays,
        r = ((i + 1) * width) / bays;
      panel(l + 0.3, r - 0.3, base + 0.5, 329.1, 0.04, '#48565b');
      panel(l + 0.26, r - 0.26, 329.55, lobbyTop - 0.4, 0.04, '#738589');
      panel(l, l + 0.32, base, lobbyTop, 0.16, '#b6b4aa');
      panel(l + 0.3, r - 0.3, 329.1, 329.55, 0.12, '#c4c2b8');
    }
    panel(0, width, lobbyTop - 0.4, lobbyTop, 0.15, '#b4b1a6');
    // Mirror glass reads in large reflected shapes. The lower silhouette follows a few
    // neighboring rooflines. Fine glass joints stay subordinate at ordinary City zoom.
    const n = Math.round(width / 1.6),
      floors = 33,
      pitch = (coping - lobbyTop) / floors;
    const sky = ['#99b2bd', '#9db6bf', '#a2b9bf', '#a0b5b9'];
    const coolSky = ['#819ba9', '#879fab', '#89a0ad', '#839eaa'];
    const shade = ['#596d77', '#60737b', '#637781', '#5c717c'];
    const skyline = [
      [365, 376, 376],
      [369, 376, 358],
      [365, 376, 376],
      [354, 382, 369],
    ][face];
    for (let col = 0; col < n; col++) {
      const l = (col * width) / n,
        r = ((col + 1) * width) / n;
      const column = l / width;
      const horizon = skyline[column < 0.32 ? 0 : column < 0.67 ? 1 : 2];
      for (let f = 0; f < floors; f++) {
        const y = lobbyTop + f * pitch;
        const block = hashStr(face + '/' + Math.floor(col / 6) + '/' + Math.floor(f / 4));
        const near = y < horizon,
          lit = hashStr(face + '/' + Math.floor(col / 3) + '/' + f) % 9 === 0;
        const color = near ? shade[(block + face) % 4] : (face === 0 || face === 3 ? sky : coolSky)[(block + face) % 4];
        panel(l + 0.039, r - 0.039, y + 0.13, y + pitch - 0.09, 0.075, color, lit ? windows : shell);
      }
    }
    // The apex lies down the face, while the two upper corners meet a horizontal roof lip.
    // Daylight reveals recesses between closely spaced metallic vertical fins.
    if (broad) {
      const tip = coping - width * 0.45;
      const lower = (s: number) => tip + (coping - tip) * Math.abs((2 * s) / width - 1);
      shell.tri(p(0, coping, 0.19), p(width / 2, tip, 0.19), p(width, coping, 0.19), '#96a4a9');
      for (let i = 1; i < Math.round(width / 0.78); i++) {
        const mid = (i * width) / Math.round(width / 0.78),
          l = mid - 0.105,
          r = mid + 0.105;
        fins.quad(p(l, lower(l), 0.32), p(r, lower(r), 0.32), p(r, coping, 0.32), p(l, coping, 0.32), '#deddd3');
        shell.quad(p(r, lower(r), 0.32), p(r, lower(r), 0.19), p(r, coping, 0.19), p(r, coping, 0.32), '#65707a');
      }
      for (const [l, r] of [
        [0, width / 2],
        [width / 2, width],
      ]) {
        fins.quad(
          p(l, lower(l) - 0.17, 0.36),
          p(r, lower(r) - 0.17, 0.36),
          p(r, lower(r) + 0.12, 0.36),
          p(l, lower(l) + 0.12, 0.36),
          '#bdb9ac'
        );
      }
    }
    panel(0, width, coping - 0.24, coping + 0.05, 0.39, '#cdcac1', windows);
    shell.quad(
      p(0, coping + 0.05, 0.39),
      p(width, coping + 0.05, 0.39),
      p(width, coping + 0.05, -0.36),
      p(0, coping + 0.05, -0.36),
      '#c0bfba'
    );
    panel(0, width, roof, coping + 0.05, -0.36, '#858b8c');
  }
  const group = new Group();
  group.name = 'Centennial Tower (101 Marietta)';
  group.position.y = -grid.manifest.vertical.sceneZeroNavd88M;
  const mesh = (builder: Builder, emissive?: string) => {
    const mat = new MeshLambertMaterial({
      vertexColors: true,
      side: DoubleSide,
      emissive: emissive ?? '#000000',
      emissiveIntensity: 0,
    });
    const m = new Mesh(builder.geometry(), mat);
    m.castShadow = builder === shell;
    m.receiveShadow = true;
    group.add(m);
    return mat;
  };
  mesh(shell);
  const panes = mesh(windows, '#e1c29a'),
    ribs = mesh(fins, '#f47955');
  return {
    group,
    buildings: buildings.filter((b) => b !== tower),
    setNight(night: number) {
      panes.emissiveIntensity = 0.54 * night;
      ribs.emissiveIntensity = 0.9 * night;
    },
  };
}
