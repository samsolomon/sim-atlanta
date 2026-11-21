/**
 * Icons: Phosphor (MIT, phosphoricons.com), imported as raw SVG so only the icons used ship.
 * They draw in `currentColor`; size them with CSS on the wrapping element.
 */
import sun from '@phosphor-icons/core/assets/regular/sun.svg?raw';
import moon from '@phosphor-icons/core/assets/regular/moon.svg?raw';
import cloud from '@phosphor-icons/core/assets/regular/cloud.svg?raw';
import cloudSun from '@phosphor-icons/core/assets/regular/cloud-sun.svg?raw';
import cloudMoon from '@phosphor-icons/core/assets/regular/cloud-moon.svg?raw';
import cloudRain from '@phosphor-icons/core/assets/regular/cloud-rain.svg?raw';
import cloudFog from '@phosphor-icons/core/assets/regular/cloud-fog.svg?raw';
import cloudLightning from '@phosphor-icons/core/assets/regular/cloud-lightning.svg?raw';
import cloudSnow from '@phosphor-icons/core/assets/regular/cloud-snow.svg?raw';
import list from '@phosphor-icons/core/assets/regular/list.svg?raw';
import mapTrifold from '@phosphor-icons/core/assets/regular/map-trifold.svg?raw';
import buildings from '@phosphor-icons/core/assets/regular/buildings.svg?raw';
import x from '@phosphor-icons/core/assets/regular/x.svg?raw';
import caretDown from '@phosphor-icons/core/assets/regular/caret-down.svg?raw';
import type { Weather } from '../core/weather';

export const ICON = { sun, moon, cloud, cloudSun, cloudMoon, cloudRain, cloudFog, cloudLightning, cloudSnow, list, mapTrifold, buildings, x, caretDown };

/** The weather glyph for current conditions; `night` swaps sun for moon. */
export function weatherIcon(w: Weather, night: boolean): string {
  if (w.label === 'snow') return cloudSnow;
  switch (w.kind) {
    case 'storm':
      return cloudLightning;
    case 'rain':
      return cloudRain;
    case 'fog':
      return cloudFog;
    case 'overcast':
      return cloud;
    case 'cloudy':
      return night ? cloudMoon : cloudSun;
    default:
      return night ? moon : sun;
  }
}
