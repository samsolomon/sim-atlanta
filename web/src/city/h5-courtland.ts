import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { along, faces, litFacade, seedOf, wound } from './skin-kit';

// Overture still calls 345 Courtland "CenturyLink". Keep the building ID across the reskin.
export const h5CourtlandId = '9e51304f-8eb8-4e8e-a2cc-197113c121c1';

export function createH5Courtland(buildings: VBuilding[], grid: GroundGrid) {
  const shell = landmarkShell(buildings, grid, h5CourtlandId, 'H5 Data Centers, 345 Courtland',
    [727, -1250], [1, 0], [[0, 0]]);
  if (!shell) return null;
  const ring = wound(shell.ring, 1);
  const roof = 319.9, baseTop = 305.3, rim = '#7c8080', casing = '#dad8cf';
  shell.prism(ring, shell.base, baseTop, '#38393a', rim);
  shell.prism(ring, baseTop, roof, '#a4a5a4', '#979694');
  faces(ring, (a, b, length, edge) => {
    litFacade(shell, seedOf(h5CourtlandId), edge, a, b, baseTop + 0.25, roof - 0.35,
      4, 2.8, 0.72, 0.8, ['#88959b', '#919da1'], 0.018);
    // On Courtland the pale portal stands forward of the dark, patterned plinth.
    if (a[0] > -19 || b[0] > -19 || length < 30) return;
    const door = length * 0.5;
    const entry = along(a, b, length, door);
    const threshold = grid.sample(727 + entry[0], -1250 + entry[1]) ?? shell.base;
    const jamb = (lo: number, hi: number, foot: number, top: number, color: string, depth: number) => {
      const plan = [along(a,b,length,lo,-0.12), along(a,b,length,hi,-0.12),
        along(a,b,length,hi,depth), along(a,b,length,lo,depth)];
      shell.prism(plan, foot, top, color, color);
    };
    jamb(door-2.2,door+2.2,threshold,threshold+3.15,'#727c7e',0.07);
    jamb(door-2.65,door-2.2,threshold-0.15,threshold+3.85,casing,0.45);
    jamb(door+2.2,door+2.65,threshold-0.15,threshold+3.85,casing,0.45);
    jamb(door-2.2,door+2.2,threshold+3.15,threshold+3.85,casing,0.45);
    jamb(door-0.05,door+0.05,threshold,threshold+3.15,casing,0.13);
    for (let u = 1.4; u < length - 1; u += 2.8) {
      if (Math.abs(u-door) < 2.9) continue;
      const end = Math.min(length, u+1.2);
      const panel = (pos: number, y: number) => {
        const [x,z] = along(a,b,length,pos,0.07);
        return [x,y,z];
      };
      // A broad chevron in each lower panel suggests the fine perforated pattern at City scale.
      shell.body.quad(panel(u,baseTop-1.65), panel(u,baseTop-1.53),
        panel(end,baseTop-0.7),panel(end,baseTop-0.82),'#464749');
    }
  });
  // Broad roof returns cluster at 319.8–321.1 m, with a smaller raised central run at 324.2 m.
  const plant = (l: number, r: number, near: number, far: number, top: number) => {
    const plan: P2[] = [[l,near],[r,near],[r,far],[l,far]];
    shell.prism(plan, roof, top, rim, '#a3a49e');
  };
  plant(-17, 17, -24, -12, 321.1);
  plant(-5, 5, -9, 4, 324.2);
  plant(-9, 7, 8, 21, 321.0);
  return shell.finish('#ded3ad', 0.37);
}
