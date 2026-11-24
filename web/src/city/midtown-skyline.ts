import { BufferGeometry, Float32BufferAttribute, Mesh, MeshLambertMaterial } from 'three';
import { Builder, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { localLandmarkShell } from './landmark-shell';
import { ashlarCoursing, graniteWindowAtlas, withStonePosition } from './johnson-burgee';
import sites from './fixtures/midtown-skyline.json';

import { towerSquare } from './midtown-skyline-square';
import { georgianTerrace } from './midtown-skyline-terrace';
import { biltmore } from './midtown-skyline-biltmore';
import { academyOfMedicine } from './midtown-skyline-academy';
import { wimbishHouse } from './midtown-skyline-wimbish';
import { ponceDeLeon } from './midtown-skyline-ponce';
import { federalReserve } from './midtown-skyline-fed';
import { symphonyTower } from './midtown-skyline-symphony';
import { fourSeasons } from './midtown-skyline-fourseasons';
import { mayfairTower } from './midtown-skyline-mayfair';
import { alexanOn8th } from './midtown-skyline-alexan';
import { mByRadius } from './midtown-skyline-mradius';
import { squareOn5th } from './midtown-skyline-square5th';
import { twoMidtownPlaza } from './midtown-skyline-twomidtown';
import { westPeachtree1072 } from './midtown-skyline-1072';
import { promenadeCentral, promenadeTower } from './midtown-promenade';
import { peachtree1100 } from './midtown-skyline-1100';
import { campanile } from './midtown-skyline-campanile';

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;
/** Rendered ground in the landmark's street frame, metres above the site grade. */
export type LocalGround = (u: number, v: number) => number | null;
const site = sites.oneAtlantic;

function oneAtlantic(shell: Shell) {
  const granite = '#ccaea0', trim = '#d7c1ae', glass = ['#485768', '#546577', '#435363'];
  const shaftGlass = new Builder(), shaftUv: number[] = [];
  shell.prism(shell.ring, shell.base, 201, granite, trim);
  for (let face = 0; face < 4; face++) {
    const angle = face * Math.PI / 2;
    const point = (u: number, y: number, depth: number) => [
      u * Math.cos(angle) + depth * Math.sin(angle), y, u * Math.sin(angle) - depth * Math.cos(angle),
    ];
    function panel(u: number, v: number, lo: number, hi: number, depth: number, color: string) {
      shell.body.quad(point(u, lo, depth), point(u, hi, depth), point(v, hi, depth), point(v, lo, depth), color);
    }
    // Central arched entrance and two tall square-headed sidelights.
    panel(-4.4, 4.4, 0, 11, 26.3, glass[0]);
    for (let k = 0; k < 10; k++) {
      const a = k * Math.PI / 10, b = (k + 1) * Math.PI / 10;
      shell.body.tri(point(0, 11, 26.3), point(4.4 * Math.cos(a), 11 + 4.4 * Math.sin(a), 26.3),
        point(4.4 * Math.cos(b), 11 + 4.4 * Math.sin(b), 26.3), glass[0]);
    }
    for (const side of [-1, 1]) panel(side * 10 - 1.6, side * 10 + 1.6, 1, 13, 26.3, glass[1]);
    // Grouped multi-pane strips between granite piers, in the shared
    // Johnson/Burgee granite atlas (see johnson-burgee.ts). Each face uses
    // its own nine atlas bays, so lit offices never repeat around the tower.
    for (const [left, right, depth, start, bays] of [[-14, 14, 26.3, 0, 7], [-19, -15, 24.2, 7, 1], [15, 19, 24.2, 8, 1]]) {
      const u0 = (start + 9 * face) / 36, u1 = u0 + bays / 36;
      shaftGlass.quad(point(left, 18, depth + .07), point(right, 18, depth + .07),
        point(right, 201, depth + .07), point(left, 201, depth + .07), '#ffffff');
      shaftUv.push(u0,0, u1,0, u1,1, u0,0, u1,1, u0,1);
    }
    // Floodlit pointed pinnacles stand clear of the sloping copper planes.
    for (const u of [-18, -9, 0, 9, 18]) {
      const p = point(u, 0, 21);
      const r = 1.4;
      const square: P2[] = [[-r,-r],[r,-r],[r,r],[-r,r]].map(([x,z]) => [p[0]+x,p[2]+z]);
      shell.prism(square, 200, 208, trim, trim);
      square.forEach(([x,z], i) => {
        const [nx,nz] = square[(i+1)%4];
        shell.body.tri([x,208,z],[nx,208,nz],[p[0],214,p[2]], trim);
      });
    }
    const a = point(-20, 208, 20), b = point(20, 208, 20), peak = [0,244,0];
    shell.body.tri(a, peak, b, '#708780');
    shell.lights.tri(point(-20.08,208,20.12), point(-18.9,208,20.12), [0,244.18,0], '#c7b38d');
  }
  const collar: P2[] = [[-20,-20],[20,-20],[20,20],[-20,20]];
  shell.prism(collar, 200, 208, trim, trim);
  collar.forEach(([x,z], i) => {
    const [a,b] = collar[(i+1)%4];
    shell.lights.quad([x*1.002,202,z*1.002],[x*1.002,208,z*1.002],[a*1.002,208,b*1.002],[a*1.002,202,b*1.002], trim);
    shell.lights.tri([x*.065,242,z*.065],[a*.065,242,b*.065],[0,site.heightM,0], '#d9ac64');
  });
  const model = shell.finish('#ffe2af', .85);
  // The pink Spanish granite is the same flame-finished ashlar as 191
  // Peachtree's Rosa Dante, with a three-floor band module (photo estimate).
  const strips = graniteWindowAtlas({ bays: Array.from({length: 36}, () => ({panes: 4, width: 16, grouped: true})),
    floors: 45, bayWidth: 24, floorHeight: 12, granite: [204, 174, 160], frame: [214, 206, 196],
    groupFloors: 3, bandHeight: 3, punchedSill: 2, punchedHead: 9, occupancy: .16, seed: 1987 });
  const coursing = ashlarCoursing(1.5, .75, 'vStonePos.y < 200.0 && diffuseColor.r > 0.45 && diffuseColor.g < 0.5', .08);
  // finish() adds the vertex-coloured stone first and the lamps second.
  const [stone] = model.group.children as Mesh<BufferGeometry, MeshLambertMaterial>[];
  const isStone = stone?.material.vertexColors && stone.material.emissive.getHex() === 0;
  for (const material of isStone ? [strips, stone.material] : [strips]) {
    material.onBeforeCompile = shader => withStonePosition(shader, coursing);
    material.customProgramCacheKey = () => 'one-atlantic-ashlar';
  }
  const geometry = shaftGlass.geometry();
  geometry.setAttribute('uv', new Float32BufferAttribute(shaftUv, 2));
  const shaft = new Mesh(geometry, strips);
  shaft.name = 'One Atlantic shaft';
  shaft.castShadow = shaft.receiveShadow = true;
  model.group.add(shaft);
  return {...model, setNight(night: number) {
    model.setNight(night);
    strips.emissiveIntensity = 2 * night;
  }};
}

const landmarks = [
  { site, axis: [1,0], probes: [[-24,0],[24,0],[0,-24],[0,24]], build: oneAtlantic },
  { site: sites.towerSquare, axis: [1,.083], probes: [[-25,0],[25,0],[0,-32],[0,32]], build: towerSquare },
  { site: sites.fed, axis: [1,0], probes: [[45,0],[-40,40],[0,-70],[45,30]], build: federalReserve },
  { site: sites.ponce, axis: [1,0], probes: [[0,5],[10,-15],[-19,9],[10,10]], build: ponceDeLeon },
  { site: sites.wimbish, axis: [1,0], probes: [[15,-5],[-15,-5],[22,-14],[0,-10]], build: wimbishHouse },
  { site: sites.academy, axis: [1,0], probes: [[0,0],[-10,-15],[-10,15],[18,0]], build: academyOfMedicine },
  { site: sites.biltmore, axis: [1,0], probes: [[-10,0],[0,-50],[-10,50],[20,45]], build: biltmore },
  { site: sites.terrace, axis: [1,0], probes: [[-31,28],[-12,-25],[36,-20],[29,10]], build: georgianTerrace },
  { site: sites.westPeachtree1072, axis: [1,.0153], probes: [[0,0],[12,-18],[-20,30],[20,30]], build: westPeachtree1072 },
  { site: sites.squareOn5th, axis: [1,0], probes: [[0,0],[-25,-8],[25,-8],[0,8]], build: squareOn5th },
  { site: sites.twoMidtownPlaza, axis: [1,0], probes: [[0,0],[-15,-12],[10,-12],[-2,20]], build: twoMidtownPlaza },
  { site: sites.mayfair, axis: [1,0], probes: [[0,0],[-14,-14],[14,14],[14,-14]], build: mayfairTower },
  { site: sites.alexan8th, axis: [1,0], probes: [[10,0],[10,-35],[10,35],[-15,-30]], build: alexanOn8th },
  { site: sites.mByRadius, axis: [1,0], probes: [[0,0],[-25,0],[25,0],[-29,0]], build: mByRadius },
  { site: sites.fourSeasons, axis: [1,0], probes: [[0,0],[-20,-13],[20,13],[0,40]], build: fourSeasons },
  { site: sites.symphony, axis: [1,0], probes: [[-85,0],[26,0],[0,-15],[0,15]], build: symphonyTower },
  { site: sites.promenadeTower, axis: [1,1], probes: [[-27,0],[25,0],[0,-18],[0,18]], build: promenadeTower },
  { site: sites.campanile, axis: [1,1], probes: [[0,0],[-15,-20],[15,20],[15,-10]], build: campanile },
  { site: sites.peachtree1100, axis: [1,1], probes: [[0,0],[-40,0],[0,-20],[0,20]], build: peachtree1100 },
  { site: sites.promenadeCentral, axis: [1,1], probes: [[-35,-20],[40,15],[0,-26],[0,24]], build: promenadeCentral },
] satisfies { site: typeof site, axis: P2, probes: P2[], build: (shell: Shell, ground: LocalGround) => unknown }[];

export const skylineIds = new Set(landmarks.map(entry => entry.site.id));

export function createSkylineLandmark(buildings: VBuilding[], building: VBuilding, base: number | null,
  groundAt: (x: number, z: number) => number | null) {
  const entry = landmarks.find(({site}) => site.id === building.id);
  if (!entry || building.rings.length !== 1 || base === null) return null;
  const {site, axis, probes, build} = entry;
  const grade = groundAt(site.x, site.z);
  if (grade === null || !Number.isFinite(grade)) return null;
  const shell = localLandmarkShell(buildings, building, site.name, [site.x,site.z], axis,
    probes, base - grade - .35, grade);
  const [c, s] = [Math.cos(Math.atan2(axis[1], axis[0])), Math.sin(Math.atan2(axis[1], axis[0]))];
  const ground: LocalGround = (u, v) => {
    const y = groundAt(site.x + u * c - v * s, site.z + u * s + v * c);
    return y === null || !Number.isFinite(y) ? null : y - grade;
  };
  const built = shell && build(shell, ground);
  if (!built) return built;
  // Trees a landmark plants (1180 Peachtree's terrace crape myrtles), in world coordinates.
  const local = (built as { terraceTrees?: { u: number; v: number; y: number }[] }).terraceTrees ?? [];
  const plantings = local.map(({ u, v, y }) => ({ x: site.x + u * c - v * s, z: site.z + u * s + v * c, y: grade + y }));
  return { ...built, plantings };
}
