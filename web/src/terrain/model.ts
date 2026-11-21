import * as THREE from 'three';
import { Builder, type P2 } from '../vignette/geom';
import { World, type VBuilding, type VData } from '../vignette/world';
import { GroundGrid } from './grid';

const options = { terrain: 'flat' as const, clumps: 6, lightMapMax: 2048 };

// Paint the ground to avoid spanning a depression with a flat road polygon.
function groundMap(data: VData) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 4096;
  const ctx = canvas.getContext('2d')!;
  const b = data.bounds;
  ctx.scale(canvas.width / (b.maxX - b.minX), canvas.height / (b.maxZ - b.minZ));
  ctx.translate(-b.minX, -b.minZ);
  ctx.fillStyle = '#cec9ac';
  ctx.fillRect(b.minX, b.minZ, b.maxX - b.minX, b.maxZ - b.minZ);
  function trace(points: P2[]) {
    points.forEach(([x, z], i) => i === 0 ? ctx.moveTo(x, z) : ctx.lineTo(x, z));
  }
  const covers: Record<string, string> = { parking: '#a9a59a', pedestrian: '#e3d6bf', grass: '#b7c298',
    garden: '#aabe91', park: '#adbe90', pitch: '#93ad88', construction: '#cfb295' };
  for (const g of data.ground ?? []) {
    if (!covers[g.kind]) continue;
    ctx.beginPath();
    for (const ring of g.rings) { trace(ring); ctx.closePath(); }
    ctx.fillStyle = covers[g.kind];
    ctx.fill('evenodd');
  }
  const widths: Record<string, number> = { motorway: 14, trunk: 14, primary: 13, secondary: 11,
    tertiary: 9, residential: 7, service: 4, pedestrian: 4, footway: 2 };
  for (const r of data.roads) {
    if (r.bridge || r.tunnel) continue;
    ctx.beginPath();
    trace(r.pts);
    ctx.lineWidth = widths[r.cls] ?? 4;
    ctx.strokeStyle = r.cls === 'footway' || r.cls === 'pedestrian' ? '#e7dfca' : '#84827c';
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function terrainModel(grid: GroundGrid, city: VData) {
  const { cols, rows, bounds: b, stepM, vertical } = grid.manifest;
  for (const key of ['minX', 'maxX', 'minZ', 'maxZ'] as const) {
    if (city.bounds[key] !== b[key]) throw new Error('City and ground extents differ');
  }
  const geometry = new THREE.PlaneGeometry(b.maxX - b.minX, b.maxZ - b.minZ, cols - 1, rows - 1);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate((b.minX + b.maxX) / 2, 0, (b.minZ + b.maxZ) / 2);
  const pos = geometry.getAttribute('position');
  const known = new Uint8Array(cols * rows);
  let bottom = Infinity;
  for (let i = 0; i < pos.count; i++) {
    const h = grid.node(Math.floor(i / cols), i % cols);
    if (h === null) continue;
    known[i] = 1;
    const y = h - vertical.sceneZeroNavd88M;
    pos.setY(i, y);
    bottom = Math.min(bottom, y);
  }
  if (!Number.isFinite(bottom)) throw new Error('Ground grid is empty');
  const indices = geometry.index!.array;
  if (known.includes(0)) {
    const valid: number[] = [];
    for (let i = 0; i < indices.length; i += 3) {
      const [a, b, c] = indices.subarray(i, i + 3);
      if (known[a] && known[b] && known[c]) valid.push(a, b, c);
    }
    geometry.setIndex(valid);
  }
  geometry.computeVertexNormals();
  const material = new THREE.MeshLambertMaterial({ map: groundMap(city) });
  // Draw true 2 m contours on the interpolated triangle surface, antialiased in screen space.
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying float vGroundM;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>', `#include <begin_vertex>\n vGroundM = position.y + ${vertical.sceneZeroNavd88M.toFixed(4)};`);
    shader.fragmentShader = 'varying float vGroundM;\n' + shader.fragmentShader.replace(
      '#include <map_fragment>', `#include <map_fragment>
       float widthM = max(fwidth(vGroundM), 0.0001);
       float distM = abs(fract(vGroundM / 2.0 + 0.5) - 0.5) * 2.0;
       float contour = (1.0 - smoothstep(0.25, 1.5, distM / widthM))
         * smoothstep(0.0001, 0.01, widthM) * (1.0 - smoothstep(0.3, 1.0, widthM));
       diffuseColor.rgb *= mix(vec3(1.0), vec3(0.48, 0.55, 0.50), contour);`);
  };
  const surface = new THREE.Mesh(geometry, material);
  surface.receiveShadow = true;
  const sides = new Builder();
  bottom -= stepM;
  function edge(a: number, b: number) {
    if (!known[a] || !known[b]) return;
    sides.quad([pos.getX(a), bottom, pos.getZ(a)], [pos.getX(b), bottom, pos.getZ(b)],
      [pos.getX(b), pos.getY(b), pos.getZ(b)], [pos.getX(a), pos.getY(a), pos.getZ(a)], '#b59676');
  }
  for (let c = 1; c < cols; c++) { edge(c - 1, c); edge(pos.count - c, pos.count - c - 1); }
  for (let r = 1; r < rows; r++) { edge((r - 1) * cols, r * cols); edge(r * cols - 1, (r + 1) * cols - 1); }
  surface.add(new THREE.Mesh(sides.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
  return surface;
}

export function cityScenery(grid: GroundGrid, city: VData, trees: [number, number, number, number][]) {
  const group = new THREE.Group();
  const zero = grid.manifest.vertical.sceneZeroNavd88M;
  // Reuse the City facade/roof meshes. Group by base metre to keep draw calls bounded.
  const layers = new Map<number, VBuilding[]>();
  for (const building of city.buildings) {
    const heights = building.rings[0].map(([x, z]) => grid.sample(x, z));
    if (!heights.length || heights.some(h => h === null)) continue;
    const base = Math.floor(Math.min(...heights as number[]) - zero);
    if (!layers.has(base)) layers.set(base, []);
    layers.get(base)!.push(building);
  }
  for (const [base, buildings] of layers) {
    const world = new World({ ...city, buildings }, null, options);
    world.buildBuildings();
    world.group.position.y = base;
    group.add(world.group);
  }
  class TerrainTrees extends World {
    override ground(x: number, z: number) { return grid.sample(x, z)! - zero; }
  }
  const grove = new TerrainTrees(city, null, options);
  grove.realTrees = trees.filter(([x, z]) => grid.sample(x, z) !== null);
  grove.buildTrees();
  grove.setSeason(180);
  group.add(grove.group);
  return group;
}
