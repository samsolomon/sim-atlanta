// Private Brookwood fixture. All offsets are outwards from the painted outer stripe.
import { clippedWallCap, type Underside } from './soffit-cap';
import { ribbons, sectionAt } from '../../../web/src/terrain/connector-corridor';
import { Builder, Line, type P2 } from '../../../web/src/vignette/geom';

const nb = 28038801, sb = 369529905;
const roads = new Map([nb, sb].map(id => [id, ribbons.find(r => r.id === id)!]));
export function roadsidePoint(id: number, s: number, offset: number): P2 {
  const {inner, outer} = sectionAt(roads.get(id)!, s);
  const dx = outer[0] - inner[0], dz = outer[1] - inner[1];
  const width = Math.hypot(dx, dz);
  return [outer[0] + offset * dx / width, outer[1] + offset * dz / width];
}

// S2, S3: capped road face and exposed shaft. N2, N3: separate barrier
// and ribbed approach face. Bounds crop the observed runs; heights are inferred.
export const protections = [
  {name: 'NB capped wall', id: nb, start: 835, end: 860, offset: 3.6, height: 2.3, depth: .65},
  {name: 'SB barrier', id: sb, start: 132, end: 157, offset: 2.8, height: .80, depth: .48},
  {name: 'SB ribbed face', id: sb, start: 130, end: 141.54, offset: 3.745, height: 7, depth: .65},
] as const;

type Surface = (x: number, z: number) => number | null;
type Vertex = [number, number, number];

// Use actual board elevations and guideway underside facets in world-space scene metres.
export function roadsideWalls(ground: Surface, underside: Underside) {
  return protections.map(spec => {
    const body = new Builder();
    const ribbed = spec.name === 'SB ribbed face';
    const capped = spec.id === nb;
    const stations = new Set<number>([spec.start, spec.end]);
    for (let s = Math.ceil(spec.start); s < spec.end; s++) stations.add(s);
    // Rounded rib profile approximated by two facets at each crest.
    if (ribbed) for (let s = spec.start; s < spec.end; s += .4) {
      for (const ds of [0, .10, .20]) if (s + ds < spec.end) stations.add(s + ds);
    }
    const ordered = [...stations].sort((a,b) => a-b).filter((s,i,a) => !i || s-a[i-1] > 1e-7);
    const atToe = (s:number) => ground(...roadsidePoint(spec.id,s,spec.offset));
    const ends = [atToe(spec.start),atToe(spec.end)] as const;
    if (ends[0] === null || ends[1] === null) throw Error('Missing wall endpoint');
    const [startY,endY] = ends;
    const rows = ordered.map(s => {
      const edge = roadsidePoint(spec.id, s, spec.offset);
      const base = ground(...edge);
      if (base === null || !Number.isFinite(base)) throw Error('Missing wall ground at ' + s);
      function vertex(offset: number, y: number): Vertex {
        const [x,z] = roadsidePoint(spec.id, s, spec.offset + offset);
        return [x, y, z];
      }
      const datum = capped ? startY + (endY-startY)*(s-spec.start)/(spec.end-spec.start) : base;
      const top = datum + spec.height;
      const phase = (s - spec.start) / .4;
      const ribOffset = ribbed ? .055 * Math.min(1, Math.abs(phase - Math.floor(phase) - .25) * 4) : 0;
      const lip = capped ? .17 : 0;
      const inset = capped ? .07 : ribbed ? ribOffset : .20;
      const rear = roadsidePoint(spec.id, s, spec.offset + spec.depth);
      const rearBase = ground(...rear);
      if (rearBase === null || !Number.isFinite(rearBase)) throw Error('Missing back of wall at ' + s);
      // The cap projects landward only. The complete paved shoulder stays available.
      const frontBottom = vertex(ribbed ? ribOffset : 0, base - .15);
      const frontTop = vertex(inset, top - lip);
      const capBottom = vertex(0, top - lip);
      const capTop = vertex(0, top);
      return {frontBottom, frontTop, capBottom, capTop, stemToe: vertex(inset, base + .35),
        backTop: vertex(spec.depth, top), backBottom: vertex(spec.depth, rearBase - .15)};
    });
    if (ribbed) {
      const cap = clippedWallCap(underside);
      for(let i=1;i<rows.length;i++){
        const a=rows[i-1], b=rows[i];
        cap(body,[a.frontBottom,a.backBottom,b.backBottom,b.frontBottom],
          [i===1?'#ada99e':null,'#a6a195',i===rows.length-1?'#ada99e':null,'#b5b1a7']);
      }
      return {name:spec.name,geometry:body.geometry()};
    }
    const xyz = (p: Vertex): P2 => [p[0], p[2]];
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i-1], b = rows[i];
      if (capped) {
        // Builder.wall faces its right side. Reverse station order to face the traffic.
        const line = new Line([xyz(b.frontTop), xyz(a.frontTop)]);
        const lerp = (u: number, v: number, t: number) => u + (v-u)*t/line.length;
        body.quad(b.frontBottom,a.frontBottom,a.stemToe,b.stemToe,'#989387');
        body.wall(line, 0, t => lerp(b.stemToe[1],a.stemToe[1],t),
          t => lerp(b.frontTop[1],a.frontTop[1],t), '#ada89d', line.length);
        body.quad(a.capBottom,b.capBottom,b.frontTop,a.frontTop,'#817c72');
        body.quad(b.capBottom,a.capBottom,a.capTop,b.capTop,'#bfb8a9');
      } else {
        body.quad(b.frontBottom,a.frontBottom,a.frontTop,b.frontTop,
          '#aaa69a');
      }
      const at = capped ? a.capTop : a.frontTop, bt = capped ? b.capTop : b.frontTop;
      body.quad(at, a.backTop, b.backTop, bt, '#c4beb1');
      body.quad(a.backBottom,b.backBottom,b.backTop,a.backTop,'#a6a195');
    }
    for (const i of [0, rows.length-1]) {
      const r = rows[i];
      const endQuad = (a: Vertex,b: Vertex,c: Vertex,d: Vertex) => {
        if (i === 0) body.quad(a,b,c,d,'#ada99e');
        else body.quad(d,c,b,a,'#ada99e');
      };
      if (capped) {
        const backAt = (y: number): Vertex => [r.backTop[0],y,r.backTop[2]];
        endQuad(r.frontBottom,r.backBottom,backAt(r.stemToe[1]),r.stemToe);
        endQuad(r.stemToe,backAt(r.stemToe[1]),backAt(r.frontTop[1]),r.frontTop);
        endQuad(r.capBottom,backAt(r.frontTop[1]),r.backTop,r.capTop);
      } else endQuad(r.frontBottom,r.backBottom,r.backTop,r.frontTop);
    }
    return {name: spec.name, geometry: body.geometry()};
  });
}
