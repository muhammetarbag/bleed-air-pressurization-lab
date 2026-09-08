import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AirVent,
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  ChevronRight,
  CircleHelp,
  FlaskConical,
  Gauge,
  Layers,
  Menu,
  Pause,
  Play,
  RotateCcw,
  Search,
  Settings2,
  ShieldAlert,
  SkipForward,
  Snowflake,
  Wind,
  Wrench,
  X,
} from "lucide-react";
import type { AircraftState, Controls } from "./sim/types";
import {
  advance,
  clearFaults,
  createState,
  log,
  pressureAtAltitude,
  setControl,
  setFault,
  startFlight,
  trace,
  why,
} from "./sim/engine";
import { faults } from "./sim/catalog";
import { components, sections, sources, type PageId } from "./content";
import {
  format,
  Metric,
  NetworkControls,
  PackControls,
  Panel,
  PressureControls,
  Range,
  Select,
  SourceControls,
  StatusMetrics,
  ThermalControls,
} from "./components/Controls";
import {
  ACM,
  altitudeCurves,
  Balance,
  CabinCutaway,
  Graph,
  Legend,
  OutflowGauge,
  PressureGraphic,
  SensorTable,
  Synoptic,
} from "./components/Visuals";
import { Learning } from "./components/Learning";
const icons = [
  Layers,
  BookOpen,
  Wind,
  Settings2,
  Snowflake,
  Activity,
  AirVent,
  Gauge,
  ArrowDownToLine,
  Activity,
  ShieldAlert,
  Wrench,
  FlaskConical,
  Settings2,
  Layers,
  BookOpen,
];
const timeText = (t: number) =>
  `${String(Math.floor(t / 3600)).padStart(2, "0")}:${String(Math.floor(t / 60) % 60).padStart(2, "0")}:${String(Math.floor(t) % 60).padStart(2, "0")}`;
function App() {
  const [state] = useState(() => ({ current: createState() }));
  const [revision, setRevision] = useState(0);
  void revision;
  const [page, setPage] = useState<PageId>("overview"),
    [paused, setPaused] = useState(false),
    [speed, setSpeed] = useState(1),
    [level, setLevel] = useState("ENGINEERING"),
    [menu, setMenu] = useState(false),
    [inspect, setInspect] = useState<string | null>(null),
    [traceTarget, setTraceTarget] = useState<
      "pack1" | "pack2" | "cabin" | "cockpit"
    >("pack1"),
    [tracing, setTracing] = useState(false),
    [concealed, setConcealed] = useState(false),
    [faultSearch, setFaultSearch] = useState(""),
    [faultGroup, setFaultGroup] = useState("Tümü"),
    [packIndex, setPackIndex] = useState(0),
    [componentSearch, setComponentSearch] = useState(""),
    [componentIndex, setComponentIndex] = useState(0),
    [overviewTab, setOverviewTab] = useState("Sinoptik"),
    [resetNonce, setResetNonce] = useState(0);
  const redraw = useCallback(() => setRevision((v) => v + 1), []);
  const load = useCallback(
    (next: AircraftState) => {
      state.current = next;
      redraw();
    },
    [redraw],
  );
  const navigate = useCallback((next: PageId) => {
    setPage(next);
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);
  const change = useCallback(
    <K extends keyof Controls>(key: K, value: Controls[K]) => {
      setControl(state.current, key, value);
      advance(state.current, 0);
      redraw();
    },
    [redraw],
  );
  useEffect(() => {
    let frame = 0,
      last = performance.now(),
      acc = 0;
    const loop = (now: number) => {
      const elapsed = Math.min(0.25, (now - last) / 1000);
      last = now;
      acc += elapsed;
      if (!paused && acc >= 0.1) {
        advance(state.current, acc * speed);
        acc = 0;
        redraw();
      } else if (paused) acc = 0;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [paused, speed, redraw]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setInspect(null);
        setMenu(false);
      }
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        setPaused((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!inspect) return;
    const previous = document.activeElement as HTMLElement | null;
    const modal = document.querySelector<HTMLElement>(".inspector");
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !modal) return;
      const items = Array.from(
        modal.querySelectorAll<HTMLElement>(
          'button,a[href],input,select,[tabindex="0"]',
        ),
      );
      if (!items.length) return;
      const first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [inspect]);
  useEffect(() => {
    if (!menu) return;
    document
      .querySelector<HTMLElement>('.sidebar nav [aria-current="page"]')
      ?.focus();
    return () => document.querySelector<HTMLElement>(".mobile-menu")?.focus();
  }, [menu]);
  // Local-only readback supports deterministic browser acceptance tests; no control API is exposed in production.
  useEffect(() => {
    if (import.meta.env.DEV) {
      (
        window as unknown as { __labSnapshot: () => AircraftState }
      ).__labSnapshot = () => structuredClone(state.current);
    }
  }, []);
  const s = state.current,
    c = s.controls,
    meta = sections.find((x) => x[0] === page)!;
  const reset = (preset: "normal" | "ground" | "cruise") => {
    setResetNonce((v) => v + 1);
    load(createState(preset));
    setConcealed(false);
    setPaused(false);
  };
  const fault = (id: string) => {
    setFault(s, id, !s.faults.includes(id));
    redraw();
  };
  const scenario = (id: string) => {
    const next = createState(
      ["apu", "cross", "isolated", "duct"].includes(id) ? "normal" : "cruise",
    );
    if (id === "apu") {
      next.controls.engine = [0, 0];
      next.controls.bleed = [false, false];
      next.controls.apuMaster = true;
      next.controls.apuStart = true;
      next.controls.apuBleed = true;
      next.controls.isolation = true;
    }
    if (id === "cross" || id === "isolated") {
      setFault(next, "bleed_fail_0", true);
      next.controls.isolation = true;
      if (id === "isolated") setFault(next, "iso_closed", true);
    }
    if (id === "duct") setFault(next, "duct_leak_0", true);
    if (id === "slow") setFault(next, "cabin_leak", true);
    if (id === "rapid") setFault(next, "rapid_leak", true);
    if (id === "open") setFault(next, "outflow_open", true);
    if (id === "overpressure") {
      setFault(next, "outflow_closed", true);
      next.controls.altitudeTarget = 40000;
    }
    if (id === "negative") {
      next.cabinPressure = pressureAtAltitude(40000);
      next.cabinAltitude = 40000;
      next.controls.altitudeTarget = 0;
      next.controls.verticalSpeed = 10000;
      next.controls.pressureMode = "MANUAL";
      next.controls.manualOutflow = 0;
      next.outflowPosition = 0;
    }
    if (id === "packs") {
      setFault(next, "pack_closed_0", true);
      setFault(next, "pack_closed_1", true);
    }
    setResetNonce((v) => v + 1);
    load(next);
    setPaused(false);
    setConcealed(false);
  };
  const statusPanel = (
    <Panel
      title="Sistem durumu"
      kicker="LIVE SYSTEM STATUS"
      className="status-panel"
    >
      <div className="status-rows">
        {s.sources.slice(0, 3).map((src, i) => (
          <div key={src.name}>
            <span>
              <i className={`status-dot ${src.flow > 0.001 ? "on" : ""}`} />
              {src.name} BLEED
            </span>
            <b className={src.protected ? "warning-text" : ""}>
              {src.protected
                ? "PROTECTED"
                : src.flow > 0.001
                  ? "SUPPLYING"
                  : "NO FLOW"}
            </b>
            <small>{format(src.flow, 2)} kg/s</small>
            <button
              aria-label={`${src.name} neden`}
              onClick={() => setInspect(i === 1 ? "right" : "left")}
            >
              WHY?
            </button>
          </div>
        ))}
        {s.packs.map((p, i) => (
          <div key={i}>
            <span>
              <i className={`status-dot ${p.flow > 0.01 ? "on" : ""}`} />
              PACK {i + 1}
            </span>
            <b className={p.status !== "NORMAL" ? "warning-text" : ""}>
              {p.status}
            </b>
            <small>{format(p.outletTemp)} °C</small>
            <button onClick={() => setInspect(`pack${i + 1}`)}>WHY?</button>
          </div>
        ))}
      </div>
      <div className={`system-alert ${s.warnings.length ? "has-warning" : ""}`}>
        <Activity size={16} />
        <div>
          <strong>
            {s.warnings.length
              ? `${s.warnings.length} AKTİF UYARI`
              : "SİSTEM NORMAL"}
          </strong>
          <p>{s.warnings[0] ?? "Kaynak, pack ve kabin ölçümleri izleniyor."}</p>
        </div>
      </div>
      {s.warnings.slice(1, 5).map((w) => (
        <p className="warning-line" key={w}>
          {w}
        </p>
      ))}
    </Panel>
  );
  const eventPanel = (
    <Panel
      title="Olay kaydı"
      kicker={`${s.events.length} EVENT`}
      extra={
        <button
          onClick={() => {
            const blob = new Blob([JSON.stringify(s.events, null, 2)], {
              type: "application/json",
            });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "bleed-lab-events.json";
            a.click();
            URL.revokeObjectURL(a.href);
          }}
        >
          Dışa aktar
        </button>
      }
    >
      <div className="event-log">
        {s.events
          .slice(-18)
          .reverse()
          .map((e, i) => (
            <div className={`event ${e.kind}`} key={`${e.time}-${i}`}>
              <time>{timeText(e.time)}</time>
              <p>{e.text}</p>
            </div>
          ))}
      </div>
      <p className="hint">
        En yeni olay üstte. Kayıtlar gerçek durum geçişleri ve kontrol
        eylemlerinden üretilir.
      </p>
    </Panel>
  );
  const sensorPanel = (
    <Panel title="Actual / indicated" kicker="BAĞIMSIZ REFERANS ÖLÇÜMLERİ">
      <SensorTable s={s} />
    </Panel>
  );
  const tracePanel = (
    <div className="trace-panel">
      <div className="trace-controls">
        <button
          className={tracing ? "active" : ""}
          onClick={() => setTracing(!tracing)}
        >
          <Search size={14} /> TRACE AIRFLOW
        </button>
        <Select
          label="Hedef"
          value={traceTarget}
          items={["pack1", "pack2", "cabin", "cockpit"]}
          onChange={setTraceTarget}
        />
      </div>
      {tracing && (
        <div className="trace-routes">
          {trace(s, traceTarget).length ? (
            trace(s, traceTarget).map((path, i) => (
              <p key={i}>
                {path.map((node, j) => (
                  <span key={j}>
                    {j > 0 && <ChevronRight size={12} />}
                    <b>{node}</b>
                  </span>
                ))}
              </p>
            ))
          ) : (
            <p className="warning-text">
              Geçerli taze hava yolu yok. Kaynak, valf ve basıncı kontrol et.
            </p>
          )}
        </div>
      )}
    </div>
  );
  const graphGrid = (
    <div className="graph-grid-layout">
      <Graph
        history={s.history}
        title="Aircraft / cabin altitude"
        unit="ft"
        curves={altitudeCurves}
      />
      <Graph
        history={s.history}
        title="Differential pressure"
        unit="psi"
        curves={[{ key: "delta", label: "ΔP", color: "#83dab5" }]}
      />
      <Graph
        history={s.history}
        title="Outflow valve opening"
        unit="%"
        range={[0, 100]}
        curves={[{ key: "outflow", label: "Opening", color: "#a5a2fb" }]}
      />
      <Graph
        history={s.history}
        title="Cabin vertical speed"
        unit="ft/min"
        curves={[{ key: "rate", label: "Cabin rate", color: "#65d9ed" }]}
      />
    </div>
  );
  const failurePanel = (
    <Panel
      title="Arıza ekle / kaldır"
      kicker={`${faults.length} AYRI ARIZA · ORTAK SİSTEM DURUMU`}
      extra={
        <button
          onClick={() => {
            clearFaults(s);
            redraw();
          }}
        >
          Clear failures / rearm
        </button>
      }
    >
      {concealed ? (
        <div className="empty">
          <ShieldAlert />
          <h3>Teşhis görevi sürüyor</h3>
          <p>Arıza adları görev boyunca gizli. Ölçüm araçlarıyla teşhis koy.</p>
          <button onClick={() => navigate("troubleshooting")}>
            Teşhis ekranı →
          </button>
        </div>
      ) : (
        <>
          <div className="filter-row">
            <label className="search">
              <Search size={16} />
              <input
                aria-label="Arıza ara"
                placeholder="Valf, sensör, pack…"
                value={faultSearch}
                onChange={(e) => setFaultSearch(e.target.value)}
              />
            </label>
            <Select
              label="Grup"
              value={faultGroup}
              items={["Tümü", ...new Set(faults.map((f) => f.group))]}
              onChange={setFaultGroup}
            />
          </div>
          <div className="fault-grid">
            {faults
              .filter(
                (f) =>
                  (faultGroup === "Tümü" || f.group === faultGroup) &&
                  (f.label + " " + f.symptom)
                    .toLocaleLowerCase("tr")
                    .includes(faultSearch.toLocaleLowerCase("tr")),
              )
              .map((f) => (
                <button
                  className={`fault-card ${s.faults.includes(f.id) ? "injected" : ""}`}
                  key={f.id}
                  aria-pressed={s.faults.includes(f.id)}
                  onClick={() => fault(f.id)}
                >
                  <span>
                    {f.group}
                    <b>{s.faults.includes(f.id) ? "ACTIVE" : "INJECT +"}</b>
                  </span>
                  <strong>{f.label}</strong>
                  <small>{f.symptom}</small>
                </button>
              ))}
          </div>
          <p className="hint">
            Birlikte uygulanabilen arızalar birleşir. Karşıt stuck open / closed
            arızaları birbirini kaldırır. Sıcaklık koruması kilitlidir: arıza
            kaldırıldıktan ve sistem soğuduktan sonra yeniden kur.
          </p>
        </>
      )}
    </Panel>
  );
  return (
    <div
      className={`app ${paused ? "paused" : ""} level-${level.toLowerCase()}`}
    >
      <a className="skip-link" href="#main">
        İçeriğe geç
      </a>
      <aside className={`sidebar ${menu ? "mobile-open" : ""}`}>
        <a
          className="brand"
          href="#overview"
          onClick={(e) => {
            e.preventDefault();
            navigate("overview");
          }}
        >
          <span className="brand-mark">
            <Wind size={26} />
          </span>
          <span>
            BLEED AIR
            <span>
              & PRESSURIZATION <b>LAB</b>
            </span>
          </span>
        </a>
        <div className="sidebar-caption">AIRCRAFT SYSTEMS LABORATORY</div>
        <div className="sidebar-section">
          ÇALIŞMA ALANI <span>ATA 21 / 36</span>
        </div>
        <nav aria-label="Ana bölümler">
          {sections.map(([id, label], i) => {
            const Icon = icons[i];
            return (
              <button
                key={id}
                onClick={() => navigate(id)}
                className={page === id ? "active" : ""}
                aria-current={page === id ? "page" : undefined}
              >
                <Icon size={16} />
                <span>{label}</span>
                {page === id && <i />}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div>
            <i className="status-dot on" /> GENERIC TWIN ENGINE
          </div>
          <p>
            Havayı görünür kıl.
            <br />
            Sistemi deneyerek öğren.
          </p>
          <span>EDUCATIONAL MODEL / v1.0</span>
        </div>
      </aside>
      {menu && (
        <button
          className="sidebar-scrim"
          onClick={() => setMenu(false)}
          aria-label="Menüyü kapat"
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu"
              onClick={() => setMenu(!menu)}
              aria-label="Menüyü aç"
            >
              <Menu size={20} />
            </button>
            <span>LABORATORIES</span>
            <ChevronRight size={13} />
            <b>ATA 21 / 36</b>
          </div>
          <div className="topbar-right">
            <Select
              label="Öğrenme seviyesi"
              value={level}
              items={["BASIC", "ENGINEERING", "MAINTENANCE"]}
              onChange={setLevel}
            />
            <span className="local-badge">
              <i className="status-dot on" /> LOCAL SIMULATION
            </span>
          </div>
        </header>
        <main id="main">
          <div className="page-title">
            <div>
              <span className="eyebrow">ATA 21 / ATA 36 · {meta[2]}</span>
              <h1>
                {page === "overview" ? (
                  <>
                    BLEED AIR <span>&</span>
                    <br className="title-break" /> PRESSURIZATION LAB
                  </>
                ) : (
                  meta[1]
                )}
              </h1>
              <p>
                {page === "overview"
                  ? "Interactive Pneumatic, Air Conditioning & Cabin Pressure Simulator"
                  : meta[3]}
              </p>
            </div>
            <div className="title-tag">
              <span>MAKE THE INVISIBLE</span>
              <strong>VISIBLE.</strong>
              <Wind size={29} />
            </div>
          </div>
          <div className="sim-toolbar">
            <div className="simulation-state">
              <i className={`status-dot ${paused ? "" : "on"}`} />
              <strong>{paused ? "PAUSED" : "SIMULATION LIVE"}</strong>
              <time>{timeText(s.time)}</time>
            </div>
            <div className="play-controls">
              <button
                className="icon-button"
                aria-label={
                  paused ? "Simülasyonu başlat" : "Simülasyonu duraklat"
                }
                onClick={() => setPaused(!paused)}
              >
                {paused ? <Play size={16} /> : <Pause size={16} />}
              </button>
              <button
                className="icon-button"
                aria-label="Bir saniye ilerlet"
                onClick={() => {
                  setPaused(true);
                  advance(s, 1);
                  redraw();
                }}
              >
                <SkipForward size={16} />
              </button>
              <div className="speed-select">
                {[1, 2, 5, 10, 30].map((v) => (
                  <button
                    key={v}
                    className={speed === v ? "active" : ""}
                    aria-label={`Hız ${v}x`}
                    onClick={() => setSpeed(v)}
                  >
                    {v}×
                  </button>
                ))}
              </div>
            </div>
            <div className="reset-controls">
              <button onClick={() => reset("normal")}>
                <RotateCcw size={13} /> NORMAL
              </button>
              <button onClick={() => reset("ground")}>GROUND</button>
              <button onClick={() => reset("cruise")}>CRUISE</button>
            </div>
          </div>
          <StatusMetrics s={s} />
          {page === "overview" && (
            <>
              <div className="workspace-grid">
                <div className="stack">
                  <Panel
                    title="Pneumatic & cabin synoptic"
                    kicker="LIVE AIRFLOW / SHARED SYSTEM"
                    extra={
                      <div className="tabs compact">
                        {["Sinoptik", "Kabin kesiti"].map((x) => (
                          <button
                            key={x}
                            className={overviewTab === x ? "active" : ""}
                            onClick={() => setOverviewTab(x)}
                          >
                            {x}
                          </button>
                        ))}
                      </div>
                    }
                    className="synoptic-panel"
                  >
                    {overviewTab === "Sinoptik" ? (
                      <Synoptic
                        s={s}
                        onInspect={setInspect}
                        traceTarget={tracing ? traceTarget : ""}
                        simplified={level === "BASIC"}
                      />
                    ) : (
                      <CabinCutaway s={s} />
                    )}
                    <Legend />
                    {tracePanel}
                  </Panel>
                  <div className="two-column">
                    <Panel
                      title="Basınçlandırma dengesi"
                      kicker="AIR IN / AIR OUT"
                    >
                      <Balance s={s} />
                      <p className="hint">
                        Packler taze hava sağlar. Outflow valve, havanın
                        çıkışını ayarlayarak kabin basıncını düzenler.
                      </p>
                      <button onClick={() => navigate("pressure")}>
                        Basınç laboratuvarını aç <ArrowRight size={14} />
                      </button>
                    </Panel>
                    <Panel title="İlk deneyi yap" kicker="GUIDED EXPERIMENT">
                      <h3>Tek motor. İki pack.</h3>
                      <p>
                        ENG 1 bleed kaybından sonra isolation aç. Sağ kaynağın
                        sol packe ulaşmasını izle.
                      </p>
                      <button
                        className="primary"
                        onClick={() => {
                          scenario("cross");
                          setTracing(true);
                          setTraceTarget("pack1");
                        }}
                      >
                        Crossbleed deneyini başlat <ArrowRight size={14} />
                      </button>
                    </Panel>
                  </div>
                </div>
                <div className="stack">
                  <Panel title="Kaynak kontrolleri" kicker="SOURCE CONTROL">
                    <SourceControls s={s} change={change} compact />
                    <div className="divider" />
                    <NetworkControls s={s} change={change} />
                  </Panel>
                </div>
              </div>
              <div className="two-column">
                {statusPanel}
                {eventPanel}
              </div>
              <div className="two-column">
                <Panel title="Kabin irtifa eğrisi" kicker="LIVE HISTORY">
                  <Graph
                    history={s.history}
                    title="Aircraft / cabin"
                    unit="ft"
                    curves={altitudeCurves}
                  />
                </Panel>
                <Panel
                  title="Nasıl kullanılır?"
                  kicker="KONTROL → ÖLÇÜM → AÇIKLAMA"
                >
                  <p>
                    Kaynak ve valfleri değiştir. Şemadaki bileşenlere tıklayarak
                    güncel durumun nedenini öğren.
                  </p>
                  <p>
                    TRACE AIRFLOW ile açık besleme yolunu seç. Rehberli
                    deneylerde gerçek ölçümlerle hedefleri tamamla.
                  </p>
                  <button onClick={() => navigate("labs")}>
                    Deneylere git →
                  </button>
                </Panel>
              </div>
            </>
          )}
          {page === "fundamentals" && (
            <>
              <Panel
                title="Enerji, hava ve kontrol"
                kicker="BİR SİSTEM · İKİ AKIŞ"
              >
                <div className="architecture">
                  {[
                    "ENGINES / APU",
                    "BLEED SOURCES",
                    "PNEUMATIC MANIFOLD",
                    "PACKS",
                    "MIX MANIFOLD",
                    "CABIN",
                    "OUTFLOW",
                    "ATMOSPHERE",
                  ].map((x, i) => (
                    <button
                      key={x}
                      onClick={() =>
                        setInspect(
                          [
                            "Engine Bleed Port",
                            "PRSOV",
                            "Pneumatic Manifold",
                            "Pack Valve",
                            "Mix Manifold",
                            "cabin",
                            "Outflow Valve",
                            "delta",
                          ][i],
                        )
                      }
                    >
                      <span>{x}</span>
                      <small>
                        {
                          [
                            `${format(
                              s.sources.reduce((a, x) => a + x.flow, 0),
                              2,
                            )} kg/s`,
                            `${format(s.sources[0].regulatedTemp)} °C`,
                            `${format(s.manifold[0])} psi`,
                            `${format(s.packs[0].outletTemp)} °C`,
                            `${format(s.mixTemp)} °C`,
                            `${format(s.cabinPressure / 1000)} kPa`,
                            `${format(s.outflowPosition * 100, 0)}% open`,
                            `${format(s.outsidePressure / 1000)} kPa`,
                          ][i]
                        }
                      </small>
                      <ArrowRight size={17} />
                    </button>
                  ))}
                </div>
                <div className="feedback-loop">
                  <Activity size={20} />
                  <span>
                    SENSORS <ArrowRight size={14} /> CONTROLLER{" "}
                    <ArrowRight size={14} /> OUTFLOW COMMAND{" "}
                    <ArrowRight size={14} /> CABIN PRESSURE{" "}
                    <ArrowRight size={14} /> SENSORS
                  </span>
                  <button
                    onClick={() => setInspect("Cabin Pressure Controller")}
                  >
                    Feedback döngüsü
                  </button>
                </div>
              </Panel>
              <div className="three-column">
                {[
                  [
                    "Kompresör işi",
                    "Motorun kompresörü havaya iş verir. Basınç ve sıcaklık yükselir; ham bleed air kabine doğrudan verilemez.",
                    "Engine Bleed Port",
                  ],
                  [
                    "Isıyı dışarı taşı",
                    "Precooler ve eşanjörler ayrı bir soğutma akımına ısı aktarır. Ram air, pnömatik süreç havasıyla karışmaz.",
                    "Heat Exchanger",
                  ],
                  [
                    "Genişlemeyle soğut",
                    "ACM türbini hava genişlerken şaft işi çeker. Hava soğur; bypass istenen besleme sıcaklığını oluşturur.",
                    "ACM Turbine",
                  ],
                ].map(([title, text, component]) => (
                  <Panel title={title} key={title}>
                    <p>{text}</p>
                    <button onClick={() => setInspect(component)}>
                      Bileşeni incele →
                    </button>
                  </Panel>
                ))}
              </div>
              <Panel
                title="Modelin denklemleri ve sınırları"
                kicker="ŞEFFAF VARSAYIMLAR"
              >
                <div className="theory-grid">
                  <article>
                    <code>dP / dt = R T / V × (ṁin − ṁout)</code>
                    <p>
                      Kabin, sabit hacimde ve basınç hesabı için 295 K kabul
                      edilen ideal gazdır. Isıl bölgeler ayrı bir birinci
                      mertebe enerji dengesiyle evrilir.
                    </p>
                  </article>
                  <article>
                    <code>ΔP = Pcab − Pout</code>
                    <p>
                      Cabin altitude aynı atmosfer bağıntısının tersinden gelir.
                      Troposferin üzerinde 11 km geçişinde sürekli izotermal
                      katman kullanılır.
                    </p>
                  </article>
                  <article>
                    <code>Σ source flow(P) = Σ demand(P)</code>
                    <p>
                      Manifold basıncı, sonlu kaynak eğrileri ile açık yüklerin
                      denge noktasından çözülür. Check valfler ters kaynak
                      akışını keser.
                    </p>
                  </article>
                  <article>
                    <code>Czone dT / dt = ṁ cp (Ts − T) + Q</code>
                    <p>
                      Isıl kütle, yolcu ve çevre ısı yükü, dış sıcaklık, taze ve
                      recirculation akışları kabini zamanla değiştirir.
                    </p>
                  </article>
                </div>
                <p className="hint">
                  Orifis akışı sıkışabilir ve kritik basınç oranında
                  boğulabilir. Valfler zamanla hareket eder; sayısal alt adım
                  ≤0,1 s. ACM, ısı değiştirici ve pnömatik kapasiteler
                  temsilîdir. CFD, tip sertifikası veya üretici kontrol yazılımı
                  değildir.
                </p>
                <div className="source-links">
                  {sources.map((x) => (
                    <a
                      href={x.url}
                      target="_blank"
                      rel="noreferrer"
                      key={x.url}
                    >
                      <strong>{x.title} ↗</strong>
                      <span>{x.note}</span>
                    </a>
                  ))}
                </div>
              </Panel>
            </>
          )}
          {page === "engine" && (
            <div className="workspace-grid">
              <div className="stack">
                <Panel
                  title="Compressor → PRSOV → precooler"
                  kicker="HAM ENERJİDEN REGÜLE HAVAYA"
                >
                  <Synoptic s={s} onInspect={setInspect} />
                  <Legend />
                </Panel>
                <div className="two-column">
                  {s.sources.slice(0, 2).map((src, i) => (
                    <Panel
                      key={i}
                      title={`Engine ${i + 1} bleed`}
                      kicker={src.protected ? "PROTECTED" : "LIVE SOURCE"}
                    >
                      <div className="inline-metrics">
                        <Metric
                          label="SOURCE"
                          value={format(src.pressure)}
                          unit="psi"
                        />
                        <Metric
                          label="REGULATED"
                          value={format(src.regulatedPressure)}
                          unit="psi"
                        />
                        <Metric
                          label="MASS FLOW"
                          value={format(src.flow, 2)}
                          unit="kg/s"
                        />
                      </div>
                      <div className="temperature-transfer">
                        <span>
                          HOT BLEED <b>{format(src.temperature, 0)} °C</b>
                        </span>
                        <ArrowRight />
                        <span>
                          PRECOOLER <b>{format(src.regulatedTemp, 0)} °C</b>
                        </span>
                      </div>
                      <p>
                        Command {src.command * 100}% · Actual{" "}
                        {format(src.valve * 100, 0)}% · Capacity{" "}
                        {format(src.capacity, 2)} kg/s
                      </p>
                      <button
                        className={
                          s.faults.includes(`precooler_${i}`)
                            ? "danger"
                            : "subtle"
                        }
                        onClick={() => fault(`precooler_${i}`)}
                      >
                        Precooler ineffective{" "}
                        {s.faults.includes(`precooler_${i}`)
                          ? "kaldır"
                          : "ekle"}
                      </button>
                      <button onClick={() => setInspect("Precooler")}>
                        Neden soğutuyoruz?
                      </button>
                    </Panel>
                  ))}
                </div>
                <Panel title="Precooler sıcaklık deneyi">
                  <Range
                    label="Ham bleed sıcaklık sapması"
                    min={-50}
                    max={150}
                    value={c.hotBias}
                    unit="°C"
                    onChange={(v) => change("hotBias", v)}
                  />
                  <p>
                    Motor gücünü sabit tutup giriş ısı yükünü artır. Soğutma
                    yetersiz kalırsa 265 °C temsilî çıkış sınırı bleed
                    korumasını tetikler.
                  </p>
                </Panel>
                {eventPanel}
              </div>
              <Panel title="Kaynak ve precooler kontrolleri">
                <SourceControls s={s} change={change} />
                <NetworkControls s={s} change={change} />
              </Panel>
            </div>
          )}
          {page === "manifold" && (
            <div className="workspace-grid">
              <div className="stack">
                <Panel
                  title="Sol / sağ manifold"
                  kicker="KAPASİTE VE TALEP DENGESİ"
                  extra={
                    <button onClick={() => setInspect("isolation")}>
                      WHY ISOLATION?
                    </button>
                  }
                >
                  <Synoptic
                    s={s}
                    onInspect={setInspect}
                    traceTarget={tracing ? traceTarget : ""}
                  />
                  {tracePanel}
                  <div className="capacity-cards">
                    {[0, 1].map((i) => (
                      <div key={i}>
                        <strong>{i === 0 ? "LEFT" : "RIGHT"} MANIFOLD</strong>
                        <span>{format(s.manifold[i])} psi</span>
                        <progress
                          max={Math.max(1, s.capacity[i], s.demand[i])}
                          value={s.supplied[i]}
                        />
                        <p>
                          Bağlı kapasite {format(s.capacity[i], 2)} · yerel
                          talep {format(s.demand[i], 2)} kg/s
                        </p>
                        <b
                          className={
                            s.supplied[i] < s.demand[i] * 0.85
                              ? "warning-text"
                              : "good"
                          }
                        >
                          {s.supplied[i] < s.demand[i] * 0.85
                            ? "INSUFFICIENT FLOW"
                            : s.demand[i] > s.capacity[i] * 0.75
                              ? "HIGH DEMAND"
                              : "NORMAL"}
                        </b>
                      </div>
                    ))}
                  </div>
                  <p className="hint">
                    Isolation açıkken iki tarafta gösterilen bağlı kapasite aynı
                    ortak havuzdur; iki kez toplanmaz.
                  </p>
                </Panel>
                <Panel title="Crossbleed senaryoları">
                  <div className="scenario-grid">
                    <button onClick={() => reset("normal")}>
                      A · İki normal kaynak
                    </button>
                    <button onClick={() => scenario("cross")}>
                      B · ENG 1 kayıp, isolation açık
                    </button>
                    <button onClick={() => scenario("isolated")}>
                      C · Isolation stuck closed
                    </button>
                    <button onClick={() => scenario("apu")}>
                      D · Yerde APU kaynağı
                    </button>
                  </div>
                </Panel>
                <Panel title="Pnömatik zaman çizgisi">
                  <Graph
                    history={s.history}
                    title="Manifold pressure"
                    unit="psi"
                    curves={[
                      { key: "left", label: "Left", color: "#eeb96c" },
                      { key: "right", label: "Right", color: "#65d9ed" },
                    ]}
                  />
                  <Graph
                    history={s.history}
                    title="Toplam pnömatik talep"
                    unit="kg/s"
                    curves={[
                      { key: "demand", label: "Talep", color: "#a5a2fb" },
                    ]}
                  />
                </Panel>
              </div>
              <div className="stack">
                <Panel title="Valfler ve talep">
                  <NetworkControls s={s} change={change} />
                </Panel>
                <Panel title="Kaynaklar">
                  <SourceControls s={s} change={change} compact />
                </Panel>
              </div>
            </div>
          )}
          {(page === "packs" || page === "acm") && (
            <div className="workspace-grid">
              <div className="stack">
                <Panel
                  title={
                    page === "acm"
                      ? "Air cycle machine"
                      : "İki pack, ortak kabin"
                  }
                  kicker="THERMODYNAMIC PROCESS"
                  extra={
                    <div className="tabs compact">
                      {[0, 1].map((i) => (
                        <button
                          key={i}
                          className={packIndex === i ? "active" : ""}
                          onClick={() => setPackIndex(i)}
                        >
                          PACK {i + 1}
                        </button>
                      ))}
                    </div>
                  }
                >
                  <ACM s={s} index={packIndex} />
                </Panel>
                <Panel
                  title="Ram air / heat exchanger"
                  kicker="SOĞUTMA HAVASI AYRI BİR AKIŞTIR"
                >
                  <div className="ram-visual">
                    <Wind
                      size={60}
                      className={
                        s.packs[packIndex].ram > 0.01 ? "cyan-text" : "muted"
                      }
                    />
                    <div>
                      <span className="eyebrow">
                        {c.ground ? "GROUND · FAN ASSIST" : "FLIGHT · RAM AIR"}
                      </span>
                      <h3>
                        {format(c.airspeed, 0)} kt{" "}
                        <span className="muted">/</span> door{" "}
                        {format(c.ramDoor * 100, 0)}%
                      </h3>
                      <p>
                        Etkinlik {format(s.packs[packIndex].ram * 100, 0)}% ·
                        Dış hava {format(s.outsideTemp)} °C
                      </p>
                    </div>
                    <div className="ram-bars">
                      {Array.from({ length: 12 }, (_, i) => (
                        <i
                          key={i}
                          className={
                            i < s.packs[packIndex].ram * 12 ? "active" : ""
                          }
                        />
                      ))}
                    </div>
                  </div>
                  <p>
                    Ram-air door ve hız/fan, eşanjör etkinliğini değiştirir.
                    Bypass hedefi koruyabiliyorsa pack çıkışı sabit kalabilir;
                    cold-end sıcaklığı ve soğutma marjı değişmeye devam eder.
                  </p>
                </Panel>
                <Panel title="Pack 1 sıcaklık geçmişi">
                  <Graph
                    history={s.history}
                    title="Inlet / outlet temperature"
                    unit="°C"
                    curves={[
                      { key: "packIn", label: "Inlet", color: "#eeb96c" },
                      { key: "packOut", label: "Outlet", color: "#65d9ed" },
                    ]}
                  />
                </Panel>
                <Panel title="Pack durumunu açıkla">
                  <div className="actions">
                    {[0, 1].map((i) => (
                      <button
                        key={i}
                        onClick={() => setInspect(`pack${i + 1}`)}
                      >
                        WHY PACK {i + 1}?
                      </button>
                    ))}
                    <button onClick={() => navigate("failures")}>
                      Pack arızası ekle →
                    </button>
                  </div>
                </Panel>
              </div>
              <div className="stack">
                <Panel title="Pack ve ram-air kontrolleri">
                  <PackControls s={s} change={change} />
                </Panel>
                {statusPanel}
              </div>
            </div>
          )}
          {page === "distribution" && (
            <div className="workspace-grid">
              <div className="stack">
                <Panel
                  title="Kabin kesiti ve hava dağıtımı"
                  kicker="FRESH AIR + FILTERED RECIRCULATION"
                >
                  <CabinCutaway s={s} />
                  <Legend />
                </Panel>
                <div className="three-column">
                  {s.zoneTemps.map((t, i) => (
                    <Panel
                      key={i}
                      title={["Cockpit", "Forward cabin", "Aft cabin"][i]}
                    >
                      <Metric
                        label="CURRENT TEMPERATURE"
                        value={format(t)}
                        unit="°C"
                        tone="cyan"
                      />
                      <p>Hedef {c.zoneTarget[i]} °C</p>
                      <p>
                        Supply {format(s.zoneSupply[i])} °C ·{" "}
                        {format(s.zoneFlows[i], 2)} kg/s
                      </p>
                    </Panel>
                  ))}
                </div>
                <Panel title="Mix manifold kütle ve sıcaklık dengesi">
                  <div className="inline-metrics">
                    <Metric
                      label="FRESH AIR"
                      value={format(s.inflow, 2)}
                      unit="kg/s"
                    />
                    <Metric
                      label="RECIRCULATION"
                      value={format(s.recircFlow, 2)}
                      unit="kg/s"
                    />
                    <Metric
                      label="TOTAL SUPPLY"
                      value={format(s.totalFlow, 2)}
                      unit="kg/s"
                    />
                    <Metric
                      label="MIX TEMPERATURE"
                      value={format(s.mixTemp)}
                      unit="°C"
                    />
                  </div>
                  <p>
                    Recirculation fanları kabindeki havayı filtre üzerinden geri
                    getirir. Kapandıklarında bu modelin fresh-air talebi artar.
                    Recirculation, kabine net kütle eklemez.
                  </p>
                  <Graph
                    history={s.history}
                    title="Ortalama kabin sıcaklığı"
                    unit="°C"
                    curves={[
                      { key: "temperature", label: "Cabin", color: "#65d9ed" },
                    ]}
                  />
                </Panel>
              </div>
              <Panel title="Bölgeler ve ısı yükü">
                <ThermalControls s={s} change={change} />
                <div className="divider" />
                <PackControls s={s} change={change} />
              </Panel>
            </div>
          )}
          {(page === "pressure" || page === "outflow") && (
            <div className="workspace-grid">
              <div className="stack">
                <Panel
                  title={
                    page === "pressure"
                      ? "Aynı uçak, iki farklı irtifa"
                      : "Outflow: giriş ile çıkış arasındaki denge"
                  }
                  kicker="CABIN PRESSURE ≠ AIRCRAFT ALTITUDE"
                  extra={
                    <button onClick={() => setInspect("cabin")}>
                      WHY CABIN RATE?
                    </button>
                  }
                >
                  {page === "pressure" ? (
                    <PressureGraphic s={s} />
                  ) : (
                    <OutflowGauge s={s} />
                  )}
                  <Balance s={s} />
                  <p className="hint">
                    Pozitif cabin rate: kabin irtifası artıyor, basınç düşüyor.
                    Negatif cabin rate: kabin irtifası azalıyor, basınç
                    yükseliyor.
                  </p>
                </Panel>
                <Panel title="Kabin havasının çıkış yolları">
                  <CabinCutaway s={s} />
                  <div className="actions">
                    <button onClick={() => setInspect("delta")}>WHY ΔP?</button>
                    <button onClick={() => setInspect("Positive Relief Valve")}>
                      Positive relief
                    </button>
                    <button onClick={() => setInspect("Negative Relief Valve")}>
                      Negative relief
                    </button>
                  </div>
                </Panel>
                <Panel title="Basınç senaryoları">
                  <div className="scenario-grid">
                    <button onClick={() => scenario("slow")}>
                      Slow decompression
                    </button>
                    <button onClick={() => scenario("rapid")}>
                      Rapid decompression
                    </button>
                    <button onClick={() => scenario("open")}>
                      Outflow fully open
                    </button>
                    <button onClick={() => scenario("overpressure")}>
                      Overpressure / relief
                    </button>
                    <button onClick={() => scenario("negative")}>
                      Negative differential
                    </button>
                    <button onClick={() => scenario("packs")}>
                      İki pack kaybı
                    </button>
                  </div>
                </Panel>
                <Panel title="Can the packs keep up?">
                  <Balance s={s} />
                  <p>
                    Outflow %0 iken kaçak hâlâ girişten büyükse basınç programı
                    korunamaz. Mevcut program {format(s.referenceAltitude, 0)}{" "}
                    ft; gerçek kabin {format(s.cabinAltitude, 0)} ft.
                  </p>
                  <Range
                    label="Pack airflow çarpanı"
                    min={0.4}
                    max={2}
                    step={0.05}
                    unit="×"
                    value={c.demand}
                    onChange={(v) => change("demand", v)}
                  />
                </Panel>
                {graphGrid}
              </div>
              <div className="stack">
                <Panel title="Basınç kontrol paneli">
                  <PressureControls s={s} change={change} />
                </Panel>
                {page === "pressure" && (
                  <Panel title="Outflow ve relief">
                    <OutflowGauge s={s} />
                  </Panel>
                )}
              </div>
            </div>
          )}
          {page === "flight" && (
            <div className="workspace-grid">
              <div className="stack">
                <Panel
                  title="Kalkıştan inişe basınçlandırma"
                  kicker="SYNCHRONIZED FLIGHT PROFILE"
                >
                  <div className="phase-track">
                    {[
                      "GROUND",
                      "TAKEOFF",
                      "CLIMB",
                      "CRUISE",
                      "DESCENT",
                      "LANDING",
                    ].map((p) => (
                      <span key={p} className={s.phase === p ? "active" : ""}>
                        {p}
                      </span>
                    ))}
                  </div>
                  <PressureGraphic s={s} />
                  <div className="actions">
                    <button
                      className="primary"
                      onClick={() => {
                        startFlight(s);
                        setPaused(false);
                        redraw();
                      }}
                    >
                      <Play size={16} /> START FLIGHT
                    </button>
                    <button
                      disabled={!s.flightRunning}
                      onClick={() => {
                        s.flightRunning = false;
                        s.controls.altitudeTarget = s.altitude;
                        log(s, "Flight profile durduruldu", "action");
                        redraw();
                      }}
                    >
                      Profili durdur
                    </button>
                    <button onClick={() => setSpeed(30)}>30× hız</button>
                  </div>
                  <p className="hint">
                    Start, uçağı departure elevation'a ve kabini ortam basıncına
                    yerleştirir. Kaynak ve arıza ayarları korunur. 30× ile tam
                    profil yaklaşık 2 dakika sürer.
                  </p>
                </Panel>
                {graphGrid}
                {eventPanel}
              </div>
              <Panel title="Uçuş planı">
                <div className="control-stack">
                  {(
                    [
                      ["departure", "Departure elevation", 0, 8000, 100, "ft"],
                      [
                        "cruiseAltitude",
                        "Cruise altitude",
                        15000,
                        43000,
                        500,
                        "ft",
                      ],
                      [
                        "landingElevation",
                        "Destination elevation",
                        0,
                        8000,
                        100,
                        "ft",
                      ],
                      [
                        "climbRate",
                        "Aircraft climb rate",
                        300,
                        5000,
                        100,
                        "ft/min",
                      ],
                      [
                        "descentRate",
                        "Aircraft descent rate",
                        300,
                        10000,
                        100,
                        "ft/min",
                      ],
                      ["cruiseMinutes", "Cruise duration", 0.5, 30, 0.5, "min"],
                    ] as const
                  ).map(([key, label, min, max, step, unit]) => (
                    <Range
                      key={key}
                      label={label}
                      min={min}
                      max={max}
                      step={step}
                      unit={unit}
                      value={c[key]}
                      onChange={(v) => change(key, v)}
                    />
                  ))}
                  <Range
                    label="Flight cabin schedule"
                    min={0}
                    max={10000}
                    step={100}
                    unit="ft"
                    value={c.cabinSchedule}
                    onChange={(v) => change("cabinSchedule", v)}
                  />
                  <Range
                    label="Comfort rate limit"
                    min={100}
                    max={1500}
                    step={50}
                    unit="ft/min"
                    value={c.cabinRateLimit}
                    onChange={(v) => change("cabinRateLimit", v)}
                  />
                </div>
                <p className="hint">
                  Faz davranışı: yerde eşitleme, kalkışta hafif ön
                  basınçlandırma, tırmanışta hız sınırlı kabin programı,
                  alçalışta varış yüksekliğine dönüş.
                </p>
              </Panel>
            </div>
          )}
          {page === "failures" && (
            <div className="stack">
              {failurePanel}
              <Panel
                title="Arıza zincirini adımla"
                kicker="PAUSE → STEP → PLAY"
              >
                <div className="actions">
                  <button
                    onClick={() => {
                      scenario("duct");
                      setPaused(true);
                    }}
                  >
                    Sol duct leak senaryosu yükle
                  </button>
                  <button
                    onClick={() => {
                      setPaused(true);
                      advance(s, 1);
                      redraw();
                    }}
                  >
                    STEP +1 s
                  </button>
                  <button onClick={() => setPaused(!paused)}>
                    {paused ? "PLAY" : "PAUSE"}
                  </button>
                </div>
                <Synoptic s={s} onInspect={setInspect} />
                <div className="cascade">
                  {s.events
                    .filter((e) => e.kind !== "action")
                    .slice(-7)
                    .map((e, i) => (
                      <div key={`${e.time}-${i}`}>
                        <span>{timeText(e.time)}</span>
                        <strong>{e.text}</strong>
                        <ChevronRight size={15} />
                      </div>
                    ))}
                </div>
                <p className="hint">
                  Kaçak çevreyi ısıtır; dedektör eşiği aşılır; koruma ve valf
                  hareketi basıncı ve pack debisini değiştirir. Kartlar
                  gerçekleşen olaylardan gelir.
                </p>
              </Panel>
              <div className="two-column">
                {sensorPanel}
                {eventPanel}
              </div>
            </div>
          )}
          {page === "free" && (
            <div className="stack">
              <Panel
                title="Serbest sistem deneyi"
                kicker="BÜTÜN KONTROLLER · AYNI UÇAK"
              >
                <Synoptic
                  s={s}
                  onInspect={setInspect}
                  traceTarget={tracing ? traceTarget : ""}
                />
                {tracePanel}
              </Panel>
              <div className="three-column">
                <Panel title="Sources + network">
                  <SourceControls s={s} change={change} />
                  <NetworkControls s={s} change={change} />
                </Panel>
                <Panel title="Packs + thermal">
                  <PackControls s={s} change={change} />
                  <ThermalControls s={s} change={change} />
                </Panel>
                <Panel title="Environment + pressure">
                  <PressureControls s={s} change={change} />
                </Panel>
              </div>
              {failurePanel}
              {graphGrid}
              {eventPanel}
            </div>
          )}
          {page === "components" && (
            <div className="learning-grid">
              <Panel title="20 temel bileşen" kicker="COMPONENT EXPLORER">
                <label className="search">
                  <Search size={16} />
                  <input
                    aria-label="Bileşen ara"
                    placeholder="Bileşen ara…"
                    value={componentSearch}
                    onChange={(e) => setComponentSearch(e.target.value)}
                  />
                </label>
                <div className="lesson-list">
                  {components
                    .map((item, i) => ({ item, i }))
                    .filter(({ item }) =>
                      item[0]
                        .toLowerCase()
                        .includes(componentSearch.toLowerCase()),
                    )
                    .map(({ item, i }) => (
                      <button
                        key={item[0]}
                        className={componentIndex === i ? "active" : ""}
                        onClick={() => setComponentIndex(i)}
                      >
                        {item[0]}
                        <ChevronRight size={15} />
                      </button>
                    ))}
                </div>
              </Panel>
              <Panel
                title={components[componentIndex][0]}
                kicker="FUNCTION / INPUT / OUTPUT"
              >
                <div className="component-symbol">
                  <Wind size={76} />
                  <span>ATA {componentIndex < 8 ? "36" : "21"}</span>
                </div>
                <div className="lesson-copy">
                  {[
                    "İşlev",
                    "Girdiler",
                    "Çıktılar",
                    "Normal davranış",
                    "Arıza / model sınırı",
                    "Sistem sonucu",
                  ].map((label, i) => (
                    <div key={label}>
                      <span className="eyebrow">{label}</span>
                      <p>{components[componentIndex][i + 1]}</p>
                    </div>
                  ))}
                </div>
                <button
                  className="primary"
                  onClick={() =>
                    navigate(
                      componentIndex < 8
                        ? "manifold"
                        : componentIndex < 15
                          ? "packs"
                          : "pressure",
                    )
                  }
                >
                  Canlı sistemde incele →
                </button>
              </Panel>
            </div>
          )}
          <Learning
            resetNonce={resetNonce}
            s={s}
            page={page}
            load={load}
            pause={setPaused}
            navigate={navigate}
            conceal={setConcealed}
          />
          {level === "MAINTENANCE" &&
            ![
              "failures",
              "free",
              "troubleshooting",
              "quiz",
              "labs",
              "components",
            ].includes(page) &&
            sensorPanel}
          <footer className="model-footer">
            <ShieldAlert size={16} />
            <div>
              <strong>
                Simplified educational ATA 21 / ATA 36 model. Exact architecture
                varies by aircraft.
              </strong>
              <p>
                Simplified educational simulation. Generic aircraft
                architecture. Not intended for real-world aircraft operation or
                maintenance.
              </p>
              <span>
                Temsilî değerler ve mimari · Gerçek uçak operasyonu veya bakımı
                için kullanılmaz.
              </span>
            </div>
            <button onClick={() => navigate("fundamentals")}>
              Model & kaynaklar <ArrowRight size={14} />
            </button>
          </footer>
        </main>
      </div>
      {inspect && (
        <div className="modal-backdrop" onClick={() => setInspect(null)}>
          <section
            className="inspector"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inspector-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              autoFocus
              className="close-button"
              aria-label="Detayı kapat"
              onClick={() => setInspect(null)}
            >
              <X size={20} />
            </button>
            <span className="eyebrow">LIVE SYSTEM EXPLANATION</span>
            <h2 id="inspector-title">
              {[
                "cabin",
                "delta",
                "left",
                "right",
                "pack1",
                "pack2",
                "isolation",
              ].includes(inspect)
                ? `WHY? · ${inspect.toUpperCase()}`
                : inspect}
            </h2>
            {components.some((x) => x[0] === inspect) ? (
              <div className="lesson-copy">
                {components
                  .find((x) => x[0] === inspect)!
                  .slice(1)
                  .map((p, i) => (
                    <div key={i}>
                      <span className="eyebrow">
                        {
                          [
                            "İŞLEV",
                            "GİRDİLER",
                            "ÇIKTILAR",
                            "NORMAL DAVRANIŞ",
                            "ARIZA / SINIR",
                            "SİSTEM SONUCU",
                          ][i]
                        }
                      </span>
                      <p>{p}</p>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="why-copy">{why(s, inspect)}</p>
            )}
            <div className="inspector-footer">
              <CircleHelp size={18} />
              <span>t = {timeText(s.time)} · Aynı canlı uçak durumu</span>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
export default App;
