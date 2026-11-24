/**
 * Deck levels for inferred (unsurveyed) bridge networks.
 *
 * Each inferred bridge run used to start and end on the bare-earth DEM. Where viaduct pieces,
 * their mapped sidewalks and footbridges meet only one another (the Gulch), that DEM is the
 * floor under the structure, so every piece dropped to track level at its ends and humped up
 * only where it crossed something. Here a node where only bridge runs meet is free: it takes
 * the highest clearance a connected run needs, less the fall a believable grade allows over
 * the distance, so the network stays up and ramps down only toward real abutments (a ground
 * carriageway, the board edge or a surveyed deck), which keep their fixed heights.
 */
export interface DeckRun {
  /** Node keys of the run's two ends. */
  a: string;
  b: string;
  length: number;
  /** Clearance the deck must keep at stations along the run (distance from `a`, scene y). */
  needs: readonly { s: number; y: number }[];
}

/** Steepest grade a deck may fall at away from what it clears. */
export const DECK_GRADE = 0.08;
/** Grade a new need or level is checked against from a fixed end: under DECK_GRADE, since a
 * drawn end sits a little off the DEM node and the deck's edges follow the ground's crossfall. */
export const DECK_REACH = 0.065;

/**
 * Heights for free nodes, raised from their floor (usually the DEM) only as far as some
 * connected run's need requires. Fixed nodes keep their height and are not returned.
 */
export function solveDeckLevels(runs: readonly DeckRun[], floor: (key: string) => number | null,
  fixed: (key: string) => boolean, grade = DECK_GRADE, reach = DECK_REACH) {
  // A free node may sit no higher than a fixed neighbour plus the grade over the run between
  // them: a level that would need a steeper ramp down to a real abutment is not taken.
  const cap = new Map<string, number>();
  for (const run of runs) for (const [free, other] of [[run.a, run.b], [run.b, run.a]]) {
    if (fixed(free) || !fixed(other)) continue;
    const bank = floor(other);
    if (bank !== null) cap.set(free, Math.min(cap.get(free) ?? Infinity, bank + reach * run.length));
  }
  const capped = (key: string, y: number) => Math.min(y, cap.get(key) ?? Infinity);
  const level = new Map<string, number>();
  const raise = (key: string, y: number) => {
    if (fixed(key)) return false;
    const base = level.get(key) ?? floor(key);
    if (base === null || base === undefined) return false;
    y = capped(key, y);
    if (y <= base + 1e-6) { if (!level.has(key)) level.set(key, base); return false; }
    level.set(key, y);
    return true;
  };
  for (const run of runs) for (const { s, y } of run.needs) {
    raise(run.a, y - grade * s);
    raise(run.b, y - grade * (run.length - s));
  }
  // Carry each raised level through connected runs: a node may sit no lower than its
  // neighbour less the grade over the run between them.
  for (let pass = 0, moved = true; moved && pass < 100; pass++) {
    moved = false;
    for (const run of runs) {
      const ya = level.get(run.a), yb = level.get(run.b);
      if (ya !== undefined && raise(run.b, ya - grade * run.length)) moved = true;
      if (yb !== undefined && raise(run.a, yb - grade * run.length)) moved = true;
    }
  }
  // Only nodes that moved off their floor matter to the caller.
  for (const [key, y] of level) if (y <= (floor(key) ?? -Infinity) + 1e-6) level.delete(key);
  return level;
}
