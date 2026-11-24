import { ShapeUtils, Vector2 } from 'three';
import type { GroundGrid } from '../terrain/grid';
import { pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { surfaces } from '../materials';
import { landmarkShell } from './landmark-shell';
import { along, faces, litHash, outwardSign, ramp, seedOf, wound } from './skin-kit';

export const ncrId = 'osm:way:26795281';
const origin: P2 = [181, -2793];

// NCR Global Headquarters (864 Spring Street, Duda|Paine, 2018): a 19-storey glass tower on
// Williams and 8th, a lower glass tower on Spring, and a garage base topped by a sky garden.
// The mapped part heights are floor-count guesses; the April 2019 lidar measures the roofs.
const tower = 'osm:way:886033995', annex = 'osm:way:886033999', base = 'osm:way:886034005';
const heights = {
  // Main roof (lidar p50 85.6 m) and its glass plant screen (p95 96.1, max 97.8).
  tower: 85.6, towerScreen: 95,
  // Spring Street tower: roof p50 54.3, screen to p95 58.9.
  annex: 54.3, annexScreen: 58.6,
  // Garage base: roof p50 19.7 m, carrying the sky garden.
  base: 19.7,
};
const lobby = 7.6, storey = (heights.tower - lobby) / 19;

const glassLow = '#3f5a70', glassHigh = '#9ab3c6';
// The sloping facet reflects more sky than the vertical walls.
const facetLow = '#6f8fa8', facetHigh = '#bfd2df';

export function createNcrHq(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const part = (id: string) => site.parts?.find(p => p.id === id)?.rings[0]?.map(([x, z]): P2 => [x - origin[0], z - origin[1]]);
  const rings = [tower, annex, base].map(part);
  if (rings.some(r => !r || r.length < 4)) return null;
  const shell = landmarkShell(buildings, grid, site.id, 'NCR Global Headquarters', origin, [1, 0], [[0, 0], [-40, -30], [40, 45]]);
  if (!shell) return null;
  const [towerR, annexR, baseR] = rings.map(r => wound(clean(r!), 1));
  const out = outwardSign(towerR);
  const floor = site.floorY === undefined ? shell.base + 0.35 : site.floorY + grid.manifest.vertical.sceneZeroNavd88M;
  const footing = Math.min(floor, shell.base) - 0.65;
  const ground = ([x, z]: P2) => Math.max(floor, grid.sample(x + origin[0], z + origin[1]) ?? floor);
  const { body, lights } = shell;
  const glassAt = ramp(glassLow, glassHigh, footing, floor + heights.towerScreen);
  const facetAt = ramp(facetLow, facetHigh, footing, floor + heights.towerScreen);
  const tri = (b: typeof body, p: number[][], c: number[][]) => {
    const n = b.pos.length;
    b.tri(p[0], p[1], p[2], '#000000');
    for (let k = 0; k < 3; k++) b.col.splice(n + k * 3, 3, ...c[k]);
  };
  const quad = (b: typeof body, p: number[][], at: (y: number) => number[]) => {
    tri(b, [p[0], p[1], p[2]], [at(p[0][1]), at(p[1][1]), at(p[2][1])]);
    tri(b, [p[0], p[2], p[3]], [at(p[0][1]), at(p[2][1]), at(p[3][1])]);
  };
  const roof = (ring: P2[], y: number, color: string) => {
    for (const [a, b, c] of ShapeUtils.triangulateShape(ring.map(([x, z]) => new Vector2(x, z)), []))
      body.tri([ring[a][0], y, ring[a][1]], [ring[c][0], y, ring[c][1]], [ring[b][0], y, ring[b][1]], color);
  };

  /**
   * A glass tower whose corner nearest `corner` is sliced by a sloping facet: full width at the
   * roof, closing to the bare corner at the lobby. The cut runs dNS metres along the face that
   * runs north-south and dEW along the other, at the roof.
   */
  function slicedTower(ring: P2[], top: number, screen: number, corner: P2, dNS: number, dEW: number, lit: number[]) {
    const sh = shell!, seed = seedOf(site.id) ^ Math.round(top * 10);
    const ci = ring.reduce((best, p, i) => Math.hypot(p[0] - corner[0], p[1] - corner[1]) < Math.hypot(ring[best][0] - corner[0], ring[best][1] - corner[1]) ? i : best, 0);
    const n = ring.length, C = ring[ci], A = ring[(ci + n - 1) % n], B = ring[(ci + 1) % n];
    // A cut never runs past the next vertex: it stops 0.5 m short so the roof ring stays simple.
    const toward = (p: P2, q: P2, d: number): P2 => {
      const l = Math.hypot(q[0] - p[0], q[1] - p[1]), k = Math.min(d, l - 0.5) / l;
      return [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
    };
    const ns = (p: P2) => Math.abs(p[1] - C[1]) > Math.abs(p[0] - C[0]);
    const Ca = toward(C, A, ns(A) ? dNS : dEW), Cb = toward(C, B, ns(B) ? dNS : dEW);
    const lo = floor + lobby, hi = floor + top;
    // Where the face edge sits at height y: the sliced faces run from the corner (at the lobby) to the cut (at the roof).
    const at = (p: P2, q: P2, y: number): P2 => { const t = (y - lo) / (hi - lo); return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; };
    const roofRing: P2[] = [];
    ring.forEach((p, i) => { if (i === ci) roofRing.push(Ca, Cb); else roofRing.push(p); });
    // Lobby: a recessed glass storey under the whole tower.
    const recessed = inset(ring, 1.8);
    sh.prism(recessed, footing, lo, '#26333c', '#26333c');
    faces(recessed, (a, b, length) => {
      const p = along(a, b, length, 0.3, 0.04 * out), q = along(a, b, length, length - 0.3, 0.04 * out);
      lights.quad([p[0], footing, p[1]], [p[0], lo - 0.6, p[1]], [q[0], lo - 0.6, q[1]], [q[0], footing, q[1]], '#33444e');
    });
    roof(ring, lo, '#5b666d');
    // Walls: every face in its own plane; the two faces at the corner are trapezoids.
    ring.forEach((p, i) => {
      const q = ring[(i + 1) % n];
      const pTop = i === ci ? Cb : p, qTop = (i + 1) % n === ci ? Ca : q;
      quad(body, [[p[0], lo, p[1]], [pTop[0], hi, pTop[1]], [qTop[0], hi, qTop[1]], [q[0], lo, q[1]]], glassAt);
      const length = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (length < 10) return;
      // A joint every storey, the glass at about half its brightness, following the face's sloping end.
      for (let y = lo + storey; y < hi - 1; y += storey) {
        const s = i === ci ? at(C, Cb, y) : p, e = (i + 1) % n === ci ? at(C, Ca, y) : q;
        const l = Math.hypot(e[0] - s[0], e[1] - s[1]);
        const s1 = along(s, e, l, 0, 0.06 * out), e1 = along(s, e, l, l, 0.06 * out);
        const c = glassAt(y).map(v => v * 0.55);
        const k = body.pos.length;
        body.quad([s1[0], y, s1[1]], [s1[0], y + 0.6, s1[1]], [e1[0], y + 0.6, e1[1]], [e1[0], y, e1[1]], '#000000');
        for (let v = k; v < body.pos.length; v += 3) body.col.splice(v, 3, ...c);
      }
      // Offices at 23:30: a few whole floors still lit, by day in the glass's own tone.
      for (const level of lit) {
        // The last litHash argument is a slot, not a bay: 0 decides lit, 1 the run's position, 2 its width.
        if (litHash(seed, i, level, 0) >= 0.5) continue;
        const y = lo + (level + 0.18) * storey, y1 = y + storey * 0.64;
        const s = i === ci ? at(C, Cb, y1) : p, e = (i + 1) % n === ci ? at(C, Ca, y1) : q;
        const l = Math.hypot(e[0] - s[0], e[1] - s[1]);
        // A lit bay run covering 30–55% of the face, placed by the kit's lit-pane hash.
        const h = litHash(seed, i, level, 1), w = 0.3 + 0.25 * litHash(seed, i, level, 2);
        const u0 = 0.06 + (0.88 - w) * h;
        const s1 = along(s, e, l, l * u0, 0.09 * out), e1 = along(s, e, l, l * (u0 + w), 0.09 * out);
        quad(lights, [[s1[0], y, s1[1]], [s1[0], y1, s1[1]], [e1[0], y1, e1[1]], [e1[0], y, e1[1]]], glassAt);
      }
    });
    // The sloping facet.
    tri(body, [[C[0], lo, C[1]], [Ca[0], hi, Ca[1]], [Cb[0], hi, Cb[1]]], [facetAt(lo), facetAt(hi), facetAt(hi)]);
    roof(roofRing, hi, '#6c777e');
    // Glass plant screen, set in 3 m.
    const screenRing = inset(roofRing, 3);
    faces(screenRing, (a, b) => quad(body, [[a[0], hi, a[1]], [a[0], floor + screen, a[1]], [b[0], floor + screen, b[1]], [b[0], hi, b[1]]], glassAt));
    roof(screenRing, floor + screen, '#59646b');
  }

  // Garage base: pale louvre bands over a glazed street storey, with the sky garden on top.
  shell.prism(baseR, footing, floor + heights.base, '#c9ccca', '#77905c', { wall: surfaces.precast({ width: 3, height: 3.2 }) });
  faces(baseR, (a, b, length) => {
    const m = along(a, b, length, length / 2, 1.5 * out);
    if (length < 4 || pointInRing(m[0], m[1], towerR) || pointInRing(m[0], m[1], annexR)) return;
    const p = along(a, b, length, 0.4, 0.05 * out), q = along(a, b, length, length - 0.4, 0.05 * out);
    for (let k = 0; k < 4; k++) {
      const y = floor + 6.4 + k * 3.25;
      body.quad([p[0], y, p[1]], [p[0], y + 1.5, p[1]], [q[0], y + 1.5, q[1]], [q[0], y, q[1]], '#4b5257');
    }
    // Street storey glazing following the grade.
    const steps = Math.max(1, Math.ceil(length / 6));
    for (let k = 0; k < steps; k++) {
      const s = along(a, b, length, 0.4 + k * (length - 0.8) / steps + 0.25, 0.05 * out);
      const e = along(a, b, length, 0.4 + (k + 1) * (length - 0.8) / steps - 0.25, 0.05 * out);
      lights.quad([s[0], footing, s[1]], [s[0], ground(s) + 4.8, s[1]], [e[0], ground(e) + 4.8, e[1]], [e[0], footing, e[1]], '#34444c');
    }
  });
  // The sky garden's pavilion on the terrace (the lawn is the base's planted roof colour).
  const pavilion: P2[] = [[-8, 8], [14, 8], [14, 16], [-8, 16]];
  if (pavilion.every(([x, z]) => pointInRing(x, z, baseR) && !pointInRing(x, z, towerR) && !pointInRing(x, z, annexR)))
    shell.prism(pavilion, floor + heights.base, floor + heights.base + 4.2, '#3f4a50', '#4c555a');

  // Tower on Williams and 8th: the facet faces the Connector from the tower's south corner on
  // Williams, its long cut up the Williams face and its short cut on the mapped south jog.
  slicedTower(towerR, heights.tower, heights.towerScreen, [-75, -11], 22, 4, [3, 6, 9, 12, 15, 17]);
  // Spring Street tower: the facet on its southeast corner faces Spring.
  slicedTower(annexR, heights.annex, heights.annexScreen, [67, 63], 14, 4, [2, 5, 8]);

  const result = shell.finish('#f2dcb0', 0.6);
  // The lamp quads darken with the shaded wall they sit on, or they show as pale panes by day.
  result.group.children.forEach(m => { m.receiveShadow = true; });
  return result;
}

/** Drops vertices that close an edge shorter than 2 m (the mapped parts' small jogs). */
function clean(ring: P2[]): P2[] {
  const out: P2[] = [];
  for (const p of ring) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= 2) out.push(p);
  }
  while (out.length > 3 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) < 2) out.pop();
  return out;
}

/** Pulls every vertex toward the centroid by `d` metres (the parts are near-convex). */
function inset(ring: P2[], d: number): P2[] {
  const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length, cz = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  return ring.map(([x, z]) => { const l = Math.hypot(x - cx, z - cz) || 1; return [x - (x - cx) / l * d, z - (z - cz) / l * d]; });
}
