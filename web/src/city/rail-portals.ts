/**
 * Downtown freight tunnel mouths. Overture flags several stretches of the downtown rail as tunnels
 * (level -1), and the transport bake hides them, so on City the track used to stop at the foot of
 * the ground the lidar measured over it: a 8-9 m rise of grass where the real line runs on under a
 * plaza, street deck or building. Every loose rail end on the board is declared here with what it
 * really is; each hillside mouth gets a portal (headwall, lintel, wing walls, a dark tube with the
 * ballast running into it) and an opening cut in the terrain so the slope can't fill the mouth.
 *
 * Portal forms are illustrative (no photograph of each mouth was used for proportions); the mouth
 * positions, headings and cover levels come from the mapped track and the lidar ground.
 */
import * as THREE from 'three';
import { drapeTriangle, type DrapeGround } from '../terrain/drape';
import type { OpenSlot } from '../terrain/openings';
import type { FreightTreadPoint } from '../terrain/transport';
import { Builder, type P2 } from '../vignette/geom';
import { colourDrop, orderForFar, registerFar } from '../terrain/far-form';

type Ground = { sample(x: number, z: number): number | null; manifest: { vertical: { sceneZeroNavd88M: number } } };
type Run = { kind: string; cls: string; pts: P2[] };

export type MouthKind = 'hillside' | 'under' | 'cut-end' | 'terminus';

/**
 * Every rail end on the downtown board that neither meets another run nor the board edge, by
 * position (scene metres, 3 m tolerance). `hillside` gets a portal; `under` already passes under a
 * drawn building or deck at grade; `cut-end` is an end of the Five Points east cut, which still
 * lacks its end face (known, a separate fix); `terminus` is a real end of track.
 */
export const DOWNTOWN_RAIL_ENDS: { at: P2; kind: MouthKind; faceInset?: number; why: string }[] = [
  { at: [-368, -592], kind: 'hillside', why: 'freight main into the tunnel under Centennial Olympic Park Dr, The CTR (ex-CNN Center) and the plaza; 8 m of cover' },
  { at: [10, -41], kind: 'hillside', faceInset: 7, why: 'freight main into the tunnel under Underground Atlanta and Five Points; 9 m of cover' },
  { at: [-274, -345], kind: 'under', why: 'freight main under the Centennial Olympic Park Dr deck at grade' },
  { at: [-251, -288], kind: 'under', why: 'freight main into the Gulch deck structure at grade' },
  { at: [-199, -202], kind: 'under', why: 'freight main out of the Gulch deck structure at grade' },
  { at: [171, 118], kind: 'cut-end', why: 'west end of the Five Points east cut under the Pryor St deck: the cut has no end face yet (follow-up in east-cut-ground.ts)' },
  { at: [248, 192], kind: 'cut-end', why: 'east end of the Five Points east cut under the Shirley Clarke Franklin Blvd deck: no end face yet (follow-up)' },
  { at: [392, 283], kind: 'under', why: 'freight main out from under the 90 Central Ave garage and the Courtland St deck (1 m of cover)' },
  { at: [-567, -532], kind: 'under', why: 'GWCC spur into the GWCC rail crossing under the halls' },
  { at: [-563, -532], kind: 'under', why: 'GWCC spur into the GWCC rail crossing under the halls' },
  { at: [-571, -533], kind: 'under', why: 'GWCC spur into the GWCC rail crossing under the halls' },
  { at: [-571, -307], kind: 'under', why: 'GWCC spur under the pedestrian concourse deck' },
  { at: [-371, -620], kind: 'terminus', why: 'end of a siding beside the main, short of the tunnel' },
  { at: [-624, -1275], kind: 'terminus', why: 'end of a spur 25 m inside the board edge' },
];

export interface RailMouth {
  x: number;
  z: number;
  /** Unit heading into the tunnel. */
  dx: number;
  dz: number;
  /** Half the opening's width. */
  half: number;
  /** Scene y of the rail at the face, and of the cover over it. */
  railY: number;
  coverY: number;
  /** Distance from the mapped rail end to the retaining face set into the hill. */
  faceInset?: number;
}

/** Rail ends that neither meet another run nor a board edge. */
export function looseRailEnds(rail: readonly Run[], bounds: { minX: number; maxX: number; minZ: number; maxZ: number }) {
  const out: { run: number; at: P2; toward: P2 }[] = [];
  const edge = ([x, z]: P2) => x < bounds.minX + 6 || x > bounds.maxX - 6 || z < bounds.minZ + 6 || z > bounds.maxZ - 6;
  rail.forEach((r, i) => {
    if (r.pts.length < 2) return;
    // Heading from a point about 15 m back along the run: a mapped end often finishes in a short jog.
    const back = (pts: readonly P2[]) => {
      let left = 15;
      for (let k = 1; k < pts.length; k++) {
        const d = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
        if (d >= left) {
          const t = left / d;
          return [pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * t, pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * t] as P2;
        }
        left -= d;
      }
      return pts[pts.length - 1];
    };
    for (const [at, toward] of [[r.pts[0], back(r.pts)], [r.pts[r.pts.length - 1], back([...r.pts].reverse())]] as const) {
      if (edge(at)) continue;
      if (rail.some((s, k) => k !== i && s.pts.some((q) => Math.hypot(q[0] - at[0], q[1] - at[1]) < 2.5))) continue;
      out.push({ run: i, at, toward });
    }
  });
  return out;
}

export function declaredEnd(at: P2) {
  return DOWNTOWN_RAIL_ENDS.find((d) => Math.hypot(d.at[0] - at[0], d.at[1] - at[1]) < 3);
}

/** The hillside mouths, framed from the mapped track ends and the lidar ground. */
export function railMouths(rail: readonly Run[], bounds: { minX: number; maxX: number; minZ: number; maxZ: number }, ground: Ground): RailMouth[] {
  const zero = ground.manifest.vertical.sceneZeroNavd88M;
  const mouths: RailMouth[] = [];
  for (const end of looseRailEnds(rail, bounds)) {
    const declaration = declaredEnd(end.at);
    if (declaration?.kind !== 'hillside') continue;
    const len = Math.hypot(end.at[0] - end.toward[0], end.at[1] - end.toward[1]) || 1;
    const dx = (end.at[0] - end.toward[0]) / len,
      dz = (end.at[1] - end.toward[1]) / len;
    const rail0 = ground.sample(end.at[0], end.at[1]);
    if (rail0 === null) continue;
    let cover = rail0;
    for (let t = 4; t <= 26; t += 2) cover = Math.max(cover, ground.sample(end.at[0] + dx * t, end.at[1] + dz * t) ?? cover);
    // Parallel tracks ending beside this one share the mouth: widen it to take them.
    let lo = 0,
      hi = 0;
    for (const r of rail)
      for (const p of [r.pts[0], r.pts[r.pts.length - 1]]) {
        const ax = p[0] - end.at[0],
          az = p[1] - end.at[1];
        const along = ax * dx + az * dz,
          across = ax * -dz + az * dx;
        if (Math.abs(along) < 6 && Math.abs(across) < 14) {
          lo = Math.min(lo, across);
          hi = Math.max(hi, across);
        }
      }
    const mid = (lo + hi) / 2;
    mouths.push({
      x: end.at[0] - dz * mid,
      z: end.at[1] + dx * mid,
      dx,
      dz,
      faceInset: declaration.faceInset,
      half: (hi - lo) / 2 + 3.2,
      railY: rail0 - zero,
      coverY: cover - zero,
    });
  }
  return mouths;
}

/** Terrain openings so the lidar slope never fills a mouth: from 2 m outside the face to 16 m in. */
export function railPortalOpenings(mouths: readonly RailMouth[]): OpenSlot[] {
  return mouths.map((m) => ({
    start: [m.x - m.dx * 2, m.railY - (m.faceInset ? 1.2 : 0.4), m.z - m.dz * 2] as const,
    end: [m.x + m.dx * (m.faceInset ?? SLOT_END), m.railY - (m.faceInset ? 1.2 : 0.4), m.z + m.dz * (m.faceInset ?? SLOT_END)] as const,
    halfWidthM: m.half + SLOT_MARGIN,
  }));
}

const SLOT_MARGIN = 0.6,
  /** The terrain opening and the lid run the full tube length, so no ground cuts into the roof. */
  SLOT_END = 22.5;
/** No landcover is mapped over either tube, so the lid takes the board's base ground paint
 * (ground-map.ts) and reads as the same ground, not a stripe. */
const LID = '#b5bd97';
const CONCRETE = '#a39a8c',
  CONCRETE_SIDE = '#958b7d',
  COPING = '#b4ab9d',
  BALLAST = '#4e463d',
  TUBE = 22;

/** One mesh for every portal, in mouth-local frames (z into the tunnel). */
export function buildRailPortals(mouths: readonly RailMouth[], ground: Ground, terrainAt: DrapeGround) {
  const body = new Builder();
  const shade = (z: number) =>
    '#' + new THREE.Color('#5d5952').lerp(new THREE.Color('#080807'), Math.pow(Math.min(1, z / 14), 0.7)).getHexString();
  for (const m of mouths) {
    // Local (u across, y up, w into the tunnel) to scene.
    const P = (u: number, y: number, w: number) => [m.x + m.dz * -u + m.dx * w, y, m.z + m.dx * u + m.dz * w];
    const quad = (a: number[], b: number[], c: number[], d: number[], col: string) =>
      body.quad(P(a[0], a[1], a[2]), P(b[0], b[1], b[2]), P(c[0], c[1], c[2]), P(d[0], d[1], d[2]), col);
    const box = (u0: number, u1: number, y0: number, y1: number, w0: number, w1: number, col: string, side = CONCRETE_SIDE) => {
      quad([u0, y0, w0], [u1, y0, w0], [u1, y1, w0], [u0, y1, w0], col);
      quad([u1, y0, w1], [u0, y0, w1], [u0, y1, w1], [u1, y1, w1], col);
      quad([u0, y0, w1], [u0, y0, w0], [u0, y1, w0], [u0, y1, w1], side);
      quad([u1, y0, w0], [u1, y0, w1], [u1, y1, w1], [u1, y1, w0], side);
      quad([u0, y1, w0], [u1, y1, w0], [u1, y1, w1], [u0, y1, w1], COPING);
    };
    const y0 = m.railY - 0.5,
      clear = Math.min(7, Math.max(5.6, m.coverY - m.railY - 1.2)),
      top = Math.max(m.railY + clear + 1, m.coverY + 0.4),
      h = m.half;
    if (m.faceInset) {
      // At the south plaza the mapped track ends at the toe of a steep bank.
      // Cut only the approach. The original terrain covers the entire tunnel.
      const face = m.faceInset, outer = h + SLOT_MARGIN;
      const rim = (u: number, w: number) => {
        const [x, , z] = P(u, 0, w);
        return terrainAt(x, z) ?? (ground.sample(x, z) ?? m.coverY + ground.manifest.vertical.sceneZeroNavd88M) - ground.manifest.vertical.sceneZeroNavd88M;
      };
      const ceiling = m.railY + 6;
      const approach = -3.5;
      const tread = rim(0, approach) + .13;
      for (const side of [-1, 1]) {
        const u = side * outer;
        // Grade the approach from the ballast shoulder up to the intact bank.
        const shoulder = side * 2.1;
        const bank = (w: number) => [u, Math.max(tread - .13, rim(u + side * .01, w)), w];
        for (let w = -2; w < face; w++) {
          const end = Math.min(w + 1, face);
          quad([shoulder, tread - .13, w], [shoulder, tread - .13, end], bank(end), bank(w), LID);
        }
        quad([side*h,y0,face], [u,y0,face], [u,ceiling,face], [side*h,ceiling,face], CONCRETE);
        quad([side*h,y0,face], [side*h,ceiling,face], [side*h,ceiling,face+8], [side*h,y0,face+8], '#353330');
      }
      for (let u = -outer; u < outer; u += .5) {
        const v = Math.min(outer,u+.5);
        quad([u,ceiling,face], [v,ceiling,face], [v,rim(v,face+.01),face], [u,rim(u,face+.01),face], CONCRETE);
      }
      quad([-h,ceiling,face], [h,ceiling,face], [h,ceiling,face+8], [-h,ceiling,face+8], '#383531');
      quad([-h,y0,face+8], [h,y0,face+8], [h,ceiling,face+8], [-h,ceiling,face+8], '#050505');
      // The terrain slot clips the mapped tread just before its surveyed
      // endpoint. Continue the rails from the last supported approach.
      const strip = (left: number, right: number, w0: number, w1: number, y: number, colour: string) => {
        const vertex = (u: number, w: number) => {
          const [x, , z] = P(u, 0, w);
          const drawn = w <= -2 ? terrainAt(x, z) : null;
          return [u, drawn === null ? y : Math.max(y, drawn + .04 + y - (tread-.09)), w];
        };
        for (let w = w0; w < w1; w += .5) {
          const end = Math.min(w+.5,w1);
          quad(vertex(left,w), vertex(right,w), vertex(right,end), vertex(left,end), colour);
        }
      };
      quad([-2.1,tread-.13,-2], [2.1,tread-.13,-2], [2.1,tread-.13,face], [-2.1,tread-.13,face], '#645e53');
      strip(-2.1, 2.1, approach, face+8, tread-.09, BALLAST);
      for (let w = approach; w < face+7; w += .8)
        strip(-1.15, 1.15, w, w+.18, tread-.045, '#4c453f');
      for (const u of [-.7175,.7175]) strip(u-.065, u+.065, approach, face+8, tread, '#89877f');
      continue;
    }
    // Headwall: two piers and a lintel over the opening, with a coping.
    box(-h - 1.4, -h, y0, top, -0.4, 0.6, CONCRETE);
    box(h, h + 1.4, y0, top, -0.4, 0.6, CONCRETE);
    box(-h, h, m.railY + clear, top, -0.4, 0.6, CONCRETE);
    // A darker string course at the springing of the lintel.
    quad([-h, m.railY + clear + 0.05, -0.42], [h, m.railY + clear + 0.05, -0.42], [h, m.railY + clear + 0.35, -0.42], [-h, m.railY + clear + 0.35, -0.42], '#7f776b');
    // Short wing walls splay back toward the open track, stepping down to it like retaining walls.
    for (const s of [-1, 1]) {
      const u = s * (h + 1.4);
      for (let k = 0; k < 3; k++) {
        const w0 = -k * 1.8,
          w1 = -(k + 1) * 1.8,
          a = u + s * k * 0.45,
          b = u + s * (k + 1) * 0.45,
          ya = Math.max(m.railY + 0.6, top - ((top - m.railY) * k) / 3.2),
          yb = Math.max(m.railY + 0.6, top - ((top - m.railY) * (k + 1)) / 3.2);
        quad([a, y0, w0], [b, y0, w1], [b, yb, w1], [a, ya, w0], CONCRETE);
        quad([a, ya, w0], [b, yb, w1], [b + s * 0.4, yb, w1], [a + s * 0.4, ya, w0], COPING);
      }
    }
    // The tube: walls and roof fading to black, an end cap, and the ballast running in.
    for (let w = 0.6; w < TUBE; w += 1.5) {
      const w1 = Math.min(TUBE, w + 1.5),
        col = shade((w + w1) / 2);
      for (const u of [-h, h]) quad([u, y0, w], [u, m.railY + clear, w], [u, m.railY + clear, w1], [u, y0, w1], col);
      quad([-h, m.railY + clear, w], [h, m.railY + clear, w], [h, m.railY + clear, w1], [-h, m.railY + clear, w1], col);
      quad([-h, m.railY + 0.06, w], [-h, m.railY + 0.06, w1], [h, m.railY + 0.06, w1], [h, m.railY + 0.06, w], w < 4 ? BALLAST : shade(w1));
    }
    quad([-h, y0, TUBE], [h, y0, TUBE], [h, m.railY + clear, TUBE], [-h, m.railY + clear, TUBE], '#050505');
    // The terrain opening removes the ground over the first stretch of the tube. Close it with the
    // ground the board paints there, draped on the measured ground and never below
    // the tube roof, plus outer walls down to the cut, so nothing dark shows from above.
    const outer = h + SLOT_MARGIN + 0.1,
      zero = ground.manifest.vertical.sceneZeroNavd88M;
    // Draped on the ground at each corner (a cross-slope would otherwise bury one edge).
    const lid = (u: number, w: number) => {
      const [x, , z] = P(u, 0, w);
      const g = ground.sample(x, z);
      return Math.max(m.railY + clear + 0.35, terrainAt(x, z) ?? -Infinity, g === null ? m.coverY : g - zero) + 0.12;
    };
    const cols = [-outer, -outer / 2, 0, outer / 2, outer];
    for (let w = 0.6; w < SLOT_END; w += 1) {
      const w1 = Math.min(SLOT_END, w + 1);
      for (let c = 1; c < cols.length; c++) {
        const u0 = cols[c - 1],
          u1 = cols[c];
        const a = P(u0, lid(u0, w), w), b = P(u1, lid(u1, w), w);
        const c1 = P(u1, lid(u1, w1), w1), d = P(u0, lid(u0, w1), w1);
        if (terrainAt.triangles) {
          const point = ([x, y, z]: number[]) => [x, Math.max(y, (terrainAt(x, z) ?? -Infinity) + 0.12), z];
          const emit = (p: number[], q: number[], r: number[]) => body.tri(point(p), point(q), point(r), LID);
          drapeTriangle(terrainAt.triangles, a, b, c1, 0.12, emit);
          drapeTriangle(terrainAt.triangles, a, c1, d, 0.12, emit);
        } else body.quad(a, b, c1, d, LID);
      }
      for (const u of [-outer, outer]) quad([u, y0, w], [u, lid(u, w), w], [u, lid(u, w1), w1], [u, y0, w1], CONCRETE_SIDE);
    }
    for (let c = 1; c < cols.length; c++)
      quad([cols[c - 1], m.railY + clear, 0.6], [cols[c - 1], lid(cols[c - 1], 0.6), 0.6], [cols[c], lid(cols[c], 0.6), 0.6], [cols[c], m.railY + clear, 0.6], CONCRETE);
    // The ballast also covers the cut floor in front of the face, so no grass shows at the mouth.
    quad([-h - 1.4, m.railY + 0.05, -4], [-h - 1.4, m.railY + 0.05, 0.6], [h + 1.4, m.railY + 0.05, 0.6], [h + 1.4, m.railY + 0.05, -4], BALLAST);
  }
  const geometry = body.geometry();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  mesh.name = 'Downtown rail tunnel portals';
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.userData.heightTier = 'illustrative';
  // Far away only the headwalls and wing walls matter; the tube and ballast drop.
  const { keep } = orderForFar(geometry, colourDrop(geometry, [BALLAST, '#050505']));
  registerFar(mesh, keep);
  return mesh;
}

/**
 * A freight section that ends at a portal runs on a few metres into the tube, so a train is clipped
 * inside the dark, not at the face: it visibly enters and leaves.
 */
export function extendFreightIntoMouths(treads: FreightTreadPoint[][], mouths: readonly RailMouth[], depth = 8) {
  for (const section of treads) {
    if (section.length < 2) continue;
    for (const [i, sign] of [[0, -1], [section.length - 1, 1]] as const) {
      const p = section[i].position;
      const mouth = mouths.find((m) => Math.hypot(m.x - p.x, m.z - p.z) < m.half + 3);
      if (!mouth) continue;
      const step = new THREE.Vector3(mouth.dx, 0, mouth.dz).multiplyScalar(depth + (mouth.faceInset ?? 0));
      const ds = sign * (depth + (mouth.faceInset ?? 0)) * Math.sign(section[section.length - 1].s - section[0].s || 1);
      const point = { s: section[i].s + ds, position: p.clone().add(step) };
      point.position.y = p.y;
      if (i === 0) section.unshift(point);
      else section.push(point);
    }
  }
  return treads;
}
