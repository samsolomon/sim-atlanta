import { describe, expect, it } from 'vitest';
import { MercatorCoordinate } from 'maplibre-gl';
import { mapMetresPerPixel, mapZoomForScale, parseCityCamera } from './camera';

describe('Map/City ground scale', () => {
  it.each([[-84.3916, 33.7539, 15], [-84.38, 33.768, 18], [0, 0, 0], [0, 60, 12]])(
    'matches MapLibre at %s, %s, zoom %s', (lon, lat, zoom) => {
      const unitsPerMetre = MercatorCoordinate.fromLngLat([lon, lat]).meterInMercatorCoordinateUnits();
      const reference = 1 / (unitsPerMetre * 512 * 2 ** zoom);
      expect(mapMetresPerPixel(lat, zoom)).toBeCloseTo(reference, 8);
      expect(mapZoomForScale(lat, reference)).toBeCloseTo(zoom, 10);
    },
  );
});

describe('opening City camera', () => {
  it('reads scene metres and a clockwise ground bearing', () => {
    expect(parseCityCamera('565,-3965,-101,55,421')).toEqual({
      x: 565, z: -3965, bearing: -101, tilt: 55, distanceM: 421,
    });
  });
  it.each([null, '', '0,0,0,55', '0, ,0,55,421', '0,0,NaN,55,421',
    'Infinity,0,0,55,421', '0,0,0,55,0', '0,0,0,55,-1', '0,0,0,55,421,2'])(
    'ignores malformed input %s', value => expect(parseCityCamera(value)).toBeNull(),
  );
});
