import test from "node:test";
import assert from "node:assert/strict";
import {
  advance,
  altitudeAtPressure,
  clearFaults,
  createState,
  indicated,
  orifice,
  pressureAtAltitude,
  PSI,
  setControl,
  setFault,
  startFlight,
  trace,
  why,
} from "../src/sim/engine.ts";
import { faults } from "../src/sim/catalog.ts";
import {
  cases,
  challenges,
  challengeSetup,
  components,
  labs,
  loadCase,
  predictions,
  questions,
  sections,
} from "../src/content.ts";
import type { AircraftState } from "../src/sim/types.ts";
const near = (a: number, b: number, tolerance = 0.001) =>
  assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b} ± ${tolerance}`);
function finite(s: AircraftState): void {
  const visit = (v: unknown, path: string): void => {
    if (typeof v === "number") assert.ok(Number.isFinite(v), path);
    else if (v && typeof v === "object")
      Object.entries(v).forEach(([k, x]) => visit(x, `${path}.${k}`));
  };
  visit(s, "state");
  assert.ok(s.cabinPressure > 0);
  assert.ok(s.sources.every((x) => x.flow >= -1e-10));
  assert.ok(s.packs.every((x) => x.flow >= 0));
}
function conservation(s: AircraftState): void {
  near(
    s.sources.reduce((a, x) => a + x.flow, 0),
    s.supplied[0] + s.supplied[1],
    1e-6,
  );
  near(s.inflow, s.packs[0].flow + s.packs[1].flow);
  near(
    s.netFlow,
    s.inflow - s.outflow - s.leakFlow - s.positiveFlow + s.negativeFlow,
    1e-7,
  );
}
for (const altitude of [-1000, 0, 10000, 20000, 30000, 36089, 40000, 43000])
  test(`Atmosphere round trip ${altitude} ft`, () =>
    near(altitudeAtPressure(pressureAtAltitude(altitude)), altitude, 0.03));
test("Atmosphere decreases monotonically and matches sea-level / 35k references", () => {
  near(pressureAtAltitude(0), 101325);
  assert.ok(
    pressureAtAltitude(35000) > 23800 && pressureAtAltitude(35000) < 23900,
  );
  for (let a = 0; a < 43000; a += 500)
    assert.ok(pressureAtAltitude(a + 500) < pressureAtAltitude(a));
  near(
    pressureAtAltitude(11000 / 0.3048 - 0.01),
    pressureAtAltitude(11000 / 0.3048 + 0.01),
    0.1,
  );
});
test("Compressible orifice is directional, area proportional and choked", () => {
  near(orifice(80000, 30000, 0.01), -orifice(30000, 80000, 0.01));
  near(orifice(80000, 30000, 0.02), 2 * orifice(80000, 30000, 0.01));
  near(orifice(80000, 30000, 0.01), orifice(80000, 15000, 0.01));
  near(orifice(80000, 80000, 0.01), 0);
  near(orifice(80000, 30000, 0), 0);
});
test("Normal warm start has two independent packs and balanced mass", () => {
  const s = createState();
  assert.ok(s.packs.every((p) => p.status === "NORMAL" && p.flow > 0.6));
  near(s.crossflow, 0);
  assert.ok(Math.abs(s.cabinAltitude) < 100);
  near(s.netFlow, 0, 1e-7);
  advance(s, 5);
  assert.ok(Math.abs(s.cabinRate) < 1);
  conservation(s);
});
test("Cold ground has no pneumatic flow or false trace", () => {
  const s = createState("ground");
  advance(s, 30);
  assert.ok(s.sources.every((x) => x.flow === 0));
  assert.ok(s.packs.every((x) => x.flow === 0));
  assert.deepEqual(trace(s, "cabin"), []);
  near(s.cabinAltitude, 0);
});
test("RPM affects pressure, temperature and finite capacity", () => {
  const low = createState(),
    high = createState();
  low.controls.engine = [30, 30];
  high.controls.engine = [100, 100];
  advance(low, 25);
  advance(high, 25);
  assert.ok(high.sources[0].pressure > low.sources[0].pressure);
  assert.ok(high.sources[0].temperature > low.sources[0].temperature);
  assert.ok(high.sources[0].capacity > low.sources[0].capacity);
});
test("Closed bleed valve cuts source flow and downstream side", () => {
  const s = createState();
  s.controls.bleed[0] = false;
  advance(s, 4);
  near(s.sources[0].flow, 0);
  near(s.packs[0].flow, 0);
  assert.ok(s.packs[1].flow > 0.5);
  assert.deepEqual(trace(s, "pack1"), []);
});
test("Check valve rejects weaker source against stronger bus", () => {
  const s = createState();
  s.controls.engine = [30, 100];
  s.controls.isolation = true;
  s.controls.pack = ["OFF", "OFF"];
  s.controls.antiIce = true;
  advance(s, 15);
  near(s.sources[0].flow, 0, 1e-7);
  assert.equal(s.sources[0].checkOpen, false);
  assert.ok(s.sources[1].flow > 0);
  conservation(s);
});
test("APU needs master, start, RPM and bleed; crossbleed supplies both packs", () => {
  const s = createState("ground");
  s.controls.apuBleed = true;
  s.controls.isolation = true;
  advance(s, 20);
  near(s.inflow, 0);
  s.controls.apuMaster = true;
  s.controls.apuStart = true;
  advance(s, 5);
  near(s.inflow, 0);
  advance(s, 12);
  assert.ok(s.packs.every((p) => p.flow > 0.6));
  assert.ok(s.sources[2].flow > 1.2);
  assert.ok(trace(s, "pack2")[0].includes("ISOLATION"));
});
test("APU altitude and ground cart availability limits are effective", () => {
  const s = createState("cruise");
  s.controls.engine = [0, 0];
  s.controls.apuMaster =
    s.controls.apuStart =
    s.controls.apuBleed =
    s.controls.groundCart =
      true;
  advance(s, 30);
  near(s.inflow, 0);
  assert.equal(s.sources[2].available, false);
  const ground = createState("ground");
  ground.controls.groundCart = true;
  ground.controls.isolation = true;
  advance(ground, 5);
  assert.ok(ground.inflow > 1.2);
});
test("Source loss with open isolation gives right-to-left valid path", () => {
  const s = createState();
  setFault(s, "bleed_fail_0", true);
  s.controls.isolation = true;
  advance(s, 8);
  assert.ok(s.crossflow < -0.5);
  assert.ok(s.packs.every((p) => p.flow > 0.5));
  assert.deepEqual(trace(s, "pack1"), [
    [
      "ENG 2",
      "CHECK VALVE",
      "RIGHT MANIFOLD",
      "ISOLATION",
      "LEFT MANIFOLD",
      "PACK 1",
    ],
  ]);
  conservation(s);
});
test("Isolation stuck closed blocks alternate feed", () => {
  const s = createState();
  setFault(s, "bleed_fail_0", true);
  setFault(s, "iso_closed", true);
  s.controls.isolation = true;
  advance(s, 10);
  near(s.packs[0].flow, 0);
  assert.ok(s.packs[1].flow > 0.5);
});
test("Isolation stuck open ignores close command", () => {
  const s = createState();
  setFault(s, "iso_open", true);
  advance(s, 3);
  near(s.isolation, 1);
  near(s.isolationCommand, 0);
});
test("Demand reduces bus pressure and caps actual flow", () => {
  const s = createState();
  s.controls.engine = [30, 0];
  s.controls.isolation = true;
  advance(s, 10);
  const low = s.manifold[0];
  s.controls.pack = ["HIGH", "HIGH"];
  s.controls.demand = 2;
  s.controls.antiIce = true;
  advance(s, 10);
  assert.ok(s.manifold[0] < low);
  assert.ok(s.packs.every((p) => p.flow < p.demand * 0.85));
  assert.ok(s.sources[0].flow <= s.sources[0].capacity);
  conservation(s);
});
test("Pack valve and OFF modes stop pack flow", () => {
  const s = createState();
  s.controls.packValve[0] = false;
  s.controls.pack[1] = "OFF";
  advance(s, 5);
  near(s.inflow, 0);
  assert.ok(s.manifold.every((p) => p > 30));
});
test("Precooler cooling and fan-air authority are causal", () => {
  const a = createState(),
    b = createState();
  a.controls.cooling[0] = 0.95;
  b.controls.cooling[0] = 0.55;
  advance(a, 10);
  advance(b, 10);
  assert.ok(a.sources[0].regulatedTemp < b.sources[0].regulatedTemp);
  b.controls.fanAir[0] = 0;
  advance(b, 20);
  assert.ok(b.sources[0].protected);
  near(b.sources[0].flow, 0);
});
test("Precooler failure heats then protects and removes pack supply", () => {
  const s = createState();
  setFault(s, "precooler_0", true);
  advance(s, 20);
  assert.ok(s.sources[0].protected);
  near(s.packs[0].flow, 0);
  assert.ok(s.events.some((e) => e.text.includes("OVERTEMP")));
});
test("Duct leak detector develops thermally before source shutdown", () => {
  const s = createState();
  setFault(s, "duct_leak_0", true);
  advance(s, 0.1);
  assert.ok(!s.sources[0].protected && s.ductFlow[0] > 0);
  advance(s, 15);
  assert.ok(s.sources[0].protected);
  near(s.isolation, 0);
  near(s.packs[0].flow, 0);
  assert.ok(s.events.some((e) => e.text.includes("DUCT LEAK DETECTED")));
});
test("Stuck-open isolation carries bleed leak cross-load", () => {
  const s = createState();
  setFault(s, "iso_open", true);
  setFault(s, "duct_leak_0", true);
  advance(s, 20);
  assert.ok(s.isolation > 0.99);
  assert.ok(s.crossflow < 0);
  assert.ok(s.ductFlow[0] > 0.1);
  assert.ok(s.sources[1].flow > 0.65);
});
test("Pack cycle increases temperature in compressor and reduces it in turbine", () => {
  const s = createState();
  const p = s.packs[0];
  assert.ok(p.stages[2].temperature > p.stages[1].temperature);
  assert.ok(p.stages[2].pressure > p.stages[1].pressure);
  assert.ok(p.stages[4].temperature < p.stages[3].temperature);
  assert.ok(p.rpm > 0);
});
test("Ram cooling reduces cold-end temperature; ground fan matters", () => {
  const warm = createState(),
    cold = createState();
  warm.controls.coolingFan = false;
  warm.controls.ramDoor = 0.1;
  advance(warm, 2);
  advance(cold, 2);
  assert.ok(cold.packs[0].coldTemp < warm.packs[0].coldTemp - 10);
  const flight = createState();
  flight.controls.ground = false;
  flight.controls.airspeed = 450;
  advance(flight, 2);
  assert.ok(flight.packs[0].ram > cold.packs[0].ram);
});
test("ACM compressor and turbine failures have different stages", () => {
  const a = createState(),
    b = createState();
  setFault(a, "compressor_0", true);
  setFault(b, "turbine_0", true);
  advance(a, 5);
  advance(b, 5);
  near(a.packs[0].stages[1].pressure, a.packs[0].stages[2].pressure);
  assert.ok(a.packs[0].coldTemp < b.packs[0].coldTemp);
  assert.ok(a.packs[0].outletTemp < b.packs[0].outletTemp);
});
test("Pack overheat protection cuts actual flow even with a stuck pack valve", () => {
  const s = createState();
  setFault(s, "pack_overheat_0", true);
  setFault(s, "pack_open_0", true);
  advance(s, 25);
  assert.ok(s.packs[0].trip);
  near(s.packs[0].flow, 0);
  near(s.packs[0].valve, 1);
});
test("Pack stuck open continues flow against OFF command", () => {
  const s = createState();
  s.controls.pack[0] = "OFF";
  setFault(s, "pack_open_0", true);
  advance(s, 5);
  assert.ok(s.packs[0].flow > 0.5);
});
test("Recirculation off raises fresh demand without being fresh mass itself", () => {
  const s = createState();
  const demand = s.demand[0] + s.demand[1];
  s.controls.recirc = [false, false];
  advance(s, 5);
  near(s.recircFlow, 0);
  assert.ok(s.demand[0] + s.demand[1] > demand * 1.3);
  near(s.inflow, s.packs[0].flow + s.packs[1].flow);
});
test("Thermal state integrates gradually and passenger load is causal", () => {
  const a = createState(),
    b = createState();
  a.zoneTemps = [34, 34, 34];
  b.zoneTemps = [34, 34, 34];
  a.controls.passengers = 0;
  b.controls.passengers = 220;
  advance(a, 0.1);
  assert.ok(a.zoneTemps[1] < 34 && a.zoneTemps[1] > 33.9);
  advance(a, 300);
  advance(b, 300);
  assert.ok(a.zoneTemps[1] < b.zoneTemps[1]);
  assert.ok(a.zoneTemps[1] < 32);
});
test("Zone target changes supply and long-run zone temperature", () => {
  const s = createState();
  s.controls.zoneTarget = [18, 22, 28];
  advance(s, 600);
  assert.ok(s.zoneSupply[2] > s.zoneSupply[0]);
  assert.ok(s.zoneTemps[2] > s.zoneTemps[0]);
});
test("Manual outflow controls pressure in correct direction", () => {
  const a = createState("cruise"),
    b = createState("cruise");
  a.controls.pressureMode = b.controls.pressureMode = "MANUAL";
  a.controls.manualOutflow = 0.1;
  b.controls.manualOutflow = 0.8;
  advance(a, 15);
  advance(b, 15);
  assert.ok(a.cabinPressure > b.cabinPressure);
  assert.ok(a.cabinAltitude < b.cabinAltitude);
  assert.ok(a.netFlow > 0);
  assert.ok(b.netFlow < 0);
});
test("Cabin pressure integration conserves mass and derives altitude and delta", () => {
  const s = createState("cruise");
  const p = s.cabinPressure;
  advance(s, 0.1);
  near(
    s.cabinPressure - p,
    ((287.05 * 295) / s.controls.cabinVolume) * s.netFlow * 0.1,
    1e-7,
  );
  near(s.cabinAltitude, altitudeAtPressure(s.cabinPressure));
  near(s.delta, (s.cabinPressure - s.outsidePressure) / PSI);
  conservation(s);
});
test("AUTO maintains cruise and responds to landing elevation / schedule", () => {
  const s = createState("cruise");
  advance(s, 180);
  assert.ok(Math.abs(s.cabinAltitude - 8000) < 10);
  assert.ok(Math.abs(s.cabinRate) < 10);
  s.controls.cabinSchedule = 6500;
  advance(s, 240);
  assert.ok(s.cabinAltitude < 6600);
});
test("Full normal flight covers all phases and comfort schedule", () => {
  const s = createState();
  startFlight(s);
  let peakRate = 0,
    maxDelta = 0,
    maxCabin = 0;
  const phases = new Set<string>();
  for (let n = 0; n < 4000; n++) {
    advance(s, 1);
    phases.add(s.phase);
    peakRate = Math.max(peakRate, Math.abs(s.cabinRate));
    maxDelta = Math.max(maxDelta, s.delta);
    maxCabin = Math.max(maxCabin, s.cabinAltitude);
    if (!s.flightRunning) break;
  }
  assert.deepEqual(
    [...phases],
    ["TAKEOFF", "CLIMB", "CRUISE", "DESCENT", "LANDING", "GROUND"],
  );
  assert.ok(maxCabin >= 7900 && maxCabin < 8100);
  assert.ok(peakRate < 550, `peak ${peakRate}`);
  assert.ok(maxDelta < 8);
  assert.ok(Math.abs(s.delta) < 0.1);
  assert.ok(s.history.length <= 1200);
});
for (const [departure, destination, altitude] of [
  [2500, 5000, 35000],
  [7000, 1000, 43000],
  [0, 7000, 20000],
])
  test(`Flight matrix ${departure} → ${destination} at ${altitude}`, () => {
    const s = createState();
    Object.assign(s.controls, {
      departure,
      landingElevation: destination,
      cruiseAltitude: altitude,
      cruiseMinutes: 0.5,
    });
    startFlight(s);
    advance(s, 3600);
    assert.equal(s.flightRunning, false);
    near(s.altitude, destination);
    assert.ok(Math.abs(s.delta) < 0.12);
    finite(s);
  });
test("Positive relief prevents unlimited overpressure", () => {
  const s = createState("cruise");
  setFault(s, "outflow_closed", true);
  advance(s, 300);
  assert.ok(s.positiveFlow > 0.5);
  assert.ok(
    s.delta > s.controls.positiveLimit &&
      s.delta < s.controls.positiveLimit + 0.15,
  );
  near(s.outflow, 0);
});
test("Negative relief opens inward only with negative delta", () => {
  const s = createState("cruise");
  s.cabinPressure = pressureAtAltitude(43000);
  s.controls.pressureMode = "MANUAL";
  s.controls.manualOutflow = 0;
  s.outflowPosition = 0;
  advance(s, 0.1);
  assert.ok(s.negativeFlow > 0);
  near(s.positiveFlow, 0);
  assert.ok(s.netFlow > 0);
  advance(s, 15);
  assert.ok(s.delta > -s.controls.negativeLimit - 0.15);
});
test("Larger cabin volume slows pressure change", () => {
  const small = createState("cruise"),
    large = createState("cruise");
  small.controls.cabinVolume = 100;
  large.controls.cabinVolume = 600;
  for (const s of [small, large]) {
    s.controls.pressureMode = "MANUAL";
    s.controls.manualOutflow = 0;
    s.outflowPosition = 0;
    advance(s, 3);
  }
  assert.ok(small.cabinPressure > large.cabinPressure);
});
test("Leak magnitude produces different decompression rates", () => {
  const slow = createState("cruise"),
    rapid = createState("cruise");
  setFault(slow, "cabin_leak", true);
  setFault(rapid, "rapid_leak", true);
  advance(slow, 15);
  advance(rapid, 15);
  assert.ok(rapid.cabinAltitude > slow.cabinAltitude + 2000);
  assert.ok(rapid.leakFlow > slow.leakFlow);
});
test("Dual pack loss gradually loses pressure through remaining leaks", () => {
  const s = createState("cruise");
  setFault(s, "pack_closed_0", true);
  setFault(s, "pack_closed_1", true);
  advance(s, 600);
  near(s.inflow, 0);
  assert.ok(s.cabinAltitude > 8000);
  assert.ok(s.leakFlow > 0);
});
test("Actuator freeze and position sensor fault are distinct", () => {
  const stuck = createState("cruise"),
    sensor = createState("cruise");
  setFault(stuck, "outflow_actuator", true);
  setFault(sensor, "outflow_sensor", true);
  const initial = stuck.outflowPosition;
  for (const s of [stuck, sensor]) {
    s.controls.pressureMode = "MANUAL";
    s.controls.manualOutflow = 0.8;
    advance(s, 10);
  }
  near(stuck.outflowPosition, initial);
  near(sensor.outflowPosition, 0.8);
  near(indicated(sensor, "outflow")!, 0.73);
});
test("Controller fault freezes AUTO but allows MANUAL", () => {
  const s = createState("cruise");
  setFault(s, "auto_fail", true);
  const cmd = s.outflowCommand;
  s.controls.cabinSchedule = 6000;
  advance(s, 15);
  near(s.outflowCommand, cmd);
  s.controls.pressureMode = "MANUAL";
  s.controls.manualOutflow = 0.1;
  advance(s, 10);
  near(s.outflowPosition, 0.1);
});
test("Cabin sensor faults change indications without changing actual pressure", () => {
  const a = createState("cruise"),
    b = createState("cruise");
  for (const id of [
    "cabin_pressure_sensor",
    "cabin_alt_sensor",
    "delta_sensor",
  ])
    setFault(b, id, true);
  advance(a, 30);
  advance(b, 30);
  near(a.cabinPressure, b.cabinPressure);
  assert.equal(indicated(b, "cabinPressure"), null);
  near(indicated(b, "cabinAltitude")!, b.cabinAltitude + 4000);
  near(indicated(b, "delta")!, b.delta + 2);
});
test("Pack sensors distinguish actual flow and biased temperature control", () => {
  const s = createState();
  setFault(s, "pack_flow_sensor_0", true);
  setFault(s, "pack_temp_sensor_0", true);
  advance(s, 15);
  assert.ok(s.packs[0].flow > 0.5);
  near(indicated(s, "packFlow", 0)!, 0);
  near(indicated(s, "packTemp", 0)!, s.packs[0].outletTemp + 18);
  assert.ok(s.packs[0].outletTemp < s.packs[1].outletTemp);
});
test("Fault mutual exclusions, clear, reset and event records work", () => {
  const s = createState();
  setFault(s, "iso_open", true);
  setFault(s, "iso_closed", true);
  assert.ok(!s.faults.includes("iso_open"));
  setFault(s, "pack_open_0", true);
  setFault(s, "pack_closed_0", true);
  assert.ok(!s.faults.includes("pack_open_0"));
  clearFaults(s);
  assert.deepEqual(s.faults, []);
  assert.ok(s.events.some((e) => e.text.includes("yeniden kuruldu")));
  assert.equal(createState().time, 0);
});
test("Pause/no time is deterministic; substeps are reproducible", () => {
  const a = createState("cruise"),
    b = createState("cruise");
  const initial = structuredClone(a);
  advance(a, 0);
  assert.deepEqual(a, initial);
  advance(a, 10);
  for (let i = 0; i < 100; i++) advance(b, 0.1);
  near(a.cabinPressure, b.cabinPressure, 1e-7);
  near(a.zoneTemps[0], b.zoneTemps[0], 1e-7);
});
test("Extreme public numeric controls remain finite", () => {
  const s = createState();
  setControl(s, "engine", [NaN, Infinity]);
  setControl(s, "manualOutflow", Infinity);
  setControl(s, "leakArea", NaN);
  setControl(s, "cabinVolume", 0);
  setControl(s, "positiveLimit", 99);
  setControl(s, "altitudeTarget", Infinity);
  advance(s, 60);
  finite(s);
  near(s.controls.cabinVolume, 100);
  assert.ok(s.outflowPosition >= 0 && s.outflowPosition <= 1);
});
for (const item of faults)
  test(`Fault robustness: ${item.id}`, () => {
    const s = createState("cruise");
    setFault(s, item.id, true);
    advance(s, 40);
    finite(s);
    conservation(s);
    assert.ok(s.events.length > 1);
  });
test("Combined extreme failures and max leak stay bounded", () => {
  const s = createState("cruise");
  for (const item of faults) setFault(s, item.id, true);
  s.controls.leakArea = 500;
  s.controls.engine = [100, 100];
  s.controls.demand = 2;
  s.controls.positiveLimit = 5;
  s.controls.altitudeTarget = 0;
  s.controls.verticalSpeed = 10000;
  advance(s, 300);
  finite(s);
  assert.ok(s.cabinPressure < 130000);
  assert.ok(s.cabinPressure > 7000);
});
test("Education counts and complete content are validated", () => {
  assert.equal(sections.length, 16);
  assert.ok(labs.length >= 15);
  assert.ok(cases.length >= 12);
  assert.ok(questions.length >= 40);
  assert.equal(components.length, 20);
  assert.equal(challenges.length, 4);
  assert.equal(new Set(faults.map((f) => f.id)).size, faults.length);
  for (const q of questions) {
    assert.ok(
      q.options.length >= 3 && q.correct >= 0 && q.correct < q.options.length,
    );
    assert.ok(q.explanation.length > 30);
  }
  for (const c of components) {
    assert.equal(c.length, 7);
    c.forEach((v) => assert.ok(v.length > 3));
  }
});
for (let i = 0; i < cases.length; i++)
  test(`Case ${i + 1}: evidence backed by actual fault`, () => {
    const s = loadCase(i);
    finite(s);
    assert.ok(cases[i].fault === "none" || s.faults.includes(cases[i].fault));
    assert.ok(s.events.every((e) => !e.text.startsWith("Arıza eklendi")));
    assert.ok(why(s, "cabin").includes("kg/s"));
  });
for (let i = 0; i < predictions.length; i++)
  test(`Prediction ${i + 1} runs the real engine`, () => {
    const s = predictions[i].setup();
    advance(s, 20);
    assert.ok(predictions[i].result(s).length > 20);
    finite(s);
  });
const actions: ((s: AircraftState) => void)[] = [
  (s) => {
    s.controls.engine = [65, 65];
    s.controls.bleed = [true, true];
    advance(s, 20);
  },
  (s) => {
    s.controls.apuMaster =
      s.controls.apuStart =
      s.controls.apuBleed =
      s.controls.isolation =
        true;
    advance(s, 20);
  },
  (s) => {
    s.controls.isolation = true;
    advance(s, 10);
  },
  (s) => {
    s.controls.isolation = false;
    advance(s, 5);
  },
  (s) => {
    s.controls.ramDoor = 1;
    s.controls.coolingFan = true;
    advance(s, 1);
  },
  (s) => {
    s.controls.ground = false;
    s.controls.airspeed = 250;
    advance(s, 1);
  },
  (s) => {
    s.controls.recirc = [false, false];
    advance(s, 1);
  },
  (s) => advance(s, 600),
  (s) => {
    startFlight(s);
    advance(s, 3300);
  },
  (s) => {
    s.controls.manualOutflow = 0.376;
    advance(s, 31);
  },
  (s) => {
    setFault(s, "pack_closed_0", true);
    advance(s, 5);
  },
  (s) => {
    setFault(s, "duct_leak_0", true);
    advance(s, 15);
  },
  (s) => {
    setFault(s, "outflow_open", true);
    advance(s, 10);
  },
  (s) => {
    setFault(s, "outflow_closed", true);
    advance(s, 300);
  },
  (s) => {
    s.controls.leakArea = 150;
    advance(s, 10);
  },
];
for (let i = 0; i < labs.length; i++)
  test(`Guided lab ${i + 1} is reachable using controls`, () => {
    const s = labs[i].setup(),
      baseline = structuredClone(s);
    actions[i](s);
    assert.ok(
      labs[i].success(s, baseline),
      `${labs[i].title}: cabin ${s.cabinAltitude}, rate ${s.cabinRate}, temps ${s.zoneTemps}`,
    );
    finite(s);
  });
test("Hot cabin challenge can be solved using APU, single pack and airflow", () => {
  const s = challengeSetup(1);
  Object.assign(s.controls, {
    apuMaster: true,
    apuStart: true,
    apuBleed: true,
    isolation: true,
    coolingFan: true,
    ramDoor: 1,
    demand: 1.8,
    pack: ["AUTO", "HIGH"],
    targetTemp: 18,
    zoneTarget: [18, 18, 18],
  });
  advance(s, 600);
  assert.ok(
    s.zoneTemps.every((t) => t < 28),
    `temps ${s.zoneTemps}`,
  );
});

test("Warm initialization publishes consistent zone flow before first step", () => {
  const s = createState("cruise");
  near(
    s.zoneFlows.reduce((a, b) => a + b, 0),
    s.totalFlow,
  );
  assert.ok(s.zoneFlows.every((q) => q > 0));
});
test("Manual environment controls cancel a running flight profile", () => {
  const s = createState();
  startFlight(s);
  setControl(s, "altitudeTarget", 12000);
  assert.equal(s.flightRunning, false);
  advance(s, 1);
  assert.ok(s.altitude > 0);
});

test("Growing leak challenge is invariant to browser batch size", () => {
  const a = challengeSetup(3),
    b = challengeSetup(3);
  for (const state of [a, b]) {
    state.challenge!.decision = "Packler yetmiyor";
  }
  for (let i = 0; i < 60; i++) advance(a, 3);
  for (let i = 0; i < 1800; i++) advance(b, 0.1);
  near(a.cabinPressure, b.cabinPressure, 0.001);
  near(a.controls.leakArea, 100);
  near(a.challenge!.elapsed, 180);
  assert.equal(a.challenge!.score, b.challenge!.score);
  assert.equal(a.challenge!.active, false);
});
test("Challenge end is an exact simulation time boundary", () => {
  const s = challengeSetup(0);
  advance(s, 119);
  advance(s, 30);
  near(s.time, 120, 1e-7);
  assert.equal(s.challenge!.active, false);
  assert.ok(s.challenge!.score !== null);
});
