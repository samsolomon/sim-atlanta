import * as THREE from 'three';
import type { TerrainCity } from './transport-data';
import type { GroundManifest } from './grid';
import { Builder, type P2 } from '../vignette/geom';
import { PAL } from '../vignette/world';
import type { OpenSlot } from './openings';
import { STREET_LINE } from './ground-map';

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
  finish?: 'disused-ballast';
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

/** Each mouth meets a level board road. Beyond a mouth the DEM bank can climb onto
 * the painted lanes (1.4 m within 7 m of the west centreline), which the open ramp would
 * otherwise copy into a warped fan. The board stays fully level for MOUTH_LEVEL_M and
 * eases back into the DEM by MOUTH_APPROACH_M; across, it eases out over 8 m beyond the walls. */
export const MOUTH_LEVEL_M = 10,
  MOUTH_APPROACH_M = 30,
  /** The open ramp descends from the board's joint to the surveyed floor over this length. */
  MOUTH_RAMP_M = 20;

/** Regrade only the grid nodes in the corridor before either tier selects its triangles. */
export function underpassGround(site: Underpass, manifest: GroundManifest, bytes: ArrayBuffer) {
  const data = new DataView(bytes),
    source = new DataView(bytes.slice(0));
  const { bounds, stepM, rows, cols, scaleM, offsetM } = manifest;
  const reach = site.halfWidth + 55;
  const corners = [site.start - MOUTH_APPROACH_M, site.start, ...site.breaks, site.end, site.end + MOUTH_APPROACH_M].flatMap((s) => [
    site.point(s, -reach),
    site.point(s, reach),
  ]);
  const xs = corners.map((p) => p[0]),
    zs = corners.map((p) => p[1]);
  const c0 = Math.max(1, Math.floor((Math.min(...xs) - bounds.minX) / stepM));
  const c1 = Math.min(cols - 2, Math.ceil((Math.max(...xs) - bounds.minX) / stepM));
  const r0 = Math.max(1, Math.floor((Math.min(...zs) - bounds.minZ) / stepM));
  const r1 = Math.min(rows - 2, Math.ceil((Math.max(...zs) - bounds.minZ) / stepM));
  // Centreline DEM, bilinear on the unmodified grid.
  const centre = (s: number) => {
    const [x, z] = site.point(s, 0);
    const u = (x - bounds.minX) / stepM,
      v = (z - bounds.minZ) / stepM;
    const i = Math.floor(u),
      j = Math.floor(v);
    let h = 0;
    for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const raw = source.getInt16(2 * ((j + dz) * cols + i + dx), true);
      if (raw === manifest.noData) return null;
      h += (dx ? u - i : 1 - u + i) * (dz ? v - j : 1 - v + j) * (raw * scaleM + offsetM);
    }
    return h;
  };
  const w = site.halfWidth;
  for (let row = r0; row <= r1; row++)
    for (let col = c0; col <= c1; col++) {
      const [s, t] = site.local(bounds.minX + col * stepM, bounds.minZ + row * stepM);
      const index = 2 * (row * cols + col),
        raw = data.getInt16(index, true);
      if (raw === manifest.noData) continue;
      const dem = raw * scaleM + offsetM;
      const mouth = s < (site.start + site.end) / 2 ? site.start : site.end;
      // Metres outside the mouth: positive on the board, negative inside the cut.
      const out = mouth === site.start ? site.start - s : s - site.end;
      let h: number;
      if (out >= 0) {
        if (out > MOUTH_APPROACH_M) continue;
        const level = centre(s);
        if (level === null) continue;
        const weight =
          (1 - smoothGrade(out - MOUTH_LEVEL_M, MOUTH_APPROACH_M - MOUTH_LEVEL_M)) *
          (1 - smoothGrade(Math.abs(t) - w - 1, 8));
        h = dem + weight * (level - dem);
      } else {
        h = upperGrade(site, s, t, dem);
        // Lane nodes just inside the cut are removed with the daylight slot, but the
        // board faces that straddle the mouth keep their plane. Hold them level too.
        const level = centre(mouth);
        if (out > -stepM * 2 && Math.abs(t) <= w + stepM && level !== null) h = level;
      }
      data.setInt16(index, Math.round((h - offsetM) / scaleM), true);
    }
  return bytes;
}

export function underpassFloor(site: Underpass, s: number, t: number, ground: Ground, zero: number) {
  const end = s < (site.start + site.end) / 2 ? site.start : site.end;
  if (Math.abs(s - end) >= MOUTH_RAMP_M) return site.floor(s) - zero;
  const weight = smoothGrade(Math.abs(s - end), MOUTH_RAMP_M);
  // Match the board across the entire approach cross-section.
  const outer = ground(...site.point(end + (end === site.start ? -0.01 : 0.01), t)) ?? site.floor(s) - zero;
  return outer + weight * (site.floor(s) - zero - outer);
}

/** Where the board paints this road's lines across each mouth: one yellow line per
 * carriageway (ground-map.ts), as [start −t, start +t, end −t, end +t]. */
export function boardLines(site: Underpass, roads: readonly { name?: string | null; pts: readonly P2[]; tunnel?: boolean }[]) {
  const fallback = (site.halfWidth - 2 + 0.65) / 2;
  const out = [-fallback, fallback, -fallback, fallback];
  for (const [k, mouth] of [site.start, site.end].entries()) {
    const found: number[] = [];
    for (const road of roads) {
      if (road.name !== site.roadName || road.tunnel) continue;
      const local = road.pts.map(([x, z]) => site.local(x, z));
      for (let i = 1; i < local.length; i++) {
        const [s0, t0] = local[i - 1],
          [s1, t1] = local[i];
        if ((s0 - mouth) * (s1 - mouth) > 0 || s0 === s1) continue;
        const t = t0 + ((t1 - t0) * (mouth - s0)) / (s1 - s0);
        if (Math.abs(t) < site.halfWidth) found.push(t);
      }
    }
    const below = found.filter((t) => t < 0),
      above = found.filter((t) => t > 0);
    if (below.length) out[2 * k] = Math.max(...below);
    if (above.length) out[2 * k + 1] = Math.min(...above);
  }
  return out as [number, number, number, number];
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
  // An apron tucked 3 cm under the board closes the hairline where the two meshes meet.
  for (const [mouth, out] of [[site.start, -1], [site.end, 1]] as const) {
    const pieces = Math.ceil(2 * w);
    for (let k = 0; k < pieces; k++) {
      const u = -w + (2 * w * k) / pieces,
        v = -w + (2 * w * (k + 1)) / pieces;
      const tuck = (t: number) => p(mouth + out * 0.4, t, edgeHeight(mouth + out * 0.4, t) - 0.03);
      pavement.quad(road(mouth, u), road(mouth, v), tuck(v), tuck(u), PAL.asphalt);
    }
  }
  for (const { start, end, cover } of intervals(site)) {
    const n = Math.ceil((end - start) / 2);
    const ceiling = (s: number) => site.floor(s) - zero + (cover?.clearance ?? site.clearance);
    for (let i = 0; i < n; i++) {
      const a = start + ((end - start) * i) / n,
        b = start + ((end - start) * (i + 1)) / n;
      // Kerbs and the median nose grow out of the level board road over 12 m, so
      // the mouth meets it as one asphalt surface; the kerb rises with them.
      const grow = (s: number) => smoothGrade(Math.min(s - site.start, site.end - s), 12);
      const kerb = (s: number, t: number) => p(s, t, floor(s, t) + 0.14 * grow(s));
      const edges = (s: number) => {
        const walk = w - 2 * grow(s),
          median = 0.65 * grow(s);
        return [-w, -walk, -median, median, walk, w];
      };
      const ea = edges(a),
        eb = edges(b);
      for (let j = 0; j < 5; j++) {
        const walk = j % 2 === 0,
          surface = walk ? kerb : road;
        // Near a mouth, follow the board's joint at 1 m across, not just at the strip edges.
        const near = Math.min(b - site.start, site.end - a) <= MOUTH_RAMP_M;
        // A fixed count per strip, so neighbouring rows share every vertex (no T-junctions).
        const pieces = near ? (j === 1 || j === 3 ? Math.ceil(w - 2) : 2) : 1;
        const at = (e: number[], k: number) => e[j] + ((e[j + 1] - e[j]) * k) / pieces;
        for (let k = 0; k < pieces; k++)
          pavement.quad(
            surface(a, at(ea, k + 1)),
            surface(b, at(eb, k + 1)),
            surface(b, at(eb, k)),
            surface(a, at(ea, k)),
            walk ? PAL.sidewalk : PAL.asphalt,
          );
        if (walk)
          for (const e of [j, j + 1])
            if (Math.abs(ea[e]) < w || Math.abs(eb[e]) < w)
              pavement.quad(road(a, ea[e]), road(b, eb[e]), kerb(b, eb[e]), kerb(a, ea[e]), PAL.sidewalk);
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
      if (cover.finish === 'disused-ballast') {
        // Weathered edge protection follows the actual crest at each post.
        // Stop on the banks, a little beyond the abutments.
        const station = s + (s === cover.start ? 0.28 : -0.28);
        const reach = w + 1.4,
          bays = Math.ceil((2 * reach) / 3);
        const rim = (t: number) => edgeHeight(station, t);
        const section = (t: number, y: number) => [
          p(station - 0.09, t, y + 0.63),
          p(station + 0.09, t, y + 0.63),
          p(station + 0.09, t, y + 0.78),
          p(station - 0.09, t, y + 0.78),
        ];
        let previous: number[][] | undefined;
        for (let j = 0; j <= bays; j++) {
          const t = -reach + (2 * reach * j) / bays,
            y = rim(t);
          const current = section(t, y);
          if (previous)
            for (let k = 0; k < 4; k++) {
              const next = (k + 1) % 4;
              out.quad(
                previous[k],
                previous[next],
                current[next],
                current[k],
                k === 2 ? '#98785d' : '#715747',
              );
            }
          if (j === 0 || j === bays) out.quad(current[0], current[1], current[2], current[3], '#785e4b');
          const base = [
            [-0.07, -0.07],
            [-0.07, 0.07],
            [0.07, 0.07],
            [0.07, -0.07],
          ].map(([ds, dt]) => p(station + ds, t + dt, y - 0.04));
          for (let k = 0; k < 4; k++) {
            const a = base[k],
              b = base[(k + 1) % 4];
            out.quad(a, b, [b[0], y + 0.64, b[2]], [a[0], y + 0.64, a[2]], '#715747');
          }
          previous = current;
        }
      }
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
          // A haunch widens into the slab. Only its exposed faces are
          // modelled; overlapping box tops would sit inside the soffit.
          const ring = (radius: number, y: number) =>
            [
              [-1, -1],
              [-1, 1],
              [1, 1],
              [1, -1],
            ].map(([ds, dt]) => p(s + radius * ds, t + radius * dt, y));
          const base = ring(0.3, floor(s, t)),
            shoulder = ring(0.3, ceiling(s) - 0.45),
            cap = ring(0.575, ceiling(s));
          for (let i = 0; i < 4; i++) {
            const j = (i + 1) % 4;
            out.quad(base[i], base[j], shoulder[j], shoulder[i], PAL.concrete);
            out.quad(shoulder[i], shoulder[j], cap[j], cap[i], PAL.concrete);
          }
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
  lines: [number, number, number, number] = boardLines(site, []),
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
    shader.uniforms.trenchLines = { value: new THREE.Vector4(...lines) };
    shader.uniforms.trenchLineColor = { value: new THREE.Color(STREET_LINE) };
    shader.uniforms.trenchEnds = {
      value: new THREE.Vector4(site.start, site.spans[0].start, site.spans.at(-1)!.end, site.end),
    };
    shader.vertexShader =
      'attribute vec4 trenchCoord; varying vec4 trench;\n' +
      shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n trench=trenchCoord;');
    shader.fragmentShader =
      'uniform float trenchNight, trenchWidth; uniform vec4 trenchEnds, trenchLines; uniform vec3 trenchLineColor; varying vec4 trench;\n' +
      shader.fragmentShader
        .replace(
          '#include <color_fragment>',
          `
        // Outside the ramps keep the exact board paint, including its markings.
        float ramp=smoothstep(trenchEnds.x,trenchEnds.x+15.,trench.x)*(1.-smoothstep(trenchEnds.w-15.,trenchEnds.w,trench.x));
        // The board's own line, one per carriageway, carried from mouth to mouth.
        vec2 line=mix(trenchLines.xy,trenchLines.zw,clamp((trench.x-trenchEnds.x)/(trenchEnds.w-trenchEnds.x),0.,1.));
        float laneD=min(abs(trench.y-line.x),abs(trench.y-line.y));
        float aa=clamp(fwidth(trench.y),.01,.4);
        float stripe=(1.-smoothstep(.2-aa,.2+aa,laneD))*trench.w;
        vec3 local=diffuse*mix(vColor.rgb,trenchLineColor,stripe);
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
        float inside=(1.-smoothstep(4.7,5.4,trench.z))*smoothstep(trenchEnds.y-2.,trenchEnds.y,trench.x)*(1.-smoothstep(trenchEnds.z,trenchEnds.z+2.,trench.x));
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
