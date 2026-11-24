/**
 * Mid-ring LOD for one square-board area, built from the files City already ships
 * (`context.json` and `ground.i16`). Pure and DOM-free, so it runs in a Worker and in tests.
 *
 * Three non-indexed, flat-shaded triangle soups share one vertex-coloured Lambert material:
 * - ground: the 5 m grid decimated to `groundStepM`, painted per vertex (roads, parks, paving),
 *   with a skirt down to the board's bottom so a full neighbour's closed edge meets it cleanly
 * - blocks: every building as its footprint's minimum-area rectangle, extruded to its height
 * - forest: trees merged per `forestCellM` cell into one faceted clump, sized from the crowns
 *
 * Nothing here is shown as fact: buildings, heights and trees are ambient scenery (AGENTS.md).
 */

export interface LodGroundManifest {
  rows: number; cols: number; stepM: number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  scaleM: number; offsetM: number; noData: number;
  vertical: { sceneZeroNavd88M: number };
}

type Ring = [number, number][];
export interface LodContext {
  buildings: { cls?: string | null; floors?: number | null; h?: number | null; rings: Ring[] }[];
  roads: { cls: string; pts: [number, number][]; bridge?: boolean; tunnel?: boolean }[];
  ground?: { kind: string; rings: Ring[] }[];
  /** [x, z, height, crown radius] */
  trees: [number, number, number, number][];
}

export interface LodOptions {
  groundStepM: number;
  forestCellM: number;
  bottomY: number;
}

export interface LodPart { position: Float32Array; normal: Float32Array; color: Float32Array }
export interface LodResult {
  ground: LodPart; blocks: LodPart; forest: LodPart;
  /** Decimated scene-space heights for groundAt, row-major from minZ, x fastest. */
  heights: Float32Array; hCols: number; hRows: number; hStep: number;
  stats: { buildings: number; trees: number; clumps: number; triangles: number };
}

const ROAD_HALF: Record<string, number> = { motorway: 8, trunk: 7, primary: 6.5, secondary: 5.5, tertiary: 4.5, residential: 3.5, unclassified: 3.5 };
const C = {
  ground: [0.62, 0.66, 0.50], road: [0.42, 0.43, 0.45], paved: [0.70, 0.68, 0.63], park: [0.50, 0.62, 0.38],
  water: [0.45, 0.58, 0.66], skirt: [0.71, 0.59, 0.46],
} as const;
// City's palette as it reads from the mid ring: glass towers, cream, tan, brick and grey mid-rises,
// pale roofs with the odd green one, and warm house roofs.
const TOWER: RGB[] = [[0.68, 0.75, 0.84], [0.62, 0.70, 0.80], [0.74, 0.78, 0.84]];
const MIDRISE: RGB[] = [[0.88, 0.84, 0.76], [0.78, 0.70, 0.60], [0.66, 0.40, 0.33], [0.74, 0.74, 0.74], [0.84, 0.80, 0.72]];
const HOUSE: RGB[] = [[0.90, 0.86, 0.78], [0.80, 0.70, 0.58], [0.72, 0.48, 0.38]];
const ROOF: RGB[] = [[0.90, 0.88, 0.84], [0.86, 0.85, 0.82], [0.80, 0.80, 0.78], [0.55, 0.66, 0.40]];
const HOUSE_ROOF: RGB[] = [[0.55, 0.36, 0.30], [0.48, 0.44, 0.42], [0.62, 0.52, 0.44]];
const hash = (x: number, z: number) => { const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return h - Math.floor(h); };
const pick = (list: RGB[], t: number) => list[Math.floor(t * list.length) % list.length];
const shade = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
type RGB = readonly number[];

/** sRGB to linear, since the material treats vertex colours as linear. */
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

class Soup {
  p: number[] = []; c: number[] = [];
  tri(a: number[], b: number[], d: number[], col: RGB) {
    this.p.push(...a, ...b, ...d);
    const r = lin(col[0]), g = lin(col[1]), bl = lin(col[2]);
    this.c.push(r, g, bl, r, g, bl, r, g, bl);
  }
  quad(a: number[], b: number[], c: number[], d: number[], col: RGB) { this.tri(a, b, c, col); this.tri(a, c, d, col); }
  /** Per-vertex colours (smooth ground). */
  tri3(a: number[], b: number[], d: number[], ca: RGB, cb: RGB, cd: RGB) {
    this.p.push(...a, ...b, ...d);
    for (const col of [ca, cb, cd]) this.c.push(lin(col[0]), lin(col[1]), lin(col[2]));
  }
  part(): LodPart {
    const position = new Float32Array(this.p);
    const normal = new Float32Array(position.length);
    for (let i = 0; i < position.length; i += 9) {
      const ux = position[i + 3] - position[i], uy = position[i + 4] - position[i + 1], uz = position[i + 5] - position[i + 2];
      const vx = position[i + 6] - position[i], vy = position[i + 7] - position[i + 1], vz = position[i + 8] - position[i + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      for (let k = 0; k < 3; k++) { normal[i + 3 * k] = nx; normal[i + 3 * k + 1] = ny; normal[i + 3 * k + 2] = nz; }
    }
    return { position, normal, color: new Float32Array(this.c) };
  }
}

function pointInRing(x: number, z: number, ring: Ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function hull(points: Ring): Ring {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Ring = [], upper: Ring = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/** Minimum-area enclosing rectangle (rotating edges of the hull), corners counter-clockwise. */
export function footprintBox(ring: Ring): Ring | null {
  const h = hull(ring);
  if (h.length < 3) return null;
  let best: Ring | null = null, bestArea = Infinity;
  for (let i = 0; i < h.length; i++) {
    const [ax, az] = h[i], [bx, bz] = h[(i + 1) % h.length];
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 1e-6) continue;
    const ux = (bx - ax) / len, uz = (bz - az) / len;
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (const [x, z] of h) {
      const u = x * ux + z * uz, v = -x * uz + z * ux;
      if (u < minU) minU = u; if (u > maxU) maxU = u; if (v < minV) minV = v; if (v > maxV) maxV = v;
    }
    const area = (maxU - minU) * (maxV - minV);
    if (area < bestArea) {
      bestArea = area;
      const at = (u: number, v: number): [number, number] => [u * ux - v * uz, u * uz + v * ux];
      best = [at(minU, minV), at(maxU, minV), at(maxU, maxV), at(minU, maxV)];
    }
  }
  return best;
}

export function buildLod(ctx: LodContext, m: LodGroundManifest, bytes: ArrayBuffer, o: LodOptions): LodResult {
  const view = new DataView(bytes);
  const b = m.bounds, zero = m.vertical.sceneZeroNavd88M;
  const node = (r: number, c: number) => {
    const raw = view.getInt16(2 * (r * m.cols + c), true);
    return raw === m.noData ? null : raw * m.scaleM + m.offsetM - zero;
  };
  const sample = (x: number, z: number) => {
    const c = Math.round((x - b.minX) / m.stepM), r = Math.round((z - b.minZ) / m.stepM);
    if (c < 0 || r < 0 || c >= m.cols || r >= m.rows) return null;
    return node(r, c);
  };

  // ---- ground --------------------------------------------------------------------------
  const k = Math.max(1, Math.round(o.groundStepM / m.stepM));
  const step = k * m.stepM;
  const hCols = Math.floor((m.cols - 1) / k) + 1, hRows = Math.floor((m.rows - 1) / k) + 1;
  const heights = new Float32Array(hCols * hRows);
  let last = 0;
  for (let r = 0; r < hRows; r++) for (let c = 0; c < hCols; c++) {
    const v = node(Math.min(m.rows - 1, r * k), Math.min(m.cols - 1, c * k));
    heights[r * hCols + c] = last = v ?? last;
  }
  const paint: RGB[] = new Array(hCols * hRows).fill(C.ground);
  for (const g of ctx.ground ?? []) {
    const col = /park|grass|garden|meadow|wood|forest|cemetery|golf|pitch|recreation/.test(g.kind) ? C.park
      : /water|river|pond/.test(g.kind) ? C.water : /parking|pave|plaza|railway|industrial/.test(g.kind) ? C.paved : null;
    if (!col || !g.rings[0]?.length) continue;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z] of g.rings[0]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    for (let r = Math.max(0, Math.ceil((z0 - b.minZ) / step)); r <= Math.min(hRows - 1, Math.floor((z1 - b.minZ) / step)); r++)
      for (let c = Math.max(0, Math.ceil((x0 - b.minX) / step)); c <= Math.min(hCols - 1, Math.floor((x1 - b.minX) / step)); c++)
        if (pointInRing(b.minX + c * step, b.minZ + r * step, g.rings[0])) paint[r * hCols + c] = col;
  }
  for (const road of ctx.roads) {
    const half = ROAD_HALF[road.cls];
    if (!half || road.tunnel) continue;
    // Stamp the nodes within the road's half width plus half a cell, so a road reads at any step.
    const reach = half + step * 0.5;
    for (let i = 1; i < road.pts.length; i++) {
      const [ax, az] = road.pts[i - 1], [bx, bz] = road.pts[i];
      const len = Math.hypot(bx - ax, bz - az);
      for (let s = 0; s <= len; s += step * 0.5) {
        const x = ax + ((bx - ax) * s) / (len || 1), z = az + ((bz - az) * s) / (len || 1);
        const c0 = Math.ceil((x - reach - b.minX) / step), c1 = Math.floor((x + reach - b.minX) / step);
        const r0 = Math.ceil((z - reach - b.minZ) / step), r1 = Math.floor((z + reach - b.minZ) / step);
        for (let r = Math.max(0, r0); r <= Math.min(hRows - 1, r1); r++)
          for (let c = Math.max(0, c0); c <= Math.min(hCols - 1, c1); c++) {
            if (Math.hypot(b.minX + c * step - x, b.minZ + r * step - z) <= reach) paint[r * hCols + c] = C.road;
          }
      }
    }
  }
  const ground = new Soup();
  const vx = (c: number) => Math.min(b.maxX, b.minX + c * step), vz = (r: number) => Math.min(b.maxZ, b.minZ + r * step);
  const at = (r: number, c: number) => [vx(c), heights[r * hCols + c], vz(r)];
  for (let r = 0; r < hRows - 1; r++) for (let c = 0; c < hCols - 1; c++) {
    const i00 = r * hCols + c, i10 = i00 + 1, i01 = i00 + hCols, i11 = i01 + 1;
    ground.tri3(at(r, c), at(r + 1, c), at(r + 1, c + 1), paint[i00], paint[i01], paint[i11]);
    ground.tri3(at(r, c), at(r + 1, c + 1), at(r, c + 1), paint[i00], paint[i11], paint[i10]);
  }
  // Skirts on all four sides, down to the shared plinth top.
  const yb = o.bottomY;
  const skirt = (p: number[], q: number[]) => ground.quad([p[0], yb, p[2]], [q[0], yb, q[2]], q, p, C.skirt);
  for (let c = 0; c < hCols - 1; c++) { skirt(at(0, c + 1), at(0, c)); skirt(at(hRows - 1, c), at(hRows - 1, c + 1)); }
  for (let r = 0; r < hRows - 1; r++) { skirt(at(r, 0), at(r + 1, 0)); skirt(at(r + 1, hCols - 1), at(r, hCols - 1)); }

  // ---- blocks --------------------------------------------------------------------------
  const blocks = new Soup();
  let buildings = 0;
  for (const bd of ctx.buildings) {
    const outer = bd.rings[0];
    if (!outer || outer.length < 3) continue;
    const box = footprintBox(outer);
    if (!box) continue;
    const w = Math.hypot(box[1][0] - box[0][0], box[1][1] - box[0][1]);
    const d = Math.hypot(box[2][0] - box[1][0], box[2][1] - box[1][1]);
    if (w * d < 25) continue;
    const h = bd.h ?? (bd.floors ? bd.floors * 3.6 : 8);
    let base = Infinity;
    for (const [x, z] of box) base = Math.min(base, sample(x, z) ?? Infinity);
    if (!Number.isFinite(base)) continue;
    const top = base + h;
    const t = hash(box[0][0], box[0][1]);
    const house = /house|detached|residential|semi|terrace/.test(bd.cls ?? '') || (h < 11 && w * d < 400);
    const wall = h > 40 ? pick(TOWER, t) : house ? pick(HOUSE, t) : pick(MIDRISE, t);
    const roof = house ? pick(HOUSE_ROOF, t * 7 % 1) : pick(ROOF, t * 5 % 1);
    // Walls darken toward the street, a cheap stand-in for the near ring's ground-floor shadow.
    const foot = shade(wall, 0.82);
    for (let i = 0; i < 4; i++) {
      const [ax, az] = box[i], [bx, bz] = box[(i + 1) % 4];
      blocks.tri3([ax, base, az], [bx, base, bz], [bx, top, bz], foot, foot, wall);
      blocks.tri3([ax, base, az], [bx, top, bz], [ax, top, az], foot, wall, wall);
    }
    blocks.quad([box[0][0], top, box[0][1]], [box[3][0], top, box[3][1]], [box[2][0], top, box[2][1]], [box[1][0], top, box[1][1]], roof);
    buildings++;
  }

  // ---- forest --------------------------------------------------------------------------
  const cell = o.forestCellM;
  const cells = new Map<number, { n: number; x: number; z: number; h: number; area: number; minX: number; maxX: number; minZ: number; maxZ: number }>();
  const cw = Math.ceil((b.maxX - b.minX) / cell) + 1;
  for (const [x, z, h, rad] of ctx.trees) {
    const key = Math.floor((z - b.minZ) / cell) * cw + Math.floor((x - b.minX) / cell);
    const e = cells.get(key) ?? { n: 0, x: 0, z: 0, h: 0, area: 0, minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
    e.n++; e.x += x; e.z += z; e.h += h; e.area += Math.PI * rad * rad;
    e.minX = Math.min(e.minX, x - rad); e.maxX = Math.max(e.maxX, x + rad); e.minZ = Math.min(e.minZ, z - rad); e.maxZ = Math.max(e.maxZ, z + rad);
    cells.set(key, e);
  }
  const forest = new Soup();
  const GREENS: RGB[] = [[0.42, 0.55, 0.30], [0.36, 0.50, 0.28], [0.47, 0.58, 0.33], [0.40, 0.52, 0.34]];
  const SIDES = 6;
  for (const [key, e] of cells) {
    const cx = e.x / e.n, cz = e.z / e.n, h = Math.max(5, e.h / e.n);
    const g = sample(cx, cz);
    if (g === null) continue;
    // The clump covers the crowns' area but stays inside the crowns' extent.
    const span = Math.min(e.maxX - e.minX, e.maxZ - e.minZ) / 2;
    const rad = Math.max(3, Math.min(Math.sqrt(e.area / Math.PI), span, cell * 0.75));
    const col = GREENS[key % GREENS.length];
    const dark: RGB = [col[0] * 0.8, col[1] * 0.8, col[2] * 0.8];
    const yTop = g + h, yMid = g + h * 0.62, yLow = g + h * 0.3;
    const turn = (key % 7) * 0.4;
    const ring = (y: number, s: number) => Array.from({ length: SIDES }, (_, i) => {
      const a = turn + (i / SIDES) * Math.PI * 2;
      return [cx + Math.cos(a) * rad * s, y, cz + Math.sin(a) * rad * s];
    });
    const mid = ring(yMid, 1), low = ring(yLow, 0.7), apex = [cx, yTop, cz];
    for (let i = 0; i < SIDES; i++) {
      const j = (i + 1) % SIDES;
      forest.tri(apex, mid[j], mid[i], col);
      forest.quad(mid[i], mid[j], low[j], low[i], dark);
    }
  }

  const parts = { ground: ground.part(), blocks: blocks.part(), forest: forest.part() };
  const triangles = (parts.ground.position.length + parts.blocks.position.length + parts.forest.position.length) / 9;
  return { ...parts, heights, hCols, hRows, hStep: step, stats: { buildings, trees: ctx.trees.length, clumps: cells.size, triangles } };
}
