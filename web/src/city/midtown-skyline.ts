import { BufferGeometry, Float32BufferAttribute, Mesh, MeshLambertMaterial } from 'three';
import { Builder, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { localLandmarkShell } from './landmark-shell';
import { ashlarCoursing, graniteWindowAtlas, withStonePosition } from './johnson-burgee';
import sites from './fixtures/midtown-skyline.json';

import { georgianTerrace } from './midtown-skyline-terrace';
import { symphonyTower } from './midtown-skyline-symphony';
import { promenadeCentral, promenadeTower } from './midtown-promenade';

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
    // Johnson/Burgee granite atlas (see johnson-burgee.ts). Each face starts
    // at a different atlas bay so lit offices do not repeat around the tower.
    for (const [left, right, depth, start, bays] of [[-14, 14, 26.3, 0, 7], [-19, -15, 24.2, 7, 1], [15, 19, 24.2, 8, 1]]) {
      const u0 = (start + 2 * face) / 9, u1 = u0 + bays / 9;
      shaftGlass.quad(point(left, 18, depth + .02), point(right, 18, depth + .02),
        point(right, 201, depth + .02), point(left, 201, depth + .02), '#ffffff');
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
  const strips = graniteWindowAtlas({ bays: Array.from({length: 9}, () => ({panes: 4, width: 16, grouped: true})),
    floors: 45, bayWidth: 24, floorHeight: 12, granite: [204, 174, 160], frame: [214, 206, 196],
    groupFloors: 3, bandHeight: 3, punchedSill: 2, punchedHead: 9, occupancy: .16, seed: 1987 });
  const coursing = ashlarCoursing(1.5, .75, 'diffuseColor.r > 0.45 && diffuseColor.g < 0.56', .08);
  const stone = model.group.children[0] as Mesh<BufferGeometry, MeshLambertMaterial>;
  for (const material of [strips, stone.material]) {
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
  { site: sites.terrace, axis: [1,0], probes: [[-31,28],[-12,-25],[36,-20],[29,10]], build: georgianTerrace },
  { site: sites.symphony, axis: [1,0], probes: [[-85,0],[26,0],[0,-15],[0,15]], build: symphonyTower },
  { site: sites.promenadeTower, axis: [1,1], probes: [[-27,0],[25,0],[0,-18],[0,18]], build: promenadeTower },
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
  return shell && build(shell, ground);
}
