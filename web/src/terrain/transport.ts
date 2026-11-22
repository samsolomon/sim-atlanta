import * as THREE from 'three';
import { Builder, Line, segDist, type P2 } from '../vignette/geom';
import { PlacementIndex } from '../vignette/spatial';
import { PAL } from '../vignette/world';
import type { GroundGrid } from './grid';
import { roadWidth, type TerrainCity, type TransportRun } from './transport-data';

type GroundAt = (x: number, z: number) => number | null;
export interface FreightTreadPoint {
  s: number;
  position: THREE.Vector3;
}
export interface SurfaceTransport {
  freightTreads: FreightTreadPoint[][];
  /** Scene y on the specified road deck, or null outside its visible tread. */
  deckAt(x: number, z: number, run: TransportRun): number | null;
  clearOfFreight(x: number, z: number): boolean;
  group: THREE.Group;
  structuralTier: 'illustrative';
  dispose(): void;
}

// Interpolate on the same triangle as the GPU. A bridge end can be banked on
// one edge, so interpolating across its full quad would give a different height.
function triangleHeight(p: THREE.BufferAttribute, i: number, x: number, z: number) {
  const ax = p.getX(i), az = p.getZ(i);
  const bx = p.getX(i + 1) - ax, bz = p.getZ(i + 1) - az;
  const cx = p.getX(i + 2) - ax, cz = p.getZ(i + 2) - az;
  const det = bx * cz - bz * cx;
  if (Math.abs(det) < 1e-8) return null;
  const u = ((x - ax) * cz - (z - az) * cx) / det;
  const v = (bx * (z - az) - bz * (x - ax)) / det;
  if (u < -1e-7 || v < -1e-7 || u + v > 1 + 1e-7) return null;
  return (1 - u - v) * p.getY(i) + u * p.getY(i + 1) + v * p.getY(i + 2);
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
export function createSurfaceTransport(city: TerrainCity, grid: GroundGrid, terrainGround: GroundAt,
  cut?: { freight: TransportRun; treadY: number }): SurfaceTransport {
  const data = city.terrainTransport;
  if (data?.version !== 1) throw new Error('Missing scoped terrain transport. Run pnpm data:city.');
  const group = new THREE.Group();
  group.name = 'Surface transport';
  group.userData.structuralHeightTier = 'illustrative';
  const structures = new Builder(), freight = new Builder(), uv: number[] = [];
  const bounds = city.bounds;
  const freightTreads: FreightTreadPoint[][] = [];
  // Offsets into the single rendered structural mesh, grouped by source road.
  const roadTreads = new Map<TransportRun, number[]>();
  let structurePositions: THREE.BufferAttribute;
  function deckAt(x: number, z: number, run: TransportRun) {
    const quads = roadTreads.get(run);
    if (quads) for (const i of quads) {
      const h = triangleHeight(structurePositions, i, x, z) ?? triangleHeight(structurePositions, i + 3, x, z);
      if (h !== null) return h;
    }
    return null;
  }
  // A 3.2 m locomotive, the 2.2 × 2.6 m column on its diagonal and a small margin.
  const pierClearanceM = 3.8;
  const freightSegments = new PlacementIndex<[P2, P2]>();
  for (const run of data.rail) {
    if (run.cls !== 'standard_gauge') continue;
    for (let i = 1; i < run.pts.length; i++) {
      const segment: [P2, P2] = [run.pts[i - 1], run.pts[i]];
      freightSegments.add(segment, segment, pierClearanceM);
    }
  }
  const clearOfFreight = (x: number, z: number) =>
    freightSegments.at(x, z).every(([a, b]) => segDist(x, z, a, b) >= pierClearanceM);

  // West to east: intact rail approaches beyond Piedmont, between Jesse Hill and
  // the freeway, and east of the freeway. Bare earth inside the highway and the
  // Georgia State structures is several metres below the railway. The grade between
  // these bank proxies is schematic. Adjacent freight tracks share the embankment.
  const banks = [[444.07, 321.30], [647.51, 473.99], [866.02, 541.33]].map(([x, z]) =>
    ({ x, z, h: grid.sample(x, z) }));
  const gradeAvailable = data.rail.some(r => r.freightS) && banks.every(bank => bank.h !== null);
  function freightGrade(x: number, z: number, base: number) {
    if (!gradeAvailable || x <= banks[0].x || x >= banks[2].x) return base;
    const i = x < banks[1].x ? 0 : 1;
    const a = banks[i], b = banks[i + 1];
    const fraction = (x - a.x) / (b.x - a.x);
    // The other freight and passenger corridors retain their own structural profiles.
    if (Math.abs(z - (a.z + fraction * (b.z - a.z))) > 42) return base;
    const grade = a.h! + fraction * (b.h! - a.h!) - grid.manifest.vertical.sceneZeroNavd88M;
    const blend = Math.min(1, (x - banks[0].x) / 15, (banks[2].x - x) / 15);
    return base + blend * Math.max(0, grade - base);
  }

  function draw(run: TransportRun, use: 'road' | 'freight' | 'tram') {
    if (run.pts.length < 2) return;
    // Only this matched freight strip shares the illustrative bed. Roads retain terrain support.
    const groundAt: GroundAt = cut && run === cut.freight ? () => cut.treadY - .13 : terrainGround;
    const line = new Line(run.pts);
    if (!line.length) return;
    const bridge = run.kind === 'bridge';
    const onEdge = ([x, z]: P2) => x === bounds.minX || x === bounds.maxX || z === bounds.minZ || z === bounds.maxZ;
    const start = run.pts[0], end = run.pts[run.pts.length - 1];
    const startCut = onEdge(start), endCut = onEdge(end);
    const startHeight = bridge && !startCut ? grid.sample(...start) : null;
    const endHeight = bridge && !endCut ? grid.sample(...end) : null;
    if (bridge && ((startCut && endCut) || (!startCut && startHeight === null) || (!endCut && endHeight === null))) return;
    // A board cut can pass through mid-air. Carry the in-board support to that edge.
    const h0 = startHeight ?? endHeight, h1 = endHeight ?? startHeight;
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
    const roadTop: number[] = [];
    function strip(left: number, right: number, lift: number, color: string, depth = 0, textured = false) {
      const offsets = [left, right];
      const ends = bridge ? [0, line.length].map(s => {
        const p = line.at(s);
        return offsets.map(off => groundAt(
          THREE.MathUtils.clamp(p.x + off * p.nx, bounds.minX, bounds.maxX),
          THREE.MathUtils.clamp(p.z + off * p.nz, bounds.minZ, bounds.maxZ)));
      }) : [];
      let prev: number[][] | null = null, lastS = 0;
      let tread: FreightTreadPoint[] | undefined;
      const range = textured ? run.freightS : undefined;
      function midpoint(s: number, a: number[], b: number[]) {
        const distance = range![0] + (range![1] - range![0]) * s / line.length;
        tread!.push({ s: distance, position: new THREE.Vector3(
          (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2) });
      }
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
            if (!(end ? endCut : startCut) && ends[end][i] !== null) y += blend * (ends[end][i]! - (ref - sceneZero));
          }
          if (textured) y = freightGrade(x, z, y);
          section.push([x, y + lift, z]);
        }
        if (section.length < 2 || (!bridge && groundAt(p.x, p.z) === null)) { prev = null; continue; }
        if (range && range.every(Number.isFinite)) {
          if (!prev) {
            tread = [];
            freightTreads.push(tread);
          } else {
            // The middle of a twisted quad lies on its drawn triangle diagonal.
            midpoint((lastS + s) / 2, prev[0], section[1]);
          }
          midpoint(s, section[0], section[1]);
        }
        if (prev) {
          const [a, b] = prev, [d, c] = section;
          // Upward-facing top, optionally with concrete or steel fascia on both sides.
          if (use === 'road' && depth > 0) roadTop.push(structures.pos.length / 3);
          (textured ? freight : structures).quad(a, b, c, d, color);
          if (textured) uv.push(0, lastS / .8, 1, lastS / .8, 1, s / .8, 0, lastS / .8, 1, s / .8, 0, s / .8);
          if (textured && !bridge && gradeAvailable) {
            // Close exposed ballast faces where the raised approach clears the bare earth.
            for (const [left, right] of [[a, d], [c, b]]) {
              const gy = groundAt(left[0], left[2]), hy = groundAt(right[0], right[2]);
              if (gy !== null && hy !== null && (left[1] - gy > .25 || right[1] - hy > .25)) {
                structures.quad(left, right, [right[0], hy, right[2]], [left[0], gy, left[2]], PAL.ballastFreight);
              }
            }
          }
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
      if (roadTop.length) roadTreads.set(run, roadTop);
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
    if (!isFreight) structurePositions = geometry.getAttribute('position') as THREE.BufferAttribute;
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
  return { group, freightTreads, deckAt, clearOfFreight, structuralTier: 'illustrative', dispose() {
    group.removeFromParent();
    for (const mesh of meshes) { mesh.geometry.dispose(); mesh.material.dispose(); }
    map.dispose();
    group.clear();
  } };
}
