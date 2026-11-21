import { describe, expect, it } from 'vitest';
import { Line } from '../vignette/geom';
import { carInDaylight, CityTracks } from './trains';

describe('City train placement', () => {
  const crossTown = { line: new Line([[-100, 0], [100, 0]]), elev: (s: number) => s < 90 ? -4 : -12 };
  const northSouth = { line: new Line([[0, -100], [0, 100]]), elev: () => -18 };
  const tracks = new CityTracks([northSouth, crossTown]);

  it('follows both directions of the right corridor at a grade-separated crossing', () => {
    expect(tracks.locate(0, 1, 90)).toEqual({ al: crossTown, s: 100, dir: 1 });
    expect(tracks.locate(0, 1, 270)).toEqual({ al: crossTown, s: 100, dir: -1 });
    expect(tracks.locate(0, 1, 0)).toEqual({ al: northSouth, s: 101, dir: -1 });
    expect(tracks.locate(50, 50, 90)).toBeUndefined();
  });

  it('keeps the last end in the open cut until the whole car is covered', () => {
    expect(carInDaylight(crossTown, 96)).toBe(true);
    expect(carInDaylight(crossTown, 103)).toBe(false);
    expect(carInDaylight(crossTown, -25)).toBe(false);
  });
});
