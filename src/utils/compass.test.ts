import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampTiltOffset,
  isQiblaAligned,
  normalizeAngle,
  shortestAngleDelta,
  stepSmoothedHeading,
} from './compass';

test('normalizeAngle wraps negative and >=360 angles cleanly', () => {
  assert.equal(normalizeAngle(-10), 350);
  assert.equal(normalizeAngle(360), 0);
  assert.equal(normalizeAngle(725), 5);
});

test('shortestAngleDelta avoids 359 -> 1 degree wraparound spin', () => {
  assert.equal(shortestAngleDelta(359, 1), 2);
  assert.equal(shortestAngleDelta(1, 359), -2);
  assert.equal(shortestAngleDelta(270, 90), 180);
  assert.equal(shortestAngleDelta(10, 10), 0);
});

test('stepSmoothedHeading interpolates smoothly across 0/360 boundary', () => {
  const next = stepSmoothedHeading(358, 2, 0.25); // delta = +4 -> +1 => 359
  assert.equal(next, 359);

  const back = stepSmoothedHeading(2, 358, 0.25); // delta = -4 -> -1 => 1
  assert.equal(back, 1);

  const snapped = stepSmoothedHeading(277.59, 277.6, 0.2);
  assert.equal(snapped, 277.6);
});

test('isQiblaAligned matches within +-2 degrees including 360 wraparound', () => {
  assert.equal(isQiblaAligned(278, 277.6, 2), true);
  assert.equal(isQiblaAligned(275.7, 277.6, 2), true);
  assert.equal(isQiblaAligned(275.0, 277.6, 2), false);
  assert.equal(isQiblaAligned(359, 0.5, 2), true);
});

test('clampTiltOffset bounds level bubble radius and reports level state', () => {
  const level = clampTiltOffset(1.5, -2, 14);
  assert.equal(level.levelOk, true);
  assert.ok(Math.hypot(level.x, level.y) <= 14);

  const tilted = clampTiltOffset(80, -80, 14);
  assert.equal(tilted.levelOk, false);
  assert.ok(Math.hypot(tilted.x, tilted.y) <= 14.01);
});
