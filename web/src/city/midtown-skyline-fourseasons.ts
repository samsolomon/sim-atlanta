import { rng, type P2 } from '../vignette/geom';
import type { localLandmarkShell } from './landmark-shell';

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;

// Four Seasons Hotel Atlanta (GLG Grand, Rabun Hogan Ota Rasche, 1992). A rose
// granite Art Deco shaft of paired punched windows that steps back at the
// hotel's 19th floor, again near the 33rd, then through notched pier tops to
// an attic and a steep grey-green standing-seam pyramid. The 14th Street (north)
// face carries a 12-storey glazed arch over the porte-cochère. Frame: u east,
// v south, origin at the shaft centre; heights above the 14th Street grade.
// Setback heights, insets and the 10 m pyramid are estimated from Commons
// photographs; the 186 m apex is the mapped height, which the 2019 lidar's
// 95th percentile matches (see docs/four-seasons.md).

const GRANITE = '#cfbcb0', RUSTIC = '#c2ada0', ROOF = '#b2a197', GOLD = '#d6ad4a', COPPER = '#8fbcab';
const GLASS = ['#4b5868', '#53606f', '#5b6776'];
const ARCH_GLASS = ['#45546a', '#4d5d72'];

export const FOUR_SEASONS = {
  setbacks: [68, 118, 150, 160, 168],
  attic: 176,
  apex: 190,
};

/** A rectangle centred on the origin with its corners notched in by `n`, counter-clockwise. */
export function notched(hu: number, hv: number, n: number): P2[] {
  if (n <= 0) return [[hu, -hv], [hu, hv], [-hu, hv], [-hu, -hv]];
  const a = hu - n, b = hv - n;
  return [
    [hu, -b], [hu, b], [a, b], [a, hv], [-a, hv], [-a, b],
    [-hu, b], [-hu, -b], [-a, -b], [-a, -hv], [a, -hv], [a, -b],
  ];
}

export function fourSeasons(shell: Shell) {
  const { body, lights } = shell;
  const [s1, s2, s3, s4, s5] = FOUR_SEASONS.setbacks;
  const { attic, apex } = FOUR_SEASONS;
  const edges = (ring: P2[], draw: (a: P2, b: P2, len: number) => void) =>
    ring.forEach((a, i) => {
      const b = ring[(i + 1) % ring.length];
      draw(a, b, Math.hypot(b[0] - a[0], b[1] - a[1]));
    });

  const random = rng(1992);
  /**
   * Punched windows on a wall from `a` to `b` (building on the left), within the
   * 2,400-triangle landmark budget: one dark glass strip per bay column, a stone
   * spandrel across the face at each floor, and a separate lamp quad only for the
   * windows lit at night, so occupancy stays per room.
   */
  function glaze(a: P2, b: P2, lo: number, hi: number, bay: number, fill: number, occupancy: number,
    glass: readonly string[] = GLASS, band = GRANITE, pitch = 3.5) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len;
    const at = (t: number, y: number, off: number) => [a[0] + dx * t + dz * off, y, a[1] + dz * t - dx * off];
    const count = Math.max(1, Math.round(len / bay)), rows = Math.max(1, Math.round((hi - lo) / pitch));
    const step = (hi - lo) / rows, sill = step * .19;
    for (let i = 0; i < count; i++) {
      const l = (i + (1 - fill) / 2) * len / count, r = (i + (1 + fill) / 2) * len / count;
      body.quad(at(l, lo + sill, .07), at(l, hi - sill, .07), at(r, hi - sill, .07), at(r, lo + sill, .07), glass[i % glass.length]);
      for (let j = 0; j < rows; j++)
        if (random() < occupancy)
          lights.quad(at(l, lo + j * step + sill, .11), at(l, lo + (j + 1) * step - sill, .11),
            at(r, lo + (j + 1) * step - sill, .11), at(r, lo + j * step + sill, .11), glass[0]);
    }
    for (let j = 1; j < rows; j++) {
      const y = lo + j * step;
      body.quad(at(0, y - sill, .09), at(0, y + sill, .09), at(len, y + sill, .09), at(len, y - sill, .09), band);
    }
  }

  // The south podium (ballroom and service block), 16.8 m, mapped as its own part.
  const podium: P2[] = [
    [-10.26, 23.89], [-10.27, 25.44], [-10.36, 52.02], [-5.56, 52.03], [-5.56, 53.85], [22.44, 53.95],
    [22.49, 38.76], [29.81, 38.8], [29.87, 22.42], [22.92, 22.39], [22.93, 18.08], [22.94, 16.14],
    [-23.11, 15.97], [-23.47, 15.97], [-23.51, 23.83],
  ];
  shell.prism(podium, shell.base, 16.8, RUSTIC, ROOF);
  edges([...podium].reverse(), (a, b, len) => {
    if (len > 4 && Math.min(a[1], b[1]) > 16.5)
      glaze(a, b, 3, 15.5, 3.4, .5, .12, GLASS, RUSTIC, 4.2);
  });

  // Shaft tiers: [half-width east-west, half-depth north-south, corner notch, bottom, top].
  const tiers: [number, number, number, number, number][] = [
    [23, 16, 2, shell.base, s1],
    [21, 14.2, 2, s1, s2],
    [19, 12.5, 2, s2, s3],
    [17, 11, 1.5, s3, s4],
    [15, 9.6, 1, s4, s5],
    [12.5, 8, 0, s5, attic],
  ];
  for (const [hu, hv, n, lo, hi] of tiers) shell.prism(notched(hu, hv, n), lo, hi, GRANITE, ROOF);

  // Paired punched windows at a 3.3 m bay and 3.5 m floors. Night occupancy follows
  // the stack: hotel rooms to the 19th floor, offices to about the 33rd, then
  // residences; the crown floors stay dark.
  const windows = (hu: number, hv: number, n: number, lo: number, hi: number, occupancy: number, arch = false) =>
    edges(notched(hu, hv, n), (a, b, len) => {
      if (len < 3) return;
      // The north face's centre belongs to the 14th Street arch.
      const runs: [P2, P2][] = arch && a[1] < 0 && b[1] < 0 && Math.abs(a[1] - b[1]) < .1
        ? [[a, [-8, a[1]]], [[8, a[1]], b]] : [[a, b]];
      for (const [p, q] of runs) glaze(p, q, lo, hi, 3.3, .58, occupancy);
    });
  windows(23, 16, 2, 3.5, s1 - 1, .4, true);
  windows(21, 14.2, 2, s1 + .5, s2 - 1, .12);
  windows(19, 12.5, 2, s2 + .5, s3 - 1, .3);
  // Crown floors keep their windows but stay dark at night.
  windows(17, 11, 1.5, s3 + .5, s4 - .5, 0);
  windows(15, 9.6, 1, s4 + .5, s5 - .5, 0);

  // Rustication joints on the base, every 1.7 m.
  edges(notched(23, 16, 2), (a, b, len) => {
    if (len < 3) return;
    const dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len;
    for (let y = 1.7; y < 17; y += 1.7)
      body.quad([a[0] + dz * .05, y, a[1] - dx * .05], [a[0] + dz * .05, y + .12, a[1] - dx * .05],
        [b[0] + dz * .05, y + .12, b[1] - dx * .05], [b[0] + dz * .05, y, b[1] - dx * .05], '#a98b79');
  });

  // Gold starburst rosettes on the piers at the first setback.
  const rosette = (u: number, v: number, du: number, dv: number) =>
    body.quad([u - dv * .9, s1 - 3, v + du * .9], [u - dv * .9, s1 - 1.2, v + du * .9],
      [u + dv * .9, s1 - 1.2, v - du * .9], [u + dv * .9, s1 - 3, v - du * .9], GOLD);
  for (const sv of [-1, 1]) for (const u of [-15, -8, 8, 15]) rosette(u, sv * 16.09, 0, sv);
  for (const su of [-1, 1]) for (const v of [-7, 7]) rosette(su * 23.09, v, su, 0);

  // The 14th Street arch: a recessed granite surround, glazed bay and round head,
  // lit from the atrium at night; the arched hotel entrance and navy canopy below.
  const north = -16.07;
  // The surround sits between the wall (v −16) and the atrium glass (v −16.07).
  const surround = -16.035;
  body.quad([-7.6, 17, surround], [-7.6, s1 - 2, surround], [7.6, s1 - 2, surround], [7.6, 17, surround], RUSTIC);
  glaze([-6, north + .07], [6, north + .07], 18, 56, 2, .92, .55, ARCH_GLASS, '#8d97a3');
  const fan = (cy: number, r: number, z: number, color: string, into = body) => {
    for (let k = 0; k < 8; k++) {
      const p = (k * Math.PI) / 8, q = ((k + 1) * Math.PI) / 8;
      into.tri([0, cy, z], [r * Math.cos(p), cy + r * Math.sin(p), z], [r * Math.cos(q), cy + r * Math.sin(q), z], color);
    }
  };
  fan(56, 6, north - .1, ARCH_GLASS[0], lights);
  fan(5, 4, north - .1, ARCH_GLASS[1], lights);
  body.quad([-4, 0, north - .1], [-4, 5, north - .1], [4, 5, north - .1], [4, 0, north - .1], ARCH_GLASS[1]);
  shell.prism([[-6.5, -22], [6.5, -22], [6.5, north], [-6.5, north]], 5.2, 6.1, '#26324a', '#2c3850');

  // Stacked round balconies down the centre of the east and west faces: a
  // rounded bay per column, with each floor's dark balcony recess.
  for (const side of [-1, 1])
    for (const v of [-2.2, 2.2])
      for (const [face, lo, hi] of [[21, s1 + 2, s2], [19, s2 + 1, s3 - 2]]) {
        const ring: P2[] = Array.from({ length: 5 }, (_, k) => {
          const a = -Math.PI / 2 + (k * Math.PI) / 4;
          return [side * (face + 1.1 * Math.cos(a)), v + 1.3 * Math.sin(a)];
        });
        shell.prism(ring, lo, hi, GRANITE, GRANITE);
        const x = side * (face + 1.13);
        for (let y = lo + 1.2; y < hi - .5; y += 3.5)
          body.quad([x, y, v - .65], [x, y + 1.6, v - .65], [x, y + 1.6, v + .65], [x, y, v + .65], GLASS[1]);
      }

  // An arched top window on the broad faces.
  for (const sv of [-1, 1]) {
    const z = sv * 11.12;
    body.quad([-2.2, s3 - 2, z], [-2.2, s3 + 7, z], [2.2, s3 + 7, z], [2.2, s3 - 2, z], GLASS[0]);
    fan(s3 + 7, 2.2, z, GLASS[0]);
  }

  // The attic: dark windows behind small gold X-lattice panels between granite
  // piers, floodlit at night with the notched pier tops below it (2023 night photograph).
  edges(notched(12.5, 8, 0), (a, b, len) => {
    const dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len, nx = dz * .08, nz = -dx * .08;
    const at = (t: number, y: number, k = 1) => [a[0] + dx * t + nx * k, y, a[1] + dz * t + nz * k];
    const count = Math.round(len / 2.6);
    for (let i = 0; i < count; i++) {
      const t0 = (i + .25) * len / count, t1 = (i + .75) * len / count, lo = s5 + 3, hi = attic - 2.2;
      body.quad(at(t0, lo), at(t0, hi), at(t1, hi), at(t1, lo), GLASS[0]);
      const m = (t0 + t1) / 2;
      lights.quad(at(m - .5, lo + .3, 1.5), at(m - .5, hi - .3, 1.5), at(m + .5, hi - .3, 1.5), at(m + .5, lo + .3, 1.5), GOLD);
    }
    lights.quad(at(0, attic - 1.2, 1.2), at(0, attic - .2, 1.2), at(len, attic - .2, 1.2), at(len, attic - 1.2, 1.2), GRANITE);
  });
  for (const [hu, hv, n, lo, hi] of tiers.slice(2, 5))
    edges(notched(hu, hv, n), (a, b, len) => {
      if (len > 2.1) return; // only the short notch faces of the corner piers
      const dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len, nx = dz * .09, nz = -dx * .09;
      lights.quad([a[0] + nx, hi - 7, a[1] + nz], [a[0] + nx, hi, a[1] + nz], [b[0] + nx, hi, b[1] + nz], [b[0] + nx, hi - 7, b[1] + nz], GRANITE);
    });

  // The pyramid, with a row of small dormers along each face's foot.
  const eave: P2[] = [[13.1, -8.6], [13.1, 8.6], [-13.1, 8.6], [-13.1, -8.6]];
  eave.forEach(([x, z], i) => {
    const [a, b] = eave[(i + 1) % 4];
    body.tri([x, attic, z], [a, attic, b], [0, apex, 0], COPPER);
    const count = Math.round(Math.hypot(a - x, b - z) / 2.8);
    for (let k = 1; k < count; k++) {
      const t = k / count, cx = x + (a - x) * t, cz = z + (b - z) * t;
      const ix = cx * .92, iz = cz * .92, px = (a - x) / Math.hypot(a - x, b - z) * .45, pz = (b - z) / Math.hypot(a - x, b - z) * .45;
      body.quad([ix - px, attic + .4, iz - pz], [ix - px, attic + 1.4, iz - pz], [ix + px, attic + 1.4, iz + pz], [ix + px, attic + .4, iz + pz], '#3c4a4c');
    }
  });

  return shell.finish('#ffd9a8', .7);
}
