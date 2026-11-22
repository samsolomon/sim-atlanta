import { Group, Mesh, MeshLambertMaterial, DoubleSide, ShapeUtils, Vector2 } from 'three';
import { Builder, hashStr, pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';

const id = '200f8a75-44d8-4a11-8ff8-6af148cc6b17';
const stone = '#e5e0d4',
  molding = '#eee7d9',
  recess = '#b6b1a5',
  glass = '#687b80';
const belt = 8.9,
  cornice = 35.8,
  roof = 44.0;

const terrace: P2[] = [
  [257.7, -233.0],
  [235, -215.2],
  [244.7, -205.7],
  [255.0, -226.6],
];

// The two-storey base, seven-storey shaft and two-storey cap share the original
// ring. The two long faces gain five canted oriels apiece above the colonnades.
export function createFlatiron(buildings: VBuilding[], groundAt: (x: number, z: number) => number | null) {
  const building = buildings.find((b) => b.id === id);
  if (!building || building.rings.length !== 1) return null;
  const ring = building.rings[0];
  const vectors = ring.map(([x, z]) => new Vector2(x, z));
  const area = ShapeUtils.area(vectors);
  if (!area || !terrace.every(([x, z]) => pointInRing(x, z, ring))) return null;
  const grades = ring.map(([x, z]) => groundAt(x, z));
  if (grades.some((y) => y === null || !Number.isFinite(y))) return null;
  const datum = Math.min(...(grades as number[]));
  const shell = new Builder(),
    occupied = new Builder(),
    streetStone = new Builder();
  const outward = ring.map(([x, z], i): P2 => {
    const [ex, ez] = ring[(i + 1) % ring.length],
      len = Math.hypot(ex - x, ez - z);
    return len ? [(Math.sign(area) * (ez - z)) / len, (-Math.sign(area) * (ex - x)) / len] : [0, 0];
  });
  // Intersect the offset edge lines so projecting cornices meet at the prow.
  const rim = (distance: number, y: number) =>
    ring.map(([x, z], i) => {
      const a = outward[(i + ring.length - 1) % ring.length],
        b = outward[i];
      const k = distance / Math.max(0.25, 1 + a[0] * b[0] + a[1] * b[1]);
      return [x + k * (a[0] + b[0]), y, z + k * (a[1] + b[1])];
    });
  const course = (low: number, high: number, projection: number, color: string) => {
    const under = rim(0, low),
      skirt = rim(projection, low),
      cap = rim(projection, high),
      inner = rim(0, high);
    for (let i = 0; i < ring.length; i++) {
      const j = (i + 1) % ring.length;
      shell.quad(under[i], under[j], skirt[j], skirt[i], recess);
      shell.quad(skirt[i], skirt[j], cap[j], cap[i], color);
      shell.quad(cap[i], cap[j], inner[j], inner[i], molding);
    }
  };
  for (let i = 0; i < ring.length; i++) {
    const [x, z] = ring[i],
      end = ring[(i + 1) % ring.length],
      len = Math.hypot(end[0] - x, end[1] - z);
    if (len < 0.01) continue;
    const dx = (end[0] - x) / len,
      dz = (end[1] - z) / len,
      n = outward[i];
    const p = (t: number, y: number, d: number) => [x + dx * t + n[0] * d, y, z + dz * t + n[1] * d];
    const panel = (
      left: number,
      right: number,
      lo: number,
      hi: number,
      d1: number,
      d2: number,
      color: string,
      batch = shell
    ) => batch.quad(p(left, lo, d1), p(right, lo, d2), p(right, hi, d2), p(left, hi, d1), color);
    panel(0, len, -0.55, belt, 0, 0, stone, streetStone);
    panel(0, len, belt, roof, 0, 0, stone);
    const curved = len < 1.3,
      long = len > 30;
    const bays = long ? 9 : len > 12 ? 4 : 1,
      width = len / bays;
    for (let bay = 0; bay < bays; bay++) {
      const l = bay * width,
        r = l + width,
        mid = (l + r) / 2;
      // The rounded Poplar transition has broad uninterrupted glass between
      // its masonry spandrels. Keep the surveyed curve's facets continuous.
      const border = curved ? 0 : width * 0.13;
      const door = long && bay === 4;
      panel(l + border, r - border, 0.34, 4.25, 0.035, 0.035, door ? '#3e4a4b' : '#58696b', door ? occupied : shell);
      panel(l + border, r - border, 4.72, 8.12, 0.035, 0.035, '#728081', long && bay % 3 === 1 ? occupied : shell);
      if (!curved || i % 3 === 0) panel(mid - 0.045, mid + 0.045, 0.36, 8.12, 0.065, 0.065, stone, streetStone);
      if (long && bay >= 2 && bay <= 7) {
        // Engaged round columns stand forward of the two-storey shop windows.
        const t = l,
          radius = 0.34;
        for (let side = 0; side < 6; side++) {
          const a = (Math.PI * side) / 6,
            b = (Math.PI * (side + 1)) / 6;
          panel(
            t + radius * Math.cos(b),
            t + radius * Math.cos(a),
            0.64,
            8.22,
            0.11 + radius * Math.sin(b),
            0.11 + radius * Math.sin(a),
            molding,
            streetStone
          );
        }
        panel(t - 0.48, t + 0.48, 0.22, 0.65, 0.26, 0.26, recess, streetStone);
        panel(t - 0.48, t + 0.48, 8.13, 8.5, 0.31, 0.31, molding, streetStone);
      }
      if (door) {
        // Paired door and the bull's-eye above the Peachtree/Broad portals.
        const disk = (radius: number, depth: number, color: string) => {
          for (let j = 0; j < 16; j++) {
            const a = (j * Math.PI) / 8,
              b = ((j + 1) * Math.PI) / 8;
            streetStone.tri(
              p(mid, 6.55, depth),
              p(mid + radius * Math.cos(a), 6.55 + radius * Math.sin(a), depth),
              p(mid + radius * Math.cos(b), 6.55 + radius * Math.sin(b), depth),
              color
            );
          }
        };
        panel(l + 0.49, r - 0.49, 4.5, 8.16, 0.09, 0.09, stone, streetStone);
        disk(1.06, 0.13, recess);
        disk(0.85, 0.15, molding);
        disk(0.66, 0.17, glass);
      }
      for (let floor = 0; floor < 9; floor++) {
        const upper = floor >= 7;
        const pitch = upper ? 3.55 : (cornice - belt) / 7;
        const lo = upper ? cornice + 0.55 + (floor - 7) * pitch : belt + floor * pitch;
        const oriel = long && bay >= 2 && bay <= 6;
        const front = oriel ? (upper ? 0.43 : 0.72) : 0.05;
        const a = l + border,
          b = r - border;
        const shoulder = oriel ? 0.64 : 0;
        const ends = oriel
          ? [
              [a, 0.055],
              [a + shoulder, front],
              [b - shoulder, front],
              [b, 0.055],
            ]
          : [
              [a, front],
              [b, front],
            ];
        const window = (left: number, right: number, d1: number, d2: number) => {
          panel(left, right, lo, lo + pitch, d1, d2, stone);
          const trim = curved ? 0 : Math.min(0.16, (right - left) * 0.16);
          const slope = (d2 - d1) / (right - left);
          const near = d1 + trim * slope + 0.026,
            far = d2 - trim * slope + 0.026;
          const low = lo + 0.6,
            high = lo + pitch - 0.38;
          const lit = hashStr(`${curved ? 'round' : Math.round(x)}/${bay}/${floor}`) % 10 === 0;
          panel(left + trim, right - trim, low, high, near, far, glass, lit ? occupied : shell);
          panel(
            left + trim,
            right - trim,
            low + (high - low) * 0.57,
            low + (high - low) * 0.57 + 0.075,
            near + 0.014,
            far + 0.014,
            stone
          );
          if ((!curved && right - left > 1.85) || (curved && i % 3 === 0)) {
            const t = (left + right) / 2,
              depth = (d1 + d2) / 2 + 0.05;
            panel(t - 0.045, t + 0.045, low, high, depth - 0.045 * slope, depth + 0.045 * slope, molding);
          }
          if (oriel) {
            panel(left, right, lo + 0.29, lo + 0.48, d1 + 0.085, d2 + 0.085, molding);
            if (floor === 0 || floor === 7)
              shell.quad(p(left, lo, 0), p(right, lo, 0), p(right, lo, d2), p(left, lo, d1), recess);
          }
        };
        for (let j = 1; j < ends.length; j++) window(ends[j - 1][0], ends[j][0], ends[j - 1][1], ends[j][1]);
      }
    }
  }
  course(0.04, 0.32, 0.1, '#777773');
  course(8.4, 8.74, 0.39, recess);
  course(8.74, 9.03, 0.59, molding);
  course(cornice - 0.35, cornice - 0.04, 0.43, recess);
  course(cornice - 0.04, cornice + 0.39, 0.99, molding);
  course(roof - 0.99, roof - 0.65, 0.38, recess);
  course(roof - 0.65, roof - 0.3, 0.54, molding);
  course(roof - 0.16, roof + 0.07, 0.18, stone);

  const roofSurface = rim(0, roof - 0.03);
  for (const [a, b, c] of ShapeUtils.triangulateShape(vectors, []))
    shell.tri(roofSurface[a], roofSurface[c], roofSurface[b], '#b8b9af');
  // Set-back roof plant follows the long axis visible in the aerial.
  const service = (footprint: P2[], low: number, high: number, color: string) => {
    const top = footprint.map(([x, z]) => [x, high, z]);
    for (let i = 0; i < footprint.length; i++) {
      const j = (i + 1) % footprint.length;
      shell.quad(
        [footprint[i][0], low, footprint[i][1]],
        [footprint[j][0], low, footprint[j][1]],
        top[j],
        top[i],
        recess
      );
    }
    for (const [a, b, c] of ShapeUtils.triangulateShape(
      footprint.map(([x, z]) => new Vector2(x, z)),
      []
    ))
      shell.tri(top[a], top[c], top[b], color);
  };
  service(terrace, roof - 0.03, roof + 0.88, '#c8c7bb');
  service(
    [
      [249.8, -222.5],
      [243.6, -217.7],
      [245.3, -215.5],
      [251.5, -220.3],
    ],
    roof + 0.88,
    roof + 1.65,
    '#a9aca3'
  );
  const group = new Group();
  group.name = 'Flatiron Building';
  group.position.y = datum;
  const solid = new Mesh(shell.geometry(), new MeshLambertMaterial({ vertexColors: true, side: DoubleSide }));
  solid.receiveShadow = solid.castShadow = true;
  const rooms = new MeshLambertMaterial({
    vertexColors: true,
    side: DoubleSide,
    emissive: '#e2c691',
    emissiveIntensity: 0,
  });
  const lights = new Mesh(occupied.geometry(), rooms);
  lights.receiveShadow = true;
  // The park's lamp-lit sidewalk gives the lower limestone a warm cast.
  // The upper cornices receive the City's ambient light.
  const baseMaterial = new MeshLambertMaterial({
    vertexColors: true,
    side: DoubleSide,
    emissive: '#c9aa7d',
    emissiveIntensity: 0,
  });
  const base = new Mesh(streetStone.geometry(), baseMaterial);
  base.castShadow = base.receiveShadow = true;
  group.add(solid, lights, base);
  return {
    group,
    buildings: buildings.filter((b) => b !== building),
    setNight(dark: number) {
      rooms.emissiveIntensity = 0.31 * dark;
      baseMaterial.emissiveIntensity = 0.095 * dark;
    },
  };
}
