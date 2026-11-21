import type { P2 } from './geom';

/** Conservative broad phase for static placement. Exact geometry tests still decide hits. */
export class PlacementIndex<T> {
  private cells = new Map<string, T[]>();
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
        const key = `${x},${z}`;
        const cell = this.cells.get(key);
        if (cell) cell.push(value);
        else this.cells.set(key, [value]);
      }
    }
  }

  at(x: number, z: number): readonly T[] {
    return this.cells.get(`${Math.floor(x / this.step)},${Math.floor(z / this.step)}`) ?? [];
  }
}
