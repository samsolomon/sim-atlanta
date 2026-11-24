// Stand-in for skin-kit's seedOf/litHash (PR #470) with the same signatures. Delete it
// and import from './skin-kit' once #470 lands.

/** A 32-bit seed from a building id. */
export function cellSeed(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A well-mixed value in [0, 1) per (face, floor, bay): no row, column or diagonal structure. */
export function cellHash(seed: number, face: number, floor: number, bay: number) {
  let h = seed ^ Math.imul(face + 1, 0x9e3779b1) ^ Math.imul(floor + 1, 0x85ebca77) ^ Math.imul(bay + 1, 0xc2b2ae3d);
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
