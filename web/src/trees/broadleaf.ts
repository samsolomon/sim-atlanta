/**
 * A parameterised broadleaf: trunk, scaffold limbs and a crown envelope from a few numbers that
 * describe a species' habit (an oval willow oak, a rounded water oak, a vase elm). The same habit
 * feeds the framework's clump model (`Species.form`) and every lab rendering option, so options
 * differ only in how they draw the foliage. Unit space as in species.ts: crown radius 1, height 1.
 */
import * as THREE from 'three';
import { rng } from '../vignette/geom';
import { lerp3, polar, trunkRadius, type Dims, type Form, type Pad, type Seg, type SizeClass, type TreeQuality, type V3 } from './species';

export interface Habit {
  /** Where the trunk (or central leader) ends, as a fraction of height. */
  trunkTop: number;
  /** Low fork for tiered understorey trees, metres above ground. */
  forkM?: number;
  /** Lowest foliage, as a fraction of height (street trees are limbed up). */
  crownBase: number;
  /** Crown envelope's widest point as a fraction of the way from base to top (0.5 an ellipse, lower an egg). */
  widest: number;
  /** Scaffold limbs per tier. */
  limbs: Record<TreeQuality, number>;
  /** Limb angle above horizontal at the trunk, radians (0.3 spreading, 0.9 strongly ascending). */
  limbAngle: number;
  /** Where limbs leave the trunk: a fraction range of height. */
  limbFrom: [number, number];
  /** How far out limb tips reach, as a fraction of crown radius. */
  limbReach: number;
  /** Separate stems from the ground (crape myrtle); 1 for a single trunk. */
  stems?: number;
  /** Ragged envelope: how far lobes wander in and out (0 smooth, 0.25 irregular). */
  ragged: number;
  /** Branch masses: radius as a fraction of crown radius (bigger closes the crown), and the
   *  elevation band (−1 crown base, 1 top) the scaffold limbs aim their masses at. */
  mass: { r: number; low: number; high: number };
  /** Tiered crowns (a loblolly): masses per horizontal tier, bottom to top, per detail tier.
   *  Each mass hangs on its own limb, with sky between tiers. */
  tiers?: Record<TreeQuality, number[]>;
  /** Pyramidal crowns (a magnolia): masses shrink toward the top by up to this share. */
  taper?: number;
  /** 0 a domed top (half-ellipsoid), 1 a straight cone above the widest point. */
  cone?: number;
  /** How clusters are shared among masses: 2 by area (default), 1 more evenly. */
  clusterWeight?: number;
  bark: string;
  barkDark: string;
  /** Per-class tweaks (a sapling keeps a leader; a specimen spreads). */
  bySize?: Partial<Record<SizeClass, Partial<Omit<Habit, 'bySize'>>>>;
}

export const habitFor = (h: Habit, size: SizeClass): Habit => ({ ...h, ...h.bySize?.[size] });

/** One leaf mass in metres at the class's nominal size. */
export interface Unit {
  c: V3;
  /** Horizontal radius, metres. */
  r: number;
  /** Outward unit normal of the envelope at this unit. */
  n: V3;
  /** 0 in the crown's core, 1 at its sunlit rim and top. */
  depth: number;
  /** Per-unit random 0–1: which seasonal colour it leans to. */
  tone: number;
  /** Per-unit 0–1 drop order: the unit is bare once the crown's leaf fraction falls below it. */
  drop: number;
}

/** The crown envelope in metres: an egg from crownBase to the top. */
export function envelope(h: Habit, d: Dims) {
  const R = d.spreadM / 2, H = d.heightM;
  const y0 = h.crownBase * H, y1 = H;
  const yc = y0 + (y1 - y0) * h.widest;
  return { R, H, y0, y1, yc, below: yc - y0, above: y1 - yc, cone: h.cone ?? 0 };
}

/** Outward normal of the crown envelope at p: the egg's, blended toward the cone's flank above
 *  the widest point by `cone`. */
export function envelopeNormal(e: ReturnType<typeof envelope>, x: number, y: number, z: number) {
  const half = y > e.yc ? e.above : e.below;
  const egg = new THREE.Vector3(x / e.R ** 2, (y - e.yc) / half ** 2, z / e.R ** 2).normalize();
  if (!(e.cone && y > e.yc)) return egg;
  const h = Math.hypot(x, z) || 1;
  const flank = new THREE.Vector3(x / h / e.R, 1 / e.above, z / h / e.R).normalize();
  // Ramped in just above the widest point, so the lighting has no seam there.
  const yN = (y - e.yc) / e.above;
  return egg.lerp(flank, e.cone * Math.min(1, Math.max(0, yN / 0.2))).normalize();
}

/** The crown's radius share at height yN (−1 base, 0 widest, 1 top): an egg, or a cone on top. */
export function ringAt(e: { cone: number }, yN: number) {
  const dome = Math.sqrt(Math.max(0, 1 - yN * yN));
  return yN > 0 && e.cone ? dome * (1 - e.cone) + Math.max(0, 1 - yN) * e.cone : dome;
}

/**
 * `n` leaf masses spread over the envelope by a Fibonacci spiral, top to bottom, so every count
 * covers the crown evenly. Lobe size is chosen so the masses overlap into a closed crown.
 */
export function crownUnits(h: Habit, d: Dims, n: number, seed: number, cover = 1.5): Unit[] {
  const e = envelope(h, d);
  const r = rng(seed);
  const golden = Math.PI * (3 - Math.sqrt(5));
  // Surface area of the egg (two half-ellipsoids), Knud Thomsen's approximation; masses cover ~85% of it.
  const half = (c: number) => { const p = 1.6; return 2 * Math.PI * ((2 * (e.R * c) ** p + e.R ** (2 * p)) / 3) ** (1 / p); };
  const area = (half(e.above) + half(e.below)) * 0.85;
  const lobe = Math.sqrt(cover * area / (Math.PI * n));
  const out: Unit[] = [];
  for (let i = 0; i < n; i++) {
    // From the crown's top down to 85% of the way to its base: a full mass, not an open bowl.
    const t = (i + 0.5) / n;
    const yN = 1 - t * 1.85;
    const ring = Math.sqrt(Math.max(0, 1 - yN * yN));
    const a = i * golden + r() * 0.4;
    const wob = 1 + (r() - 0.5) * 2 * h.ragged;
    const inset = Math.min(0.92, 1 - lobe / e.R * 0.55) * wob;
    const y = e.yc + yN * (yN > 0 ? e.above : e.below) * inset;
    const c: V3 = [Math.cos(a) * ring * e.R * inset, Math.min(y, e.y1 - lobe * 0.5), Math.sin(a) * ring * e.R * inset];
    const nrm = new THREE.Vector3(c[0] / e.R ** 2, (c[1] - e.yc) / (yN > 0 ? e.above : e.below) ** 2, c[2] / e.R ** 2).normalize();
    out.push({
      c, r: lobe * (0.85 + r() * 0.3), n: [nrm.x, nrm.y, nrm.z],
      depth: Math.min(1, 0.45 + 0.55 * (yN * 0.5 + 0.5)), tone: r(),
      // Outer and lower leaves go first in fall; the top and core hold on.
      drop: Math.min(0.98, Math.max(0.02, 0.15 + 0.7 * r())),
    });
  }
  return out;
}

/** A foliage mass at a branch end, metres; `limb` is the scaffold limb it hangs on (−1 the leader). */
export interface Mass extends Unit { limb: number; side: boolean }

/**
 * Where the foliage sits: one rounded mass at each scaffold limb's end, a smaller one on a side
 * branch from its elbow (high detail), and one on the leader's top. Each mass is set just
 * inside the crown envelope, so the silhouette keeps the species' outline while the crown
 * reads as separate masses with sky between them, organised by the branches.
 */
export function crownMasses(habit: Habit, size: SizeClass, q: TreeQuality, d: Dims, salt = 0): Mass[] {
  const h = habitFor(habit, size);
  const e = envelope(h, d);
  const r = rng(salt * 131 + size.length * 17 + (q === 'high' ? 1 : 2));
  const golden = Math.PI * (3 - Math.sqrt(5));
  // A multi-stem tree has one branch mass per stem.
  const n = (h.stems ?? 1) > 1 ? h.stems! : h.limbs[q];
  // Masses grow at low detail, where there are fewer of them.
  // Masses grow at low detail, where there are fewer of them (a multi-stem tree keeps its count).
  const big = h.mass.r * e.R * (q === 'high' || (h.stems ?? 1) > 1 ? 1 : 1.18);
  const onEnvelope = (a: number, yN: number, rad: number) => {
    const ring = ringAt(e, yN);
    const half = yN > 0 ? e.above : e.below;
    const inset = (x: number, k: number) => Math.max(0, x - rad * k);
    const c: V3 = [Math.cos(a) * inset(ring * e.R, 0.8), e.yc + yN * inset(half, 0.75), Math.sin(a) * inset(ring * e.R, 0.8)];
    const nv = envelopeNormal(e, c[0], c[1], c[2]);
    return { c, n: [nv.x, nv.y, nv.z] as V3 };
  };
  const out: Mass[] = [];
  if (h.tiers) {
    // Loose horizontal tiers: tufts around the crown at each level, upper tiers fuller.
    const counts = h.tiers[q], T = counts.length;
    let li = 0;
    counts.forEach((k, ti) => {
      // Tiers evenly spaced in height between the low and high marks (−1 base, 1 top).
      const lo = (h.mass.low + 1) / 2, hi = (h.mass.high + 1) / 2;
      const yM = e.y0 + (e.y1 - e.y0) * (lo + (hi - lo) * (T === 1 ? 0.5 : ti / (T - 1)));
      const yN = (yM - e.yc) / (yM > e.yc ? e.above : e.below);
      // Upper tiers fuller (a pine), or smaller toward the top with a taper (a pyramid).
      const f = ti / Math.max(1, T - 1);
      const rad = big * (h.taper ? 1 + h.taper * (0.5 - f) : 0.7 + 0.4 * f);
      for (let j = 0; j < k; j++) {
        const a = (j / k) * Math.PI * 2 + ti * golden + (r() - 0.5) * 0.7;
        const y = yN + (r() - 0.5) * 0.12;
        const rr = rad * (0.85 + r() * 0.3);
        out.push({ ...onEnvelope(a, y, rr), r: rr, depth: Math.min(1, 0.5 + 0.5 * (y * 0.5 + 0.5)), tone: r(), drop: 0.2 + 0.6 * r(), limb: li++, side: false });
      }
    });
  } else for (let i = 0; i < n; i++) {
    const f = n === 1 ? 0.5 : i / (n - 1);
    const a = i * golden * 1.3 + r() * 0.5;
    const yN = h.mass.low + (h.mass.high - h.mass.low) * f + (r() - 0.5) * 0.15;
    const rad = big * (0.9 + r() * 0.2) * (1 + (h.taper ?? 0) * (0.5 - f));
    const p = onEnvelope(a, yN, rad);
    out.push({ ...p, r: rad, depth: Math.min(1, 0.55 + 0.45 * (yN * 0.5 + 0.5)), tone: r(), drop: 0.2 + 0.6 * r(), limb: i, side: false });
    if (q === 'high') {
      const sa = a + (i % 2 ? 0.75 : -0.75), sr = rad * 0.78;
      const sp = onEnvelope(sa, yN - 0.35, sr);
      out.push({ ...sp, r: sr, depth: Math.min(1, 0.45 + 0.45 * ((yN - 0.35) * 0.5 + 0.5)), tone: r(), drop: 0.2 + 0.6 * r(), limb: i, side: true });
    }
  }
  // A crowning tuft centred over the leader closes the silhouette at the top (Sam): never a
  // bare leader ending in a spike.
  const top = big * (h.tiers ? 0.8 : q === 'high' ? 1.1 : 1.2) * (1 - (h.taper ?? 0) * 0.7);
  // On a tiered crown the tuft sits just above the highest tier, so the two always join.
  const tierTop = h.tiers ? Math.max(...out.map(m => m.c[1] + m.r * 0.8)) : Infinity;
  const tp = { c: [0, Math.min(e.y1 - top * 0.85, tierTop), 0] as V3, n: [0, 1, 0] as V3 };
  r();
  out.push({ ...tp, r: top, depth: 1, tone: r(), drop: 0.3 + 0.5 * r(), limb: -1, side: false });
  return out;
}

/** The skeleton and the framework's clump pads for a habit. Limbs end in the branch masses. */
export function broadleafForm(habit: Habit, size: SizeClass, q: TreeQuality, d: Dims, clumps: number, salt = 0): Form {
  const h = habitFor(habit, size);
  const tr = trunkRadius(d);
  const e = envelope(h, d);
  const r = rng(salt * 131 + size.length * 17 + (q === 'high' ? 1 : 2));
  const segs: Seg[] = [];
  const stems = h.stems ?? 1;
  const limbs = h.limbs[q];
  if (stems === 1) {
    const masses = crownMasses(habit, size, q, d, salt);
    const unit = (c: V3): V3 => [c[0] / e.R, c[1] / e.H, c[2] / e.R];
    // The leader ends inside the top mass, below its centre, tapering to almost nothing, so it
    // never pokes through the crown (Sam, sweetgum review).
    const top = masses[masses.length - 1];
    // A cone top pulls the tuft's leaves in and down (inEnvelope), so the leader stops lower,
    // and is not lifted back to the limbs' top (it would show through the narrowed tip).
    const leaderTop = Math.min(h.trunkTop, (top.c[1] - top.r * (0.35 + (h.cone ?? 0))) / e.H);
    const leaderY = h.forkM !== undefined ? Math.min(h.forkM / e.H, 0.4) : h.cone ? Math.max(h.crownBase, leaderTop) : Math.max(h.limbFrom[1], leaderTop);
    segs.push({ a: [0, 0, 0], b: [top.c[0] / e.R * 0.4, leaderY, top.c[2] / e.R * 0.4], r0: tr, r1: tr * 0.12, sides: q === 'high' ? 5 : 4, color: habit.barkDark });
    const count = h.tiers ? masses.length - 1 : limbs;
    for (let i = 0; i < count; i++) {
      const f = count === 1 ? 0.5 : i / (count - 1);
      const main = masses.find(m => m.limb === i && !m.side)!;
      if (h.tiers) {
        // One slightly ascending limb per tuft, leaving the trunk a little below it.
        const out = Math.hypot(main.c[0], main.c[2]);
        // Never above the leader's end: a limb must leave the trunk, not the air over it.
        const y0 = Math.min(leaderY * 0.97, Math.max(h.crownBase * 0.85, (main.c[1] - Math.tan(h.limbAngle) * out) / e.H));
        const tip = unit(main.c);
        if (h.forkM !== undefined) {
          // Rising scaffold from the low fork, then a long, almost horizontal twig.
          const elbow: V3 = [tip[0] * 0.38, tip[1] - 0.025, tip[2] * 0.38];
          segs.push({ a: [0, y0, 0], b: elbow, r0: tr * 0.34, r1: tr * 0.14, sides: 3, color: habit.bark });
          segs.push({ a: elbow, b: [tip[0] * 1.5, tip[1], tip[2] * 1.5], r0: tr * 0.14, r1: tr * 0.015, sides: 3, color: habit.bark });
          const twig = lerp3(elbow, tip, 0.55);
          const turn = i % 2 ? 0.9 : -0.9;
          segs.push({ a: twig, b: [tip[0] - tip[2] * turn, twig[1] + 0.01, tip[2] + tip[0] * turn], r0: tr * 0.055, r1: tr * 0.008, sides: 3, color: habit.bark });
        } else segs.push({ a: [0, y0, 0], b: unit(lerp3([0, y0 * e.H, 0], main.c, 0.92)), r0: tr * 0.3, r1: tr * 0.08, sides: 3, color: habit.bark });
        continue;
      }
      const y = Math.min(h.trunkTop * 0.95, h.limbFrom[0] + (h.limbFrom[1] - h.limbFrom[0]) * f);
      // The limb ends a little short of its mass's centre, inside the foliage.
      const tip = unit(lerp3([0, y * e.H, 0], main.c, 0.88));
      const from: V3 = [0, y, 0];
      if (q === 'high') {
        // An elbow two fifths out, lifted by the habit's limb angle; a side branch leaves it.
        const elbow = lerp3(from, tip, 0.42);
        elbow[1] = Math.min(tip[1], y + (tip[1] - y) * 0.42 + Math.tan(h.limbAngle) * 0.04);
        segs.push({ a: from, b: elbow, r0: tr * 0.42, r1: tr * 0.28, sides: 3, color: habit.bark });
        segs.push({ a: elbow, b: tip, r0: tr * 0.28, r1: tr * 0.1, sides: 3, color: habit.bark });
        const side = masses.find(m => m.limb === i && m.side);
        if (side) segs.push({ a: elbow, b: unit(lerp3([elbow[0] * e.R, elbow[1] * e.H, elbow[2] * e.R], side.c, 0.85)), r0: tr * 0.18, r1: tr * 0.07, sides: 3, color: habit.bark });
      } else segs.push({ a: from, b: tip, r0: tr * 0.42, r1: tr * 0.12, sides: 3, color: habit.bark });
    }
  } else {
    // Multi-stem: stems lean out from a shared base like a vase, each into its own branch mass.
    // The first is the calliper stem; the others start just above the ground (the trunk test
    // measures the base ring).
    const masses = crownMasses(habit, size, q, d, salt);
    const unit = (c: V3): V3 => [c[0] / e.R, c[1] / e.H, c[2] / e.R];
    const toM = (u: V3): V3 => [u[0] * e.R, u[1] * e.H, u[2] * e.R];
    let mid0: V3 = [0, h.trunkTop * 0.5, 0];
    for (let s = 0; s < stems; s++) {
      const main = masses.find(m => m.limb === s && !m.side)!;
      const a = Math.atan2(main.c[2], main.c[0]);
      const rs = s === 0 ? tr : tr * (0.7 + r() * 0.15);
      const base: V3 = s === 0 ? [0, 0, 0] : polar(a, rs * 1.6, 0.02);
      const tip = unit(lerp3(toM(base), main.c, 0.9));
      segs.push({ a: base, b: tip, r0: rs, r1: rs * 0.35, sides: q === 'high' ? 4 : 3, color: s % 2 ? habit.bark : habit.barkDark });
      const mid = lerp3(base, tip, 0.55);
      if (s === 0) mid0 = mid;
      const side = masses.find(m => m.limb === s && m.side);
      if (side) segs.push({ a: mid, b: unit(lerp3(toM(mid), side.c, 0.85)), r0: rs * 0.4, r1: rs * 0.12, sides: 3, color: habit.bark });
    }
    const top = masses[masses.length - 1];
    segs.push({ a: mid0, b: unit(lerp3(toM(mid0), top.c, 0.85)), r0: tr * 0.35, r1: tr * 0.1, sides: 3, color: habit.bark });
  }
  const units = crownUnits(h, d, clumps, salt * 7 + 3, 1.2);
  const pads: Pad[] = units.map(u => ({ x: u.c[0] / e.R, y: u.c[1] / e.H, z: u.c[2] / e.R, w: u.r / e.R, h: u.r * 0.8 / e.H }));
  return { segs, pads };
}

/**
 * Split masses into `n` smaller leaf clusters over each mass's outer, upper side, shared out by
 * mass area: the small lobed clusters that make a crown read as a broadleaf's. A cluster's depth
 * follows how far it faces up, so every mass has a lit top and a shaded underside.
 */
export function massClusters(masses: Mass[], n: number, seed: number, size = 0.62, flat = 0, weight = 2): Unit[] {
  const r = rng(seed);
  // Shares by mass area (weight 2), or flatter (weight 1) so small upper masses still fill.
  const area = masses.reduce((t, m) => t + m.r ** weight, 0);
  // Largest-remainder shares by mass area, at least one each, summing to exactly n.
  // With fewer clusters than masses, the smallest masses go without (each gets at most one).
  const floor = n >= masses.length ? 1 : 0;
  const exact = masses.map(m => n * m.r ** weight / area);
  const share = exact.map(x => Math.max(floor, Math.floor(x)));
  const byRemainder = exact.map((x, i) => i).sort((p, q) => (exact[q] % 1) - (exact[p] % 1));
  for (let j = 0; share.reduce((t, x) => t + x, 0) < n; j++) share[byRemainder[j % masses.length]]++;
  const bySize = exact.map((x, i) => i).sort((p, q) => share[q] - share[p]);
  for (let j = 0, guard = 0; share.reduce((t, x) => t + x, 0) > n && guard < 10 * n + 100; j++, guard++)
    if (share[bySize[j % masses.length]] > floor) share[bySize[j % masses.length]]--;
  // The crowning tuft (last) always gets a cluster: the crown must close at the top.
  if (share[masses.length - 1] === 0 && n > 0) { share[masses.length - 1] = 1; share[share.indexOf(Math.max(...share.slice(0, -1)))]--; }
  const out: Unit[] = [];
  masses.forEach((m, i) => {
    const k = share[i];
    const outward = new THREE.Vector3(...m.n).multiplyScalar(0.7).add(new THREE.Vector3(0, 0.45, 0));
    for (let j = 0; j < Math.max(0, k); j++) {
      const dir = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().add(outward).normalize();
      const c = new THREE.Vector3(...m.c).addScaledVector(dir, m.r * 0.5);
      // Flat tufts (a pine's needle pads): clusters spread sideways, facing up.
      if (flat) { c.y = m.c[1] + (c.y - m.c[1]) * (1 - flat * 0.7); dir.y += flat * 1.5; dir.normalize(); }
      out.push({
        c: [c.x, c.y, c.z], r: m.r * size * (0.85 + r() * 0.3), n: [dir.x, dir.y, dir.z],
        depth: Math.min(1, m.depth * 0.45 + 0.55 * (dir.y * 0.5 + 0.5)),
        tone: Math.min(1, m.tone * 0.6 + r() * 0.4), drop: m.drop,
      });
    }
  });
  return out;
}
