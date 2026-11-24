import type { P2 } from '../vignette/geom';
import type { localLandmarkShell } from './landmark-shell';
import { along, faces, outwardSign, wound } from './skin-kit';
import { cellHash, cellSeed } from './skin-lit';

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;

// Mayfair Tower Condominiums, 199 14th Street (Smallwood, Reynolds, Stewart,
// Stewart, 1989), a 30-storey condominium tower by Piedmont Park.
// - Walls: rusticated pale grey-white panels (repainted from taupe by 2025),
//   with a white cornice band about every six floors.
// - Windows: punched, with white muntins.
// - Corners: four projecting bays carry stacks of black iron balconies.
// - Crown: each corner bay ends in a tall octagonal cone of dark green-grey
//   standing-seam metal under a small glazed lantern and finial, with a dark
//   metal penthouse between them.
// Frame: City axes, origin at the tower centre; heights above the 14th Street
// grade. The 2019 lidar puts the roof mass at 91 m (median), the cones within
// its 97 m 95th percentile, and the lanterns at its 102 m maximum; the mapped
// 113 m is 16% high. Band heights, bay widths and the cone pitch are estimated
// from photographs (see docs/mayfair-tower.md).

const ROOF = 92, FLOORS = 30;
const WALL = '#e1dfd8', BAND = '#f3f2ec', WINDOW = '#5d676e', IRON = '#2c2f31', CONE = '#4f5d59', LANTERN = '#dfe8e2';
export const mayfairId = 'osm:way:536728181';

export function mayfairTower(shell: Shell) {
  const { body, lights } = shell;
  const ring = wound(shell.ring, 1);
  const out = outwardSign(ring), pitch = ROOF / FLOORS, seed = cellSeed(mayfairId);
  shell.prism(ring, shell.base, ROOF, WALL, '#b9b8b2');
  faces(ring, (a, b, len, face) => {
    const p = (t: number, y: number, off: number) => { const [x, z] = along(a, b, len, t, out * off); return [x, y, z]; };
    if (len < 3) return; // the short returns of the projecting corner bays
    const corner = Math.abs(len - 11.4) < 1.2 && len < 12.5; // the balconied corner-bay faces
    const cols = Math.max(1, Math.round(len / 2.9)), w = len / cols;
    // Punched windows: a column strip each, with the wall's spandrel band laid over at every floor.
    for (let i = 0; i < cols; i++) {
      const l = (i + .3) * w, r = (i + .7) * w;
      body.quad(p(l, 4, .06), p(l, ROOF - 2, .06), p(r, ROOF - 2, .06), p(r, 4, .06), WINDOW);
      for (let j = 1; j < FLOORS - 1; j++)
        if (cellHash(seed, face, j, i) < .32) {
          const y = j * pitch;
          lights.quad(p(l, y + .55, .1), p(l, y + pitch - .95, .1), p(r, y + pitch - .95, .1), p(r, y + .55, .1), WINDOW);
        }
    }
    for (let j = 2; j < FLOORS - 1; j++) {
      const y = j * pitch, band = j % 6 === 0;
      body.quad(p(0, y - (band ? .6 : .9), band ? .25 : .08), p(0, y + .5, band ? .25 : .08),
        p(len, y + .5, band ? .25 : .08), p(len, y - (band ? .6 : .9), band ? .25 : .08), band ? BAND : WALL);
      // Black iron balconies, one per floor across the middle of each corner-bay face.
      if (corner) body.quad(p(len * .2, y, .7), p(len * .2, y + 1, .7), p(len * .8, y + 1, .7), p(len * .8, y, .7), IRON);
    }
    // The top cornice.
    body.quad(p(0, ROOF - 1.2, .3), p(0, ROOF, .3), p(len, ROOF, .3), p(len, ROOF - 1.2, .3), BAND);
  });

  // The crown: a drum and cone over each corner bay, a lantern and finial on top,
  // and the dark metal penthouse between them. Cone corners from the mapped corner parts.
  const xs = ring.map(([x]) => x), zs = ring.map(([, z]) => z);
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  for (const [cx, cz] of [[x0 + 5.7, z0 + 5.7], [x1 - 5.7, z0 + 5.7], [x0 + 5.7, z1 - 5.7], [x1 - 5.7, z1 - 5.7]]) {
    const oct = (r: number): P2[] => Array.from({ length: 8 }, (_, k) => [cx + r * Math.cos((k + .5) * Math.PI / 4), cz + r * Math.sin((k + .5) * Math.PI / 4)]);
    shell.prism(oct(3.8), ROOF, ROOF + 3, WALL, WALL);
    const rim = oct(4), top = ROOF + 8.5;
    rim.forEach(([x, z], k) => {
      const [nx, nz] = rim[(k + 1) % 8];
      body.tri([x, ROOF + 3, z], [nx, ROOF + 3, nz], [cx, top, cz], CONE);
    });
    // Glazed lanterns glow at night (Piedmont Park photographs, 2009 and 2011).
    const lantern = oct(.65);
    lantern.forEach(([x, z], k) => {
      const [nx, nz] = lantern[(k + 1) % 8];
      lights.quad([x, top - .6, z], [x, top + .8, z], [nx, top + .8, nz], [nx, top - .6, nz], LANTERN);
      body.tri([x, top + .8, z], [nx, top + .8, nz], [cx, top + 1.7, cz], CONE);
    });
  }
  shell.prism([[-7, -7], [7, -7], [7, 7], [-7, 7]], ROOF, ROOF + 3.6, '#3a3f42', '#4a4f52');

  const model = shell.finish('#ffe1b4', .7);
  // Lamps share the body's shadow flags, so the batcher merges them by day.
  for (const mesh of model.group.children) mesh.castShadow = mesh.receiveShadow = true;
  return model;
}
