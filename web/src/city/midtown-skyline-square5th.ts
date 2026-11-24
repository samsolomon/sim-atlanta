import { rng, type P2 } from '../vignette/geom';
import type { localLandmarkShell } from './landmark-shell';
import { along, faces, outwardSign } from './skin-kit';

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;

// Square on 5th, 848 Spring Street (Preston Partnership, 2015), a 25-storey
// Georgia Tech student tower. A 60 × 24 m slab whose south face bows out 3.5 m.
// - Ends: red-brick bays with punched green-tinted windows.
// - Straight north face: a teal glass centre with stacked balconies, crossed by
//   four light concrete fins that rise past the roof to carry a thin open roof frame.
// - Curved south face: almost all teal glass with white floor lines, except a
//   brick bay at the west end.
// - Base: two brick storeys of offices and shops under a grey canopy.
// Frame: u east, v south, origin at the slab centre; heights above the Spring
// Street grade. The 88 m roof is the 2019 lidar's 95th percentile (the mapped
// 98 m is 10% high), and the roof frame is its 89.5 m maximum. Bay widths, fin
// spacing and the base height are estimated from photographs (see docs/square-on-5th.md).

const BASE = 8, ROOF = 86, PARAPET = 88, FRAME = 89.5, FLOORS = 23;
const BRICK = '#a65a43', GLASS = '#558c88', PUNCHED = '#3f6662', BAND = '#d9dedb', CONCRETE = '#c9c9c3';
const SHOP = '#3d4b52', CANOPY = '#8b9196';

export function squareOn5th(shell: Shell) {
  const { body, lights } = shell;
  const random = rng(848);
  const ring = shell.ring;
  const out = outwardSign(ring);
  const pitch = (ROOF - BASE) / FLOORS;
  /** A point `t` metres along a→b, `off` metres proud of the wall, at height y. */
  const at = (a: P2, b: P2, len: number) => (t: number, y: number, off: number) => {
    const [x, z] = along(a, b, len, t, out * off);
    return [x, y, z];
  };

  shell.prism(ring, shell.base, PARAPET, BRICK, '#9a9a94');

  /** Punched windows in a brick wall: one strip per column, a brick spandrel per floor, lamps for lit rooms. */
  function punched(a: P2, b: P2, len: number, t0: number, t1: number, bay: number, occupancy: number) {
    const p = at(a, b, len), count = Math.max(1, Math.round((t1 - t0) / bay)), w = (t1 - t0) / count;
    for (let i = 0; i < count; i++) {
      const l = t0 + (i + .2) * w, r = t0 + (i + .8) * w;
      body.quad(p(l, BASE + .6, .07), p(l, ROOF - .6, .07), p(r, ROOF - .6, .07), p(r, BASE + .6, .07), PUNCHED);
      for (let j = 0; j < FLOORS; j++)
        if (random() < occupancy)
          lights.quad(p(l, BASE + j * pitch + .7, .11), p(l, BASE + (j + 1) * pitch - .7, .11),
            p(r, BASE + (j + 1) * pitch - .7, .11), p(r, BASE + j * pitch + .7, .11), PUNCHED);
    }
    for (let j = 1; j < FLOORS; j++) {
      const y = BASE + j * pitch;
      body.quad(p(t0, y - .7, .09), p(t0, y + .7, .09), p(t1, y + .7, .09), p(t1, y - .7, .09), BRICK);
    }
  }
  /** A teal curtain wall with a white slab edge each floor (the balconies) and lamps for lit units. */
  function curtain(a: P2, b: P2, len: number, t0: number, t1: number, occupancy: number) {
    const p = at(a, b, len);
    body.quad(p(t0, BASE, .07), p(t0, ROOF, .07), p(t1, ROOF, .07), p(t1, BASE, .07), GLASS);
    for (let j = 1; j <= FLOORS; j++) {
      const y = BASE + j * pitch;
      body.quad(p(t0, y - .35, .3), p(t0, y + .25, .3), p(t1, y + .25, .3), p(t1, y - .35, .3), BAND);
    }
    const units = Math.max(1, Math.round((t1 - t0) / 4)), w = (t1 - t0) / units;
    for (let j = 0; j < FLOORS; j++)
      for (let i = 0; i < units; i++)
        if (random() < occupancy) {
          const l = t0 + (i + .08) * w, r = t0 + (i + .92) * w, y = BASE + j * pitch;
          lights.quad(p(l, y + .35, .11), p(l, y + pitch - .45, .11), p(r, y + pitch - .45, .11), p(r, y + .35, .11), GLASS);
        }
  }

  // Student rooms are busy late; lit share is an estimate (no night photograph found).
  const occupied = .38;
  faces(ring, (a, b, len) => {
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const p = at(a, b, len);
    // Two-storey base: shopfronts and office glazing in brick.
    body.quad(p(.4, .3, .07), p(.4, BASE - 1, .07), p(len - .4, BASE - 1, .07), p(len - .4, .3, .07), SHOP);
    for (let t = 1; t < len - 1; t += 3.5)
      if (random() < .3) lights.quad(p(t, .6, .11), p(t, BASE - 1.4, .11), p(Math.min(t + 2.8, len - .5), BASE - 1.4, .11), p(Math.min(t + 2.8, len - .5), .6, .11), SHOP);
    if (mid[1] < -11) {
      // North: brick end bays of punched windows around the balconied glass centre.
      punched(a, b, len, 0, 12, 3, occupied);
      curtain(a, b, len, 12, len - 12, occupied);
      punched(a, b, len, len - 12, len, 3, occupied);
    } else if (mid[1] > 5 && mid[0] > -22) {
      curtain(a, b, len, 0, len, occupied); // the curved south face
    } else {
      punched(a, b, len, 0, len, 3, occupied); // east and west ends, and the south-west brick bay
    }
  });

  // Grey canopy over the Spring Street (east) and south frontages.
  shell.prism([[30.6, -10], [32.4, -10], [32.4, 10], [30.6, 10]], 4.4, 4.8, CANOPY, CANOPY);

  // Four concrete fins on the north face, rising past the roof to carry the open frame.
  const north = Math.min(...ring.map(([, v]) => v));
  for (const u of [-13.5, -4.5, 4.5, 13.5])
    shell.prism([[u - .45, north - 1.2], [u + .45, north - 1.2], [u + .45, north + .1], [u - .45, north + .1]], BASE, FRAME, CONCRETE, CONCRETE);
  // The thin roof frame, overhanging the glass centre on both broad faces.
  shell.prism([[-19, north - 2], [19, north - 2], [19, 15], [-19, 15]], FRAME - .5, FRAME, CONCRETE, '#d4d4ce');
  // A brick penthouse at the east end of the roof.
  shell.prism([[16, -7], [27, -7], [27, 6], [16, 6]], PARAPET, PARAPET + 3.2, BRICK, '#8f8f89');

  return shell.finish('#ffdcae', .7);
}
