import type { GroundGrid } from '../terrain/grid';
import { pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { seedOf } from './skin-kit';

/**
 * The parking deck at the north-west corner of Peachtree Street and Andrew Young International
 * Boulevard (215 Peachtree), in front of 230 Peachtree. White precast spandrels over six open
 * levels stand on a commercial base: a bank storefront in a white frame and stone veneer at the
 * corner, second-floor windows behind a railing, and a curved dark-glass bay at the corner. A
 * large LED sign hangs on the corner; it is drawn as a blank screen, never its content. Along
 * International Boulevard the base is a plain painted wall.
 *
 * The April 2019 lidar puts the deck's flat top at NAVD88 354-357 over street grade of about
 * 326.5, which is 29.5 m, not the mapped 38.9 m. A 6 m strip of the outline against 230 Peachtree
 * returned no points at 2 m resolution, while the open alley just east of it returned the
 * ground. That fits a glass roof, so the strip is a low dark-glass link at the base's height.
 * Its height is an estimate. The west wall is shared with the deck skins-3 rebuilt.
 *
 * Sources (Google Street View): the corner, Nov 2025, heading 315,
 * https://www.google.com/maps/@33.7596777,-84.3875609,3a,90y,315h,110t; the Peachtree front,
 * Apr 2026, heading 270, https://www.google.com/maps/@33.7598527,-84.3876187,3a,90y,270h,110t;
 * International Boulevard mid-block, Apr 2026, heading 0,
 * https://www.google.com/maps/@33.7597268,-84.3880461,3a,90y,0h,110t. No usable night photograph
 * was found, so the night look is estimated. Estimated: level heights (from the lidar top), the
 * corner bay's size, the sign's size, and the roof's parked cars (illustrative). No logos.
 */
export const peachtreeInternationalDeckId = '51c354f8-8474-4375-a573-d6eb78e57ca0';

// NAVD88 metres.
const baseTop = 335.0,
  level = 3.4,
  levels = 6,
  roof = baseTop + levels * level, // 355.4
  parapet = roof + 1.0,
  linkTop = baseTop;

const precast = '#dad8d1',
  precastShade = '#c4c2bb',
  interior = '#383b3d',
  storefront = '#3b4850',
  frame = '#e6e4de',
  stone = '#a88f74',
  paintedBase = '#9c9a95',
  darkGlass = '#3d4650',
  screen = '#2a2e33',
  roofDeck = '#a39e93',
  stripe = '#dcd8cc';

const origin: P2 = [333, -667];
// Local plans (x east, z = world z + 667; negative z is north): the deck block and the glass link.
const block: P2[] = [[26.39, 11.66], [26.53, -6.73], [-25.56, -6.93], [-25.71, 11.24]];
const link: P2[] = [[5.36, -6.9], [5.41, -13.19], [-25.52, -13.45], [-25.56, -6.93]];

type Shell = NonNullable<ReturnType<typeof landmarkShell>>;
const positive = (plan: P2[]) => plan.reduce((t, [x, z], i) => {
  const [x2, z2] = plan[(i + 1) % plan.length];
  return t + x * z2 - x2 * z;
}, 0) > 0 ? plan : [...plan].reverse();

function faceOf(s: Shell, a: P2, b: P2) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
  const nx = dz / len, nz = -dx / len;
  const at = (t: number, y: number, out: number) => [a[0] + t * dx + nx * out, y, a[1] + t * dz + nz * out];
  return {
    len, nx, nz,
    quad(l: number, r: number, y0: number, y1: number, out: number, c: string, lit = false) {
      (lit ? s.lights : s.body).quad(at(l, y0, out), at(l, y1, out), at(r, y1, out), at(r, y0, out), c);
    },
    cap(y: number, in0: number, out0: number, c: string) {
      s.body.quad(at(0, y, in0), at(0, y, out0), at(1, y, out0), at(1, y, in0), c);
    },
  };
}

export function createPeachtreeInternationalDeck(buildings: VBuilding[], grid: GroundGrid) {
  const s = landmarkShell(buildings, grid, peachtreeInternationalDeckId, 'Peachtree and International deck', origin, [1, 0], [[0, 0], [20, 5], [-20, 5]]);
  if (!s) return null;
  const seed = seedOf(peachtreeInternationalDeckId);
  const groundAt = (x: number, z: number) => grid.sample(x + origin[0], z + origin[1]) ?? 326.5;

  const deck = positive(block);
  s.prism(deck, s.base, roof, precast, roofDeck);
  s.prism(positive(link), s.base, linkTop, darkGlass, darkGlass);

  deck.forEach((a, i) => {
    const b = deck[(i + 1) % deck.length];
    const f = faceOf(s, a, b);
    const east = f.nx > 0.7, south = f.nz > 0.7;
    const ground = Math.min(groundAt(...a), groundAt(...b));
    // Base: shopfronts and a window floor on Peachtree and the corner end of International
    // Boulevard; a painted wall along the rest of the boulevard; plain precast at the back.
    if (east || south) {
      // On International Boulevard the shops fill the 40% nearest the Peachtree corner (the east end).
      const cornerAtB = b[0] > a[0];
      const [shopFrom, shopTo] = east ? [0, 1] : cornerAtB ? [0.6, 1] : [0, 0.4];
      if (south) f.quad(cornerAtB ? 0 : 0.4, cornerAtB ? 0.6 : 1, s.base, baseTop, 0.04, paintedBase);
      f.quad(shopFrom, shopTo, s.base, baseTop, 0.04, stone);
      const shops = Math.max(1, Math.round(f.len * (shopTo - shopFrom) / 6));
      for (let k = 0; k < shops; k++) {
        const l = shopFrom + (k + 0.1) / shops * (shopTo - shopFrom), r = shopFrom + (k + 0.9) / shops * (shopTo - shopFrom);
        f.quad(l, r, ground + 0.3, ground + 4.2, 0.12, frame);
        f.quad(l + 0.15 / f.len, r - 0.15 / f.len, ground + 0.45, ground + 4.0, 0.16, storefront, true);
        f.quad(l, r, ground + 5.0, baseTop - 0.8, 0.12, storefront); // offices: dark at night
      }
      f.quad(shopFrom, shopTo, ground + 4.6, ground + 4.75, 0.2, '#3a3c3e'); // the railing's top rail
    } else f.quad(0, 1, s.base, baseTop, 0.04, precastShade);

    // Six open levels behind white spandrels, with ceiling lights.
    for (let k = 0; k < levels; k++) {
      const slab = baseTop + k * level, next = slab + level;
      f.quad(0, 1, slab + 1.2, next - 0.2, 0.04, interior);
      f.quad(0, 1, next - 0.55, next - 0.2, 0.08, interior, true);
      f.quad(0, 1, next - 0.2, next + 1.2, 0.2, precast);
    }
    f.quad(0, 1, baseTop - 0.2, baseTop + 1.2, 0.2, precast);
    f.cap(parapet + 0.2, -0.25, 0.2, precastShade);
    f.quad(1, 0, roof, parapet + 0.2, -0.25, precastShade);
  });

  // The curved dark-glass bay at the Peachtree corner (above the bank), faceted in three. It
  // bulges up to 1.7 m past both faces, with short returns to the walls and flat caps.
  const r = 4.2, bayLo = 330.6, bayHi = 340.4;
  const corner: P2 = [26.4, 11.6];
  const centre: P2 = [corner[0] - 2.5, corner[1] - 2.5];
  const arc = [0, 1, 2, 3].map(k => {
    const t = (k / 3) * (Math.PI / 2); // +x (east) round to +z (south)
    return [centre[0] + r * Math.cos(t), centre[1] + r * Math.sin(t)] as P2;
  });
  const wallE: P2 = [corner[0], arc[0][1]], wallS: P2 = [arc[3][0], corner[1]];
  const rim = [wallE, ...arc, wallS];
  for (let k = 0; k < rim.length - 1; k++) {
    const [p, q] = [rim[k], rim[k + 1]];
    s.body.quad([p[0], bayLo, p[1]], [p[0], bayHi, p[1]], [q[0], bayHi, q[1]], [q[0], bayLo, q[1]], darkGlass);
  }
  for (const y of [bayLo, bayHi]) for (let k = 0; k < rim.length - 1; k++) {
    const [p, q] = [rim[k], rim[k + 1]];
    s.body.quad([corner[0], y, corner[1]], [p[0], y, p[1]], [q[0], y, q[1]], [q[0], y, q[1]], precastShade);
  }

  // The corner sign on the Peachtree face, near the corner: a blank screen, content never drawn.
  {
    const x = 26.5 + 0.45, y0 = 338.0, y1 = 345.5, z0 = 3.5, z1 = 10.5;
    s.body.quad([x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1], screen);
    s.lights.quad([x + 0.05, y0 + 0.3, z0 + 0.3], [x + 0.05, y1 - 0.3, z0 + 0.3], [x + 0.05, y1 - 0.3, z1 - 0.3], [x + 0.05, y0 + 0.3, z1 - 0.3], '#4c5866');
  }

  // The roof: two back-to-back pairs of stall rows running east-west.
  const flat = (x0: number, x1: number, z0: number, z1: number, c: string) =>
    s.body.quad([x0, roof + 0.03, z0], [x0, roof + 0.03, z1], [x1, roof + 0.03, z1], [x1, roof + 0.03, z0], c);
  const car = (x: number, z: number, paint: string) => {
    const hw = 0.9, hl = 2.25, h = 1.25;
    const c = [[x - hw, roof + 0.05, z - hl], [x + hw, roof + 0.05, z - hl], [x + hw, roof + 0.05, z + hl], [x - hw, roof + 0.05, z + hl]];
    const t = c.map(([px, , pz]) => [px, roof + h, pz]);
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; s.body.quad(c[i], t[i], t[j], c[j], paint); }
    s.body.quad(t[0], t[3], t[2], t[1], paint);
    s.body.quad([x - 0.8, roof + h + 0.02, z - 0.9], [x - 0.8, roof + h + 0.02, z + 1.1], [x + 0.8, roof + h + 0.02, z + 1.1], [x + 0.8, roof + h + 0.02, z - 0.9], '#2c3236');
  };
  const paints = ['#8e9898', '#cbc5b6', '#2f3438', '#8a5a4e', '#5f7280'];
  let cars = 0;
  for (const [row, zc] of [-3.4, 2.0].entries()) {
    for (let x = -22, spot = 0; x <= 23; x += 2.7, spot++) {
      if (![[x - 1.35, zc - 2.5], [x + 1.35, zc + 2.5]].every(([px, pz]) => pointInRing(px, pz, deck))) continue;
      if (row === 0) flat(x - 1.35, x - 1.21, zc - 2.45, zc + 7.85, stripe);
      if (((seed >>> ((spot + row) % 24)) + spot * 5 + row * 7) % 3 !== 0 || cars >= 8) continue;
      cars++;
      car(x, zc, paints[(spot + row) % paints.length]);
    }
  }
  return s.finish('#f2ecd8', 0.6);
}
