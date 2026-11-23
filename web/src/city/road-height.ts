import type { P2 } from '../vignette/geom';
import type { VRoad } from '../vignette/world';
import type { TerrainCity, TransportRun } from '../terrain/transport-data';

function nearest(p: P2, pts: P2[]) {
  let best = Infinity, x = 0, z = 0, ux = 0, uz = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax,az] = pts[i-1], dx = pts[i][0]-ax, dz = pts[i][1]-az;
    const length = Math.hypot(dx,dz);
    if (!length) continue;
    const t = Math.max(0,Math.min(1,((p[0]-ax)*dx+(p[1]-az)*dz)/(length*length)));
    const px = ax+t*dx, pz = az+t*dz, distance = Math.hypot(p[0]-px,p[1]-pz);
    if (distance < best) { best = distance; x = px; z = pz; ux = dx/length; uz = dz/length; }
  }
  return { distance: best, x, z, ux, uz };
}

/** Resolve only the visible intervals of the car's own road, including mixed
 * ground/tunnel ways. Bridge heights are supplied by the renderer that drew the
 * deck. An overhead cross street or adjacent ramp cannot elevate the car.
 */
export function cityRoadHeight(city: TerrainCity, groundAt: (x: number, z: number, road?: VRoad) => number | null,
  deckAt?: (x: number, z: number, part: TransportRun) => number | null) {
  const parts = city.terrainTransport?.roads ?? [];
  const cache = new WeakMap<VRoad, TransportRun[]>();
  return (x: number, z: number, road: VRoad) => {
    const ground = !road.bridge && !road.tunnel;
    // The directed OSM lane owner can be tagged ground even where the Sweet
    // Auburn lidar measured a deck. Test its scoped intervals there too.
    if (ground && road.cls !== 'motorway') return groundAt(x,z,road);
    let candidates = cache.get(road);
    if (!candidates) {
      candidates = parts.filter(part => part.cls === road.cls && (part.sub ?? null) === (road.sub ?? null) &&
        part.pts.some(p => nearest(p,road.pts).distance < .08));
      cache.set(road,candidates);
    }
    if (!candidates.length) return ground ? groundAt(x,z,road) : null;
    const onRoad = nearest([x,z],road.pts);
    for (const part of candidates) {
      const near = nearest([onRoad.x,onRoad.z],part.pts);
      if (near.distance > .08 || near.ux*onRoad.ux + near.uz*onRoad.uz < .98) continue;
      return part.kind === 'ground' ? groundAt(x,z,road) : deckAt?.(x,z,part) ?? null;
    }
    return ground ? groundAt(x,z,road) : null;
  };
}
