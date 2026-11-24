import type { P2 } from '../vignette/geom';
import type { localLandmarkShell } from './landmark-shell';
import { along, faces, litHash, outwardSign, seedOf, wound } from './skin-kit';
import plan from './fixtures/midtown-skyline/m-by-radius.json';

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;

// The M by Radius (built 2013 as SkyHouse Midtown), 1080 West Peachtree: a 23-storey
// apartment slab of floor-to-ceiling pale blue-green glass, with light silver
// aluminium piers about every 3.5 m running full height and past the roof.
// - Bays: glass-railed balconies line the recessed bays between the mapped serrations.
// - Crown: the SkyHouse signature, a curved arched screen in light grey with a teal
//   edge, centred on the south face; stair and lift towers rise from the roof deck.
// - Base: one storey of shops under blue awnings, with a one-storey wing to the west.
// Frame: City axes, origin at the slab centre; heights above the West Peachtree
// grade. The 2019 lidar (six years after opening) gives a 76.5 m roof edge and a
// 78.4 m crown; the mapped 90.1 m is 15% high. Pier spacing and the arch's
// span and rise are estimated from listing photographs (see docs/m-by-radius.md).

const GLASS = '#93aeb0', PIER = '#c9ccce', RAIL = '#dfe6e7', SHOP = '#41505a', AWNING = '#2f5f99';
const ARCH = '#d4d6d4', TEAL = '#4f8f8c', FLOORS = 23;
export const mByRadiusId = 'osm:way:536899754';

export function mByRadius(shell: Shell) {
  const { body, lights } = shell;
  const seed = seedOf(mByRadiusId);
  const local = (ring: number[][]) => wound(ring as P2[], 1);
  const tower = local(plan.tower), low = local(plan.low);
  const ROOF = plan.roof, CROWN = plan.crown, BASE = 5.5, pitch = (ROOF - 1.5 - BASE) / (FLOORS - 1);
  shell.prism(low, shell.base, plan.low_h, '#b8b3a8', '#9e9a92');
  shell.prism(tower, shell.base, ROOF, GLASS, '#a5a29b');
  const out = outwardSign(tower);
  let wall = 0;
  faces(tower, (a, b, len) => {
    const face = wall++;
    const p = (t: number, y: number, off: number) => { const [x, z] = along(a, b, len, t, out * off); return [x, y, z]; };
    // Shopfront base and its awnings.
    body.quad(p(.2, .3, .06), p(.2, BASE - .6, .06), p(len - .2, BASE - .6, .06), p(len - .2, .3, .06), SHOP);
    if (len > 6) body.quad(p(.5, BASE - .7, 1.2), p(.5, BASE - .1, .1), p(len - .5, BASE - .1, .1), p(len - .5, BASE - .7, 1.2), AWNING);
    if (len < 2.5) return; // the short returns of the serrations
    const units = Math.max(1, Math.round(len / 3.5)), w = len / units;
    // Silver piers past the roof line, and a slab edge with a glass rail at each floor.
    for (let i = 0; i <= units; i++) {
      const t = Math.min(len - .25, Math.max(.25, i * w));
      body.quad(p(t - .25, BASE, .12), p(t - .25, ROOF + 1.2, .12), p(t + .25, ROOF + 1.2, .12), p(t + .25, BASE, .12), PIER);
    }
    for (let j = 0; j < FLOORS; j++) {
      const y = BASE + j * pitch;
      body.quad(p(0, y - .2, .1), p(0, y + .15, .1), p(len, y + .15, .1), p(len, y - .2, .1), PIER);
      if (len > 8) body.quad(p(.6, y + .15, .55), p(.6, y + 1.05, .55), p(len - .6, y + 1.05, .55), p(len - .6, y + .15, .55), RAIL);
      for (let i = 0; i < units; i++)
        if (litHash(seed, face, j, i) < .34)
          lights.quad(p(i * w + .35, y + .3, .08), p(i * w + .35, y + pitch - .35, .08), p((i + 1) * w - .35, y + pitch - .35, .08), p((i + 1) * w - .35, y + .3, .08), GLASS);
    }
  });

  // The arched crown screen centred on the south face, and its teal edge.
  const south = 12.1, half = 13, rise = CROWN - ROOF + 1.5, steps = 12;
  for (let k = 0; k < steps; k++) {
    const u0 = -half + (2 * half * k) / steps, u1 = -half + (2 * half * (k + 1)) / steps;
    const y0 = ROOF - 1.5 + rise * Math.sin(Math.PI * k / steps), y1 = ROOF - 1.5 + rise * Math.sin(Math.PI * (k + 1) / steps);
    body.quad([u0, ROOF - 1.5, south], [u0, y0, south], [u1, y1, south], [u1, ROOF - 1.5, south], ARCH);
    body.quad([u0, y0 - .5, south + .05], [u0, y0, south + .05], [u1, y1, south + .05], [u1, y1 - .5, south + .05], TEAL);
  }
  // Stair and lift towers on the roof deck.
  for (const [u, v] of [[-14, -2], [12, -2]] as P2[])
    shell.prism([[u - 3, v - 3], [u + 3, v - 3], [u + 3, v + 3], [u - 3, v + 3]], ROOF, CROWN - .3, '#c4c2bb', '#b0aea8');
  return shell.finish('#ffdfb0', .7);
}
