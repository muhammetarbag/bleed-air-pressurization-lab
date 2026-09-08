import type { CSSProperties } from "react";
import type { AircraftState, Sample } from "../sim/types";
import { format, Metric } from "./Controls";
import { indicated, pressureAtAltitude, PSI } from "../sim/engine";
export function Flow({
  d,
  flow,
  color = "cyan",
  id,
  highlight = false,
}: {
  d: string;
  flow: number;
  color?: string;
  id?: string;
  highlight?: boolean;
}) {
  const active = Math.abs(flow) > 0.0001;
  return (
    <g
      data-flow-id={id}
      data-flow={flow.toFixed(5)}
      className={`flow-group ${color} ${highlight && active ? "traced" : ""}`}
    >
      <path d={d} className="pipe" />
      {active && (
        <path
          d={d}
          className={`flow ${flow < 0 ? "reverse" : ""}`}
          style={
            {
              "--flow-duration": `${Math.max(0.3, 2 / Math.max(0.15, Math.abs(flow)))}s`,
            } as CSSProperties
          }
        />
      )}
    </g>
  );
}
function Valve({
  x,
  y,
  position,
  onClick,
  label,
}: {
  x: number;
  y: number;
  position: number;
  onClick?: () => void;
  label: string;
}) {
  return (
    <g
      className={`valve ${position > 0.01 ? "open" : ""}`}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={label}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <title>
        {label} · %{Math.round(position * 100)} açık
      </title>
      <circle cx={x} cy={y} r="13" />
      <line
        x1={x - 9}
        x2={x + 9}
        y1={y}
        y2={y}
        transform={`rotate(${90 * (1 - position)} ${x} ${y})`}
      />
    </g>
  );
}
function Fan({
  x,
  y,
  rpm,
  color = "cyan",
}: {
  x: number;
  y: number;
  rpm: number;
  color?: string;
}) {
  return (
    <g className={`fan ${color}`}>
      <circle cx={x} cy={y} r="20" />
      <g
        className={rpm > 1 ? "rotating" : ""}
        style={
          {
            transformOrigin: `${x}px ${y}px`,
            "--fan-duration": `${Math.max(0.3, 4 / (rpm / 20 + 1))}s`,
          } as CSSProperties
        }
      >
        {[0, 90, 180, 270].map((a) => (
          <path
            key={a}
            d={`M ${x} ${y} Q ${x + 23} ${y - 24} ${x + 15} ${y} Z`}
            transform={`rotate(${a} ${x} ${y})`}
          />
        ))}
      </g>
      <circle cx={x} cy={y} r="4" />
    </g>
  );
}
function BasicSynoptic({
  s,
  onInspect,
}: {
  s: AircraftState;
  onInspect: (id: string) => void;
}) {
  return (
    <div className="diagram-scroll">
      <svg
        className="synoptic basic-synoptic"
        viewBox="0 0 960 510"
        role="img"
        aria-label="Temel görünüm: kaynaklar, packler, kabin ve outflow"
      >
        <text x="28" y="30" className="diagram-note">
          BASIC · KAYNAK → PACK → CABIN → OUTFLOW
        </text>
        {[0, 1, 2].map((source, index) => {
          const i = [0, 2, 1][source],
            x = 180 + index * 300,
            src = s.sources[i];
          return (
            <g key={i}>
              <g
                className="diagram-node"
                role="button"
                tabIndex={0}
                aria-label={`${src.name} temel bilgi`}
                onClick={() => onInspect(i === 1 ? "right" : "left")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onInspect(i === 1 ? "right" : "left");
                }}
              >
                <rect x={x - 110} y="60" width="220" height="70" rx="6" />
                <text x={x} y="90" textAnchor="middle" className="node-title">
                  {src.name}
                </text>
                <text x={x} y="115" textAnchor="middle" className="hot-text">
                  {src.flow > 0.001 ? "AIR AVAILABLE" : "NO FLOW"} ·{" "}
                  {format(src.flow, 2)} kg/s
                </text>
              </g>
              <Flow
                d={
                  i === 2
                    ? "M480 130 V175 H320 V220"
                    : i === 0
                      ? "M180 130 V220 H320"
                      : "M780 130 V220 H640"
                }
                flow={src.flow}
                color="hot"
                id={`basic-source-${i}`}
              />
            </g>
          );
        })}
        <Flow
          d="M320 220 H640"
          flow={s.crossflow}
          color="regulated"
          id="basic-crossbleed"
        />
        <text x="480" y="208" textAnchor="middle" className="diagram-note">
          {s.isolation > 0.01 ? "BAĞLANTI AÇIK" : "TARAFLAR AYRI"}
        </text>
        {s.sources[3].flow > 0.001 && (
          <>
            <Flow
              d="M70 190 H250 V220 H320"
              flow={s.sources[3].flow}
              color="hot"
            />
            <text x="70" y="177" className="diagram-note">
              GROUND AIR
            </text>
          </>
        )}
        {[0, 1].map((i) => {
          const x = 320 + i * 320,
            p = s.packs[i];
          return (
            <g key={i}>
              <Flow
                d={`M${x} 220 V260`}
                flow={p.flow}
                color="regulated"
                id={`basic-pack-in-${i}`}
              />
              <g
                className="diagram-node"
                role="button"
                tabIndex={0}
                aria-label={`Pack ${i + 1} neden`}
                onClick={() => onInspect(`pack${i + 1}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onInspect(`pack${i + 1}`);
                }}
              >
                <rect x={x - 110} y="260" width="220" height="75" rx="5" />
                <text x={x} y="288" textAnchor="middle" className="node-title">
                  PACK {i + 1}
                </text>
                <text x={x} y="314" textAnchor="middle" className="pack-value">
                  {format(p.outletTemp)} °C
                </text>
              </g>
              <Flow
                d={`M${x} 335 V365 H480`}
                flow={p.flow}
                id={`basic-pack-out-${i}`}
              />
            </g>
          );
        })}
        <Flow d="M480 365 V398" flow={s.inflow} id="basic-cabin-in" />
        <g
          className="cabin-node"
          role="button"
          tabIndex={0}
          aria-label="Temel kabin açıklaması"
          onClick={() => onInspect("cabin")}
          onKeyDown={(e) => {
            if (e.key === "Enter") onInspect("cabin");
          }}
        >
          <path d="M260 398 H675 Q715 398 730 433 Q715 468 675 468 H260 Q225 465 207 433 Q225 400 260 398Z" />
          <text x="470" y="426" textAnchor="middle" className="node-title">
            CABIN · {format(s.cabinAltitude, 0)} ft
          </text>
          <text x="470" y="449" textAnchor="middle" className="cabin-value">
            {format(s.delta, 2)} psi ·{" "}
            {format(s.zoneTemps.reduce((a, t) => a + t, 0) / 3)} °C
          </text>
        </g>
        <Flow
          d="M730 433 H915"
          flow={s.outflow}
          color="exhaust"
          id="basic-outflow"
        />
        <Valve
          x={805}
          y={433}
          position={s.outflowPosition}
          label="Outflow valve"
          onClick={() => onInspect("Outflow Valve")}
        />
        <text x="805" y="485" textAnchor="middle" className="diagram-label">
          OUTFLOW {format(s.outflowPosition * 100, 0)}%
        </text>
        {Math.abs(s.leakFlow) > 0.001 && (
          <>
            <Flow d="M600 468 V495 H710" flow={s.leakFlow} color="exhaust" />
            <text x="710" y="489" className="diagram-note">
              LEAK
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
const tracingDestination = (target: string) =>
  target === "cabin" || target === "cockpit";
export function Synoptic({
  s,
  onInspect,
  traceTarget = "",
  simplified = false,
}: {
  s: AircraftState;
  onInspect: (id: string) => void;
  traceTarget?: string;
  simplified?: boolean;
}) {
  if (simplified) return <BasicSynoptic s={s} onInspect={onInspect} />;
  const traced = (side: number) =>
    traceTarget === "cabin" ||
    traceTarget === "cockpit" ||
    traceTarget === `pack${side + 1}`;
  return (
    <div className="diagram-scroll">
      <svg
        className="synoptic"
        viewBox="0 0 960 640"
        role="img"
        aria-label="Canlı pnömatik sinoptik: kaynaklar, valfler, iki pack, kabin ve outflow"
      >
        <defs>
          <pattern
            id="diagram-grid"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r=".6" fill="#2c4054" />
          </pattern>
        </defs>
        <rect
          width="960"
          height="640"
          fill="url(#diagram-grid)"
          opacity=".65"
        />
        <text x="24" y="30" className="diagram-note">
          TWIN ENGINE / GENERIC ARCHITECTURE
        </text>
        <text x="936" y="30" textAnchor="end" className="diagram-note">
          ATA 36 → ATA 21
        </text>
        {[0, 1].map((i) => {
          const x = i === 0 ? 165 : 795,
            src = s.sources[i];
          return (
            <g key={i}>
              <Flow
                d={`M${x} 127 V260`}
                flow={src.flow}
                color="hot"
                id={`engine-${i}`}
                highlight={traced(i) || (s.crossflow !== 0 && !!traceTarget)}
              />
              <g
                className="diagram-node"
                role="button"
                tabIndex={0}
                aria-label={`Engine ${i + 1} detayları`}
                onClick={() => onInspect("Engine Bleed Port")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onInspect("Engine Bleed Port");
                }}
              >
                <rect x={x - 110} y="57" width="220" height="70" rx="5" />
                <Fan x={x - 78} y={92} rpm={src.rpm} color="hot" />
                <text x={x - 45} y="84" className="node-title">
                  ENGINE {i + 1}
                </text>
                <text x={x - 45} y="107" className="hot-text">
                  {format(src.rpm, 0)}% RPM <tspan className="dim">/</tspan>{" "}
                  {src.available ? "AVAILABLE" : "OFFLINE"}
                </text>
                <circle
                  cx={x + 94}
                  cy="74"
                  r="4"
                  fill={src.available ? "#83dab5" : "#597087"}
                />
              </g>
              <Valve
                x={x}
                y={155}
                position={src.valve}
                label={`ENG ${i + 1} PRSOV`}
                onClick={() => onInspect("PRSOV")}
              />
              <text x={x + 25} y="160" className="diagram-label">
                PRSOV
              </text>
              <g
                className="cooler"
                onClick={() => onInspect("Precooler")}
                role="button"
                tabIndex={0}
                aria-label={`Precooler ${i + 1}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onInspect("Precooler");
                }}
              >
                <rect x={x - 64} y="183" width="128" height="46" rx="3" />
                <path
                  d={`M${x - 44} 203 l10 -10 12 20 12 -20 12 20 12 -20 12 10`}
                />
                <text x={x} y="221" textAnchor="middle">
                  PRECOOLER
                </text>
              </g>
              <path
                d={`M${x - 10} 241 L${x} 251 L${x + 10} 241 M${x - 10} 252 H${x + 10}`}
                className="check-symbol"
                onClick={() => onInspect("Check Valve")}
              />
              {!simplified && (
                <>
                  <text
                    x={x - 91}
                    y="151"
                    textAnchor="end"
                    className="value-small"
                  >
                    {format(src.pressure, 0)} psi
                  </text>
                  <text
                    x={x - 91}
                    y="171"
                    textAnchor="end"
                    className="value-small hot-text"
                  >
                    {format(src.temperature, 0)} °C
                  </text>
                  <text x={x + 78} y="214" className="value-small hot-text">
                    {format(indicated(s, "bleedTemp", i), 0)} °C
                  </text>
                </>
              )}
              {src.protected && (
                <text x={x} y="47" textAnchor="middle" className="fault-text">
                  BLEED PROTECTION
                </text>
              )}
              {s.ductFlow[i] > 0.001 && (
                <g>
                  <Flow
                    d={`M${x} 260 h${i === 0 ? -70 : 70} v-20`}
                    flow={s.ductFlow[i]}
                    color="fault"
                    id={`duct-leak-${i}`}
                  />
                  <text
                    x={x + (i === 0 ? -120 : 73)}
                    y="254"
                    className="fault-text"
                  >
                    LEAK
                  </text>
                </g>
              )}
            </g>
          );
        })}
        <g className="diagram-node">
          <rect x="385" y="57" width="190" height="58" rx="5" />
          <text x="480" y="81" textAnchor="middle" className="node-title">
            APU BLEED
          </text>
          <text x="480" y="101" textAnchor="middle" className="hot-text">
            {format(s.sources[2].rpm, 0)}% · {format(s.sources[2].flow, 2)} kg/s
          </text>
        </g>
        <Flow
          d="M480 115 V167 H335 V260"
          flow={s.sources[2].flow}
          color="hot"
          id="apu"
          highlight={!!traceTarget}
        />
        <Valve
          x={480}
          y={138}
          position={s.sources[2].valve}
          label="APU bleed valve"
          onClick={() => onInspect("Check Valve")}
        />
        <g className="diagram-node ground-cart">
          <rect x="405" y="187" width="150" height="39" rx="3" />
          <text x="480" y="210" textAnchor="middle">
            GROUND AIR
          </text>
        </g>
        <Flow
          d="M405 206 H367 V260"
          flow={s.sources[3].flow}
          color="hot"
          id="ground-cart"
          highlight={!!traceTarget}
        />
        <Flow
          d="M165 260 H260"
          flow={s.sources[0].flow - s.otherFlow[0] - s.ductFlow[0]}
          color="regulated"
          id="left-source-segment"
          highlight={traced(0)}
        />
        <Flow
          d="M260 260 H335"
          flow={s.sources[0].flow - s.supplied[0]}
          color="regulated"
          id="left-pack-segment"
          highlight={traced(0)}
        />
        <Flow
          d="M335 260 H367"
          flow={s.sources[0].flow + s.sources[2].flow - s.supplied[0]}
          color="regulated"
          id="left-apu-segment"
          highlight={traced(0)}
        />
        <Flow
          d="M367 260 H400"
          flow={s.crossflow}
          color="regulated"
          id="left-isolation-segment"
          highlight={traced(0)}
        />
        <Flow
          d="M560 260 H700"
          flow={s.crossflow}
          color="regulated"
          id="right-isolation-segment"
          highlight={traced(1)}
        />
        <Flow
          d="M700 260 H795"
          flow={s.crossflow - s.packs[1].flow}
          color="regulated"
          id="right-source-segment"
          highlight={traced(1)}
        />
        <Flow
          d="M400 260 H560"
          flow={s.crossflow}
          color="regulated"
          id="crossbleed"
          highlight={!!traceTarget}
        />
        <Valve
          x={480}
          y={260}
          position={s.isolation}
          onClick={() => onInspect("isolation")}
          label="Isolation valve detayları"
        />
        <text x="480" y="290" textAnchor="middle" className="diagram-label">
          ISOLATION{" "}
          {s.isolation > 0.99
            ? "OPEN"
            : s.isolation < 0.01
              ? "CLOSED"
              : "TRANSIT"}
        </text>
        {[0, 1].map((i) => {
          const x = i === 0 ? 260 : 700,
            p = s.packs[i];
          return (
            <g key={i}>
              <text
                x={x + 70}
                y="291"
                textAnchor="middle"
                className="manifold-pressure"
              >
                {format(indicated(s, "bleedPressure", i))}
                <tspan className="diagram-label"> PSI</tspan>
              </text>
              <text
                x={x + 70}
                y="309"
                textAnchor="middle"
                className="diagram-note"
              >
                {i === 0 ? "LEFT" : "RIGHT"} MANIFOLD
              </text>
              <Flow
                d={`M${x} 260 V345`}
                flow={p.flow}
                color="regulated"
                id={`pack-in-${i}`}
                highlight={traced(i)}
              />
              <Valve
                x={x}
                y={328}
                position={p.valve}
                label={`Pack ${i + 1} valve`}
                onClick={() => onInspect("Pack Valve")}
              />
              <g
                className={`diagram-node pack-node ${p.trip ? "failed" : ""}`}
                role="button"
                tabIndex={0}
                aria-label={`Pack ${i + 1} neden`}
                onClick={() => onInspect(`pack${i + 1}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onInspect(`pack${i + 1}`);
                }}
              >
                <rect x={x - 143} y="352" width="286" height="98" rx="5" />
                <text x={x - 121} y="378" className="node-title">
                  PACK {i + 1}
                </text>
                <text
                  x={x + 120}
                  y="376"
                  textAnchor="end"
                  className={p.status === "NORMAL" ? "good-text" : "fault-text"}
                >
                  {p.status === "INSUFFICIENT PRESSURE"
                    ? "LOW PRESSURE"
                    : p.status}
                </text>
                <Fan x={x - 111} y={417} rpm={p.rpm} />
                <text x={x - 73} y="418" className="pack-value">
                  {format(indicated(s, "packTemp", i))}
                  <tspan className="diagram-label"> °C</tspan>
                </text>
                <text x={x + 30} y="418" className="pack-value">
                  {format(indicated(s, "packFlow", i), 2)}
                  <tspan className="diagram-label"> kg/s</tspan>
                </text>
                <text x={x - 73} y="436" className="diagram-note">
                  CONDITIONED AIR
                </text>
              </g>
              <Flow
                d={`M${x} 450 V478 H480`}
                flow={p.flow}
                id={`pack-out-${i}`}
                highlight={traced(i)}
              />
              {s.otherFlow[i] > 0.001 && (
                <>
                  <Flow
                    d={`M${x === 260 ? 165 : 795} 260 h${i === 0 ? -110 : 110} v70`}
                    flow={s.otherFlow[i]}
                    color="regulated"
                    id={`other-${i}`}
                  />
                  <text
                    x={i === 0 ? 55 : 905}
                    y="342"
                    textAnchor="middle"
                    className="diagram-note"
                  >
                    LOAD
                  </text>
                </>
              )}
            </g>
          );
        })}
        <Flow
          d="M480 478 V508"
          flow={s.totalFlow}
          id="mix-supply"
          highlight={tracingDestination(traceTarget)}
        />
        <text x="480" y="498" textAnchor="middle" className="diagram-note">
          MIX MANIFOLD · {format(s.mixTemp)} °C
        </text>
        <g
          className="cabin-node"
          onClick={() => onInspect("cabin")}
          role="button"
          tabIndex={0}
          aria-label="Kabin basıncı neden değişiyor"
          onKeyDown={(e) => {
            if (e.key === "Enter") onInspect("cabin");
          }}
        >
          <path d="M287 510 H670 Q710 510 735 545 Q710 580 670 580 H287 Q251 580 229 545 Q250 510 287 510Z" />
          <text x="480" y="537" textAnchor="middle" className="node-title">
            PRESSURIZED CABIN
          </text>
          <text x="480" y="560" textAnchor="middle" className="cabin-value">
            {format(s.cabinAltitude, 0)}{" "}
            <tspan className="diagram-label">ft</tspan>{" "}
            <tspan className="dim"> / </tspan> {format(s.delta, 2)}{" "}
            <tspan className="diagram-label">ΔP psi</tspan>
          </text>
        </g>
        <Flow
          d="M285 565 H176 V478 H480"
          flow={s.recircFlow}
          color="recirc"
          id="recirc"
        />
        <text x="107" y="523" className="diagram-note">
          FILTER
        </text>
        <text x="107" y="542" className="diagram-note">
          RECIRC
        </text>
        <Flow d="M735 545 H910" flow={s.outflow} color="exhaust" id="outflow" />
        <Valve
          x={814}
          y={545}
          position={s.outflowPosition}
          label="Outflow valve"
          onClick={() => onInspect("Outflow Valve")}
        />
        <text x="814" y="585" textAnchor="middle" className="diagram-label">
          OUTFLOW {format(s.outflowPosition * 100, 0)}%
        </text>
        <text x="910" y="524" textAnchor="end" className="diagram-note">
          ATMOSPHERE
        </text>
        {s.leakFlow > 0.001 && (
          <Flow
            d="M590 580 V615 H660"
            flow={s.leakFlow}
            color="exhaust"
            id="cabin-leak"
          />
        )}
        <text x="24" y="624" className="diagram-note">
          Çizgili akış yalnız geçerli ve debisi olan yollarda görünür.
        </text>
        <text x="936" y="624" textAnchor="end" className="diagram-note">
          SCHEMATIC · NOT TO SCALE
        </text>
      </svg>
    </div>
  );
}
export function Legend() {
  return (
    <div className="legend">
      <span>
        <i className="hot" />
        Hot bleed
      </span>
      <span>
        <i className="regulated" />
        Regulated air
      </span>
      <span>
        <i className="cyan" />
        Conditioned air
      </span>
      <span>
        <i className="recirc" />
        Recirculation
      </span>
      <span>
        <i className="exhaust" />
        Exhaust
      </span>
      <span>
        <i className="fault" />
        Fault
      </span>
    </div>
  );
}
export function CabinCutaway({ s }: { s: AircraftState }) {
  const density = Math.round(Math.max(8, Math.min(65, s.cabinPressure / 1600)));
  return (
    <div className="diagram-scroll">
      <svg
        className="cabin-cutaway"
        viewBox="0 0 960 360"
        role="img"
        aria-label="Kabin kesiti; taze hava, recirculation, outflow ve relief yolları"
      >
        <path
          className="fuselage"
          d="M175 74 H755 Q812 76 860 157 L920 185 L856 206 Q815 281 755 281 H180 Q115 275 42 211 L26 184 Q93 91 175 74Z"
        />
        <path className="cabin-floor" d="M88 228 H838 M154 110 H807" />
        <Flow
          d="M80 20 H500 V110 H210 M500 110 H780"
          flow={s.inflow}
          id="cabin-supply"
        />
        <text x="80" y="42" className="diagram-label">
          PACKS → MIX · {format(s.inflow, 2)} kg/s FRESH
        </text>
        {[0, 1, 2].map((i) => {
          const x = 240 + i * 220;
          return (
            <g key={i}>
              <Flow
                d={`M${x} 110 V145 h35 v58`}
                flow={s.zoneFlows[i]}
                id={`zone-${i}`}
              />
              <text
                x={x + 40}
                y="175"
                textAnchor="middle"
                className="zone-value"
              >
                {format(s.zoneTemps[i])}°
              </text>
              <text
                x={x + 40}
                y="195"
                textAnchor="middle"
                className="diagram-note"
              >
                {["COCKPIT", "FORWARD", "AFT"][i]}
              </text>
              <text
                x={x + 40}
                y="217"
                textAnchor="middle"
                className="diagram-label"
              >
                {format(s.zoneFlows[i], 2)} kg/s
              </text>
            </g>
          );
        })}
        {Array.from({ length: density }, (_, i) => (
          <circle
            key={i}
            cx={165 + ((i * 83) % 630)}
            cy={127 + ((i * 47) % 92)}
            r="1.5"
            className="air-molecule"
          />
        ))}
        <Flow
          d="M350 228 V258 H152 V305 H525 V110"
          flow={s.recircFlow}
          color="recirc"
          id="cabin-recirc"
        />
        <text x="182" y="327" className="diagram-label">
          FILTER → RECIRC FAN · {format(s.recircFlow, 2)} kg/s
        </text>
        <Flow
          d="M770 228 V314 H914"
          flow={s.outflow}
          color="exhaust"
          id="cabin-exhaust"
        />
        <Valve
          x={822}
          y={314}
          position={s.outflowPosition}
          label="Gerçek outflow açıklığı"
        />
        <text x="915" y="343" textAnchor="end" className="diagram-label">
          OUTFLOW · {format(s.outflow, 2)} kg/s
        </text>
        <Flow
          d="M680 80 V48 H780"
          flow={s.positiveFlow}
          color="fault"
          id="positive-relief"
        />
        <text x="810" y="49" className="diagram-note">
          + RELIEF
        </text>
        <Flow
          d="M905 96 H837 V135"
          flow={s.negativeFlow}
          color="cyan"
          id="negative-relief"
        />
        <text x="915" y="80" textAnchor="end" className="diagram-note">
          − RELIEF
        </text>
        <Flow
          d="M610 228 V283 H687"
          flow={s.leakFlow}
          color="exhaust"
          id="leak"
        />
        <text x="600" y="305" className="diagram-note">
          LEAK {format(s.leakFlow, 2)}
        </text>
      </svg>
      <p className="diagram-caption">
        Noktaların sayısı kabin basıncıyla orantılı kavramsal yoğunluktur.
        Molekül ölçeğinde fizik değildir; gövde şekli değişmez.
      </p>
    </div>
  );
}
export function ACM({ s, index = 0 }: { s: AircraftState; index?: number }) {
  const p = s.packs[index];
  return (
    <>
      <div className="acm-stages">
        {p.stages.map((stage, i) => (
          <div
            className={`acm-stage ${i === 4 ? "cold" : ""}`}
            key={stage.name}
          >
            <span className="stage-index">0{i + 1}</span>
            <div className="stage-art">
              {i === 2 || i === 4 ? (
                <svg viewBox="0 0 90 60">
                  <Fan
                    x={45}
                    y={30}
                    rpm={p.rpm}
                    color={i === 2 ? "hot" : "cyan"}
                  />
                </svg>
              ) : i === 1 || i === 3 ? (
                <svg viewBox="0 0 90 60">
                  <path
                    className="hx-fins"
                    d="M15 10v40M25 10v40M35 10v40M45 10v40M55 10v40M65 10v40M75 10v40"
                  />
                  <Flow d="M5 20H85M5 40H85" flow={p.ram} color="cyan" />
                </svg>
              ) : (
                <svg viewBox="0 0 90 60">
                  <Flow
                    d="M0 30H90"
                    flow={p.flow}
                    color={i === 0 ? "hot" : "cyan"}
                  />
                </svg>
              )}
            </div>
            <h3>{stage.name}</h3>
            <strong>
              {format(stage.temperature)} <small>°C</small>
            </strong>
            <span>{format(stage.pressure / 1000, 0)} kPa abs</span>
          </div>
        ))}
      </div>
      <div className="acm-shaft">
        <span>COMPRESSOR ← COMMON SHAFT ← TURBINE</span>
        <strong>
          {format(p.rpm, 0)}% <small>temsilî RPM</small>
        </strong>
      </div>
      <div className="inline-metrics">
        <Metric
          label="RAM AIR ETKİNLİĞİ"
          value={format(p.ram * 100, 0)}
          unit="%"
        />
        <Metric label="COOLING CAPACITY" value={format(p.cooling)} unit="kW" />
        <Metric
          label="PACK ÇIKIŞI"
          value={format(p.outletTemp)}
          unit="°C"
          tone="cyan"
        />
      </div>
      <p className="hint">
        Basınçlar mutlak. Primary HX → compressor → secondary HX → turbine; son
        bypass ve water separator aşaması besleme sıcaklığını düzenler. Akış
        yokken sayılar potansiyel koşullardır; şaft ve süreç havası animasyonu
        durur.
      </p>
    </>
  );
}
export interface Curve {
  key: keyof Sample;
  label: string;
  color: string;
}
export function Graph({
  history,
  curves,
  title,
  unit,
  range,
  height = 190,
}: {
  history: Sample[];
  curves: Curve[];
  title: string;
  unit: string;
  range?: [number, number];
  height?: number;
}) {
  const values = history.flatMap((h) => curves.map((c) => h[c.key]));
  const low = range?.[0] ?? Math.min(0, ...values),
    high = range?.[1] ?? Math.max(1, ...values) * 1.1;
  const t0 = history[0]?.time ?? 0,
    t1 = Math.max(t0 + 1, history.at(-1)?.time ?? 1);
  const y = (v: number) =>
    height - 32 - ((v - low) / (high - low)) * (height - 57);
  const x = (t: number) => 48 + ((t - t0) / (t1 - t0)) * 640;
  return (
    <div className="graph">
      <div className="graph-heading">
        <h3>{title}</h3>
        <span>{unit}</span>
      </div>
      <svg
        viewBox={`0 0 720 ${height}`}
        role="img"
        aria-label={`${title}, gerçek simülasyon örnekleri`}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((r) => (
          <g key={r}>
            <line
              x1="48"
              x2="690"
              y1={y(low + (high - low) * r)}
              y2={y(low + (high - low) * r)}
              className="graph-grid"
            />
            <text x="40" y={y(low + (high - low) * r) + 4} textAnchor="end">
              {format(low + (high - low) * r, high > 100 ? 0 : 1)}
            </text>
          </g>
        ))}
        {curves.map((c) => (
          <polyline
            key={c.key}
            fill="none"
            stroke={c.color}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            points={history
              .map((h) => `${x(h.time).toFixed(2)},${y(h[c.key]).toFixed(2)}`)
              .join(" ")}
          />
        ))}
        {[0, 0.5, 1].map((r) => (
          <text
            key={r}
            x={48 + 640 * r}
            y={height - 10}
            textAnchor={r === 0 ? "start" : r === 1 ? "end" : "middle"}
          >
            {format((t0 + (t1 - t0) * r) / 60, 1)} min
          </text>
        ))}
      </svg>
      <div className="graph-legend">
        {curves.map((c) => (
          <span key={c.key}>
            <i style={{ background: c.color }} />
            {c.label}{" "}
            <b>{format(history.at(-1)?.[c.key] ?? 0, unit === "ft" ? 0 : 1)}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
export const altitudeCurves: Curve[] = [
  { key: "aircraft", label: "Aircraft", color: "#eeb96c" },
  { key: "cabin", label: "Cabin", color: "#65d9ed" },
];
export function PressureGraphic({ s }: { s: AircraftState }) {
  return (
    <>
      <div className="altitude-comparison">
        <div className="alt-scale">
          {[40000, 30000, 20000, 10000, 0].map((v) => (
            <span key={v}>{v / 1000}k</span>
          ))}
        </div>
        <div className="alt-bars">
          <div className="alt-column">
            <div
              className="alt-aircraft"
              style={{ height: `${Math.max(2, (s.altitude / 43000) * 100)}%` }}
            >
              <span>✈</span>
            </div>
            <label>
              AIRCRAFT
              <strong>
                {format(s.altitude, 0)} <small>ft</small>
              </strong>
            </label>
          </div>
          <div className="alt-column">
            <div
              className="alt-cabin"
              style={{
                height: `${Math.max(2, (s.cabinAltitude / 43000) * 100)}%`,
              }}
            >
              <span>▰</span>
            </div>
            <label>
              CABIN
              <strong>
                {format(s.cabinAltitude, 0)} <small>ft</small>
              </strong>
            </label>
          </div>
        </div>
        <div className="pressure-equation">
          <span>
            ΔP = P<sub>cabin</sub> − P<sub>outside</sub>
          </span>
          <strong>
            {format(s.delta, 2)} <small>psi</small>
          </strong>
          <div className="delta-meter">
            <i
              style={{
                width: `${Math.min(100, Math.max(0, (s.delta / s.controls.positiveLimit) * 100))}%`,
                background:
                  s.delta > s.controls.positiveLimit - 0.25
                    ? "var(--red)"
                    : "var(--cyan)",
              }}
            />
          </div>
          <p>
            {format(s.cabinPressure / 1000, 2)} −{" "}
            {format(s.outsidePressure / 1000, 2)} kPa
          </p>
          <small>
            Seçili relief sınırı: +{s.controls.positiveLimit} / −
            {s.controls.negativeLimit} psi
          </small>
        </div>
      </div>
      <div className="atmosphere-table">
        {[0, 10000, 20000, 30000, 40000].map((a) => (
          <div key={a}>
            <span>{format(a, 0)} ft</span>
            <strong>
              {format(pressureAtAltitude(a) / 1000)} <small>kPa</small>
            </strong>
          </div>
        ))}
      </div>
    </>
  );
}
export function Balance({ s }: { s: AircraftState }) {
  return (
    <div className="mass-balance">
      <Metric
        label="FRESH INFLOW"
        value={`+${format(s.inflow, 2)}`}
        unit="kg/s"
        tone="cyan"
      />
      <span>−</span>
      <Metric
        label="OUTFLOW + LEAK + RELIEF"
        value={format(
          s.outflow + s.leakFlow + s.positiveFlow - s.negativeFlow,
          2,
        )}
        unit="kg/s"
      />
      <span>=</span>
      <Metric
        label="NET MASS FLOW"
        value={format(s.netFlow, 3)}
        unit="kg/s"
        tone={s.netFlow < -0.02 ? "amber" : "cyan"}
      />
    </div>
  );
}
export function OutflowGauge({ s }: { s: AircraftState }) {
  return (
    <div className="outflow-gauge">
      <svg
        viewBox="0 0 340 220"
        role="img"
        aria-label={`Outflow ${Math.round(s.outflowPosition * 100)} yüzde açık`}
      >
        <Flow d="M0 110H340" flow={s.outflow} color="exhaust" />
        <circle cx="170" cy="110" r="77" className="gauge-outer" />
        <circle cx="170" cy="110" r="59" className="gauge-inner" />
        <line
          x1="170"
          x2="170"
          y1="55"
          y2="165"
          transform={`rotate(${-90 * s.outflowPosition} 170 110)`}
          className="butterfly"
        />
        <text x="170" y="25" textAnchor="middle" className="diagram-label">
          CABIN → ATMOSPHERE
        </text>
        <text x="170" y="210" textAnchor="middle" className="diagram-label">
          0% CLOSED · 100% OPEN
        </text>
      </svg>
      <div className="inline-metrics">
        <Metric
          label="COMMAND"
          value={format(s.outflowCommand * 100, 0)}
          unit="%"
        />
        <Metric
          label="ACTUAL"
          value={format(s.outflowPosition * 100, 0)}
          unit="%"
          tone="cyan"
        />
        <Metric
          label="INDICATED"
          value={format((indicated(s, "outflow") ?? 0) * 100, 0)}
          unit="%"
        />
      </div>
      <div className="relief-indicators">
        <span className={s.positiveFlow > 0.001 ? "active" : ""}>
          + RELIEF <b>{format(s.positiveFlow, 2)} kg/s</b>
        </span>
        <span className={s.negativeFlow > 0.001 ? "active" : ""}>
          − RELIEF <b>{format(s.negativeFlow, 2)} kg/s</b>
        </span>
      </div>
      <p className="hint">
        Valf açıklığı %0–100. Modelde etkin alan açıklığın karesiyle değişir;
        akış basınç farkına göre hesaplanır. Negatif ΔP altında açık outflow da
        içeri hava geçirebilir.
      </p>
    </div>
  );
}
export function SensorTable({ s }: { s: AircraftState }) {
  const rows: [string, number | null, number, string][] = [
    [
      "Cabin pressure",
      indicated(s, "cabinPressure") === null
        ? null
        : (indicated(s, "cabinPressure") ?? 0) / 1000,
      s.cabinPressure / 1000,
      "kPa",
    ],
    ["Cabin altitude", indicated(s, "cabinAltitude"), s.cabinAltitude, "ft"],
    ["Differential", indicated(s, "delta"), s.delta, "psi"],
    [
      "Outflow",
      (indicated(s, "outflow") ?? 0) * 100,
      s.outflowPosition * 100,
      "%",
    ],
    ...[0, 1].flatMap(
      (i) =>
        [
          [
            `Bleed ${i + 1} pressure`,
            indicated(s, "bleedPressure", i),
            s.manifold[i],
            "psi",
          ],
          [
            `Bleed ${i + 1} temperature`,
            indicated(s, "bleedTemp", i),
            s.sources[i].regulatedTemp,
            "°C",
          ],
          [
            `Pack ${i + 1} temperature`,
            indicated(s, "packTemp", i),
            s.packs[i].outletTemp,
            "°C",
          ],
          [
            `Pack ${i + 1} flow`,
            indicated(s, "packFlow", i),
            s.packs[i].flow,
            "kg/s",
          ],
        ] as [string, number | null, number, string][],
    ),
  ];
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Ölçüm</th>
            <th>Indicated</th>
            <th>Actual / referans</th>
            <th>Birim</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, value, actual, unit]) => (
            <tr key={name}>
              <td>{name}</td>
              <td
                className={
                  value === null || Math.abs(value - actual) > 0.01
                    ? "warning-text"
                    : ""
                }
              >
                {format(value, unit === "ft" ? 0 : 2)}
              </td>
              <td>{format(actual, unit === "ft" ? 0 : 2)}</td>
              <td>{unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint">
        Actual, eğitim için bağımsız referanstır; öğrenci kokpit göstergesiyle
        karşılaştırabilir. Cabin pressure sensörü kaybında AUTO, modellenen
        sağlam yedek ölçümü kullanır. 1 psi = {format(PSI / 1000, 3)} kPa.
      </p>
    </div>
  );
}
