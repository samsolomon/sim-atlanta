import * as THREE from 'three';
import model from '../../../pipeline/prototypes/five-points-east-cut/model.json';
import type { GroundGrid } from '../terrain/grid';
import type { OpenSlot } from '../terrain/openings';
import { Builder, Line } from '../vignette/geom';
import { trackInDaylight, type Alignment } from '../vignette/world';
import { cutPoint } from './east-cut';

const names = ['ER', 'X', 'EL', 'CSX'] as const;
const bed = (grid: GroundGrid) => model.illustrativeBedNavd88M - grid.manifest.vertical.sceneZeroNavd88M;

function offset(path: number[][], s: number) {
  if (s <= path[0][0]) return path[0][1];
  for (let i = 1; i < path.length; i++) {
    const [b, v] = path[i], [a, u] = path[i-1];
    if (s <= b) return u + (s-a)*(v-u)/(b-a);
  }
  return path[path.length-1][1];
}

export function maskCut(al: Alignment): Alignment {
  return { ...al, openToSky(d) {
    const p = al.line.at(d), x = p.x - model.origin[0], z = p.z - model.origin[1];
    const s = x * model.along[0] + z * model.along[1], u = x * model.across[0] + z * model.across[1];
    return !(s > -22 && s < 135 && Math.abs(u) < 35) && trackInDaylight(al, d);
  } };
}

/** Bound each strip halfway to its neighbour. Each strip ends at its own mapped mouth. */
function bands(emit: (i: number, a: number, b: number, l: number, r: number, l1: number, r1: number) => void) {
  for (const [i, name] of names.entries()) {
    const path = model.tracks[name];
    function bounds(s: number) {
      const u = offset(path, s);
      return [i ? (u + offset(model.tracks[names[i-1]], s))/2 : u-2.2,
        i < names.length-1 ? (u + offset(model.tracks[names[i+1]], s))/2 : u+2.4];
    }
    const end = path[path.length-1][0];
    for (let a = path[0][0]; a < end; a++) {
      const b = Math.min(end, a+1), [l,r] = bounds(a), [l1,r1] = bounds(b);
      emit(i, a, b, l, r, l1, r1);
    }
  }
}

export function cutOpenings(grid: GroundGrid) {
  const slots: OpenSlot[] = [], y = bed(grid)-.12;
  bands((_i, a, b, l, r, l1, r1) => {
    const [x,z] = cutPoint(a, (l+r)/2), [x1,z1] = cutPoint(b, (l1+r1)/2);
    slots.push({ start: [x,y,z], end: [x1,y,z1], halfWidthM: Math.max(r-l,r1-l1)/2+.08 });
  });
  return slots;
}

export function cutFloor(grid: GroundGrid) {
  const mesh = new Builder(), y = bed(grid);
  const vertex = (s: number, u: number, h: number) => { const [x,z] = cutPoint(s,u); return [x,h,z]; };
  const rim = (s: number, u: number) => Math.max(y, (grid.sample(...cutPoint(s,u)) ??
    model.illustrativeBedNavd88M) - grid.manifest.vertical.sceneZeroNavd88M);
  bands((i, a, b, l, r, l1, r1) => {
    mesh.quad(vertex(a,l,y),vertex(b,l1,y),vertex(b,r1,y),vertex(a,r,y),'#655f57');
    const wall = (u: number, v: number) => mesh.quad(vertex(a,u,y),vertex(b,v,y),
      vertex(b,v,rim(b,v)),vertex(a,u,rim(a,u)),'#94897a');
    // Each mapped strip stops at its own mouth. The track tangent fixes the
    // plane on which a passing car clips, including the skew at the east end.
    const path = model.tracks[names[i]];
    const endFace = (west: boolean, s: number, left: number, right: number) => {
      const tip = west ? path[0] : path[path.length-1];
      const next = west ? path[1] : path[path.length-2];
      const slope = (next[1]-tip[1])/(next[0]-tip[0]);
      const plane = (u: number) => s - slope*(u-tip[1]);
      const street = (u: number) => rim(plane(u),u);
      const lintel = (u: number) => Math.max(y, Math.min(y + (names[i] === 'CSX' ? 6.4 : 4.5), street(u)-.45));
      const at = (u: number, h: number) => vertex(plane(u),u,h);
      // A dark recess behind the clipping plane leaves the last visible slice
      // of the car in front of it. The lintel reaches the street at each side.
      const back = (u: number, h: number) => vertex(plane(u)+(west ? -.12 : .12),u,h);
      mesh.quad(back(left,y), back(right,y), back(right,lintel(right)), back(left,lintel(left)), '#191b1d');
      mesh.quad(at(left,lintel(left)), at(right,lintel(right)), at(right,street(right)), at(left,street(left)), '#94897a');
      for (const u of [left,right]) {
        mesh.quad(at(u,y), back(u,y), back(u,lintel(u)), at(u,lintel(u)), '#655f57');
      }
    };
    if (a === path[0][0]) endFace(true, a, l, r);
    if (b === path[path.length-1][0]) endFace(false, b, l1, r1);
    if (!i) wall(l,l1);
    if (i === names.length-1) wall(r,r1);
  });
  for (const name of ['ER','X','EL'] as const) {
    const line = new Line(model.tracks[name].map(([s,u]) => cutPoint(s,u)));
    mesh.ribbon(line,2.8,()=>y+.045,'#625c54',1);
    for (let s=.3; s<line.length; s+=.8) mesh.ribbon(line,2.35,()=>y+.08,'#4c453f',1,s,Math.min(s+.18,line.length));
    for (const d of [-.7175,.7175]) mesh.ribbon(line.offset(d,.75),.13,()=>y+.13,'#a6a49a',.75);
  }
  const floor = new THREE.Mesh(mesh.geometry(),new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));
  floor.name = 'Five Points east cut';
  floor.userData.heightTier = 'illustrative';
  floor.receiveShadow = true;
  return floor;
}
