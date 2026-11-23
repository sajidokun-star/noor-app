/**
 * Pure compass mathematics for smooth 60fps Apple-style Qibla dial behavior.
 */

export function normalizeAngle(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  return ((deg % 360) + 360) % 360;
}

/**
 * Signed shortest angular difference from `fromDeg` to `toDeg` in (-180, 180].
 * Prevents 359° -> 1° wraparound jumps.
 */
export function shortestAngleDelta(fromDeg: number, toDeg: number): number {
  const from = normalizeAngle(fromDeg);
  const to = normalizeAngle(toDeg);
  let delta = ((to - from + 540) % 360) - 180;
  if (delta === -180) delta = 180;
  return delta;
}

/**
 * Low-pass shortest-angle interpolation step for 60fps requestAnimationFrame dial smoothing.
 */
export function stepSmoothedHeading(
  currentDeg: number,
  targetDeg: number,
  alpha: number = 0.22
): number {
  const clampedAlpha = Math.max(0.01, Math.min(1, alpha));
  const delta = shortestAngleDelta(currentDeg, targetDeg);
  if (Math.abs(delta) < 0.05) {
    return normalizeAngle(targetDeg);
  }
  return normalizeAngle(currentDeg + delta * clampedAlpha);
}

/**
 * Checks whether the current heading points within ±toleranceDeg (default ±2°) of Qibla.
 */
export function isQiblaAligned(
  headingDeg: number,
  qiblaBearingDeg: number,
  toleranceDeg: number = 2
): boolean {
  return Math.abs(shortestAngleDelta(headingDeg, qiblaBearingDeg)) <= toleranceDeg;
}

/**
 * Converts DeviceOrientationEvent beta/gamma tilt angles into constrained crosshair bubble offsets.
 */
export function clampTiltOffset(
  beta: number | null | undefined,
  gamma: number | null | undefined,
  maxRadiusPx: number = 14
): { x: number; y: number; levelOk: boolean } {
  const safeBeta = typeof beta === 'number' && Number.isFinite(beta) ? beta : 0;
  const safeGamma = typeof gamma === 'number' && Number.isFinite(gamma) ? gamma : 0;

  // Map +-30 degrees of tilt onto +-maxRadiusPx
  const rawX = (safeGamma / 30) * maxRadiusPx;
  const rawY = (safeBeta / 30) * maxRadiusPx;
  const mag = Math.hypot(rawX, rawY);

  if (mag > maxRadiusPx && mag > 0) {
    const scale = maxRadiusPx / mag;
    return {
      x: Number((rawX * scale).toFixed(2)),
      y: Number((rawY * scale).toFixed(2)),
      levelOk: false,
    };
  }

  const levelOk = Math.abs(safeBeta) <= 3.5 && Math.abs(safeGamma) <= 3.5;
  return {
    x: Number(rawX.toFixed(2)),
    y: Number(rawY.toFixed(2)),
    levelOk,
  };
}
