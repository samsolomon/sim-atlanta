import { Group, Mesh, MeshLambertMaterial, DoubleSide, ShapeUtils, Vector2 } from 'three';
import { Builder, hashStr, pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';

const id = '200f8a75-44d8-4a11-8ff8-6af148cc6b17';
const stone = '#e5e0d4',
  molding = '#eee7d9',
  recess = '#b6b1a5',
  glass = '#a1b3b9';
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
  const normals = (path: P2[]) =>
    path.map(([x, z], i): P2 => {
      const [ex, ez] = path[(i + 1) % path.length],
        len = Math.hypot(ex - x, ez - z);
      return len ? [(Math.sign(area) * (ez - z)) / len, (-Math.sign(area) * (ex - x)) / len] : [0, 0];
    });
  const outward = normals(ring);
  // The principal cornice spans the bays. The roof cornice and parapet turn
  // with each upper bay, so they need a second, folded path.
  const crown: P2[] = [];
  const rim = (path: P2[], normal: P2[], distance: number, y: number) =>
    path.map(([x, z], i) => {
      const a = normal[(i + path.length - 1) % path.length],
        b = normal[i];
      const k = distance / Math.max(0.25, 1 + a[0] * b[0] + a[1] * b[1]);
      return [x + k * (a[0] + b[0]), y, z + k * (a[1] + b[1])];
    });
  const course = (path: P2[], profile: [number, number, string][]) => {
    const normal = path === ring ? outward : normals(path);
    let previous = rim(path, normal, profile[0][1], profile[0][0]);
    for (const [height, offset, finish] of profile.slice(1)) {
      const next = rim(path, normal, offset, height);
      for (let i = 0; i < path.length; i++) {
        const j = (i + 1) % path.length;
        shell.quad(previous[i], previous[j], next[j], next[i], finish);
      }
      previous = next;
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
    panel(0, len, belt, roof - 0.68, 0, 0, stone);
    crown.push([x, z]);
    const curved = len < 1.3,
      long = len > 30;
    const bays = long ? 9 : len > 12 ? 4 : 1,
      width = len / bays;
    for (let bay = 0; bay < bays; bay++) {
      const l = bay * width,
        r = l + width,
        mid = (l + r) / 2;
      const portico = long && bay >= 2 && bay <= 6;
      const door = long && bay === 4,
        basePlane = portico ? -0.58 : 0;
      // The colonnade stands in front of a recessed wall of shop glass.
      const basePanel = (a: number, b: number, lo: number, hi: number, d: number, color: string, batch = streetStone) =>
        panel(a, b, lo, hi, basePlane + d, basePlane + d, color, batch);
      basePanel(l, r, -0.55, belt, 0, stone);
      if (portico && (bay === 2 || bay === 6)) {
        const t = bay === 2 ? l : r;
        streetStone.quad(p(t, -0.55, basePlane), p(t, -0.55, 0), p(t, belt, 0), p(t, belt, basePlane), recess);
      }
      if (portico) shell.quad(p(l, belt, basePlane), p(r, belt, basePlane), p(r, belt, 0), p(l, belt, 0), recess);
      const border = curved ? 0 : width * 0.16;
      basePanel(l + border, r - border, 0.48, 3.95, 0.035, door ? '#434e51' : '#6d8084', door ? occupied : shell);
      basePanel(l + border, r - border, 5.1, 7.94, 0.035, '#809092', long && bay % 3 === 1 ? occupied : shell);
      if (!curved || i % 3 === 0) basePanel(mid - 0.075, mid + 0.075, 0.48, 7.94, 0.07, stone);
      if (!curved) {
        for (const y of [2.88, 6.45]) basePanel(l + border, r - border, y, y + 0.11, 0.068, recess);
      }
      if (long && bay >= 2 && bay <= 7) {
        // Freestanding faceted shafts, flared neck and square abacus below the lintel.
        const column = (y: number, radius: number, angle: number) =>
          p(l + radius * Math.cos(angle), y, 0.31 + radius * Math.sin(angle));
        const profile = [
          [0.12, 0.5],
          [0.55, 0.5],
          [0.74, 0.41],
          [7.64, 0.36],
          [7.75, 0.43],
          [7.91, 0.38],
          [8.2, 0.55],
        ];
        for (let side = 0; side < 12; side++) {
          const a = (Math.PI * side) / 6,
            b = (Math.PI * (side + 1)) / 6;
          for (let step = 1; step < profile.length; step++) {
            const [y0, r0] = profile[step - 1],
              [y1, r1] = profile[step];
            streetStone.quad(
              column(y0, r0, b),
              column(y0, r0, a),
              column(y1, r1, a),
              column(y1, r1, b),
              step === 1 ? recess : molding
            );
          }
        }
        const corner = (t: number, y: number, d: number) => p(l + t, y, d);
        const abacus = [
          corner(-0.59, 8.2, -0.16),
          corner(0.59, 8.2, -0.16),
          corner(0.59, 8.2, 0.92),
          corner(-0.59, 8.2, 0.92),
        ];
        streetStone.quad(abacus[0], abacus[1], abacus[2], abacus[3], recess);
        for (let k = 0; k < 4; k++) {
          const a = abacus[k],
            b = abacus[(k + 1) % 4];
          streetStone.quad(a, b, [b[0], 8.48, b[2]], [a[0], 8.48, a[2]], molding);
        }
      }
      if (door) {
        const disk = (radius: number, depth: number, color: string) => {
          for (let j = 0; j < 16; j++) {
            const a = (j * Math.PI) / 8,
              b = ((j + 1) * Math.PI) / 8;
            streetStone.tri(
              p(mid, 6.55, basePlane + depth),
              p(mid + radius * Math.cos(a), 6.55 + radius * Math.sin(a), basePlane + depth),
              p(mid + radius * Math.cos(b), 6.55 + radius * Math.sin(b), basePlane + depth),
              color
            );
          }
        };
        basePanel(l + 0.49, r - 0.49, 4.5, 8.16, 0.09, stone);
        disk(1.06, 0.13, recess);
        disk(0.85, 0.15, molding);
        disk(0.66, 0.17, glass);
      }
      const orielStart = l + width * 0.045,
        orielEnd = r - width * 0.045,
        shoulder = 0.86;
      if (portico)
        for (const [t, d] of [
          [orielStart, 0],
          [orielStart + shoulder, 0.86],
          [orielEnd - shoulder, 0.86],
          [orielEnd, 0],
        ]) {
          const [px, , pz] = p(t, 0, d);
          crown.push([px, pz]);
        }
      for (let floor = 0; floor < 9; floor++) {
        const upper = floor >= 7;
        const pitch = upper ? 3.55 : (cornice - belt) / 7;
        const lo = upper ? cornice + 0.55 + (floor - 7) * pitch : belt + floor * pitch;
        const oriel = portico && floor > 0;
        const a = oriel ? orielStart : l + (curved ? 0 : width * 0.095),
          b = oriel ? orielEnd : r - (curved ? 0 : width * 0.095);
        const front = upper ? 0.86 : 1.03;
        const ends = oriel
          ? [
              [a, 0.24],
              [a + shoulder, front],
              [b - shoulder, front],
              [b, 0.24],
            ]
          : [
              [a, 0.23],
              [b, 0.23],
            ];
        const lit = hashStr(`${curved ? 'round' : Math.round(x)}/${bay}/${floor}`) % 10 === 0;
        // A recessed sash with actual head, sill and jamb returns. Its light
        // strike is strongest at the sill; the head casts its own shadow.
        const window = (left: number, right: number, d1: number, d2: number) => {
          const w = right - left,
            slope = (d2 - d1) / w;
          const pt = (t: number, y: number, d: number) => p(t, y, d1 + (t - left) * slope + d);
          const strip = (t1: number, t2: number, y1: number, y2: number, d: number, color: string, batch = shell) =>
            batch.quad(pt(t1, y1, d), pt(t2, y1, d), pt(t2, y2, d), pt(t1, y2, d), color);
          const trim = curved ? 0 : Math.min(oriel ? 0.34 : 0.43, w * 0.22);
          const leftJamb = left + trim,
            rightJamb = right - trim;
          const sill = lo + (curved ? 1.05 : 1.28),
            head = lo + pitch - 0.45,
            inset = curved ? -0.12 : -0.205;
          if (curved) strip(left, right, lo, sill, 0, stone);
          strip(left, right, head, lo + pitch, 0, stone);
          if (trim) {
            strip(left, leftJamb, sill, head, 0, molding);
            strip(rightJamb, right, sill, head, 0, molding);
            for (const t of [leftJamb, rightJamb])
              shell.quad(pt(t, sill, 0), pt(t, sill, inset), pt(t, head, inset), pt(t, head, 0), recess);
          }
          for (const [y, finish] of [
            [sill, molding],
            [head, '#988b78'],
          ] as const)
            shell.quad(
              pt(leftJamb, y, 0),
              pt(rightJamb, y, 0),
              pt(rightJamb, y, inset),
              pt(leftJamb, y, inset),
              finish
            );
          strip(leftJamb, rightJamb, sill, head, inset, glass, lit ? occupied : shell);
          const transom = sill + (head - sill) * 0.55;
          strip(leftJamb, rightJamb, transom, transom + 0.075, inset + 0.024, stone);
          if (rightJamb - leftJamb > 1.3 || (curved && i % 3 === 0)) {
            const t = (left + right) / 2;
            strip(t - 0.1, t + 0.1, sill, head, inset + 0.13, molding);
          }
          if (!curved) {
            // A shallow framed tablet fills the spandrel between sashes. Its
            // beveled rim is solid geometry on all three faces of each oriel.
            const margin = Math.min(w * 0.12, 0.23),
              x0 = left + margin,
              x1 = right - margin;
            const y0 = lo + 0.15,
              y1 = sill - 0.22,
              bevel = Math.min(0.14, (x1 - x0) * 0.17);
            strip(left, right, lo, y0, 0, stone);
            strip(left, right, y1, sill, 0, stone);
            strip(left, x0, y0, y1, 0, stone);
            strip(x1, right, y0, y1, 0, stone);
            const outline = [
              [x0, y0],
              [x1, y0],
              [x1, y1],
              [x0, y1],
            ];
            const well = [
              [x0 + bevel, y0 + 0.12],
              [x1 - bevel, y0 + 0.12],
              [x1 - bevel, y1 - 0.12],
              [x0 + bevel, y1 - 0.12],
            ];
            for (let j = 0; j < 4; j++) {
              const k = (j + 1) % 4,
                a = outline[j],
                b = outline[k],
                c = well[k],
                d = well[j];
              shell.quad(
                pt(a[0], a[1], 0),
                pt(b[0], b[1], 0),
                pt(c[0], c[1], -0.14),
                pt(d[0], d[1], -0.14),
                j === 2 ? recess : molding
              );
            }
            strip(x0 + bevel, x1 - bevel, y0 + 0.12, y1 - 0.12, -0.14, '#d4cbb8');
          }
          if (oriel || curved) {
            shell.quad(
              pt(left, sill - 0.19, 0),
              pt(right, sill - 0.19, 0),
              pt(right, sill - 0.11, 0.19),
              pt(left, sill - 0.11, 0.19),
              recess
            );
            strip(left, right, sill - 0.11, sill + 0.025, 0.19, molding);
            shell.quad(
              pt(left, sill + 0.025, 0.19),
              pt(right, sill + 0.025, 0.19),
              pt(right, sill, 0),
              pt(left, sill, 0),
              stone
            );
          }
          if (floor === 0 || (oriel && (floor === 1 || floor === 7)))
            shell.quad(p(left, lo, 0), p(right, lo, 0), pt(right, lo, 0), pt(left, lo, 0), recess);
        };
        if (!curved) {
          for (const [t, d] of [ends[0], ends[ends.length - 1]])
            shell.quad(p(t, lo, 0), p(t, lo, d), p(t, lo + pitch, d), p(t, lo + pitch, 0), stone);
        }
        for (let j = 1; j < ends.length; j++) window(ends[j - 1][0], ends[j][0], ends[j - 1][1], ends[j][1]);
      }
    }
  }
  course(ring, [
    [0.04, 0, recess],
    [0.04, 0.1, recess],
    [0.32, 0.1, '#777773'],
    [0.32, 0, stone],
  ]);
  course(ring, [
    [8.3, 0, recess],
    [8.3, 0.43, recess],
    [8.48, 0.52, stone],
    [8.64, 0.75, recess],
    [8.91, 0.85, molding],
    [9.08, 0, stone],
  ]);
  course(ring, [
    [cornice - 0.64, 0, recess],
    [cornice - 0.64, 0.63, recess],
    [cornice - 0.39, 0.82, stone],
    [cornice - 0.31, 1.35, '#988a78'],
    [cornice - 0.16, 1.48, recess],
    [cornice + 0.18, 1.48, molding],
    [cornice + 0.42, 0.98, stone],
    [cornice + 0.42, 0, molding],
  ]);
  // A narrow cornice carries the upright ornamented parapet. Both step out
  // in plan over the five projecting bays; the interior drops to the flat roof.
  course(crown, [
    [roof - 1.02, -0.12, recess],
    [roof - 1.02, 0.2, '#a89a85'],
    [roof - 0.84, 0.32, recess],
    [roof - 0.68, 0.46, molding],
    [roof - 0.49, 0.46, stone],
    [roof - 0.43, 0.14, molding],
    [roof + 0.43, 0.14, stone],
    [roof + 0.49, 0.21, stone],
    [roof + 0.62, 0.21, molding],
    [roof + 0.62, -0.16, molding],
    [roof - 0.03, -0.16, recess],
  ]);
  for (let i = 0; i < crown.length; i++) {
    const a = crown[i],
      b = crown[(i + 1) % crown.length],
      dx = b[0] - a[0],
      dz = b[1] - a[1],
      len = Math.hypot(dx, dz);
    if (len < 1.2) continue;
    const nx = (Math.sign(area) * dz) / len,
      nz = (-Math.sign(area) * dx) / len;
    const count = Math.max(1, Math.round(len / 1.26));
    for (let j = 0; j < count; j++) {
      const t = (j + 0.5) / count,
        x = a[0] + dx * t,
        z = a[1] + dz * t;
      const point = (along: number, up: number, d: number) => [
        x + (dx / len) * along + nx * d,
        roof + up,
        z + (dz / len) * along + nz * d,
      ];
      // Faceted rosettes pick up opposite light on their four petals.
      for (let petal = 0; petal < 4; petal++) {
        const angle = Math.PI * 0.25 + petal * Math.PI * 0.5,
          u = Math.cos(angle),
          v = Math.sin(angle);
        const tip = point(0.39 * u, 0.39 * v, 0.18),
          center = point(0, 0, 0.29);
        shell.tri(center, point(0.18 * u - 0.11 * v, 0.18 * v + 0.11 * u, 0.18), tip, molding);
        shell.tri(center, tip, point(0.18 * u + 0.11 * v, 0.18 * v - 0.11 * u, 0.18), recess);
      }
    }
  }
  const roofSurface = rim(crown, normals(crown), -0.16, roof - 0.03);
  for (const [a, b, c] of ShapeUtils.triangulateShape(
    roofSurface.map(([x, , z]) => new Vector2(x, z)),
    []
  ))
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
