import * as THREE from 'three';
import { Builder, pointInRing, type P2 } from '../vignette/geom';
import { flowerBed, hedge, ornamentals } from '../landscape/primitives';
import type { localLandmarkShell } from './landmark-shell';
import sites from './fixtures/midtown-skyline.json';
import plan from './fixtures/midtown-skyline/1180-peachtree.json';

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;

// 1180 Peachtree (Pickard Chilton, 2006). One smooth blue-green curtain wall
// with silver mullions, a stepped glass wing to the west whose roof holds an
// oval garden around a round pavilion, and two glass "veils" that continue the
// broad faces 36.6 m above the roof and curve in towards each other.
const VEIL = 36.6;
const ROOF = sites.symphony.heightM - VEIL;
const BAY = 1.5, FLOOR = 4.1;

/** A curtain-wall atlas: blue-green glass, 1-pixel silver mullions, a spandrel line per floor. */
function curtainWall() {
  const bays = 24, floors = 20, bw = 16, fh = 12, w = bays * bw, h = floors * fh;
  const day = new Uint8Array(w * h * 4), night = new Uint8Array(day.length);
  let seed = 1180;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let floor = 0; floor < floors; floor++) for (let bay = 0; bay < bays; bay++) {
    const lit = random() < .2 ? .35 + .45 * random() : 0;
    for (let y = 0; y < fh; y++) for (let x = 0; x < bw; x++) {
      const i = 4 * ((floor * fh + y) * w + bay * bw + x);
      const frame = x === 0 || y < 2;
      // Glass brightens slightly towards each floor's head, as the photographs show.
      const g = 92 + Math.round(18 * y / fh);
      day.set(frame ? [200, 210, 212, 255] : [g - 22, g + 22, g + 30, 255], i);
      const glow = frame ? 0 : lit;
      night.set([255 * glow, 205 * glow, 140 * glow, 255], i);
    }
  }
  const texture = (bytes: Uint8Array<ArrayBuffer>) => {
    const t = new THREE.DataTexture(bytes, w, h);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
    return t;
  };
  const map = texture(day), emissiveMap = texture(night);
  const material = new THREE.MeshLambertMaterial({ map, emissiveMap, emissive: 0xffffff, emissiveIntensity: 0, side: THREE.DoubleSide });
  material.addEventListener('dispose', () => { map.dispose(); emissiveMap.dispose(); });
  return { material, width: bays * BAY, height: floors * FLOOR };
}

/** Night emissive strengths for the crown (Kendall/Heaton night skyline: a lit pale wash, never clipped). */
export const CROWN_NIGHT = { veil: .82, lattice: .78, frames: .75, edge: .75 };

export function symphonyTower(shell: Shell) {
  /** Terrace crape myrtles in the landmark's local frame (u, v and terrace height). */
  const terraceTrees: { u: number; v: number; y: number }[] = [];
  const wall = curtainWall();
  const skin = new Builder(), uv: number[] = [];
  // Every exterior wall gets the same atlas, 0.06 m proud of the massing.
  function glaze(ring: P2[], lo: number, hi: number, taller: P2[][] = []) {
    const area = ring.reduce((s, [x, z], i) => { const [u, v] = ring[(i + 1) % ring.length]; return s + x * v - u * z; }, 0);
    const sign = Math.sign(area) || 1;
    let run = 0;
    ring.forEach(([x, z], i) => {
      const [a, b] = ring[(i + 1) % ring.length], len = Math.hypot(a - x, b - z);
      if (len < .3) return;
      const nx = sign * (b - z) / len * .06, nz = -sign * (a - x) / len * .06;
      // A wall a taller part also covers is glazed once, by the taller part.
      const ix = (x + a) / 2 - nx * 8, iz = (z + b) / 2 - nz * 8; // 0.5 m inside this wall
      if (taller.some(r => pointInRing(ix, iz, r))) { run += len; return; }
      const u0 = run / wall.width, u1 = (run + len) / wall.width, v0 = lo / wall.height, v1 = hi / wall.height;
      skin.quad([x + nx, lo, z + nz], [a + nx, lo, b + nz], [a + nx, hi, b + nz], [x + nx, hi, z + nz], '#ffffff');
      uv.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1);
      run += len;
    });
  }
  const parts = plan.parts.map(p => ({ ...p, ring: p.ring as P2[] }));
  const tower = parts.filter(p => p.h >= sites.symphony.heightM - 1);
  const pavilion = parts.find(p => p.id === 'osm:way:1451133449');
  // Wing and shoulders step down to the west; the curved entrance nose is low.
  for (const p of parts) {
    if (tower.includes(p) || p === pavilion) continue;
    shell.prism(p.ring, shell.base, p.h, '#7d9ea6', '#d6cdbd');
    glaze(p.ring, shell.base, p.h, parts.filter(o => o !== p && o.h > p.h).map(o => o.ring));
  }
  for (const p of tower) {
    shell.prism(p.ring, shell.base, ROOF, '#7d9ea6', '#8d9a9c');
    glaze(p.ring, shell.base, ROOF);
  }

  // Roof garden on the 68 m wing: paving, an oval lawn in a clipped hedge round
  // the white pavilion, two cypress cones at the tower end and a glass rail.
  const wing = parts.find(p => p.id === 'osm:way:885660381');
  if (wing) garden(wing);
  function garden(wing: { h: number; ring: P2[] }) {
  const top = wing.h, ground = () => top;
  const oval = (rx: number, rz: number, n = 24): P2[] =>
    Array.from({ length: n }, (_, i) => [-63 + rx * Math.cos(i * 2 * Math.PI / n), rz * Math.sin(i * 2 * Math.PI / n)]);
  shell.prism(oval(14, 11.2), top, top + .18, '#6f9a4e', '#6f9a4e');
  hedge(shell.body, [...oval(15, 12.2, 32), oval(15, 12.2, 32)[0]], ground, { height: .9, width: .9, seed: '1180' });
  const disc = (x: number, z: number, r: number, n = 20): P2[] =>
    Array.from({ length: n }, (_, i) => [x + r * Math.cos(i * 2 * Math.PI / n), z + r * Math.sin(i * 2 * Math.PI / n)]);
  // The pavilion: a smooth white drum with a stepped top edge and a louvred service panel.
  const drum = disc(-59, 0, 6.2, 40);
  shell.prism(drum, top, top + 4.2, '#f2f2ee', '#f4f4f0');
  shell.prism(disc(-59, 0, 6.45, 40), top + 4.2, top + 4.55, '#e6e6e1', '#f4f4f0');
  shell.prism(disc(-59, 0, 5.4, 40), top + 4.55, Math.max(top + 5.3, pavilion?.h ?? 0), '#ecece7', '#f4f4f0');
  for (let k = 0; k < 7; k++) {
    const y = top + .8 + k * .42, a0 = Math.PI * .9, a1 = Math.PI * 1.1, r = 6.24;
    const at = (a: number, yy: number) => [-59 + r * Math.cos(a), yy, r * Math.sin(a)];
    shell.body.quad(at(a0, y), at(a1, y), at(a1, y + .22), at(a0, y + .22), '#9aa1a2');
  }
  // Mounded beds of ornamental grasses and low shrubs either side of the lawn.
  const doy = 324; // City's season is not passed to landmarks; a late-November look (illustrative).
  for (const z of [-1, 1]) {
    const bed: P2[] = Array.from({ length: 14 }, (_, i) => [-72 + 3.4 * Math.cos(i * Math.PI / 7), z * 5.5 + 2.2 * Math.sin(i * Math.PI / 7)]);
    const lawn = () => top + .18;
    flowerBed(shell.body, bed, lawn, { doy, mound: .35, soil: 'rich-black', seed: `1180-bed-${z}` });
    ornamentals(shell.body, [-53, z * 7], 2, lawn, { doy, count: 6, seed: `1180-grass-${z}` });
  }
  // Two cypress cones at the tower end, as before.
  for (const z of [-8, 8]) {
    const base = disc(-38, z, 1.3, 10);
    base.forEach(([x, zz], i) => {
      const [a, b] = base[(i + 1) % base.length];
      shell.body.tri([x, top, zz], [a, top, b], [-38, top + 6.5, z], '#3f6a3c');
    });
  }
  // A row of small multi-stem crape myrtles along the curved west edge, inside the rail.
  wing.ring.forEach(([x, z], i) => {
    const [a, b] = wing.ring[(i + 1) % wing.ring.length];
    const len = Math.hypot(a - x, b - z);
    if (Math.min(x, a) > -72 || len < 1) return;
    const nx = -(b - z) / len, nz = (a - x) / len; // inward for this ring's winding, checked below
    const mx = (x + a) / 2, mz = (z + b) / 2;
    const inward = Math.hypot(mx + nx * 2.4 + 63, mz + nz * 2.4) < Math.hypot(mx - nx * 2.4 + 63, mz - nz * 2.4) ? 2.4 : -2.4;
    terraceTrees.push({ u: mx + nx * inward, v: mz + nz * inward, y: top });
  });
  // Drawn by the tree rollout as Sam's crape myrtle A (createSkylineLandmark hands these spots
  // on in world coordinates). Multi-stem, about 4.5 m (illustrative).
  wing.ring.forEach(([x, z], i) => {
    const [a, b] = wing.ring[(i + 1) % wing.ring.length];
    if (Math.min(x, a) > -30) return; // the tower wall, not an edge
    shell.body.quad([x, top, z], [a, top, b], [a, top + 1.1, b], [x, top + 1.1, z], '#c8dcdf');
  });
  }

  // The veils continue each broad face and curve in towards the other one:
  // 7.8 m inward over 36.6 m, measured end-on in the owner's aerial.
  const veilSides = [new Builder(), new Builder()], frame = new Builder();
  const x0 = -28, x1 = 30, cols = 10, rows = 8;
  for (const side of [-1, 1]) {
    const veils = veilSides[side > 0 ? 1 : 0];
    const face = side > 0 ? 17.3 : -17.6;
    const at = (u: number, t: number, inset = 0): number[] => {
      const lean = 7.8 * Math.pow(t, 1.6);
      const crest = 1.5 * Math.sin(Math.PI * u);
      return [x0 + (x1 - x0) * u, ROOF + (VEIL - 1.5 + crest) * t, face - side * (lean + inset)];
    };
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const u = c / cols, w = (c + 1) / cols, t = r / rows, s = (r + 1) / rows;
      veils.quad(at(u, t), at(w, t), at(w, s), at(u, s), '#8fb3bb');
    }
    // Mullions follow the curve; transoms run along it.
    const bar = (p: number[], q: number[], width: number, b: Builder, colour: string) => {
      b.quad([p[0], p[1], p[2]], [q[0], q[1], q[2]], [q[0], q[1] + width, q[2]], [p[0], p[1] + width, p[2]], colour);
    };
    for (let c = 0; c <= cols; c++) for (let r = 0; r < rows; r++) {
      const u = c / cols, p = at(u, r / rows, -.05), q = at(u, (r + 1) / rows, -.05);
      frame.quad([p[0] - .12, p[1], p[2]], [p[0] + .12, p[1], p[2]], [q[0] + .12, q[1], q[2]], [q[0] - .12, q[1], q[2]], '#e6ecea');
    }
    for (let r = 0; r <= rows; r += 2) for (let c = 0; c < cols; c++)
      bar(at(c / cols, r / rows, -.05), at((c + 1) / cols, r / rows, -.05), r === rows ? -.18 : .18, frame, '#e6ecea');
    // Open white lattice trusses carry each veil at the tower's narrow ends.
    for (const u of [0, 1]) {
      const inner = (t: number): number[] => { const o = at(u, t); return [o[0], o[1], o[2] - side * (4 * (1 - t) + .3)]; };
      for (let r = 0; r < rows; r++) {
        const t = r / rows, s = (r + 1) / rows;
        // Crossed ribbons, so each member reads end-on as well as from the side.
        for (const [p, q] of [[at(u, t), at(u, s)], [inner(t), inner(s)], [at(u, t), inner(s)], [inner(t), at(u, s)]] as const) {
          frame.quad([p[0] - .2, p[1], p[2]], [p[0] + .2, p[1], p[2]], [q[0] + .2, q[1], q[2]], [q[0] - .2, q[1], q[2]], '#eef1ef');
          frame.quad([p[0], p[1], p[2] - .2], [p[0], p[1], p[2] + .2], [q[0], q[1], q[2] + .2], [q[0], q[1], q[2] - .2], '#eef1ef');
        }
      }
    }
  }

  // Behind the glazing the crown is framed by white steel lattice trusses, read
  // through the glass in the aerials and lit from inside at dusk.
  const lattice2 = new Builder(), line = new Builder();
  const member = (p: number[], q: number[], b: Builder, colour: string, w = .14) => {
    const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], len = Math.hypot(...d);
    if (len < 1e-6) return; // a zero-length member would give NaN positions
    const u = d.map(v => v / len);
    const ref = Math.abs(u[1]) > .9 ? [1, 0, 0] : [0, 1, 0];
    const cross = (a: number[], c: number[]) => [a[1] * c[2] - a[2] * c[1], a[2] * c[0] - a[0] * c[2], a[0] * c[1] - a[1] * c[0]];
    const n1 = cross(u, ref), l1 = Math.hypot(...n1), n2 = cross(u, n1), l2 = Math.hypot(...n2);
    for (const n of [n1.map(v => w * v / l1), n2.map(v => w * v / l2)])
      b.quad(p.map((v, i) => v - n[i]), p.map((v, i) => v + n[i]), q.map((v, i) => v + n[i]), q.map((v, i) => v - n[i]), colour);
  };
  for (const side of [-1, 1]) {
    const face = side > 0 ? 17.3 : -17.6;
    const inner = (u: number, t: number) => [x0 + (x1 - x0) * u, ROOF + (VEIL - 3) * t, face - side * (7.8 * Math.pow(t, 1.6) + 1.6)];
    const cols2 = 8, rows2 = 4;
    for (let c = 0; c <= cols2; c++) member(inner(c / cols2, 0), inner(c / cols2, 1), lattice2, '#f2f4f1');
    for (let r = 0; r <= rows2; r++) for (let c = 0; c < cols2; c++) {
      member(inner(c / cols2, r / rows2), inner((c + 1) / cols2, r / rows2), lattice2, '#f2f4f1', .1);
      if (r < rows2) member(inner((c + (r + c) % 2) / cols2, r / rows2), inner((c + 1 - (r + c) % 2) / cols2, (r + 1) / rows2), lattice2, '#f2f4f1', .1);
    }
    // A thin light line runs up the curved west edge of each veil, from the wing roof to the tip.
    const wingTop = parts.find(p => p.id === 'osm:way:885660381')?.h ?? ROOF;
    const edge = (t: number) => [x0 - .2, ROOF + (VEIL - 1.5) * t, face - side * (7.8 * Math.pow(t, 1.6) - .15)];
    member([x0 - .2, wingTop, face + side * .15], edge(0), line, '#f4fff8', .12);
    for (let k = 0; k < 12; k++) member(edge(k / 12), edge((k + 1) / 12), line, '#f4fff8', .12);
  }

  const model = shell.finish('#ffe0b0', .7);
  const crownFrame = new THREE.Mesh(lattice2.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide,
    emissive: '#c9ddd4', emissiveIntensity: 0 }));
  crownFrame.name = '1180 crown lattice';
  model.group.add(crownFrame);
  const lineMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    transparent: true, depthWrite: false });
  const edgeLine = new THREE.Mesh(line.geometry(), lineMaterial);
  edgeLine.name = '1180 edge light';
  edgeLine.visible = false;
  model.group.add(edgeLine);
  const geometry = skin.geometry();
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const glass = new THREE.Mesh(geometry, wall.material);
  glass.name = '1180 curtain wall';
  // Kendall/Heaton's night skyline: the veil glass is a soft pale grey-green wash,
  // dimmer than the white lattice behind it; nothing on the crown clips to white.
  const veilMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true,
    opacity: .88, depthWrite: false, emissive: '#9dbcb2', emissiveIntensity: 0 });
  // One mesh per veil, so three.js sorts the near one over the far one.
  const veil = veilSides.map((b, i) => { const m = new THREE.Mesh(b.geometry(), veilMaterial); m.name = `1180 veil ${i}`; return m; });
  const lattice = new THREE.Mesh(frame.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide,
    emissive: '#d8e6e1', emissiveIntensity: 0 }));
  lattice.name = '1180 veil frames';
  for (const mesh of [glass, lattice]) { mesh.castShadow = mesh.receiveShadow = true; model.group.add(mesh); }
  model.group.add(...veil);
  return { ...model, terraceTrees, setNight(night: number) {
    model.setNight(night);
    wall.material.emissiveIntensity = 1.6 * night;
    veilMaterial.emissiveIntensity = CROWN_NIGHT.veil * night;
    (crownFrame.material as THREE.MeshLambertMaterial).emissiveIntensity = CROWN_NIGHT.lattice * night;
    lineMaterial.color.setScalar(CROWN_NIGHT.edge * Math.min(1, night));
    edgeLine.visible = night > .001;
    (lattice.material as THREE.MeshLambertMaterial).emissiveIntensity = CROWN_NIGHT.frames * night;
  } };
}
