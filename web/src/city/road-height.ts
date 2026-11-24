import type { P2 } from '../vignette/geom';
import type { VRoad } from '../vignette/world';
import { roadWidth, type TerrainCity, type TransportRun } from '../terrain/transport-data';

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

function sharesAxis(axis: P2[], road: P2[]) {
  if (axis === road) return true;
  // Clipping at a row edge or an internal ramp junction can shorten either
  // polyline. A shared directed segment distinguishes two arms of a fork.
  function overlaps(a: P2[], b: P2[]) {
    return a.some((p, i) => {
      if (!i) return false;
      const q = a[i-1], dx = p[0]-q[0], dz = p[1]-q[1];
      const near = nearest([(p[0]+q[0])/2, (p[1]+q[1])/2], b);
      return near.distance < .03 && near.ux * dx + near.uz * dz > .998 * Math.hypot(dx, dz);
    });
  }
  return overlaps(axis, road) || overlaps(road, axis);
}

/** Resolve only the visible intervals of the car's own road, including mixed
 * ground/tunnel ways. Bridge heights are supplied by the renderer that drew the
 * deck. An overhead cross street or adjacent ramp cannot elevate the car.
 */
export function cityRoadHeight(city: TerrainCity, groundAt: (x: number, z: number, road?: VRoad) => number | null,
  deckAt?: (x: number, z: number, part: TransportRun) => number | null) {
  const parts = city.terrainTransport?.roads ?? [];
  const approachClasses = new Set(parts.filter(part => part.deckWeight).map(part => part.cls));
  const cache = new WeakMap<VRoad, TransportRun[]>();
  // A mitred joint can put the last lane sample on the next deck's triangles.
  // Only a deck meeting this source endpoint at the same height can supply that sample.
  const ends = new Map<string, TransportRun[]>();
  for (const part of parts) {
    if (part.kind !== 'bridge' || part.pts.length < 2) continue;
    for (const end of [part.pts[0], part.pts[part.pts.length - 1]]) {
      const key = end.join(',');
      const list = ends.get(key);
      if (list) list.push(part);
      else ends.set(key, [part]);
    }
  }
  function joinedDeck(x: number, z: number, road: VRoad) {
    if (!road.bridge || !deckAt || road.pts.length < 2) return null;
    for (const end of [road.pts[0], road.pts[road.pts.length - 1]]) {
      if (Math.hypot(x - end[0], z - end[1]) > roadWidth(road) / 2) continue;
      const joined = ends.get(end.join(','));
      if (!joined) continue;
      const own = cache.get(road)?.find(part => part.pts === road.pts || sharesAxis(part.pts, road.pts));
      if (!own) continue;
      const level = deckAt(...end, own);
      if (level === null) continue;
      for (const other of joined) {
        if (other === own) continue;
        const otherLevel = deckAt(...end, other);
        if (otherLevel === null || Math.abs(level - otherLevel) > .3) continue;
        const tread = deckAt(x, z, other);
        if (tread !== null) return tread;
      }
    }
    return null;
  }
  return (x: number, z: number, road: VRoad) => {
    const ground = !road.bridge && !road.tunnel;
    // The directed OSM lane owner can be tagged ground even where the Sweet
    // Auburn lidar measured a deck. Test its scoped intervals there too.
    if (ground && road.cls !== 'motorway' && !approachClasses.has(road.cls)) return groundAt(x,z,road);
    let candidates = cache.get(road);
    if (!candidates) {
      candidates = parts.filter(part => part.cls === road.cls && (part.sub ?? null) === (road.sub ?? null) &&
        (part.sourceAxis ? sharesAxis(part.sourceAxis,road.pts) : part.pts.some(p => nearest(p,road.pts).distance < .08)));
      // A mapped sidewalk can share both its endpoint and heading with a
      // neighboring deck. Its original geometry owns the shared point.
      candidates.sort((a,b) => Number(b.pts === road.pts || b.sourceAxis === road.pts) -
        Number(a.pts === road.pts || a.sourceAxis === road.pts));
      cache.set(road,candidates);
    }
    if (!candidates.length) return ground ? groundAt(x,z,road) : null;
    const onRoad = nearest([x,z],road.pts);
    for (const part of candidates) {
      if (part.sourceAxis) {
        const tread = deckAt?.(x,z,part);
        if (tread != null) return tread;
        continue;
      }
      const near = nearest([onRoad.x,onRoad.z],part.pts);
      if (near.distance > .08 || near.ux*onRoad.ux + near.uz*onRoad.uz < .98) continue;
      return part.kind === 'ground' ? groundAt(x,z,road) : deckAt?.(x,z,part) ?? joinedDeck(x,z,road);
    }
    return ground ? groundAt(x,z,road) : joinedDeck(x,z,road);
  };
}
