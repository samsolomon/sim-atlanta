import { Builder, type P2 } from './geom';
import type { VBuilding } from './world';

type Front = 'poplar' | 'fourArches' | 'transom' | 'loft' | 'brick' | 'twinArches';
interface Lot {
  front: Front;
  south: P2;
  north: P2;
}

// In order from Poplar toward Walton. The first Overture record spans two fronts.
const lots = new Map<string, Lot>([
  [
    'f472648e-f73e-4031-86f4-d8d6885ba239',
    { front: 'poplar', south: [234.59, -177.75], north: [241.53, -193.56] },
  ],
  [
    '5bf06764-7551-4ae7-9442-88f6eb1fa43d',
    { front: 'transom', south: [231.28, -171.11], north: [234.59, -177.75] },
  ],
  [
    '2a99a93b-d963-4348-8792-a489cf3e4697',
    { front: 'loft', south: [226.88, -162.36], north: [231.28, -171.11] },
  ],
  [
    '2298c49e-cf23-4617-8ba9-cf2899b46d66',
    { front: 'brick', south: [222.66, -154.28], north: [226.88, -162.36] },
  ],
  [
    'c57236ea-b41d-49e7-88a5-32015b8830e0',
    { front: 'twinArches', south: [218.46, -145.83], north: [222.66, -154.28] },
  ],
]);
const near = (a: P2, b: P2) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.65;
const sameEdge = (a: P2, b: P2, c: P2, d: P2) => (near(a, c) && near(b, d)) || (near(a, d) && near(b, c));

export function woodruffLot(b: VBuilding) {
  const lot = lots.get(b.id);
  if (!lot || b.rings.length !== 1 || b.h === null || b.h < 10 || b.h > 22) return;
  const ring = b.rings[0];
  return ring.some((a, i) => sameEdge(a, ring[(i + 1) % ring.length], lot.south, lot.north)) ? lot : undefined;
}

const finishes: Record<Front, [string, string, string]> = {
  poplar: ['#ddd9cc', '#ece7d9', '#a39c8d'],
  fourArches: ['#ae6354', '#733d33', '#482f2b'],
  transom: ['#d1d4d0', '#e6e8dc', '#8c9293'],
  loft: ['#b7ae9a', '#cfc6b5', '#827d73'],
  brick: ['#a86750', '#d7c7ad', '#66514a'],
  twinArches: ['#d3c4a9', '#e1d3b9', '#93846b'],
};

type Point = (u: number, y: number, offset: number) => number[];

// A bay is cut out of the face plane. Four jambs (or a segmental arch) return
// to glass behind it. All stone, frames and unlit panes share the building batch.
function shopElevation(
  stone: Builder,
  lit: Builder,
  p: Point,
  start: number,
  end: number,
  base: number,
  top: number,
  form: Front,
  side: boolean,
) {
  const width = end - start,
    [wall, trim, reveal] = finishes[form];
  const glass = form === 'transom' || form === 'poplar' ? '#839092' : '#58656b';
  function panel(l: number, r: number, y: number, h: number, d: number, color: string) {
    stone.quad(p(l, y, d), p(r, y, d), p(r, h, d), p(l, h, d), color);
  }
  function ledge(l: number, r: number, y: number, h: number, d: number, color: string) {
    panel(l, r, y, h, d, color);
    stone.quad(p(l, h, 0), p(l, h, d), p(r, h, d), p(r, h, 0), color);
    stone.quad(p(l, y, 0), p(r, y, 0), p(r, y, d), p(l, y, d), reveal);
    stone.quad(p(l, y, 0), p(l, y, d), p(l, h, d), p(l, h, 0), color);
    stone.quad(p(r, y, d), p(r, y, 0), p(r, h, 0), p(r, h, d), color);
  }
  function row(
    y: number,
    h: number,
    bays: number,
    inset: number,
    arch: number,
    mullions: number,
    store: boolean,
  ) {
    const bay = width / bays,
      d = store ? -0.34 : -0.18,
      sill = y + (store ? 0.7 : 0.72);
    for (let i = 0; i < bays; i++) {
      const l = start + i * bay,
        r = l + bay,
        left = l + inset,
        right = r - inset;
      const apex = h - (store ? 0.28 : 0.83),
        spring = apex - arch;
      panel(l, left, y, h, 0, wall);
      panel(right, r, y, h, 0, wall);
      panel(left, right, y, sill, 0, store ? reveal : wall);
      // The wall above the arch is tessellated against the same curve as the glazing.
      const panes = mullions + 1;
      const slices = arch ? (store ? panes * 4 : 10) : store ? panes : 1;
      const head = (t: number) => spring + arch * Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2));
      for (let j = 0; j < slices; j++) {
        const x0 = left + ((right - left) * j) / slices,
          x1 = left + ((right - left) * (j + 1)) / slices;
        const a = head(j / slices),
          b = head((j + 1) / slices);
        stone.quad(p(x0, a, 0), p(x1, b, 0), p(x1, h, 0), p(x0, h, 0), wall);
        stone.quad(p(x0, a, 0), p(x0, a, d), p(x1, b, d), p(x1, b, 0), reveal);
        const paneIndex = i * panes + Math.floor((j * panes) / slices);
        const pane = store && (paneIndex + form.length) % 5 < 2 ? lit : stone;
        pane.quad(p(x0, sill, d), p(x1, sill, d), p(x1, b, d), p(x0, a, d), glass);
      }
      stone.quad(p(left, sill, 0), p(left, sill, d), p(left, spring, d), p(left, spring, 0), reveal);
      stone.quad(p(right, sill, d), p(right, sill, 0), p(right, spring, 0), p(right, spring, d), reveal);
      stone.quad(p(left, sill, 0), p(right, sill, 0), p(right, sill, d), p(left, sill, d), trim);
      const sash = store || form === 'loft' || form === 'fourArches' ? '#464d4b' : trim;
      for (let m = 1; m <= mullions; m++) {
        const u = left + ((right - left) * m) / (mullions + 1);
        panel(u - 0.045, u + 0.045, sill, spring, d + 0.04, sash);
      }
      const bar = store ? spring - 0.6 : (sill + spring) / 2;
      panel(left, right, bar - 0.045, bar + 0.045, d + 0.045, sash);
      if (!store && form !== 'loft' && form !== 'transom')
        ledge(left - 0.09, right + 0.09, sill - 0.12, sill, 0.12, trim);
    }
  }
  const shopTop = base + 4.4;
  const signColor = form === 'fourArches' || form === 'loft' || form === 'brick' ? '#393b3b' : reveal;
  // Street openings and the fascia occupy a different register from the upper sash.
  row(
    base - 0.5,
    shopTop,
    side ? 6 : form === 'poplar' ? 2 : 1,
    0.29,
    form === 'poplar' ? 0.65 : 0,
    side ? 1 : 3,
    true,
  );
  ledge(start, end, shopTop, shopTop + 0.56, 0.14, signColor);
  if (form === 'loft') {
    // The P62 canvas awning slopes over the pavement and drops to a dark valance.
    const back = shopTop + 0.72,
      lip = shopTop + 0.03,
      reach = 0.92;
    stone.quad(p(start, lip, reach), p(end, lip, reach), p(end, back, 0), p(start, back, 0), signColor);
    panel(start, end, lip - 0.19, lip, reach, signColor);
    for (const u of [start, end]) stone.tri(p(u, lip, reach), p(u, back, 0), p(u, lip, 0), signColor);
  }
  const upper = shopTop + 0.56;
  if (form === 'transom' || form === 'twinArches') {
    const header = form === 'transom' ? 2.35 : 0.8;
    row(
      upper,
      top - header,
      form === 'transom' ? 1 : 2,
      0.28,
      form === 'twinArches' ? 1.0 : 0,
      form === 'transom' ? 6 : 2,
      false,
    );
    panel(start, end, top - header, top, 0, wall);
  } else {
    const bays = side ? 6 : form === 'loft' ? 1 : form === 'poplar' ? 2 : 4;
    const middle = upper + (top - upper) * 0.48;
    for (const [y, h] of [
      [upper, middle],
      [middle, top - 0.52],
    ]) {
      const arch = form === 'fourArches' && y === middle ? 0.76 : form === 'brick' ? 0.23 : 0;
      const sash = form === 'loft' ? 5 : form === 'poplar' || form === 'brick' ? 1 : 0;
      row(y, h, bays, form === 'poplar' ? 0.84 : form === 'brick' ? 0.53 : 0.37, arch, sash, false);
    }
    panel(start, end, top - 0.52, top, 0, wall);
  }
  const cap = form === 'brick' || form === 'fourArches' ? '#544a40' : trim;
  ledge(start, end, top - 0.3, top, 0.27, cap);
  ledge(start, end, top - 0.49, top - 0.34, 0.13, cap);
}

// Returns false for other streets, which keep their existing material and roof treatment.
export function appendWoodruffWall(
  lot: Lot,
  a: P2,
  b: P2,
  base: number,
  top: number,
  stone: Builder,
  lit: Builder,
) {
  const front = sameEdge(a, b, lot.south, lot.north);
  const poplar = lot.front === 'poplar' && sameEdge(a, b, lot.north, [226.33, -211.33]);
  let from = a,
    to = b;
  if ((front && !near(a, lot.south)) || (poplar && !near(a, lot.north))) [from, to] = [b, a];
  const width = Math.hypot(to[0] - from[0], to[1] - from[1]);
  if (!width) return false;
  const dx = (to[0] - from[0]) / width,
    dz = (to[1] - from[1]) / width;
  const point: Point = (u, y, d) => [from[0] + dx * u - dz * d, y, from[1] + dz * u + dx * d];
  if (!front && !poplar) {
    // Shared lot lines between the long, narrow stores have exposed party walls
    // above their neighbors. Broad Street at the back remains a separate frontage.
    if (Math.abs(dx * 0.65 + dz * 0.76) < 0.97) return false;
    stone.quad(
      point(0, base - 0.5, 0),
      point(width, base - 0.5, 0),
      point(width, top, 0),
      point(0, top, 0),
      finishes[lot.front][2],
    );
    return true;
  }
  if (front && lot.front === 'poplar') {
    const joint = width * 0.49;
    shopElevation(stone, lit, point, 0, joint, base, top + 1.2, 'fourArches', false);
    // Return the raised brick parapet behind its projecting cornice.
    stone.quad(
      point(0, top, 0),
      point(0, top, -0.48),
      point(0, top + 1.2, -0.48),
      point(0, top + 1.2, 0),
      '#884e40',
    );
    stone.quad(
      point(joint, top, -0.48),
      point(joint, top, 0),
      point(joint, top + 1.2, 0),
      point(joint, top + 1.2, -0.48),
      '#884e40',
    );
    stone.quad(
      point(0, top + 1.2, -0.48),
      point(joint, top + 1.2, -0.48),
      point(joint, top + 1.2, 0),
      point(0, top + 1.2, 0),
      '#635a51',
    );
    stone.quad(
      point(0, top, -0.48),
      point(joint, top, -0.48),
      point(joint, top + 1.2, -0.48),
      point(0, top + 1.2, -0.48),
      '#884e40',
    );
    shopElevation(stone, lit, point, joint, width, base, top, 'poplar', false);
  } else shopElevation(stone, lit, point, 0, width, base, top, lot.front, poplar);
  return true;
}
