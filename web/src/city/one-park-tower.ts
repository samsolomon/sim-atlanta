import { CanvasTexture, DoubleSide, Group, Mesh, MeshLambertMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import type { GroundGrid } from '../terrain/grid';
import { Builder, hashStr, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';

const id = 'f2448d24-91b3-4b68-9fff-c903d9c1f40c';
const outline: P2[] = [
  [177.3, -95.5],
  [202.7, -117.5],
  [183, -140.6],
  [157.3, -118.6],
];
const halfWidth = 16.85,
  halfDepth = 15.2,
  roof = 432.8,
  crownBase = 426.9,
  well = 425.6;
const metal = '#97adc0',
  trim = '#b7c3ca',
  shade = '#617381',
  crown = '#d3d6d5';
const windows = ['#4e6274', '#5b6f80', '#53697b', '#677786'];

export function createOneParkTower(buildings: VBuilding[], grid: GroundGrid) {
  const office = buildings.find((b) => b.id === id);
  if (!office || office.rings.length !== 1 || office.rings[0].length !== 4) return null;
  const lot = office.rings[0];
  if (!outline.every(([x, z]) => lot.some(([a, b]) => Math.hypot(x - a, z - b) < 1.5))) return null;
  const grades = lot.map(([x, z]) => grid.sample(x, z));
  if (!grades.every((y): y is number => y !== null && Number.isFinite(y))) return null;
  const base = Math.min(...grades) - 0.35;
  const group = new Group();
  group.name = '34 Peachtree (One Park Tower)';
  group.position.set(180.1, -grid.manifest.vertical.sceneZeroNavd88M, -118.05);
  group.rotation.y = Math.atan2(0.654, 0.757);
  const shell = new Builder(),
    lit = new Builder();
  // u points toward Walton Street, v toward Peachtree Street and Woodruff Park.
  const wall = (face: number, s: number, y: number, offset = 0) => {
    switch (face) {
      case 0:
        return [s, y, halfDepth + offset];
      case 1:
        return [halfWidth + offset, y, -s];
      case 2:
        return [-s, y, -halfDepth - offset];
      default:
        return [-halfWidth - offset, y, s];
    }
  };
  for (let face = 0; face < 4; face++) {
    const half = face % 2 === 0 ? halfWidth : halfDepth,
      bays = face % 2 === 0 ? 16 : 14;
    const panel = (l: number, r: number, y: number, top: number, out: number, color: string, b = shell) =>
      b.quad(
        wall(face, l, y, out),
        wall(face, r, y, out),
        wall(face, r, top, out),
        wall(face, l, top, out),
        color
      );
    panel(-half, half, base, roof, 0, metal);
    panel(-half, half, base, 327.7, 0.03, '#5b6265');
    const w = (2 * half) / bays;
    for (let j = 0; j < bays; j++) {
      const l = -half + j * w,
        r = l + w;
      panel(l + 0.08, r - 0.08, base + 0.4, 324.5, 0.09, '#53636a');
      panel(l + 0.08, r - 0.08, 325.1, 327.35, 0.09, '#76848c');
      for (let f = 0; f < 28; f++) {
        const y = 327.8 + (f * (crownBase - 327.8)) / 28,
          h = (crownBase - 327.8) / 28;
        const pane = hashStr(face + '/' + j + '/' + f) % 9 === 0 ? lit : shell;
        panel(
          l + 0.075,
          r - 0.075,
          y + h * 0.39,
          y + h - 0.12,
          0.08,
          windows[(j + Math.floor(f / 7) + face) % 4],
          pane
        );
      }
      const major = j % 4 === 0;
      panel(l, l + (major ? 0.29 : 0.095), 327.7, crownBase, major ? 0.23 : 0.12, major ? shade : trim);
    }
    // Flush off-white crown, scored in broad panels above the curtain wall.
    panel(-half, half, crownBase, roof, 0.17, crown);
    for (let k = 1; k < 8; k++) {
      const s = -half + (k * half) / 4;
      panel(s, s + 0.07, crownBase, roof, 0.19, '#a4adb0');
    }
    panel(-half, half, 429.9, 430.03, 0.2, '#adb4b4');
    if (face === 1) {
      // The full-height opaque stripe is visible looking south-west from Woodruff Park.
      panel(-3.4, 3.65, 327.6, roof + 0.14, 0.34, '#968b76');
      for (let k = 0; k < 14; k++) panel(-3.31 + k * 0.49, -3.16 + k * 0.49, 327.7, roof + 0.14, 0.39, '#807968');
    }
    if (face === 0) {
      panel(-half, half, 323.9, 325.1, 0.15, '#b8b5ad');
      panel(-12.6, -1.4, base, 324.8, 0.18, '#40515b');
      for (const post of [-12.6, -9.78, -7, -4.22, -1.5]) panel(post, post + 0.12, base, 324.8, 0.25, trim);
    }
  }
  // Three roof fields surround the lower equipment well inside the street-corner parapet.
  function block(u0: number, u1: number, v0: number, v1: number, y0: number, y1: number, c: string) {
    shell.box(u1 - u0, y1 - y0, v1 - v0, (u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2, c);
  }
  const roofPanel = (u0: number, u1: number, v0: number, v1: number, y: number, color: string) =>
    shell.quad([u0, y, v0], [u0, y, v1], [u1, y, v1], [u1, y, v0], color);
  roofPanel(-halfWidth, 1.2, -halfDepth, halfDepth, roof, '#afb1ab');
  roofPanel(1.2, halfWidth, -halfDepth, 0.6, roof, '#afb1ab');
  roofPanel(1.2, halfWidth, 0.6, halfDepth, well, '#949a95');
  shell.quad([1.2, well, 0.6], [1.2, well, halfDepth], [1.2, roof, halfDepth], [1.2, roof, 0.6], shade);
  shell.quad([1.2, well, 0.6], [halfWidth, well, 0.6], [halfWidth, roof, 0.6], [1.2, roof, 0.6], shade);
  block(5.1, 12.1, 3.3, 12.6, well, 431.65, '#a5a89e');
  // Tall, offset screened penthouse with two smaller plant enclosures inside.
  block(-16.45, 0.75, -8.65, 8.85, roof, 438.9, '#a1a5a2');
  for (let i = 0; i < 12; i++) {
    const u = -16.1 + i * 1.4;
    block(u, u + 0.15, 8.84, 8.99, roof, 438.9, trim);
  }
  for (let i = 0; i < 10; i++) {
    const y = roof + 0.35 + i * 0.56;
    block(-16.45, 0.75, 8.88, 8.94, y, y + 0.1, '#616f74');
  }
  block(-8.75, 0.2, 1.0, 7.25, 438.9, 442.9, '#b0b2aa');
  block(-15.75, -12.5, -2.4, 7.4, 438.9, 442.35, '#949d9d');
  // Blue entrance lettering on the light portal beside the older storefront.
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#deded8';
  ctx.fillRect(0, 0, 512, 96);
  ctx.fillStyle = '#365c95';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 57px Arial, sans-serif';
  ctx.fillText('34 PEACHTREE', 256, 50, 460);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const enamel = new MeshLambertMaterial({ map: texture });
  enamel.addEventListener('dispose', () => texture.dispose());
  const sign = new Mesh(new PlaneGeometry(11.3, 1.85), enamel);
  sign.position.set(-7, 325.17, halfDepth + 0.35);
  group.add(sign);
  const main = new Mesh(shell.geometry(), new MeshLambertMaterial({ side: DoubleSide, vertexColors: true }));
  main.castShadow = main.receiveShadow = true;
  const occupied = new MeshLambertMaterial({
    side: DoubleSide,
    vertexColors: true,
    emissive: '#e2c68e',
    emissiveIntensity: 0,
  });
  group.add(main, new Mesh(lit.geometry(), occupied));
  return {
    group,
    buildings: buildings.filter((b) => b !== office),
    setNight(night: number) {
      occupied.emissiveIntensity = 0.48 * night;
    },
  };
}
