/**
 * Near plane for City's orbit camera.
 *
 * Depth precision at distance d is about d² / (near · 2^24) with a 24-bit buffer,
 * so the near plane, not the far one, decides whether a deck 12 cm above the
 * terrain z-fights. A fixed 20 m near plane gives ~0.4 m steps at the 12 km
 * full-board view. Scale the near plane with the orbit distance, but keep it
 * under half the camera's clearance over the tallest thing that could stand
 * below it (`skyline`: Bank of America Plaza's 312 m plus terrain relief), so no
 * tower is ever clipped. Close in, that clearance is gone and the near plane
 * stays at `minNear`, exactly as before.
 */
export function orbitNear(distance: number, heightAboveGround: number, minNear = 20, skyline = 350) {
  const near = Math.min(0.2 * distance, 0.5 * (heightAboveGround - skyline));
  return Number.isFinite(near) ? Math.max(minNear, near) : minNear;
}
