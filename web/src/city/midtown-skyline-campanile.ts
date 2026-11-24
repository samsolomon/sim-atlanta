import type { P2 } from '../vignette/geom';
import type { localLandmarkShell } from './landmark-shell';
import type { LocalGround } from './midtown-skyline';

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;

/**
 * The Campanile (1155 Peachtree, 1987), as it stands in 2026: Dewberry stripped its stone and
 * glass from 2019 and the overhaul has stalled, so City draws the bare concrete frame.
 * Reference date: AJC photographs of 19 May 2026 (docs/log/ui/campanile/README.md).
 *
 * The top slab is at 390.8 m NAVD88: 95.4 m over the 295.4 m median grade around the site
 * (3DEP, April 2019). The 20 upper levels are spread evenly above a 6.4 m open ground floor.
 */
export const CAMPANILE = { grade: 295.4, top: 390.8, lobby: 6.4, levels: 20 };

const SLAB = '#c8c3b8', SLAB_TOP = '#b9b4a8', CORE = '#4b4d4c', COLUMN = '#cfcabf';
// Orange safety rails along most open bays; grey where the rail is missing.
const RAILS = ['#d0622c', '#d0622c', '#cc5d28', '#8a8c87'];

/** Mean outward offset of a ring: every edge moves `d` along its outer normal. */
function inset(ring: P2[], d: number): P2[] {
  return ring.map((p, i) => {
    const a = ring[(i + ring.length - 1) % ring.length], b = ring[(i + 1) % ring.length];
    const n = (q: P2, r: P2): P2 => { const l = Math.hypot(r[0] - q[0], r[1] - q[1]); return [(r[1] - q[1]) / l, -(r[0] - q[0]) / l]; };
    const [n1, n2] = [n(a, p), n(p, b)];
    const m: P2 = [n1[0] + n2[0], n1[1] + n2[1]], k = d / Math.max(.35, 1 + n1[0] * n2[0] + n1[1] * n2[1]);
    return [p[0] - m[0] * k, p[1] - m[1] * k];
  });
}

export function campanile(shell: Shell, ground: LocalGround) {
  const plan = [...shell.ring].reverse();
  // Rendered grade around the footprint, sampled like the lidar ring, ties NAVD88 to local metres.
  const samples = inset(plan, -8).map(([u, v]) => ground(u, v)).filter((y): y is number => y !== null).sort((a, b) => a - b);
  const grade = samples.length ? samples[samples.length >> 1] : 0;
  const top = CAMPANILE.top - CAMPANILE.grade + grade;
  const first = grade + CAMPANILE.lobby, pitch = (top - first) / CAMPANILE.levels;

  // The stripped interior reads as one dark volume behind the open slab edges.
  shell.prism(inset(plan, 2.2), shell.base, top - .3, CORE, SLAB_TOP);
  for (let k = 0; k <= CAMPANILE.levels; k++) {
    const y = first + k * pitch;
    shell.prism(plan, y - .38, y, SLAB, SLAB_TOP);
  }
  plan.forEach((a, i) => {
    const b = plan[(i + 1) % plan.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length < 2.5) return;
    // Exposed columns at about 9 m centres, standing just proud of the slab edges.
    shell.facade(a, b, shell.base, top, 1, 9, Math.min(.5, .8 / Math.max(length / Math.max(1, Math.round(length / 9)), 1)), 1, [COLUMN], 0);
    // A guard rail at waist height on each open level.
    // facade centres each band in its row, so shift the rows down to sit the rail about 1 m over the slab.
    const drop = pitch * (.5 - 1 / pitch);
    if (length > 6) shell.facade(a, b, first - drop, top - pitch - drop, CAMPANILE.levels - 1, 18, .9, .22, RAILS, 0);
  });

  // The construction hoist's white mast on the 14th Street face.
  const mast: P2[] = [[-1, 33.4], [1, 33.4], [1, 35.2], [-1, 35.2]];
  shell.prism(mast, shell.base, top + 4, '#e6e6e1', '#e6e6e1');

  // A stalled site: no photographed night lighting, so no lit panes.
  return shell.finish('#f2d5a5', 0);
}
