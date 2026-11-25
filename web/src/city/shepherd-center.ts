import { surfaces } from '../materials';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { localLandmarkShell } from './landmark-shell';

export const shepherdMainId = 'osm:way:269196399';
const marcusId = 'osm:way:1423358852';
const garageId = 'osm:way:269196183';
export const shepherdCenterIds = new Set([shepherdMainId, marcusId]);

const brick = surfaces.brick({ colour: 'brown' });
const stone = surfaces.precast({ width: 3.6, height: 2.1 });
const curtain = surfaces.curtainGlass({ tint: 'blue', mullion: 1.55, floor: 3.7 });
const bridgeGlass = surfaces.curtainGlass({ tint: 'blueGreen', mullion: 1.8, floor: 3.1 });
const ribbon = ['#384752', '#42545c', '#4d5d62'];
const glass = ['#688598', '#6e8f9f', '#7b929d'];

// The contractor's north aerial shows a separate seven-level deck behind the tower.
export function shepherdCampusMassing(buildings: VBuilding[]) {
  if (!buildings.some(b => b.id === marcusId)) return buildings;
  return buildings.map(b => b.id === garageId ? { ...b, cls: 'parking', h: b.h ?? 22.5 } : b);
}

function ccw(ring: P2[]) {
  const area = ring.reduce((sum, [x, z], i) => {
    const [u, v] = ring[(i + 1) % ring.length];
    return sum + x * v - z * u;
  }, 0);
  return area < 0 ? ring.slice().reverse() : ring;
}

export function createShepherdCenter(
  buildings: VBuilding[], site: VBuilding, foundation: number | null,
  groundAt: (x: number, z: number) => number | null, mainPresent: boolean,
) {
  const isMarcus = site.id === marcusId;
  // Use the visible entrance grades for the roof datum and close the shell down to terrain.
  const entry: P2 = isMarcus ? [-145, -6272] : [-149, -6246];
  const datum = groundAt(...entry);
  if (datum === null || foundation === null || site.rings.length !== 1) return null;
  const name = isMarcus ? 'Shepherd Marcus Center for Advanced Rehabilitation' : 'Shepherd Center main hospital';
  const shell = localLandmarkShell(buildings, site, name, [0, 0], [1, 0], [], foundation - datum, datum);
  if (!shell) return null;
  const { base, body, facade, paint, prism } = shell;
  const ring = ccw(shell.ring);

  if (isMarcus) {
    // The north return and court corner are glass. On Peachtree the pale grid spans
    // pairs of floors, with four long vertical bays either side of a narrower seam.
    const roof = 43.5;
    const recess = ring.map(([x, z]): P2 => x > -135 ? [x - 2.25, z] : [x, z]);
    prism(recess, base, 4.7, '#56696b', '#888b86', { wall: curtain });
    prism(ring, 4.7, roof, '#c0bdb1', '#777b7c', { wall: stone });

    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
      const roadFace = length > 70 && dz > 0;
      const courtFace = Math.min(a[1], b[1]) > -6280;
      const northGlass = Math.max(a[1], b[1]) < -6338 && length > 12;
      const windows = (from: P2, to: P2) => {
        facade(from, to, 5.1, 42.8, northGlass ? 10 : 5, roadFace ? 9.4 : 6.7,
          northGlass ? 0.957 : 0.905, northGlass ? 0.91 : 0.86, glass, 0.19, curtain,
          { width: 0.27, height: northGlass ? 0.63 : 0.33 });
      };
      if (roadFace) {
        const point = (t: number): P2 => [a[0] + dx * t, a[1] + dz * t];
        windows(a, point(0.49));
        windows(point(0.52), b);
        facade(a, b, 0.15, 4.85, 1, 6.1, 0.16, 1, ['#bab7a9'], 0);
        facade(recess[i], recess[(i + 1) % recess.length], 1.15, 3.95, 1, 5.7,
          0.42, 0.75, ['#56696b'], 0.48, curtain);
      } else if (length > 8) windows(a, b);
      if (courtFace) {
        // Illustrative after-hours light at the drop-off lobby.
        facade(recess[i], recess[(i + 1) % recess.length], 0.5, 4.45, 1, 3.8, 0.81, 0.72, ['#677f81'], 0.64);
      }
    }
    prism([[-137, -6342], [-122, -6338], [-141, -6286], [-151, -6290]],
      roof, roof + 3.6, '#a4a79f', '#a9aba4', { wall: stone });

    if (mainPresent) {
      // Glazed bridge crosses the drop-off in the contractor's aerial and daylight
      // court photograph. The western turn and level are inferred from that view.
      const underside = 9.25;
      const link = ccw([[-155, -6277], [-194.7, -6284.1], [-209, -6276.6], [-211, -6279.9],
        [-195.4, -6288.2], [-155, -6281]]);
      prism(link, underside, underside + 3.85, '#b5b8b1', '#bfc1b9', { wall: stone });
      for (let i = 0; i < link.length; i++) {
        facade(link[i], link[(i + 1) % link.length], underside + 0.68, underside + 3.35,
          1, 1.7, 0.93, 0.98, ['#71918e', '#799894'], 0.73, bridgeGlass);
      }
      paint(stone, () => {
        body.quad([-155, underside, -6277], [-155, underside, -6281],
          [-195.4, underside, -6288.2], [-194.7, underside, -6284.1], '#a4a49e');
        body.quad([-194.7, underside, -6284.1], [-195.4, underside, -6288.2],
          [-211, underside, -6279.9], [-209, underside, -6276.6], '#a4a49e');
      });
    }
  } else {
    const roof = 26.8;
    prism(ring, base, roof, '#c1b7a8', '#9e9b92', { wall: stone });
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      const len = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (len < 4) continue;
      facade(a, b, 2.1, roof - 0.65, 7, 3.3, 0.95, 0.46, ribbon, 0.11);
    }
    // Old inpatient wings step back at the top while the narrow dark brick piers
    // at the street and north court continue to the parapet.
    const upper: P2[] = [[-278, -6269], [-256, -6284], [-240, -6262], [-261, -6249]];
    const mid: P2[] = [[-245, -6270], [-220, -6287], [-209, -6267], [-228, -6253]];
    for (const wing of [ccw(upper), ccw(mid)]) {
      prism(wing, roof, 30.4, '#b4aea1', '#9b9990', { wall: stone });
      for (let i = 0; i < wing.length; i++) {
        facade(wing[i], wing[(i + 1) % wing.length], roof + 0.3, 29.9, 1, 3.3, 0.92, 0.53, ribbon, 0.06);
      }
    }
    prism([[-189.1, -6249.7], [-184.1, -6242.2], [-173.7, -6249.1], [-178.5, -6256.0]],
      base, 32.5, '#95765e', '#a0998a', { wall: brick });
    prism([[-218, -6277], [-213.2, -6280.5], [-207.7, -6273], [-212.5, -6269.5]],
      base, 31.8, '#95765e', '#a0998a', { wall: brick });
    const canopy = ccw([[-157.0, -6250.3], [-150.9, -6240.8], [-146.5, -6243.5], [-152.7, -6253.0]]);
    prism(canopy, 3.7, 4.45, '#cbc4af', '#a7a292', { wall: stone });
    // A narrow fixture recessed into the fascia of the existing canopy.
    facade([-152.7, -6253.0], [-146.5, -6243.5],
      3.71, 3.94, 1, 12, 0.74, 1, ['#b4ae98'], 1);
  }
  return shell.finish('#ebc99d', 0.49);
}
