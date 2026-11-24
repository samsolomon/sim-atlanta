/**
 * The City tree rollout (docs/tree-species.md#city-rollout): which canopy-map crowns become one of
 * the picked species, how Ansley Park's generic crowns are sized and paired, and what grows on its
 * traffic islands. Pure: crowns and board context in, a plan out, so both quality tiers and every
 * board row decide the same way. Plan once from a row's full (high-tier) crown list; tierPlan() then
 * keeps what belongs to a tier's subset. Everything placed here is `illustrative`
 * (docs/tree-species.md, City rollout).
 *
 * - Each crown is classified as street, yard or park from the board's roads and ground.
 * - A crown's species is a deterministic draw seeded by its position (never its index, so a crown
 *   is the same species at both tiers), weighted by the #225 context mixes for the four rolled-out
 *   species, and kept only if the crown's measured size fits that species. Otherwise it stays
 *   generic. Loblolly is never curbside, sweetgum never in a street strip, Japanese maple never a
 *   street tree.
 * - In Ansley Park: about 40% of the generic broadleaf crowns are drawn at specimen size, street
 *   crowns gain a partner facing them across the street, and the grass islands follow the island
 *   rule (a round island gets one large hardwood at its centre; others get maples and crape myrtles).
 */
import type { P2 } from '../vignette/geom';
import type { VGround, VRoad } from '../vignette/world';
import { hash01 } from './species';
import { runSync, type Build } from '../core/slice';

type FirstSpecies = 'crape-myrtle' | 'loblolly-pine' | 'sweetgum' | 'japanese-maple';
const SECOND_MIX = {
  // Percent of all street, yard and park crowns, in that order (docs/tree-species.md).
  'american-elm': [18, 1, 2],
  'flowering-dogwood': [1, 5, 3],
  'southern-magnolia': [2, 6, 2],
  'white-oak': [0, 6, 8],
  'willow-oak': [24, 10, 3],
  'water-oak': [5, 14, 12],
} as const;
type SecondSpecies = keyof typeof SECOND_MIX;
export type RolloutSpecies = FirstSpecies | SecondSpecies;

// Partition the 300 places across the five canopy rows so streaming order cannot affect picks.
const rowLimits: Readonly<Partial<Record<string, number>>> = {
  'midtown-south': 40, 'midtown-central': 40, 'midtown-upper': 75,
  'brookwood-south': 95, 'brookwood-station': 50,
};
export type Context = 'street' | 'yard' | 'park';
export type Crown = [number, number, number, number];

/** Percent of crowns per context for the rolled-out species; the rest stay generic. */
export const MIX: Record<Context, Partial<Record<FirstSpecies, number>>> = {
  // #225 street mix: crape myrtle 8. Loblolly (1) is never curbside; sweetgum is 0 on streets.
  street: { 'crape-myrtle': 8 },
  // #225 yard mix (crape myrtle 6, loblolly 8, sweetgum 5) plus Japanese maple from "other
  // broadleaf": 4% in Midtown yards, 8% in Ansley Park (Sam: "everywhere in front yards").
  yard: { 'crape-myrtle': 6, 'loblolly-pine': 8, 'sweetgum': 5, 'japanese-maple': 4 },
  // #225 park and woods mix.
  park: { 'loblolly-pine': 20, 'sweetgum': 12 },
};
const ANSLEY_YARD_MAPLE = 8;

/** Crown size each species can honestly take (height and crown radius, metres). */
const FITS: Record<FirstSpecies, (h: number, r: number) => boolean> = {
  'crape-myrtle': (h, r) => h <= 10 && r <= 5,
  'japanese-maple': (h, r) => h <= 9 && r <= 5,
  'loblolly-pine': (h, r) => h >= 9 && r <= 10,
  'sweetgum': (h, r) => h >= 8 && h <= 33,
};
/** Height at which a crown is drawn with the species' specimen form. */
const SPECIMEN_AT: Record<FirstSpecies, number> = { 'crape-myrtle': 9, 'japanese-maple': 7, 'loblolly-pine': 30, 'sweetgum': 22 };

const DRIVABLE = new Set(['primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'trunk']);
const HALF_WIDTH: Record<string, number> = { trunk: 7, primary: 6.5, secondary: 5.5, tertiary: 4.5, residential: 3.75, unclassified: 3.5 };
const PARKLIKE = new Set(['park', 'garden', 'cemetery', 'wood', 'forest', 'nature_reserve', 'golf_course', 'recreation_ground']);
/**
 * A crown whose trunk stands within this of a carriageway edge is a street tree. The canopy bake
 * keeps trunks off the sidewalks, so street-strip trunks start about 4 m from the edge and most
 * stand 6–10 m out.
 */
const STREET_M = 7;

export interface PlacedSpecies { carpet?: false; species: RolloutSpecies; x: number; z: number; heightM: number; spreadM: number; size: 'mature' | 'specimen'; seed: number }
export interface RolloutPlan {
  /** Canopy-map crowns now drawn as a species (keys from crownKey). */
  replaced: Set<string>;
  species: PlacedSpecies[];
  /** Generic crowns drawn at a named size (keys): enlarged canopy crowns, pairs and island trees. */
  enlarged: Map<string, { h: number; r: number }>;
  /** New generic broadleaf crowns (facing pairs, island hardwoods), to append after the canopy
   *  map's; `from` is the crown a pair mirrors (none for an island tree). */
  added: { crown: Crown; from?: string }[];
  /** Crowns removed for an island's own planting (keys). */
  cleared: Set<string>;
  context: Map<string, Context>;
  /** The all-species preview (`?trees=all-species`) only: crowns it converted and crowns no
   *  wired species fits, by context. Absent on an ordinary visit. */
  preview?: { converted: Record<Context, number>; generic: Record<Context, number> };
}

export const crownKey = (x: number, z: number) => `${Math.round(x * 10)},${Math.round(z * 10)}`;
/** A seed from a position: the same crown gets the same draw on every tier and every load. */
export const positionSeed = (x: number, z: number) => {
  let h = 2166136261;
  for (const v of [Math.round(x * 10), Math.round(z * 10)]) { h = Math.imul(h ^ (v & 0xffff), 16777619); h = Math.imul(h ^ (v >>> 16), 16777619); }
  return h >>> 0;
};

function segDist(x: number, z: number, a: P2, b: P2) {
  const dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz;
  const t = l ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l)) : 0;
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
}
function inRing(x: number, z: number, r: P2[]) {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++)
    if ((r[i][1] > z) !== (r[j][1] > z) && x < (r[j][0] - r[i][0]) * (z - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c;
  return c;
}
const ringArea = (r: P2[]) => Math.abs(r.reduce((s, p, i) => s + p[0] * r[(i + 1) % r.length][1] - r[(i + 1) % r.length][0] * p[1], 0)) / 2;
const ringPerimeter = (r: P2[]) => r.reduce((s, p, i) => s + Math.hypot(r[(i + 1) % r.length][0] - p[0], r[(i + 1) % r.length][1] - p[1]), 0);

interface Segment { a: P2; b: P2; half: number }
/** Drivable carriageway segments on a coarse grid, for fast nearest-road queries. */
function roadIndex(roads: VRoad[]) {
  const cell = 40, grid = new Map<string, Segment[]>();
  for (const rd of roads) {
    if (!DRIVABLE.has(rd.cls) || rd.bridge || rd.tunnel) continue;
    for (let i = 1; i < rd.pts.length; i++) {
      const s = { a: rd.pts[i - 1], b: rd.pts[i], half: HALF_WIDTH[rd.cls] ?? 4 };
      const x0 = Math.floor((Math.min(s.a[0], s.b[0]) - 20) / cell), x1 = Math.floor((Math.max(s.a[0], s.b[0]) + 20) / cell);
      const z0 = Math.floor((Math.min(s.a[1], s.b[1]) - 20) / cell), z1 = Math.floor((Math.max(s.a[1], s.b[1]) + 20) / cell);
      for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) {
        const k = `${gx},${gz}`;
        (grid.get(k) ?? grid.set(k, []).get(k)!).push(s);
      }
    }
  }
  /** Nearest carriageway: distance from its edge, and the segment. */
  return (x: number, z: number) => {
    let best: { edge: number; seg: Segment } | null = null;
    for (const s of grid.get(`${Math.floor(x / cell)},${Math.floor(z / cell)}`) ?? []) {
      const e = segDist(x, z, s.a, s.b) - s.half;
      if (!best || e < best.edge) best = { edge: e, seg: s };
    }
    return best;
  };
}

export interface RoundTwoRow {
  id: string;
  /** Same eligible low-tier locations on both tiers, excluding junctions and named sites. */
  eligible: ReadonlySet<string>;
}

export interface RolloutInput {
  roundTwo?: RoundTwoRow;
  crowns: Crown[];
  roads: VRoad[];
  ground?: VGround[];
  /** Building outer rings, so added crowns never land inside one. */
  buildings?: P2[][];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  inAnsley?: (x: number, z: number) => boolean;
  /**
   * Preview only (`?trees=all-species`, docs/tree-species.md#all-species-preview): after the
   * ordinary plan, every crown still drawn generic becomes a wired species (allSpecies()).
   * `drawn` says whether the generic World would draw a crown at all (bounds, building rings);
   * `managed` marks crowns another system owns (named sites), which stay as they are.
   */
  preview?: { drawn: (x: number, z: number) => boolean; managed?: (x: number, z: number, r: number) => boolean };
}

/**
 * The preview's weights: the #225 context mix for the ten City-wired species only (MIX plus
 * SECOND_MIX, with Ansley's yard maple bias). Unmodelled shares (red maple, tulip poplar, southern
 * red oak, ginkgo, other broadleaf…) are dropped, so each draw renormalises over what is left
 * and fits. Zeros stay zeros: no loblolly, sweetgum or Japanese maple at the curb.
 */
export function previewWeights(ctx: Context, ansley: boolean): [RolloutSpecies, number][] {
  const w: Partial<Record<RolloutSpecies, number>> = { ...MIX[ctx] };
  if (ansley && ctx === 'yard') w['japanese-maple'] = ANSLEY_YARD_MAPLE;
  const i = ctx === 'street' ? 0 : ctx === 'yard' ? 1 : 2;
  for (const sp of Object.keys(SECOND_MIX) as SecondSpecies[]) w[sp] = SECOND_MIX[sp][i];
  return (Object.entries(w) as [RolloutSpecies, number][]).filter(([, n]) => n > 0);
}

/** Crown sizes each wired species can honestly take (height, crown radius; metres). */
export function fitsSpecies(sp: RolloutSpecies, h: number, r: number) {
  if (sp in FITS) return FITS[sp as FirstSpecies](h, r);
  if (sp === 'flowering-dogwood') return h >= 3 && h <= 12 && r <= 6;
  if (sp === 'southern-magnolia') return h >= 6 && h <= 30 && r <= 12;
  return h >= 8 && h <= 40 && r <= 17;
}
const specimenAt = (sp: RolloutSpecies) => sp in SPECIMEN_AT ? SPECIMEN_AT[sp as FirstSpecies] : 24;

export function planRollout(input: RolloutInput): RolloutPlan {
  return runSync(buildPlanRollout(input));
}

/**
 * planRollout as a build that yields per island and every 64 crowns (core/slice.ts). Every draw
 * is seeded by position, so a yield changes nothing; there is none between the sort and the slice.
 */
export function* buildPlanRollout({ crowns, roads, ground = [], buildings = [], bounds, roundTwo, inAnsley = () => false, preview }: RolloutInput): Build<RolloutPlan> {
  let places = roundTwo ? rowLimits[roundTwo.id] ?? 0 : 0;
  const candidates: PlacedSpecies[] = [];
  const near = roadIndex(roads);
  const parks = ground.filter(g => PARKLIKE.has(g.kind) || (g.kind === 'grass' && ringArea(g.rings[0]) > 2000));
  const plan: RolloutPlan = { replaced: new Set(), species: [], enlarged: new Map(), added: [], cleared: new Set(), context: new Map() };
  const contextOf = (x: number, z: number): Context => {
    const r = near(x, z);
    if (r && r.edge < STREET_M) return 'street';
    return parks.some(g => inRing(x, z, g.rings[0])) ? 'park' : 'yard';
  };

  // Islands first: their crowns are cleared and replanted.
  const islands = inAnsleyIslands(ground, near, inAnsley);
  for (const isl of islands) {
    yield 'rollout island';
    for (const [x, z] of crowns) if (inRing(x, z, isl.ring)) plan.cleared.add(crownKey(x, z));
    if (isl.round) {
      // One large hardwood at the centre (the generic broadleaf, at specimen size).
      const big: Crown = [isl.cx, isl.cz, 24, Math.min(10, Math.sqrt(isl.area / Math.PI) + 4)];
      if (places && roundTwo?.id === 'brookwood-south' && Math.hypot(isl.cx - 1306, isl.cz + 4827) < 4) {
        plan.species.push({ species: 'american-elm', carpet: false, x: isl.cx, z: isl.cz, heightM: big[2],
          spreadM: 2 * big[3], size: 'specimen', seed: positionSeed(isl.cx, isl.cz) });
        places--;
        continue;
      }
      plan.added.push({ crown: big });
      plan.enlarged.set(crownKey(big[0], big[1]), { h: big[2], r: big[3] });
    } else {
      const n = Math.max(1, Math.min(3, Math.round(isl.area / 120)));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + hash01(positionSeed(isl.cx, isl.cz), i) * 0.8;
        const d = n === 1 ? 0 : Math.min(3, Math.sqrt(isl.area) * 0.22);
        const x = isl.cx + Math.cos(a) * d, z = isl.cz + Math.sin(a) * d;
        const seed = positionSeed(x, z);
        const maple = hash01(seed, 1) < 0.6;
        plan.species.push(maple
          ? { species: 'japanese-maple', x, z, heightM: 5, spreadM: 5.5, size: 'mature', seed }
          : { species: 'crape-myrtle', x, z, heightM: 6, spreadM: 4.5, size: 'mature', seed });
      }
    }
  }

  const keys = new Set(crowns.map(([x, z]) => crownKey(x, z)));
  let visited = 0;
  for (const [x, z, h, r] of crowns) {
    if (++visited % 64 === 0) yield 'rollout crowns';
    const key = crownKey(x, z);
    if (plan.cleared.has(key)) continue;
    const ctx = contextOf(x, z);
    plan.context.set(key, ctx);
    const ansley = inAnsley(x, z);
    const seed = positionSeed(x, z);
    const weights = { ...MIX[ctx] };
    if (ansley && ctx === 'yard') weights['japanese-maple'] = ANSLEY_YARD_MAPLE;
    let u = hash01(seed, 21) * 100;
    let pick: FirstSpecies | null = null;
    for (const [sp, w] of Object.entries(weights) as [FirstSpecies, number][]) {
      if (u < w) { pick = sp; break; }
      u -= w;
    }
    if (pick && FITS[pick](h, r)) {
      plan.replaced.add(key);
      plan.species.push({ species: pick, x, z, heightM: h, spreadM: r * 2, size: h >= SPECIMEN_AT[pick] ? 'specimen' : 'mature', seed });
      continue;
    }
    // Leave Ansley's enlarged hardwoods and their matching facing partners intact.
    const enlarge = ansley && hash01(seed, 22) < 0.4;
    if (!pick && !enlarge && places && roundTwo?.eligible.has(key)) {
      const contextIndex = ctx === 'street' ? 0 : ctx === 'yard' ? 1 : 2;
      for (const species of Object.keys(SECOND_MIX) as SecondSpecies[]) {
        u -= SECOND_MIX[species][contextIndex];
        if (u >= 0) continue;
        const fits = species === 'flowering-dogwood' ? h >= 3 && h <= 12 && r <= 6
          : species === 'southern-magnolia' ? h >= 6 && h <= 30 && r <= 12
          : h >= 8 && h <= 40 && r <= 17;
        if (fits) candidates.push({ species, x, z, heightM: h, spreadM: 2 * r, seed,
          size: h >= 24 ? 'specimen' : 'mature' });
        break;
      }
    }
    if (!ansley) continue;
    // Ansley skew: about 40% of the remaining broadleaf crowns at specimen size (25–35 m).
    if (enlarge) {
      const big = { h: Math.max(h, 25 + 10 * hash01(seed, 23)), r: Math.max(r, 9 + 4 * hash01(seed, 24)) };
      plan.enlarged.set(key, big);
    }
    // Facing pairs: a street crown gains a partner mirrored across its street.
    if (ctx === 'street') {
      const n = near(x, z)!;
      const { a, b } = n.seg;
      const dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz;
      const t = l ? ((x - a[0]) * dx + (z - a[1]) * dz) / l : 0;
      // Past a segment's end (a corner, a bend) there is no "across the street": no pair.
      if (t <= 0.02 || t >= 0.98) continue;
      const px = a[0] + t * dx, pz = a[1] + t * dz;
      const mx = 2 * px - x, mz = 2 * pz - z;
      if (mx < bounds.minX + 2 || mx >= bounds.maxX - 2 || mz < bounds.minZ + 2 || mz >= bounds.maxZ - 2) continue;
      if (!inAnsley(mx, mz)) continue;
      const nm = near(mx, mz);
      if (!nm || nm.edge < 1) continue; // in another carriageway
      if (buildings.some(ring => inRing(mx, mz, ring))) continue;
      const crowded = (cx: number, cz: number) => Math.hypot(cx - mx, cz - mz) < 7;
      if (crowns.some(([cx, cz]) => crowded(cx, cz)) || plan.added.some(({ crown: [cx, cz] }) => crowded(cx, cz))) continue;
      const pk = crownKey(mx, mz);
      if (keys.has(pk)) continue;
      const size = plan.enlarged.get(key) ?? { h, r };
      plan.added.push({ crown: [mx, mz, size.h, size.r], from: key });
      plan.enlarged.set(pk, size);
    }
  }
  candidates.sort((a, b) => hash01(a.seed, 73) - hash01(b.seed, 73));
  for (const tree of candidates.slice(0, places)) {
    plan.species.push(tree);
    plan.replaced.add(crownKey(tree.x, tree.z));
  }
  if (preview) allSpecies(plan, crowns, preview, inAnsley);
  return plan;
}

/**
 * The all-species preview: every crown the ordinary plan left generic (canopy crowns, Ansley's
 * facing pairs and island hardwoods) draws a wired species from its context's previewWeights(),
 * renormalised over the species its (possibly enlarged) size fits, on its own hash channel. A crown
 * no species fits stays generic and is counted. Ordinary placements are untouched.
 */
function allSpecies(plan: RolloutPlan, crowns: Crown[], preview: NonNullable<RolloutInput['preview']>, inAnsley: (x: number, z: number) => boolean) {
  const zero = () => ({ street: 0, yard: 0, park: 0 });
  const stats = { converted: zero(), generic: zero() };
  const taken = new Set(plan.species.map(s => crownKey(s.x, s.z)));
  const convert = ([x, z, h0, r0]: Crown, ctx: Context) => {
    const key = crownKey(x, z);
    if (plan.replaced.has(key) || plan.cleared.has(key) || taken.has(key) || !preview.drawn(x, z)) return;
    if (preview.managed?.(x, z, r0)) return;
    const { h, r } = plan.enlarged.get(key) ?? { h: h0, r: r0 };
    const seed = positionSeed(x, z);
    const options = previewWeights(ctx, inAnsley(x, z)).filter(([sp]) => fitsSpecies(sp, h, r));
    const total = options.reduce((n, [, w]) => n + w, 0);
    if (!total) { stats.generic[ctx]++; return; }
    let u = hash01(seed, 91) * total, species = options[options.length - 1][0];
    for (const [sp, w] of options) { if (u < w) { species = sp; break; } u -= w; }
    plan.species.push({ species, x, z, heightM: h, spreadM: 2 * r, seed, size: h >= specimenAt(species) ? 'specimen' : 'mature' });
    plan.replaced.add(key);
    taken.add(key);
    stats.converted[ctx]++;
  };
  for (const c of crowns) { const ctx = plan.context.get(crownKey(c[0], c[1])); if (ctx) convert(c, ctx); }
  // Planted generic crowns: facing pairs and island hardwoods both stand at the street.
  for (const { crown } of plan.added) convert(crown, 'street');
  plan.preview = stats;
}

/** Ansley's grass traffic islands: small grass polygons ringed by carriageways. */
function inAnsleyIslands(ground: VGround[], near: ReturnType<typeof roadIndex>, inAnsley: (x: number, z: number) => boolean) {
  const out: { ring: P2[]; cx: number; cz: number; area: number; round: boolean }[] = [];
  for (const g of ground) {
    if (g.kind !== 'grass') continue;
    const ring = g.rings[0];
    const area = ringArea(ring);
    if (area > 1500 || area < 40) continue;
    const [cx, cz] = centroid(ring);
    if (!inAnsley(cx, cz)) continue;
    // A grass verge along one street is long and thin; an island is compact.
    const roundness = (4 * Math.PI * area) / ringPerimeter(ring) ** 2;
    if (roundness < 0.45) continue;
    // Every edge of the island within a few metres of a carriageway.
    if (!ring.every(([x, z]) => { const n = near(x, z); return !!n && n.edge < 14; })) continue;
    out.push({ ring, cx, cz, area, round: roundness >= 0.75 });
  }
  return out;
}

/** Area-weighted centroid of a ring (a repeated closing vertex is harmless). */
function centroid(r: P2[]): P2 {
  let a = 0, x = 0, z = 0;
  for (let i = 0; i < r.length; i++) {
    const [x0, z0] = r[i], [x1, z1] = r[(i + 1) % r.length];
    const c = x0 * z1 - x1 * z0;
    a += c; x += (x0 + x1) * c; z += (z0 + z1) * c;
  }
  return Math.abs(a) < 1e-9 ? r[0] : [x / (3 * a), z / (3 * a)];
}

/**
 * The part of a row's plan that a quality tier draws: the tier's own crowns keep their species and
 * sizes; a facing pair appears only where its source crown is in the tier; island trees always.
 */
export function tierPlan(plan: RolloutPlan, tierCrowns: Crown[]): RolloutPlan {
  const here = new Set(tierCrowns.map(([x, z]) => crownKey(x, z)));
  const added = plan.added.filter(a => a.from === undefined || here.has(a.from));
  const addedKeys = new Set(added.map(a => crownKey(a.crown[0], a.crown[1])));
  // A species on a planted crown (preview only) follows that crown's own tier rule.
  const planted = new Set(plan.added.map(a => crownKey(a.crown[0], a.crown[1])));
  const keep = (k: string) => here.has(k) || addedKeys.has(k);
  return {
    replaced: new Set([...plan.replaced].filter(keep)),
    species: plan.species.filter(sp => { const k = crownKey(sp.x, sp.z); return keep(k) || (!plan.context.has(k) && !planted.has(k)); }),
    enlarged: new Map([...plan.enlarged].filter(([k]) => keep(k))),
    added,
    cleared: plan.cleared,
    context: plan.context,
    preview: plan.preview,
  };
}

/**
 * City's default since Sam's 24 November call: every planned species tree drawn as a generic
 * low-poly crown, at the same trunk and size, so canopy density does not change. A species on
 * a canopy crown hands that crown back to the generic World (its canopy size is the species'
 * size); a planted species (an island's maples, crapes and Beverly elm) becomes a planted
 * generic broadleaf at its own height and spread. The plan itself is untouched, so
 * `?trees=species` still draws it (trees/rollout-city.ts treeMode). No species, no carpets.
 */
export function genericPlan(plan: RolloutPlan): RolloutPlan {
  const onCanopy = new Set(plan.species.map(s => crownKey(s.x, s.z)).filter(k => plan.context.has(k)));
  const planted = plan.species.filter(s => !plan.context.has(crownKey(s.x, s.z)));
  const enlarged = new Map(plan.enlarged);
  for (const s of planted) enlarged.set(crownKey(s.x, s.z), { h: s.heightM, r: s.spreadM / 2 });
  return {
    ...plan,
    replaced: new Set([...plan.replaced].filter(k => !onCanopy.has(k))),
    species: [],
    enlarged,
    added: [...plan.added, ...planted.map(s => ({ crown: [s.x, s.z, s.heightM, s.spreadM / 2] as Crown }))],
  };
}
