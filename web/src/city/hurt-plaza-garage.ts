import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litHash, seedOf } from './skin-kit';

/**
 * Hurt Plaza Garage, 33 Hurt Plaza SE: an open concrete parking deck beside the Hurt Building.
 * Street View (March 2025) shows about seven stacked decks, each a continuous pale concrete
 * spandrel over a dark open slot, above a ground floor of shopfronts with a red awning beside the
 * ramp entrance (the sign text is left out). The lidar puts the top deck at 21.9 m, not the mapped
 * 30.6 m, with a stair and elevator core to about 28 m at the east tip. A plain, honest garage.
 * Evidence: docs/log/ui/hurt-plaza-garage/README.md.
 */
export const hurtPlazaGarageId = '8de7071d-aa01-4995-9acb-9387696c58ec';

// Lidar, 22 April 2019: ground ring 316.1 m NAVD88, top deck median 21.9 m, the core to about 28.
const groundNavd = 316.1, deckH = 21.9, coreH = 28.3, levels = 7;
// The core, in world metres, inside the footprint's east tip (the lidar's 28 m cluster).
const core: P2[] = [[381, -14], [391, -14], [391, -4], [381, -4]];

// Flat vertex colours: a painted library surface is a hooked material the batcher never merges.
const slot = '#2c3033', spandrel = '#cfcbc2', deck = '#8f8f8a', coreWall = '#bdb8ad';
// Fixtures take the slot's colour by day; at night they glow with the lamp light.
const shopfront = '#34414a', awning = '#9b2f28', fixture = '#33383b';

type Shell = NonNullable<ReturnType<typeof landmarkShell>>;

function ccw(ring: P2[]): P2[] {
  let area = 0;
  ring.forEach(([x, z], i) => { const [a, b] = ring[(i + 1) % ring.length]; area += x * b - a * z; });
  return area > 0 ? ring : [...ring].reverse();
}

function panel(b: Shell['body'], a: P2, c: P2, t0: number, t1: number, lo: number, hi: number, out: number, color: string) {
  if (hi - lo < 0.05 || t1 <= t0) return;
  const dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz);
  const p = (t: number, y: number) => [a[0] + t * dx + out * dz / l, y, a[1] + t * dz - out * dx / l];
  b.quad(p(t0, lo), p(t0, hi), p(t1, hi), p(t1, lo), color);
}

export function createHurtPlazaGarage(buildings: VBuilding[], grid: GroundGrid) {
  const origin: P2 = [351, -16];
  const s = landmarkShell(buildings, grid, hurtPlazaGarageId, 'Hurt Plaza Garage', origin, [1, 0], [[0, 0]]);
  if (!s) return null;
  const top = groundNavd + deckH, seed = seedOf(hurtPlazaGarageId);
  const ring = ccw(s.ring);
  // The wall is the dark open slot; spandrels and the shopfront stand off it.
  s.prism(ring, s.base, top, slot, deck);
  s.prism(ccw(core.map(([x, z]): P2 => [x - origin[0], z - origin[1]])), top - 0.5, groundNavd + coreH, coreWall, deck);

  // The face whose outward normal points most to the north carries the awning (Hurt Plaza).
  let plaza = -1, most = 0;
  ring.forEach((a, i) => {
    const b = ring[(i + 1) % ring.length], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
    if (l > 20 && -dx / l < most) { most = -dx / l; plaza = i; }
  });

  ring.forEach((a, edge) => {
    const b = ring[(edge + 1) % ring.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length < 3) return;
    const street = Math.max(s.base + 0.35, ...[a, b].map(([x, z]) => grid.sample(x + origin[0], z + origin[1]) ?? s.base));
    const ground = street + 4.2, pitch = (top - ground) / (levels - 1);
    // Ground floor: shopfront glass behind a concrete band, the awning on the plaza face.
    if (length > 12) panel(s.body, a, b, 0.04, 0.96, street + 0.2, ground - 0.9, 0.05, shopfront);
    panel(s.body, a, b, 0, 1, ground - 0.9, ground, 0.09, spandrel);
    if (edge === plaza) {
      // A sloped awning, hung from the wall above the shopfronts.
      const dx = b[0] - a[0], dz = b[1] - a[1];
      const p = (t: number, y: number, out: number) => [a[0] + t * dx + out * dz / length, y, a[1] + t * dz - out * dx / length];
      s.body.quad(p(0.1, ground - 1.0, 0.1), p(0.1, ground - 1.7, 1.4), p(0.42, ground - 1.7, 1.4), p(0.42, ground - 1.0, 0.1), awning);
    }
    // Each deck: a continuous pale spandrel, about 1.1 m deep, with its edge on the deck line.
    for (let k = 1; k < levels - 1; k++) {
      const yy = ground + k * pitch;
      panel(s.body, a, b, 0, 1, yy - 1.1, yy, 0.09, spandrel);
      // Night: the ceiling fixtures read as a thin glowing line under each spandrel, broken up
      // by bay, so the deck is lit without turning into a lightbox.
      const bays = Math.max(1, Math.round(length / 8));
      for (let i = 0; i < bays; i++) {
        if (litHash(seed, edge, k, i) >= 0.7) continue;
        panel(s.lights, a, b, (i + 0.1) / bays, (i + 0.9) / bays, yy - 1.45, yy - 1.15, 0.05, fixture);
      }
    }
    // The open top deck's parapet.
    panel(s.body, a, b, 0, 1, top - 1.1, top, 0.09, spandrel);
  });

  return s.finish('#e8efe9', 0.5);
}
