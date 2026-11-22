import * as THREE from 'three';
import { Builder, rng } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';

/** City scene metres; west to east, from face to face. bedY excludes the rail offset. */
export interface FloydSample { x: number; z: number; bedY: number }

const BASE_ID = '4a81824b-9095-406e-8c5d-60b4b8bf12fd';
const ORIGIN = [494.26, 380.34]; // NW tower, north corner, City x/z.
const angle = Math.atan2(455.51 - ORIGIN[1], 582.33 - ORIGIN[0]);
const ux = Math.cos(angle), uz = Math.sin(angle);
const DEPTH = 62.1;
const HALF_OPENING = 9;
const stone = '#bf9d77', pier = '#c9b18d', trim = '#ded1b8', glass = '#38434b';
type GroundAt = (x: number, z: number) => number | null;

function local(x: number, z: number) {
  const dx = x - ORIGIN[0], dz = z - ORIGIN[1];
  return { u: dx * ux + dz * uz, v: -dx * uz + dz * ux };
}

/** Three bays face the plaza. The longer returns have eight. Eighteen glazed levels
 * above the two-level base express the documented twenty storeys. */
function tower(b: Builder, lit: Builder, u: number, width: number, bottom: number, top: number) {
  const mid = u + width / 2, crown = 4.4, sill = 0.9;
  const pitch = (top - bottom - crown - sill) / 18;
  b.box(width - 0.7, top - bottom, DEPTH - 0.7, mid, (bottom + top) / 2, DEPTH / 2, glass);
  for (let i = 0; i < 18; i++) {
    const band = pitch * 0.45;
    b.box(width, band, DEPTH, mid, bottom + sill + i * pitch + band / 2, DEPTH / 2, stone);
  }
  b.box(width, crown, DEPTH, mid, top - crown / 2, DEPTH / 2, stone);
  for (const v of [0, DEPTH]) {
    for (let bay = 0; bay <= 3; bay++) {
      b.box(1, top - bottom, 0.8, u + 0.5 + (width - 1) * bay / 3, (top + bottom) / 2, v, pier);
    }
  }
  for (const face of [u, u + width]) {
    for (let bay = 0; bay <= 8; bay++) {
      b.box(0.8, top - bottom, 1, face, (top + bottom) / 2, 0.5 + (DEPTH - 1) * bay / 8, pier);
    }
  }
  const random = rng(u === 0 ? 537007595 : 537007597);
  // Glazing sits behind the masonry. A vertical mullion can span all floors:
  // the protruding spandrels conceal it between windows.
  for (const face of [
    { bays: 3, span: width, point: (d: number, y: number) => [u + d, y, 0.32] },
    { bays: 3, span: width, point: (d: number, y: number) => [u + d, y, DEPTH - 0.32] },
    { bays: 8, span: DEPTH, point: (d: number, y: number) => [u + 0.32, y, d] },
    { bays: 8, span: DEPTH, point: (d: number, y: number) => [u + width - 0.32, y, d] },
  ]) {
    const paneWidth = face.span / face.bays / 5;
    for (let bay = 0; bay < face.bays; bay++) {
      for (let pane = 1; pane < 5; pane++) {
        const d = (bay * 5 + pane) * paneWidth;
        b.quad(face.point(d - 0.045, bottom), face.point(d + 0.045, bottom),
          face.point(d + 0.045, top - crown), face.point(d - 0.045, top - crown), '#736f68');
      }
      for (let floor = 0; floor < 18; floor++) {
        if (random() > 0.36) continue;
        const first = Math.floor(random() * 3);
        const count = random() > 0.55 ? 3 : 2;
        const color = random() > 0.4 ? '#dab688' : '#c5bba4';
        const sillY = bottom + sill + (floor + 0.45) * pitch;
        for (let pane = first; pane < first + count; pane++) {
          const d = (bay * 5 + pane) * paneWidth;
          const lo = d + (pane === 0 ? 0.65 : 0.09);
          const hi = d + paneWidth - (pane === 4 ? 0.65 : 0.09);
          lit.quad(face.point(lo, sillY + 0.08), face.point(hi, sillY + 0.08),
            face.point(hi, sillY + pitch * 0.55 - 0.08), face.point(lo, sillY + pitch * 0.55 - 0.08), color);
        }
      }
    }
  }
  // Aerial: pale flat roof with a narrow row of darker rooftop bays on the inner side.
  b.box(width, 0.35, DEPTH, mid, top, DEPTH / 2, trim);
  const service = u === 0 ? u + width - 4.4 : u + 4.4;
  for (let i = 0; i < 6; i++) {
    b.box(5, 0.7, 7.6, service, top + 0.5, 6 + i * 9.8, '#827767');
  }
}

/** Build only when both the generic base and a registered Floyd rail passage exist.
 * The caller uses the returned buildings for generic batching and owns the returned mesh. */
export function createFloyd(buildings: VBuilding[], passage: readonly FloydSample[], groundAt: GroundAt) {
  if (!buildings.some(b => b.id === BASE_ID) || passage.length < 2) return null;
  const pts = passage.map(p => ({ ...p, ...local(p.x, p.z) }));
  const first = pts[0], last = pts[pts.length - 1];
  // Reject stale/reversed/singular corridors instead of suppressing a valid generic building.
  if (Math.abs(first.u) > 20 || Math.abs(last.u - 115.8) > 20 ||
      pts.some((p, i) => !Number.isFinite(p.u + p.v + p.bedY) ||
        Math.abs(p.v - 8) > 15 || (i > 0 && p.u <= pts[i - 1].u))) return null;
  const soffitY = Math.max(...pts.map(p => p.bedY)) + 6.4;
  const deckY = soffitY + 2.2;
  const b = new Builder();
  // Three longitudinal solids: the wings on either side of the trains, and a lintel
  // above them. No floor, transverse wall, or face closes either end of the void.
  let prev: number[][][] | undefined;
  let dx = 0, dz = 0;
  for (const [i, p] of pts.entries()) {
    const a = pts[Math.max(0, i - 1)], c = pts[Math.min(i + 1, pts.length - 1)];
    const length = Math.hypot(c.x - a.x, c.z - a.z);
    dx = (c.x - a.x) / length; dz = (c.z - a.z) / length;
    const du = -dz * ux + dx * uz, dv = dz * uz + dx * ux;
    if (dv < 0.7) return null;
    const outerN = Math.min(-HALF_OPENING - 1.2, -p.v / dv);
    const outerS = (DEPTH - p.v) / dv;
    const bottomAt = (n: number) => Math.min(p.bedY, groundAt(p.x - dz*n, p.z + dx*n) ?? p.bedY) - 1;
    const bottom = Math.min(bottomAt(outerN), bottomAt(outerS));
    const point = (n: number, y: number) => [p.u + du*n, y, p.v + dv*n];
    const rect = (n0: number, n1: number, y0: number, y1: number) =>
      [point(n0,y0), point(n1,y0), point(n1,y1), point(n0,y1)];
    const sections = [rect(outerN,-HALF_OPENING,bottom,deckY), rect(HALF_OPENING,outerS,bottom,deckY),
      rect(-HALF_OPENING,HALF_OPENING,soffitY,deckY)];
    for (const [j, s] of sections.entries()) {
      if (!prev) b.quad(s[0], s[1], s[2], s[3], stone);
      else {
        for (let k = 0; k < 4; k++) {
          const l = (k + 1) % 4;
          const col = k === 2 ? trim : j === 2 && k === 0 ? '#887d71' : stone;
          b.quad(prev[j][k], s[k], s[l], prev[j][l], col);
        }
      }
      if (i === pts.length - 1) b.quad(s[3], s[2], s[1], s[0], stone);
    }
    prev = sections;
  }
  // Both crowns share a level. 78.4 m is an unverified OSM height above the plaza datum.
  const plazaY = groundAt(ORIGIN[0] + ux*58 - uz*DEPTH, ORIGIN[1] + uz*58 + ux*DEPTH) ?? first.bedY;
  const crownY = plazaY + 78.4;
  const lit = new Builder();
  tower(b, lit, 0, 31.2, deckY, crownY);
  tower(b, lit, 84.1, 31.7, deckY, crownY);
  // Recessed plaza-facing strip and coping under the sky gap between the slabs.
  b.box(52.9, 1.5, 0.18, 57.65, deckY - 1.45, DEPTH + 0.1, glass);
  b.box(52.9, 0.45, 0.65, 57.65, deckY + 0.05, DEPTH, trim);
  const geometry = b.geometry();
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Floyd towers and station passage';
  mesh.castShadow = mesh.receiveShadow = true;
  const officeGeometry = lit.geometry();
  const officeMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    transparent: true, depthWrite: false, forceSinglePass: true,
  });
  const offices = new THREE.Mesh(officeGeometry, officeMaterial);
  offices.name = 'Floyd office windows';
  offices.visible = false;
  const group = new THREE.Group();
  group.rotation.y = -angle;
  group.position.set(ORIGIN[0], 0, ORIGIN[1]);
  group.add(mesh, offices);
  return {
    group, buildings: buildings.filter(b => b.id !== BASE_ID),
    eastFace: { x: last.x, z: last.z, bedY: last.bedY, dx, dz, soffitY, clearWidthM: 2 * HALF_OPENING },
    setNight(dark: number) {
      offices.visible = dark > 0.01;
      officeMaterial.color.setScalar(0.72 * Math.min(1, Math.max(0, dark)));
    },
    dispose() {
      group.removeFromParent();
      geometry.dispose(); material.dispose();
      officeGeometry.dispose(); officeMaterial.dispose();
    },
  };
}
