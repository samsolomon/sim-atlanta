import * as THREE from 'three';
import type { VBuilding } from '../vignette/world';

/** A soft, equirectangular reflection probe sampled from the baked building massing.
 * Each longitude looks out along one horizontal ray. A near wall hides farther walls. */
export function skylineReflection(buildings: VBuilding[], x: number, z: number, eyeY: number,
  groundAt: (x: number, z: number) => number | null) {
  const width = 128, height = 64;
  const pixels = new Uint8Array(width * height * 4);
  const walls = [];
  for (const building of buildings) {
    const ring = building.rings[0];
    if (!ring?.length || !building.h || ring.every(([px, pz]) => Math.hypot(px - x, pz - z) > 700)) continue;
    const base = groundAt(...ring[0]);
    if (base == null || !Number.isFinite(base)) continue;
    for (let i = 0; i < ring.length; i++) {
      const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length];
      walls.push({ x: ax - x, z: az - z, dx: bx - ax, dz: bz - az, base: base - eyeY, top: base + building.h - eyeY });
    }
  }
  const rowAt = (elevation: number, distance: number) =>
    Math.round(height * (0.5 + Math.atan2(elevation, distance) / Math.PI));
  for (let col = 0; col < width; col++) {
    const az = ((col + 0.5) / width - 0.5) * 2 * Math.PI;
    const rx = Math.cos(az), rz = Math.sin(az);
    for (let row = 0; row < height; row++) {
      const elevation = Math.sin(((row + 0.5) / height - 0.5) * Math.PI);
      const sky = elevation > 0;
      const t = Math.abs(elevation);
      const i = (row * width + col) * 4;
      // Cool overhead sky, pale horizon and muted street colour below the tower.
      pixels[i] = sky ? 220 - 115 * t : 185 - 77 * t;
      pixels[i + 1] = sky ? 234 - 67 * t : 201 - 86 * t;
      pixels[i + 2] = sky ? 243 - 23 * t : 211 - 88 * t;
      pixels[i + 3] = 255;
    }
    const hits = [];
    for (const wall of walls) {
      const cross = rx * wall.dz - rz * wall.dx;
      if (Math.abs(cross) < 1e-6) continue;
      const along = (wall.x * rz - wall.z * rx) / cross;
      const distance = (wall.x * wall.dz - wall.z * wall.dx) / cross;
      if (along < 0 || along > 1 || distance <= 1) continue;
      // Shade by the normal facing the probe, independent of footprint winding.
      const facing = Math.sign(cross) / Math.hypot(wall.dx, wall.dz);
      const shade = 0.5 + 0.5 * facing * (0.8 * wall.dz - 0.6 * wall.dx);
      hits.push({ distance, bottom: rowAt(wall.base, distance), top: rowAt(wall.top, distance), shade });
    }
    hits.sort((a, b) => b.distance - a.distance);
    for (const hit of hits) {
      for (let row = hit.bottom; row < hit.top; row++) {
        const i = (row * width + col) * 4;
        pixels[i] = 31 + 151 * hit.shade;
        pixels[i + 1] = 53 + 145 * hit.shade;
        pixels[i + 2] = 79 + 137 * hit.shade;
      }
    }
  }
  const texture = new THREE.DataTexture(pixels, width, height);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.needsUpdate = true;
  return texture;
}
