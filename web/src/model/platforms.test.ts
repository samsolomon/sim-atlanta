import { describe, expect, it } from 'vitest';
import { AVONDALE_LAYOUT, AVONDALE_PHYSICAL, AVONDALE_SERVICE } from './avondale-layout';
import { boardingChoices, scheduledBoardingChoices, type StationLayout } from './platforms';
import { georgiaStateScene, GEORGIA_STATE_PLATFORMS_BY_STOP } from '../city/georgia-state-geometry';
import { platformSection } from '../city/platform-section';

const site = georgiaStateScene({ lon: -84.3916, lat: 33.7539 });

describe('physical platforms and boarding choices', () => {
  it('uses Georgia State’s two actual one-sided platforms, in both travel directions', () => {
    const [south, north] = site.platforms;
    expect(scheduledBoardingChoices(site, 130, { heading: 130, scheduledStop: 'marta:stop:908696' }, GEORGIA_STATE_PLATFORMS_BY_STOP))
      .toEqual([{ platformId: south.id, trackId: 'ER', doorSide: 'right' }]);
    expect(scheduledBoardingChoices(site, 130, { heading: 310, scheduledStop: 'marta:stop:908618' }, GEORGIA_STATE_PLATFORMS_BY_STOP))
      .toEqual([{ platformId: north.id, trackId: 'EL', doorSide: 'right' }]);
    expect(boardingChoices(site, -1, ['ER'])).toEqual([{ platformId: south.id, trackId: 'ER', doorSide: 'left' }]);
    expect(scheduledBoardingChoices(site, 130, { heading: 130 }, GEORGIA_STATE_PLATFORMS_BY_STOP)).toEqual([]);
    expect(scheduledBoardingChoices(site, 130, { heading: 130, scheduledStop: 'unrelated' }, GEORGIA_STATE_PLATFORMS_BY_STOP)).toEqual([]);
  });

  it('retains alternatives when a track has a platform on both sides', () => {
    const layout: StationLayout = { id: 'test', tracks: ['outer', 'middle', 'bypass'], platforms: [
      { id: 'island', edges: [{ trackId: 'outer', side: 'right' }, { trackId: 'middle', side: 'left' }] },
      { id: 'side', edges: [{ trackId: 'middle', side: 'right' }] },
    ] };
    expect(boardingChoices(layout, 1, ['middle'])).toEqual([
      { platformId: 'island', trackId: 'middle', doorSide: 'left' },
      { platformId: 'side', trackId: 'middle', doorSide: 'right' },
    ]);
    expect(boardingChoices(layout, -1)).toHaveLength(3);
    expect(boardingChoices(layout, -1, [])).toEqual([]);
    expect(boardingChoices(layout, 1, ['bypass'])).toEqual([]);
    // One slab, bounded on both sides by the car clearance at its adjacent tracks.
    expect(platformSection(layout.platforms[0], [-4, 5], { outer: -6, middle: 6 }, 1.73)).toEqual({
      min: -4.27, max: 4.27, lips: [{ v: -4.27, inward: 1 }, { v: 4.27, inward: -1 }],
    });
  });
});

it('keeps both Avondale boarding edges for each GTFS island stop', () => {
  const offsets = Object.fromEntries(Object.entries(AVONDALE_PHYSICAL.tracks).map(([id, t]) => [id, t.v]));
  for (const platform of AVONDALE_LAYOUT.platforms) {
    const section = platformSection(platform, AVONDALE_PHYSICAL.platforms[platform.id].vRange, offsets, 1.73);
    expect(section.lips).toHaveLength(2);
    expect(section.max - section.min).toBeCloseTo(7.84);
  }
  for (const service of AVONDALE_SERVICE.filter(s => s.inCurrentFeed)) {
    const id = service.platform.id;
    const bearing = AVONDALE_PHYSICAL.axisBearingDeg;
    const choices = scheduledBoardingChoices(AVONDALE_LAYOUT, bearing,
      { scheduledStop: id, heading: bearing + (service.travel === 1 ? 0 : 180) });
    expect(choices.map(c => c.trackId).sort()).toEqual([...service.candidates].sort());
    expect(choices.find(c => c.trackId === service.usual.track)?.doorSide).toBe('left');
    expect(choices.find(c => c.trackId !== service.usual.track)?.doorSide).toBe('right');
  }
});
