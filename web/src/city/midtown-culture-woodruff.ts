import type { Builder, P2 } from '../vignette/geom';

const fin = '#d9d5cb',
  joint = '#aea99d',
  slot = '#4f5a5e',
  coping = '#e8e6de';

/**
 * Precast skin on one wall of the Memorial's rear volumes, after the
 * piazza-side photograph: vertical fins standing proud every `bay` metres,
 * horizontal panel joints, recessed slot windows high in alternate bays,
 * and a coping band. `n` is the outward normal in local (u, v).
 */
export function precastWall(
  body: Builder,
  lights: Builder,
  a: P2,
  b: P2,
  n: P2,
  lo: number,
  hi: number,
  opts: {
    bay?: number;
    fins?: boolean;
    slots?: boolean;
    joints?: number;
    /** Fin width and depth; the 15th Street face has closer, slimmer ribs. */
    finWidth?: number;
    finDepth?: number;
    /** Height of a recessed ground loggia of slender piers, as on 15th Street. */
    loggia?: number;
    /** Sill height of a row of recessed balconied windows, every fourth bay. */
    balconies?: number;
  } = {},
) {
  const { bay = 4.2, fins = true, slots = true, joints = 2.4, finWidth = 0.6, finDepth = 0.5, loggia = 0 } = opts;
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    len = Math.hypot(dx, dz);
  if (len < 1e-6) return;
  const tx = dx / len,
    tz = dz / len;
  const at = (t: number, y: number, out: number) => [a[0] + tx * t + n[0] * out, y, a[1] + tz * t + n[1] * out];
  const count = Math.max(1, Math.round(len / bay)),
    pitch = len / count;
  // Horizontal panel joints.
  if (joints > 0)
    for (let y = lo + joints; y < hi - 0.5; y += joints)
      body.quad(at(0, y - 0.05, 0.05), at(0, y + 0.05, 0.05), at(len, y + 0.05, 0.05), at(len, y - 0.05, 0.05), joint);
  for (let k = 0; k <= count; k++) {
    const t = k * pitch;
    if (fins && k > 0 && k < count) {
      // A fin: two side faces and a front face, standing from the loggia soffit up.
      const w = finWidth / 2,
        d = finDepth,
        f0 = lo + loggia;
      body.quad(at(t - w, f0, d), at(t - w, hi - 0.4, d), at(t + w, hi - 0.4, d), at(t + w, f0, d), fin);
      for (const s of [-w, w])
        body.quad(at(t + s, f0, 0), at(t + s, hi - 0.4, 0), at(t + s, hi - 0.4, d), at(t + s, f0, d), fin);
    } else if (!fins && k > 0 && k < count)
      body.quad(at(t - 0.05, lo, 0.03), at(t - 0.05, hi, 0.03), at(t + 0.05, hi, 0.03), at(t + 0.05, lo, 0.03), joint);
    // Slot windows high in alternate bays; a few are lit at night.
    if (slots && k < count && k % 2 === 1) {
      const m = t + pitch / 2,
        y0 = hi - 6.2,
        into = k % 6 === 1 ? lights : body;
      into.quad(
        at(m - 0.6, y0, 0.08),
        at(m - 0.6, y0 + 2.2, 0.08),
        at(m + 0.6, y0 + 2.2, 0.08),
        at(m + 0.6, y0, 0.08),
        slot,
      );
    }
  }
  if (loggia > 0) {
    // The loggia: a dark recessed ground storey behind slender white piers,
    // under a soffit band the ribs stand on.
    body.quad(at(0, lo, 0.02), at(0, lo + loggia, 0.02), at(len, lo + loggia, 0.02), at(len, lo, 0.02), '#5d6262');
    body.quad(
      at(0, lo + loggia - 0.6, 0.6),
      at(0, lo + loggia, 0.6),
      at(len, lo + loggia, 0.6),
      at(len, lo + loggia - 0.6, 0.6),
      fin,
    );
    body.quad(
      at(0, lo + loggia - 0.6, 0),
      at(len, lo + loggia - 0.6, 0),
      at(len, lo + loggia - 0.6, 0.6),
      at(0, lo + loggia - 0.6, 0.6),
      fin,
    );
    const piers = Math.max(1, Math.round(len / 2.7));
    for (let k = 0; k <= piers; k++) {
      const t = (len * k) / piers;
      body.quad(
        at(t - 0.2, lo, 0.6),
        at(t - 0.2, lo + loggia, 0.6),
        at(t + 0.2, lo + loggia, 0.6),
        at(t + 0.2, lo, 0.6),
        fin,
      );
    }
  }
  if (opts.balconies !== undefined) {
    // Recessed balconied windows every fourth bay, with a pale rail across each.
    const y0 = opts.balconies;
    for (let k = 2; k < count - 1; k += 4) {
      const m = k * pitch + pitch / 2,
        into = k % 8 === 2 ? lights : body;
      into.quad(
        at(m - 1.2, y0, 0.06),
        at(m - 1.2, y0 + 2.6, 0.06),
        at(m + 1.2, y0 + 2.6, 0.06),
        at(m + 1.2, y0, 0.06),
        slot,
      );
      body.quad(
        at(m - 1.3, y0 + 0.95, 0.12),
        at(m - 1.3, y0 + 1.05, 0.12),
        at(m + 1.3, y0 + 1.05, 0.12),
        at(m + 1.3, y0 + 0.95, 0.12),
        coping,
      );
    }
  }
  // Coping: a closed band from the wall out to 0.55 m, run past each end so
  // neighbouring walls' copings meet at the corners.
  const e = 0.55;
  body.quad(at(-e, hi - 0.4, e), at(-e, hi + 0.1, e), at(len + e, hi + 0.1, e), at(len + e, hi - 0.4, e), coping);
  body.quad(at(-e, hi + 0.1, 0), at(len + e, hi + 0.1, 0), at(len + e, hi + 0.1, e), at(-e, hi + 0.1, e), coping);
  body.quad(at(-e, hi - 0.4, e), at(len + e, hi - 0.4, e), at(len + e, hi - 0.4, 0), at(-e, hi - 0.4, 0), coping);
}

/** A louvred rooftop mechanical screen: a grey box with vertical slats. */
export function mechanicalScreen(body: Builder, u: number, v: number, w: number, d: number, base: number, h: number) {
  body.box(w, h, d, u, base + h / 2, v, '#9da1a0');
  for (let x = -w / 2 + 0.4; x < w / 2; x += 0.6)
    for (const s of [-1, 1]) body.box(0.08, h - 0.2, 0.06, u + x, base + h / 2, v + s * (d / 2 + 0.03), '#7f8483');
  for (let z = -d / 2 + 0.4; z < d / 2; z += 0.6)
    for (const s of [-1, 1]) body.box(0.06, h - 0.2, 0.08, u + s * (w / 2 + 0.03), base + h / 2, v + z, '#7f8483');
}

/**
 * The Arts Center's loading dock, off Arts Center Way at the base of the Piano
 * west pavilion (Street View, March 2025): a stone-clad base with two drive-in
 * openings to roll-up dock doors, and a pier between them carrying the dock sign.
 * `ground(t)` is the street height along the face; openings are [centre, width].
 */
export function loadingDock(
  body: Builder,
  lights: Builder,
  a: P2,
  b: P2,
  n: P2,
  ground: (t: number) => number,
  openings: [number, number][],
  base = 6.2,
  /** The stone rises at least to this height, to meet the podium top. */
  minTop = -Infinity,
) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    len = Math.hypot(dx, dz);
  if (len < 1e-6) return;
  const tx = dx / len,
    tz = dz / len;
  const at = (t: number, y: number, out: number) => [a[0] + tx * t + n[0] * out, y, a[1] + tz * t + n[1] * out];
  const stone = '#9b978f',
    dark = '#2c2f31';
  // Stone base in 2 m panels so it follows the street's fall.
  for (let t = 0; t < len - 0.01; t += 2) {
    const t1 = Math.min(len, t + 2),
      g0 = ground(t),
      g1 = ground(t1),
      top = Math.max(minTop, Math.max(g0, g1) + base);
    body.quad(at(t, g0 - 0.1, 0.1), at(t, top, 0.1), at(t1, top, 0.1), at(t1, g1 - 0.1, 0.1), stone);
  }
  for (const [c, w] of openings) {
    const g = ground(c),
      h = 4.5;
    // The opening reads as a dark drive-in bay; a small lamp over it is lit at night.
    body.quad(
      at(c - w / 2, g, 0.16),
      at(c - w / 2, g + h, 0.16),
      at(c + w / 2, g + h, 0.16),
      at(c + w / 2, g, 0.16),
      dark,
    );
    body.quad(
      at(c - w / 2 - 0.1, g + h, 0.17),
      at(c - w / 2 - 0.1, g + h + 0.35, 0.17),
      at(c + w / 2 + 0.1, g + h + 0.35, 0.17),
      at(c + w / 2 + 0.1, g + h, 0.17),
      '#7b7871',
    );
    lights.quad(
      at(c - 0.25, g + h + 0.5, 0.25),
      at(c - 0.25, g + h + 0.8, 0.25),
      at(c + 0.25, g + h + 0.8, 0.25),
      at(c + 0.25, g + h + 0.5, 0.25),
      '#d8d2c0',
    );
  }
  // The dock sign on the pier between the first two openings.
  if (openings.length > 1) {
    const m = (openings[0][0] + openings[0][1] / 2 + openings[1][0] - openings[1][1] / 2) / 2,
      g = ground(m);
    body.quad(
      at(m - 0.45, g + 1.7, 0.2),
      at(m - 0.45, g + 2.5, 0.2),
      at(m + 0.45, g + 2.5, 0.2),
      at(m + 0.45, g + 1.7, 0.2),
      '#eeeeea',
    );
  }
}
