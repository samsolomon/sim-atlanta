/**
 * Dockside, Piedmont Park's 1910 rest house by the 12th Street entrance, now the Visitor Center
 * (docs/piedmont-details.md). The footprint is reported (OSM way 182302101). Everything else is
 * estimated from Street View (cited, not copied):
 *  - from the south-west, April 2017: one storey of red brick with cream classical trim, seven
 *    round arches along the west loggia, pedimented window surrounds and a white balustraded parapet
 *    over a flat roof
 *    (https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.78395,-84.37772&heading=45&pitch=8&fov=90);
 *  - from the north-east, May 2015: the lake side has a white-columned porch with a low roof on a
 *    brick terrace, and round-arched windows in the brick block
 *    (https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.78425,-84.37730&heading=230&pitch=5&fov=90).
 * No night photograph found: at night the arches and porch glow faintly, as an open public
 * building's would (illustrative). The roof is a low slate hip behind the parapet (Flickr, Marc
 * Merlin, Dec 2015: https://www.flickr.com/photos/marcmerlin/22918112184); the cornice height of
 * about 4 m is scaled from a golf cart in that photograph (estimate). Reuses the Clara Meer materials: no new shader program.
 */
import * as THREE from 'three';
import { Builder, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';

export const docksideId = 'osm:way:182302101';
type Ground = (x: number, z: number) => number | null;

const BRICK = '#a4503d', TRIM = '#ece5d3', ROOF = '#4d5560', PORCH_ROOF = '#c9c6bf', OPENING = '#33302c', TERRACE = '#9a5442';
// Footprint corners (OSM), west face x ≈ 1298, east face x ≈ 1311.
const SW: P2 = [1298.5, -3344.6], SE: P2 = [1311, -3344.3], NE: P2 = [1311.5, -3366.0], NW: P2 = [1298.5, -3366.3];
const WALL = 4.0, PARAPET = .9, PORCH = 3.6;

export function createDockside(buildings: VBuilding[], site: VBuilding, _base: number | null, ground: Ground) {
  if (site.id !== docksideId) return null;
  const heights = [SW, SE, NE, NW].map(([x, z]) => ground(x, z));
  if (heights.some(h => h === null)) return null;
  const grade = Math.min(...(heights as number[])), y1 = grade + WALL, y2 = y1 + PARAPET;
  const stone = new Builder(), lit = new Builder();
  const ring: P2[] = [SW, SE, NE, NW];
  const cx = ring.reduce((a, p) => a + p[0], 0) / 4, cz = ring.reduce((a, p) => a + p[1], 0) / 4;
  const lerp = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  for (let i = 0; i < 4; i++) {
    const p = ring[i], q = ring[(i + 1) % 4];
    // Brick walls, a cream cornice band and the white parapet above the flat roof.
    stone.quad([p[0], grade - .4, p[1]], [q[0], grade - .4, q[1]], [q[0], y1 - .5, q[1]], [p[0], y1 - .5, p[1]], BRICK);
    stone.quad([p[0], y1 - .5, p[1]], [q[0], y1 - .5, q[1]], [q[0], y1, q[1]], [p[0], y1, p[1]], TRIM);
    stone.quad([p[0], y1, p[1]], [q[0], y1, q[1]], [q[0], y2, q[1]], [p[0], y2, p[1]], TRIM);
    // Openings: a row of round arches on the west face, arched windows elsewhere.
    let nx = q[1] - p[1], nz = p[0] - q[0];
    const m = lerp(p, q, .5);
    if (nx * (m[0] - cx) + nz * (m[1] - cz) < 0) { nx = -nx; nz = -nz; }
    const nl = Math.hypot(nx, nz), len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const out = (t: number, h: number) => { const a = lerp(p, q, t); return [a[0] + nx / nl * .06, grade + h, a[1] + nz / nl * .06]; };
    const pane = (t0: number, t1: number, h0: number, h1: number, arch: number) => {
      const A = out(t0, h0), B = out(t1, h0), C = out(t1, h1), D = out(t0, h1);
      const facing = (B[2] - A[2]) * -nx + (B[0] - A[0]) * nz;
      const quad = (a: number[], b: number[], c: number[], d: number[]) => facing > 0 ? lit.quad(a, b, c, d, OPENING) : lit.quad(a, d, c, b, OPENING);
      quad(A, B, C, D);
      for (let k = 0; k < 4 && arch > 0; k++) {
        const u0 = k / 4 * Math.PI, u1 = (k + 1) / 4 * Math.PI, w = (t1 - t0) / 2, tc = (t0 + t1) / 2;
        const T = out(tc, h1), U = out(tc - Math.cos(u0) * w, h1 + Math.sin(u0) * arch), V = out(tc - Math.cos(u1) * w, h1 + Math.sin(u1) * arch);
        lit.tri(T, U, V, OPENING); lit.tri(T, V, U, OPENING);
      }
    };
    const west = Math.abs(p[0] - 1298.5) < 1 && Math.abs(q[0] - 1298.5) < 1;
    // Seven arches on the west loggia (photographs); a window or two elsewhere.
    const n = west ? 7 : Math.max(2, Math.floor(len / 4.5));
    for (let k = 0; k < n; k++) {
      // Arcade bays about 70% of their slot; windows 1.4 m wide. Round heads, radius half the width.
      const w = west ? len / n * .7 : 1.4, tc = (k + .5) / n, t0 = tc - w / len / 2, t1 = tc + w / len / 2;
      pane(t0, t1, west ? .3 : 1.0, west ? 2.2 : 2.4, w / 2);
    }
  }
  // A low hipped roof in dark blue-grey slate behind the parapet (photographs of the west front).
  const rise = 2.2, k = (Math.hypot(SE[0] - SW[0], SE[1] - SW[1]) / 2) / Math.hypot(NW[0] - SW[0], NW[1] - SW[1]);
  const mS = lerp(SW, SE, .5), mN = lerp(NW, NE, .5), rS = lerp(mS, mN, k), rN = lerp(mN, mS, k);
  stone.quad([SW[0], y1, SW[1]], [rS[0], y1 + rise, rS[1]], [rN[0], y1 + rise, rN[1]], [NW[0], y1, NW[1]], ROOF);
  stone.quad([SE[0], y1, SE[1]], [NE[0], y1, NE[1]], [rN[0], y1 + rise, rN[1]], [rS[0], y1 + rise, rS[1]], ROOF);
  stone.tri([SW[0], y1, SW[1]], [SE[0], y1, SE[1]], [rS[0], y1 + rise, rS[1]], ROOF);
  stone.tri([NE[0], y1, NE[1]], [NW[0], y1, NW[1]], [rN[0], y1 + rise, rN[1]], ROOF);
  // Lake-side porch: a brick terrace, white columns and a low hipped roof along the east face.
  const e0: P2 = [SE[0] + .2, SE[1] - 2], e1: P2 = [NE[0] + .2, NE[1] + 2];
  const o0: P2 = [e0[0] + PORCH, e0[1]], o1: P2 = [e1[0] + PORCH, e1[1]];
  const ty = grade + .6, py = grade + 3.4;
  stone.quad([e0[0], ty, e0[1]], [o0[0], ty, o0[1]], [o1[0], ty, o1[1]], [e1[0], ty, e1[1]], TERRACE);
  for (const [a, b] of [[e0, o0], [o0, o1], [o1, e1]] as [P2, P2][])
    stone.quad([a[0], grade - .4, a[1]], [b[0], grade - .4, b[1]], [b[0], ty, b[1]], [a[0], ty, a[1]], BRICK);
  for (let k = 0; k <= 5; k++) {
    const [x, z] = lerp(o0, o1, k / 5);
    stone.box(.35, py - ty, .35, x - .3, (ty + py) / 2, z, TRIM);
  }
  const ridge0: P2 = [e0[0] + PORCH * .35, e0[1] - 1.2], ridge1: P2 = [e1[0] + PORCH * .35, e1[1] + 1.2];
  const eave = (p: P2, dx: number, dz: number): P2 => [p[0] + dx, p[1] + dz];
  const [r0, r1, r2, r3] = [eave(e0, 0, .5), eave(o0, .5, .5), eave(o1, .5, -.5), eave(e1, 0, -.5)];
  stone.quad([r1[0], py, r1[1]], [r2[0], py, r2[1]], [ridge1[0], py + 1.2, ridge1[1]], [ridge0[0], py + 1.2, ridge0[1]], PORCH_ROOF);
  stone.tri([r0[0], py, r0[1]], [r1[0], py, r1[1]], [ridge0[0], py + 1.2, ridge0[1]], PORCH_ROOF);
  stone.tri([r2[0], py, r2[1]], [r3[0], py, r3[1]], [ridge1[0], py + 1.2, ridge1[1]], PORCH_ROOF);
  // The porch ceiling glows faintly at night.
  lit.quad([e0[0], py - .02, e0[1]], [e1[0], py - .02, e1[1]], [o1[0], py - .02, o1[1]], [o0[0], py - .02, o0[1]], OPENING);

  const group = new THREE.Group();
  group.name = 'dockside';
  // The columned lake porch stands outside the OSM outline (Street View, May 2015): 3.6 m deep
  // with its eaves, about 4.3 m out.
  group.userData.footprint = { maxProjection: 4.5 };
  const make = (b: Builder, material: THREE.MeshLambertMaterial) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, material);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  };
  // The Clara Meer materials exactly (same programs).
  make(stone, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  const windowMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#ffc887', emissiveIntensity: 0 });
  make(lit, windowMaterial);
  return {
    buildings: buildings.filter(b => b.id !== site.id),
    group,
    triangles: (stone.pos.length + lit.pos.length) / 9,
    setNight(night: number) { windowMaterial.emissiveIntensity = night * 1.2; },
  };
}
