import { CanvasTexture, DoubleSide, Mesh, MeshLambertMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

// The north service end, field and southern exhibit wing follow the street grid.
const service: P2[] = [
  [0.0, 0.0],
  [28.73, -0.47],
  [29.03, -17.34],
  [40.56, -17.9],
  [40.82, -4.64],
  [44.77, -4.5],
  [44.65, 6.61],
  [48.72, 6.93],
  [48.55, 15.1],
  [0.02, 15.1],
];
const mainHall: P2[] = [
  [0.15, 96.63],
  [0.02, 15.1],
  [48.55, 15.1],
  [47.58, 60.5],
  [35.6, 60.5],
  [35.6, 89.5],
  [47.72, 89.5],
  [40.93, 90.29],
  [37.22, 89.69],
  [42.58, 101.05],
  [8.49, 115.28],
];
const rearRoof: P2[] = [
  [0.25, 95.0],
  [3.0, 60.0],
  [34.8, 60.0],
  [35.5, 89.7],
  [37.0, 90.5],
  [39.5, 99.8],
  [10.0, 111.0],
];
export function createFootballHall(buildings: VBuilding[], grid: GroundGrid) {
  const model = landmarkShell(
    buildings,
    grid,
    'e7b9bf31-89f1-4e38-b8bd-82cab014f1fd',
    'College Football Hall of Fame',
    [-384.21, -708.19],
    [27, -10],
    [
      [20, 20],
      [40, 50],
      [47, 75],
    ],
  );
  if (!model) return null;
  const { base, body, lights, prism, facade } = model;
  // The opal wall overhangs a recessed row of storefronts along the park.
  const recessed = (plan: P2[]): P2[] => plan.map(([u, v]) => [u > 46 && v < 61 ? u - 1.4 : u, v]);
  prism(recessed(service), base, 317.9, '#817d70', '#9d9789');
  prism(recessed(mainHall), base, 317.9, '#817d70', '#aaa598');
  prism(service, 317.9, 324.65, '#9d9688', '#aaa69a');
  prism(mainHall, 317.9, 325.25, '#a99882', '#aaa598');
  prism(rearRoof, 325.25, 327.95, '#a8a49a', '#bab7ac');
  // The shallow field roof spans across the hall. Its bright crown drops toward the glass.
  const profile = [
    [0.8, 326.2],
    [8, 328.3],
    [18, 329.45],
    [24, 329.55],
    [33, 328.65],
    [42, 326.55],
    [47.35, 325.35],
  ];
  for (let i = 1; i < profile.length; i++) {
    const [a, lo] = profile[i - 1],
      [b, hi] = profile[i],
      start = 16.3,
      end = 60.45;
    body.quad([a, lo, start], [a, lo, end], [b, hi, end], [b, hi, start], '#d4d0bd');
    for (const v of [start, end]) body.quad([a, 325.25, v], [a, lo, v], [b, hi, v], [b, 325.25, v], '#a8a596');
  }
  // Wide translucent panes illuminate the park facade above the recessed ground floor.
  const frontA: P2 = [48.7, 7.0],
    frontB: P2 = [47.6, 61.5];
  facade(
    [frontA[0] - 1.38, frontA[1]],
    [frontB[0] - 1.38, frontB[1]],
    314.7,
    317.45,
    1,
    3.15,
    0.89,
    0.9,
    ['#47575a', '#5e6157'],
    0.24,
  );
  for (let i = 0; i <= 9; i++) {
    const f = i / 9;
    body.box(0.3, 317.92 - base, 0.32, 48.28 - 1.1 * f, (base + 317.92) / 2, 7 + 54.5 * f, '#b3aea3');
  }
  const glass = ['#b4b9ae', '#c7c6af', '#aab3a9', '#cccbbe'];
  for (let j = 0; j < 18; j++) {
    const t = (j + 0.046) / 18,
      r = (j + 0.954) / 18;
    const panel = (f: number, y: number, offset = 0) => [
      frontA[0] + (frontB[0] - frontA[0]) * f + 0.14 + offset,
      y,
      frontA[1] + (frontB[1] - frontA[1]) * f,
    ];
    body.quad(panel(t, 318.05), panel(t, 325.18), panel(r, 325.18), panel(r, 318.05), '#45575a');
    for (let k = 0; k < 2; k++) {
      const lo = 318.16 + 3.5 * k;
      lights.quad(
        panel(t + 0.0015, lo, 0.04),
        panel(t + 0.0015, lo + 3.36, 0.04),
        panel(r - 0.0015, lo + 3.36, 0.04),
        panel(r - 0.0015, lo, 0.04),
        glass[(j + k) % glass.length],
      );
    }
  }
  // A forked concrete column carries the copper rotunda above the public entrance.
  function support(u0: number, v0: number, lo: number, u1: number, v1: number, hi: number, w: number) {
    const corners = [
      [-w, -w],
      [w, -w],
      [w, w],
      [-w, w],
    ];
    for (let i = 0; i < 4; i++) {
      const a = corners[i],
        b = corners[(i + 1) % 4];
      body.quad(
        [u0 + a[0], lo, v0 + a[1]],
        [u1 + a[0], hi, v1 + a[1]],
        [u1 + b[0], hi, v1 + b[1]],
        [u0 + b[0], lo, v0 + b[1]],
        '#c5bba6',
      );
    }
  }
  // The glass vestibule sits behind the fork, with the sidewalk open in front.
  prism(
    [
      [34.5, 68.4],
      [41.0, 68.4],
      [41.0, 84.8],
      [34.5, 84.8],
    ],
    base,
    319.65,
    '#586260',
    '#73746a',
  );
  facade([41.0, 69.0], [41.0, 84.2], 314.1, 318.8, 1, 1.7, 0.9, 0.9, ['#566966', '#4a5f63'], 0.14);
  support(44, 76, base, 44, 76, 316.3, 1.05);
  for (const v of [70.2, 81.8]) support(44, 76, 316.3, 46, v, 319.85, 0.91);
  const cx = 41.0,
    cz = 76.5,
    sides = 28;
  function shellPoint(i: number, scale: number, y: number, shift = 0) {
    const theta = (i / sides) * 2 * Math.PI;
    return [cx + Math.min(0.89, Math.cos(theta)) * 14.5 * scale + shift, y, cz + Math.sin(theta) * 14.1 * scale];
  }
  const copper = ['#9f5d43', '#a56349', '#ad6a50', '#99583f', '#a36347'];
  for (let i = 0; i < sides; i++) {
    const j = i + 1,
      aperture = i < 2 || i >= sides - 2;
    const top = (n: number) => 334.8 - 2.2 * Math.cos((n * 2 * Math.PI) / sides) - (n === 9 ? 0.95 : 0);
    const rings = [
      [0.75, 319.6, 0],
      [1, 323.4, 0],
      [1, 327.2, -0.2],
      [0.94, 330.05, -0.65],
    ];
    const lower = shellPoint(i, 0.75, 319.6),
      next = shellPoint(j, 0.75, 319.6);
    // The rear copper skirt drops toward the lobby. The street-facing opening clears the support.
    const skirt = (n: number) => 319.6 - (3.3 * Math.max(0, 0.35 - Math.cos((n * 2 * Math.PI) / sides))) / 1.35;
    if (skirt(i) < 319.59 || skirt(j) < 319.59)
      body.quad(shellPoint(i, 0.72, skirt(i)), lower, next, shellPoint(j, 0.72, skirt(j)), copper[i % 5]);
    body.tri([cx, 319.6, cz], lower, next, '#837460');
    for (let k = 0; k < rings.length - 1; k++) {
      const [l, y, s] = rings[k],
        [r, h, t] = rings[k + 1];
      if (!aperture)
        body.quad(
          shellPoint(i, l, y, s),
          shellPoint(i, r, h, t),
          shellPoint(j, r, h, t),
          shellPoint(j, l, y, s),
          copper[i % 5],
        );
    }
    const a = shellPoint(i, 0.83, top(i), -1.15),
      b = shellPoint(j, 0.83, top(j), -1.15);
    body.quad(shellPoint(i, 0.94, 330.05, -0.65), a, b, shellPoint(j, 0.94, 330.05, -0.65), copper[i % 5]);
    body.tri([cx - 1.15, 334.65, cz], b, a, '#8d8175');
  }
  // The opening in the front shell has deep side returns, a recessed window and a sloping silver sill.
  const left = 70.6,
    right = 82.4;
  for (const v of [left, right])
    body.quad([53.75, 319.85, v], [53.1, 330.05, v], [51.2, 329.45, v], [51.25, 321.2, v], '#76685b');
  body.quad([53.1, 330.05, left], [53.1, 330.05, right], [51.2, 329.45, right], [51.2, 329.45, left], '#655649');
  body.quad([53.75, 320.0, left], [51.35, 324.3, left], [51.35, 324.3, right], [53.75, 320.0, right], '#bec1bc');
  body.quad([51.22, 324.3, left], [51.22, 329.45, left], [51.22, 329.45, right], [51.22, 324.3, right], '#697b7f');
  facade([51.22, left], [51.22, right], 324.3, 329.45, 1, 2.3, 0.97, 0.98, ['#738c90', '#617a81'], 0.06);
  const landmark = model.finish('#d9e2df');
  // Plain public-facing building name on the flat copper panel.
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 104;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = 'bold 34px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fbf4df';
      ctx.fillText('COLLEGE FOOTBALL', 256, 39);
      ctx.font = 'bold 49px Arial, sans-serif';
      ctx.fillText('HALL OF FAME', 256, 91);
      const map = new CanvasTexture(canvas);
      map.colorSpace = SRGBColorSpace;
      const material = new MeshLambertMaterial({
        map,
        emissiveMap: map,
        emissive: '#fff4d2',
        emissiveIntensity: 0,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        forceSinglePass: true,
      });
      material.addEventListener('dispose', () => map.dispose());
      const sign = new Mesh(new PlaneGeometry(12.7, 2.65), material);
      sign.position.set(53.12, 328.75, cz);
      sign.rotation.order = 'YXZ';
      sign.rotation.y = Math.PI / 2;
      sign.rotation.x = -0.4;
      landmark.group.add(sign);
      const rooms = landmark.setNight;
      landmark.setNight = (night) => {
        rooms(night);
        material.emissiveIntensity = 0.78 * night;
      };
    }
  }
  return landmark;
}
