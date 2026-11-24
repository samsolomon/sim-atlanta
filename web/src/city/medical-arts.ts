import { type Material, Mesh } from 'three';
import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { classicalOrnament } from './classical-ornament';
import { landmarkShell } from './landmark-shell';

/**
 * The Medical Arts Building (G. Lloyd Preacher, 1927), 384 Peachtree. The National Register
 * nomination (2016) describes a three-part composition: a two-storey limestone storefront base on
 * Peachtree (east) and the north side, a buff brick shaft on floors 3 to 10, an orange terracotta
 * band, and a two-storey capital with paired limestone pilasters under a pressed-metal cornice that
 * turns both corners. The south wall is plain red brick and the west a dark brick shaft. A
 * two-storey elevator penthouse stands on the roof. The building is vacant and boarded, so no
 * windows are lit. Evidence and estimates: docs/log/ui/medical-arts/README.md.
 */
export const medicalArtsId = '51e690cd-e135-46db-9935-e4588b6b2e1f';

// Lidar (April 2019) roofs in NAVD88 metres: main roof 352.0, penthouse 357.4, stair and
// elevator head 361.6. The Peachtree sidewalk is the datum for the storeys below.
const roof = 352, penthouse = 357.4, head = 361.6;
const baseH = 9, floorH = 3.2;

const buff = '#b8a385', red = '#9a7464', darkBrick = '#8a705a', limestone = '#dccfb6', joint = '#b2a58d';
const terracotta = '#c97a4b', metal = '#cbbfa6', shade = '#9c8e78', window = '#5a6262', boarded = '#7b746a';

type Shell = NonNullable<ReturnType<typeof landmarkShell>>;
type Face = 'east' | 'north' | 'south' | 'west';

export function createMedicalArts(buildings: VBuilding[], grid: GroundGrid) {
  const origin: P2 = [520.4, -1233.7];
  const s = landmarkShell(buildings, grid, medicalArtsId, 'Medical Arts Building', origin, [40.5, 14.1], [[0, 0], [15, 0], [-15, 0]]);
  if (!s) return null;
  const angle = Math.atan2(14.1, 40.5), c = Math.cos(angle), sn = Math.sin(angle);
  const toLocal = ([x, z]: P2): P2 => [(x - origin[0]) * c + (z - origin[1]) * sn, -(x - origin[0]) * sn + (z - origin[1]) * c];
  const toWorld = ([u, v]: P2): P2 => [origin[0] + u * c - v * sn, origin[1] + u * sn + v * c];

  // Counter-clockwise plan, so the outward normal of edge a→b is (dz, -dx)/length.
  let plan = s.ring;
  const area = plan.reduce((sum, [x, z], i) => { const [u, v] = plan[(i + 1) % plan.length]; return sum + x * v - u * z; }, 0);
  if (area < 0) plan = [...plan].reverse();
  const faces = plan.map((a, i) => {
    const b = plan[(i + 1) % plan.length];
    const mu = (a[0] + b[0]) / 2, mv = (a[1] + b[1]) / 2;
    // The long axis runs east to Peachtree; world north is negative local v.
    const face: Face = Math.abs(mu) > Math.abs(mv) * 1.5 ? (mu > 0 ? 'east' : 'west') : (mv < 0 ? 'north' : 'south');
    return { a, b, face, length: Math.hypot(b[0] - a[0], b[1] - a[1]) };
  });
  const east = faces.find(f => f.face === 'east')!;
  // The Peachtree sidewalk, sampled 3 m out from the wall where the street stands above the lot.
  const edx = east.b[0] - east.a[0], edz = east.b[1] - east.a[1], el = Math.hypot(edx, edz);
  const street = Math.max(s.base + 0.35, ...[0.2, 0.5, 0.8].map(t => {
    const p = toWorld([east.a[0] + t * edx + 3 * edz / el, east.a[1] + t * edz - 3 * edx / el]);
    return grid.sample(p[0], p[1]) ?? -Infinity;
  }));
  const capital = roof - 2 * floorH - 0.9, terracottaTop = capital, terracottaLo = capital - 0.9;

  const panel = (a: P2, b: P2, t0: number, t1: number, lo: number, hi: number, out: number, color: string) => {
    if (hi - lo < 0.05 || t1 <= t0) return;
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
    const p = (t: number, y: number) => [a[0] + t * dx + out * dz / l, y, a[1] + t * dz - out * dx / l];
    s.body.quad(p(t0, lo), p(t0, hi), p(t1, hi), p(t1, lo), color);
  };
  /** A projecting course along one face: a thin prism out to `out` metres. */
  const course = (a: P2, b: P2, lo: number, hi: number, out: number, color: string, extend = 0) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
    const tx = dx / l, tz = dz / l, nx = dz / l, nz = -dx / l;
    const a0: P2 = [a[0] - tx * extend, a[1] - tz * extend], b0: P2 = [b[0] + tx * extend, b[1] + tz * extend];
    s.prism([a0, b0, [b0[0] + nx * out, b0[1] + nz * out], [a0[0] + nx * out, a0[1] + nz * out]], lo, hi, color, color);
  };

  // The brick mass: buff on the street faces; the walls behind are painted per face below.
  s.prism(plan, s.base, roof, buff, '#8d8a82');
  // The cornice's dentils and scrolled brackets are below City resolution: a shade course stands in.
  const { band } = classicalOrnament(s, { stone: limestone, shade, limestone, joint });

  for (const { a, b, face, length } of faces) {
    if (length < 3) continue;
    const front = face === 'east' || face === 'north';
    if (face === 'south') panel(a, b, 0, 1, s.base, roof, 0.02, red);
    if (face === 'west') panel(a, b, 0, 1, s.base, terracottaLo, 0.02, darkBrick);

    // Base: limestone with rusticated joints and boarded storefronts on the street faces.
    if (front) {
      panel(a, b, 0, 1, s.base, street + baseH, 0.05, limestone);
      for (let y = street + 4.8; y < street + baseH - 0.3; y += 1) panel(a, b, 0, 1, y, y + 0.07, 0.07, joint);
      const stores = face === 'east' ? 3 : 6;
      for (let i = 0; i < stores; i++) panel(a, b, (i + 0.12) / stores, (i + 0.88) / stores, street + 0.2, street + 4.2, 0.08, boarded);
      for (let i = 0; i < (face === 'east' ? 3 : 10); i++) {
        const n = face === 'east' ? 3 : 10;
        panel(a, b, (i + 0.3) / n, (i + 0.7) / n, street + 5.4, street + 7.9, 0.08, window);
      }
      // The limestone stringer course under the third-floor windows.
      course(a, b, street + baseH - 0.1, street + baseH + 0.45, 0.25, limestone, 0.25);
    }

    // Windows, floors 3 to 12, single double-hung openings: three bays on Peachtree.
    const bays = face === 'east' ? 3 : Math.max(1, Math.round(length / 4.3));
    const lo = front ? street + baseH : s.base + 4;
    // The back walls (south and west) take one strip per bay: their floor rhythm cannot be read
    // from any public street, and it halves their cost.
    if (face === 'south' || face === 'west') {
      for (let i = 0; i < bays; i++) {
        // The south wall's elevator core leaves a blank central band.
        if (face === 'south' && Math.abs((i + 0.5) / bays - 0.5) < 0.12) continue;
        panel(a, b, (i + 0.32) / bays, (i + 0.68) / bays, lo + 0.7, roof - 1.1, 0.04, window);
      }
    } else for (let f = 0; lo + f * floorH + floorH <= roof - 0.6; f++) {
      const y = lo + f * floorH;
      if (y > terracottaLo - 0.4 && y < terracottaTop + 0.1) continue;
      for (let i = 0; i < bays; i++) {
        panel(a, b, (i + 0.3) / bays, (i + 0.7) / bays, y + 0.7, y + floorH - 0.5, 0.04, window);
      }
    }

    // The south wall has a light brick stringer where the other three carry orange terracotta.
    if (face === 'south') panel(a, b, -0.02, 1.02, terracottaLo, terracottaTop, 0.22, '#c9ab8a');
  }
  // The orange terracotta band between shaft and capital, one ring around the building.
  band(plan, terracottaLo, terracottaTop, 0.2, terracotta);

  // The capital on Peachtree: paired limestone pilasters between the three bays, a cornice of
  // dentils and scrolled brackets that turns both corners.
  const { a: ea, b: eb } = east;
  for (const t of [0, 1 / 3, 2 / 3, 1]) {
    for (const d of [-0.035, 0.035]) {
      const c0 = Math.min(1, Math.max(0, t + d - 0.02)), c1 = Math.min(1, Math.max(0, t + d + 0.02));
      panel(ea, eb, c0, c1, terracottaTop, roof - 0.6, 0.18, limestone);
    }
  }
  course(ea, eb, roof - 0.6, roof, 0.45, metal, 1.5);
  course(ea, eb, roof, roof + 0.55, 0.95, metal, 1.9);
  panel(ea, eb, -0.05, 1.05, roof - 0.25, roof, 0.9, shade);
  for (const f of faces) if (f.face !== 'east' && f.face !== 'west' && f.length > 3) {
    // The returns: the cornice runs about 2 m around each corner and stops.
    const t = 2 / f.length;
    const [a, b] = f.a[0] > f.b[0] ? [f.a, f.b] : [f.b, f.a];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const end: P2 = [a[0] + dx * t, a[1] + dz * t];
    course(f.face === 'north' ? end : a, f.face === 'north' ? a : end, roof, roof + 0.55, 0.95, metal);
  }

  // North wall: the white, orange and blue tile panel between two heightened bays, under a
  // parapet that steps up over each shield.
  const north = faces.find(f => f.face === 'north');
  if (north) {
    const [na, nb] = [north.a, north.b];
    panel(na, nb, 0.44, 0.56, capital + 0.3, roof - 0.3, 0.06, '#e6e1d4');
    panel(na, nb, 0.46, 0.54, capital + 1.2, roof - 1.2, 0.08, terracotta);
    panel(na, nb, 0.48, 0.52, capital + 2.1, roof - 2.1, 0.1, '#4f6f9a');
    for (const t of [0.36, 0.64]) {
      panel(na, nb, t - 0.035, t + 0.035, capital + 2, capital + 3.6, 0.09, limestone);
      panel(na, nb, t - 0.06, t + 0.06, roof, roof + 1.6, 0.01, buff);
    }
  }

  // The two-storey elevator penthouse and its stair head, placed from the lidar.
  const box = (x0: number, z0: number, x1: number, z1: number): P2[] =>
    [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(p => toLocal(p as P2));
  s.prism(box(509, -1246, 526, -1231), roof, penthouse, buff, '#8f8b82');
  s.prism(box(518, -1239, 526, -1230), penthouse, head, buff, '#8f8b82');
  s.prism(box(498, -1240, 506, -1234), roof, roof + 2.4, '#9a9b95', '#8a8b85');

  const built = s.finish();
  // Nothing is lit in a vacant building: drop the empty lamp mesh so it costs no draw.
  for (const child of [...built.group.children]) {
    if (child instanceof Mesh && child.geometry.getAttribute('position').count === 0) {
      child.removeFromParent();
      child.geometry.dispose();
      (child.material as Material).dispose();
    }
  }
  return built;
}

