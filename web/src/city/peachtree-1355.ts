import { ShapeUtils, Vector2 } from 'three';
import type { GroundGrid } from '../terrain/grid';
import { pointInRing, rng, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { FLAT, surfaces } from '../materials';
import { landmarkShell } from './landmark-shell';
import { along, faces, outwardSign, wound } from './skin-kit';

export const peachtree1355Id = 'osm:way:885332250';
const origin: P2 = [599, -4210];

// 1355 Peachtree: a red-brick office tower that steps back three times under a pedimented
// crown, over a limestone-based podium. Roofs are the April 2019 lidar per mapped part (p50).
const parts: [id: string, roof: number][] = [
  ['osm:way:1450754131', 74.8], // crown tier on Peachtree, under the pediment
  ['osm:way:1450754132', 68], // second tier
  ['osm:way:885332247', 59.9], // third tier
  ['osm:way:1450754134', 34.9], // podium
  ['osm:way:1450754136', 38], // podium pavilions
  ['osm:way:1450754137', 40.7],
  ['osm:way:1450754138', 38.3],
  ['osm:way:1450754140', 32.4], // podium wings
  ['osm:way:1450754141', 28.9],
  ['osm:way:1450754135', 21.6], // the mapped low wing (no clean lidar sample)
];
const crownEave = 72.6, crownRidge = 77.1; // lidar p50 74.8, max 77.1: a pitched crown
const limestoneTop = 13.2; // the pale classical base: three storeys
const storey = 3.6;

const brick = '#8c4636', cream = '#e3dac6', glass = '#4e5d66', frame = '#ece8de';

export function create1355Peachtree(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const rings = parts.map(([id]) => site.parts?.find(p => p.id === id)?.rings[0]?.map(([x, z]): P2 => [x - origin[0], z - origin[1]]));
  if (rings.some(r => !r || r.length < 3)) return null;
  const shell = landmarkShell(buildings, grid, site.id, '1355 Peachtree', origin, [1, 0], [[0, 0], [-25, 5], [25, -10]]);
  if (!shell) return null;
  const P = rings.map((r, i) => ({ ring: wound(clean(r!), 1), roof: parts[i][1] }));
  const out = outwardSign(P[0].ring);
  const floor = site.floorY === undefined ? shell.base + 0.35 : site.floorY + grid.manifest.vertical.sceneZeroNavd88M;
  const footing = Math.min(floor, shell.base) - 0.65;
  const { body, lights } = shell;
  const random = rng(1355);
  const roof = (ring: P2[], y: number, color: string) => {
    for (const [a, b, c] of ShapeUtils.triangulateShape(ring.map(([x, z]) => new Vector2(x, z)), []))
      body.tri([ring[a][0], y, ring[a][1]], [ring[c][0], y, ring[c][1]], [ring[b][0], y, ring[b][1]], color);
  };
  /** Open air just outside the face at height y (no taller part there). */
  const open = (ring: P2[], a: P2, b: P2, length: number, y: number) => {
    const m = along(a, b, length, length / 2, 1.2 * out);
    return !P.some(p => p.ring !== ring && floor + p.roof > y && pointInRing(m[0], m[1], p.ring));
  };

  for (const { ring, roof: h } of P) {
    const top = floor + (h === 74.8 ? crownEave : h);
    // Limestone base, brick above, and a cream cornice band at every setback.
    shell.prism(ring, footing, Math.min(top, floor + limestoneTop), cream, '#8f8a80', { wall: surfaces.limestone({ course: 0.6 }) });
    if (top > floor + limestoneTop)
      shell.prism(ring, floor + limestoneTop, top - 1.4, brick, '#8f8a80', { wall: surfaces.brick() });
    shell.prism(ring, Math.max(floor + limestoneTop, top - 1.4), top, cream, '#8a857c', { wall: surfaces.limestone({ course: 0.7 }) });
    roof(ring, top, '#8a857c');
    // A projecting cornice: a thin cream lip 0.5 m out, all round.
    faces(ring, (a, b, length) => {
      const p = along(a, b, length, -0.5, 0.5 * out), q = along(a, b, length, length + 0.5, 0.5 * out);
      body.quad([p[0], top - 0.55, p[1]], [p[0], top, p[1]], [q[0], top, q[1]], [q[0], top - 0.55, q[1]], cream);
      body.quad([p[0], top, p[1]], [a[0], top, a[1]], [b[0], top, b[1]], [q[0], top, q[1]], cream);
    }, 2);

    // Punched windows: paired multi-pane openings with pale frames, one storey apart.
    faces(ring, (a, b, length) => {
      if (length < 6) return;
      const bays = Math.max(1, Math.round(length / 3.2));
      for (let y = floor + 4.6; y + 2.3 < top - 1.6; y += storey) {
        if (!open(ring, a, b, length, y + 1)) continue;
        // The base storey has tall arched-looking openings; above, regular sash windows.
        const tall = y < floor + 5;
        for (let k = 0; k < bays; k++) {
          const u = (k + 0.5) * length / bays, w = Math.min(1.5, length / bays * 0.48);
          const p = along(a, b, length, u - w / 2, 0.06 * out), q = along(a, b, length, u + w / 2, 0.06 * out);
          const pf = along(a, b, length, u - w / 2 - 0.28, 0.04 * out), qf = along(a, b, length, u + w / 2 + 0.28, 0.04 * out);
          const y1 = y + (tall ? 3.4 : 2.1);
          shell.paint(FLAT, () => body.quad([pf[0], y - 0.15, pf[1]], [pf[0], y1 + 0.2, pf[1]], [qf[0], y1 + 0.2, qf[1]], [qf[0], y - 0.15, qf[1]], frame));
          // Offices at 23:30: about one window in twelve still lit, in small clusters.
          const lit = random() < 0.085;
          const target = lit ? lights : body;
          (lit ? (f: () => void) => f() : (f: () => void) => shell.paint(FLAT, f))(() =>
            target.quad([p[0], y, p[1]], [p[0], y1, p[1]], [q[0], y1, q[1]], [q[0], y, q[1]], glass));
        }
      }
    });
  }

  // The crown: a pitched roof with pediments facing Peachtree and the back, an arched window and oculus.
  {
    const ring = P[0].ring;
    // Peachtree runs north-northeast here; the ridge runs across it.
    const along_ = [0.48, 0.88], across = [0.88, -0.48];
    const proj = (p: P2, d: number[]) => p[0] * d[0] + p[1] * d[1];
    const us = ring.map(p => proj(p, along_)), vs = ring.map(p => proj(p, across));
    const u0 = Math.min(...us) + 1, u1 = Math.max(...us) - 1, v0 = Math.min(...vs) + 1, v1 = Math.max(...vs) - 1;
    const at = (u: number, v: number, y: number) => [u * along_[0] + v * across[0], y, u * along_[1] + v * across[1]];
    const eave = floor + crownEave, ridge = floor + crownRidge, um = (u0 + u1) / 2;
    shell.paint(surfaces.slate(), () => {
      body.quad(at(u0, v0, eave), at(um, v0, ridge), at(um, v1, ridge), at(u0, v1, eave), '#5d6168');
      body.quad(at(um, v0, ridge), at(u1, v0, eave), at(u1, v1, eave), at(um, v1, ridge), '#5d6168');
    });
    for (const v of [v0, v1]) {
      body.tri(at(u0, v, eave), at(u1, v, eave), at(um, v, ridge), brick);
      // Cream raking cornices and the arched window under the pediment.
      const lip = v === v0 ? -0.3 : 0.3;
      body.quad(at(u0 - 0.4, v + lip, eave - 0.1), at(um, v + lip, ridge + 0.3), at(um, v + lip, ridge - 0.4), at(u0 + 0.3, v + lip, eave - 0.1), cream);
      body.quad(at(um, v + lip, ridge - 0.4), at(um, v + lip, ridge + 0.3), at(u1 + 0.4, v + lip, eave - 0.1), at(u1 - 0.3, v + lip, eave - 0.1), cream);
      const wv = v + (v === v0 ? -0.08 : 0.08);
      body.quad(at(um - 0.9, wv, eave - 6), at(um - 0.9, wv, eave + 1.2), at(um + 0.9, wv, eave + 1.2), at(um + 0.9, wv, eave - 6), glass);
      body.tri(at(um - 0.9, wv, eave + 1.2), at(um, wv, eave + 2), at(um + 0.9, wv, eave + 1.2), glass);
    }
  }
  const result = shell.finish('#f2d9a8', 0.6);
  // The lamp quads darken with the shaded wall they sit on, or they show as pale panes by day.
  result.group.children.forEach(m => { m.receiveShadow = true; });
  return result;
}

/** Drops vertices that close an edge shorter than 1.5 m (the mapped parts' small jogs and arcs). */
function clean(ring: P2[]): P2[] {
  const out: P2[] = [];
  for (const p of ring) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= 1.5) out.push(p);
  }
  while (out.length > 3 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) < 1.5) out.pop();
  return out;
}
