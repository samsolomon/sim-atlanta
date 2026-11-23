import { triangleHeight } from './tread-height';
import { drawJunctionDecks } from './junction-decks';
import * as THREE from 'three';
import { Builder, Line, segDist, type P2 } from '../vignette/geom';
import { PlacementIndex } from '../vignette/spatial';
import { alongOn, matchRibbon, sectionAt, stripePoint } from './connector-corridor';
import { PAL } from '../vignette/world';
import type { GroundGrid } from './grid';
import { roadWidth, type TerrainCity, type TransportRun } from './transport-data';
import { connectorMedians, inConnectorLanes } from './connector-paint';
import { drawSeventeenthStreet, seventeenthRamp } from '../city/seventeenth-street';
import { drawStreetBridges } from './street-bridges';
import { pathConcrete, pathWidth, westsidePaths } from './westside-path';

type GroundAt = (x: number, z: number, run?: TransportRun) => number | null;
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
  setNight?(factor: number): void;
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
export function createSurfaceTransport(city: TerrainCity, grid: GroundGrid, terrainGround: GroundAt,
  cut?: { freight: TransportRun; treadY: number }): SurfaceTransport {
  const data = city.terrainTransport;
  if (data?.version !== 1) throw new Error('Missing scoped terrain transport. Run pnpm data:city.');
  const group = new THREE.Group();
  group.name = 'Surface transport';
  group.userData.structuralHeightTier = 'illustrative';
  const structures = new Builder(), freight = new Builder(), uv: number[] = [];
  const bounds = city.bounds;
  const sceneZero = grid.manifest.vertical.sceneZeroNavd88M;
  const sidepaths = westsidePaths(city);
  const freightTreads: FreightTreadPoint[][] = [];
  // Offsets into the single rendered structural mesh, grouped by source road.
  const roadTreads = new Map<TransportRun, number[]>();
  const seventeenth = new Builder(), bridgeRuns = new Set<TransportRun>();
  let bridgePositions: THREE.BufferAttribute;
  let structurePositions: THREE.BufferAttribute;
  function deckAt(x: number, z: number, run: TransportRun) {
    const halfWidth = junctionWidths.get(run);
    if (halfWidth !== undefined && !run.pts.some((p, i) =>
      i > 0 && segDist(x, z, run.pts[i - 1], p) <= halfWidth + .1)) return null;
    const quads = roadTreads.get(run);
    if (quads) for (const i of quads) {
      const h = triangleHeight(bridgeRuns.has(run) ? bridgePositions : structurePositions, i, x, z);
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

  function draw(run: TransportRun, use: 'road' | 'freight' | 'tram', owner = run) {
    if (run.pts.length < 2) return;
    // Only this matched freight strip shares the illustrative bed. Roads retain terrain support.
    const groundAt: GroundAt = cut && run === cut.freight ? () => cut.treadY - .13 : (x,z) => terrainGround(x,z,run);
    const line = new Line(run.pts);
    if (!line.length) return;
    const bridge = run.kind === 'bridge';
    const onEdge = ([x, z]: P2) => x === bounds.minX || x === bounds.maxX || z === bounds.minZ || z === bounds.maxZ;
    const start = run.pts[0], end = run.pts[run.pts.length - 1];
    const startCut = onEdge(start), endCut = onEdge(end);
    function support(p:P2) {
      if (use!=='road') return null;
      for(const parent of junctionNodes.get(p.join(',')) ?? []) {
        for(const i of roadTreads.get(parent) ?? []) {
          const y=triangleHeight(sharedPositions,i,...p);
          if(y!==null) return y-.12;
        }
      }
      return null;
    }
    const firstSupport=support(start),lastSupport=support(end);
    const elevation=(p:P2,height:number|null) => height===null ? grid.sample(...p) : height+grid.manifest.vertical.sceneZeroNavd88M;
    const startHeight = bridge && !startCut ? elevation(start,firstSupport) : null;
    const endHeight = bridge && !endCut ? elevation(end,lastSupport) : null;
    const profile = run.deckNavd88M;
    if (bridge && !profile && ((startCut && endCut) || (!startCut && startHeight === null) || (!endCut && endHeight === null))) return;
    // A board cut can pass through mid-air. Carry the in-board support to that edge.
    const h0 = startHeight ?? endHeight, h1 = endHeight ?? startHeight;
    const sidepath = sidepaths.has(run);
    const ribbon = use === 'road' && run.cls === 'motorway'
      ? matchRibbon(run.pts[0],run.pts[1],run.sub==='link') : undefined;
    const travelWidth = ribbon ? ribbon.lanes*3.55 : 0;
    const width = ribbon ? travelWidth + (ribbon.link ? 1.4 : 3.6) : sidepath ? pathWidth : use === 'road' ? roadWidth(run) : 4.2;
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
    if (ribbon) {
      for (let s=0; s<line.length; s+=12) { stations.push(s,Math.min(s+3,line.length)); }
      for (const row of ribbon.rows) {
        const pt=ribbon.line.at(row.s);
        const at=alongOn(ribbon,[start[0],start[1]]).s;
        const s=row.s-at;
        if (s>0 && s<line.length && Math.hypot(line.at(s).x-pt.x,line.at(s).z-pt.z)<1) stations.push(s);
      }
      stations.sort((a,b)=>a-b);
    }
    function lateral(s:number,off:number): P2 {
      const p=line.at(s);
      if (!ribbon) return [p.x+off*p.nx,p.z+off*p.nz];
      const row=sectionAt(ribbon,alongOn(ribbon,[p.x,p.z]).s);
      return stripePoint(row,.5-off/travelWidth);
    }
    const roadTop: number[] = [];
    // An elevated shoulder carries a low concrete parapet except where the
    // adjacent pavement opens for a merge. Check the outside of both ends and
    // the middle against all mapped travel strips, including the managed lane.
    function parapet(a: number[], b: number[], otherA: number[], otherB: number[]) {
      const offset = (p: number[], other: number[], distance: number) => {
        const length = Math.hypot(p[0]-other[0], p[2]-other[2]) || 1;
        return [p[0]+distance*(p[0]-other[0])/length, p[1], p[2]+distance*(p[2]-other[2])/length];
      };
      for (const distance of [-.28, .7, 1.8]) {
        const p = offset(a, otherA, distance), q = offset(b, otherB, distance);
        if (inConnectorLanes(p[0], p[2], .18) || inConnectorLanes(q[0], q[2], .18) ||
          inConnectorLanes((p[0]+q[0])/2, (p[2]+q[2])/2, .18)) return;
      }
      const p = offset(a, otherA, -.28), q = offset(b, otherB, -.28);
      const up = ([x,y,z]: number[]) => [x,y+.85,z];
      structures.quad(a,b,up(b),up(a),PAL.concrete);
      structures.quad(q,p,up(p),up(q),PAL.concrete);
      structures.quad(up(a),up(b),up(q),up(p),PAL.concrete);
    }
    function strip(left: number, right: number, lift: number, color: string, depth = 0, textured = false, dashed = false) {
      const offsets = [left, right];
      const ends = bridge ? [0, line.length].map(s => {
        return offsets.map(off => {
          const [x,z]=lateral(s,off);
          return (s===0 ? firstSupport : lastSupport) ?? groundAt(THREE.MathUtils.clamp(x,bounds.minX,bounds.maxX),THREE.MathUtils.clamp(z,bounds.minZ,bounds.maxZ));
        });
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
          const [px,pz]=lateral(s,offset);
          const x = THREE.MathUtils.clamp(px,bounds.minX,bounds.maxX);
          const z = THREE.MathUtils.clamp(pz,bounds.minZ,bounds.maxZ);
          let y = bridge ? h0! + (h1! - h0!) * (s / line.length) - sceneZero : groundAt(x, z);
          if (y === null) break;
          if (profile) {
            const vertex = line.vertexAt(s);
            const index = Math.min(Math.floor(vertex), profile.length - 2);
            y = profile[index] + (profile[index+1]-profile[index])*(vertex-index) - sceneZero;
          } else if (bridge) {
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
        if (prev && (!dashed || (lastS+s)/2 % 12 < 3)) {
          const [a, b] = prev, [d, c] = section;
          // Upward-facing top, optionally with concrete or steel fascia on both sides.
          if (use === 'road' && depth > 0) roadTop.push(structures.pos.length / 3, structures.pos.length / 3 + 3);
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
            if (profile && ribbon && use === 'road') {
              parapet(a, d, b, c);
              parapet(b, c, a, d);
            }
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
      strip(width / 2, -width / 2, .12, ribbon ? PAL.asphaltHwy : sidepath ? pathConcrete : walkway ? PAL.sidewalk : PAL.asphalt, walkway ? .4 : .95);
      if (roadTop.length) roadTreads.set(owner, [...(roadTreads.get(owner) ?? []), ...roadTop]);
      if (ribbon) {
        for (let i=0;i<=ribbon.lanes;i++) {
          const offset=travelWidth*(.5-i/ribbon.lanes);
          strip(offset+.14,offset-.14,.15,i===0 && !ribbon.link ? PAL.lineYellow : PAL.lineWhite,0,false,i>0 && i<ribbon.lanes);
        }
      } else if (!walkway && width >= 9) strip(.1, -.1, .15, PAL.lineYellow);
    }
  }

  // A raised concrete divider occupies only the narrow, surveyed ground median.
  // Trim the strip at the board edge and restart it after any terrain hole.
  for (const rows of connectorMedians(city)) {
    let previous: number[][] | undefined;
    for (const row of rows) {
      const [x,z]=stripePoint(row,.5);
      const y=terrainGround(x,z);
      if (y===null || x<bounds.minX || x>bounds.maxX || z<bounds.minZ || z>bounds.maxZ) {
        previous=undefined; continue;
      }
      const width=Math.hypot(row.outer[0]-row.inner[0],row.outer[1]-row.inner[1]);
      const dx=(row.outer[0]-row.inner[0])/width,dz=(row.outer[1]-row.inner[1])/width;
      const section=[[-.36,0],[-.17,.84],[.17,.84],[.36,0]].map(([offset,h])=>[
        THREE.MathUtils.clamp(x+offset*dx,bounds.minX,bounds.maxX),y+h,
        THREE.MathUtils.clamp(z+offset*dz,bounds.minZ,bounds.maxZ)]);
      if (previous) for (let j=0;j<3;j++)
        structures.quad(previous[j],previous[j+1],section[j+1],section[j],PAL.concrete);
      previous=section;
    }
  }
  const sharedDecks = drawStreetBridges(city, grid.manifest.vertical.sceneZeroNavd88M, terrainGround, structures, roadTreads);
  const junctionWidths = new Map<TransportRun, number>();
  const junctionRuns = drawJunctionDecks(city, grid.manifest.vertical.sceneZeroNavd88M, structures, roadTreads, junctionWidths);
  for (const run of junctionRuns) sharedDecks.add(run);
  const sharedPositions = new THREE.Float32BufferAttribute(structures.pos,3);
  const junctionNodes = new Map<string,TransportRun[]>();
  for(const run of sharedDecks) if(run.cls==='secondary' || run.cls==='tertiary') {
    for(const p of run.pts) {
      const key=p.join(',');
      junctionNodes.set(key,[...(junctionNodes.get(key)??[]),run]);
    }
  }
  drawSeventeenthStreet(city, sceneZero, (x,z) => {
    const h = grid.sample(x,z);
    return h === null ? null : h-sceneZero;
  }, seventeenth, roadTreads, bridgeRuns);
  for (const owner of data.roads) {
    if (sharedDecks.has(owner) || bridgeRuns.has(owner)) continue;
    const road = bounds.minZ === -4900 ? seventeenthRamp(owner, terrainGround, sceneZero) : owner;
    if (road.kind !== 'bridge' || road.pts.length < 2) continue;
    // Lidar spans may cross a junction internal to one OSM way. Give each
    // carriageway piece its own width and keep the original deck lookup key.
    let from = 0;
    for (let i=1; road.cls==='motorway' && i<road.pts.length-1; i++) {
      const left=matchRibbon(road.pts[i-1],road.pts[i],road.sub==='link');
      const right=matchRibbon(road.pts[i],road.pts[i+1],road.sub==='link');
      if (left!==right) {
        draw({...road,pts:road.pts.slice(from,i+1),deckNavd88M:road.deckNavd88M?.slice(from,i+1)},'road',owner);
        from=i;
      }
    }
    draw(from ? {...road,pts:road.pts.slice(from),deckNavd88M:road.deckNavd88M?.slice(from)} : road,'road',owner);
  }
  for (const r of data.rail) draw(r, r.cls === 'tram' ? 'tram' : 'freight');
  const map = freightTexture();
  const meshes: THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>[] = [];
  const bridgeNight = { value: 0 };
  for (const [builder, name] of [[structures, 'Decks and embedded rails'], [seventeenth, '17th Street Bridge'], [freight, 'Freight track']] as const) {
    if (!builder.pos.length) continue;
    const geometry = builder.geometry();
    const isFreight = builder === freight;
    if (builder === seventeenth) bridgePositions = geometry.getAttribute('position') as THREE.BufferAttribute;
    if (builder === structures) structurePositions = geometry.getAttribute('position') as THREE.BufferAttribute;
    if (isFreight) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide,
      map: isFreight ? map : null, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
    if (builder === seventeenth) {
      // Contractor night photographs show lit steel and pier faces. Fill the
      // vertex colours locally without adding point lights to the whole City.
      material.onBeforeCompile = shader => {
        shader.uniforms.bridgeNight = bridgeNight;
        shader.vertexShader = 'varying float bridgeSpill;\n' + shader.vertexShader.replace(
          '#include <begin_vertex>', `#include <begin_vertex>
          float bankFade = smoothstep(-207.0,-167.0,position.x) * (1.0-smoothstep(112.0,136.0,position.x));
          float pierDistance = min(min(abs(position.x+135.0), abs(position.x+75.0)),
            min(abs(position.x+22.0),min(abs(position.x-26.0),abs(position.x-62.0))));
          float pool = mix(.35,1.0,1.0-smoothstep(1.5,16.0,pierDistance));
          bridgeSpill = (1.0-.77*abs(normal.y)) * bankFade * pool;`);
        shader.fragmentShader = 'uniform float bridgeNight; varying float bridgeSpill;\n' + shader.fragmentShader.replace(
          '#include <opaque_fragment>',
          'outgoingLight += diffuseColor.rgb * vec3(.54, .40, .25) * bridgeNight * bridgeSpill;\n#include <opaque_fragment>');
      };
    }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.castShadow = !isFreight; // The structural batch also contains the freight deck undersides.
    mesh.receiveShadow = true;
    group.add(mesh);
    meshes.push(mesh);
  }
  return { group, freightTreads, deckAt, clearOfFreight, structuralTier: 'illustrative',
    setNight: seventeenth.pos.length ? factor => { bridgeNight.value = factor; } : undefined, dispose() {
    group.removeFromParent();
    for (const mesh of meshes) { mesh.geometry.dispose(); mesh.material.dispose(); }
    map.dispose();
    group.clear();
  } };
}
