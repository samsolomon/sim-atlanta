import type { Map as MlMap } from 'maplibre-gl';
import type { Route, TrainState } from '../model/types';
import { modeColor } from './layers';

/**
 * Draws a rounded "train" capsule with a pointed nose as an SDF image, so one
 * image can be tinted per route and rotated to the train's heading.
 */
function trainImage(): ImageData {
  const w = 24;
  const h = 64; // drawn pointing "north" (up); icon-rotate turns it to the heading
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff';
  g.beginPath();
  const r = 7;
  g.moveTo(w / 2, 1); // nose
  g.quadraticCurveTo(w - 2, 6, w - 2, 16);
  g.lineTo(w - 2, h - r - 2);
  g.quadraticCurveTo(w - 2, h - 2, w - 2 - r, h - 2);
  g.lineTo(2 + r, h - 2);
  g.quadraticCurveTo(2, h - 2, 2, h - r - 2);
  g.lineTo(2, 16);
  g.quadraticCurveTo(2, 6, w / 2, 1);
  g.fill();
  return g.getImageData(0, 0, w, h);
}

export function addTrainLayer(map: MlMap) {
  map.addImage('train', trainImage(), { sdf: true, pixelRatio: 2 });
  map.addSource('trains', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  // Icon is 32 px tall at size 1 (64 px / pixelRatio 2). At zoom 16 in Atlanta ~2 m/px,
  // so a 140 m MARTA train is ~70 px: size ≈ 2.2 × (length/140). Below that, a readable minimum.
  const ls = ['get', 'ls'];
  // Soft shadow so trains lift off a line drawn in the same colour.
  map.addLayer({
    id: 'trains-shadow',
    type: 'circle',
    source: 'trains',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 6, 13, 12, 16, 22] as unknown as number,
      'circle-color': '#1d232b',
      'circle-opacity': 0.22,
      'circle-blur': 1,
    },
  });
  map.addLayer({
    id: 'trains',
    type: 'symbol',
    source: 'trains',
    layout: {
      'icon-image': 'train',
      'icon-rotate': ['get', 'heading'] as unknown as number,
      'icon-rotation-alignment': 'map',
      'icon-pitch-alignment': 'map',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'icon-size': [
        'interpolate', ['exponential', 2], ['zoom'],
        8, 0.7,
        13, 1.25,
        16, ['max', 1.25, ['*', 2.2, ls]],
        19, ['*', 17.6, ls],
      ] as unknown as number,
    },
    paint: {
      // Live trains are solid; scheduled trains are outlined ("ghosted").
      'icon-color': ['case', ['get', 'live'], ['get', 'color'], '#ffffff'] as unknown as string,
      'icon-halo-color': ['case', ['get', 'live'], '#ffffff', ['get', 'color']] as unknown as string,
      'icon-halo-width': 2.2,
    },
  });
}

export function trainFeatures(trains: TrainState[], routes: Map<string, Route>): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: trains.map((t) => {
      const r = routes.get(t.routeId);
      return {
        type: 'Feature',
        id: undefined,
        properties: {
          id: t.id,
          routeId: t.routeId,
          heading: t.heading,
          color: r ? modeColor(r) : '#333',
          live: (t.s.tier === 'live' || t.s.source === 'marta-rail-rt'),
          ls: t.lengthM.value / 140,
        },
        geometry: { type: 'Point', coordinates: [t.lon, t.lat] },
      };
    }),
  };
}
