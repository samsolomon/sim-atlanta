/**
 * Selection across the Map ↔ City switch (docs/ui-controls-brief.md, "Follow in 3D", Sam 2026-11-24).
 *
 * A selected vehicle survives the switch both ways: Map → City opens City following it, and
 * City → Map keeps its card and centres the map on it. A card with nothing to follow on the other
 * side closes. Pure, so the rules are tested without a renderer.
 */

/** What is selected: a vehicle by id, or a card with nothing to follow (a crossing, a freight line). */
export type Selection = { kind: 'train' | 'bus' | 'freight'; id: string } | { kind: 'other' } | null;

export type Side = 'map' | 'city';

/**
 * Keep the selection on arrival at `to`, or close it.
 * - Trains and buses are drawn in both views from the same feeds and ids, so they carry both ways.
 * - Freight trains exist only in City (the Map draws freight lines, not trains): a City freight
 *   selection closes on the way to the Map. A Map freight-line card is not a vehicle and closes too.
 * - Buses carry only at the real present (both views draw live buses only then).
 */
export function carries(sel: Selection, to: Side, realTime: boolean): boolean {
  if (!sel || sel.kind === 'other') return false;
  if (sel.kind === 'bus') return realTime;
  if (sel.kind === 'freight') return to === 'city';
  return true;
}

/** City's area in scene metres from Five Points (the 3D button's "3D covers downtown and Midtown"). */
export const CITY_AREA = { minX: -1000, maxX: 1800, minZ: -6500, maxZ: 1100 };

export function inCityArea(x: number, z: number): boolean {
  return x >= CITY_AREA.minX && x <= CITY_AREA.maxX && z >= CITY_AREA.minZ && z <= CITY_AREA.maxZ;
}

/**
 * The card's primary button. In the Map it offers to open City following the vehicle (only when
 * the vehicle is inside City's area, so the follow doesn't end the moment it starts); in City it
 * starts or stops the follow. null hides the button.
 */
export function followLabel(side: Side, following: boolean, inArea: boolean): string | null {
  if (side === 'map') return inArea ? 'Follow in 3D' : null;
  return following ? 'Stop following' : 'Follow';
}
