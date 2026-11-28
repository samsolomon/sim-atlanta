import type { Followed } from './vehicle-follow';
import type { VehicleSelection } from './pick';

/** The vehicle City x-rays (city/ghosts.ts): a train (rail or streetcar) or a bus. */
export type XrayTarget = { kind: 'train' | 'bus'; id: string };

/**
 * Which vehicle to x-ray this frame. Follow wins, because its id moves on a tier handoff (a
 * timetable trip replaced by live rail, or the reverse) and the camera goes with it; otherwise
 * the vehicle the card shows. Freight has no x-ray (it is illustrative, and not a selection the
 * ghost look covers). Nothing selected or followed: null.
 */
export function xrayTarget(followed: Followed | undefined, selected: VehicleSelection | null): XrayTarget | null {
  if (followed) return followed.kind === 'freight' ? null : { kind: followed.kind, id: followed.id };
  if (selected && (selected.kind === 'train' || selected.kind === 'bus')) return { kind: selected.kind, id: selected.id };
  return null;
}
