/**
 * Low tier's shadow re-centre step: grows with the orbit (0.15 x, at least `baseM`) so a far view
 * doesn't re-centre many times a second while panning, but never beyond a quarter of the shadow box,
 * so with the 0.6 hysteresis the camera target always stays well inside the box (#534, #570).
 */
export function shadowStepM(orbitM: number, baseM: number, boxM: number) {
  return Math.min(boxM / 4, Math.max(baseM, 0.15 * orbitM));
}
