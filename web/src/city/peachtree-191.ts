import * as THREE from 'three';
import { Builder, pointInRing, rng, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';

const footprintId = 'cca22dcb-b333-4b2a-9371-869465370bda';
// Survey-independent plan from OSM parts 537432531–33, in City's east/south metres.
const shaft: P2[] = [[486.8,-548.9],[487.2,-585.1],[456.2,-585.5],[456.2,-580.5],
  [442.7,-580.6],[442.7,-585.7],[411.8,-586],[411.4,-549.8],[441.8,-549.4],
  [441.9,-554.5],[455.8,-554.3],[455.8,-549.3]];
const crowns: P2[] = [[429.5,-567.7],[469,-567.2]];
const stone = '#d4c5b5', cornice = '#e2d3c2', glazing = '#46515a';
const podiumTop = 17, shaftTop = 203;

function roof(b: Builder, ring: P2[], y: number, color: string) {
  const contour = ring.map(([x, z]) => new THREE.Vector2(x, z));
  for (const tri of THREE.ShapeUtils.triangulateShape(contour, [])) {
    const [a, c, d] = tri.map(i => [ring[i][0], y, ring[i][1]]);
    b.tri(a, d, c, color);
  }
}

function walls(b: Builder, ring: P2[], low: number, high: number, color: string) {
  for (let i = 0; i < ring.length; i++) {
    const [x,z] = ring[i], [u,v] = ring[(i+1) % ring.length];
    b.quad([x,low,z],[u,low,v],[u,high,v],[x,high,z],color);
  }
}

// A pair of taller glazed bays separated by pale piers, with quieter punched
// windows between them. One mipmapped facade for every elevation of the shaft.
function facade() {
  const bays = 8, floors = 46, w = bays * 10, h = floors * 8;
  const day = new Uint8Array(w * h * 4), night = new Uint8Array(day.length);
  const random = rng(191);
  const granite = [218,207,193], frame = [126,130,128], glass = [66,77,85];
  for (let f = 0; f < floors; f++) {
    for (let bay = 0; bay < bays; bay++) {
      const lit = random() < .19 ? .28 + .48 * random() : 0;
      const tall = bay % 4 === 1 || bay % 4 === 2;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 10; x++) {
        const pane = x >= 2 && x <= 7 && y >= (tall && f % 4 !== 0 ? 0 : 2) && y < (tall ? 8 : 7);
        const mullion = pane && (x === 5 || y === 0);
        const color = !pane ? granite : mullion ? frame : glass;
        const i = 4 * ((8*f+y)*w + 10*bay+x);
        day.set(color, i);
        day[i+3] = 255;
        const glow = pane && !mullion ? lit : 0;
        night[i] = 255*glow; night[i+1] = 195*glow; night[i+2] = 123*glow; night[i+3] = 255;
      }
    }
  }
  function texture(bytes: Uint8Array<ArrayBuffer>) {
    const t = new THREE.DataTexture(bytes, w, h);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
    return t;
  }
  const map = texture(day), emissiveMap = texture(night);
  const material = new THREE.MeshLambertMaterial({ map, emissiveMap, emissive: 0xffffff,
    emissiveIntensity: 0, side: THREE.DoubleSide });
  material.addEventListener('dispose', () => { map.dispose(); emissiveMap.dispose(); });
  const b = new Builder(), uv: number[] = [];
  walls(b, shaft, podiumTop, shaftTop, '#ffffff');
  for (let i = 0; i < shaft.length; i++) {
    const [x,z] = shaft[i], [u,v] = shaft[(i+1) % shaft.length];
    const repeats = Math.max(1, Math.round(Math.hypot(u-x,v-z)/3.1)) / bays;
    uv.push(0,0, repeats,0, repeats,1, 0,0, repeats,1, 0,1);
  }
  const geo = b.geometry();
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return new THREE.Mesh(geo, material);
}

// A rounded opening drawn on a facade pointing along (nx,nz). For the
// lantern, only its stone arch is present and the sky shows between piers.
function arch(b: Builder, x: number, z: number, nx: number, nz: number,
  base: number, spring: number, radius: number, frame: number, glazed: boolean) {
  const at = (s: number, y: number) => [x + s*nz, y, z - s*nx];
  if (glazed) b.quad(at(-radius,base),at(radius,base),at(radius,spring),at(-radius,spring),glazing);
  for (let i = 0; i < 8; i++) {
    const a = i*Math.PI/8, e = (i+1)*Math.PI/8;
    const arc = (angle: number, r: number) => at(r*Math.cos(angle),spring+r*Math.sin(angle));
    b.quad(arc(a,radius),arc(e,radius),arc(e,radius+frame),arc(a,radius+frame),cornice);
    if (glazed) b.tri(at(0,spring),arc(a,radius),arc(e,radius),glazing);
  }
}

function crown(b: Builder, x: number, z: number, top: number) {
  // Heights in this seven-storey crown are estimated from the two elevations.
  const block = (w: number, low: number, high: number, color: string) =>
    b.box(w, high-low, w, x, (low+high)/2, z, color);
  block(27,shaftTop,206,stone);
  block(25.6,206,215.8,stone);
  block(26.4,215.8,217,cornice);
  for (const [nx,nz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const corner = (side: number, half: number, y: number) =>
      [x + half*(nx+side*nz), y, z + half*(nz-side*nx)];
    b.quad(corner(-1,13.2,217),corner(1,13.2,217),corner(1,10.1,219),corner(-1,10.1,219),stone);
  }
  block(20.2,218.9,219.5,cornice);
  for (const [nx,nz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    for (const s of [-3.4,3.4]) arch(b,x+nx*12.83+s*nz,z+nz*12.83-s*nx,nx,nz,206.8,211.6,2.3,.42,true);
    arch(b,x+nx*8.6,z+nz*8.6,nx,nz,219,226.8,5.6,1.15,false);
  }
  for (const dx of [-7.4,7.4]) for (const dz of [-7.4,7.4]) {
    b.box(3.4,12.5,3.4,x+dx,225.25,z+dz,stone);
    b.box(4.1,1.1,4.1,x+dx,231.55,z+dz,cornice);
    const finial = new THREE.IcosahedronGeometry(.85);
    finial.translate(x+dx,top-.85,z+dz);
    b.addGeometry(finial,cornice);
  }
  block(18.8,231.9,233,cornice);
  const dome = new THREE.SphereGeometry(6.8,12,4,0,2*Math.PI,0,Math.PI/2);
  dome.scale(1,(top-233)/6.8,1); dome.translate(x,233,z);
  b.addGeometry(dome,'#bdb3a5');
}

export function createPeachtree191(buildings: VBuilding[], groundAt: (x: number,z: number) => number | null) {
  const source = buildings.find(b => b.id === footprintId), ring = source?.rings[0];
  if (!ring || !crowns.every(([x,z]) => pointInRing(x,z,ring))) return null;
  const ground = groundAt(449,-567.5);
  if (ground === null || !Number.isFinite(ground)) return null;
  let base = ground;
  for (const [x,z] of ring) {
    const y = groundAt(x,z);
    if (y === null || !Number.isFinite(y)) return null;
    base = Math.min(base,y);
  }
  const body = new Builder(), lanterns = new Builder();
  walls(body,ring,base-ground-1,podiumTop,stone);
  roof(body,ring,podiumTop,'#aba59c');
  roof(body,shaft,shaftTop,'#a69e92');
  // The west entrance is a three-storey arched glazed portal on Peachtree Street.
  arch(body,385.4,-567.8,-1,0,.3,8.9,4.4,.7,true);
  for (const [x,z] of crowns) crown(lanterns,x,z,234.7);
  const windows = facade();
  const trim = new THREE.Mesh(body.geometry(),new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));
  const lights = new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide,emissive:0xffddb0,emissiveIntensity:0});
  // Model floodlights at the feet of the lower arcade and lantern. Keep
  // the dark glazed arches dark even when their stone surrounds are lit.
  lights.onBeforeCompile = shader => {
    shader.vertexShader = 'varying float vCrownY;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>', '#include <begin_vertex>\n vCrownY = position.y;');
    shader.fragmentShader = 'varying float vCrownY;\n' + shader.fragmentShader.replace(
      '#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float lift = vCrownY < 219.0 ? vCrownY - 205.0 : vCrownY - 219.0;
        float wash = 0.19 + 1.1 * exp(-0.16 * max(lift, 0.0));
        totalEmissiveRadiance *= wash * diffuseColor.rgb;`);
  };
  const caps = new THREE.Mesh(lanterns.geometry(),lights);
  const group = new THREE.Group();
  group.name = '191 Peachtree Tower';
  group.position.y = ground;
  for (const mesh of [trim,windows,caps]) {
    mesh.receiveShadow = mesh.castShadow = true;
    group.add(mesh);
  }
  return {group, buildings: buildings.filter(b => b !== source), setNight(dark: number) {
    const level = THREE.MathUtils.clamp(dark,0,1);
    lights.emissiveIntensity = 1.6 * level;
    windows.material.emissiveIntensity = 2 * level;
  }};
}
