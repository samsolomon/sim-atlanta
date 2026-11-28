import { DoubleSide, Mesh, MeshLambertMaterial } from 'three';
import type { GroundGrid } from '../terrain/grid';
import { Builder, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

/**
 * 1105 West Peachtree (2022): a 31-storey office tower at West Peachtree and 12th, wrapped on
 * its south and north elevations by a silver steel exoskeleton of X-braced bays between belt
 * trusses. The frame rises past the roof around a glazed screen crown. A parking podium with a
 * landscaped deck joins it to the 16-storey Epicurean hotel on West Peachtree and the 20-storey
 * condominium on 12th Street. On an ordinary night the exoskeleton and crown edge glow cobalt
 * blue. Evidence, estimates and gaps: docs/log/ui/1105-west-peachtree/README.md.
 */
export const westPeachtree1105Id = 'osm:way:1001565075';
const towerId = 'osm:way:1427404721';
const condoId = 'osm:way:1427404726';
const hotelId = 'osm:way:1427404722';
const deckId = 'osm:way:1464967900';

// Heights above the West Peachtree grade, metres. The site postdates the 2019 lidar, so these
// come from the published figures. The frame is 410 ft (125 m) and stands 39 ft above the
// roof, around a 25 ft glazed screen wall.
const frameTop = 125, roof = 113.1, screenTop = 120.7, lobbyTop = 7.2;
const condoTop = 66, hotelTop = 49.5, deckTop = 19.8;
const officePitch = 3.4, roomPitch = 3.1;

// Flat vertex colours: a painted library surface compiles its own program, and the low tier
// has no program to spare.
const glass = '#4d6c72', glassLit = '#4f6e74', band = '#5b777c', steel = '#bcc4c7';
const screenGlass = '#6d8a8e', roofDeck = '#8e928e';
const hotelWall = '#d8cdb8', hotelWindow = '#4a5860', condoWall = '#e9e8e2', condoGlass = '#55666c';
const deck = '#c2c0b8', lawn = '#77905a', storefront = '#34444a';

type Shell = NonNullable<ReturnType<typeof landmarkShell>>;

/** Counter-clockwise in (x, z) so the outward normal of edge a→b is (dz, -dx)/length. */
function ccw(ring: P2[]): P2[] {
  let area = 0;
  ring.forEach(([x, z], i) => { const [a, b] = ring[(i + 1) % ring.length]; area += x * b - a * z; });
  return area > 0 ? ring : [...ring].reverse();
}

/** A stable value in [0, 1) per pane. */
function hash(a: number, b: number, c: number) {
  let h = Math.imul(a, 0x27d4eb2d) ^ Math.imul(b, 0x165667b1) ^ Math.imul(c, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** A face panel on edge a→b between t0..t1 and heights lo..hi, pushed `out` metres outward. */
function panel(b: Builder, a: P2, c: P2, t0: number, t1: number, lo: number, hi: number, out: number, color: string) {
  if (hi - lo < 0.05 || t1 <= t0) return;
  const dx = c[0] - a[0], dz = c[1] - a[1], length = Math.hypot(dx, dz);
  const p = (t: number, y: number) => [a[0] + t * dx + out * dz / length, y, a[1] + t * dz - out * dx / length];
  b.quad(p(t0, lo), p(t0, hi), p(t1, hi), p(t1, lo), color);
}

/** Edges at least `min` metres long, with their length. */
function edges(ring: P2[], min: number, draw: (a: P2, b: P2, length: number, index: number) => void) {
  ring.forEach((a, i) => {
    const b = ring[(i + 1) % ring.length], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length >= min) draw(a, b, length, i);
  });
}

/**
 * Rows of windows on faces of 7 m or more: dark bands between solid spandrels, and a stable share
 * of lit panes grouped in `bay`-metre runs (two or three rooms). `lit` is the share lit at 23:30.
 */
function rooms(s: Shell, plan: P2[], lo: number, hi: number, pitch: number, glassColor: string, lit: number, bay: number, seed: number) {
  edges(plan, 7, (a, b, length, edge) => {
    const bays = Math.max(1, Math.round(length / bay));
    for (let f = 0, y = lo; y + pitch <= hi + 0.01; f++, y += pitch) {
      panel(s.body, a, b, 0.01, 0.99, y + 0.9, y + pitch - 0.25, 0.04, glassColor);
      for (let i = 0; i < bays; i++) {
        if (hash(f, i, edge * 17 + seed) >= lit) continue;
        panel(s.lights, a, b, i / bays + 0.06 / bays, (i + 1) / bays - 0.06 / bays, y + 0.95, y + pitch - 0.3, 0.09, glassColor);
      }
    }
  });
}

export function create1105WestPeachtree(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const origin: P2 = [388, -3451];
  const s = landmarkShell(buildings, grid, site.id, '1105 West Peachtree', origin, [1, 0], [[0, 0], [70, -55], [10, -66]]);
  if (!s) return null;
  const floor = s.base + 0.35;
  const local = (ring: [number, number][]): P2[] => ccw(ring.map(([x, z]): P2 => [x - origin[0], z - origin[1]]));
  // The blue exoskeleton light is its own lit material: the office panes stay warm white.
  const led = new Builder();

  let tower: P2[] | null = null;
  for (const part of site.parts ?? []) {
    // The deck's two holes are exactly the 19.8 m parts, so every part's outer ring is enough.
    if (!part.rings.length) continue;
    const plan = local(part.rings[0]);
    if (part.id === towerId) { tower = plan; continue; }
    if (part.id === condoId) {
      // White slab with balconies along both long faces (OSM splits the 12th Street face in three).
      s.prism(plan, s.base, floor + condoTop, condoWall, '#b9bab4');
      rooms(s, plan, floor + lobbyTop, floor + condoTop - 1.5, roomPitch, condoGlass, 0.3, 10, 11);
      edges(plan, 20, (a, b) => {
        if (Math.abs(b[1] - a[1]) < Math.abs(b[0] - a[0])) return;
        for (let y = floor + lobbyTop + roomPitch; y < floor + condoTop - 2; y += roomPitch) {
          const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
          const p = (t: number, out: number) => [a[0] + t * dx + out * dz / l, y, a[1] + t * dz - out * dx / l];
          s.body.quad(p(0.08, 0), p(0.08, 1.8), p(0.92, 1.8), p(0.92, 0), '#dcdbd5');
        }
      });
      continue;
    }
    if (part.id === hotelId) {
      // Punched precast hotel slab; rooms are noticeably lit late in the evening.
      s.prism(plan, s.base, floor + hotelTop, hotelWall, '#a9a596');
      rooms(s, plan, floor + 5.6, floor + hotelTop - 1.2, roomPitch, hotelWindow, 0.32, 9, 23);
      edges(plan, 6, (a, b) => panel(s.body, a, b, 0.01, 0.99, floor + 0.4, floor + 5, 0.05, storefront));
      continue;
    }
    if (part.id === deckId) {
      // The eight-level garage under the landscaped deck. Openings only on its long street faces;
      // the short runs mostly abut the towers.
      s.prism(plan, s.base, floor + deckTop, deck, '#a7aaa0');
      edges(plan, 20, (a, b) => {
        for (let y = floor + 4.5; y < floor + deckTop - 2; y += 3.1) panel(s.body, a, b, 0.02, 0.98, y, y + 1.6, 0.05, '#5d625f');
      });
      s.prism(local([[425, -3440], [450, -3440], [450, -3498], [425, -3498]]), floor + deckTop, floor + deckTop + 0.3, lawn, lawn);
      continue;
    }
    s.prism(plan, s.base, floor + Math.min(part.h, deckTop), deck, '#a7aaa0');
  }
  if (!tower) return null;

  // Office glass to the roof, then the glazed screen around the rooftop plant.
  s.prism(tower, s.base, floor + roof, glass, roofDeck);
  edges(tower, 1, (a, b) => panel(s.body, a, b, 0, 1, floor + roof, floor + screenTop, 0, screenGlass));
  edges(tower, 4, (a, b, length, edge) => {
    panel(s.body, a, b, 0, 1, floor + 0.3, floor + lobbyTop - 0.4, 0.05, storefront);
    const bays = Math.max(1, Math.round(length / 4.5));
    for (let f = 0, y = floor + lobbyTop; y < floor + roof - 0.5; f++, y += officePitch) {
      if (length >= 5.5) panel(s.body, a, b, 0, 1, y, y + 0.35, 0.05, band);
      for (let i = 0; i < bays; i++) {
        // Offices at 23:30: about one pane in fourteen, from the 2026 night photograph.
        if (hash(f, i, edge * 29 + 5) >= 0.07) continue;
        panel(s.lights, a, b, i / bays + 0.05 / bays, (i + 1) / bays - 0.05 / bays, y + 0.4, y + officePitch - 0.1, 0.1, glassLit);
      }
    }
  });
  s.prism(local([[375, -3438], [400, -3438], [400, -3462], [375, -3462]]), floor + roof, floor + roof + 4.2, '#a9ada9', '#979a96');

  // The exoskeleton stands 1.4 m off the south and north glass. Columns sit on the recessed
  // middle bay's edges, so the two X-braced bays are 22.5 m and 13.8 m wide.
  const columns = [367.45, 390.1, 396.1, 409.8].map(x => x - origin[0]);
  const modules = (from: number, count: number) =>
    [from, ...Array.from({ length: count }, (_, i) => from + (i + 1) * (roof - from) / count), frameTop].map(y => floor + y);
  // The north frame starts on the podium roof, which runs along that face's east half.
  const frames = [
    { z: -3424.6 - origin[1], out: 1, belts: modules(lobbyTop, 7) },
    { z: -3478.8 - origin[1], out: -1, belts: modules(deckTop, 6) },
  ];
  for (const { z, out, belts } of frames) {
    const zf = z + out * 1.4;
    const bar = (x0: number, y0: number, x1: number, y1: number, w: number) => {
      const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy), nx = -dy / l * w / 2, ny = dx / l * w / 2;
      led.quad([x0 + nx, y0 + ny, zf], [x1 + nx, y1 + ny, zf], [x1 - nx, y1 - ny, zf], [x0 - nx, y0 - ny, zf], steel);
    };
    for (const x of columns) bar(x, belts[0] - (out > 0 ? lobbyTop - 0.3 : 0), x, floor + frameTop, 1.3);
    // Outriggers: each column is tied back to the glass by a steel plate (Uzun+Case: the diagonals
    // sit on outriggers welded to the concrete frame), so the frame no longer floats 1.4 m off.
    for (const x of columns) {
      const lo = belts[0] - (out > 0 ? lobbyTop - 0.3 : 0), hi = floor + roof;
      led.quad([x, lo, z], [x, hi, z], [x, hi, zf], [x, lo, zf], steel);
    }
    for (const y of belts) bar(columns[0] - 0.65, y, columns[3] + 0.65, y, 1);
    for (const [l, r] of [[columns[0], columns[1]], [columns[2], columns[3]]]) {
      for (let m = 0; m < belts.length - 1; m++) {
        bar(l, belts[m], r, belts[m + 1], 0.8);
        bar(r, belts[m], l, belts[m + 1], 0.8);
      }
    }
  }
  // The blue line along the top of the screen crown.
  edges(tower, 1, (a, b) => panel(led, a, b, 0, 1, floor + screenTop - 0.5, floor + screenTop, 0.05, steel));

  const built = s.finish('#f2e6cf', 0.62);
  const ledMesh = new Mesh(
    led.geometry(),
    new MeshLambertMaterial({ vertexColors: true, side: DoubleSide, emissive: '#2f5cff', emissiveIntensity: 0 }),
  );
  ledMesh.castShadow = ledMesh.receiveShadow = true;
  built.group.add(ledMesh);
  return {
    ...built,
    setNight(night: number) {
      built.setNight(night);
      ledMesh.material.emissiveIntensity = night * 0.45;
    },
  };
}
