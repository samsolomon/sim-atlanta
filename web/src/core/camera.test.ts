import { describe, expect, it } from 'vitest';
import { MercatorCoordinate } from 'maplibre-gl';
import { mapMetresPerPixel, mapZoomForScale } from './camera';

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
