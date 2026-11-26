import { Color, CylinderGeometry, ShapeUtils, Vector2 } from 'three';
import { surfaces } from '../materials';
import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { along, faces, litHash, outwardSign, seedOf, wound } from './skin-kit';

/**
 * The Peach (1655 Peachtree St NE), at the south end of the Peachtree Road bridge over I-85.
 * A 1964 office slab, now apartments, painted white with stacked round balconies over a dark,
 * cantilevered parking podium. Its fluted round corner tower carries a mast, an open ring
 * platform and a giant metal peach, installed in 1994 (Midtown Alliance credits Taz Anderson).
 * The peach's ad wrap and the building's signage are drawn as a plain cream band and blank walls.
 * Heights: the mapped parts (12 storeys, 43.2 m inferred); the tower, mast and peach are
 * estimated from the 2016 street view and the Esri plan (cage about 11.6 m across).
 */
export const thePeachId = 'osm:way:265351172';
const origin: P2 = [45, -5015];
const PARTS = {
  slab: 'osm:way:1456412808', // the slab with its balconies, to the 11th-floor roof
  core: 'osm:way:1456412807', // the top storey and the roof
  tower: 'osm:way:1456412800', // the round corner tower under the peach
  decks: ['osm:way:1456412803', 'osm:way:1456412805', 'osm:way:1456412806'], // the parking podium
};
const SLAB = 39.6, CORE = 43.2, DECK = [18, 14.4, 14.4], STOREY = 3.6;
const TOWER = 47.2; // tower top, about a storey above the roof
const PEACH_R = 4.1; // a peach about 8.2 m across and 9.4 m tall, inside the 11.6 m ring

const white = '#eceae3', flute = '#d6d3cb', rail = '#f4f2ec', glass = '#3f5357', deck = '#4a4d51',
  deckEdge = '#666a6e', metal = '#b9bcbc', band = '#e6e0d2';

export function createThePeach(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const ring = (id: string) => site.parts?.find(p => p.id === id)?.rings[0]?.map(([x, z]): P2 => [x - origin[0], z - origin[1]]);
  const slab = ring(PARTS.slab), core = ring(PARTS.core), tower = ring(PARTS.tower);
  const decks = PARTS.decks.map(ring);
  if (!slab || !core || !tower || decks.some(d => !d)) return null;
  const shell = landmarkShell(buildings, grid, site.id, 'The Peach', origin, [1, 0], [[0, 0]]);
  if (!shell) return null;
  const { body, lights } = shell;
  const floor = site.floorY === undefined ? shell.base + 0.35 : site.floorY + grid.manifest.vertical.sceneZeroNavd88M;
  const footing = Math.min(floor, shell.base) - 0.65;
  const flat = (r: P2[], y: number, color: string) => {
    for (const [a, b, c] of ShapeUtils.triangulateShape(r.map(([x, z]) => new Vector2(x, z)), []))
      body.tri([r[a][0], y, r[a][1]], [r[c][0], y, r[c][1]], [r[b][0], y, r[b][1]], color);
  };
  const wall = (a: P2, b: P2, y0: number, y1: number, color: string, target = body) =>
    target.quad([a[0], y0, a[1]], [a[0], y1, a[1]], [b[0], y1, b[1]], [b[0], y0, b[1]], color);

  // The parking podium: dark decks with a pale slab edge at each level.
  for (const [i, d] of decks.entries()) {
    const r = wound(d!, 1), out = outwardSign(r), top = floor + DECK[i];
    shell.paint(surfaces.concrete({ colour: 'board' }), () => shell.prism(r, footing, top, deck, '#6e7174'));
    faces(r, (a, b, length) => {
      for (let y = floor + STOREY; y <= top + .01; y += STOREY) {
        const p = along(a, b, length, -.15, .08 * out), q = along(a, b, length, length + .15, .08 * out);
        wall(p, q, y - .75, y, deckEdge);
      }
    }, 2);
  }

  // The white slab: punched windows, every bay with a round balcony on the long faces.
  const s = wound(slab, 1), out = outwardSign(s), seed = seedOf(PARTS.slab);
  shell.paint(surfaces.stucco(), () => shell.prism(s, footing, floor + SLAB, white, '#cfcbc2'));
  shell.paint(surfaces.stucco(), () => shell.prism(wound(core, 1), floor + SLAB, floor + CORE, white, '#d4d1c9'));
  faces(s, (a, b, length, face) => {
    const bays = Math.max(1, Math.round(length / 3.4)), long = length > 14;
    for (let level = 0, y = floor + 15.2; y + 2.2 < floor + SLAB; y += STOREY, level++) {
      for (let k = 0; k < bays; k++) {
        const u = (k + .5) * length / bays, w = Math.min(1.6, length / bays * .5);
        const p = along(a, b, length, u - w / 2, .05 * out), q = along(a, b, length, u + w / 2, .05 * out);
        wall(p, q, y, y + 2.2, glass, litHash(seed, face, level, k) < .14 ? lights : body);
        if (!long || k % 2) continue;
        // A half-round balcony, 1.1 m deep: a slab and a white rail band, low-poly.
        const arc = [0, 1, 2, 3, 4].map(j => {
          const t = Math.PI * j / 4;
          return along(a, b, length, u + 1.25 * Math.cos(t), out * 1.1 * Math.sin(t));
        });
        for (let j = 1; j < arc.length; j++) {
          body.tri([arc[0][0], y - .1, arc[0][1]], [arc[j - 1][0], y - .1, arc[j - 1][1]], [arc[j][0], y - .1, arc[j][1]], rail);
          wall(arc[j - 1], arc[j], y - .3, y + .85, rail);
          wall(arc[j], arc[j - 1], y - .3, y + .85, rail);
        }
      }
    }
  }, 3);

  // The fluted round tower at the Peachtree corner, white with darker flutes.
  const t = wound(tower, 1), top = floor + TOWER;
  const centre: P2 = [t.reduce((n, p) => n + p[0], 0) / t.length, t.reduce((n, p) => n + p[1], 0) / t.length];
  shell.paint(surfaces.stucco(), () => {
    for (const [i, a] of t.entries()) {
      const b = t[(i + 1) % t.length];
      wall(b, a, footing, top, i % 2 ? flute : white);
      wall(a, b, footing, top, i % 2 ? flute : white);
    }
    flat(t, top, '#cfcbc2');
  });

  // Mast, open ring platform and the peach.
  const [cx, cz] = centre;
  body.addGeometry(new CylinderGeometry(.45, .55, 4.2, 8).translate(cx, top + 2.1, cz), metal);
  const R = 5.8, deckY = top + 2.3, n = 16;
  const at = (k: number, r: number): P2 => [cx + r * Math.cos(k / n * 2 * Math.PI), cz + r * Math.sin(k / n * 2 * Math.PI)];
  for (let k = 0; k < n; k++) {
    const a0 = at(k, R), a1 = at(k + 1, R), i0 = at(k, R - 1.1), i1 = at(k + 1, R - 1.1);
    // Platform annulus and an open railing band (both faces, so it reads from inside the ring).
    body.quad([a0[0], deckY, a0[1]], [i0[0], deckY, i0[1]], [i1[0], deckY, i1[1]], [a1[0], deckY, a1[1]], metal);
    body.quad([a1[0], deckY, a1[1]], [i1[0], deckY, i1[1]], [i0[0], deckY, i0[1]], [a0[0], deckY, a0[1]], metal);
    wall(a0, a1, deckY + .75, deckY + 1.1, metal);
    wall(a1, a0, deckY + .75, deckY + 1.1, metal);
  }
  // The ring's support: an open truss cone from the mast head out to the platform.
  body.addGeometry(new CylinderGeometry(R - .6, .7, 2.1, 16, 1, true).translate(cx, deckY - 1.05, cz), '#9fa3a4');
  // Mirrored copy: the same cone wound inward, so its inside face draws too.
  body.addGeometry(new CylinderGeometry(R - .6, .7, 2.1, 16, 1, true).scale(-1, 1, 1).translate(cx, deckY - 1.05, cz), '#9fa3a4');
  // The peach, after the sculpture's vertical metal slices: 12 solid gores on a peach profile,
  // a little taller than wide, with a point at the bottom and a suture groove down the
  // Peachtree-facing side. Warm golden-peach grades to a red-pink blush over half to two-thirds of the south and east sides; each slice is a
  // shade lighter or darker than its neighbour, so the ribs read up close.
  const G = 12, H = PEACH_R * 1.06;
  const profile: [y: number, r: number][] = [[1, .1], [.88, .5], [.6, .84], [.24, .99], [-.12, .99],
    [-.48, .85], [-.8, .55], [-1.02, .18], [-1.14, 0]];
  const py = deckY - 1.2 + H * 1.14; // the lower third sits inside the ring, as in the 2016 view
  // Blush faces between the Peachtree approach (south) and the I-85 side (east), the two
  // views that see it most; the suture runs down that side too.
  const blush: P2 = [.6, .8], suture = Math.atan2(blush[1], blush[0]);
  const gold = new Color('#f4c27c'), peach = new Color('#f2958a'), red = new Color('#df5576'), tint = new Color();
  const point = (k: number, g: number, scale = 1): number[] => {
    const [y, r] = profile[k], phi = suture + g / G * 2 * Math.PI;
    const groove = g % G === 0 && k > 0 && k < profile.length - 1 ? .8 : 1;
    return [cx + Math.cos(phi) * r * PEACH_R * groove * scale, py + y * H, cz + Math.sin(phi) * r * PEACH_R * groove * scale];
  };
  // Emits a triangle wound to face away from the peach's axis.
  const outward = (a: number[], b: number[], c: number[], color: string) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    const m = [(a[0] + b[0] + c[0]) / 3 - cx, (a[1] + b[1] + c[1]) / 3 - py, (a[2] + b[2] + c[2]) / 3 - cz];
    if (n[0] * m[0] + n[1] * m[1] + n[2] * m[2] >= 0) body.tri(a, b, c, color); else body.tri(a, c, b, color);
  };
  for (let g = 0; g < G; g++) {
    const mid = suture + (g + .5) / G * 2 * Math.PI;
    const facing = Math.cos(mid) * blush[0] + Math.sin(mid) * blush[1];
    for (let k = 0; k < profile.length - 1; k++) {
      const y = (profile[k][0] + profile[k + 1][0]) / 2;
      const t = Math.min(1, Math.max(0, .3 + .62 * facing + .1 * y));
      if (t < .42) tint.lerpColors(gold, peach, t / .42); else tint.lerpColors(peach, red, Math.min(1, (t - .42) / .45));
      tint.offsetHSL(0, 0, g % 2 ? -.025 : .02);
      const color = '#' + tint.getHexString();
      const a = point(k, g), b = point(k, g + 1), c = point(k + 1, g + 1), d = point(k + 1, g);
      outward(a, b, c, color);
      if (k < profile.length - 2) outward(a, c, d, color);
    }
  }
  // Thin dark ink ribs on the slice edges (along every band, so they stay on the surface).
  for (let g = 0; g < G; g++) {
    const phi = suture + g / G * 2 * Math.PI, tx = -Math.sin(phi) * .06, tz = Math.cos(phi) * .06;
    for (let k = 0; k + 1 < profile.length; k++) {
      const a = point(k, g, 1.008), b = point(k + 1, g, 1.008);
      outward([a[0] - tx, a[1], a[2] - tz], [a[0] + tx, a[1], a[2] + tz], [b[0] + tx, b[1], b[2] + tz], '#8c4a3a');
      outward([a[0] - tx, a[1], a[2] - tz], [b[0] + tx, b[1], b[2] + tz], [b[0] - tx, b[1], b[2] - tz], '#8c4a3a');
    }
  }
  // The ad wrap at the waist, drawn as a thin plain cream band with no lettering.
  for (let g = 0; g < G; g++) {
    const at = (gg: number, dy: number) => { const p = point(3, gg, 1.02); return [p[0], p[1] + dy, p[2]]; };
    outward(at(g, -.3), at(g + 1, -.3), at(g + 1, .3), band);
    outward(at(g, -.3), at(g + 1, .3), at(g, .3), band);
  }
  // Stem and one leaf on top.
  const crown = py + H;
  body.addGeometry(new CylinderGeometry(.18, .28, 1.1, 5).translate(cx, crown + .45, cz), '#5b4130');
  const leaf = [[cx, crown + .9, cz], [cx + 1.6, crown + 1.7, cz + .7], [cx + 3.4, crown + 1.3, cz + .3], [cx + 1.7, crown + .8, cz - .6]];
  body.quad(leaf[0], leaf[1], leaf[2], leaf[3], '#5f8a3c');
  body.quad(leaf[3], leaf[2], leaf[1], leaf[0], '#4f7833');

  const result = shell.finish('#f3d9a6', .6);
  result.group.children.forEach(m => { m.receiveShadow = m.castShadow = true; });
  return result;
}
