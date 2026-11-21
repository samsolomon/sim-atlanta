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
