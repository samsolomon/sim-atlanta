/** Shared footprint at the ground centre, independent of renderer pixel ratio. */
export interface GroundCamera {
  /** Clockwise from north, matching MapLibre's bearing. */
  bearing: number;
  metresPerPixel: number;
}

const CIRCUMFERENCE = 2 * Math.PI * 6_371_008.8;
const TILE_SIZE = 512; // MapLibre's zoom convention, regardless of source tile size

export function mapMetresPerPixel(latitude: number, zoom: number): number {
  return CIRCUMFERENCE * Math.cos(latitude * Math.PI / 180) / (TILE_SIZE * 2 ** zoom);
}

export function mapZoomForScale(latitude: number, metresPerPixel: number): number {
  return Math.log2(CIRCUMFERENCE * Math.cos(latitude * Math.PI / 180) / (TILE_SIZE * metresPerPixel));
}

export const PEDESTRIAN_HEIGHT = 1.7;
export const MAX_EYE_HEIGHT = 25;

/** Opening City camera in Five Points metres, degrees, and orbit distance. */
export function parseCityCamera(value: string | null) {
  if (!value) return null;
  const parts = value.split(',');
  if ((parts.length !== 5 && parts.length !== 6) || parts.some(part => !part.trim())) return null;
  const [x, z, bearing, tilt, distanceM, eyeHeightM] = parts.map(Number);
  if (![x, z, bearing, tilt, distanceM].every(Number.isFinite) || distanceM <= 0) return null;
  const pose = { x, z, bearing: bearing % 360, tilt, distanceM };
  if (eyeHeightM === undefined) return pose;
  if (tilt <= 70 || !Number.isFinite(eyeHeightM) || eyeHeightM < PEDESTRIAN_HEIGHT || eyeHeightM > MAX_EYE_HEIGHT) return null;
  return { ...pose, eyeHeightM };
}

/** The `cam` query value parseCityCamera reads: whole metres and degrees (#166's format). */
export function formatCityCamera(c: { x: number; z: number; bearing: number; tilt: number; distanceM: number; eyeHeightM?: number }): string {
  if (c.tilt > 70) {
    const fields = [c.x, c.z, c.bearing, c.tilt, c.distanceM];
    if (c.eyeHeightM !== undefined && c.eyeHeightM !== PEDESTRIAN_HEIGHT) fields.push(c.eyeHeightM);
    return fields.map(n => Number(n.toFixed(4))).join(',');
  }
  const bearing = ((Math.round(c.bearing) % 360) + 540) % 360 - 180; // −180…180, as MapLibre shows it
  return [Math.round(c.x), Math.round(c.z), bearing, Math.round(c.tilt), Math.max(1, Math.round(c.distanceM))].join(',');
}
