import { hashStr, Line, rng, type P2 } from '../vignette/geom';
import campus from './fixtures/arts-campus.json';
import { figureLooks } from './figure-looks';
import { travellerAt, type Traveller } from './walkways';

type Ground = (x: number, z: number) => number | null;
const clock = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  weekday: 'short',
  hour: '2-digit',
  hourCycle: 'h23',
});
export function museumCrowd(ms: number) {
  const parts = clock.formatToParts(ms);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value);
  if (hour < 8 || hour >= 21) return 0;
  if (parts.find((p) => p.type === 'weekday')?.value === 'Mon') return 1;
  if (hour >= 12 && hour < 14) return 8;
  if (hour >= 10 && hour < 17) return 5;
  return hour < 19 ? 2 : 1;
}

const angle = Math.atan2(-0.479, 0.878);
const c = Math.cos(angle),
  s = Math.sin(angle);
function world(u: number, v: number): P2 {
  return [550 + c * u - s * v, -3990 + s * u + c * v];
}
const ramp = campus.museum.ramp;
// Lawn coordinates follow the archived footway from the Peachtree steps.
const paths = [
  new Line([world(-42, 19), world(-29, 24), world(-13, 24), world(12, 24)]),
  new Line([ramp.foot, ramp.head] as P2[]),
  new Line([
    [619.61, -3987.83],
    [611.21, -3983.1],
    [593.19, -3972.93],
    [584.07, -3970.85],
  ]),
  new Line([world(-23, 5), world(-23, 17), world(-19, 23)]),
];
export const highVisitorTier = 'illustrative' as const;
export const highWalkers = Array.from({ length: 8 }, (_, i) => {
  const path = i % paths.length,
    line = paths[path];
  const random = rng(hashStr(`high-piazza-walker-${i}`));
  const person: Traveller = {
    way: { line, from: 1, to: line.length - 1, trail: false },
    rider: false,
    phase: random() * 2 * line.length,
    speed: 1.04 + random() * 0.36,
    size: 0.94 + random() * 0.12,
    look: Math.floor(random() * figureLooks.length),
  };
  return { person, path, tier: highVisitorTier };
});

export const highSeats = [1, 4, 0, 3, 5, 2].map((tableIndex, i) => {
  const [u, v] = campus.museum.piazza.tables[tableIndex];
  const theta = ((i % 3) * 2 * Math.PI) / 3;
  const [x, z] = world(u + 0.72 * Math.cos(theta), v + 0.72 * Math.sin(theta));
  const table = world(u, v);
  return {
    x,
    z,
    table,
    angle: Math.atan2(table[0] - x, table[1] - z),
    look: (i * 5 + 2) % figureLooks.length,
    tier: highVisitorTier,
  };
});

export function highWalkerPose(walker: (typeof highWalkers)[number], seconds: number, ground: Ground) {
  const p = travellerAt(walker.person, seconds);
  if (walker.path !== 1) {
    const floor = ground(p.x, p.z);
    return floor === null ? null : { ...p, y: floor + (walker.path === 2 ? 0.04 : 0.16) };
  }
  const [fx, fz] = ramp.foot,
    [hx, hz] = ramp.head;
  const foot = ground(fx, fz),
    grade = ground(campus.museum.entrance[0], campus.museum.entrance[1]);
  if (foot === null || grade === null) return null;
  const dx = hx - fx,
    dz = hz - fz,
    t = ((p.x - fx) * dx + (p.z - fz) * dz) / (dx * dx + dz * dz);
  return { ...p, y: (foot + 0.1) * (1 - t) + (grade + 2.3) * t + 0.02 };
}
