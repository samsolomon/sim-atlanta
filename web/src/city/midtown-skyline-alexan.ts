import type { P2 } from '../vignette/geom';
import type { localLandmarkShell } from './landmark-shell';
import { along, faces, litHash, outwardSign, seedOf, wound } from './skin-kit';

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;

// Alexan on 8th, 880 West Peachtree (Rule Joy Trammell + Rubio, 2019), a 22-storey
// apartment tower. An L of tan panel walls with thin white vertical strips and
// punched blue-green windows. Charcoal balcony stacks with glass rails project at
// the slab ends, and a full-height glass curtain-wall slot runs up the West
// Peachtree face. Two storeys of glass storefront and lobby sit at the street,
// and a white band and a dark canopy edge mark the top floors.
// Frame: City axes, origin at the footprint centre; heights above the West
// Peachtree grade. The 2019 lidar (flown three months after residents moved in)
// gives a 74.5 m roof at the 95th percentile, both legs of the L; the mapped 96 m
// is 29% high. The covered deck west of the tower is a separate mapped building.
// Bay widths, balcony positions and the slot width are estimated from the
// architect's photographs (see docs/alexan-on-8th.md).

const ROOF = 74.5, BASE = 7, FLOORS = 21;
const PANEL = '#c6ad8e', STRIP = '#eeece6', WINDOW = '#7b9aa0', SLAB = '#3b3e41', RAIL = '#7d9097';
const STORE = '#3e4d55', SLOT = '#7e9ca4';
export const alexanId = 'osm:way:789975430';

export function alexanOn8th(shell: Shell) {
  const { body, lights } = shell;
  const ring = wound(shell.ring, 1);
  const out = outwardSign(ring), pitch = (ROOF - 3.5 - BASE) / FLOORS, seed = seedOf(alexanId);
  shell.prism(ring, shell.base, ROOF, PANEL, '#a9a69f');
  const east = Math.max(...ring.map(([x]) => x));
  faces(ring, (a, b, len, face) => {
    const p = (t: number, y: number, off: number) => { const [x, z] = along(a, b, len, t, out * off); return [x, y, z]; };
    const westPeachtree = Math.abs(a[0] - east) < 2 && Math.abs(b[0] - east) < 2;
    // Street storefront and lobby glass.
    body.quad(p(.3, .4, .06), p(.3, BASE - .6, .06), p(len - .3, BASE - .6, .06), p(len - .3, .4, .06), STORE);
    for (let i = 0, n = Math.max(1, Math.round(len / 5)); i < n; i++)
      if (litHash(seed, face, 0, i) < .4)
        lights.quad(p((i + .1) * len / n, .6, .1), p((i + .1) * len / n, BASE - .9, .1), p((i + .9) * len / n, BASE - .9, .1), p((i + .9) * len / n, .6, .1), STORE);
    // The glass slot, centred on the West Peachtree face.
    const slot = westPeachtree ? [len / 2 - 2.2, len / 2 + 2.2] : null;
    const stack = len > 15 ? 6.5 : 0; // balcony stacks at each end of the long faces
    const cols = Math.max(1, Math.round((len - 2 * stack) / 3.2)), w = (len - 2 * stack) / cols;
    for (let i = 0; i < cols; i++) {
      const l = stack + (i + .25) * w, r = stack + (i + .75) * w;
      if (slot && r > slot[0] - .5 && l < slot[1] + .5) continue;
      body.quad(p(l, BASE, .06), p(l, ROOF - 4, .06), p(r, ROOF - 4, .06), p(r, BASE, .06), WINDOW);
      for (let j = 0; j < FLOORS; j++)
        if (litHash(seed, face, j + 1, i + 1) < .35) {
          const y = BASE + j * pitch;
          lights.quad(p(l, y + .6, .1), p(l, y + pitch - .5, .1), p(r, y + pitch - .5, .1), p(r, y + .6, .1), WINDOW);
        }
    }
    // Panel spandrels at each floor, and thin white vertical strips about every 6.4 m.
    for (let j = 1; j < FLOORS; j++) {
      const y = BASE + j * pitch;
      body.quad(p(stack, y - .55, .08), p(stack, y + .5, .08), p(len - stack, y + .5, .08), p(len - stack, y - .55, .08), PANEL);
    }
    for (let t = stack + 3.2; t < len - stack - 1; t += 6.4)
      body.quad(p(t - .18, BASE, .1), p(t - .18, ROOF - 4, .1), p(t + .18, ROOF - 4, .1), p(t + .18, BASE, .1), STRIP);
    if (slot) {
      body.quad(p(slot[0], BASE, .12), p(slot[0], ROOF, .12), p(slot[1], ROOF, .12), p(slot[1], BASE, .12), SLOT);
      for (let j = 1; j < FLOORS; j++) {
        const y = BASE + j * pitch;
        body.quad(p(slot[0], y - .12, .14), p(slot[0], y + .12, .14), p(slot[1], y + .12, .14), p(slot[1], y - .12, .14), '#c9d4d8');
      }
    }
    // Balcony stacks: a charcoal slab edge and a glass rail each floor, glazed doors behind.
    if (stack) for (const [s0, s1] of [[.4, stack - .4], [len - stack + .4, len - .4]]) {
      body.quad(p(s0, BASE, .06), p(s0, ROOF - 4, .06), p(s1, ROOF - 4, .06), p(s1, BASE, .06), WINDOW);
      for (let j = 0; j < FLOORS; j++) {
        const y = BASE + j * pitch;
        body.quad(p(s0, y - .3, 1.7), p(s0, y, 1.7), p(s1, y, 1.7), p(s1, y - .3, 1.7), SLAB);
        body.quad(p(s0, y, 1.75), p(s0, y + 1, 1.75), p(s1, y + 1, 1.75), p(s1, y, 1.75), RAIL);
        if (litHash(seed, face + 40, j, s0 > 1 ? 1 : 0) < .35)
          lights.quad(p(s0 + .3, y + .3, .1), p(s0 + .3, y + pitch - .5, .1), p(s1 - .3, y + pitch - .5, .1), p(s1 - .3, y + .3, .1), WINDOW);
      }
    }
    // The white top band and dark canopy edge.
    body.quad(p(0, ROOF - 4, .08), p(0, ROOF - .5, .08), p(len, ROOF - .5, .08), p(len, ROOF - 4, .08), STRIP);
    body.quad(p(-.2, ROOF - .5, .6), p(-.2, ROOF, .6), p(len + .2, ROOF, .6), p(len + .2, ROOF - .5, .6), SLAB);
  });
  return shell.finish('#ffdfb0', .7);
}
