import { FREIGHT_LENGTH, type FreightUnit } from '../vignette/freight-stock';

/**
 * Illustrative freight consists, one per passage (docs/freight-consists.md). Everything here is a
 * pure function of the line, the signed passage slot and CONSIST_VERSION: seeking, reloading and
 * changing quality all select the same train. Nothing is reported or scheduled; the card says so.
 */
/** Bump whenever recipes or car lists change, so a slot is never silently re-dealt. v2 adds tank cars, v3 mill gondolas, v4 centerbeams. */
export const CONSIST_VERSION = 4;
export const COUPLER_GAP = 0.3;

export type FreightRailroad = 'csx' | 'ns';
export type FreightRecipe = 'manifest' | 'intermodal' | 'unit';
export interface ConsistUnit { kind: FreightUnit; /** Runs long hood (or B end) forward. */ flip: boolean; power: boolean }
export interface Passage {
  railroad: FreightRailroad;
  slot: number;
  recipe: FreightRecipe;
  units: ConsistUnit[];
  cars: number;
  locomotives: number;
  /** Over couplers, including the gaps between units. */
  lengthM: number;
}
export interface LineProfile {
  railroad: FreightRailroad;
  /** Weights for manifest, intermodal and unit. Intermodal is 0 where double-stack clearance is unverified. */
  recipes: Record<FreightRecipe, number>;
}

/** Look-alike power by railroad (docs/freight-variety.md). The GP38-2 is a CSX-like local unit. */
const ROAD_POWER: Record<FreightRailroad, FreightUnit[]> = {
  csx: ['locomotive', 'es44ah'],
  ns: ['locomotiveNs', 'es44acNs', 'sd70ace'],
};
const MANIFEST_CARS: FreightUnit[] = ['boxcar', 'boxcarFaded', 'boxcarBlue', 'grainHopper', 'tank', 'gondolaScrap', 'gondolaEmpty', 'centerbeamLumber', 'centerbeamEmpty'];
/** Unit-train commodities: grain hoppers, or tanks for an illustrative ethanol movement. */
const UNIT_CARS: FreightUnit[] = ['grainHopper', 'tank'];
const WELL_LOADS: FreightUnit[] = ['wellA', 'wellB', 'wellC'];
/** Distinct car geometries a train may draw, so each passage costs a small, fixed number of
 * instanced draws (one per kind present) on both tiers. */
export const MAX_CAR_KINDS: Record<FreightRecipe, number> = { manifest: 3, intermodal: 2, unit: 1 };
export const MAX_POWER_KINDS = 2;
export const MAX_UNITS = 3 + 30;

/** FNV-1a over the seed string, then mulberry32. */
function rng(seed: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 0x01000193);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const int = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const pick = <T>(r: () => number, xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
/** Fisher–Yates on a copy, driven only by the seeded generator. */
function shuffled<T>(r: () => number, xs: readonly T[]) {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Split n cars into blocks of 3–8, the last at least 3 (n ≥ 3). */
export function blockSizes(n: number, r: () => number) {
  const sizes: number[] = [];
  let left = n;
  while (left > 8) {
    const size = int(r, 3, Math.min(8, left - 3));
    sizes.push(size);
    left -= size;
  }
  sizes.push(left);
  return sizes;
}

/** One unit below 180 m of trailing cars, two up to 399 m, three from 400 m. */
export function powerCount(trailingM: number) {
  return trailingM < 180 ? 1 : trailingM < 400 ? 2 : 3;
}

function trainLength(units: FreightUnit[]) {
  return units.reduce((sum, kind) => sum + FREIGHT_LENGTH[kind], 0) + COUPLER_GAP * Math.max(0, units.length - 1);
}

export function planPassage(profile: LineProfile, slot: number, lineId: string): Passage {
  const r = rng(`${lineId}:${slot}:${CONSIST_VERSION}`);
  const weights = profile.recipes;
  const total = weights.manifest + weights.intermodal + weights.unit;
  let roll = r() * total;
  const recipe: FreightRecipe = (roll -= weights.manifest) < 0 ? 'manifest' : (roll -= weights.intermodal) < 0 ? 'intermodal' : 'unit';

  const cars: FreightUnit[] = [];
  if (recipe === 'manifest') {
    const n = int(r, 6, 24);
    // Up to three car types; blocks rotate through them so like cars stay together.
    const types = shuffled(r, MANIFEST_CARS).slice(0, int(r, 1, MAX_CAR_KINDS.manifest));
    blockSizes(n, r).forEach((size, i) => cars.push(...Array<FreightUnit>(size).fill(types[i % types.length])));
  } else if (recipe === 'intermodal') {
    const n = int(r, 8, 30);
    const loads = shuffled(r, WELL_LOADS).slice(0, MAX_CAR_KINDS.intermodal);
    for (let i = 0; i < n; i++) cars.push(pick(r, loads));
  } else {
    const kind = pick(r, UNIT_CARS);
    cars.push(...Array<FreightUnit>(int(r, 12, 30)).fill(kind));
  }

  const trailing = trainLength(cars) + COUPLER_GAP;
  const count = powerCount(trailing);
  // Short manifests on CSX-like track get a GP38-2 local; otherwise one road type for the whole lash-up.
  const local = profile.railroad === 'csx' && recipe === 'manifest' && cars.length <= 8 && count === 1;
  const road = local ? 'gp382' : pick(r, ROAD_POWER[profile.railroad]);
  const power: FreightUnit[] = Array<FreightUnit>(count).fill(road);
  // About one multi-unit passage in twelve borrows a trailing unit from the other railroad.
  if (count > 1 && r() < 1 / 12) {
    power[count - 1] = pick(r, ROAD_POWER[profile.railroad === 'csx' ? 'ns' : 'csx']);
  }
  const units: ConsistUnit[] = [
    // The lead always faces forward; trailing units may run either way round.
    ...power.map((kind, i) => ({ kind, flip: i > 0 && r() < 0.5, power: true })),
    ...cars.map((kind) => ({ kind, flip: kind.startsWith('well') ? false : r() < 0.5, power: false })),
  ];
  return {
    railroad: profile.railroad, slot, recipe, units, cars: cars.length, locomotives: count,
    lengthM: trainLength(units.map((u) => u.kind)),
  };
}

/** The longest train a profile can produce, for sizing slots. */
export function maxTrainLength(profile: LineProfile) {
  const longestCar = Math.max(...[...MANIFEST_CARS, ...UNIT_CARS, ...(profile.recipes.intermodal ? WELL_LOADS : [])]
    .map((k) => FREIGHT_LENGTH[k as FreightUnit]));
  const longestPower = Math.max(...Object.values(ROAD_POWER).flat().map((k) => FREIGHT_LENGTH[k]));
  return 30 * longestCar + 3 * longestPower + COUPLER_GAP * 33;
}

const RECIPE_NAME: Record<FreightRecipe, string> = { manifest: 'Manifest', intermodal: 'Intermodal', unit: 'Unit train' };
/** e.g. "Manifest · 15 cars · 2 locomotives". */
export function passageSummary(p: Passage) {
  return `${RECIPE_NAME[p.recipe]} · ${p.cars} cars · ${p.locomotives} locomotive${p.locomotives === 1 ? '' : 's'}`;
}
