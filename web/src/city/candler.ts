import {
  CanvasTexture,
  DoubleSide,
  Group,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  ShapeUtils,
  SRGBColorSpace,
  Vector2,
} from 'three';
import type { GroundGrid } from '../terrain/grid';
import { Builder, rng, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';

const hotelId = '19774120-7c53-451e-abc4-538e31fdf018',
  shopId = '34e844fe-1076-4a70-b533-650c8f36085d';
const hotelPlan: P2[] = [
  [350.24, -305.99],
  [361.94, -307.6],
  [363.11, -354.2],
  [339.82, -354.68],
  [321.04, -315.46],
  [322.04, -315.29],
  [335.71, -310.98],
  [342.35, -323.57],
  [347.06, -322.69],
  [346.61, -306.38],
];
const shopPlan: P2[] = [
  [335.71, -310.98],
  [322.04, -315.29],
  [315.05, -300.6],
  [340.54, -294.5],
  [346, -308.1],
];
const marble = '#e3d9c6',
  carved = '#c8bda6',
  light = '#f0e7d6',
  glass = '#536067',
  sash = '#9e9683';
const streetGlass = '#52686b',
  brick = '#c5c0ae',
  metal = '#404c4a';

// Map the surveyed elevations to the matching corners even if the exporter changes winding.
function site(buildings: VBuilding[], grid: GroundGrid, id: string, survey: P2[]) {
  const building = buildings.find((b) => b.id === id);
  if (!building || building.rings.length !== 1 || building.rings[0].length !== survey.length) return null;
  const ring = survey.map(([x, z]) => building.rings[0].find(([a, b]) => Math.hypot(a - x, b - z) < 0.85));
  if (!ring.every((p): p is P2 => !!p)) return null;
  const grades = ring.map(([x, z]) => grid.sample(x, z));
  if (!grades.every((y): y is number => y !== null && Number.isFinite(y))) return null;
  return { ring, base: Math.min(...grades) - 0.32, building };
}

function elevation(a: P2, b: P2, stone: Builder) {
  const width = Math.hypot(b[0] - a[0], b[1] - a[1]),
    ux = (b[0] - a[0]) / width,
    uz = (b[1] - a[1]) / width;
  // Both survey rings have negative signed area; their outside is to the left.
  const p = (s: number, y: number, out: number) => [a[0] + s * ux - uz * out, y, a[1] + s * uz + ux * out];
  const panel = (l: number, r: number, y: number, t: number, out: number, color: string, batch = stone) =>
    batch.quad(p(l, y, out), p(r, y, out), p(r, t, out), p(l, t, out), color);
  function molding(l: number, r: number, y: number, top: number, out: number, color: string) {
    panel(l, r, y, top, out, color);
    stone.quad(p(l, top, 0), p(r, top, 0), p(r, top, out), p(l, top, out), light);
    stone.quad(p(l, y, 0), p(r, y, 0), p(r, y, out), p(l, y, out), carved);
    for (const s of [l, r]) stone.quad(p(s, y, 0), p(s, y, out), p(s, top, out), p(s, top, 0), color);
  }
  return { width, p, panel, molding };
}
type Face = ReturnType<typeof elevation>;
function arch(
  f: Face,
  s: number,
  w: number,
  y: number,
  h: number,
  rise: number,
  out: number,
  col: string,
  b: Builder
) {
  f.panel(s - w / 2, s + w / 2, y, y + h - rise, out, col, b);
  const cy = y + h - rise;
  for (let j = 0; j < 8; j++) {
    const a = (Math.PI * j) / 8,
      k = (Math.PI * (j + 1)) / 8;
    b.tri(
      f.p(s, cy, out),
      f.p(s + (w / 2) * Math.cos(a), cy + rise * Math.sin(a), out),
      f.p(s + (w / 2) * Math.cos(k), cy + rise * Math.sin(k), out),
      col
    );
  }
}
function roof(ring: P2[], y: number, color: string, b: Builder) {
  for (const [a, c, d] of ShapeUtils.triangulateShape(
    ring.map(([x, z]) => new Vector2(x, z)),
    []
  )) {
    const point = (i: number) => [ring[i][0], y, ring[i][1]];
    b.tri(point(a), point(d), point(c), color);
  }
}

export function createCandler(buildings: VBuilding[], grid: GroundGrid) {
  const hotel = site(buildings, grid, hotelId, hotelPlan),
    shop = site(buildings, grid, shopId, shopPlan);
  if (!hotel && !shop) return null;
  const stone = new Builder(),
    lit = new Builder(),
    random = rng(1906),
    group = new Group();
  group.name = 'Candler Building and 113 Peachtree storefront';
  group.position.y = -grid.manifest.vertical.sceneZeroNavd88M;
  if (hotel) {
    const { ring, base } = hotel,
      deck = 387.5,
      baseCornice = 333.7,
      pitch = (387.15 - baseCornice) / 15;
    roof(ring, deck, '#b1aaa0', stone);
    for (let i = 0; i < ring.length; i++) {
      const f = elevation(ring[i], ring[(i + 1) % ring.length], stone),
        w = f.width;
      const north = i === 2,
        west = i === 3,
        east = i === 1,
        street = north || west || east;
      const formal = street || i === 0;
      f.panel(0, w, base, deck, 0, formal ? marble : '#e4dfd2');
      if (w < 2) continue;
      // The north bank front has a centre opening and paired end windows. The two
      // long street elevations have nine double bays; Park Place adds a single.
      const bays = north ? 5 : west ? 9 : east ? 10 : Math.max(1, Math.round(w / 4.65));
      const inset = street ? 0.72 : 0.48,
        step = (w - 2 * inset) / bays;
      for (let bay = 0; bay < bays; bay++) {
        const s = inset + (bay + 0.5) * step;
        if (street) {
          const entrance = bay === (north ? 2 : Math.floor(bays / 2));
          const width = step * (entrance ? 0.91 : 0.8);
          if (entrance) {
            // Carved arch with bronze doors and a transom recessed inside the stone surround.
            arch(f, s, width, base + 0.2, baseCornice - base - 0.62, 1.1, 0.09, carved, stone);
            arch(f, s, width - 0.55, base + 0.2, baseCornice - base - 1.02, 1.0, 0.14, streetGlass, stone);
            f.panel(s - width * 0.26, s + width * 0.26, base + 0.18, base + 3.5, 0.19, '#8e744f');
            f.panel(s - 0.07, s + 0.07, base + 0.18, base + 3.5, 0.22, '#b4a078');
            for (const sign of [-1, 1])
              f.molding(
                s + sign * width * 0.46 - 0.11,
                s + sign * width * 0.46 + 0.11,
                base + 0.1,
                baseCornice - 1.3,
                0.33,
                light
              );
          } else {
            f.panel(s - width / 2, s + width / 2, base + 0.52, 328.25, 0.07, streetGlass);
            f.panel(s - width / 2, s + width / 2, 329.0, 332.85, 0.07, glass);
            f.panel(s - 0.06, s + 0.06, base + 0.52, 332.85, 0.13, sash);
            f.molding(s - width / 2, s + width / 2, 328.28, 328.88, 0.2, carved);
          }
        }
        for (let story = 0; story < 15; story++) {
          const floor = baseCornice + story * pitch;
          const paired = street ? (north ? bay === 0 || bay === 4 : !(east && bay === 9)) : false;
          const count = paired ? 2 : 1,
            pane = paired ? step * 0.28 : step * (north && bay === 2 ? 0.7 : 0.47);
          for (let j = 0; j < count; j++) {
            const center = s + (paired ? (j - 0.5) * step * 0.37 : 0);
            const y = floor + 0.6,
              h = pitch - 0.91;
            const target = random() < 0.15 ? lit : stone;
            if (story === 14 && formal) {
              arch(f, center, pane + 0.27, y - 0.1, h + 0.22, 0.55, 0.04, carved, stone);
              arch(f, center, pane, y, h, 0.5, 0.09, glass, target);
            } else {
              f.panel(center - pane / 2 - 0.11, center + pane / 2 + 0.11, y - 0.1, y + h + 0.12, 0.035, carved);
              f.panel(center - pane / 2, center + pane / 2, y, y + h, 0.08, glass, target);
            }
            f.panel(center - pane / 2, center + pane / 2, y + h * 0.47, y + h * 0.47 + 0.09, 0.12, sash);
          }
          if (formal && (north || bay % 3 !== 0))
            f.panel(s - step * 0.24, s + step * 0.24, floor + 0.14, floor + 0.44, 0.095, '#cfc4ae');
        }
      }
      if (formal) {
        f.molding(0, w, baseCornice - 0.48, baseCornice, 0.51, light);
        for (const floor of [2, 11, 12])
          f.molding(0, w, baseCornice + floor * pitch - 0.17, baseCornice + floor * pitch + 0.1, 0.26, light);
        for (let s = 0.43; s < w - 0.21; s += 1.15) f.molding(s - 0.16, s + 0.16, 386.65, 387.28, 0.65, carved);
        f.molding(-0.28, w + 0.28, 387.24, 387.73, 0.77, light);
        f.molding(-0.46, w + 0.46, 387.74, 388.14, 1.1, marble);
      }
    }
    // Three light-court braces are visible looking north from the park.
    for (const y of [345.5, 361.7, 377.8]) stone.box(10.1, 0.48, 0.53, 341.95, y, -313.6, '#8f9389');
    stone.box(11.6, 5.7, 10.7, 349.7, 390.35, -343, '#b9b3a9');
    stone.box(10.5, 5.75, 9.2, 340.8, 390.375, -327.7, '#b8b3a9');
    stone.box(4.0, 4.3, 11.5, 351.2, 389.65, -314.9, '#adaaa0');
  }
  if (shop) {
    const { ring, base } = shop,
      deck = 333.2;
    roof(ring, deck, '#b2ada1', stone);
    for (let i = 0; i < ring.length; i++) {
      const f = elevation(ring[i], ring[(i + 1) % ring.length], stone),
        w = f.width;
      f.panel(0, w, base, deck, 0, brick);
      if (i === 1) {
        // March 2025 Peachtree frontage: three dark storefronts, five upper sashes,
        // small attic vents and a raised brick parapet between projecting piers.
        const span = (w - 0.8) / 3;
        for (let j = 0; j < 3; j++) {
          const l = 0.4 + j * span,
            r = l + span;
          f.panel(l + 0.16, r - 0.16, base + 0.25, 327.62, 0.06, metal);
          f.panel(l + 0.33, r - 0.33, base + 0.45, 326.8, 0.1, streetGlass);
          f.panel((l + r) / 2 - 0.08, (l + r) / 2 + 0.08, base + 0.4, 327.5, 0.14, metal);
          for (const y of [324.75, 326.25]) f.panel(l + 0.2, r - 0.2, y, y + 0.1, 0.15, metal);
        }
        for (const [s, width] of [
          [0.105, 0.155],
          [0.255, 0.1],
          [0.435, 0.16],
          [0.675, 0.105],
          [0.857, 0.11],
        ]) {
          const l = w * (s - width / 2),
            r = w * (s + width / 2);
          f.panel(l - 0.13, r + 0.13, 328.4, 331.6, 0.04, carved);
          f.panel(l, r, 328.52, 331.48, 0.09, glass);
          f.panel(l, r, 330.7, 330.84, 0.13, metal);
        }
        for (let j = 0; j < 7; j++)
          f.panel(0.55 + (j * (w - 1.4)) / 7, 1.5 + (j * (w - 1.4)) / 7, 332.06, 332.48, 0.07, metal);
        f.molding(0, w, 331.77, 331.97, 0.22, light);
        f.molding(0, w, 332.9, 333.38, 0.2, brick);
        const canvas = document.createElement('canvas');
        canvas.width = 384;
        canvas.height = 72;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#2e3536';
        ctx.fillRect(0, 0, 384, 72);
        ctx.fillStyle = '#eadfcf';
        ctx.font = '32px Georgia,serif';
        ctx.textAlign = 'center';
        ctx.fillText('RISING ROLL', 192, 50);
        const texture = new CanvasTexture(canvas);
        texture.colorSpace = SRGBColorSpace;
        const enamel = new MeshLambertMaterial({ map: texture });
        enamel.addEventListener('dispose', () => texture.dispose());
        const sign = new Mesh(new PlaneGeometry(3.2, 0.6), enamel);
        const [sx, sy, sz] = f.p(w * 0.51, 327.98, 0.16);
        sign.position.set(sx, sy, sz);
        const [ox, , oz] = f.p(w * 0.51, 327.98, 1.16);
        sign.rotation.y = Math.atan2(ox - sx, oz - sz);
        group.add(sign);
      } else if (i === 2) {
        f.molding(0, w, 329.0, 329.17, 0.12, carved);
        for (let j = 0; j < 3; j++) {
          const l = 1.3 + j * 2.15;
          f.panel(l, l + 1.19, 329.45, 331.5, 0.06, glass);
        }
      }
    }
    stone.box(3.2, 1.5, 2.1, 330.3, 333.95, -305.4, '#a29e91');
    stone.box(2.5, 1.25, 2.7, 335, 333.825, -304.8, '#8f948d');
  }
  const shell = new Mesh(stone.geometry(), new MeshLambertMaterial({ vertexColors: true, side: DoubleSide }));
  shell.castShadow = shell.receiveShadow = true;
  group.add(shell);
  const panes = hotel
    ? new Mesh(lit.geometry(), new MeshLambertMaterial({
        vertexColors: true,
        side: DoubleSide,
        emissive: '#e6c289',
        emissiveIntensity: 0,
      }))
    : null;
  if (panes) group.add(panes);
  return {
    group,
    buildings: buildings.filter((b) => b !== hotel?.building && b !== shop?.building),
    setNight(night: number) {
      if (panes) panes.material.emissiveIntensity = 0.62 * night;
    },
  };
}
