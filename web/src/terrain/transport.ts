import * as THREE from 'three';
import { Builder, Line } from '../vignette/geom';
import { PAL } from '../vignette/world';
import type { GroundGrid } from './grid';
import { roadWidth, type TerrainCity, type TransportRun } from './transport-data';

type GroundAt = (x: number, z: number) => number | null;
export interface SurfaceTransport {
  group: THREE.Group;
  structuralTier: 'illustrative';
  dispose(): void;
}

// One texture period is 0.8 scene metres along track, and 4.2 metres across.
// Keeping the sleepers and steel in the tread avoids a box draw for each sleeper.
function freightTexture() {
  const w = 128, h = 16;
  const bytes = new Uint8Array(w * h * 4);
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const d = Math.abs(((col + 0.5) / w - 0.5) * 4.2);
      const rail = Math.abs(d - 0.7175) < 0.075;
      const sleeper = d < 1.35 && row < 5;
      const color = rail ? [166, 155, 140] : sleeper ? [82, 63, 51] : [126, 115, 99];
      bytes.set([...color, 255], (row * w + col) * 4);
    }
  }
  const map = new THREE.DataTexture(bytes, w, h);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapT = THREE.RepeatWrapping;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.anisotropy = 4;
  map.needsUpdate = true;
  return map;
}

/** Attach beside the terrain group. All heights use the board's shared scene zero. */
export function createSurfaceTransport(city: TerrainCity, grid: GroundGrid, groundAt: GroundAt): SurfaceTransport {
  const data = city.terrainTransport;
  if (data?.version !== 1) throw new Error('Missing scoped terrain transport. Run pnpm data:city.');
  const group = new THREE.Group();
  group.name = 'Surface transport';
  group.userData.structuralHeightTier = 'illustrative';
  const structures = new Builder(), freight = new Builder(), uv: number[] = [];
  const bounds = city.bounds;

  function draw(run: TransportRun, use: 'road' | 'freight' | 'tram') {
    if (run.pts.length < 2) return;
    const line = new Line(run.pts);
    if (!line.length) return;
    const bridge = run.kind === 'bridge';
    const h0 = bridge ? grid.sample(...run.pts[0]) : null;
    const h1 = bridge ? grid.sample(...run.pts[run.pts.length - 1]) : null;
    if (bridge && (h0 === null || h1 === null)) return;
    const sceneZero = grid.manifest.vertical.sceneZeroNavd88M;
    const width = use === 'road' ? roadWidth(run) : 4.2;
    // Keep original corners as well as intermediate terrain samples. A structural
    // tread follows a single chord between its two DEM endpoint proxies.
    const stations = [0];
    for (let i = 1; i < line.cum.length; i++) {
      if (!bridge) {
        for (let s = line.cum[i - 1] + 2; s < line.cum[i]; s += 2) stations.push(s);
      }
      if (line.cum[i] > line.cum[i - 1]) stations.push(line.cum[i]);
    }

    const seam = Math.min(width, line.length / 2);
    if (bridge) {
      stations.push(seam, line.length - seam);
      stations.sort((a, b) => a - b);
    }
    function strip(left: number, right: number, lift: number, color: string, depth = 0, textured = false) {
      const offsets = [left, right];
      const ends = bridge ? [0, line.length].map(s => {
        const p = line.at(s);
        return offsets.map(off => groundAt(
          THREE.MathUtils.clamp(p.x + off * p.nx, bounds.minX, bounds.maxX),
          THREE.MathUtils.clamp(p.z + off * p.nz, bounds.minZ, bounds.maxZ)));
      }) : [];
      let prev: number[][] | null = null, lastS = 0;
      for (const s of stations) {
        if (prev && s === lastS) continue;
        const p = line.at(s);
        const section: number[][] = [];
        for (const [i, offset] of offsets.entries()) {
          const x = THREE.MathUtils.clamp(p.x + offset * p.nx, bounds.minX, bounds.maxX);
          const z = THREE.MathUtils.clamp(p.z + offset * p.nz, bounds.minZ, bounds.maxZ);
          let y = bridge ? h0! + (h1! - h0!) * (s / line.length) - sceneZero : groundAt(x, z);
          if (y === null) break;
          if (bridge) {
            // Match the lateral grade of the approach just at the abutment. DEM
            // samples inside the freeway never set the height of the span.
            const end = s < line.length / 2 ? 0 : 1;
            const blend = Math.max(0, 1 - Math.min(s, line.length - s) / seam);
            const ref = end ? h1! : h0!;
            if (ends[end][i] !== null) y += blend * (ends[end][i]! - (ref - sceneZero));
          }
          section.push([x, y + lift, z]);
        }
        if (section.length < 2 || (!bridge && groundAt(p.x, p.z) === null)) { prev = null; continue; }
        if (prev) {
          const [a, b] = prev, [d, c] = section;
          // Upward-facing top, optionally with concrete or steel fascia on both sides.
          (textured ? freight : structures).quad(a, b, c, d, color);
          if (textured) uv.push(0, lastS / .8, 1, lastS / .8, 1, s / .8, 0, lastS / .8, 1, s / .8, 0, s / .8);
          if (depth) {
            const down = ([x, y, z]: number[]) => [x, y - depth, z];
            structures.quad(a, d, down(d), down(a), PAL.concreteDark);
            structures.quad(b, down(b), down(c), c, PAL.concreteDark);
            structures.quad(down(a), down(d), down(c), down(b), PAL.concreteDark);
          }
        }
        prev = section;
        lastS = s;
      }
    }

    if (use === 'freight') {
      strip(2.1, -2.1, 0.13, '#ffffff', bridge ? 0.85 : 0, true);
    } else if (use === 'tram') {
      for (const offset of [-0.7175, 0.7175]) {
        strip(offset + .12, offset - .12, .06, '#534e48');
        strip(offset + .045, offset - .045, .075, '#b6b5ae');
      }
    } else {
      const walkway = ['footway', 'pedestrian', 'steps', 'path', 'cycleway'].includes(run.cls);
      strip(width / 2, -width / 2, .12, walkway ? PAL.sidewalk : PAL.asphalt, walkway ? .4 : .95);
      if (!walkway && width >= 9) strip(.1, -.1, .15, PAL.lineYellow);
    }
  }

  for (const r of data.roads) if (r.kind === 'bridge') draw(r, 'road');
  for (const r of data.rail) draw(r, r.cls === 'tram' ? 'tram' : 'freight');
  const map = freightTexture();
  const meshes: THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>[] = [];
  for (const [builder, name] of [[structures, 'Decks and embedded rails'], [freight, 'Freight track']] as const) {
    if (!builder.pos.length) continue;
    const geometry = builder.geometry();
    const isFreight = builder === freight;
    if (isFreight) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide,
      map: isFreight ? map : null, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.castShadow = !isFreight; // The structural batch also contains the freight deck undersides.
    mesh.receiveShadow = true;
    group.add(mesh);
    meshes.push(mesh);
  }
  return { group, structuralTier: 'illustrative', dispose() {
    group.removeFromParent();
    for (const mesh of meshes) { mesh.geometry.dispose(); mesh.material.dispose(); }
    map.dispose();
    group.clear();
  } };
}
