import grades from '../../../pipeline/prototypes/midtown-foundations/grades.json';
import type { TerrainCity } from '../terrain/transport-data';

const sites: Record<string, number[]> = grades;

/**
 * Fit one inferred finished floor to all clipped pieces of a buried hillside
 * building. The grades cover the Midtown rows, the north band and downtown.
 */
export function midtownFoundations<T extends TerrainCity>(city: T, sceneZero: number): T {
  return { ...city, buildings: city.buildings.map(building => {
    const grade = sites[building.id.split('/')[0]];
    if (!grade) return building;
    const [low, high] = grade;
    const height = building.h ?? (building.floors ? building.floors * 3.6 : 8);
    // Use the middle grade, raising it only enough for a door at the uphill edge.
    // A structure too short for a door tucks its uphill side into the slope
    // instead, with its roof flush with the high ground at worst.
    const floor = height < 2.4 ? Math.max((low + high) / 2, high - height)
      : Math.max((low + high) / 2, high - height + 2.4);
    const floorY = floor - sceneZero;
    return { ...building, floorY };
  }) };
}
