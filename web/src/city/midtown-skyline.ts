import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { localLandmarkShell } from './landmark-shell';
import sites from './fixtures/midtown-skyline.json';

import { symphonyTower } from './midtown-skyline-symphony';
import { promenadeCentral, promenadeTower } from './midtown-promenade';

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;
const site = sites.oneAtlantic;

function oneAtlantic(shell: Shell) {
  const granite = '#c0a298', trim = '#d7c1ae', glass = ['#485768', '#546577', '#435363'];
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
    // Tall continuous strips separated by narrow granite ribs on the projecting wings.
    for (const [left, right, depth] of [[-14, 14, 26.3], [-19, -15, 24.2], [15, 19, 24.2]]) {
      const count = Math.round((right - left) / 4);
      for (let bay = 0; bay < count; bay++) {
        const u = left + bay * (right - left) / count + .5;
        const v = left + (bay + 1) * (right - left) / count - .5;
        panel(u, v, 18, 201, depth, glass[0]);
        const a = point(u, 0, depth), b = point(v, 0, depth);
        shell.facade([a[0], a[2]], [b[0], b[2]], 18, 201, 46, 9, .96, .82, glass, .13);
      }
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
  return shell.finish('#ffe2af', .85);
}

const landmarks = [
  { site, axis: [1,0], probes: [[-24,0],[24,0],[0,-24],[0,24]], build: oneAtlantic },
  { site: sites.symphony, axis: [1,0], probes: [[-85,0],[26,0],[0,-15],[0,15]], build: symphonyTower },
  { site: sites.promenadeTower, axis: [1,1], probes: [[-27,0],[25,0],[0,-18],[0,18]], build: promenadeTower },
  { site: sites.promenadeCentral, axis: [1,1], probes: [[-35,-20],[40,15],[0,-26],[0,24]], build: promenadeCentral },
] satisfies { site: typeof site, axis: P2, probes: P2[], build: typeof oneAtlantic }[];

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
  return shell && build(shell);
}
