import * as THREE from 'three';
import { rng } from '../vignette/geom';
import type { Traveller } from './walkways';

type Vertex = [number, number, number];
type GroundAt = (x: number, z: number) => number | null;

// The 36 m ground sidewalk stops at the mapped bridge beside Mangum Street.
// Match the verified run so changes to the bake cannot plant a different trail.
export function createTrailPlanting(people: Traveller[], ground: GroundAt, low: boolean) {
  const way = people.find(({ way }) => {
    if (!way.trail) return false;
    const pts = way.line.pts, a = pts[0], b = pts[pts.length - 1];
    return Math.hypot(a[0] + 806.32, a[1] + 1089.27) < .5 &&
      Math.hypot(b[0] + 771.01, b[1] + 1093.55) < .5;
  })?.way;
  if (!way) return null;

  const random = rng(6092);
  const positions: number[] = [], colors: number[] = [];
  const clumps: { phase: number; tips: { index: number; weight: number }[] }[] = [];
  const color = new THREE.Color();
  function triangle(a: Vertex, b: Vertex, c: Vertex, shade: string) {
    positions.push(...a, ...b, ...c);
    color.set(shade);
    for (let i = 0; i < 3; i++) colors.push(color.r, color.g, color.b);
  }
  const shades = ['#89904f', '#a49c62', '#7d8447', '#aba16b'];
  // Short drifts with open turf between them, as on the Connector verge.
  const tufts: number[] = [];
  for (let s = way.from + 2; s < way.to - 1; s += 2.5 + random() * 3.4) {
    const count = 2 + Math.floor(random() * 4);
    for (let i = 0; i < count && s < way.to - 1; i++, s += .4 + random() * .65) tufts.push(s);
  }
  for (const s of tufts) {
    const p = way.line.at(s), offset = 2.1 + random() * 1.25;
    const x = p.x - p.nx * offset, z = p.z - p.nz * offset;
    const height = .41 + random() * .46, rotation = random() * Math.PI;
    const clump = { phase: s * .19, tips: [] as { index: number; weight: number }[] };
    for (let blade = 0; blade < 7; blade++) {
      const angle = rotation + blade * Math.PI * 2 / 7;
      const dx = Math.cos(angle), dz = Math.sin(angle);
      const reach = .26 + random() * .35, width = .09 + random() * .065;
      const h = height * (.72 + random() * .28), shade = shades[Math.floor(random() * shades.length)];
      if (low && blade % 2 === 1) continue;
      const rx = x + dx * .08, rz = z + dz * .08;
      const lx = rx - dz * width, lz = rz + dx * width;
      const bx = rx + dz * width, bz = rz - dx * width;
      const leftY = ground(lx, lz), rightY = ground(bx, bz);
      if (leftY === null || rightY === null) continue;
      const y = (leftY + rightY) / 2;
      const footL: Vertex = [lx, leftY, lz], footR: Vertex = [bx, rightY, bz];
      const midL: Vertex = [rx + dx * reach * .30 - dz * width * .6, y + h * .62, rz + dz * reach * .30 + dx * width * .6];
      const midR: Vertex = [rx + dx * reach * .30 + dz * width * .6, y + h * .62, rz + dz * reach * .30 - dx * width * .6];
      const tip: Vertex = [rx + dx * reach + .14, y + h, rz + dz * reach];
      const first = positions.length / 3;
      triangle(footL, footR, midR, shade);
      triangle(footL, midR, midL, shade);
      triangle(midL, midR, tip, shade);
      for (const i of [2, 4, 5, 6, 7]) clump.tips.push({ index: first + i, weight: .25 });
      clump.tips.push({ index: first + 8, weight: 1 });
    }
    if (clump.tips.length) clumps.push(clump);
  }
  if (!clumps.length) return null;

  // Broken patches of earth along the grass side of the paving. Sample all
  // three corners on the actual board, including where the verge slopes.
  for (let s = way.from + 1; s < way.to - 1; s += 1.2 + random() * 1.9) {
    const p = way.line.at(s), offset = 1.34 + random() * .5, length = .20 + random() * .46;
    const x = p.x - p.nx * offset, z = p.z - p.nz * offset;
    const corners: Vertex[] = [];
    for (const [along, across] of [[-length, 0], [0, .13 + random() * .1], [length, -.02]]) {
      const cx = x + along * p.dx - across * p.nx, cz = z + along * p.dz - across * p.nz;
      const y = ground(cx, cz);
      if (y !== null) corners.push([cx, y + .018, cz]);
    }
    if (corners.length === 3) triangle(corners[0], corners[1], corners[2], '#a9a382');
  }

  const geometry = new THREE.BufferGeometry();
  const rest = new Float32Array(positions);
  const pos = new THREE.Float32BufferAttribute(rest.slice(), 3).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', pos);
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const sphere = geometry.boundingSphere!;
  sphere.radius += .12; // include the bent tips for frustum culling
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide,
    transparent: true, depthWrite: false, forceSinglePass: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Westside Connector grass study';
  mesh.receiveShadow = true;
  mesh.visible = false;
  let lastTick = NaN;
  return {
    mesh,
    update(ms: number, camera: THREE.PerspectiveCamera, viewportHeight: number, reduceMotion: boolean) {
      const metresPerPixel = 2 * camera.position.distanceTo(sphere.center) *
        Math.tan(THREE.MathUtils.degToRad(camera.fov * .5)) / Math.max(1, viewportHeight);
      const cutoff = low ? .16 : .20;
      material.opacity = 1 - THREE.MathUtils.smoothstep(metresPerPixel, cutoff * .60, cutoff);
      mesh.visible = material.opacity > 0;
      if (!mesh.visible) return;
      const step = low ? 80 : 40;
      const tick = reduceMotion ? -Infinity : Math.floor(ms / step);
      if (tick === lastTick) return;
      lastTick = tick;
      const t = reduceMotion ? 0 : ((tick * step) % 24000) * Math.PI / 12000;
      for (const clump of clumps) {
        const gust = reduceMotion ? 0 : .061 * Math.sin(3 * t + clump.phase) + .025 * Math.sin(5 * t + clump.phase * .6);
        for (const { index, weight } of clump.tips) {
          pos.setX(index, rest[3 * index] + gust * weight);
          pos.setZ(index, rest[3 * index + 2] + gust * weight * .31);
        }
      }
      pos.needsUpdate = true;
    },
    dispose() { mesh.removeFromParent(); geometry.dispose(); material.dispose(); },
  };
}
