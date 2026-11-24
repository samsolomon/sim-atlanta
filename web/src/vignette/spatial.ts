import { pointInRing, type P2 } from './geom';

/** Conservative broad phase for static placement. Exact geometry tests still decide hits. */
export class PlacementIndex<T> {
  // Numeric cell keys: a template string per lookup was a measurable share of a phone's City load.
  private cells = new Map<number, T[]>();
  private key(x: number, z: number) { return (x + 32768) * 65536 + (z + 32768); }
  constructor(private step = 64) {}

  add(value: T, points: P2[], pad = 0) {
    if (!points.length) return;
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const [x, z] of points) {
      x0 = Math.min(x0, x); x1 = Math.max(x1, x);
      z0 = Math.min(z0, z); z1 = Math.max(z1, z);
    }
    for (let x = Math.floor((x0 - pad) / this.step); x <= Math.floor((x1 + pad) / this.step); x++) {
      for (let z = Math.floor((z0 - pad) / this.step); z <= Math.floor((z1 + pad) / this.step); z++) {
        const key = this.key(x, z);
        const cell = this.cells.get(key);
        if (cell) cell.push(value);
        else this.cells.set(key, [value]);
      }
    }
  }

  /** Index rings by their own points. */
  addAll(this: PlacementIndex<P2[]>, rings: P2[][]) { for (const ring of rings) this.add(ring, ring); return this; }

  at(x: number, z: number): readonly T[] {
    return this.cells.get(this.key(Math.floor(x / this.step), Math.floor(z / this.step))) ?? [];
  }
}

/** Is (x, z) inside any of `rings`? Same answer as a linear scan, through the broad phase. */
export function insideAny(rings: P2[][], step = 64) {
  const index = new PlacementIndex<P2[]>(step).addAll(rings);
  return (x: number, z: number) => index.at(x, z).some(ring => pointInRing(x, z, ring));
}
