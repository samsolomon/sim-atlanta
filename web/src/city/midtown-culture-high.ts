import { pointInRing, type Builder, type P2 } from '../vignette/geom';

/** Meier's porcelain-enamel panels: an estimated 1.5 m square module. */
export const enamelModule = 1.5;
const joint = '#d6d7d2';

/**
 * Lays enamel panel joints on the outside of every wall of a prism plan,
 * from `lo` to `hi`. Joints are 0.1 m so they hold at City's orbit floor.
 */
export function enamelGrid(body: Builder, plan: P2[], lo: number, hi: number, hidden: Hidden = () => false) {
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
    enamelFace(body, a, b, [nx, nz], lo, hi, hidden);
  }
}

/** Points (u, v) covered by a neighbouring volume; joints there are never seen. */
export type Hidden = (u: number, v: number) => boolean;

/** Joints on one flat wall from a to b, standing proud along normal n. */
export function enamelFace(body: Builder, a: P2, b: P2, n: P2, lo: number, hi: number, hidden: Hidden = () => false) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    len = Math.hypot(dx, dz),
    tx = dx / len,
    tz = dz / len,
    off = 0.04;
  const at = (t: number, y: number) => [a[0] + tx * t + n[0] * off, y, a[1] + tz * t + n[1] * off];
  const seen = (t: number) => !hidden(a[0] + tx * t + n[0] * 0.3, a[1] + tz * t + n[1] * 0.3);
  if (!seen(len / 2) && !seen(len * 0.1) && !seen(len * 0.9)) return;
  const w = 0.05;
  const cols = Math.max(1, Math.round(len / enamelModule)),
    pitch = len / cols;
  for (let k = 1; k < cols; k++) {
    const t = k * pitch;
    if (!seen(t)) continue;
    body.quad(at(t - w, lo), at(t - w, hi), at(t + w, hi), at(t + w, lo), joint);
  }
  // Horizontal joints run only across the visible panel columns.
  const runs: [number, number][] = [];
  for (let k = 0; k < cols; k++) {
    if (!seen((k + 0.5) * pitch)) continue;
    const last = runs[runs.length - 1];
    if (last && last[1] === k * pitch) last[1] = (k + 1) * pitch;
    else runs.push([k * pitch, (k + 1) * pitch]);
  }
  for (let y = lo + enamelModule; y < hi - 0.3; y += enamelModule)
    for (const [t0, t1] of runs) body.quad(at(t0, y - w), at(t1, y - w), at(t1, y + w), at(t0, y + w), joint);
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
  lo: number,
  hidden: Hidden = () => false,
) {
  const x0 = x - w / 2,
    x1 = x + w / 2,
    z0 = z - d / 2,
    z1 = z + d / 2,
    y0 = lo,
    y1 = y + h / 2;
  enamelFace(body, [x0, z0], [x1, z0], [0, -1], y0, y1, hidden);
  enamelFace(body, [x1, z0], [x1, z1], [1, 0], y0, y1, hidden);
  enamelFace(body, [x1, z1], [x0, z1], [0, 1], y0, y1, hidden);
  enamelFace(body, [x0, z1], [x0, z0], [-1, 0], y0, y1, hidden);
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
  // The mapped stair leaves the head landing on its own side of the ramp, outside
  // the parapet, and drops back to the lawn toward the mapped stair foot.
  const sv = (stairTop[0] - foot[0]) * nx + (stairTop[1] - foot[1]) * nz,
    side = sv < 0 ? -1 : 1,
    sw = 0.9,
    lane = side * (half + 0.3 + sw + 0.1),
    top = p(len - 0.3, lane, 0);
  // Head landing: across the ramp and over the stair's head, short of the entry
  // wall and the rounded projection on the far side.
  const near = -side * (half + 0.3),
    far = lane + side * (sw + 0.15),
    land = (t: number, s: number) => p(len + t, s, terrace + 0.02);
  body.quad(land(-1.2, near), land(-1.2, far), land(2.5, far), land(2.5, near), deck);
  const wall = (a: number[], b: number[]) => {
    const ga = ground(a[0], a[2]) ?? footY,
      gb = ground(b[0], b[2]) ?? footY;
    body.quad(
      [a[0], ga - 0.1, a[2]],
      [a[0], terrace + 0.6, a[2]],
      [b[0], terrace + 0.6, b[2]],
      [b[0], gb - 0.1, b[2]],
      white,
    );
  };
  wall(land(-0.5, near), land(2.5, near));
  wall(land(2.5, near), land(2.5, far));
  wall(land(-1.2, far), land(2.5, far));
  const sx = stairFoot[0] - top[0],
    sz = stairFoot[1] - top[2],
    slen = Math.hypot(sx, sz),
    drop = terrace - stairY;
  if (drop > 0.2 && slen > 1) {
    const n = Math.max(2, Math.round(drop / 0.17)),
      ux = sx / slen,
      uz = sz / slen,
      wx = -uz,
      wz = ux;
    const q = (t: number, w: number, h: number) => [top[0] + ux * t + wx * w, h, top[2] + uz * t + wz * w];
    for (let i = 0; i < n; i++) {
      const a = (slen * i) / n,
        b = (slen * (i + 1)) / n,
        y = terrace - (drop * (i + 1)) / n;
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

export interface PiazzaSpec {
  /** Paved outline, local (u, v). */
  plan: P2[];
  /** Mapped lawn inside the outline; it stays grass, edged by a curb. */
  lawn: P2[];
  /** Mapped stair from the piazza edge down to the north passage. */
  stair: [P2, P2];
  /** Paved run from the piazza edge to the stair head, in metres. */
  stairLanding?: number;
  /** Bistro tables and benches; positions are illustrative. */
  tables: P2[];
  benches: P2[];
}

/**
 * Sifly Piazza: 1.5 × 3 m white concrete slabs with dark joints laid on the
 * rendered terrain, a curb round the mapped lawn, the mapped north stair, and
 * café seating. `ground` gives local heights already lifted clear of terrain.
 */
export function siflyPiazza(body: Builder, spec: PiazzaSpec, ground: (u: number, v: number) => number | null) {
  const joint = '#a8a398',
    tones = ['#dad7cf', '#d4d1c8', '#dedbd4'],
    curb = '#ecebe5';
  const du = 1.5,
    dv = 3,
    gap = 0.05;
  const us = spec.plan.map(([u]) => u),
    vs = spec.plan.map(([, v]) => v);
  const at = (a: number, b: number, lift: number) => {
    const y = ground(a, b);
    return y === null ? null : [a, y + lift, b];
  };
  const lay = (u0: number, v0: number, u1: number, v1: number, inset: number, tone: string) => {
    const under = [at(u0, v0, 0.03), at(u1, v0, 0.03), at(u1, v1, 0.03), at(u0, v1, 0.03)];
    const slab = [
      at(u0 + inset, v0 + inset, 0.06),
      at(u1 - inset, v0 + inset, 0.06),
      at(u1 - inset, v1 - inset, 0.06),
      at(u0 + inset, v1 - inset, 0.06),
    ];
    if (!under.every((p): p is number[] => p !== null) || !slab.every((p): p is number[] => p !== null)) return;
    if (inset > 0) body.quad(under[3], under[2], under[1], under[0], joint);
    body.quad(slab[3], slab[2], slab[1], slab[0], tone);
  };
  const paved = (u: number, v: number) => pointInRing(u, v, spec.plan) && !pointInRing(u, v, spec.lawn);
  const u0 = Math.min(...us),
    v0 = Math.min(...vs);
  for (let iu = 0; u0 + iu * du < Math.max(...us); iu++)
    for (let iv = 0; v0 + iv * dv < Math.max(...vs); iv++) {
      const u = u0 + iu * du,
        v = v0 + iv * dv,
        tone = tones[(iu * 7 + iv * 3) % tones.length];
      const corners = [paved(u, v), paved(u + du, v), paved(u + du, v + dv), paved(u, v + dv)];
      if (corners.every(Boolean) && paved(u + du / 2, v + dv / 2)) lay(u, v, u + du, v + dv, gap, tone);
      else if (corners.some(Boolean) || paved(u + du / 2, v + dv / 2))
        // Edge slabs are cut to the outline and lawn in 0.5 m pieces.
        for (let a = u; a < u + du - 0.01; a += 0.5)
          for (let b = v; b < v + dv - 0.01; b += 0.5)
            if (paved(a + 0.25, b + 0.25)) lay(a, b, a + 0.5, b + 0.5, 0, tone);
    }
  // A low white curb round the mapped lawn.
  for (let i = 0; i < spec.lawn.length; i++) {
    const a = spec.lawn[i],
      b = spec.lawn[(i + 1) % spec.lawn.length],
      len = Math.hypot(b[0] - a[0], b[1] - a[1]),
      n = Math.max(1, Math.ceil(len / 2));
    for (let j = 0; j < n; j++) {
      const p0: P2 = [a[0] + ((b[0] - a[0]) * j) / n, a[1] + ((b[1] - a[1]) * j) / n],
        p1: P2 = [a[0] + ((b[0] - a[0]) * (j + 1)) / n, a[1] + ((b[1] - a[1]) * (j + 1)) / n];
      const g0 = ground(p0[0], p0[1]),
        g1 = ground(p1[0], p1[1]);
      if (g0 === null || g1 === null) continue;
      body.quad(
        [p0[0], g0 - 0.1, p0[1]],
        [p0[0], g0 + 0.28, p0[1]],
        [p1[0], g1 + 0.28, p1[1]],
        [p1[0], g1 - 0.1, p1[1]],
        curb,
      );
    }
  }
  // The mapped stair from the piazza edge down the north passage.
  const [top, foot] = spec.stair,
    yTop = ground(top[0], top[1]),
    yFoot = ground(foot[0], foot[1]);
  if (yTop !== null && yFoot !== null && yTop - yFoot > 0.3) {
    const len = Math.hypot(foot[0] - top[0], foot[1] - top[1]),
      ux = (foot[0] - top[0]) / len,
      uz = (foot[1] - top[1]) / len,
      drop = yTop - yFoot,
      n = Math.round(drop / 0.16),
      w = 0.8,
      landing = spec.stairLanding ?? 0;
    const q = (t: number, s: number, y: number) => [top[0] + ux * t - uz * s, y, top[1] + uz * t + ux * s];
    // A paved landing joins the piazza edge to the stair head.
    body.quad(
      q(-landing, -w, yTop + 0.06),
      q(-landing, w, yTop + 0.06),
      q(0, w, yTop + 0.06),
      q(0, -w, yTop + 0.06),
      tones[1],
    );
    // Each tread sits at its riser top, so the falling terrain stays beneath it.
    for (let i = 0; i < n; i++) {
      const a = (len * i) / n,
        b = (len * (i + 1)) / n,
        y = yTop - (drop * i) / n;
      body.quad(q(a, -w, y + 0.02), q(a, w, y + 0.02), q(b, w, y + 0.02), q(b, -w, y + 0.02), tones[0]);
      body.quad(q(b, -w, y - drop / n), q(b, w, y - drop / n), q(b, w, y), q(b, -w, y), joint);
    }
    for (const s of [-w - 0.12, w + 0.12])
      body.quad(q(0, s, yTop - 0.1), q(0, s, yTop + 0.45), q(len, s, yFoot + 0.45), q(len, s, yFoot - 0.1), curb);
  }
  // Café seating: round white tables with three red wire chairs each.
  for (const [u, v] of spec.tables) {
    const g = ground(u, v);
    if (g === null) continue;
    body.box(0.08, 0.72, 0.08, u, g + 0.36, v, '#9a9b98');
    body.box(0.75, 0.04, 0.75, u, g + 0.74, v, '#efefec');
    for (let c = 0; c < 3; c++) {
      const a = (c * 2 * Math.PI) / 3,
        cu = u + 0.72 * Math.cos(a),
        cv = v + 0.72 * Math.sin(a);
      body.box(0.44, 0.05, 0.44, cu, g + 0.45, cv, '#c44a4f');
      body.box(0.05, 0.45, 0.05, cu, g + 0.22, cv, '#c44a4f');
      // The back stands across the radius, on the far side from the table.
      const bu = cu + 0.22 * Math.cos(a),
        bv = cv + 0.22 * Math.sin(a),
        su = -0.2 * Math.sin(a),
        sv = 0.2 * Math.cos(a);
      body.quad(
        [bu - su, g + 0.47, bv - sv],
        [bu - su, g + 0.85, bv - sv],
        [bu + su, g + 0.85, bv + sv],
        [bu + su, g + 0.47, bv + sv],
        '#c44a4f',
      );
    }
  }
  for (const [u, v] of spec.benches) {
    const g = ground(u, v);
    if (g === null) continue;
    body.box(0.5, 0.45, 1.9, u, g + 0.22, v, '#e4e2db');
  }
}
