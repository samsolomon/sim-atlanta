import { describe, expect, it } from 'vitest';
import { connectorLanes } from './connector-lanes';

describe('Georgia State Connector lanes', () => {
  it('matches all four surveyed edges at each section in City metres', () => {
    for (const [s, sbOutside, sbInside, nbInside, nbOutside] of [
      [-76, -40.8, -16.0, -10.4, 14.6], [77, -33.6, -9.2, -3.2, 21.8],
    ]) {
      for (const [dir, inside, outside] of [
        ['northbound', nbInside, nbOutside], ['southbound', sbInside, sbOutside],
      ] as const) {
        const lane = connectorLanes(dir, s)!;
        expect(lane.travelSign).toBe(dir === 'northbound' ? 1 : -1);
        expect(lane.edges).toHaveLength(8);
        for (const [point, across] of [[lane.edges[0], inside], [lane.edges[7], outside]] as const) {
          expect(point[0]).toBeCloseTo(760 + .8*s + .6*across);
          expect(point[1]).toBeCloseTo(545 - .6*s + .8*across);
        }
      }
    }
  });

  it('keeps every modelled centre midway between its own dividers under the decks', () => {
    for (const dir of ['northbound', 'southbound'] as const) {
      const { edges, centres } = connectorLanes(dir, .5)!;
      expect(centres).toHaveLength(7);
      centres.forEach((p, i) => {
        for (const axis of [0, 1]) expect(p[axis]).toBeCloseTo((edges[i][axis] + edges[i+1][axis])/2);
      });
    }
  });

  it('does not extrapolate beyond the evidence', () => {
    for (const s of [-77, 78, NaN]) expect(connectorLanes('northbound', s)).toBeNull();
  });
});
