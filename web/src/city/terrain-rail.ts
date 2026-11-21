/**
 * Terrain-aware MARTA track for City: puts a legacy (flat-board) alignment onto the measured
 * bare-earth grid, using the observed rail cover and heights baked into scene.json `rail`.
 *
 * - Observed spans (railSpanAt on exact GTFS path metres) give cover and the track-bed height:
 *   open cuts sit on the DEM floor, viaducts hang from identified anchors (never the DEM under
 *   them), stations hang from the shared Georgia State chain.
 * - Unobserved stretches keep the legacy *relative* profile, measured from a smoothed ground
 *   line (so a schematic tunnel stays the same depth below the local street, and an unobserved
 *   bridge doesn't dive into every dip the DEM has under it).
 * - Where the two meet, the bed is blended on the unobserved side, so a car straddling a
 *   portal never jumps.
 *
 * Heights are scene metres (the board's vertical zero is the DEM at Five Points), track bed;
 * rails and cars add +0.55 m.
 */
import type { GroundGrid } from '../terrain/grid';
import type { OpenSlot } from '../terrain/openings';
import { railBedY, railSpanAt, type RailCover, type RailForm, type SceneManifest } from '../core/scene-data';
import type { alignment } from '../vignette/alignment';
import { CUT_E, CUT_HALF, PORTAL_E, trackInDaylight, type Alignment } from '../vignette/world';

type Legacy = ReturnType<typeof alignment>;

const STEP = 2;
/** Lateral offset (m) where a cut's banks (its rim) are sampled: just outside the walls. */
const BANK = CUT_HALF + 2;
/** Half-window (m) of the smoothed ground an unobserved profile is measured from. */
const REF_HALF = 40;
/** Distance (m) over which an unobserved bed is blended into an observed neighbour. */
const BLEND = 60;

export function terrainAlignment(legacy: Legacy, pathId: string, manifest: SceneManifest, grid: GroundGrid): Alignment {
  const zero = grid.manifest.vertical.sceneZeroNavd88M;
  const ground = (x: number, z: number): number | null => {
    const h = grid.sample(x, z);
    return h == null ? null : h - zero;
  };
  const line = legacy.line;
  const n = Math.ceil(line.length / STEP) + 1;
  const at = (i: number) => Math.min(i * STEP, line.length);
  const spanAt = (s: number) => railSpanAt(manifest.rail, pathId, legacy.pathMetresAt(s));

  // Ground under the track, with holes (no data, off the grid) filled from the nearest sample.
  const under = new Float64Array(n);
  const valid = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const p = line.at(at(i));
    const g = ground(p.x, p.z);
    if (g != null) {
      under[i] = g;
      valid[i] = 1;
    }
  }
  fillHoles(under, valid);
  const ref = smooth(under, REF_HALF / STEP);

  const bed = new Float64Array(n);
  const rim = new Float64Array(n);
  const known = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const s = at(i);
    const span = spanAt(s);
    if (span && valid[i]) {
      const p = line.at(s);
      const here = under[i];
      bed[i] = railBedY(span, legacy.pathMetresAt(s), here, (x, z) => ground(x, z) ?? here);
      if (span.form === 'viaduct') rim[i] = here;
      else {
        // The street level around the track: the higher bank, or the ground itself.
        let r = here;
        for (const d of [-BANK, BANK]) {
          const g = ground(p.x + p.nx * d, p.z + p.nz * d);
          if (g != null) r = Math.max(r, g);
        }
        rim[i] = r;
      }
      known[i] = 1;
    } else {
      // No observation (or no ground): the legacy relative profile on the smoothed ground.
      rim[i] = ref[i];
      bed[i] = ref[i] + legacy.elev(s);
    }
  }
  blendIntoKnown(bed, known, BLEND / STEP);

  const interp = (a: Float64Array) => (s: number) => {
    const f = Math.min(Math.max(s / STEP, 0), n - 1);
    const i = Math.min(Math.floor(f), n - 2);
    const t = f - i;
    return n < 2 ? a[0] : a[i] + (a[i + 1] - a[i]) * t;
  };
  const coverAt = (s: number): RailCover | undefined => spanAt(s)?.cover;
  const formAt = (s: number): RailForm | undefined => spanAt(s)?.form;
  const al: Alignment = {
    line,
    elev: interp(bed),
    referenceY: interp(rim),
    // Exposure follows the exact observed edges, not the 2 m samples. Where nothing was
    // observed, the legacy flat-board profile alone decides: the blended terrain bed there is
    // for continuity only and must not expose a schematic tunnel early.
    openToSky: (s) => {
      const c = coverAt(s);
      return c === undefined ? legacy.elev(s) >= PORTAL_E : c === 'open';
    },
    coverAt,
    formAt,
  };
  return al;
}

/**
 * Slots to subtract from the terrain surface: every stretch open to the sky whose bed is below
 * its rim (a cut), split into short straight pieces that follow the track. Each slot removes
 * terrain above the bed between the cut's walls (±CUT_HALF).
 */
export function terrainOpenings(alignments: Alignment[]): OpenSlot[] {
  const slots: OpenSlot[] = [];
  const PIECE = 8;
  for (const al of alignments) {
    const len = al.line.length;
    const below = (s: number) => trackInDaylight(al, s) && (al.referenceY?.(s) ?? 0) - al.elev(s) > -CUT_E;
    let start: number | null = null;
    const emit = (a: number, b: number) => {
      for (let s = a; s < b - 0.01; s += PIECE) {
        const e = Math.min(s + PIECE, b);
        const p = al.line.at(s);
        const q = al.line.at(e);
        if (Math.hypot(q.x - p.x, q.z - p.z) < 0.5) continue;
        slots.push({ start: [p.x, al.elev(s), p.z], end: [q.x, al.elev(e), q.z], halfWidthM: CUT_HALF });
      }
    };
    for (let s = 0; s <= len; s += 1) {
      const ok = below(s);
      if (ok && start == null) start = s;
      if ((!ok || s + 1 > len) && start != null) {
        emit(start, ok ? len : s);
        start = null;
      }
    }
  }
  return slots;
}

function fillHoles(a: Float64Array, valid: Uint8Array) {
  let last = -1;
  for (let i = 0; i < a.length; i++) {
    if (valid[i]) {
      if (last < 0) for (let k = 0; k < i; k++) a[k] = a[i];
      else for (let k = last + 1; k < i; k++) a[k] = a[last] + ((a[i] - a[last]) * (k - last)) / (i - last);
      last = i;
    }
  }
  if (last >= 0) for (let k = last + 1; k < a.length; k++) a[k] = a[last];
  // No ground at all: the board's flat zero.
}

function smooth(a: Float64Array, half: number) {
  const out = new Float64Array(a.length);
  const pre = new Float64Array(a.length + 1);
  for (let i = 0; i < a.length; i++) pre[i + 1] = pre[i] + a[i];
  for (let i = 0; i < a.length; i++) {
    const lo = Math.max(0, i - half);
    const hi = Math.min(a.length - 1, i + half);
    out[i] = (pre[hi + 1] - pre[lo]) / (hi - lo + 1);
  }
  return out;
}

/** Ease unobserved samples near an observed run from the observed edge value to their own. */
function blendIntoKnown(bed: Float64Array, known: Uint8Array, width: number) {
  const n = bed.length;
  const src = Float64Array.from(bed);
  const fromKnown = (dir: 1 | -1) => {
    const dist = new Float64Array(n).fill(Infinity);
    const edge = new Float64Array(n);
    let d = Infinity;
    let v = 0;
    for (let k = 0; k < n; k++) {
      const i = dir === 1 ? k : n - 1 - k;
      if (known[i]) {
        d = 0;
        v = src[i];
      } else d += 1;
      dist[i] = d;
      edge[i] = v;
    }
    return { dist, edge };
  };
  const f = fromKnown(1);
  const b = fromKnown(-1);
  for (let i = 0; i < n; i++) {
    if (known[i]) continue;
    const near = f.dist[i] <= b.dist[i] ? f : b;
    const d = near.dist[i];
    if (d > width) continue;
    const t = d / width;
    const w = 1 - t * t * (3 - 2 * t); // 1 at the observed edge, 0 at `width`
    bed[i] = src[i] + (near.edge[i] - src[i]) * w;
  }
}
