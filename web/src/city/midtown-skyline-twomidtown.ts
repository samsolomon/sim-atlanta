import type { P2 } from '../vignette/geom';
import type { localLandmarkShell } from './landmark-shell';
import { along, faces, litHash, outwardSign, seedOf, wound } from './skin-kit';
import twoPlan from './fixtures/midtown-skyline/two-midtown-plaza.json';
import onePlan from './fixtures/midtown-skyline/one-midtown-plaza.json';

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;

// Two Midtown Plaza, 1349 West Peachtree (Smallwood, Reynolds, Stewart, Stewart, 1986).
// - Tower: reflective ribbon glass with a thin maroon band at every floor.
//   A half-round glass end faces West Peachtree, and the straight office slab
//   behind it stands a little taller.
// - Joints: a dark red granite shaft runs full height where the curve meets the slab.
// - Base: two storeys of red and pink polished granite. Under the round end it is
//   cut back into a colonnade around a glazed lobby drum that glows after dark.
// Frame: City axes, origin at the footprint centre; heights above the West
// Peachtree grade. The two mapped part outlines (OSM 1451185773 and 1456611136)
// carry the 2019 lidar roofs: 78 m on the slab, 73 m on the round end. The floor
// count follows the photographs (two granite storeys, then 15 glass bands); the
// published 20 storeys is likely high (see docs/two-midtown-plaza.md).

const BASE = 9;
const GRANITE = '#8a4844', PINK = '#a8706a', BAND = '#6b3a3c', LOBBY = '#9fb2bf';
// One glass for both sisters, from the leasing site's 2026 drone photograph of the pair after the
// ASD|SKY renovation: their mirror glass reads H202-219, S11-35, V56-62 there. The blue of the
// pre-renovation day photograph (S64) was the sky in the mirror. See docs/two-midtown-plaza.md.
const GLASS = '#8c9bab';

type PlazaPlan = typeof twoPlan;
interface PlazaStyle { id: string; plan: PlazaPlan; bands: number }

/** Two Midtown Plaza (1986): 15 glass bands. */
export function twoMidtownPlaza(shell: Shell) {
  return midtownPlazaTower(shell, { id: 'osm:way:269636880', plan: twoPlan, bands: 15 });
}

/**
 * One Midtown Plaza, 1360 Peachtree: the 14-storey sister of Two Midtown, with the same ribbon
 * glass, maroon floor bands, red granite base and joint shafts, at its own lidar roofs; see
 * docs/one-midtown-plaza.md.
 */
export function oneMidtownPlaza(shell: Shell) {
  return midtownPlazaTower(shell, { id: 'osm:way:269637564', plan: onePlan as PlazaPlan, bands: 12 });
}

function midtownPlazaTower(shell: Shell, { id, plan, bands: BANDS }: PlazaStyle) {
  const { body, lights } = shell;
  const seed = seedOf(id);
  let wall = 0;
  const local = (ring: number[][]): P2[] => wound(ring.map(([x, z]) => [x - plan.origin[0], z - plan.origin[1]] as P2), 1);
  const slab = local(plan.slab), round = local(plan.round);

  /** Ribbon glass over a part: glass walls, a maroon band every floor, a lamp quad per lit office bay. */
  function ribbons(ring: P2[], roof: number, occupancy: number, lobby: boolean) {
    const out = outwardSign(ring), pitch = (roof - BASE) / BANDS;
    shell.prism(ring, shell.base, BASE, GRANITE, GRANITE);
    shell.prism(ring, BASE, roof, GLASS, '#8f8f8c');
    faces(ring, (a, b, len) => {
      const face = wall++;
      const p = (t: number, y: number, off: number) => { const [x, z] = along(a, b, len, t, out * off); return [x, y, z]; };
      // Pink granite string course and the lobby glass or punched base windows.
      body.quad(p(0, BASE - .9, .08), p(0, BASE - .3, .08), p(len, BASE - .3, .08), p(len, BASE - .9, .08), PINK);
      if (lobby) lights.quad(p(.15, .4, .1), p(.15, BASE - 1.6, .1), p(len - .15, BASE - 1.6, .1), p(len - .15, .4, .1), LOBBY);
      for (let j = 1; j <= BANDS; j++) {
        const y = BASE + j * pitch;
        body.quad(p(0, y - .3, .07), p(0, y + .15, .07), p(len, y + .15, .07), p(len, y - .3, .07), j === BANDS ? GRANITE : BAND);
      }
      const bays = Math.max(1, Math.round(len / 4.5));
      for (let j = 0; j < BANDS; j++)
        for (let i = 0; i < bays; i++)
          if (litHash(seed, face, j, i) < occupancy) {
            const l = (i + .06) * len / bays, r = (i + .94) * len / bays, y = BASE + j * pitch;
            lights.quad(p(l, y + .4, .1), p(l, y + pitch - .5, .1), p(r, y + pitch - .5, .1), p(r, y + .4, .1), GLASS);
          }
    });
  }
  // Offices are mostly dark at 23:30; the round end's lobby drum stays lit.
  ribbons(slab, plan.slabRoof, .1, false);
  ribbons(round, plan.roundRoof, .1, true);

  // The dark red granite shafts where the round end meets the slab, a little proud and taller.
  for (const [x, z, dx, dz] of plan.shafts) {
    const [u, v] = [x - plan.origin[0], z - plan.origin[1]];
    const w = 2.2, d = 1.4;
    shell.prism([[u - w * dx - d * dz, v - w * dz + d * dx], [u + w * dx - d * dz, v + w * dz + d * dx],
      [u + w * dx + d * dz, v + w * dz - d * dx], [u - w * dx + d * dz, v - w * dz - d * dx]],
    BASE, plan.slabRoof + 1, GRANITE, GRANITE);
  }
  return shell.finish('#ffe2b8', .7);
}
