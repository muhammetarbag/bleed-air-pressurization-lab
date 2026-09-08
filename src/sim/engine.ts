import type { AircraftState, Controls, Pack, Sample, Source } from "./types.ts";
import { updateChallenge } from "./training.ts";
import { faultIds, faultLabel } from "./catalog.ts";
export const PSI = 6894.757;
const R = 287.05,
  TK = 295,
  GAMMA = 1.4;
export function clamp(v: number, lo: number, hi: number): number {
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo;
}
const move = (v: number, target: number, rate: number, dt: number) =>
  v + clamp(target - v, -rate * dt, rate * dt);
const lag = (v: number, target: number, tau: number, dt: number) =>
  v + (target - v) * (1 - Math.exp(-dt / tau));
export function pressureAtAltitude(feet: number): number {
  const h = clamp(feet, -2000, 60000) * 0.3048;
  return h <= 11000
    ? 101325 * Math.pow(1 - (0.0065 * h) / 288.15, 5.25588)
    : 22632.06 * Math.exp(-(h - 11000) / 6341.62);
}
export function altitudeAtPressure(p: number): number {
  p = clamp(p, 7000, 130000);
  return (
    (p >= 22632.06
      ? (288.15 / 0.0065) * (1 - Math.pow(p / 101325, 1 / 5.25588))
      : 11000 - 6341.62 * Math.log(p / 22632.06)) / 0.3048
  );
}
/** Signed compressible orifice flow, kg/s. Positive is a -> b. */
export function orifice(a: number, b: number, area: number, temp = TK): number {
  if (area <= 0 || Math.abs(a - b) < 0.001) return 0;
  const high = Math.max(a, b),
    low = Math.max(1, Math.min(a, b)),
    ratio = low / high;
  const critical = Math.pow(2 / (GAMMA + 1), GAMMA / (GAMMA - 1));
  const factor =
    ratio <= critical
      ? Math.sqrt(GAMMA) *
        Math.pow(2 / (GAMMA + 1), (GAMMA + 1) / (2 * (GAMMA - 1)))
      : Math.sqrt(
          Math.max(
            0,
            ((2 * GAMMA) / (GAMMA - 1)) *
              (Math.pow(ratio, 2 / GAMMA) -
                Math.pow(ratio, (GAMMA + 1) / GAMMA)),
          ),
        );
  return (
    ((Math.sign(a - b) * 0.68 * area * high) /
      Math.sqrt(R * Math.max(180, temp))) *
    factor
  );
}
export const defaults = (): Controls => ({
  engine: [65, 65],
  bleed: [true, true],
  cooling: [0.85, 0.85],
  fanAir: [1, 1],
  hotBias: 0,
  apuMaster: false,
  apuStart: false,
  apuBleed: false,
  groundCart: false,
  isolation: false,
  pack: ["AUTO", "AUTO"],
  packValve: [true, true],
  demand: 1,
  antiIce: false,
  starter: false,
  ramDoor: 1,
  coolingFan: true,
  airspeed: 0,
  recirc: [true, true],
  targetTemp: 22,
  zoneTarget: [22, 22, 22],
  passengers: 140,
  solar: 2,
  ground: true,
  altitudeTarget: 0,
  verticalSpeed: 1800,
  oatOffset: 10,
  pressureMode: "AUTO",
  manualOutflow: 0.5,
  cabinSchedule: 8000,
  landingElevation: 0,
  cabinRateLimit: 500,
  positiveLimit: 8.5,
  negativeLimit: 0.3,
  leakArea: 0,
  cabinVolume: 280,
  departure: 0,
  cruiseAltitude: 35000,
  climbRate: 1800,
  descentRate: 1600,
  cruiseMinutes: 5,
});
const newSource = (name: string): Source => ({
  name,
  rpm: 0,
  available: false,
  pressure: 0,
  temperature: 25,
  regulatedPressure: 0,
  regulatedTemp: 25,
  capacity: 0,
  flow: 0,
  valve: 0,
  command: 0,
  protected: false,
  ductTemp: 25,
  checkOpen: false,
});
const newPack = (): Pack => ({
  valve: 0,
  flow: 0,
  demand: 0,
  inletPressure: 0,
  inletTemp: 25,
  outletTemp: 25,
  coldTemp: 25,
  rpm: 0,
  cooling: 0,
  ram: 0,
  status: "PACK OFF",
  stages: [],
  trip: false,
});
export function createState(
  preset: "normal" | "ground" | "cruise" = "normal",
): AircraftState {
  const controls = defaults();
  if (preset === "ground") {
    controls.engine = [0, 0];
    controls.bleed = [false, false];
  }
  if (preset === "cruise") {
    controls.ground = false;
    controls.altitudeTarget = 35000;
    controls.airspeed = 450;
    controls.engine = [80, 80];
  }
  const cabin = preset === "cruise" ? 8000 : 0,
    alt = preset === "cruise" ? 35000 : 0;
  const s: AircraftState = {
    challenge: null,
    time: 0,
    controls,
    faults: [],
    sources: [
      newSource("ENG 1"),
      newSource("ENG 2"),
      newSource("APU"),
      newSource("GROUND AIR"),
    ],
    packs: [newPack(), newPack()],
    manifold: [0, 0],
    manifoldTemp: [25, 25],
    capacity: [0, 0],
    demand: [0, 0],
    supplied: [0, 0],
    crossflow: 0,
    isolation: 0,
    isolationCommand: 0,
    otherFlow: [0, 0],
    ductFlow: [0, 0],
    altitude: alt,
    aircraftRate: 0,
    phase: preset === "cruise" ? "CRUISE" : "GROUND",
    flightRunning: false,
    phaseTime: 0,
    flightElapsed: 0,
    cabinPressure: pressureAtAltitude(cabin),
    cabinAltitude: cabin,
    outsidePressure: pressureAtAltitude(alt),
    outsideTemp: 25,
    delta: 0,
    cabinRate: 0,
    referenceAltitude: cabin,
    outflowCommand: preset === "cruise" ? 0.45 : 1,
    outflowPosition: preset === "cruise" ? 0.45 : 1,
    inflow: 0,
    outflow: 0,
    leakFlow: 0,
    positiveFlow: 0,
    negativeFlow: 0,
    netFlow: 0,
    zoneTemps: [25, 26, 26],
    zoneSupply: [22, 22, 22],
    zoneFlows: [0, 0, 0],
    mixTemp: 25,
    recircFlow: 0,
    totalFlow: 0,
    events: [],
    history: [],
    warnings: [],
  };
  // Establish a warm, running aircraft without advancing cabin mass or flight time.
  for (let n = 0; n < 400; n++) network(s, 0.1);
  if (preset === "normal") {
    let lo = s.outsidePressure,
      hi = lo + 10000;
    for (let i = 0; i < 45; i++) {
      const mid = (lo + hi) / 2;
      if (orifice(mid, s.outsidePressure, 0.0752) > s.inflow) hi = mid;
      else lo = mid;
    }
    s.cabinPressure = (lo + hi) / 2;
    s.cabinAltitude = altitudeAtPressure(s.cabinPressure);
    s.referenceAltitude = s.cabinAltitude;
  }
  s.leakFlow = orifice(s.cabinPressure, s.outsidePressure, 0.0002);
  const full = orifice(s.cabinPressure, s.outsidePressure, 0.075);
  s.outflowPosition =
    preset === "cruise"
      ? Math.sqrt(clamp((s.inflow - s.leakFlow) / Math.max(0.001, full), 0, 1))
      : 1;
  s.outflowCommand = s.outflowPosition;
  s.outflow = full * s.outflowPosition * s.outflowPosition;
  s.netFlow = s.inflow - s.outflow - s.leakFlow;
  s.delta = (s.cabinPressure - s.outsidePressure) / PSI;
  s.events = [
    {
      time: 0,
      text: `${preset.toUpperCase()} başlangıç koşulu yüklendi`,
      kind: "info",
    },
  ];
  thermal(s, 0);
  s.history = [sample(s)];
  return s;
}
const f = (s: AircraftState, id: string) => s.faults.includes(id);
export function log(
  s: AircraftState,
  text: string,
  kind: "info" | "warning" | "action" = "info",
): void {
  s.events.push({ time: s.time, text, kind });
  if (s.events.length > 300) s.events.shift();
}
export function setFault(
  s: AircraftState,
  id: string,
  active: boolean,
  hidden = false,
): void {
  if (!faultIds.has(id) || f(s, id) === active) return;
  if (active) {
    // Opposed mechanical faults are exclusive; unrelated failures can coexist.
    const counterparts: Record<string, string> = {
      iso_open: "iso_closed",
      iso_closed: "iso_open",
      outflow_open: "outflow_closed",
      outflow_closed: "outflow_open",
    };
    const opposite =
      counterparts[id] ??
      (id.includes("_closed_")
        ? id.replace("_closed_", "_open_")
        : id.includes("_open_")
          ? id.replace("_open_", "_closed_")
          : "");
    if (opposite) s.faults = s.faults.filter((x) => x !== opposite);
    s.faults.push(id);
  } else s.faults = s.faults.filter((x) => x !== id);
  if (!hidden)
    log(
      s,
      `${active ? "Arıza eklendi" : "Arıza kaldırıldı"} · ${faultLabel(id)}`,
      "action",
    );
}
export function clearFaults(s: AircraftState): void {
  s.faults = [];
  s.sources.forEach((x) => (x.protected = false));
  s.packs.forEach((x) => (x.trip = false));
  log(s, "Arızalar temizlendi; koruma kilitleri yeniden kuruldu", "action");
}
const ranges: Partial<Record<keyof Controls, [number, number]>> = {
  hotBias: [-50, 150],
  demand: [0.4, 2],
  ramDoor: [0, 1],
  airspeed: [0, 550],
  targetTemp: [16, 30],
  passengers: [0, 220],
  solar: [0, 10],
  altitudeTarget: [0, 43000],
  verticalSpeed: [100, 10000],
  oatOffset: [-25, 35],
  manualOutflow: [0, 1],
  cabinSchedule: [0, 10000],
  landingElevation: [0, 8000],
  cabinRateLimit: [100, 1500],
  positiveLimit: [5, 9.5],
  negativeLimit: [0.1, 0.8],
  leakArea: [0, 500],
  cabinVolume: [100, 600],
  departure: [0, 8000],
  cruiseAltitude: [15000, 43000],
  climbRate: [300, 5000],
  descentRate: [300, 10000],
  cruiseMinutes: [0.5, 30],
};
export function setControl<K extends keyof Controls>(
  s: AircraftState,
  key: K,
  value: Controls[K],
): void {
  const limits = ranges[key];
  if (limits && typeof value === "number")
    value = clamp(value, limits[0], limits[1]) as Controls[K];
  if (
    ["engine", "cooling", "fanAir", "zoneTarget"].includes(key) &&
    Array.isArray(value)
  ) {
    const low = key === "zoneTarget" ? 16 : 0,
      high = key === "engine" ? 100 : key === "zoneTarget" ? 30 : 1;
    value = value.map((v) => clamp(Number(v), low, high)) as Controls[K];
  }
  s.controls[key] = value;
  if ((key === "altitudeTarget" || key === "airspeed") && s.flightRunning) {
    s.flightRunning = false;
    log(s, "Manuel ortam kontrolü → flight profile durduruldu", "action");
  }
  if (key === "targetTemp")
    s.controls.zoneTarget = [Number(value), Number(value), Number(value)];
  if (key === "ground" && value) {
    s.controls.altitudeTarget = s.controls.departure;
    s.flightRunning = false;
    s.phase = "GROUND";
  }
  log(
    s,
    `${key} → ${Array.isArray(value) ? value.join(" / ") : value}`,
    "action",
  );
}
function network(s: AircraftState, dt: number): void {
  const c = s.controls;
  s.outsideTemp =
    15 - Math.min(s.altitude * 0.3048, 11000) * 0.0065 + c.oatOffset;
  s.sources.forEach((src, i) => {
    const eng = i < 2,
      apu = i === 2;
    const target = eng
      ? c.engine[i]
      : apu
        ? c.apuMaster && c.apuStart
          ? 100
          : 0
        : c.groundCart && c.ground
          ? 100
          : 0;
    src.rpm = move(src.rpm, target, eng ? 16 : apu ? 8 : 100, dt);
    src.available =
      src.rpm > (eng ? 15 : 90) &&
      !f(s, eng ? `bleed_fail_${i}` : apu ? "apu_fail" : "unused") &&
      (!apu || s.altitude < 15000) &&
      (i !== 3 || c.ground);
    src.pressure = src.available
      ? eng
        ? 20 + src.rpm * 0.75
        : apu
          ? 42
          : 45
      : 0;
    src.temperature = lag(
      src.temperature,
      src.available
        ? eng
          ? 180 + src.rpm * 2.8 + c.hotBias
          : apu
            ? 210
            : 160
        : s.outsideTemp,
      3,
      dt,
    );
    const effectiveness = eng
      ? c.cooling[i] * c.fanAir[i] * (f(s, `precooler_${i}`) ? 0.06 : 1)
      : 0.65;
    const coolingSink = eng ? Math.max(s.outsideTemp, 30) : 30;
    const heatTarget =
      src.temperature - (src.temperature - coolingSink) * effectiveness * 0.8;
    src.regulatedTemp = lag(src.regulatedTemp, heatTarget, 2, dt);
    src.regulatedPressure = src.available
      ? eng && (f(s, `regulation_${i}`) || f(s, `prsov_open_${i}`))
        ? src.pressure
        : Math.min(42, src.pressure * 0.92)
      : 0;
    src.ductTemp = lag(
      src.ductTemp,
      eng && f(s, `duct_leak_${i}`) && s.manifold[i] > 3
        ? Math.max(150, src.regulatedTemp)
        : Math.max(s.outsideTemp, 25),
      4,
      dt,
    );
    if (
      eng &&
      !src.protected &&
      (src.regulatedTemp > 265 ||
        src.regulatedPressure > 72 ||
        src.ductTemp > 115)
    ) {
      src.protected = true;
      log(
        s,
        `${src.name} ${src.ductTemp > 115 ? "DUCT LEAK DETECTED" : src.regulatedTemp > 265 ? "BLEED OVERTEMP" : "BLEED OVERPRESSURE"} → koruma kapatması`,
        "warning",
      );
    }
    const selected = eng ? c.bleed[i] : apu ? c.apuBleed : c.groundCart;
    src.command = selected && src.available && !src.protected ? 1 : 0;
    let targetValve = src.command;
    if (eng && f(s, `prsov_closed_${i}`)) targetValve = 0;
    if (eng && f(s, `prsov_open_${i}`)) targetValve = 1;
    src.valve = move(src.valve, targetValve, 0.5, dt);
    // Separate upstream protective shutoff can stop a mechanically stuck PRSOV.
    src.capacity =
      src.available && !src.protected
        ? (eng ? 0.35 + src.rpm * 0.02 : apu ? 1.9 : 2.4) * src.valve
        : 0;
    src.flow = 0;
    src.checkOpen = false;
  });
  const leakDetected = s.sources.slice(0, 2).some((x) => x.ductTemp > 115);
  s.isolationCommand = c.isolation && !leakDetected ? 1 : 0;
  const isoTarget = f(s, "iso_open")
    ? 1
    : f(s, "iso_closed")
      ? 0
      : s.isolationCommand;
  s.isolation = move(s.isolation, isoTarget, 0.5, dt);
  const freshFactor = 1 + (2 - c.recirc.filter(Boolean).length) * 0.18;
  s.packs.forEach((p, i) => {
    let valve = c.pack[i] !== "OFF" && c.packValve[i] && !p.trip ? 1 : 0;
    if (f(s, `pack_closed_${i}`)) valve = 0;
    if (f(s, `pack_open_${i}`)) valve = 1;
    p.valve = move(p.valve, valve, 0.45, dt);
    p.demand =
      (c.pack[i] === "HIGH" ? 0.94 : 0.65) *
      c.demand *
      freshFactor *
      p.valve *
      (p.trip ? 0 : 1);
  });
  const other = (c.antiIce ? 0.45 : 0) + (c.starter ? 0.9 : 0);
  const loads = s.packs.map((p, i) => ({
    pack: p.demand,
    other: other / 2,
    leak: f(s, `duct_leak_${i}`) ? 0.9 : 0,
  }));
  s.demand = [
    loads[0].pack + loads[0].other + loads[0].leak,
    loads[1].pack + loads[1].other + loads[1].leak,
  ];
  const groups = s.isolation > 0.01 ? [[0, 1]] : [[0], [1]];
  for (const group of groups) {
    const srcs = s.sources.filter((_, i) => group.includes(i === 1 ? 1 : 0));
    const cap = srcs.reduce((a, x) => a + x.capacity, 0);
    const maxHead = Math.max(
      0,
      ...srcs.filter((x) => x.capacity > 0).map((x) => x.regulatedPressure),
    );
    const demand = (p: number) =>
      group.reduce(
        (sum, i) =>
          sum +
          loads[i].pack * Math.sqrt(clamp((p - 6) / 29, 0, 1)) +
          (loads[i].other + loads[i].leak) * Math.sqrt(p / 35),
        0,
      );
    const supply = (p: number) =>
      srcs.reduce(
        (sum, x) =>
          sum + x.capacity * clamp((x.regulatedPressure - p) / 7, 0, 1),
        0,
      );
    let lo = 0,
      hi = maxHead;
    for (let n = 0; n < 38; n++) {
      const mid = (lo + hi) / 2;
      if (supply(mid) > demand(mid)) lo = mid;
      else hi = mid;
    }
    const pressure = (lo + hi) / 2;
    for (const x of srcs) {
      x.flow = x.capacity * clamp((x.regulatedPressure - pressure) / 7, 0, 1);
      x.checkOpen = x.flow > 0.00001;
    }
    const q = srcs.reduce((a, x) => a + x.flow, 0);
    const temp =
      q > 1e-8
        ? srcs.reduce((a, x) => a + x.regulatedTemp * x.flow, 0) / q
        : s.outsideTemp;
    for (const i of group) {
      s.manifold[i] = pressure;
      s.manifoldTemp[i] = temp;
      s.capacity[i] = cap;
      s.packs[i].flow =
        loads[i].pack * Math.sqrt(clamp((pressure - 6) / 29, 0, 1));
      s.otherFlow[i] = loads[i].other * Math.sqrt(pressure / 35);
      s.ductFlow[i] = loads[i].leak * Math.sqrt(pressure / 35);
      s.supplied[i] = s.packs[i].flow + s.otherFlow[i] + s.ductFlow[i];
    }
  }
  s.crossflow =
    s.isolation > 0.01
      ? s.sources[0].flow +
        s.sources[2].flow +
        s.sources[3].flow -
        s.supplied[0]
      : 0;
  s.packs.forEach((p, i) => {
    p.inletPressure = s.manifold[i];
    p.inletTemp = s.manifoldTemp[i];
    p.ram =
      clamp(
        (c.ground ? (c.coolingFan ? 0.75 : 0) : 0.2 + c.airspeed / 480) *
          c.ramDoor,
        0,
        1,
      ) * (f(s, `ram_blocked_${i}`) ? 0 : 1);
    const hx = 0.16 + 0.7 * p.ram;
    const flowPenalty = 1 / (1 + Math.max(0, p.flow - 0.65) * 0.65);
    const hx1 = p.inletTemp - (p.inletTemp - s.outsideTemp) * hx * flowPenalty;
    const p1 = s.outsidePressure + p.inletPressure * PSI * 0.94;
    const compressorRatio =
      f(s, `compressor_${i}`) || f(s, `turbine_${i}`) ? 1 : 1.32;
    const comp =
      (hx1 + 273.15) * (1 + (Math.pow(compressorRatio, 0.286) - 1) / 0.8) -
      273.15;
    const p2 = p1 * compressorRatio;
    const hx2 = comp - (comp - s.outsideTemp) * hx * flowPenalty;
    const exitPressure = Math.max(
      s.cabinPressure + 1500,
      s.outsidePressure + 2000,
    );
    const expansion = Math.max(1, (p2 * 0.9) / exitPressure);
    const turbine = f(s, `turbine_${i}`)
      ? hx2
      : (hx2 + 273.15) * (1 - 0.82 * (1 - Math.pow(1 / expansion, 0.286))) -
        273.15;
    p.coldTemp = clamp(turbine, -80, 200);
    const avg = s.zoneTemps.reduce((a, x) => a + x, 0) / 3;
    const avgTarget = c.zoneTarget.reduce((a, x) => a + x, 0) / 3;
    let desired = clamp(avgTarget - (avg - avgTarget) * 2 - 8, 2, 45);
    if (f(s, `temp_controller_${i}`)) desired = 42;
    if (f(s, `pack_temp_sensor_${i}`)) desired -= 18;
    let target = Math.max(p.coldTemp, Math.min(p.inletTemp, desired));
    if (f(s, `pack_overheat_${i}`)) target = 150;
    p.outletTemp = lag(p.outletTemp, p.flow > 0.0001 ? target : avg, 4, dt);
    if (p.outletTemp > 95 && !p.trip) {
      p.trip = true;
      log(
        s,
        `PACK ${i + 1} OVERHEAT → bağımsız pack koruması kapandı`,
        "warning",
      );
    }
    p.rpm = lag(
      p.rpm,
      p.flow > 0.001 && !f(s, `turbine_${i}`) && !f(s, `compressor_${i}`)
        ? clamp(p.flow / 0.9, 0, 1) * 100
        : 0,
      2,
      dt,
    );
    p.cooling = Math.max(0, p.flow * 1.005 * (avg - p.outletTemp));
    p.stages = [
      {
        name: "Bleed inlet",
        temperature: p.inletTemp,
        pressure: s.outsidePressure + p.inletPressure * PSI,
      },
      { name: "Primary HX", temperature: hx1, pressure: p1 },
      { name: "Compressor", temperature: comp, pressure: p2 },
      { name: "Secondary HX", temperature: hx2, pressure: p2 * 0.94 },
      { name: "Turbine", temperature: p.coldTemp, pressure: exitPressure },
      {
        name: "Water separator / bypass",
        temperature: p.outletTemp,
        pressure: Math.min(exitPressure, s.cabinPressure + 1000),
      },
    ];
    p.status = p.trip
      ? "OVERHEAT TRIP"
      : p.valve < 0.001
        ? "PACK OFF"
        : p.inletPressure < 8
          ? "INSUFFICIENT PRESSURE"
          : p.outletTemp > 50
            ? "HOT OUTLET"
            : f(s, `compressor_${i}`)
              ? "ACM COMPRESSOR FAIL"
              : f(s, `turbine_${i}`)
                ? "ACM TURBINE FAIL"
                : p.flow < p.demand * 0.85
                  ? "LOW FLOW"
                  : "NORMAL";
  });
  s.inflow = s.packs[0].flow + s.packs[1].flow;
  s.recircFlow = c.recirc.filter(Boolean).length * 0.42;
  s.totalFlow = s.inflow + s.recircFlow;
  const avg =
    s.zoneTemps[0] * 0.12 + s.zoneTemps[1] * 0.44 + s.zoneTemps[2] * 0.44;
  s.mixTemp =
    s.totalFlow > 0.0001
      ? (s.packs.reduce((sum, p) => sum + p.outletTemp * p.flow, 0) +
          avg * s.recircFlow) /
        s.totalFlow
      : avg;
}
function flight(s: AircraftState, dt: number): void {
  const c = s.controls;
  const before = s.altitude;
  if (s.flightRunning) {
    s.phaseTime += dt;
    s.flightElapsed += dt;
    switch (s.phase) {
      case "TAKEOFF":
        c.ground = false;
        c.airspeed = move(c.airspeed, 180, 4, dt);
        if (s.phaseTime >= 30) {
          s.phase = "CLIMB";
          s.phaseTime = 0;
        }
        break;
      case "CLIMB":
        s.altitude = move(s.altitude, c.cruiseAltitude, c.climbRate / 60, dt);
        c.airspeed = move(c.airspeed, 450, 1, dt);
        if (s.altitude >= c.cruiseAltitude - 0.01) {
          s.phase = "CRUISE";
          s.phaseTime = 0;
        }
        break;
      case "CRUISE":
        if (s.phaseTime >= c.cruiseMinutes * 60) {
          s.phase = "DESCENT";
          s.phaseTime = 0;
        }
        break;
      case "DESCENT":
        s.altitude = move(
          s.altitude,
          c.landingElevation,
          c.descentRate / 60,
          dt,
        );
        c.airspeed = move(c.airspeed, 180, 0.4, dt);
        if (s.altitude <= c.landingElevation + 0.01) {
          s.phase = "LANDING";
          s.phaseTime = 0;
          c.ground = true;
        }
        break;
      case "LANDING":
        c.airspeed = move(c.airspeed, 0, 4, dt);
        if (s.phaseTime > 90) {
          s.flightRunning = false;
          s.phase = "GROUND";
          c.altitudeTarget = c.landingElevation;
        }
        break;
    }
  } else {
    s.altitude = move(s.altitude, c.altitudeTarget, c.verticalSpeed / 60, dt);
    s.phase = c.ground
      ? "GROUND"
      : Math.abs(s.altitude - before) < 0.001
        ? "CRUISE"
        : s.altitude > before
          ? "CLIMB"
          : "DESCENT";
  }
  s.aircraftRate = ((s.altitude - before) / dt) * 60;
  s.outsidePressure = pressureAtAltitude(s.altitude);
}
export function startFlight(s: AircraftState): void {
  s.altitude = s.controls.departure;
  s.controls.altitudeTarget = s.altitude;
  s.outsidePressure = pressureAtAltitude(s.altitude);
  s.cabinPressure =
    pressureAtAltitude(s.altitude) + (s.inflow > 0.01 ? 270 : 0);
  s.cabinAltitude = altitudeAtPressure(s.cabinPressure);
  s.referenceAltitude = s.cabinAltitude;
  s.cabinRate = 0;
  s.flightRunning = true;
  s.phase = "TAKEOFF";
  s.phaseTime = 0;
  s.flightElapsed = 0;
  s.history = [];
  s.outflowPosition = 0.95;
  log(s, "START FLIGHT → TAKEOFF", "action");
}
function pressure(s: AircraftState, dt: number): void {
  const c = s.controls,
    oldAlt = altitudeAtPressure(s.cabinPressure),
    coefficient = (R * TK) / c.cabinVolume;
  let target: number;
  if (s.phase === "GROUND" || s.phase === "LANDING") target = s.altitude;
  else if (s.phase === "TAKEOFF") target = Math.max(-200, c.departure - 120);
  else if (s.phase === "DESCENT")
    target =
      c.landingElevation -
      80 +
      clamp(
        (s.altitude - c.landingElevation) /
          (c.cruiseAltitude - c.landingElevation),
        0,
        1,
      ) *
        (c.cabinSchedule - c.landingElevation + 80);
  else
    target =
      c.departure +
      clamp(
        (s.altitude - c.departure) / (c.cruiseAltitude - c.departure),
        0,
        1,
      ) *
        (c.cabinSchedule - c.departure);
  // Comfort schedule is subordinate to structural differential protection.
  const structuralMin = altitudeAtPressure(
    s.outsidePressure + (c.positiveLimit - 0.35) * PSI,
  );
  target = Math.max(target, structuralMin);
  const previousReference = s.referenceAltitude;
  s.referenceAltitude = move(
    s.referenceAltitude,
    target,
    c.cabinRateLimit / 60,
    dt,
  );
  const full = orifice(s.cabinPressure, s.outsidePressure, 0.075);
  const area =
    (2 +
      c.leakArea +
      (f(s, "cabin_leak") ? 12 : 0) +
      (f(s, "rapid_leak") ? 300 : 0)) /
    10000;
  s.leakFlow = orifice(s.cabinPressure, s.outsidePressure, area);
  s.delta = (s.cabinPressure - s.outsidePressure) / PSI;
  const posOpen = clamp((s.delta - c.positiveLimit) / 0.15, 0, 1),
    negOpen = clamp((-s.delta - c.negativeLimit) / 0.12, 0, 1);
  s.positiveFlow =
    s.delta > 0
      ? orifice(s.cabinPressure, s.outsidePressure, 0.15 * posOpen)
      : 0;
  s.negativeFlow =
    s.delta < 0
      ? -orifice(s.cabinPressure, s.outsidePressure, 0.15 * negOpen)
      : 0;
  if (c.pressureMode === "MANUAL") s.outflowCommand = c.manualOutflow;
  else if (!f(s, "auto_fail")) {
    if (s.phase === "GROUND" || s.phase === "LANDING") s.outflowCommand = 1;
    else {
      const targetP = pressureAtAltitude(s.referenceAltitude);
      const scheduleDp = (targetP - pressureAtAltitude(previousReference)) / dt;
      const requiredDp = scheduleDp + (targetP - s.cabinPressure) / 18;
      const rateBound = Math.abs(
        pressureAtAltitude(s.cabinAltitude + c.cabinRateLimit / 60) -
          s.cabinPressure,
      );
      const desiredDp = clamp(requiredDp, -rateBound, rateBound);
      const wanted =
        s.inflow -
        s.leakFlow -
        s.positiveFlow +
        s.negativeFlow -
        desiredDp / coefficient;
      s.outflowCommand =
        full > 0.001
          ? Math.sqrt(clamp(wanted / full, 0, 1))
          : s.cabinPressure < targetP
            ? 0
            : 1;
    }
  }
  let valve = f(s, "outflow_open")
    ? 1
    : f(s, "outflow_closed")
      ? 0
      : s.outflowCommand;
  if (f(s, "outflow_actuator")) valve = s.outflowPosition;
  s.outflowPosition = move(s.outflowPosition, valve, 0.18, dt);
  s.outflow = full * s.outflowPosition * s.outflowPosition;
  let outgoing = s.outflow + s.leakFlow + s.positiveFlow - s.negativeFlow;
  // Limit transfer to mass available above/below equalization; avoid numeric overshoot.
  if (outgoing > 0) {
    const maximum = Math.max(
      0,
      (s.cabinPressure - s.outsidePressure) / coefficient / dt + s.inflow,
    );
    if (outgoing > maximum) {
      const k = maximum / outgoing;
      s.outflow *= k;
      s.leakFlow *= k;
      s.positiveFlow *= k;
      s.negativeFlow *= k;
    }
  } else if (outgoing < 0) {
    const maximum = Math.max(
      0,
      (s.outsidePressure - s.cabinPressure) / coefficient / dt - s.inflow,
    );
    if (-outgoing > maximum) {
      const k = maximum / -outgoing;
      s.outflow *= k;
      s.leakFlow *= k;
      s.negativeFlow *= k;
    }
  }
  outgoing = s.outflow + s.leakFlow + s.positiveFlow - s.negativeFlow;
  s.netFlow = s.inflow - outgoing;
  s.cabinPressure = clamp(
    s.cabinPressure + coefficient * s.netFlow * dt,
    7000,
    130000,
  );
  s.cabinAltitude = altitudeAtPressure(s.cabinPressure);
  s.delta = (s.cabinPressure - s.outsidePressure) / PSI;
  s.cabinRate = lag(s.cabinRate, ((s.cabinAltitude - oldAlt) / dt) * 60, 1, dt);
}
function thermal(s: AircraftState, dt: number): void {
  const fractions = [0.12, 0.44, 0.44],
    masses = [140, 850, 850],
    c = s.controls;
  for (let i = 0; i < 3; i++) {
    s.zoneFlows[i] = s.totalFlow * fractions[i];
    // Small zone trim is limited by available pack airflow and hot-side energy.
    s.zoneSupply[i] =
      s.mixTemp +
      (s.inflow > 0.001
        ? clamp((c.zoneTarget[i] - s.zoneTemps[i]) * 2, 0, 10)
        : 0);
    const heat = (c.passengers * 0.1 + c.solar) * fractions[i];
    const envelope = 0.07 * fractions[i] * (s.outsideTemp - s.zoneTemps[i]);
    const cooling = s.zoneFlows[i] * 1.005 * (s.zoneSupply[i] - s.zoneTemps[i]);
    s.zoneTemps[i] = clamp(
      s.zoneTemps[i] + ((heat + envelope + cooling) * dt) / masses[i],
      -30,
      75,
    );
  }
}
export function sample(s: AircraftState): Sample {
  return {
    time: s.time,
    aircraft: s.altitude,
    cabin: s.cabinAltitude,
    delta: s.delta,
    outflow: s.outflowPosition * 100,
    rate: s.cabinRate,
    packIn: s.packs[0].inletTemp,
    packOut: s.packs[0].outletTemp,
    left: s.manifold[0],
    right: s.manifold[1],
    demand: s.demand[0] + s.demand[1],
    inflow: s.inflow,
    leak: s.leakFlow,
    temperature: s.zoneTemps.reduce((a, x) => a + x, 0) / 3,
  };
}
function warnings(s: AircraftState): string[] {
  const list: string[] = [];
  if (s.cabinAltitude > 10000) list.push("CABIN ALTITUDE HIGH");
  if (s.delta > s.controls.positiveLimit - 0.25) list.push("HIGH DIFFERENTIAL");
  if (s.negativeFlow > 0.001) list.push("NEGATIVE RELIEF OPEN");
  if (s.positiveFlow > 0.001) list.push("POSITIVE RELIEF OPEN");
  if (Math.abs(s.cabinRate) > s.controls.cabinRateLimit + 150)
    list.push("CABIN RATE HIGH");
  s.packs.forEach((p, i) => {
    if (p.status !== "NORMAL" && s.controls.pack[i] !== "OFF")
      list.push(`PACK ${i + 1} ${p.status}`);
  });
  s.sources.slice(0, 2).forEach((x, i) => {
    if (x.ductTemp > 115) list.push(`SIDE ${i + 1} BLEED LEAK`);
    else if (x.protected) list.push(`ENG ${i + 1} BLEED PROTECTION`);
  });
  if (f(s, "auto_fail") && s.controls.pressureMode === "AUTO")
    list.push("AUTO CONTROLLER FAIL");
  if (f(s, "cabin_pressure_sensor"))
    list.push("PRESSURE SENSOR · BACKUP ACTIVE");
  return list;
}
function signature(s: AircraftState): Record<string, string> {
  return {
    left: s.manifold[0] > 8 ? "LEFT MANIFOLD PRESSURIZED" : "LEFT MANIFOLD LOW",
    right:
      s.manifold[1] > 8 ? "RIGHT MANIFOLD PRESSURIZED" : "RIGHT MANIFOLD LOW",
    pack1: `PACK 1 ${s.packs[0].status}`,
    pack2: `PACK 2 ${s.packs[1].status}`,
    iso:
      s.isolation > 0.99
        ? "ISOLATION OPEN"
        : s.isolation < 0.01
          ? "ISOLATION CLOSED"
          : "ISOLATION IN TRANSIT",
    phase: s.phase,
  };
}
export function advance(s: AircraftState, seconds: number): AircraftState {
  seconds = clamp(seconds, 0, 3600);
  if (s.challenge?.active)
    seconds = Math.min(
      seconds,
      Math.max(0, s.challenge.duration - s.challenge.elapsed),
    );
  const steps = Math.ceil(seconds / 0.1);
  if (!steps) return s;
  const dt = seconds / steps;
  for (let k = 0; k < steps; k++) {
    const previous = signature(s);
    const prevWarnings = s.warnings;
    s.time += dt;
    if (s.challenge?.active && s.challenge.id === 3) {
      s.controls.leakArea = Math.min(
        100,
        10 + (s.challenge.elapsed + dt) * 0.5,
      );
    }
    flight(s, dt);
    network(s, dt);
    pressure(s, dt);
    thermal(s, dt);
    updateChallenge(s, dt);
    s.warnings = warnings(s);
    const after = signature(s);
    Object.keys(after).forEach((key) => {
      if (after[key] !== previous[key]) log(s, after[key]);
    });
    s.warnings
      .filter((x) => !prevWarnings.includes(x))
      .forEach((x) => log(s, x, "warning"));
    const last = s.history.at(-1);
    if (!last || s.time - last.time >= 1) {
      s.history.push(sample(s));
      if (s.history.length > 1200) {
        s.history = s.history.filter((_, i) => i % 2 === 0);
      }
    }
  }
  return s;
}
export function indicated(
  s: AircraftState,
  kind: string,
  index = 0,
): number | null {
  switch (kind) {
    case "cabinPressure":
      return f(s, "cabin_pressure_sensor") ? null : s.cabinPressure;
    case "cabinAltitude":
      return s.cabinAltitude + (f(s, "cabin_alt_sensor") ? 4000 : 0);
    case "delta":
      return s.delta + (f(s, "delta_sensor") ? 2 : 0);
    case "outflow":
      return f(s, "outflow_sensor") ? 0.73 : s.outflowPosition;
    case "bleedPressure":
      return f(s, `bleed_pressure_sensor_${index}`) ? null : s.manifold[index];
    case "bleedTemp":
      return f(s, `bleed_temp_sensor_${index}`)
        ? null
        : s.sources[index].regulatedTemp;
    case "packTemp":
      return (
        s.packs[index].outletTemp + (f(s, `pack_temp_sensor_${index}`) ? 18 : 0)
      );
    case "packFlow":
      return f(s, `pack_flow_sensor_${index}`) ? 0 : s.packs[index].flow;
    default:
      return null;
  }
}
export function trace(
  s: AircraftState,
  destination: "pack1" | "pack2" | "cabin" | "cockpit",
): string[][] {
  const result: string[][] = [];
  for (const side of destination === "pack1"
    ? [0]
    : destination === "pack2"
      ? [1]
      : [0, 1]) {
    if (s.packs[side].flow < 0.0001) continue;
    s.sources.forEach((src, i) => {
      const sourceSide = i === 1 ? 1 : 0;
      const crosses = sourceSide !== side;
      const validCross =
        s.isolation > 0.01 &&
        (sourceSide === 0 ? s.crossflow > 1e-5 : s.crossflow < -1e-5);
      if (src.flow < 0.0001 || (crosses && !validCross)) return;
      const route = [
        src.name,
        "CHECK VALVE",
        sourceSide === 0 ? "LEFT MANIFOLD" : "RIGHT MANIFOLD",
      ];
      if (crosses)
        route.push(
          "ISOLATION",
          side === 0 ? "LEFT MANIFOLD" : "RIGHT MANIFOLD",
        );
      route.push(`PACK ${side + 1}`);
      if (destination === "cabin" || destination === "cockpit")
        route.push("MIX MANIFOLD", "CABIN");
      if (destination === "cockpit") route.push("COCKPIT VENT");
      result.push(route);
    });
  }
  return result;
}
export function why(s: AircraftState, subject: string): string {
  if (subject.startsWith("pack")) {
    const i = subject === "pack1" ? 0 : 1,
      p = s.packs[i];
    return `PACK ${i + 1}: ${p.status}. Gerçek valf %${Math.round(p.valve * 100)} açık, giriş ${p.inletPressure.toFixed(1)} psi, debi ${p.flow.toFixed(2)} / ${p.demand.toFixed(2)} kg/s. ${p.trip ? "Aşırı sıcaklık koruması kilitlendi; arıza giderilip koruma yeniden kurulmalı." : p.valve < 0.01 ? "Valf kapalı olduğu için akış yolu kesik." : p.inletPressure < 8 ? "Manifoldda yeterli basınç yok; kaynak ve isolation yolunu kontrol edin." : p.flow < p.demand * 0.85 ? "Kaynak kapasitesi toplam talebi karşılayamıyor." : `Ram air etkinliği %${Math.round(p.ram * 100)}; turbine ${p.coldTemp.toFixed(1)} °C, bypass sonrası ${p.outletTemp.toFixed(1)} °C.`}`;
  }
  if (subject === "isolation")
    return `Isolation komutu %${s.isolationCommand * 100}, gerçek konumu %${Math.round(s.isolation * 100)}. ${s.sources.some((x) => x.ductTemp > 115) ? "Duct leak algılaması normal açma komutunu engelliyor." : f(s, "iso_open") || f(s, "iso_closed") ? "Mekanik sıkışma komutu izlemeyi engelliyor." : s.controls.isolation ? "Öğrencinin crossbleed komutu etkin." : "Öğrenci iki tarafı ayrı tuttu."} Net transfer ${s.crossflow.toFixed(2)} kg/s (pozitif: sol → sağ).`;
  if (subject === "left" || subject === "right") {
    const i = subject === "left" ? 0 : 1;
    return `${subject.toUpperCase()} ${s.manifold[i].toFixed(1)} psi. Bağlı kaynak kapasitesi ${s.capacity[i].toFixed(2)} kg/s; bu tarafta talep ${s.demand[i].toFixed(2)}, sağlanan ${s.supplied[i].toFixed(2)} kg/s. ${s.manifold[i] < 8 ? "Açık valfle bağlı ve kullanılabilir kaynak bulunmuyor ya da kapasite yetersiz." : "Basınç; kaynak basıncı, tek yönlü check valve ve yükün ortak denge noktasından hesaplanır."}`;
  }
  if (subject === "delta")
    return `ΔP = ${(s.cabinPressure / 1000).toFixed(2)} − ${(s.outsidePressure / 1000).toFixed(2)} = ${((s.delta * PSI) / 1000).toFixed(2)} kPa (${s.delta.toFixed(2)} psi). Seçili pozitif sınır ${s.controls.positiveLimit} psi. Relief debisi ${s.positiveFlow.toFixed(2)} kg/s. ${s.delta > s.controls.positiveLimit - 0.3 ? "Kabin ile dış ortam farkı seçili yapısal sınıra yaklaşıyor." : "Fark iki fiziksel basınçtan türetilir; gösterge arızası bu hesabı değiştirmez."}`;
  return `Kabin ${s.cabinRate >= 0 ? "yükseliyor" : "alçalıyor"}: ${s.cabinRate.toFixed(0)} ft/min. Taze giriş ${s.inflow.toFixed(2)}, outflow ${s.outflow.toFixed(2)}, kaçak ${s.leakFlow.toFixed(2)} kg/s; net ${s.netFlow.toFixed(3)} kg/s. ${s.netFlow < 0 ? "Çıkan kütle daha fazla: basınç düşüyor, kabin irtifası yükseliyor." : "İçeride kütle birikiyor: basınç yükseliyor, kabin irtifası azalıyor."} Recirculation kapalı devredir, net kabin kütlesine eklenmez.`;
}
