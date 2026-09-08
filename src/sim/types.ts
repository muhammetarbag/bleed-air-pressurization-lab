export type Pair<T> = [T, T];
export type Phase =
  | "GROUND"
  | "TAKEOFF"
  | "CLIMB"
  | "CRUISE"
  | "DESCENT"
  | "LANDING";
export type PackMode = "OFF" | "AUTO" | "HIGH";
export interface Controls {
  engine: Pair<number>;
  bleed: Pair<boolean>;
  cooling: Pair<number>;
  fanAir: Pair<number>;
  hotBias: number;
  apuMaster: boolean;
  apuStart: boolean;
  apuBleed: boolean;
  groundCart: boolean;
  isolation: boolean;
  pack: Pair<PackMode>;
  packValve: Pair<boolean>;
  demand: number;
  antiIce: boolean;
  starter: boolean;
  ramDoor: number;
  coolingFan: boolean;
  airspeed: number;
  recirc: Pair<boolean>;
  targetTemp: number;
  zoneTarget: [number, number, number];
  passengers: number;
  solar: number;
  ground: boolean;
  altitudeTarget: number;
  verticalSpeed: number;
  oatOffset: number;
  pressureMode: "AUTO" | "MANUAL";
  manualOutflow: number;
  cabinSchedule: number;
  landingElevation: number;
  cabinRateLimit: number;
  positiveLimit: number;
  negativeLimit: number;
  leakArea: number;
  cabinVolume: number;
  departure: number;
  cruiseAltitude: number;
  climbRate: number;
  descentRate: number;
  cruiseMinutes: number;
}
export interface Source {
  name: string;
  rpm: number;
  available: boolean;
  pressure: number;
  temperature: number;
  regulatedPressure: number;
  regulatedTemp: number;
  capacity: number;
  flow: number;
  valve: number;
  command: number;
  protected: boolean;
  ductTemp: number;
  checkOpen: boolean;
}
export interface Stage {
  name: string;
  temperature: number;
  pressure: number;
}
export interface Pack {
  valve: number;
  flow: number;
  demand: number;
  inletPressure: number;
  inletTemp: number;
  outletTemp: number;
  coldTemp: number;
  rpm: number;
  cooling: number;
  ram: number;
  status: string;
  stages: Stage[];
  trip: boolean;
}
export interface Sample {
  time: number;
  aircraft: number;
  cabin: number;
  delta: number;
  outflow: number;
  rate: number;
  packIn: number;
  packOut: number;
  left: number;
  right: number;
  demand: number;
  inflow: number;
  leak: number;
  temperature: number;
}
export interface LogEvent {
  time: number;
  text: string;
  kind: "info" | "warning" | "action";
}
export interface ChallengeRun {
  id: number;
  duration: number;
  elapsed: number;
  good: number;
  active: boolean;
  decision: string;
  score: number | null;
}
export interface AircraftState {
  challenge: ChallengeRun | null;
  time: number;
  controls: Controls;
  faults: string[];
  sources: Source[];
  packs: Pair<Pack>;
  manifold: Pair<number>;
  manifoldTemp: Pair<number>;
  capacity: Pair<number>;
  demand: Pair<number>;
  supplied: Pair<number>;
  crossflow: number;
  isolation: number;
  isolationCommand: number;
  otherFlow: Pair<number>;
  ductFlow: Pair<number>;
  altitude: number;
  aircraftRate: number;
  phase: Phase;
  flightRunning: boolean;
  phaseTime: number;
  flightElapsed: number;
  cabinPressure: number;
  cabinAltitude: number;
  outsidePressure: number;
  outsideTemp: number;
  delta: number;
  cabinRate: number;
  referenceAltitude: number;
  outflowCommand: number;
  outflowPosition: number;
  inflow: number;
  outflow: number;
  leakFlow: number;
  positiveFlow: number;
  negativeFlow: number;
  netFlow: number;
  zoneTemps: [number, number, number];
  zoneSupply: [number, number, number];
  zoneFlows: [number, number, number];
  mixTemp: number;
  recircFlow: number;
  totalFlow: number;
  events: LogEvent[];
  history: Sample[];
  warnings: string[];
}
