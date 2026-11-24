import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litHash, seedOf } from './skin-kit';

/**
 * JW Marriott Atlanta Downtown, 45 Ivan Allen Jr Boulevard (opened 2009 as the W Atlanta –
 * Downtown, reflagged 2026): a 25-storey blue-green glass slab running north–south, the hotel
 * below and condominiums above. The slab's top steps to a taller south block; balcony stacks
 * with glass rails project from the east face. A low podium of hotel public rooms and parking
 * runs west to Centennial Olympic Park Drive. Evidence, estimates and gaps:
 * docs/log/ui/jw-marriott-downtown/README.md.
 */
export const jwMarriottId = '30de017f-b8eb-4692-9674-b9db13a90288';
const slabId = 'overture:b3f079eb-af5f-34e4-84bc-e6029587a8b8';
const southBlockId = 'overture:e2fff5c3-e886-3479-8fa1-ba44b4ff6b72';

// Heights above the lidar ground ring (301.5 m NAVD88), April 2019: slab parapet 102, a roof deck
// about 98 inside it, the south block 106, east balcony stacks to 89 and the podium 18 to 22.
const groundNavd = 301.5;
const podiumRoofs: Record<string, number> = {
  'overture:071358c8-92fc-35f9-b03f-68745ee71c44': 22,
  'overture:1047d8c4-f632-3557-b5f8-6b2831a214a9': 22,
  'overture:58b20517-3558-36f2-9dec-bdf0fab0bc42': 18,
  'overture:e569c9b1-2752-3d7d-8d5f-34490158cf2a': 24,
  'overture:f2b968f6-518c-32ff-b9e8-67f4f4e1dd4f': 24,
};
const deckH = 98, parapetH = 102, southH = 106, balconyTop = 89, podiumBase = 22, pitch = 3.3;

// Flat vertex colours: a painted library surface compiles its own shader program.
// Glass base #a0b1b6: S 0.12, V 0.71 (sunlit rendered check in the PR). Low saturation because
// both long faces sit in shade most of the day, where the grade pushes glass toward navy.
const glass = '#a0b1b6', glassLit = '#a2b3b8', band = '#c9d1d2', rail = '#a9bec3';
const podiumWall = '#b9bcb8', podiumGlass = '#5e7177', roof = '#9a9d9a';

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

export function createJwMarriott(buildings: VBuilding[], grid: GroundGrid) {
  const origin: P2 = [220, -1242];
  const s = landmarkShell(buildings, grid, jwMarriottId, 'JW Marriott Atlanta Downtown', origin, [1, 0], [[0, 0], [0, 25], [0, -25]]);
  if (!s) return null;
  const site = buildings.find(b => b.id === jwMarriottId)!;
  const y = (h: number) => groundNavd + h;
  const seed = seedOf(jwMarriottId);
  const local = (ring: [number, number][]): P2[] => ccw(ring.map(([x, z]): P2 => [x - origin[0], z - origin[1]]));

  let slab: P2[] | null = null, south: P2[] | null = null;
  for (const part of site.parts ?? []) {
    if (!part.rings.length) continue;
    const plan = local(part.rings[0]);
    if (part.id === slabId) {
      // The 1.7 m east bumps are balcony stacks, drawn separately; the slab is the wall behind them.
      slab = plan.filter(([x]) => x < 232.5 - origin[0]);
      continue;
    }
    if (part.id === southBlockId) { south = plan; continue; }
    // Podium parts at their lidar roofs: 22 m over the hotel's public rooms east of the drive,
    // 18 m on the west wing, 24 m on the two small stair heads.
    const top = y(podiumRoofs[part.id] ?? Math.min(part.h, podiumBase));
    s.prism(plan, s.base, top, podiumWall, roof);
    plan.forEach((a, i) => {
      const b = plan[(i + 1) % plan.length];
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) <= 6) return;
      // Glass follows the grade under each wall: the site falls about 5 m to the south-west.
      const street = Math.max(s.base + 0.35, ...[a, b].map(([x, z]) => grid.sample(x + origin[0], z + origin[1]) ?? -Infinity));
      panel(s.body, a, b, 0.02, 0.98, street + 0.3, Math.min(top - 1.5, street + 5), 0.05, podiumGlass);
      // Upper podium floors: a ribbon window per floor.
      for (let h = street + 7; h + 1.6 < top - 1; h += 3.6) panel(s.body, a, b, 0.03, 0.97, h, h + 1.6, 0.05, podiumGlass);
    });
  }
  if (!slab) return null;

  // The slab: glass to the roof deck, a glass parapet around it, the taller south block.
  s.prism(slab, s.base, y(deckH), glass, roof);
  slab.forEach((a, i) => panel(s.body, a, slab![(i + 1) % slab!.length], 0, 1, y(deckH), y(parapetH), 0, glass));
  if (south) s.prism(south, y(deckH), y(southH), glass, roof);

  // Floor bands and lit rooms. Hotel and condominium windows are noticeably lit at 23:30.
  // Rooms stop at the roof deck; the glass above it is parapet.
  const floors = Math.floor((deckH - podiumBase) / pitch);
  slab.forEach((a, edge) => {
    const b = slab![(edge + 1) % slab!.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length < 4) return;
    // Street level: dark lobby and storefront glass under a canopy line, then floor bands to the
    // podium roof and on up the shaft.
    panel(s.body, a, b, 0, 1, s.base + 0.3, y(6), 0.06, podiumGlass);
    panel(s.body, a, b, 0, 1, y(6), y(6.5), 0.08, band);
    for (let h = 6.5 + pitch; h < podiumBase; h += pitch) panel(s.body, a, b, 0, 1, y(h) - 0.35, y(h), 0.05, band);
    for (let f = 1; f <= floors; f++) panel(s.body, a, b, 0, 1, y(podiumBase + f * pitch) - 0.35, y(podiumBase + f * pitch), 0.05, band);
    const bays = Math.max(1, Math.round(length / 6.8));
    for (let f = 0; f < floors; f++) {
      const lo = y(podiumBase + f * pitch);
      for (let i = 0; i < bays; i++) {
        if (litHash(seed, edge, f, i) >= 0.3) continue;
        panel(s.lights, a, b, (i + 0.06) / bays, (i + 0.94) / bays, lo + 0.1, lo + pitch - 0.45, 0.04, glassLit);
      }
    }
  });

  // East balcony stacks: a slab and glass rail at each floor, from the podium to 89 m.
  for (const [z0, z1] of [[-1228.2, -1224.1], [-1236.6, -1232.7], [-1253.6, -1249.7], [-1262.3, -1258.3]]) {
    const a: P2 = [231.6 - origin[0], z0 - origin[1]], b: P2 = [231.6 - origin[0], z1 - origin[1]];
    // Each floor reads at City range as its slab edge over a glass rail, 1.7 m off the wall.
    for (let h = podiumBase + pitch; h <= balconyTop; h += pitch) {
      panel(s.body, [a[0] + 1.7, b[1]], [a[0] + 1.7, a[1]], 0, 1, y(h) - 0.25, y(h), 0, band);
      panel(s.body, [a[0] + 1.7, b[1]], [a[0] + 1.7, a[1]], 0, 1, y(h), y(h) + 1.05, 0, rail);
    }
    // The stack's two side walls, one quad each, so it reads as a box from an angle.
    for (const z of [a[1], b[1]]) {
      s.body.quad([a[0], y(podiumBase), z], [a[0], y(balconyTop), z], [a[0] + 1.7, y(balconyTop), z], [a[0] + 1.7, y(podiumBase), z], rail);
    }
  }

  return s.finish('#f2e2c4', 0.62);
}
