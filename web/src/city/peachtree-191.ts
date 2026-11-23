import * as THREE from 'three';
import { Builder, pointInRing, rng, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';

const footprintId = 'cca22dcb-b333-4b2a-9371-869465370bda';
// Survey-independent plan from OSM parts 537432531–33, in City's east/south metres.
const shaft: P2[] = [[486.8,-548.9],[487.2,-585.1],[456.2,-585.5],[456.2,-580.5],
  [442.7,-580.6],[442.7,-585.7],[411.8,-586],[411.4,-549.8],[441.8,-549.4],
  [441.9,-554.5],[455.8,-554.3],[455.8,-549.3]];
// Fit the complete crown on each load-bearing wing. The opposing notch
// corners bound the wings more tightly than the mapped roof-part centres.
const crowns: P2[] = [
  [(shaft[6][0] + shaft[8][0]) / 2, -567.7],
  [(shaft[2][0] + shaft[0][0]) / 2, -567.2],
];
const shoulderOffsetX = 11.75; // 6 m footings on wings ~30 m wide
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

// A single atlas fits a whole outer elevation and three punched bays in the slot.
function facade() {
  const bayWidth = 24, floorHeight = 12, floors = 46;
  const w = 9 * bayWidth, h = floors * floorHeight;
  const day = new Uint8Array(w * h * 4), night = new Uint8Array(day.length);
  const random = rng(191);
  const granite = [218, 207, 193], frame = [122, 127, 127];
  function windowBay(bay: number, panes: number, width: number, grouped: boolean) {
    const left = (bayWidth - width) / 2;
    for (let floor = 0; floor < floors; floor++) {
      const lit = random() < .19 ? .28 + .48 * random() : 0;
      const sill = grouped ? (floor % 4 === 0 ? 3 : 0) : 2;
      for (let y = 0; y < floorHeight; y++) for (let x = 0; x < bayWidth; x++) {
        const dx = x - left;
        const pane = dx >= 0 && dx < width && y >= sill && y < (grouped ? 12 : 9);
        const mullion = pane && ((dx % (width / panes)) < 1 || y === 0);
        const shade = 68 + 4 * (Math.floor(dx * panes / width) % 3);
        const i = 4 * ((floor * floorHeight + y) * w + bay * bayWidth + x);
        day.set(!pane ? granite : mullion ? frame : [shade, shade + 13, shade + 22], i);
        day[i+3] = 255;
        const glow = pane && !mullion ? lit : 0;
        night.set([255*glow, 195*glow, 123*glow, 255], i);
      }
    }
  }
  for (let bay = 0; bay < 9; bay++) {
    const grouped = bay >= 1 && bay <= 4;
    const broad = bay === 2 || bay === 3;
    windowBay(bay, broad ? 4 : 2, broad ? 20 : grouped ? 14 : 12, grouped);
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
    const width = Math.hypot(u-x,v-z);
    const start = width > 25 ? 0 : 6/9;
    const end = width > 25 ? 6/9 : width > 10 ? 1 : 7/9;
    uv.push(start,0, end,0, end,1, start,0, end,1, start,1);
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
  const block = (w: number, low: number, high: number, color: string) =>
    b.box(w, high-low, w, x, (low+high)/2, z, color);
  // The paired windows occupy the lower stage. Four domed corner pavilions
  // step out beyond it, leaving a taller square drum behind the glazing.
  block(26.2,shaftTop,214.2,stone);
  block(25.2,214.2,215,cornice);
  block(20,214.8,218.5,stone);
  block(20.6,218.5,219.2,cornice);
  const directions = [[1,0],[-1,0],[0,1],[0,-1]];
  for (const [nx,nz] of directions) {
    const at = (s: number, y: number, out: number) => [x+nx*out+s*nz,y,z+nz*out-s*nx];
    for (const s of [-3.35,3.35]) {
      arch(b,x+nx*13.15+s*nz,z+nz*13.15-s*nx,nx,nz,203.4,209.9,2.6,.36,true);
      for (const dx of [-.9,.9]) {
        const peak = 209.9 + Math.sqrt(2.6**2 - dx**2);
        b.quad(at(s+dx-.09,203.4,13.19),at(s+dx+.09,203.4,13.19),
          at(s+dx+.09,peak,13.19),at(s+dx-.09,peak,13.19),'#939491');
      }
      for (const y of [206.8,209.9]) b.quad(at(s-2.6,y,13.19),at(s+2.6,y,13.19),
        at(s+2.6,y+.18,13.19),at(s-2.6,y+.18,13.19),'#939491');
    }
    for (const s of [-6.6,0,6.6]) {
      b.box(nx ? .65 : .85,10.8,nz ? .65 : .85,x+nx*13.22+s*nz,208.4,z+nz*13.22-s*nx,cornice);
    }
    // Paired narrow openings on either side of a projecting central pier.
    for (const s of [-3.9,3.9]) {
      arch(b,x+nx*8+s*nz,z+nz*8-s*nx,nx,nz,219.2,227.6,2.35,.75,false);
    }
    b.box(nx ? 1.7 : 3.2,11.6,nz ? 1.7 : 3.2,x+nx*7.9,225,z+nz*7.9,stone);
    b.box(nx ? 2.1 : 3.7,.85,nz ? 2.1 : 3.7,x+nx*8,230.8,z+nz*8,cornice);
  }
  for (const dx of [-1,1]) for (const dz of [-1,1]) {
    const sx = x+dx*shoulderOffsetX, sz = z+dz*12.8;
    b.box(6,10.3,6,sx,208.15,sz,stone);
    b.box(5.5,1.3,5.5,sx,213.95,sz,cornice);
    const dome = new THREE.SphereGeometry(2.68,12,4,0,2*Math.PI,0,Math.PI/2);
    dome.translate(sx,214.6,sz);
    b.addGeometry(dome,'#e8e4da');

    const px = x+dx*7.3, pz = z+dz*7.3;
    b.box(3.1,12.2,3.1,px,225.3,pz,stone);
    b.box(1.4,10.6,3.65,px,225,pz,cornice);
    b.box(3.65,10.6,1.4,px,225,pz,cornice);
    b.box(3.7,.7,3.7,px,230.9,pz,stone);
    b.box(4.45,.95,4.45,px,231.75,pz,cornice);
    const ball = new THREE.SphereGeometry(1.25,10,6);
    ball.translate(px,top-1.25,pz);
    b.addGeometry(ball,'#d7cabb');
  }
  block(16.6,229.9,230.8,stone);
  block(17.8,230.8,231.3,cornice);
  block(16.7,231.3,232,stone);
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
    shader.vertexShader = 'varying vec3 vStonePos;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>', '#include <begin_vertex>\n vStonePos = position;');
    shader.fragmentShader = 'varying vec3 vStonePos;\n' + shader.fragmentShader.replace(
      '#include <color_fragment>', `#include <color_fragment>
        vec2 tile = vec2((vStonePos.x + vStonePos.z) / 2.3, vStonePos.y / 1.45);
        vec2 footprint = max(fwidth(tile), vec2(0.001));
        tile.x += 0.5 * mod(floor(tile.y), 2.0);
        vec2 edge = 0.5 - abs(fract(tile) - 0.5);
        vec2 seam = 1.0 - smoothstep(vec2(0.01), 0.035 + footprint, edge);
        seam *= 1.0 - smoothstep(vec2(0.12), vec2(0.65), footprint);
        if (vStonePos.y < 219.2 && diffuseColor.r > 0.5 && diffuseColor.r < 0.8) {
          diffuseColor.rgb *= 1.0 - 0.13 * max(seam.x, seam.y);
        }`).replace(
      '#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float lift = vStonePos.y < 219.0 ? vStonePos.y - 205.0 : vStonePos.y - 219.0;
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
