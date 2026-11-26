import * as THREE from 'three';
import { Builder, type P2 } from '../vignette/geom';
import { hedge, retainingEdge, seatWall } from '../landscape/primitives';
import type { localLandmarkShell } from './landmark-shell';
import type { LocalGround } from './midtown-skyline';
import { classicalOrnament } from './classical-ornament';
import plan from './fixtures/midtown-skyline/fed.json';

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;

// The Federal Reserve Bank of Atlanta (Kohn Pedersen Fox, 2001), 1000 Peachtree at 10th.
// Heights are lidar-measured (USGS 3DEP GA_Statewide_B2_2018) above the site grade
// of 298.3 m NAVD88: corner tower top 61.9 m and its step 58.9 m, slab cornice
// 47.5 m with a recessed top floor to 53.7 m, low west wing and mid-block 14.2 m.
// Origin (588, -3155), x east (Peachtree at x≈68), z south (10th Street at z≈+75).
const marble = '#ebe9e3', vein = '#d9d6ce', joint = '#cfccc4', shade = '#bdbab2', frame = '#2c3238';
const glass = ['#2f3a44', '#3a4651', '#2a333c'];
const TOWER = { x0: 41, x1: 67, z0: 11, z1: 38 }, SLAB = { x0: 22.5, x1: 67.5, z0: -58.5, z1: 11 };
const H = { tower: 61.9, towerStep: 58.9, towerShaft: 51.5, slab: 47.5, slabTop: 53.7, wing: 14.2 };

/** Yields between its parts (core/slice.ts; createSkylineLandmark runs it). */
export function* federalReserve(shell: Shell, ground: LocalGround) {
  const { band, edges } = classicalOrnament(shell, { stone: marble, shade, limestone: marble, joint });
  const ccw = (r: P2[]) => r.reduce((s, [x, z], i) => { const [a, b] = r[(i + 1) % r.length]; return s + x * b - z * a; }, 0) < 0 ? [...r].reverse() : r;
  const box = (x0: number, x1: number, z0: number, z1: number): P2[] => ccw([[x0, z0], [x1, z0], [x1, z1], [x0, z1]]);
  // Ground relative to the site grade, the same frame as every height in this model.
  const g = (x: number, z: number) => ground(x, z) ?? 0;
  // The tower's corners are rounded, as the 2017 panorama shows.
  const rounded = (x0: number, x1: number, z0: number, z1: number, r: number): P2[] => {
    const out: P2[] = [];
    for (const [cx, cz, a0] of [[x1 - r, z0 + r, -Math.PI / 2], [x1 - r, z1 - r, 0], [x0 + r, z1 - r, Math.PI / 2], [x0 + r, z0 + r, Math.PI]] as const)
      for (let k = 0; k <= 4; k++) out.push([cx + r * Math.cos(a0 + k * Math.PI / 8), cz + r * Math.sin(a0 + k * Math.PI / 8)]);
    return ccw(out);
  };
  const crown = new Builder(), wash = new Builder();

  // Large ashlar blocks with faint veining: a joint every 1.5 m, a lighter vein streak every few blocks.
  const ashlar = (ring: P2[], lo: number, hi: number) => {
    for (const e of edges(ring)) {
      const at = (t: number, y: number, o = .04) => [e.x + e.tx * t + e.nx * o, y, e.z + e.tz * t + e.nz * o];
      for (let y = lo + 1.5; y < hi - .2; y += 1.5) shell.body.quad(at(0, y), at(e.length, y), at(e.length, y + .05), at(0, y + .05), joint);
      for (let t = 2.3; t < e.length - 1; t += 5.1) shell.body.quad(at(t, lo + 2), at(t + .9, lo + 2.6), at(t + .9, lo + 2.75), at(t, lo + 2.15), vein);
    }
  };
  // Punched windows in deep reveals with dark frames, `cols` per bay group.
  const punched = (ring: P2[], lo: number, hi: number, floor = 3.9) => {
    const rows = Math.max(1, Math.round((hi - lo) / floor));
    for (const e of edges(ring)) {
      const n = Math.max(1, Math.round(e.length / 3.4));
      for (let r = 0; r < rows; r++) for (let c = 0; c < n; c++) {
        const t0 = (c + .27) * e.length / n, t1 = (c + .73) * e.length / n, y0 = lo + r * (hi - lo) / rows + .9, y1 = y0 + 2.2;
        const at = (t: number, y: number, o: number) => [e.x + e.tx * t + e.nx * o, y, e.z + e.tz * t + e.nz * o];
        shell.body.quad(at(t0 - .12, y0 - .12, .03), at(t1 + .12, y0 - .12, .03), at(t1 + .12, y1 + .12, .03), at(t0 - .12, y1 + .12, .03), frame);
        const lit = ((c * 7 + r * 13 + Math.round(e.x)) % 9) === 0;
        (lit ? shell.lights : shell.body).quad(at(t0, y0, .05), at(t1, y0, .05), at(t1, y1, .05), at(t0, y1, .05), glass[(c + r) % 3]);
      }
    }
  };

  // Low west wing and mid-block at the lidar roof, plain marble.
  for (const p of plan.parts) {
    const ring = ccw(p.ring as P2[]);
    const xs = ring.map(q => q[0]);
    if (Math.min(...xs) > 20) continue; // the slab and tower are rebuilt below
    shell.prism(ring, shell.base, H.wing, marble, '#c9c7c0');
    punched(ring, 1, H.wing - 1.2);
    ashlar(ring, shell.base, H.wing);
    band(ring, H.wing - .6, H.wing, .3);
  }

  // Main slab: eleven storeys to a strong cornice, then a recessed top floor of deep-set windows.
  const slab = box(SLAB.x0, SLAB.x1, SLAB.z0, SLAB.z1);
  shell.prism(slab, shell.base, H.slab, marble, '#d4d2cb');
  punched(slab, 8.6, H.slab - 1.6);
  ashlar(slab, shell.base, H.slab);
  band(slab, H.slab - 1.6, H.slab - .6, .45);
  band(slab, H.slab - .6, H.slab, .8);
  const attic = box(SLAB.x0 + 9, SLAB.x1 - 5, SLAB.z0 + 13, SLAB.z1 - 3);
  shell.prism(attic, H.slab, H.slabTop, marble, '#d4d2cb');
  punched(attic, H.slab + .4, H.slabTop - .8, 5);
  band(attic, H.slabTop - .6, H.slabTop, .35);
  yield 'Fed slab';

  // Corner tower: taller than the slab, vertical recessed panels grouping window
  // columns, then two step-ins to a flat crown with tall paired attic windows.
  const tower = rounded(TOWER.x0, TOWER.x1, TOWER.z0, TOWER.z1, 4);
  shell.prism(tower, shell.base, H.towerShaft, marble, '#d4d2cb');
  ashlar(tower, shell.base, H.towerShaft);
  for (const e of edges(tower)) {
    const at = (t: number, y: number, o: number) => [e.x + e.tx * t + e.nx * o, y, e.z + e.tz * t + e.nz * o];
    if (e.length < 8) continue; // the rounded corners carry no panels
    for (const t of [e.length * .22, e.length * .5, e.length * .78]) {
      // Recessed panel (darker) with its column of windows, and a vertical wash light at night.
      shell.body.quad(at(t - 1.6, 9, .02), at(t + 1.6, 9, .02), at(t + 1.6, H.towerShaft - 2, .02), at(t - 1.6, H.towerShaft - 2, .02), '#dad7cf');
      for (let y = 10; y < H.towerShaft - 3; y += 3.9) {
        shell.body.quad(at(t - 1.1, y - .1, .03), at(t + 1.1, y - .1, .03), at(t + 1.1, y + 2.5, .03), at(t - 1.1, y + 2.5, .03), frame);
        shell.body.quad(at(t - .95, y, .05), at(t + .95, y, .05), at(t + .95, y + 2.3, .05), at(t - .95, y + 2.3, .05), glass[0]);
      }
      wash.quad(at(t - 1.4, 9, .3), at(t + 1.4, 9, .3), at(t + .3, 30, .3), at(t - .3, 30, .3), '#fff6e2');
    }
  }
  band(tower, H.towerShaft - .9, H.towerShaft, .7);
  const step1 = rounded(TOWER.x0 + 2, TOWER.x1 - 2, TOWER.z0 + 2, TOWER.z1 - 2, 3);
  const step2 = rounded(TOWER.x0 + 4.5, TOWER.x1 - 4.5, TOWER.z0 + 4.5, TOWER.z1 - 4.5, 2);
  // The crown is drawn into its own mesh so it can be floodlit white at night.
  const crownPrism = (ring: P2[], lo: number, hi: number) => {
    ring.forEach(([x, z], i) => { const [a, b] = ring[(i + 1) % ring.length]; crown.quad([x, lo, z], [a, lo, b], [a, hi, b], [x, hi, z], marble); });
    for (let i = 1; i < ring.length - 1; i++) crown.tri([ring[0][0], hi, ring[0][1]], [ring[i][0], hi, ring[i][1]], [ring[i + 1][0], hi, ring[i + 1][1]], '#d4d2cb');
  };
  crownPrism(step1, H.towerShaft, H.towerStep);
  crownPrism(step2, H.towerStep, H.tower - 1.2);
  crownPrism(rounded(TOWER.x0 + 3.6, TOWER.x1 - 3.6, TOWER.z0 + 3.6, TOWER.z1 - 3.6, 2.4), H.tower - 1.2, H.tower);
  for (const ring of [step1, step2]) for (const e of edges(ring)) {
    const lo = ring === step1 ? H.towerShaft + 1.2 : H.towerStep + .9, hi = ring === step1 ? H.towerStep - 1 : H.tower - 1.8;
    if (e.length < 6) continue;
    const at = (t: number, y: number) => [e.x + e.tx * t + e.nx * .05, y, e.z + e.tz * t + e.nz * .05];
    for (const t of [e.length * .3, e.length * .7]) for (const d of [-.75, .75])
      crown.quad(at(t + d - .5, lo), at(t + d + .5, lo), at(t + d + .5, hi), at(t + d - .5, hi), frame);
  }

  // Peachtree loggia along the slab: freestanding Corinthian columns, arched openings.
  const lx = SLAB.x1, disc = (x: number, z: number, r: number, n = 10): P2[] => Array.from({ length: n }, (_, i) => [x + r * Math.cos(i * 2 * Math.PI / n), z + r * Math.sin(i * 2 * Math.PI / n)]);
  const lz0 = SLAB.z0 + 6, lz1 = SLAB.z1 - 4, bays = 10;
  for (let k = 0; k <= bays; k++) {
    const z = lz0 + k * (lz1 - lz0) / bays;
    shell.prism(disc(lx + 1.6, z, .45), shell.base, 7.4, marble, marble);
    shell.prism(disc(lx + 1.6, z, .62), 6.9, 7.6, '#e2ded4', '#e2ded4');
    if (k < bays) {
      const zm = z + (lz1 - lz0) / bays / 2, r = (lz1 - lz0) / bays / 2 - .5;
      for (let a = 0; a < 8; a++) {
        const p = (t: number) => [lx + 1.62, 5.6 + r * .7 * Math.sin(t), zm + r * Math.cos(t)];
        const a0 = a * Math.PI / 8, a1 = (a + 1) * Math.PI / 8;
        shell.body.quad(p(a0), p(a1), [lx + 1.62, 8.4, zm + r * Math.cos(a1)], [lx + 1.62, 8.4, zm + r * Math.cos(a0)], marble);
      }
    }
  }
  shell.prism(box(lx, lx + 2.4, lz0 - .7, lz1 + .7), 7.6, 8.6, marble, marble);
  shell.body.quad([lx + .02, .4, lz0], [lx + .02, .4, lz1], [lx + .02, 7, lz1], [lx + .02, 7, lz0], '#3b454e');
  for (let k = 0; k <= bays; k++) { const z = lz0 + k * (lz1 - lz0) / bays; wash.quad([lx + 2.2, .2, z - .5], [lx + 2.2, .2, z + .5], [lx + 2.2, 5.5, z + .3], [lx + 2.2, 5.5, z - .3], '#ffe7bd'); }

  // Pedimented entrance portico on the tower's Peachtree face: four square piers,
  // a plain frieze (the bank's name is left off), a small pedimented door.
  const px = TOWER.x1, pz0 = TOWER.z0 + 6, pz1 = TOWER.z1 - 6;
  for (let k = 0; k < 4; k++) {
    const z = pz0 + k * (pz1 - pz0) / 3;
    shell.prism(box(px, px + 1.6, z - .7, z + .7), shell.base, 9.2, marble, marble);
  }
  shell.prism(box(px, px + 2.2, pz0 - 1, pz1 + 1), 9.2, 11, marble, marble);
  shell.body.quad([px + 2.21, 9.5, pz0], [px + 2.21, 9.5, pz1], [px + 2.21, 10.6, pz1], [px + 2.21, 10.6, pz0], vein);
  const pm = (pz0 + pz1) / 2;
  shell.body.quad([px + .03, .4, pm - 1.1], [px + .03, .4, pm + 1.1], [px + .03, 3.4, pm + 1.1], [px + .03, 3.4, pm - 1.1], '#5b4a3a');
  shell.body.tri([px + .04, 3.5, pm - 1.5], [px + .04, 3.5, pm + 1.5], [px + .04, 4.4, pm], marble);
  shell.lights.quad([px + .04, .5, pm - 1], [px + .04, .5, pm + 1], [px + .04, 3.3, pm + 1], [px + .04, 3.3, pm - 1], '#ffdca8');

  // Corner plaza: granite paving round the eagle column on its square base.
  // The eagle column stands on the plaza just in front of the portico, as the panorama shows.
  const ex = TOWER.x1 + 7, ez = pm, plazaY = g(ex, ez) + .05;
  shell.body.quad([TOWER.x1 + 2.2, plazaY, TOWER.z0 - 2], [TOWER.x1 + 2.2, plazaY, TOWER.z1 + 6], [ex + 6, plazaY, TOWER.z1 + 6], [ex + 6, plazaY, TOWER.z0 - 2], '#b9b5ad');
  for (let k = TOWER.z0; k <= TOWER.z1 + 5; k += 2) shell.body.quad([TOWER.x1 + 2.2, plazaY + .01, k], [ex + 6, plazaY + .01, k], [ex + 6, plazaY + .01, k + .06], [TOWER.x1 + 2.2, plazaY + .01, k + .06], '#a29e96');
  shell.prism(box(ex - 1.6, ex + 1.6, ez - 1.6, ez + 1.6), plazaY - .1, plazaY + 2.4, marble, marble);
  shell.prism(disc(ex, ez, .55), plazaY + 2.4, plazaY + 11, marble, marble);
  shell.prism(disc(ex, ez, .75), plazaY + 11, plazaY + 11.4, marble, marble);
  const ey = plazaY + 11.4;
  for (const s of [-1, 1]) shell.body.tri([ex, ey + .3, ez], [ex + s * 1.7, ey + 1.3, ez], [ex + s * .4, ey + .6, ez + .3], '#2b2d2c');
  shell.prism(disc(ex, ez, .35, 6), ey, ey + .9, '#2b2d2c', '#2b2d2c');
  wash.quad([ex - .6, ey - 8.6, ez + .9], [ex + .6, ey - 8.6, ez + .9], [ex + .5, ey + .6, ez + .9], [ex - .5, ey + .6, ez + .9], '#fff1d6');

  // Lawn terraces stepping down the Peachtree front, held by low marble walls,
  // edged with clipped hedges; the salvaged columns stand on the lawn.
  const lawnX0 = lx + 4, lawnX1 = lx + 14;
  for (let k = 0; k < 3; k++) {
    const z0 = SLAB.z0 + k * (SLAB.z1 - SLAB.z0) / 3, z1 = SLAB.z0 + (k + 1) * (SLAB.z1 - SLAB.z0) / 3;
    const y = Math.max(g(lawnX0, z0), g(lawnX1, z1)) + .1;
    shell.body.quad([lawnX0, y, z0], [lawnX0, y, z1], [lawnX1, y, z1], [lawnX1, y, z0], '#9db27a');
    retainingEdge(shell.body, [[lawnX1, z0], [lawnX1, z1]], g, { reveal: .35 });
    hedge(shell.body, [[lawnX1 - .4, z0 + .8], [lawnX1 - .4, z1 - .8]], g, { height: .7, width: .6, seed: `fed-hedge-${k}` });
  }
  seatWall(shell.body, [[lawnX0, SLAB.z0], [lawnX1, SLAB.z0]], g);
  for (let k = 0; k < 6; k++) {
    const z = lz0 + 2 + k * (lz1 - lz0 - 4) / 5, x = lawnX0 + 4, y = g(x, z) + .1;
    shell.prism(disc(x, z, .6), y, y + .6, marble, marble);
    shell.prism(disc(x, z, .4), y + .6, y + 6.6, '#bdb6a8', '#bdb6a8');
    shell.prism(disc(x, z, .64), y + 6.6, y + 7.4, '#aaa190', '#aaa190');
    wash.quad([x - .7, y + .6, z + .7], [x + .7, y + .6, z + .7], [x + .5, y + 6.6, z + .7], [x - .5, y + 6.6, z + .7], '#ffe7bd');
  }

  yield 'Fed tower and plaza';
  const model = shell.finish('#ffe2b4', .6);
  const crownMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: '#ffffff', emissiveIntensity: 0 });
  const crownMesh = new THREE.Mesh(crown.geometry(), crownMaterial);
  crownMesh.name = 'Fed crown';
  crownMesh.castShadow = crownMesh.receiveShadow = true;
  const washMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    transparent: true, depthWrite: false, opacity: .28 });
  const washMesh = new THREE.Mesh(wash.geometry(), washMaterial);
  washMesh.name = 'Fed uplights';
  washMesh.visible = false;
  model.group.add(crownMesh, washMesh);
  return { ...model, setNight(night: number) {
    model.setNight(night);
    // Floodlit from below: the stepped crown and attic glow bright white.
    crownMaterial.emissiveIntensity = .38 * night;
    washMaterial.color.setScalar(Math.min(1, night));
    washMesh.visible = night > .001;
  } };
}
