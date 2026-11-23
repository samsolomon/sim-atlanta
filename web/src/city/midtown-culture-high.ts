import { pointInRing, type Builder, type P2 } from '../vignette/geom';

/** Meier's porcelain-enamel panels: an estimated 1.5 m square module. */
export const enamelModule = 1.5;
const joint = '#d6d7d2';

/**
 * Lays enamel panel joints on the outside of every wall of a prism plan,
 * from `lo` to `hi`. Joints are 0.1 m so they hold at City's orbit floor.
 */
export function enamelGrid(body: Builder, plan: P2[], lo: number, hi: number, skip = 0) {
  for (let i = 0; i < plan.length; i++) {
    const a = plan[i],
      b = plan[(i + 1) % plan.length];
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      len = Math.hypot(dx, dz);
    if (len < 1) continue;
    // Outward normal: whichever side of the edge's midpoint lies outside the plan.
    let nx = -dz / len,
      nz = dx / len;
    const mid: P2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (pointInRing(mid[0] + nx * 0.3, mid[1] + nz * 0.3, plan)) {
      nx = -nx;
      nz = -nz;
    }
    enamelFace(body, a, b, [nx, nz], lo, hi, skip);
  }
}

/** Joints on one flat wall from a to b, standing proud along normal n. */
export function enamelFace(body: Builder, a: P2, b: P2, n: P2, lo: number, hi: number, skip = 0) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    len = Math.hypot(dx, dz),
    tx = dx / len,
    tz = dz / len,
    off = 0.04;
  const at = (t: number, y: number) => [a[0] + tx * t + n[0] * off, y, a[1] + tz * t + n[1] * off];
  const w = 0.05;
  const cols = Math.max(1, Math.round(len / enamelModule)),
    pitch = len / cols;
  for (let k = 1; k < cols; k++) {
    const t = k * pitch;
    body.quad(at(t - w, lo), at(t - w, hi), at(t + w, hi), at(t + w, lo), joint);
  }
  for (let y = lo + enamelModule * (1 + skip); y < hi - 0.3; y += enamelModule)
    body.quad(at(0, y - w), at(len, y - w), at(len, y + w), at(0, y + w), joint);
}

/** Joints on the four walls of an axis-aligned box given as body.box arguments. */
export function enamelBox(
  body: Builder,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  lo?: number,
) {
  const x0 = x - w / 2,
    x1 = x + w / 2,
    z0 = z - d / 2,
    z1 = z + d / 2,
    y0 = lo ?? y - h / 2,
    y1 = y + h / 2;
  enamelFace(body, [x0, z0], [x1, z0], [0, -1], y0, y1);
  enamelFace(body, [x1, z0], [x1, z1], [1, 0], y0, y1);
  enamelFace(body, [x1, z1], [x0, z1], [0, 1], y0, y1);
  enamelFace(body, [x0, z1], [x0, z0], [-1, 0], y0, y1);
}

export interface RampSpec {
  foot: P2;
  head: P2;
  stairTop: P2;
  stairFoot: P2;
  width: number;
}

/**
 * The Peachtree entry ramp, from the sidewalk up to the entry terrace, with
 * solid white parapets, pipe rails, a head landing and the mapped stair back
 * down to the lawn. Points are local (u, v); `ground` gives local heights.
 */
export function entryRamp(
  body: Builder,
  spec: RampSpec,
  terrace: number,
  ground: (u: number, v: number) => number | null,
) {
  const { foot, head, stairTop, stairFoot, width } = spec;
  const footY = ground(foot[0], foot[1]),
    stairY = ground(stairFoot[0], stairFoot[1]);
  if (footY === null || stairY === null) return false;
  const white = '#eeede7',
    deck = '#cfccc3',
    rail = '#f7f7f3';
  const dx = head[0] - foot[0],
    dz = head[1] - foot[1],
    len = Math.hypot(dx, dz),
    tx = dx / len,
    tz = dz / len,
    nx = -tz,
    nz = tx;
  const rise = (t: number) => footY + (terrace - footY) * Math.min(1, Math.max(0, t / len));
  const p = (t: number, s: number, y: number) => [foot[0] + tx * t + nx * s, y, foot[1] + tz * t + nz * s];
  const half = width / 2,
    step = 2;
  for (let t = 0; t < len - 0.01; t += step) {
    const t1 = Math.min(len, t + step),
      y0 = rise(t),
      y1 = rise(t1);
    body.quad(p(t, -half, y0 + 0.02), p(t, half, y0 + 0.02), p(t1, half, y1 + 0.02), p(t1, -half, y1 + 0.02), deck);
    for (const side of [-1, 1]) {
      const s = side * (half + 0.15),
        g0 = ground(p(t, s, 0)[0], p(t, s, 0)[2]) ?? y0,
        g1 = ground(p(t1, s, 0)[0], p(t1, s, 0)[2]) ?? y1;
      // Solid parapet from the lawn up to 0.55 m above the deck, both faces and cap.
      for (const face of [-0.15, 0.15]) {
        const f = s + face;
        body.quad(
          p(t, f, Math.min(g0, y0) - 0.1),
          p(t, f, y0 + 0.55),
          p(t1, f, y1 + 0.55),
          p(t1, f, Math.min(g1, y1) - 0.1),
          white,
        );
      }
      body.quad(
        p(t, s - 0.15, y0 + 0.55),
        p(t, s + 0.15, y0 + 0.55),
        p(t1, s + 0.15, y1 + 0.55),
        p(t1, s - 0.15, y1 + 0.55),
        rail,
      );
      // Pipe rails: a post every 2 m, a top rail and a mid rail.
      const post = p(t, s, 0);
      body.box(0.07, 0.5, 0.07, post[0], y0 + 0.8, post[2], rail);
      for (const h of [0.78, 1.05])
        body.quad(
          p(t, s - 0.03, y0 + h),
          p(t, s + 0.03, y0 + h + 0.05),
          p(t1, s + 0.03, y1 + h + 0.05),
          p(t1, s - 0.03, y1 + h),
          rail,
        );
    }
  }
  // White bollards at the sidewalk foot.
  for (const s of [-half - 1.2, 0, half + 1.2]) {
    const b = p(-1.2, s, 0),
      g = ground(b[0], b[2]) ?? footY;
    body.box(0.22, 0.95, 0.22, b[0], g + 0.47, b[2], rail);
  }
  // Head landing between the ramp, the stair and the entry wall.
  const land = (t: number, s: number) => p(len + t, s, terrace + 0.02);
  body.quad(land(-0.5, -half - 0.3), land(-0.5, half + 4.2), land(4.2, half + 4.2), land(4.2, -half - 0.3), deck);
  for (const [a, b] of [
    [land(-0.5, -half - 0.3), land(4.2, -half - 0.3)],
    [land(4.2, -half - 0.3), land(4.2, half + 4.2)],
  ]) {
    const ga = ground(a[0], a[2]) ?? footY,
      gb = ground(b[0], b[2]) ?? footY;
    body.quad(
      [a[0], ga - 0.1, a[2]],
      [a[0], terrace + 0.6, a[2]],
      [b[0], terrace + 0.6, b[2]],
      [b[0], gb - 0.1, b[2]],
      white,
    );
  }
  // Mapped stair from the landing back down to the lawn.
  const sx = stairFoot[0] - stairTop[0],
    sz = stairFoot[1] - stairTop[1],
    slen = Math.hypot(sx, sz),
    drop = terrace - stairY;
  if (drop > 0.2) {
    const n = Math.max(2, Math.round(drop / 0.17)),
      ux = sx / slen,
      uz = sz / slen,
      wx = -uz,
      wz = ux,
      sw = 0.9;
    for (let i = 0; i < n; i++) {
      const a = (slen * i) / n,
        b = (slen * (i + 1)) / n,
        y = terrace - (drop * (i + 1)) / n;
      const q = (t: number, w: number, h: number) => [stairTop[0] + ux * t + wx * w, h, stairTop[1] + uz * t + wz * w];
      body.quad(q(a, -sw, y + 0.02), q(a, sw, y + 0.02), q(b, sw, y + 0.02), q(b, -sw, y + 0.02), deck);
      body.quad(q(a, -sw, y), q(a, sw, y), q(a, sw, y + drop / n), q(a, -sw, y + drop / n), white);
      for (const w of [-sw - 0.1, sw + 0.1]) {
        const g = ground(q(a, w, 0)[0], q(a, w, 0)[2]) ?? y;
        body.quad(
          q(a, w, Math.min(g, y) - 0.1),
          q(a, w, y + 0.9),
          q(b, w, y + 0.9),
          q(b, w, Math.min(g, y) - 0.1),
          white,
        );
      }
    }
  }
  return true;
}
