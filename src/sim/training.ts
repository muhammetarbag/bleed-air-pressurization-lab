import type { AircraftState } from "./types.ts";

/** Score actual states at physics substeps, independent of browser refresh rate. */
export function updateChallenge(s: AircraftState, dt: number): void {
  const run = s.challenge;
  if (!run?.active) return;
  const acceptedTime = Math.min(dt, Math.max(0, run.duration - run.elapsed));
  run.elapsed = Math.min(run.duration, run.elapsed + acceptedTime);
  const withinTarget =
    run.id === 0
      ? s.cabinAltitude < 9000 &&
        Math.abs(s.cabinRate) < 600 &&
        s.delta < s.controls.positiveLimit
      : run.id === 3
        ? s.cabinAltitude < 10000 && s.delta < s.controls.positiveLimit
        : run.id === 1
          ? s.zoneTemps.every((t) => t < 28)
          : s.ductFlow[1] < 0.01 && run.decision === "Sağ duct leak";
  if (withinTarget) run.good += acceptedTime;
  if (run.elapsed < run.duration - 1e-7) return;
  run.elapsed = run.duration;
  let score = (100 * run.good) / run.duration;
  if (run.id === 1)
    score = Math.max(
      0,
      Math.min(
        100,
        ((34 - s.zoneTemps.reduce((a, t) => a + t, 0) / 3) / 6) * 100,
      ),
    );
  if (run.id === 2)
    score = run.decision === "Sağ duct leak" && s.ductFlow[1] < 0.01 ? 100 : 0;
  if (run.id === 3) {
    const sufficient = s.cabinRate < 100 && s.cabinAltitude < 10000;
    score =
      score * 0.7 +
      (run.decision === (sufficient ? "Packler yetiyor" : "Packler yetmiyor")
        ? 30
        : 0);
  }
  run.score = Math.round(score);
  run.active = false;
}
