import * as THREE from 'three';
import profiles from './fixtures/north-profile-study.json';
import { Builder, Line } from '../vignette/geom';
import { orientedBox } from './midtown-marta-guideway';

export const extensions = profiles.map(profile => {
  const line = new Line(profile.rows.map(r => [r[1], r[3]]));
  const at = (s: number) => {
    const vertex = line.vertexAt(s);
    const i = Math.min(line.pts.length - 2, Math.floor(vertex));
    return THREE.MathUtils.lerp(profile.rows[i][2], profile.rows[i + 1][2], vertex - i);
  };
  return { line, at };
});

export function studyRails() {
  const body = new Builder();
  for (const { line, at } of extensions) {
    for (let s = 0; s < line.length; s += 1.5) {
      const end = Math.min(s + 1.5, line.length);
      const a = line.at(s), b = line.at(end);
      const edge = (p: typeof a, h: number, offset: number) =>
        [p.x + p.nx * offset, h, p.z + p.nz * offset];
      const h = at(s), k = at(end);
      body.quad(edge(a,h,-1.6),edge(b,k,-1.6),edge(b,k,1.6),edge(a,h,1.6),'#898375');
      orientedBox(body,a.x,a.z,a.dx,a.dz,h,h+.04,.11,1.28,'#65594f');
      for (const rail of [-.7175,.7175]) {
        body.quad(edge(a,h+.07,rail-.045),edge(b,k+.07,rail-.045),
          edge(b,k+.07,rail+.045),edge(a,h+.07,rail+.045),'#c0b7a9');
      }
    }
  }
  const mesh = new THREE.Mesh(body.geometry(), new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));
  mesh.name = 'Inferred North Line extension';
  return mesh;
}
