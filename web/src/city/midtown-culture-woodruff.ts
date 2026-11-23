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
  opts: { bay?: number; fins?: boolean; slots?: boolean; joints?: number } = {},
) {
  const { bay = 4.2, fins = true, slots = true, joints = 2.4 } = opts;
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
      // A fin: two side faces and a front face, 0.6 m wide and 0.5 m proud.
      const w = 0.3;
      body.quad(at(t - w, lo, 0.5), at(t - w, hi - 0.4, 0.5), at(t + w, hi - 0.4, 0.5), at(t + w, lo, 0.5), fin);
      for (const s of [-w, w])
        body.quad(at(t + s, lo, 0), at(t + s, hi - 0.4, 0), at(t + s, hi - 0.4, 0.5), at(t + s, lo, 0.5), fin);
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
