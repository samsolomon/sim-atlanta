import { segDist, type P2 } from '../vignette/geom';
import type { BuildingFinish, VBuilding } from '../vignette/world';
import { apartmentFinish, type ApartmentPalette, type ApartmentLayout } from './apartment-facade';

const main = 'osm:relation:17262953', garage = 'osm:way:1254384192';
const wings = ['osm:way:1254383435', 'osm:way:1254383436'];
const chalk: ApartmentPalette = {
  wall: '#dcdcd7', roof: '#b4b7b3', accent: '#726966', shopFrame: '#46474b', trim: '#b4b5af', recess: '#515b65', glass: '#5e707c',
};
const wingTints = [
  { ...chalk, wall: '#d5d5cf', roof: '#b1b4af' },
  { ...chalk, wall: '#dadbd4', recess: '#57616a' },
];

export function marchonFinishes(buildings: VBuilding[]) {
  const garageRing = buildings.find(b => b.id === garage)?.rings[0] ?? [];
  const residential: ApartmentLayout = { groundUse: 'residential', balconyEvery: 3 };
  // The east wing end in the March 2025 Oakland Avenue panorama has paired sashes
  // and a vertical dark panel. The longer main elevation also has some balcony bays.
  const oaklandEnd: ApartmentLayout = { groundUse: 'residential', balconyEvery: null, panelBand: true };
  function mainLayout(a: P2, b: P2): ApartmentLayout {
    // November 2025 Grant panorama. Evidence supports shop glass on this frontage.
    if ([a, b].every(([x]) => x >= 1391 && x <= 1394)) return { groundUse: 'storefront', balconyEvery: 2 };
    const x = (a[0] + b[0]) / 2, z = (a[1] + b[1]) / 2;
    if (garageRing.some((p, i) => segDist(x, z, p, garageRing[(i + 1) % garageRing.length]) < 0.1))
      return { groundUse: 'service', balconyEvery: null };
    if (Math.min(a[0], b[0]) > 1514) return { ...oaklandEnd, balconyEvery: 3 };
    return residential;
  }
  return (building: VBuilding): BuildingFinish | undefined => {
    if (building.id === 'osm:way:897345399') return { wall: '#8c8276', roof: '#b2aea5' };
    if (building.id === garage) return { wall: '#a6a69e', roof: '#acafa8', plainWalls: true };
    if (building.id === main) return apartmentFinish(building, chalk, mainLayout);
    const wing = wings.indexOf(building.id);
    if (wing >= 0) return apartmentFinish(building, wingTints[wing], (a, b) =>
      Math.min(a[0], b[0]) > 1511 ? oaklandEnd : residential);
  };
}
