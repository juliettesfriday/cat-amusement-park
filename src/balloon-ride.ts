export const BALLOON_RIDE_PHASES = ['boarding', 'settling', 'ascending', 'floating', 'descending', 'disembarking'] as const;
export type BalloonPhase = 'ground' | typeof BALLOON_RIDE_PHASES[number];
const durations: Record<Exclude<BalloonPhase, 'ground'>, number> = {
  boarding: 1.25, settling: .65, ascending: 2.8, floating: 8, descending: 2.8, disembarking: 1.25,
};

/** Simulation time only: hidden tabs pause; reduced motion still completes the ride. */
export function createBalloonRide() {
  let phase: BalloonPhase = 'ground';
  let elapsed = 0;
  let duration = 1;
  return {
    get phase() { return phase; },
    get locked() { return phase !== 'ground'; },
    get progress() { return Math.min(1, elapsed / duration); },
    start(reducedMotion: boolean) {
      if (phase !== 'ground') return false;
      phase = 'boarding'; elapsed = 0; duration = reducedMotion ? .01 : durations.boarding;
      return true;
    },
    update(dt: number, reducedMotion: boolean) {
      if (phase === 'ground') return false;
      duration = reducedMotion && phase !== 'floating' ? .01 : durations[phase];
      elapsed += Math.max(0, dt);
      if (elapsed < duration) return false;
      const next = BALLOON_RIDE_PHASES.indexOf(phase) + 1;
      phase = next < BALLOON_RIDE_PHASES.length ? BALLOON_RIDE_PHASES[next] : 'ground';
      elapsed = 0;
      duration = phase === 'ground' ? 1 : reducedMotion && phase !== 'floating' ? .01 : durations[phase];
      return true;
    },
    reset() { phase = 'ground'; elapsed = 0; duration = 1; },
  };
}
