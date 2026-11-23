import grades from '../../../pipeline/prototypes/midtown-foundations/grades.json';
import type { TerrainCity } from '../terrain/transport-data';

const sites: Record<string, number[]> = grades;

/** Fit one inferred finished floor to all clipped pieces of a buried hillside building. */
export function midtownFoundations<T extends TerrainCity>(city: T, sceneZero: number): T {
  return { ...city, buildings: city.buildings.map(building => {
    const grade = sites[building.id.split('/')[0]];
    if (!grade) return building;
    const [low, high] = grade;
    const height = building.h ?? (building.floors ? building.floors * 3.6 : 8);
    // Use the middle grade, raising it only enough for a door at the uphill edge.
    const floorY = Math.max((low + high) / 2, high - height + Math.min(height, 2.4)) - sceneZero;
    return { ...building, floorY };
  }) };
}
