import type { P2 } from '../vignette/geom';
import type { localLandmarkShell } from './landmark-shell';
import type { LocalGround } from './midtown-skyline';

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;

/**
 * 1100 Peachtree (Smallwood, Reynolds, Stewart, Stewart, 1990–91). Street frame on the diagonal
 * grid: +u faces the Peachtree plaza, origin at the tower's centre.
 *
 * Heights are NAVD88 from the April 2019 3DEP returns (docs/log/ui/1100-peachtree/README.md):
 * cornice and main roof 409.8 m, stepped pyramid apex 428.6 m, garage podium 308.6 m.
 * The Peachtree sidewalk east of the plaza returns 297.1 m.
 */
export const NAVD = { street: 297.1, podium: 308.6, lobby: 303.2, loggia: 400.3, cornice: 408.6, roof: 409.8, apex: 428.6 };

const STONE = '#d8cdb9', TRIM = '#e4dccb', ROOF = '#bdb6a6';
// Blue-grey reflective glass; a narrow palette keeps the ribbons even at orbit distance.
const RIBBON = ['#6c7f92', '#71849a', '#687b8e'];
const SLOT = ['#4f6175', '#55677b'];
const PYRAMID = '#8f9c93', PYRAMID_TREAD = '#a3ada2';

/** Square plan with one 4.5 m re-entrant notch at each corner, as mapped (OSM 886024375). */
function notched(half: number, notch: number): P2[] {
  const n = half - notch;
  return [[-n,-half],[n,-half],[n,-n],[half,-n],[half,n],[n,n],[n,half],[-n,half],[-n,n],[-half,n],[-half,-n],[-n,-n]];
}

function chamfered(half: number, corner: number): P2[] {
  const c = half - corner;
  return [[-c,-half],[c,-half],[half,-c],[half,c],[c,half],[-c,half],[-half,c],[-half,-c]];
}

const lerp = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** Local part outlines (tower frame), from the mapped building parts of osm:way:39450210. */
const garage = ([[-19.8,19],[-23.7,18.9],[-23,-19.3],[-19.2,-19.3],[-19.1,-23.7],[-17.4,-23.6],[-17.8,-44.4],
  [-24.6,-51.2],[-31.8,-61.6],[-73.5,-20.8],[-73.9,0.2],[-37,44.9],[-30.6,52.6],[-18.2,42.3],[-17.8,23],[-19.9,23]] as P2[])
  // The mapped ring winds clockwise; facades need the building on the left of each edge.
  .reverse();
const lowParts: { plan: P2[]; h: number; above: 'street' | 'west' }[] = [
  // Service wing on the garage's north side: 3DEP median 8.5 m over the lower west grade.
  { plan: [[-25.2,-54.5],[-17.8,-44.4],[-17.4,-23.6],[-9,-23.5],[-8.8,-50.4],[-13.7,-55.5],[-14.7,-62.3],[-19.3,-67.1],[-25.9,-67.1],[-31.8,-61.6]], h: 8.5, above: 'west' },
  { plan: [[8.5,-23.2],[18.9,-22.9],[18.9,-27.9],[8.6,-28.1]], h: 8.3, above: 'street' },
  { plan: [[-4.8,-31.9],[-5,-23.4],[5.9,-23.2],[6.1,-31.7]], h: 11.2, above: 'street' },
  // Raised plaza and its round pavilion on the Peachtree side (mapped heights; trees cloud the returns).
  { plan: [[40.1,-2.8],[35,-7.9],[29.5,-10.9],[24,-18.2],[23.2,19.3],[39.9,2.8]], h: 1.2, above: 'street' },
  { plan: [[29,5.6],[33.8,5.7],[36.3,3.3],[36.5,-1.1],[33.4,-4.3],[29.1,-4],[26.6,-1.6],[26.7,3.2]], h: 6.6, above: 'street' },
];

export function peachtree1100(shell: Shell, ground: LocalGround) {
  // Rendered grade at the Peachtree sidewalk ties NAVD88 to the shell's local heights.
  const street = ground(45, 0) ?? 0;
  const y = (navd: number) => navd - NAVD.street + street;
  const west = (ground(-80, 0) ?? street - 6.9);
  const base = shell.base;

  // Garage podium: stone with two dark open decks, stepping down the slope to the west.
  const podiumTop = y(NAVD.podium);
  shell.prism(garage, base, podiumTop, STONE, '#b5afa1');
  garage.forEach((a, i) => {
    const b = garage[(i + 1) % garage.length];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 8) return;
    shell.facade(a, b, podiumTop - 8.6, podiumTop - 1.2, 2, 30, .98, .42, ['#3f4140'], 0);
  });
  for (const part of lowParts) {
    const lo = part.above === 'west' ? west : street;
    shell.prism(part.plan, base, lo + part.h, STONE, part.h < 2 ? '#c9c2b2' : ROOF);
  }

  // Shaft: ribbon windows between cream stone spandrels, a dark glass slot up each face's centre.
  const plan = notched(23.5, 4.5);
  const lobby = y(NAVD.lobby), loggia = y(NAVD.loggia), cornice = y(NAVD.cornice), roof = y(NAVD.roof);
  shell.prism(plan, base, loggia, STONE, ROOF);
  plan.forEach((a, i) => {
    const b = plan[(i + 1) % plan.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length < 10) {
      // Re-entrant corners read as stacked glass with thin stone sills.
      shell.facade(a, b, lobby, loggia, 25, length, .9, .6, RIBBON, .08);
      shell.facade(a, b, street + .2, lobby - .4, 1, length, .9, .9, SLOT, .45);
      return;
    }
    const s0 = (length / 2 - 3.6) / length, s1 = 1 - s0;
    const left = lerp(a, b, s0), right = lerp(a, b, s1);
    shell.facade(a, left, lobby, loggia, 25, 5.1, .9, .44, RIBBON, .08);
    shell.facade(right, b, lobby, loggia, 25, 5.1, .9, .44, RIBBON, .08);
    shell.facade(left, right, lobby, loggia, 25, 7.2, .94, .93, SLOT, .08);
    // Two-storey lobby glazing behind stone piers; the lobby stays lit at night.
    shell.facade(a, b, street + .2, lobby - .4, 1, 5.3, .7, .9, SLOT, .5);
  });

  // Crown loggia: tall windows between stone piers, floodlit warm at night (dusk cover photo).
  const crown = chamfered(21.2, 4.2);
  shell.prism(crown, loggia, cornice, STONE, ROOF);
  crown.forEach((a, i) => {
    const b = crown[(i + 1) % crown.length];
    const out = (k: number): P2 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    const [nx, nz] = [(b[1] - a[1]), -(b[0] - a[0])];
    const len = Math.hypot(nx, nz), o = .05 / len;
    const p = (q: P2, h: number) => [q[0] + nx * o, h, q[1] + nz * o];
    // The lit stone face sits just proud of the wall; the dark panes sit proud of that.
    shell.lights.quad(p(out(0), loggia + .6), p(out(0), cornice - .3), p(out(1), cornice - .3), p(out(1), loggia + .6), TRIM);
    shell.facade(a, b, loggia + .9, cornice - .6, 1, 2.6, .55, .94, SLOT, 0);
  });
  // Shaft top steps in to the loggia: a stone ledge.
  shell.prism(chamfered(23.3, 4.4), loggia - .6, loggia, TRIM, TRIM);
  shell.prism(chamfered(22, 4.3), cornice, roof, TRIM, ROOF);

  // Stepped pyramid in grey-green metal, nine treads to a small cap.
  const tiers = 9, h0 = roof, h1 = y(NAVD.apex) - 1.6;
  for (let k = 0; k < tiers; k++) {
    const half = 19.6 - k * (19.6 - 3.4) / (tiers - 1);
    const lo = h0 + (h1 - h0) * k / tiers, hi = h0 + (h1 - h0) * (k + 1) / tiers;
    shell.prism(chamfered(half, half * .2), lo, hi, PYRAMID, PYRAMID_TREAD);
  }
  const cap = chamfered(2.4, .5);
  cap.forEach(([x, z], i) => {
    const [a, b] = cap[(i + 1) % cap.length];
    shell.body.tri([x, h1, z], [a, h1, b], [0, y(NAVD.apex), 0], PYRAMID);
  });

  // Offices are mostly dark at 23:00; the floodlit loggia and lobby carry the night read.
  return shell.finish('#f4d9ad', .78);
}
