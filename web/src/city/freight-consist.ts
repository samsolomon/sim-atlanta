import { FREIGHT_LENGTH, type FreightUnit } from '../vignette/freight-stock';
import { DOMESTIC_WEIGHTS, INTERNATIONAL_WEIGHTS } from '../vignette/intermodal';

/**
 * Illustrative freight consists, one per passage (docs/freight-consists.md). Everything here is a
 * pure function of the line, the signed passage slot and CONSIST_VERSION: seeking, reloading and
 * changing quality all select the same train. Nothing is reported or scheduled; the card says so.
 */
/** Bump whenever recipes or car lists change, so a slot is never silently re-dealt. v2 adds tank cars, v3 mill gondolas, v4 centerbeams, v5 autoracks, v6 coal hoppers, v7 lifts the downtown autorack and intermodal exclusions, v8 deals each container its own colour and length. */
export const CONSIST_VERSION = 9;
export const COUPLER_GAP = 0.3;

export type FreightRailroad = 'csx' | 'ns';
export type FreightRecipe = 'manifest' | 'intermodal' | 'unit';
/** One container: an index into CONTAINER_PALETTE (0–4 domestic, 5–9 international) and its length. */
export interface Container { color: number; long: boolean }
/** A well car's load. `null` slots are empty: an empty well has neither, a single stack no top. */
export interface WellLoad { bottom: Container | null; top: Container | null }
export interface ConsistUnit {
  kind: FreightUnit;
  /** Runs long hood (or B end) forward. */
  flip: boolean;
  power: boolean;
  /** Intermodal wells only. */
  load?: WellLoad;
}
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
  /** Weights for manifest, intermodal and unit. Set intermodal to 0 where double-stack clearance is unverified. */
  recipes: Record<FreightRecipe, number>;
  /** Car kinds this line never draws (unverified clearance or curvature). */
  exclude?: FreightUnit[];
}

/** Look-alike power by railroad (docs/freight-variety.md). The GP38-2 is a CSX-like local unit. */
const ROAD_POWER: Record<FreightRailroad, FreightUnit[]> = {
  csx: ['locomotive', 'es44ah'],
  ns: ['locomotiveNs', 'es44acNs', 'sd70ace'],
};
const MANIFEST_CARS: FreightUnit[] = ['boxcar', 'boxcarFaded', 'boxcarBlue', 'grainHopper', 'tank', 'gondolaScrap', 'gondolaEmpty', 'centerbeamLumber', 'centerbeamEmpty', 'autorack'];
/** Unit-train commodities: grain hoppers, tanks for an illustrative ethanol movement, autoracks, or
 * coal hoppers running loaded or empty. */
const UNIT_CARS: FreightUnit[] = ['grainHopper', 'tank', 'autorack', 'coalLoaded', 'coalEmpty'];
/** City draws every well from one shape; each car's containers come from its seeded load. */
const WELL: FreightUnit = 'wellA';
/** About one well in eight runs empty, and one in eight carries a single container. */
export const EMPTY_WELL = 1 / 8;
export const SINGLE_STACK = 1 / 8;
/** Domestic bottoms usually carry another domestic box. Short bottoms only carry 40s. */
const BOTTOM_53 = 0.8;
const TOP_53_ON_53 = 0.75;
/** Distinct car geometries a train may draw, so each passage costs a small, fixed number of
 * instanced draws (one per kind present) on both tiers. */
export const MAX_CAR_KINDS: Record<FreightRecipe, number> = { manifest: 3, intermodal: 1, unit: 1 };
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

const weighted = (r: () => number, weights: readonly number[]) => {
  let roll = r() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < weights.length; i++) if ((roll -= weights[i]) < 0) return i;
  return weights.length - 1;
};
function container(r: () => number, share53: number): Container {
  const long = r() < share53;
  return { long, color: long ? weighted(r, DOMESTIC_WEIGHTS) : 5 + weighted(r, INTERNATIONAL_WEIGHTS) };
}
const pairKey = (l: WellLoad) => `${l.bottom?.color ?? '-'}/${l.top?.color ?? '-'}`;
/** Seeded loads for a run of wells: per container, never the same colour pair on adjacent cars. */
export function wellLoads(r: () => number, n: number): WellLoad[] {
  const out: WellLoad[] = [];
  for (let i = 0; i < n; i++) {
    let load: WellLoad = { bottom: null, top: null };
    for (let attempt = 0; attempt < 8; attempt++) {
      const roll = r();
      const bottom = roll < EMPTY_WELL ? null : container(r, BOTTOM_53);
      const top = roll < EMPTY_WELL + SINGLE_STACK ? null : container(r, bottom?.long ? TOP_53_ON_53 : 0);
      load = { bottom, top };
      if (!out.length || pairKey(load) !== pairKey(out[out.length - 1])) break;
    }
    out.push(load);
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
  let loads: WellLoad[] = [];
  if (recipe === 'manifest') {
    const n = int(r, 6, 24);
    // Up to three car types; blocks rotate through them so like cars stay together.
    const allowed = MANIFEST_CARS.filter((k) => !profile.exclude?.includes(k));
    const types = shuffled(r, allowed).slice(0, int(r, 1, MAX_CAR_KINDS.manifest));
    blockSizes(n, r).forEach((size, i) => cars.push(...Array<FreightUnit>(size).fill(types[i % types.length])));
  } else if (recipe === 'intermodal') {
    const n = int(r, 8, 30);
    for (let i = 0; i < n; i++) cars.push(WELL);
    loads = wellLoads(r, n);
  } else {
    const kind = pick(r, UNIT_CARS.filter((k) => !profile.exclude?.includes(k)));
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
    ...cars.map((kind, i) => (kind === WELL ? { kind, flip: false, power: false, load: loads[i] } : { kind, flip: r() < 0.5, power: false })),
  ];
  return {
    railroad: profile.railroad, slot, recipe, units, cars: cars.length, locomotives: count,
    lengthM: trainLength(units.map((u) => u.kind)),
  };
}

/** Every unit kind a profile can draw: both railroads' road power (a trailing unit may be borrowed),
 * the GP38-2 local on CSX-like track, and the cars its recipes and exclusions allow. */
export function profileKinds(profile: LineProfile): FreightUnit[] {
  const cars = [...MANIFEST_CARS, ...UNIT_CARS, ...(profile.recipes.intermodal ? [WELL] : [])]
    .filter((k) => !profile.exclude?.includes(k));
  const power: FreightUnit[] = [...Object.values(ROAD_POWER).flat(), ...(profile.railroad === 'csx' ? ['gp382' as const] : [])];
  return [...new Set([...power, ...cars])];
}

/** The longest train a profile can produce, for sizing slots. */
export function maxTrainLength(profile: LineProfile) {
  const longestCar = Math.max(...[...MANIFEST_CARS, ...UNIT_CARS, ...(profile.recipes.intermodal ? [WELL] : [])]
    .map((k) => FREIGHT_LENGTH[k as FreightUnit]));
  const longestPower = Math.max(...Object.values(ROAD_POWER).flat().map((k) => FREIGHT_LENGTH[k]));
  return 30 * longestCar + 3 * longestPower + COUPLER_GAP * 33;
}

const RECIPE_NAME: Record<FreightRecipe, string> = { manifest: 'Manifest', intermodal: 'Intermodal', unit: 'Unit train' };
/** e.g. "Manifest · 15 cars · 2 locomotives". */
export function passageSummary(p: Passage) {
  return `${RECIPE_NAME[p.recipe]} · ${p.cars} cars · ${p.locomotives} locomotive${p.locomotives === 1 ? '' : 's'}`;
}
