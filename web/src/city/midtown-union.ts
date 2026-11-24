import { ShapeUtils, Vector2 } from 'three';
import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

export const midtownUnionId = 'osm:way:1297223465';
const origin: P2 = [285, -4163];

// Mapped parts of the 26-storey office tower (1331 Spring Street). The heights are the
// mapped 27, 26 and 25 floors at 3.6 m; the 2019 lidar predates the tower.
const prow = 'osm:way:1433501523', south = 'osm:way:1453246988', middle = 'osm:way:1453246989',
  court = 'osm:way:1453246990', sliver = 'osm:way:1433501524', garage = 'osm:way:1433501525';

// The garage carries the optical-art panels to 28.8 m on 17th Street and West Peachtree.
const deckH = 28.8;
// The glass shaft stands on raking concrete columns over a double-height lobby.
const lobbyH = 8.4;

// Reflective blue glass, darker at street level and picking up the sky near the top.
const glassLow = ['#4f6b84', '#57728a', '#4b667f', '#536f87'];
const glassHigh = ['#a3b8c9', '#abbfce', '#9db3c5', '#b0c3d1'];
// Mostly white and pale grey, crossed by charcoal diagonals.
const panels = ['#e2e1dc', '#c9cac6', '#e2e1dc', '#a9acab', '#66696b'];
const gold = '#d6a640';

function faces(ring: P2[], draw: (a: P2, b: P2, length: number, i: number) => void) {
  ring.forEach((a, i) => {
    const b = ring[(i + 1) % ring.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length > 0.8) draw(a, b, length, i);
  });
}

/** Signed area in the (u, v) plan; rings are normalised to one winding before drawing. */
function wound(ring: P2[], sign: number): P2[] {
  let area = 0;
  ring.forEach(([x, z], i) => { const [a, b] = ring[(i + 1) % ring.length]; area += x * b - a * z; });
  return Math.sign(area) === sign ? ring : [...ring].reverse();
}

export function createMidtownUnion(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const part = (id: string) => {
    const ring = site.parts?.find(p => p.id === id)?.rings[0];
    return ring?.map(([x, z]): P2 => [x - origin[0], z - origin[1]]);
  };
  const rings = [prow, south, middle, court, sliver, garage].map(part);
  if (rings.some(r => !r || r.length < 3)) return null;
  const shell = landmarkShell(buildings, grid, site.id, 'Midtown Union', origin, [1, 0],
    [[0, 0], [-35, -15], [38, 0]]);
  if (!shell) return null;
  const floor = site.floorY === undefined ? shell.base + 0.35 : site.floorY + grid.manifest.vertical.sceneZeroNavd88M;
  const sign = Math.sign(shell.ring.reduce((s, [x, z], i) => {
    const [a, b] = shell.ring[(i + 1) % shell.ring.length]; return s + x * b - a * z;
  }, 0)) * -1;
  const [prowR, southR, middleR, courtR, sliverR, garageR] = rings.map(r => wound(r!, sign));
  const { body, lights } = shell;
  const roof = (ring: P2[], y: number) => {
    for (const [a, b, c] of ShapeUtils.triangulateShape(ring.map(([x, z]) => new Vector2(x, z)), []))
      body.tri([ring[a][0], y, ring[a][1]], [ring[c][0], y, ring[c][1]], [ring[b][0], y, ring[b][1]], '#6b7880');
  };

  // A wall quad shaded from the street-level tone up to the sky reflection near the top.
  const glassWall = (a: P2, b: P2, lo: number, hi: number, tone: number, top: number) => {
    const n = body.pos.length;
    body.quad([a[0], lo, a[1]], [a[0], hi, a[1]], [b[0], hi, b[1]], [b[0], lo, b[1]], glassLow[tone]);
    const shade = (y: number) => hex(glassLow[tone], glassHigh[tone], (y - floor) / (top - floor));
    const [cLo, cHi] = [shade(lo), shade(hi)];
    for (let v = n; v < body.pos.length; v += 3) body.col.splice(v, 3, ...(body.pos[v + 1] === hi ? cHi : cLo));
  };
  const along = (a: P2, b: P2, length: number, u: number, out = 0): P2 => {
    const dx = (b[0] - a[0]) / length, dz = (b[1] - a[1]) / length;
    return [a[0] + dx * u + dz * out, a[1] + dz * u - dx * out];
  };
  const outward = (ring: P2[]) => {
    // Pick the offset sign that moves a face midpoint away from the ring's centroid.
    const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length, cz = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    const [a, b] = [ring[0], ring[1]], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const m = along(a, b, length, length / 2, 1), m0 = along(a, b, length, length / 2, 0);
    return Math.hypot(m[0] - cx, m[1] - cz) > Math.hypot(m0[0] - cx, m0[1] - cz) ? 1 : -1;
  };
  const out = outward(prowR);

  // The office shaft: three glass masses at their mapped heights, set on the garage or the lobby.
  const masses: [P2[], number, number][] = [[prowR, 97.2, 0], [southR, 97.2, 1], [middleR, 93.6, 2], [sliverR, 90, 3]];
  for (const [ring, h, tone] of masses) {
    const lo = ring === middleR ? floor + deckH : ring === sliverR ? floor : floor + lobbyH, hi = floor + h;
    faces(ring, (a, b, length) => {
      glassWall(a, b, lo, hi, tone, floor + 97.2);
      if (length < 14) return;
      // A broad spandrel band every floor, so the 3.6 m rhythm survives the 450 m orbit.
      const p = along(a, b, length, 0, 0.05 * out), q = along(a, b, length, length, 0.05 * out);
      for (let y = Math.ceil((lo - floor - 0.5) / 3.6) * 3.6 + floor + 0.5; y < hi - 2; y += 3.6) {
        // Each band is the glass at its height, a fifth darker: a joint, not a ribbon window.
        const n = body.pos.length;
        body.quad([p[0], y, p[1]], [p[0], y + 0.8, p[1]], [q[0], y + 0.8, q[1]], [q[0], y, q[1]], glassLow[tone]);
        const c = hex(glassLow[tone], glassHigh[tone], (y - floor) / 97.2).map(v => v * 0.62);
        for (let v = n; v < body.pos.length; v += 3) body.col.splice(v, 3, ...c);
      }
    });
    roof(ring, hi);
  }
  // The middle mass sits on the garage; under it the walls are the garage's.
  shell.prism(middleR, floor, floor + deckH, '#8d8f8e', '#8d8f8e');
  shell.prism(courtR, floor + deckH, floor + 93.6, '#4a6a82', '#6c7a83');
  // A glass screen hides the roof plant on the tallest mass, set in 2.5 m.
  const screen = inset(prowR, 2.5);
  shell.prism(screen, floor + 97.2, floor + 99.6, glassHigh[0], '#59656e');

  // Recessed double-height lobby glazing under a timber soffit, with raking columns.
  for (const ring of [prowR, southR]) {
    const recessed = inset(ring, 2.2);
    shell.prism(recessed, floor, floor + lobbyH - 0.6, '#2c3a43', '#2c3a43');
    shell.prism(ring, floor + lobbyH - 0.6, floor + lobbyH, '#b78a58', '#b78a58');
    faces(recessed, (a, b, length) => {
      const p = along(a, b, length, 0.4, 0.04 * out), q = along(a, b, length, length - 0.4, 0.04 * out);
      lights.quad([p[0], floor + 0.3, p[1]], [p[0], floor + lobbyH - 0.9, p[1]], [q[0], floor + lobbyH - 0.9, q[1]],
        [q[0], floor + 0.3, q[1]], '#3a4a52');
    });
    faces(ring, (a, b, length) => {
      if (length < 12) return;
      // Pairs of raking columns meet the soffit in a V, about every 12 m.
      const count = Math.floor(length / 12);
      for (let i = 0; i < count; i++) {
        const mid = (i + 0.5) * length / count;
        const foot = along(a, b, length, mid, -1.2 * out);
        for (const side of [-1, 1]) {
          const head = along(a, b, length, mid + side * 3.2, -0.4 * out);
          const w = along(a, b, length, mid + side * 3.2 - side * 1.2, -0.4 * out);
          const fw = along(a, b, length, mid + 0.8 * side, -1.2 * out);
          body.quad([foot[0], floor, foot[1]], [head[0], floor + lobbyH - 0.6, head[1]],
            [w[0], floor + lobbyH - 0.6, w[1]], [fw[0], floor, fw[1]], '#b8b6ae');
        }
      }
    });
  }

  // The garage: grey, charcoal and white panels set on a diagonal, with gold slots.
  shell.prism(garageR, floor, floor + deckH, '#8d8f8e', '#7d8a62');
  shell.prism(inset(garageR, 4), floor + deckH, floor + deckH + 0.4, '#6f7d58', '#6b7f4f');
  let slot = 0;
  for (const ring of [garageR, middleR]) {
    faces(ring, (a, b, length) => {
      // Only the street faces of the middle mass sit on the garage; its other sides adjoin the tower.
      const mid = along(a, b, length, length / 2);
      if (ring === middleR && (mid[1] > -12 || mid[0] < -15)) return;
      // The street falls toward West Peachtree, so the storefront follows the face's own grade.
      const grade = Math.max(floor, ...[a, b].map(([x, z]) => grid.sample(x + origin[0], z + origin[1]) ?? floor));
      const lo = Math.max(floor + 5.2, grade + 5), hi = floor + deckH - 0.4, rows = 4, rowH = (hi - lo) / rows;
      const cols = Math.max(1, Math.round(length / 7.5)), colW = length / cols;
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          // Shift each row by half a panel so the fields read as diagonal chevrons.
          const u0 = c * colW + (r % 2) * colW * 0.5, u1 = Math.min(length, u0 + colW);
          const y0 = lo + r * rowH, y1 = y0 + rowH;
          const p = along(a, b, length, u0, 0.06 * out), q = along(a, b, length, u1, 0.06 * out);
          const color = panels[(c - r + 40 + slot) % panels.length];
          body.quad([p[0], y0, p[1]], [p[0], y1 - 0.25, p[1]], [q[0], y1 + 0.6, q[1]], [q[0], y0 + 0.85, q[1]], color);
          if ((c - r + 40 + slot) % panels.length === 1) {
            const s0 = along(a, b, length, u0 + colW * 0.3, 0.1 * out), s1 = along(a, b, length, u0 + colW * 0.62, 0.1 * out);
            const ys = y0 + rowH * 0.45;
            body.quad([s0[0], ys, s0[1]], [s0[0], ys + 0.9, s0[1]], [s1[0], ys + 1.1, s1[1]], [s1[0], ys + 0.2, s1[1]], gold);
          }
        }
      slot++;
      // Retail glazing under the panels.
      const p = along(a, b, length, 0.5, 0.05 * out), q = along(a, b, length, length - 0.5, 0.05 * out);
      lights.quad([p[0], floor + 0.4, p[1]], [p[0], grade + 4.4, p[1]], [q[0], grade + 4.4, q[1]], [q[0], floor + 0.4, q[1]], '#34444c');
    });
  }

  // Offices at 23:30: a handful of floors still lit on the Spring Street and plaza faces.
  // Faces are picked by compass direction: [u, v] with v pointing south.
  const facing = (ring: P2[], dir: P2) => {
    let best = 0, score = -Infinity;
    ring.forEach((a, i) => {
      const b = ring[(i + 1) % ring.length], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = along(a, b, length, length / 2, out), m = along(a, b, length, length / 2);
      const s = ((n[0] - m[0]) * dir[0] + (n[1] - m[1]) * dir[1]) * Math.min(length, 20);
      if (s > score) { score = s; best = i; }
    });
    return best;
  };
  const litFloors: [P2[], number, P2][] = [
    [prowR, 11, [-1, 0]], [prowR, 19, [0, -1]], [southR, 14, [0, 1]], [southR, 7, [0, 1]], [middleR, 22, [0, -1]],
  ];
  for (const [ring, level, dir] of litFloors) {
    const face = facing(ring, dir);
    const a = ring[face], b = ring[(face + 1) % ring.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const y = floor + lobbyH + (level - 2) * 3.6 + 0.5;
    const p = along(a, b, length, length * 0.15, 0.08 * out), q = along(a, b, length, length * 0.7, 0.08 * out);
    // By day the strip keeps the glass tone at its height, so only the night shows it.
    const n = lights.pos.length;
    lights.quad([p[0], y, p[1]], [p[0], y + 2.6, p[1]], [q[0], y + 2.6, q[1]], [q[0], y, q[1]], '#42606f');
    const lo = hex(glassLow[0], glassHigh[0], (y - floor) / 97.2), hi = hex(glassLow[0], glassHigh[0], (y + 2.6 - floor) / 97.2);
    for (let v = n; v < lights.pos.length; v += 3) lights.col.splice(v, 3, ...(lights.pos[v + 1] > y + 1 ? hi : lo));
  }
  return shell.finish('#f4dcae', 0.6);
}

function hex(a: string, b: string, t: number): number[] {
  const p = (s: string) => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16) / 255);
  const [x, y] = [p(a), p(b)];
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return x.map((v, i) => lin(v + (y[i] - v) * Math.min(1, Math.max(0, t))));
}

/** Pulls every vertex toward the centroid by about `d` metres (enough for convex-ish parts). */
function inset(ring: P2[], d: number): P2[] {
  const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length, cz = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  return ring.map(([x, z]) => {
    const l = Math.hypot(x - cx, z - cz) || 1;
    return [x - (x - cx) / l * d, z - (z - cz) / l * d];
  });
}
