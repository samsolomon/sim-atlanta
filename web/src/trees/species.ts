/**
 * City's tree species framework. A species is one parameterised model: a size class (sapling,
 * young, mature, specimen) with published height, spread and trunk calliper; a seed for natural
 * variation; and a season driven by the clock's date. The renderer in render.ts batches any mix
 * of species and sizes into a few instanced draws. See docs/tree-species.md.
 */
import * as THREE from 'three';

export type TreeQuality = 'high' | 'low';
export type SizeClass = 'sapling' | 'young' | 'mature' | 'specimen';
export const SIZE_CLASSES: SizeClass[] = ['sapling', 'young', 'mature', 'specimen'];

/** A tree's size in metres. `spreadM` is the crown DIAMETER, as nurseries and inventories give it. */
export interface Dims { heightM: number; spreadM: number; calliperM: number }

export type V3 = [number, number, number];
/** One limb as a tapered cylinder in unit space (crown radius 1, height 1). */
export interface Seg { a: V3; b: V3; r0: number; r1: number; sides: number; color: string }
/**
 * One leaf clump in unit space. `w` is its horizontal half-size as a fraction of the crown
 * radius; `h` its vertical half-size as a fraction of the height (clumps never get flatter than
 * 0.6 of their width).
 */
export interface Pad { x: number; y: number; z: number; w: number; h: number }
export interface Form { segs: Seg[]; pads: Pad[] }

/** What the crown looks like on one day. */
export interface Foliage {
  /** Fraction of clumps in leaf, 0–1. */
  leaves: number;
  colour: THREE.Color;
  /** Flowers or bracts: this share of the clumps in leaf takes the bloom colour. */
  bloom?: { colour: THREE.Color; share: number };
  /** Fallen-leaf carpet under the crown, 0 none to 1 fresh. */
  carpet: number;
  carpetColour?: THREE.Color;
  /** Short label for the lab. */
  label: string;
}

export interface Species {
  id: string;
  name: string;
  /** Leaf clump shape: faceted clumps for broadleaves, cone tiers for pines. */
  leaf: 'clump' | 'cone';
  /** Whether it ever drops a leaf carpet (adds one draw). */
  carpet: boolean;
  /** Nominal size per class; seeds vary each tree by about ±8%. */
  sizes: Record<SizeClass, Dims>;
  /** Sourced range per class (docs/tree-species.md); every nominal size lies inside it. */
  ranges: Record<SizeClass, Record<keyof Dims, [number, number]>>;
  /** Leaf clumps per tree. Every form must have exactly this many pads. */
  clumps: Record<TreeQuality, number>;
  form(size: SizeClass, q: TreeQuality, dims: Dims): Form;
  /** `offset` is the tree's own shift in days (see offsetDays). */
  foliage(doy: number, offset: number): Foliage;
  /** Trees turn within ±offsetDays of one another. */
  offsetDays: number;
}

// ---- helpers for writing forms ---------------------------------------------------------

export const polar = (a: number, r: number, y: number): V3 => [Math.cos(a) * r, y, Math.sin(a) * r];
export const lerp3 = (p: V3, q: V3, f: number): V3 => [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f, p[2] + (q[2] - p[2]) * f];
export const pad = (p: V3, w: number, h = 0.07): Pad => ({ x: p[0], y: p[1] + 0.03, z: p[2], w, h });
/** Unit-space trunk radius that gives the class's real calliper once scaled by the crown radius. */
export const trunkRadius = (d: Dims) => d.calliperM / 2 / (d.spreadM / 2);

/** A deterministic number in [0, 1) from a seed and a salt. */
export function hash01(seed: number, salt = 0) {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(salt + 1, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}

/** Day-of-year for a month and day in a non-leap year. */
export const doyOf = (month: number, day: number) =>
  Math.round((Date.UTC(2026, month - 1, day) - Date.UTC(2026, 0, 0)) / 86_400_000);
