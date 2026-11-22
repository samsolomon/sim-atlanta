import type { TrainState } from './types';

/** Side of the track looking along the station's positive axis. */
export type Side = 'left' | 'right';
export type Travel = 1 | -1;

export interface BoardingEdge {
  readonly trackId: string;
  readonly side: Side;
}

export interface PhysicalPlatform {
  readonly id: string;
  readonly edges: readonly [BoardingEdge, ...BoardingEdge[]];
}

export interface StationLayout {
  readonly id: string;
  readonly tracks: readonly string[];
  readonly platforms: readonly PhysicalPlatform[];
}

export interface BoardingChoice {
  platformId: string;
  trackId: string;
  doorSide: Side;
}

/** Physical options only. Omit trackIds when the track is unknown. An explicitly
 * empty candidate set has no matches. Neither travel nor array order assigns a train. */
export function boardingChoices(layout: StationLayout, travel: Travel, trackIds = layout.tracks): BoardingChoice[] {
  return layout.platforms.flatMap(platform => platform.edges
    .filter(edge => trackIds.includes(edge.trackId) && layout.tracks.includes(edge.trackId))
    .map(edge => ({
      platformId: platform.id,
      trackId: edge.trackId,
      doorSide: travel === 1 ? edge.side : edge.side === 'left' ? 'right' : 'left',
    })));
}

/** Join the existing timetable call and heading to its possible physical edges.
 * referenceBearing is the station axis, clockwise from north as in TrainState.heading. */
export function scheduledBoardingChoices(layout: StationLayout, referenceBearing: number,
  train: Pick<TrainState, 'scheduledStop' | 'heading'>, platformsByStop: Readonly<Record<string, readonly string[]>> = {}) {
  if (train.scheduledStop === undefined) return [];
  const platforms = platformsByStop[train.scheduledStop] ?? [train.scheduledStop];
  const along = Math.cos((train.heading - referenceBearing) * Math.PI / 180);
  if (!Number.isFinite(along) || Math.abs(along) < 1e-6) return [];
  return boardingChoices(layout, along > 0 ? 1 : -1).filter(choice => platforms.includes(choice.platformId));
}
