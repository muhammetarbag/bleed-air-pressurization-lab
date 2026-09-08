import type { ReactNode } from "react";
import type {
  AircraftState,
  Controls as ControlState,
  Pair,
} from "../sim/types";
import { indicated } from "../sim/engine";
export type Change = <K extends keyof ControlState>(
  key: K,
  value: ControlState[K],
) => void;
export function Range({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="range">
      <span>
        {label}
        <output>
          {value.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}{" "}
          <small>{unit}</small>
        </output>
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="range-ends">
        <small>
          {min} {unit}
        </small>
        <small>
          {max} {unit}
        </small>
      </span>
    </label>
  );
}
export function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: () => void;
}) {
  return (
    <button
      className={`toggle ${on ? "on" : ""}`}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
    >
      <span>{label}</span>
      <span className="toggle-track">
        <i />
      </span>
      <b>{on ? "ON" : "OFF"}</b>
    </button>
  );
}
export function Select<T extends string>({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: T;
  items: readonly T[];
  onChange: (x: T) => void;
}) {
  return (
    <label className="select">
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {items.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </label>
  );
}
export function Panel({
  title,
  kicker,
  children,
  extra,
  className = "",
}: {
  title: string;
  kicker?: string;
  children: ReactNode;
  extra?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-head">
        <div>
          {kicker && <span className="eyebrow">{kicker}</span>}
          <h2>{title}</h2>
        </div>
        {extra}
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}
export function Metric({
  label,
  value,
  unit = "",
  tone = "",
  sub,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  tone?: string;
  sub?: ReactNode;
}) {
  return (
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>
        {value}
        <small>{unit}</small>
      </strong>
      {sub && <p>{sub}</p>}
    </div>
  );
}
export const format = (n: number | null, digits = 1) =>
  n === null
    ? "—"
    : n.toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
export function SourceControls({
  s,
  change,
  compact = false,
}: {
  s: AircraftState;
  change: Change;
  compact?: boolean;
}) {
  const c = s.controls;
  const pair = <K extends "engine" | "bleed" | "cooling" | "fanAir">(
    key: K,
    i: number,
    value: number | boolean,
  ) => {
    const v = [...c[key]];
    v[i] = value as never;
    change(key, v as ControlState[K]);
  };
  return (
    <div className="control-stack">
      {[0, 1].map((i) => (
        <div className="control-block" key={i}>
          <div className="control-title">
            <strong>ENGINE {i + 1}</strong>
            <span className={s.sources[i].available ? "good" : "muted"}>
              {format(s.sources[i].rpm, 0)}% RPM
            </span>
          </div>
          <div className="segments">
            {[
              ["OFF", 0],
              ["IDLE", 30],
              ["MED", 65],
              ["HIGH", 100],
            ].map(([label, v]) => (
              <button
                key={label}
                className={c.engine[i] === v ? "active" : ""}
                onClick={() => pair("engine", i, Number(v))}
                aria-label={`Engine ${i + 1} ${label}`}
              >
                {label}
              </button>
            ))}
          </div>
          {!compact && (
            <Range
              label={`Engine ${i + 1} RPM`}
              min={0}
              max={100}
              unit="%"
              value={c.engine[i]}
              onChange={(v) => pair("engine", i, v)}
            />
          )}
          <Toggle
            label={`ENG ${i + 1} BLEED`}
            on={c.bleed[i]}
            onChange={() => pair("bleed", i, !c.bleed[i])}
          />
          {!compact && (
            <>
              <Range
                label={`Precooler ${i + 1} etkinliği`}
                min={0}
                max={100}
                unit="%"
                value={Math.round(c.cooling[i] * 100)}
                onChange={(v) => pair("cooling", i, v / 100)}
              />
              <Range
                label={`Fan air valve ${i + 1}`}
                min={0}
                max={100}
                unit="% açık"
                value={Math.round(c.fanAir[i] * 100)}
                onChange={(v) => pair("fanAir", i, v / 100)}
              />
            </>
          )}
        </div>
      ))}
      <div className="control-block">
        <div className="control-title">
          <strong>YARDIMCI KAYNAKLAR</strong>
          <span>APU {format(s.sources[2].rpm, 0)}%</span>
        </div>
        <Toggle
          label="APU MASTER"
          on={c.apuMaster}
          onChange={() => change("apuMaster", !c.apuMaster)}
        />
        <Toggle
          label="APU START"
          on={c.apuStart}
          onChange={() => change("apuStart", !c.apuStart)}
        />
        <Toggle
          label="APU BLEED"
          on={c.apuBleed}
          onChange={() => change("apuBleed", !c.apuBleed)}
        />
        <Toggle
          label="GROUND AIR CART"
          on={c.groundCart}
          onChange={() => change("groundCart", !c.groundCart)}
        />
        <p className="hint">
          APU ~13 s içinde hazır olur. Eğitim modelinde bleed &lt;15.000 ft;
          ground air yalnız yerde kullanılabilir.
        </p>
      </div>
    </div>
  );
}
export function NetworkControls({
  s,
  change,
}: {
  s: AircraftState;
  change: Change;
}) {
  const c = s.controls;
  return (
    <div className="control-stack">
      <Toggle
        label="ISOLATION VALVE"
        on={c.isolation}
        onChange={() => change("isolation", !c.isolation)}
      />
      {[0, 1].map((i) => (
        <Toggle
          key={i}
          label={`PACK ${i + 1} VALVE`}
          on={c.packValve[i]}
          onChange={() => {
            const v = [...c.packValve] as Pair<boolean>;
            v[i] = !v[i];
            change("packValve", v);
          }}
        />
      ))}
      <Range
        label="Pnömatik talep çarpanı"
        min={0.4}
        max={2}
        step={0.05}
        unit="×"
        value={c.demand}
        onChange={(v) => change("demand", v)}
      />
      <Toggle
        label="ANTI-ICE LOAD"
        on={c.antiIce}
        onChange={() => change("antiIce", !c.antiIce)}
      />
      <Toggle
        label="STARTER LOAD"
        on={c.starter}
        onChange={() => change("starter", !c.starter)}
      />
      <p className="hint">
        Starter, 0,9 kg/s temsilî pnömatik tüketicidir; motorun çalıştırma
        sekansı modellenmez.
      </p>
    </div>
  );
}
export function PackControls({
  s,
  change,
}: {
  s: AircraftState;
  change: Change;
}) {
  const c = s.controls;
  return (
    <div className="control-stack">
      {[0, 1].map((i) => (
        <Select
          key={i}
          label={`PACK ${i + 1} MODE`}
          value={c.pack[i]}
          items={["OFF", "AUTO", "HIGH"]}
          onChange={(v) => {
            const p = [...c.pack] as Pair<typeof v>;
            p[i] = v;
            change("pack", p);
          }}
        />
      ))}
      <Range
        label="Pack flow demand"
        min={0.4}
        max={2}
        step={0.05}
        unit="×"
        value={c.demand}
        onChange={(v) => change("demand", v)}
      />
      <Range
        label="Kabin sıcaklık hedefi"
        min={16}
        max={30}
        unit="°C"
        value={c.targetTemp}
        onChange={(v) => change("targetTemp", v)}
      />
      <Range
        label="Ram air door"
        min={0}
        max={100}
        unit="% açık"
        value={Math.round(c.ramDoor * 100)}
        onChange={(v) => change("ramDoor", v / 100)}
      />
      <Range
        label="Airspeed"
        min={0}
        max={550}
        unit="kt"
        value={c.airspeed}
        onChange={(v) => change("airspeed", v)}
      />
      <Toggle
        label="GROUND MODE"
        on={c.ground}
        onChange={() => change("ground", !c.ground)}
      />
      <Toggle
        label="COOLING FAN"
        on={c.coolingFan}
        onChange={() => change("coolingFan", !c.coolingFan)}
      />
    </div>
  );
}
export function ThermalControls({
  s,
  change,
}: {
  s: AircraftState;
  change: Change;
}) {
  const c = s.controls;
  return (
    <div className="control-stack">
      {[0, 1].map((i) => (
        <Toggle
          key={i}
          label={`RECIRC FAN ${i + 1}`}
          on={c.recirc[i]}
          onChange={() => {
            const v = [...c.recirc] as Pair<boolean>;
            v[i] = !v[i];
            change("recirc", v);
          }}
        />
      ))}
      {["Cockpit", "Forward cabin", "Aft cabin"].map((label, i) => (
        <Range
          key={label}
          label={`${label} hedefi`}
          min={16}
          max={30}
          value={c.zoneTarget[i]}
          unit="°C"
          onChange={(v) => {
            const p = [...c.zoneTarget] as [number, number, number];
            p[i] = v;
            change("zoneTarget", p);
          }}
        />
      ))}
      <Range
        label="Yolcu sayısı"
        min={0}
        max={220}
        value={c.passengers}
        onChange={(v) => change("passengers", v)}
      />
      <Range
        label="Güneş / çevre ısı yükü"
        min={0}
        max={10}
        step={0.5}
        unit="kW"
        value={c.solar}
        onChange={(v) => change("solar", v)}
      />
      <Range
        label="Dış sıcaklık ISA sapması"
        min={-25}
        max={35}
        unit="°C"
        value={c.oatOffset}
        onChange={(v) => change("oatOffset", v)}
      />
    </div>
  );
}
export function PressureControls({
  s,
  change,
  full = true,
}: {
  s: AircraftState;
  change: Change;
  full?: boolean;
}) {
  const c = s.controls;
  return (
    <div className="control-stack">
      <Select
        label="PRESSURE CONTROL"
        value={c.pressureMode}
        items={["AUTO", "MANUAL"]}
        onChange={(v) => change("pressureMode", v)}
      />
      <Range
        label="Manual outflow valve"
        min={0}
        max={100}
        unit="% açık"
        value={Math.round(c.manualOutflow * 100)}
        onChange={(v) => {
          change("pressureMode", "MANUAL");
          change("manualOutflow", v / 100);
        }}
      />
      <p className="hint">
        0% CLOSED · 100% OPEN. Gerçek konum:{" "}
        {format(s.outflowPosition * 100, 0)}%. Kaydırıcı MANUAL kontrolü seçer.
      </p>
      <Range
        label="Aircraft altitude hedefi"
        min={0}
        max={43000}
        step={500}
        unit="ft"
        value={c.altitudeTarget}
        onChange={(v) => {
          change("ground", false);
          change("altitudeTarget", v);
        }}
      />
      <Range
        label="Aircraft vertical speed"
        min={100}
        max={10000}
        step={100}
        unit="ft/min"
        value={c.verticalSpeed}
        onChange={(v) => change("verticalSpeed", v)}
      />
      <Range
        label="Cabin leak area"
        min={0}
        max={500}
        unit="cm²"
        value={c.leakArea}
        onChange={(v) => change("leakArea", v)}
      />
      {full && (
        <>
          <Range
            label="Cruise cabin schedule"
            min={0}
            max={10000}
            step={100}
            unit="ft"
            value={c.cabinSchedule}
            onChange={(v) => change("cabinSchedule", v)}
          />
          <Range
            label="Landing elevation"
            min={0}
            max={8000}
            step={100}
            unit="ft"
            value={c.landingElevation}
            onChange={(v) => change("landingElevation", v)}
          />
          <Range
            label="Auto cabin rate limit"
            min={100}
            max={1500}
            step={50}
            unit="ft/min"
            value={c.cabinRateLimit}
            onChange={(v) => change("cabinRateLimit", v)}
          />
          <Range
            label="Positive relief limit"
            min={5}
            max={9.5}
            step={0.1}
            unit="psi"
            value={c.positiveLimit}
            onChange={(v) => change("positiveLimit", v)}
          />
          <Range
            label="Negative relief limit"
            min={0.1}
            max={0.8}
            step={0.05}
            unit="psi"
            value={c.negativeLimit}
            onChange={(v) => change("negativeLimit", v)}
          />
          <Range
            label="Cabin volume"
            min={100}
            max={600}
            step={10}
            unit="m³"
            value={c.cabinVolume}
            onChange={(v) => change("cabinVolume", v)}
          />
        </>
      )}
    </div>
  );
}
export function StatusMetrics({ s }: { s: AircraftState }) {
  return (
    <div className="metrics-strip">
      <Metric
        label="AIRCRAFT ALT"
        value={format(s.altitude, 0)}
        unit="ft"
        sub={s.phase}
      />
      <Metric
        label="CABIN ALT"
        value={format(indicated(s, "cabinAltitude"), 0)}
        unit="ft"
        tone={s.cabinAltitude > 10000 ? "danger" : "cyan"}
        sub={`${format(s.cabinRate, 0)} ft/min`}
      />
      <Metric
        label="DIFFERENTIAL"
        value={format(indicated(s, "delta"), 2)}
        unit="psi"
        sub={`Limit ${s.controls.positiveLimit.toFixed(1)} psi`}
        tone={s.delta > s.controls.positiveLimit - 0.25 ? "danger" : ""}
      />
      <Metric
        label="CABIN INFLOW"
        value={format(s.inflow, 2)}
        unit="kg/s"
        tone="cyan"
        sub="Pack 1 + Pack 2"
      />
      <Metric
        label="CABIN TEMP"
        value={format(s.zoneTemps.reduce((a, x) => a + x, 0) / 3)}
        unit="°C"
        sub={`Target ${s.controls.targetTemp} °C`}
      />
      <Metric
        label="OUTFLOW VALVE"
        value={format((indicated(s, "outflow") ?? 0) * 100, 0)}
        unit="%"
        sub={`${s.controls.pressureMode} · OPEN`}
      />
    </div>
  );
}
