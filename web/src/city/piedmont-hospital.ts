import { surfaces } from '../materials';
import type { GroundYield } from '../terrain/surface';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { localLandmarkShell } from './landmark-shell';

export const piedmontHospitalId = 'osm:way:887724919';
const towerId = 'osm:way:887724918';

// The Peachtree wall curves around the plaza. This mapped facet faces the approach
// at the north end of the plaza, near the canopy visible in HKS's lobby photograph.
const entranceEnds: [P2, P2] = [[-199.25, -6051.37], [-214.13, -6031.71]];
const origin: P2 = [-206.69, -6041.54];
const towerGlass = surfaces.curtainGlass({ tint: 'blue', mullion: 1.6, floor: 3.6 });
const lobbyGlass = surfaces.curtainGlass({ tint: 'blueGreen', mullion: 2.2, floor: 4.1 });
const clayPanels = surfaces.precast({ width: 1.8, height: 1.2 });
const concrete = surfaces.precast({ width: 3.4, height: 3.6 });
const paving = surfaces.granite({ course: 1.2, strength: 0.55 });

export function createPiedmontHospital(
  buildings: VBuilding[], site: VBuilding, foundation: number | null,
  groundAt: (x: number, z: number) => number | null,
) {
  const tower = site.parts?.find(part => part.id === towerId);
  const podium = site.parts?.find(part => part.id === 'podium');
  const grade = groundAt(...origin);
  if (foundation === null || grade === null || tower?.rings.length !== 1 || podium?.rings.length !== 1) return null;

  const local = ([x, z]: P2): P2 => [x - origin[0], z - origin[1]];
  const shell = localLandmarkShell(buildings, site, 'Piedmont Atlanta Hospital', origin, [1, 0], [], foundation - grade, grade);
  if (!shell) return null;
  const { base, paint, prism, facade, body, lights } = shell;
  const roof = tower.h;
  if (roof <= 42 || podium.h <= 0) return null;
  prism(podium.rings[0].map(local), base, podium.h, '#ad8370', '#aaa8a0', { wall: concrete });

  const ring = tower.rings[0].map(local);
  const signed = ring.reduce((sum, [x, z], i) => {
    const [u, v] = ring[(i + 1) % ring.length];
    return sum + x * v - z * u;
  }, 0);
  if (signed < 0) ring.reverse();
  // On Collier the west box stops below the glass prow. Register the split to
  // the short south wall and its turn back into the west wall.
  const at = ([x, z]: P2) => ring.findIndex(([u, v]) => Math.hypot(u + origin[0] - x, v + origin[1] - z) < 0.12);
  const clayCorner = at([-269.67, -5920.03]), prow = at([-248.02, -5920.19]);
  const clayReturn = at([-269.97, -5928.62]);
  if (prow < 0 || clayCorner < 0 || clayReturn < 0) return null;
  const mix = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const split = mix(ring[prow], ring[clayCorner], 9.4 / 21.65);
  const lobbyRing = ring.map((p, i): P2 => {
    if (i === prow) return [p[0] - 2.2, p[1] - 2.8];
    if (i === clayCorner) return [p[0] + 0.5, p[1] - 1.5];
    const x = p[0] + origin[0], z = p[1] + origin[1];
    return x > -250 && z >= -6020 && z <= -5945 ? [p[0] - 1.05, p[1]] : p;
  });
  const clayTop = roof - 5.2;
  const afterClay = (clayReturn + 1) % ring.length;
  const stepReturn = mix(ring[clayReturn], ring[afterClay], 0.10);
  const roofRing = ring.map((p, i) => i === clayCorner ? split : i === clayReturn ? stepReturn : p);
  const face = (a: P2, b: P2) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    const point = (u: number, y: number, depth: number) =>
      [a[0] + dx * u + dz / length * depth, y, a[1] + dz * u - dx / length * depth];
    const strip = (lo: number, hi: number, depth: number, colour: string, batch = body, start = 0, end = 1) =>
      batch.quad(point(start, lo, depth), point(start, hi, depth), point(end, hi, depth), point(end, lo, depth), colour);
    return { outwardEast: dz / length, strip };
  };
  const glass = (a: P2, b: P2, top: number) => {
    const { strip } = face(a, b);
    paint(towerGlass, () => {
      strip(9.2, 35.1, 0.045, '#618198');
      strip(36.6, top - 0.55, 0.045, '#7090a3');
    });
    strip(35.1, 36.6, 0.16, '#aa8b72');
    // Dusk evidence supports the accent and general occupancy pattern.
    strip(35.34, 35.61, 0.18, '#c9a57d', lights);
    facade(a, b, 11, 34.4, 6, 3.25, 0.72, 0.42, ['#819ba3', '#7193a2'], 0.25);
    facade(a, b, 37, top - 1, 5, 3.25, 0.72, 0.42, ['#7796a8', '#7291a2'], 0.035);
    strip(top - 0.55, top, 0.13, '#a2afb1');
  };

  prism(lobbyRing, base, 8.1, '#655c53', '#6f685d');
  prism(ring, 8.1, clayTop, '#88726a', '#96948b');
  prism(roofRing, clayTop, roof, '#88726a', '#a6aaa9');
  paint(clayPanels, () => face(stepReturn, ring[afterClay]).strip(clayTop, roof - 0.02, 0.045, '#aa7564'));
  // The overhang carries the timber soffit across the Collier prow and around
  // the first Peachtree bay, above a continuous recessed glazed ground floor.
  for (const [i, a] of ring.entries()) {
    const j = (i + 1) % ring.length, b = ring[j];
    const { outwardEast, strip } = face(a, b);
    if (i === prow && j === clayCorner) {
      glass(a, split, roof);
      const returnFace = face(split, b);
      paint(clayPanels, () => returnFace.strip(9.2, clayTop, 0.045, '#a57565'));
      for (let y = 13; y < clayTop - 2; y += 5.2)
        returnFace.strip(y, y + 1.23, 0.18, '#766d66', body, 0.19, 0.89);
      returnFace.strip(31.6, 32.25, 0.18, '#716963');
    } else if (outwardEast > 0.55) {
      glass(a, b, roof);
    } else {
      const top = i === clayCorner || i === clayReturn ? clayTop : roof;
      paint(clayPanels, () => strip(9.2, top - 0.02, 0.045, '#aa7564'));
      facade(a, b, 9.5, top - 2, 12, 7, 0.62, 0.3, ['#616d77', '#737b82'], 0);
    }
    if (outwardEast > 0.55 || (i === prow && j === clayCorner)) {
      const la = lobbyRing[i], lb = lobbyRing[j];
      if (a !== la || b !== lb) {
        body.quad([a[0], 8.09, a[1]], [b[0], 8.09, b[1]],
          [lb[0], 8.09, lb[1]], [la[0], 8.09, la[1]], '#a16c45');
        strip(8.1, 8.26, 0.14, '#b8b8ab');
      }
      const lobby = face(la, lb);
      paint(lobbyGlass, () => lobby.strip(base, 7.9, 0.055, '#527877'));
      lobby.strip(5.75, 6.08, 0.07, '#74837d');
      strip(8.21, 9.2, 0.10, '#677073');
    }
  }

  const [a, b] = entranceEnds.map(local);
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const u: P2 = [(b[0] - a[0]) / length, (b[1] - a[1]) / length];
  const east: P2 = [u[1], -u[0]];
  const point = (along: number, depth: number): P2 =>
    [u[0] * along + east[0] * depth, u[1] * along + east[1] * depth];
  const rect = (left: number, right: number, back: number, front: number): P2[] =>
    [point(left, back), point(right, back), point(right, front), point(left, front)];
  const panel = (left: number, right: number, lo: number, hi: number, depth: number, colour: string, batch = body) => {
    const [ax, az] = point(left, depth), [bx, bz] = point(right, depth);
    batch.quad([ax, lo, az], [bx, lo, bz], [bx, hi, bz], [ax, hi, az], colour);
  };

  // The sidewalk is uphill from the footprint's bare-earth grade. Carry it through
  // the landing to the doors and let the ground yield where the apron crosses a crest.
  const [approachX, approachZ] = point(0, 7.5);
  const approach = groundAt(origin[0] + approachX, origin[1] + approachZ);
  const landingY = (approach ?? grade) - grade + 0.07;
  const landing = rect(-9, 9, -0.3, 7.5);
  const yields: GroundYield[] = [{
    ring: landing.map(([x, z]) => [origin[0] + x, origin[1] + z]),
    floor: () => grade + landingY - 0.07,
  }];
  prism(landing, base, landingY, '#a0988c', '#bbb1a1', { wall: concrete, roof: paving });

  // A shallow lobby projection, grouped sliding doors and the wood soffit carried outdoors.
  prism(rect(-7, 7, -1, 1.35), base, landingY + 4.15, '#526970', '#657178', { wall: lobbyGlass });
  for (const centre of [-4.2, 0, 4.2]) {
    panel(centre - 1.45, centre + 1.45, landingY + 0.05, landingY + 2.75, 1.44, '#364d54');
    panel(centre - 0.09, centre + 0.09, landingY + 0.05, landingY + 2.75, 1.48, '#b0b7b2');
    panel(centre - 1.45, centre + 1.45, landingY + 2.84, landingY + 3.76, 1.44, '#8e8874', lights);
  }
  prism(rect(-10, 10, -1, 6), landingY + 4.2, landingY + 4.78, '#945f40', '#777b79');
  prism(rect(-10, 10, -1, 6), landingY + 4.78, landingY + 5.05, '#b9bcb4', '#8c9696');
  for (const offset of [-8.3, 8.3]) {
    prism(rect(offset - 0.19, offset + 0.19, 4.75, 5.13), landingY, landingY + 4.3, '#777e79', '#a0a7a0');
  }

  const result = shell.finish('#e6cda0', 0.54);
  return { ...result, yields, buildings: result.buildings.filter(building => building.id !== towerId) };
}
