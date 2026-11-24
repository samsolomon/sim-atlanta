import * as THREE from 'three';
import type { TerrainCity } from './transport-data';
import type { GroundManifest } from './grid';
import { Builder, type P2 } from '../vignette/geom';
import { PAL } from '../vignette/world';
import type { OpenSlot } from './openings';

type Ground = (x: number, z: number) => number | null;
export interface CoverSpan {
  start: number;
  end: number;
  type: 'terrain' | 'rail-ballast' | 'street';
  top: number;
  clearance?: number;
  /** Along-road drift per cross-axis metre of the formation outside the walls. */
  bankSkew?: number;
  medianPier?: boolean;
}

/** Absolute heights are NAVD88. Uncovered intervals between spans admit daylight.
 * Breaks include changes in centreline bearing and pavement grade. */
export interface Underpass {
  roadName: string;
  point(s: number, t: number): P2;
  local(x: number, z: number): P2;
  floor(s: number): number;
  start: number;
  end: number;
  breaks: number[];
  halfWidth: number;
  clearance: number;
  spans: CoverSpan[];
}

export function smoothGrade(distance: number, width: number) {
  if (width <= 0) return Number(distance >= 0);
  const t = Math.max(0, Math.min(1, distance / width));
  return t * t * (3 - 2 * t);
}

function intervals(site: Underpass) {
  const stations = [
    ...new Set([site.start, ...site.breaks, ...site.spans.flatMap((c) => [c.start, c.end]), site.end]),
  ].sort((a, b) => a - b);
  return stations.slice(1).map((end, i) => {
    const start = stations[i];
    return { start, end, cover: site.spans.find((c) => start >= c.start && end <= c.end) };
  });
}

export function daylightSlots(site: Underpass, zero: number): OpenSlot[] {
  const bed = (s: number): [number, number, number] => {
    const [x, z] = site.point(s, 0);
    return [x, site.floor(s) - zero - 2, z];
  };
  return intervals(site)
    .filter((i) => !i.cover)
    .map(({ start, end }) => {
      const a = site.point(start, 0),
        b = site.point(start, 1);
      return {
        start: bed(start),
        end: bed(end),
        crossAxis: [b[0] - a[0], b[1] - a[1]],
        halfWidthM: site.halfWidth,
      };
    });
}

/** Surveyed tops belong to the actual textured board. Only the daylight slots
 * remove triangles. This prevents coplanar lids, cover seams and separate rail beds. */
export function upperGrade(site: Underpass, s: number, t: number, dem: number) {
  const first = site.spans[0],
    last = site.spans[site.spans.length - 1];
  const along =
    smoothGrade(s - site.start, first.start - site.start - 7) *
    smoothGrade(site.end - s, site.end - last.end - 7);
  // Follow the surveyed bearing of the tracks as they leave the opening.
  // Cross-axis skew applies only on the banks; portal stations stay fixed.
  const rail = site.spans.find(
    (span) => span.type === 'rail-ballast' && s >= span.start - 28 && s <= span.end + 28,
  );
  if (rail) s -= (rail.bankSkew ?? 0) * Math.sign(t) * Math.max(0, Math.abs(t) - site.halfWidth - 1);
  const shoulder = rail ? 27 * smoothGrade(s - rail.start + 8, 8) * smoothGrade(rail.end + 8 - s, 8) : 0;
  const across = smoothGrade(site.halfWidth + 28 + shoulder - Math.abs(t), 19);
  let height = first.top;
  for (let i = 1; i < site.spans.length; i++) {
    const prev = site.spans[i - 1],
      next = site.spans[i];
    height += (next.top - prev.top) * smoothGrade(s - prev.end, next.start - prev.end);
  }
  return dem + across * along * (height - dem);
}

/** Regrade only the grid nodes in the corridor before either tier selects its triangles. */
export function underpassGround(site: Underpass, manifest: GroundManifest, bytes: ArrayBuffer) {
  const data = new DataView(bytes);
  const { bounds, stepM, rows, cols, scaleM, offsetM } = manifest;
  const reach = site.halfWidth + 55;
  const corners = [site.start, ...site.breaks, site.end].flatMap((s) => [
    site.point(s, -reach),
    site.point(s, reach),
  ]);
  const xs = corners.map((p) => p[0]),
    zs = corners.map((p) => p[1]);
  const c0 = Math.max(0, Math.floor((Math.min(...xs) - bounds.minX) / stepM));
  const c1 = Math.min(cols - 1, Math.ceil((Math.max(...xs) - bounds.minX) / stepM));
  const r0 = Math.max(0, Math.floor((Math.min(...zs) - bounds.minZ) / stepM));
  const r1 = Math.min(rows - 1, Math.ceil((Math.max(...zs) - bounds.minZ) / stepM));
  for (let row = r0; row <= r1; row++)
    for (let col = c0; col <= c1; col++) {
      const [s, t] = site.local(bounds.minX + col * stepM, bounds.minZ + row * stepM);
      const index = 2 * (row * cols + col),
        raw = data.getInt16(index, true);
      if (raw === manifest.noData || s < site.start || s > site.end) continue;
      const h = upperGrade(site, s, t, raw * scaleM + offsetM);
      data.setInt16(index, Math.round((h - offsetM) / scaleM), true);
    }
  return bytes;
}

export function underpassFloor(site: Underpass, s: number, t: number, ground: Ground, zero: number) {
  const end = s < (site.start + site.end) / 2 ? site.start : site.end;
  if (Math.abs(s - end) >= 10) return site.floor(s) - zero;
  const weight = smoothGrade(Math.abs(s - end), 10);
  // Match the existing terrain across the entire approach cross-section.
  const outer = ground(...site.point(end + (end === site.start ? -0.01 : 0.01), t)) ?? site.floor(s) - zero;
  return outer + weight * (site.floor(s) - zero - outer);
}

export function drawUnderpass(
  site: Underpass,
  out: Builder,
  pavement: Builder,
  ground: Ground,
  zero: number,
) {
  const w = site.halfWidth;
  const edgeHeight = (s: number, t: number) => ground(...site.point(s, t)) ?? site.floor(s) - zero;
  const floor = (s: number, t: number) => underpassFloor(site, s, t, ground, zero);
  const p = (s: number, t: number, h: number) => {
    const [x, z] = site.point(s, t);
    return [x, h, z];
  };
  const road = (s: number, t: number) => p(s, t, floor(s, t));
  for (const { start, end, cover } of intervals(site)) {
    const n = Math.ceil((end - start) / 2);
    const ceiling = (s: number) => site.floor(s) - zero + (cover?.clearance ?? site.clearance);
    for (let i = 0; i < n; i++) {
      const a = start + ((end - start) * i) / n,
        b = start + ((end - start) * (i + 1)) / n;
      // Meet painted sidewalks flush at both ends and raise the kerb inside.
      const kerb = (s: number, t: number) =>
        p(s, t, floor(s, t) + 0.14 * smoothGrade(Math.min(s - site.start, site.end - s), 12));
      for (const [l, r, walk] of [
        [-w, 2 - w, true],
        [2 - w, -0.65, false],
        [-0.65, 0.65, true],
        [0.65, w - 2, false],
        [w - 2, w, true],
      ] as const) {
        const surface = walk ? kerb : road;
        pavement.quad(
          surface(a, r),
          surface(b, r),
          surface(b, l),
          surface(a, l),
          walk ? PAL.sidewalk : PAL.asphalt,
        );
        if (walk)
          for (const t of [l, r])
            if (Math.abs(t) < w) pavement.quad(road(a, t), road(b, t), kerb(b, t), kerb(a, t), PAL.sidewalk);
      }
      for (const side of [-1, 1]) {
        const t = side * w;
        const crest = (s: number) => (cover ? ceiling(s) : edgeHeight(s, side * (w + 0.01)));
        out.quad(road(a, t), road(b, t), p(b, t, crest(b)), p(a, t, crest(a)), PAL.concrete);
      }
      if (cover)
        out.quad(
          p(a, -w, ceiling(a)),
          p(b, -w, ceiling(b)),
          p(b, w, ceiling(b)),
          p(a, w, ceiling(a)),
          PAL.concrete,
        );
    }
    if (!cover) continue;
    for (const s of [start, end]) {
      if (s !== cover.start && s !== cover.end) continue;
      if (site.spans.some((other) => other !== cover && (other.start === s || other.end === s))) continue;
      for (let i = 0; i < 12; i++) {
        const l = w * (i / 6 - 1),
          r = w * ((i + 1) / 6 - 1);
        const inset = s === cover.start ? 0.025 : -0.025;
        out.quad(
          p(s, l, ceiling(s)),
          p(s, r, ceiling(s)),
          p(s, r, edgeHeight(s + inset, r)),
          p(s, l, edgeHeight(s + inset, l)),
          PAL.concrete,
        );
      }
    }
    if (cover.medianPier) {
      for (const s of [start + 0.65, end - 0.65])
        for (const t of [0, 1 - w, w - 1]) {
          out.box(
            0.6,
            ceiling(s) - floor(s, 0),
            0.6,
            ...sitePier(site, s, t, (floor(s, t) + ceiling(s)) / 2),
            PAL.concrete,
          );
          out.box(1.15, 0.45, 1.15, ...sitePier(site, s, t, ceiling(s) - 0.225), PAL.concrete);
        }
    }
  }
}

/** Continue the board's own paint and UVs onto the approach vertices. Under
 * the cover the same material colours are supplied by the road cross section,
 * leaving the board texture free to carry the different surface overhead. */
export function underpassMesh(
  site: Underpass,
  bounds: TerrainCity['bounds'],
  map: THREE.Texture | null,
  ground: Ground,
  zero: number,
) {
  const walls = new Builder(),
    pavement = new Builder();
  drawUnderpass(site, walls, pavement, ground, zero);
  // Share one draw, one programme and the board texture between the two levels.
  const pavementVertices = pavement.pos.length / 3;
  pavement.pos = pavement.pos.concat(walls.pos);
  pavement.col = pavement.col.concat(walls.col);
  const geometry = pavement.geometry();
  const uv: number[] = [],
    coordinates: number[] = [];
  for (let i = 0; i < pavement.pos.length; i += 3) {
    const [x, y, z] = [pavement.pos[i], pavement.pos[i + 1], pavement.pos[i + 2]];
    const [s, t] = site.local(x, z);
    coordinates.push(s, t, y + zero - site.floor(s), Number(i / 3 < pavementVertices));
    uv.push((x - bounds.minX) / (bounds.maxX - bounds.minX), (bounds.maxZ - z) / (bounds.maxZ - bounds.minZ));
  }
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute('trenchCoord', new THREE.Float32BufferAttribute(coordinates, 4));
  const night = { value: 0 };
  const material = new THREE.MeshLambertMaterial({ map, side: THREE.DoubleSide, vertexColors: true });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.trenchNight = night;
    shader.uniforms.trenchWidth = { value: site.halfWidth };
    shader.uniforms.trenchEnds = {
      value: new THREE.Vector4(site.start, site.spans[0].start, site.spans.at(-1)!.end, site.end),
    };
    shader.vertexShader =
      'attribute vec4 trenchCoord; varying vec4 trench;\n' +
      shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n trench=trenchCoord;');
    shader.fragmentShader =
      'uniform float trenchNight, trenchWidth; uniform vec4 trenchEnds; varying vec4 trench;\n' +
      shader.fragmentShader
        .replace(
          '#include <color_fragment>',
          `
        // Outside the ramps keep the exact board paint, including its markings.
        float ramp=smoothstep(trenchEnds.x,trenchEnds.x+15.,trench.x)*(1.-smoothstep(trenchEnds.w-15.,trenchEnds.w,trench.x));
        float laneD=abs(abs(trench.y)-(trenchWidth-2.+.65)*.5);
        float aa=clamp(fwidth(trench.y),.01,.4);
        float stripe=(1.-smoothstep(.075-aa,.075+aa,laneD))*step(mod(trench.x+200.,10.),3.)*trench.w;
        vec3 local=diffuse*mix(vColor.rgb,vec3(.76,.73,.61),stripe);
        diffuseColor.rgb=mix(diffuseColor.rgb,local,mix(1.,ramp,trench.w));`,
        )
        .replace(
          '#include <opaque_fragment>',
          `
        // Warm wall fixtures follow the west approach photograph. Lamp pitch,
        // spill and night intensity are inferred.
        float d=abs(mod(trench.x+4.,12.)-6.);
        float wall=abs(abs(trench.y)-trenchWidth);
        float h=abs(trench.z-3.);
        float inside=smoothstep(trenchEnds.y-2.,trenchEnds.y,trench.x)*(1.-smoothstep(trenchEnds.z,trenchEnds.z+2.,trench.x));
        float lens=(1.-smoothstep(.25,.4,d))*(1.-smoothstep(.08,.15,h))*(1.-smoothstep(.03,.15,wall));
        float spill=exp(-.12*d-.16*wall-.23*h);
        outgoingLight+=(1.-trench.w)*vec3(.034,.028,.019);
        outgoingLight+=inside*(diffuseColor.rgb*(vec3(.16,.15,.13)+trenchNight*vec3(.8,.55,.29)*spill)+vec3(1.,.77,.45)*lens*(.28+trenchNight));
        #include <opaque_fragment>`,
        );
  };
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Cut-and-cover underpass';
  mesh.receiveShadow = true;
  return {
    mesh,
    setNight(factor: number) {
      night.value = factor;
    },
    setWet(factor: number) {
      material.color.setScalar(1 - 0.3 * factor);
    },
  };
}

function sitePier(site: Underpass, s: number, t: number, y: number): [number, number, number] {
  const [x, z] = site.point(s, t);
  return [x, y, z];
}
