import { StaticLandmarkMaterial } from '../materials/landmark-batch';
import {
  CanvasTexture,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three';
import type { GroundGrid } from '../terrain/grid';
import { Builder, hashStr, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';

const id = 'e14e24d5-1e78-423b-baec-0529477c10a2';
const surveyed: P2[] = [
  [307.56, -332.93],
  [284.76, -359.39],
  [245.98, -326.0],
  [268.78, -299.53],
];
const roof = 459.9,
  signBottom = 454.25;
const signWidth = 174 * 0.3048,
  signHeight = 20 * 0.3048;

function displayTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#18568e';
  ctx.fillRect(0, 0, 512, 64);
  ctx.fillStyle = '#a9ce7c';
  ctx.fillRect(10, 10, 7, 44);
  ctx.font = 'bold 43px Arial, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#edf3f1';
  ctx.fillText('G E O R G I A ’ S   O W N', 264, 33, 466);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

export function createEquitable(buildings: VBuilding[], grid: GroundGrid) {
  const building = buildings.find((b) => b.id === id);
  if (!building || building.rings.length !== 1 || building.rings[0].length !== 4) return null;
  const corners = surveyed.map(([x, z]) => building.rings[0].find((p) => Math.hypot(x - p[0], z - p[1]) < 2));
  if (!corners.every((p): p is P2 => p !== undefined)) return null;
  const grades = corners.map(([x, z]) => grid.sample(x, z));
  if (!grades.every((y): y is number => y !== null && Number.isFinite(y))) return null;
  const base = Math.min(...grades) - 0.4,
    frame = '#48494a',
    flange = '#666765',
    glass = ['#53656d', '#62747b', '#526069', '#66767a'];
  const body = new Builder(),
    lit = new Builder();
  const group = new Group();
  group.name = '100 Peachtree (Equitable Building)';
  group.position.y = -grid.manifest.vertical.sceneZeroNavd88M;
  const texture = displayTexture(),
    screen = new MeshBasicMaterial({ map: texture });
  screen.addEventListener('dispose', () => texture.dispose());
  for (let face = 0; face < 4; face++) {
    const [x, z] = corners[face],
      [ex, ez] = corners[(face + 1) % 4],
      width = Math.hypot(ex - x, ez - z);
    const dx = (ex - x) / width,
      dz = (ez - z) / width;
    // Ring runs clockwise in x/z, so the pavement is on the left.
    const nx = -dz,
      nz = dx;
    const p = (s: number, y: number, out: number) => [x + s * dx + nx * out, y, z + s * dz + nz * out];
    const plate = (l: number, r: number, low: number, high: number, out: number, color: string, b = body) =>
      b.quad(p(l, low, out), p(r, low, out), p(r, high, out), p(l, high, out), color);
    const broad = face % 2 === 1,
      bays = broad ? 6 : 4,
      bayWidth = width / bays;
    // Recess the lobby glass behind the outer steel columns, which continue to the pavement.
    plate(0, width, base, 334.0, -0.95, '#526166');
    plate(0, width, 334, roof, 0, frame);
    for (let j = 0; j < bays; j++) {
      const l = j * bayWidth,
        r = l + bayWidth;
      plate(l + 0.44, r - 0.44, base + 0.45, 327.2, -0.9, '#6c7778');
      plate(l + 0.44, r - 0.44, 327.6, 333.55, -0.9, '#65787f');
      for (let k = 1; k < 4; k++)
        plate(l + (bayWidth * k) / 4 - 0.08, l + (bayWidth * k) / 4 + 0.08, base + 0.45, 333.55, -0.87, frame);
      // Repeating exposed spandrel girders run through each curtain-wall bay.
      const floors = 30,
        pitch = (449.9 - 334.0) / floors;
      for (let f = 0; f < floors; f++) {
        const y = 334 + f * pitch;
        const h = hashStr(face + '/' + j + '/' + f);
        for (let k = 0; k < 4; k++) {
          const left = l + 0.35 + ((bayWidth - 0.7) * k) / 4,
            right = l + 0.35 + ((bayWidth - 0.7) * (k + 1)) / 4;
          const color = glass[(face + (f > 11 ? 1 : 0) + (j % 2)) % glass.length];
          const window = (h % 7 === 0 && k !== h % 4) || (f === 19 && j % 3 === 0);
          plate(left + 0.045, right - 0.045, y + 0.84, y + pitch - 0.22, 0.06, color, window ? lit : body);
        }
        plate(l, r, y + 0.63, y + 0.84, 0.26, flange);
        plate(l, r, y, y + 0.63, 0.22, '#454649');
      }
      for (const t of [l, ...(j === bays - 1 ? [r - 0.4] : [])]) {
        plate(t, t + 0.4, base, 450.1, 0.4, flange);
        body.quad(p(t, base, -0.95), p(t, base, 0.4), p(t, 450.1, 0.4), p(t, 450.1, -0.95), frame);
        body.quad(
          p(t + 0.4, base, -0.95),
          p(t + 0.4, 450.1, -0.95),
          p(t + 0.4, 450.1, 0.4),
          p(t + 0.4, base, 0.4),
          frame
        );
      }
    }
    // A dark full-width mechanical band supports screens on the two long elevations.
    const overhang = broad ? (signWidth - width) / 2 + 0.22 : 0;
    plate(-overhang, width + overhang, 449.9, 460.65, 0.34, '#373b3e');
    for (let j = 0; j < 12; j++) plate(0, width, 450.1 + j * 0.3, 450.2 + j * 0.3, 0.37, '#545858');
    plate(-overhang, width + overhang, 460.35, 460.65, 0.41, flange);
    if (broad) {
      const sign = new Mesh(new PlaneGeometry(signWidth, signHeight), screen);
      const [sx, sy, sz] = p(width / 2, signBottom + signHeight / 2, 0.46);
      sign.position.set(sx, sy, sz);
      sign.rotation.y = Math.atan2(nx, nz);
      group.add(sign);
    }
  }
  const q = corners.map(([x, z]) => [x, roof, z]);
  body.quad(q[0], q[1], q[2], q[3], '#acaba5');
  for (const [x, z, h, w, d] of [
    [272.8, -331.2, 1.45, 4.1, 2.1],
    [294.3, -327.2, 1.2, 5, 2.5],
    [278.6, -336, 1.1, 3.3, 2.0],
  ]) {
    body.box(w, h, d, x, roof + h / 2, z, '#8d9291');
  }
  const steel = new Mesh(body.geometry(), new StaticLandmarkMaterial());
  steel.castShadow = steel.receiveShadow = true;
  const occupied = new MeshLambertMaterial({
    vertexColors: true,
    side: DoubleSide,
    emissive: '#d3cdb0',
    emissiveIntensity: 0,
  });
  const panes = new Mesh(lit.geometry(), occupied);
  panes.receiveShadow = true;
  group.add(steel, panes);
  return {
    group,
    buildings: buildings.filter((b) => b !== building),
    setNight(night: number) {
      occupied.emissiveIntensity = 0.48 * night;
      screen.color.setScalar(0.82 + 0.18 * night);
    },
  };
}
