import test from 'node:test';
import assert from 'node:assert/strict';
import { createBalloonRide, BALLOON_RIDE_PHASES } from './src/balloon-ride.ts';

test('complete flight includes an eight-second seated hold and unlocks afterward', () => {
  const ride = createBalloonRide();
  assert.equal(ride.start(false), true);
  assert.equal(ride.start(false), false);
  const seen = [ride.phase];
  let floatingSeconds = 0;
  for (let i = 0; ride.locked && i < 2000; i++) {
    if (ride.phase === 'floating') floatingSeconds += .01;
    if (ride.update(.01, false)) seen.push(ride.phase);
  }
  assert.deepEqual(seen, [...BALLOON_RIDE_PHASES, 'ground']);
  assert.ok(floatingSeconds >= 8 && floatingSeconds < 8.1);
  assert.equal(ride.locked, false);
  assert.equal(ride.start(false), true);
});

test('reset is safe during every ride phase', () => {
  for (const target of BALLOON_RIDE_PHASES) {
    const ride = createBalloonRide();
    ride.start(false);
    for (let i = 0; ride.phase !== target && i < 2000; i++) ride.update(.01, false);
    assert.equal(ride.phase, target);
    ride.reset();
    assert.equal(ride.phase, 'ground');
    assert.equal(ride.progress, 0);
    assert.equal(ride.locked, false);
  }
});

test('enabling reduced motion mid-ride still completes and unlocks', () => {
  const ride = createBalloonRide();
  ride.start(false);
  ride.update(.3, false);
  for (let i = 0; ride.locked && i < 900; i++) ride.update(.01, true);
  assert.equal(ride.phase, 'ground');
  assert.equal(ride.locked, false);
});
