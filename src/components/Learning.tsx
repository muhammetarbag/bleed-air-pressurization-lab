import { useEffect, useState } from "react";
import type { AircraftState } from "../sim/types";
import type { PageId } from "../content";
import {
  cases,
  challenges,
  challengeSetup,
  labs,
  loadCase,
  predictions,
  questions,
} from "../content";
import { advance, indicated, trace } from "../sim/engine";
import { format, Panel, Select } from "./Controls";
import { Balance, Graph, altitudeCurves } from "./Visuals";
interface Props {
  resetNonce: number;
  s: AircraftState;
  page: PageId;
  load: (s: AircraftState) => void;
  pause: (v: boolean) => void;
  navigate: (p: PageId) => void;
  conceal: (v: boolean) => void;
}
export function Learning({
  resetNonce,
  s,
  page,
  load,
  pause,
  navigate,
  conceal,
}: Props) {
  const [lab, setLab] = useState(0),
    [baseline, setBaseline] = useState<AircraftState | null>(null),
    [labMessage, setLabMessage] = useState(""),
    [completed, setCompleted] = useState<number[]>([]);
  const [caseIndex, setCase] = useState(0),
    [caseStarted, setCaseStarted] = useState(false),
    [diagnosis, setDiagnosis] = useState(""),
    [caseFeedback, setCaseFeedback] = useState(""),
    [solved, setSolved] = useState(false),
    [evidence, setEvidence] = useState<
      { name: string; text: string; time: number }[]
    >([]);
  const [quizCategory, setQuizCategory] = useState("Tümü"),
    [qi, setQi] = useState(0),
    [answers, setAnswers] = useState<Record<number, number>>({});
  const [quizTab, setQuizTab] = useState<
    "Sorular" | "Önce tahmin et" | "Canlı challenge"
  >("Sorular");
  const [prediction, setPrediction] = useState(0),
    [predictionAnswer, setPredictionAnswer] = useState<number | null>(null),
    [predictionResult, setPredictionResult] = useState("");
  const [challenge, setChallenge] = useState(0),
    [challengeReport, setChallengeReport] = useState(""),
    [challengeDecision, setChallengeDecision] = useState("");
  useEffect(() => {
    setBaseline(null);
    setLabMessage("");
    setCaseStarted(false);
    setCaseFeedback("");
    setSolved(false);
    setEvidence([]);
    setChallengeReport("");
    conceal(false);
  }, [resetNonce, conceal]);
  const run = s.challenge;
  const challengeActive = Boolean(run?.active);
  const elapsed = run?.elapsed ?? 0;
  const updateDecision = (value: string) => {
    setChallengeDecision(value);
    if (s.challenge?.active) s.challenge.decision = value;
  };
  useEffect(() => {
    if (!run || run.score === null || run.active) return;
    setChallengeReport(
      `${run.score}/100 · ${run.id === 0 || run.id === 3 ? `${format(run.good, 0)} / ${format(run.elapsed, 0)} s hedef aralığında.` : run.id === 1 ? `Ortalama kabin ${format(s.zoneTemps.reduce((a, x) => a + x, 0) / 3)} °C.` : `Teşhis: ${run.decision || "seçilmedi"}; sağ duct beslemesi ${format(s.ductFlow[1], 2)} kg/s.`}`,
    );
    pause(true);
    conceal(false);
  }, [run?.score, run?.active, run, s, pause, conceal]);
  const tool = (name: string) => {
    const lines: Record<string, string> = {
      "Inspect Valve": `PRSOV 1 command ${s.sources[0].command * 100}% / actual ${format(s.sources[0].valve * 100, 0)}%; PRSOV 2 command ${s.sources[1].command * 100}% / actual ${format(s.sources[1].valve * 100, 0)}%. Pack valves: ${format(s.packs[0].valve * 100, 0)} / ${format(s.packs[1].valve * 100, 0)}%. Outflow command ${format(s.outflowCommand * 100, 0)} / actual ${format(s.outflowPosition * 100, 0)} / indicated ${format((indicated(s, "outflow") ?? 0) * 100, 0)}%.`,
      "Check Pressure": `Kaynak 1/2: ${format(s.sources[0].pressure)} / ${format(s.sources[1].pressure)} psi. Manifold L/R: ${format(s.manifold[0])} / ${format(s.manifold[1])} psi. Gerçek kabin: ${format(s.cabinPressure / 1000, 2)} kPa; dış: ${format(s.outsidePressure / 1000, 2)} kPa; ΔP ${format(s.delta, 2)} psi.`,
      "Check Temperature": `Precooler 1/2 ${format(s.sources[0].regulatedTemp)} / ${format(s.sources[1].regulatedTemp)} °C. Pack 1/2 ${format(s.packs[0].outletTemp)} / ${format(s.packs[1].outletTemp)} °C. Kabin ${s.zoneTemps.map((t) => format(t)).join(" / ")} °C.`,
      "Trace Airflow":
        trace(s, "cabin")
          .map((path) => path.join(" → "))
          .join(" | ") || "Kabine geçerli taze hava yolu yok.",
      "Check Sensor": `Cabin altitude: indicated ${format(indicated(s, "cabinAltitude"), 0)} / pressure-derived ${format(s.cabinAltitude, 0)} ft. Outflow indicated ${format((indicated(s, "outflow") ?? 0) * 100, 0)} / actual ${format(s.outflowPosition * 100, 0)}%. Pack 1 flow indicated ${format(indicated(s, "packFlow", 0), 2)} / actual ${format(s.packs[0].flow, 2)} kg/s.`,
      "Inspect Pack": s.packs
        .map(
          (p, i) =>
            `PACK ${i + 1}: ${p.status}, inlet ${format(p.inletPressure)} psi, inlet/outlet ${format(p.inletTemp)}/${format(p.outletTemp)} °C, flow ${format(p.flow, 2)}/${format(p.demand, 2)} kg/s, ACM ${format(p.rpm, 0)}%, ram air ${format(p.ram * 100, 0)}%`,
        )
        .join(" | "),
      "Check Leak Detector": `Duct çevresi L/R: ${format(s.sources[0].ductTemp)} / ${format(s.sources[1].ductTemp)} °C. Kaçak besleme L/R: ${format(s.ductFlow[0], 2)} / ${format(s.ductFlow[1], 2)} kg/s. Cabin leak ${format(s.leakFlow, 2)} kg/s; inflow ${format(s.inflow, 2)} kg/s.`,
      "Review Event Log":
        s.events
          .slice(-10)
          .map((e) => `${format(e.time, 1)} s · ${e.text}`)
          .join(" | ") || "Henüz olay yok.",
    };
    setEvidence((prev) =>
      [{ name, text: lines[name], time: s.time }, ...prev].slice(0, 20),
    );
  };
  const activeQuestionIds = questions
    .map((_, i) => i)
    .filter(
      (i) => quizCategory === "Tümü" || questions[i].category === quizCategory,
    );
  const questionId =
      activeQuestionIds[Math.min(qi, activeQuestionIds.length - 1)],
    question = questions[questionId];
  return (
    <>
      <div hidden={page !== "labs"}>
        <div className="learning-grid">
          <Panel
            title="15 rehberli deney"
            kicker={`${completed.length} / 15 TAMAMLANDI`}
          >
            <div className="lesson-list">
              {labs.map((l, i) => (
                <button
                  className={lab === i ? "active" : ""}
                  key={l.title}
                  onClick={() => {
                    setLab(i);
                    setBaseline(null);
                    setLabMessage("");
                  }}
                >
                  <span>LAB {String(i + 1).padStart(2, "0")}</span>
                  {l.title}
                  <b>{completed.includes(i) ? "✓" : "→"}</b>
                </button>
              ))}
            </div>
          </Panel>
          <Panel
            title={labs[lab].title}
            kicker={`LAB ${String(lab + 1).padStart(2, "0")}`}
          >
            <div className="lesson-copy">
              {[
                ["OBJECTIVE", labs[lab].objective],
                ["INITIAL CONDITION", labs[lab].initial],
                ["TASK", labs[lab].task],
                ["EXPERIMENT", labs[lab].experiment],
                ["OBSERVE", labs[lab].observe],
                ["QUESTION", labs[lab].question],
                ["RESULT", labs[lab].result],
              ].map(([label, text]) => (
                <div key={label}>
                  <span className="eyebrow">{label}</span>
                  <p>{text}</p>
                </div>
              ))}
            </div>
            <div className="actions">
              <button
                className="primary"
                onClick={() => {
                  const next = labs[lab].setup();
                  setBaseline(structuredClone(next));
                  load(next);
                  pause(false);
                  conceal(false);
                  setLabMessage(
                    "Deney başladı. İlgili kontrollere geçip görevi uygulayın.",
                  );
                }}
              >
                Başlangıç koşulunu yükle
              </button>
              <button
                onClick={() =>
                  navigate(
                    lab === 8
                      ? "flight"
                      : lab === 5
                        ? "acm"
                        : lab === 7
                          ? "distribution"
                          : lab >= 9
                            ? "pressure"
                            : "free",
                  )
                }
              >
                Kontrollere git →
              </button>
              <button
                disabled={!baseline}
                onClick={() => {
                  const passed = baseline && labs[lab].success(s, baseline);
                  setLabMessage(
                    passed
                      ? "✓ Hedef gerçek sistem ölçümleriyle sağlandı."
                      : "Henüz sağlanmadı. RESULT koşulunu canlı değerlerle karşılaştırın.",
                  );
                  if (passed)
                    setCompleted((v) => (v.includes(lab) ? v : [...v, lab]));
                }}
              >
                Sonucu ölç
              </button>
            </div>
            {labMessage && (
              <div className="feedback" role="status">
                {labMessage}
              </div>
            )}
            <Balance s={s} />
          </Panel>
        </div>
      </div>
      <div hidden={page !== "troubleshooting"}>
        <div className="learning-grid">
          <Panel title="Teşhis vakaları" kicker="12 SİSTEM VAKASI">
            <div className="lesson-list">
              {cases.map((item, i) => (
                <button
                  className={caseIndex === i ? "active" : ""}
                  key={item.title}
                  onClick={() => {
                    setCase(i);
                    setCaseStarted(false);
                    setCaseFeedback("");
                    setEvidence([]);
                  }}
                >
                  <span>CASE {String(i + 1).padStart(2, "0")}</span>
                  {item.title}
                </button>
              ))}
            </div>
          </Panel>
          <div className="stack">
            <Panel
              title={cases[caseIndex].title}
              kicker="BELİRTİ → ÖLÇÜM → TEŞHİS"
            >
              <p>{cases[caseIndex].brief}</p>
              <div className="actions">
                <button
                  className="primary"
                  onClick={() => {
                    load(loadCase(caseIndex));
                    setCaseStarted(true);
                    setSolved(false);
                    setDiagnosis("");
                    setEvidence([]);
                    setCaseFeedback(
                      "Vaka yüklendi. Arıza adı gizli; ölçüm araçlarıyla kanıt toplayın.",
                    );
                    conceal(true);
                    pause(false);
                  }}
                >
                  Vakayı başlat
                </button>
                <button onClick={() => pause(true)}>Ölçüm için duraklat</button>
                <button onClick={() => pause(false)}>Sürdür</button>
              </div>
              {caseStarted && (
                <>
                  <div className="tool-grid">
                    {[
                      "Inspect Valve",
                      "Check Pressure",
                      "Check Temperature",
                      "Trace Airflow",
                      "Check Sensor",
                      "Inspect Pack",
                      "Check Leak Detector",
                      "Review Event Log",
                    ].map((name) => (
                      <button key={name} onClick={() => tool(name)}>
                        {name}
                      </button>
                    ))}
                  </div>
                  <label className="select">
                    <span>TEŞHİS</span>
                    <select
                      aria-label="Teşhis seçimi"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                    >
                      <option value="">Kanıtlara göre seç</option>
                      {cases.map((c) => (
                        <option key={c.diagnosis}>{c.diagnosis}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="primary"
                    disabled={!diagnosis || evidence.length < 2}
                    onClick={() => {
                      const correct = diagnosis === cases[caseIndex].diagnosis;
                      setSolved(correct);
                      setCaseFeedback(
                        correct
                          ? `✓ Doğru. ${cases[caseIndex].reason}`
                          : "Bu teşhis ölçümlerle uyuşmuyor. Komut / actual ve giriş / çıkış değerlerini karşılaştırın.",
                      );
                      if (correct) conceal(false);
                    }}
                  >
                    Teşhisi doğrula
                  </button>
                  <p className="hint">
                    En az iki ölçüm al. Ölçümler alındıkları andaki durumu
                    kaydeder.
                  </p>
                  {solved && (
                    <button onClick={() => navigate("failures")}>
                      Arıza ayrıntılarını aç →
                    </button>
                  )}
                </>
              )}
              {caseFeedback && (
                <div className="feedback" role="status">
                  {caseFeedback}
                </div>
              )}
            </Panel>
            <Panel title="Ölçüm defteri" kicker="GERÇEK SİSTEM VERİSİ">
              {evidence.length === 0 ? (
                <p className="empty">
                  Vakayı başlat, sonra bir ölçüm aracı seç. Bulgular burada
                  birikir.
                </p>
              ) : (
                <div className="evidence-list">
                  {evidence.map((e, i) => (
                    <article key={`${e.time}-${i}`}>
                      <span className="eyebrow">
                        {format(e.time, 1)} s · {e.name}
                      </span>
                      <p>{e.text}</p>
                    </article>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      </div>
      <div hidden={page !== "quiz"}>
        <div className="tabs">
          {(["Sorular", "Önce tahmin et", "Canlı challenge"] as const).map(
            (tab) => (
              <button
                key={tab}
                className={quizTab === tab ? "active" : ""}
                onClick={() => setQuizTab(tab)}
              >
                {tab}
              </button>
            ),
          )}
        </div>
        {quizTab === "Sorular" && (
          <Panel
            title="Bilgini sistem üzerinde sına"
            kicker="42 SORU · AÇIKLAMALI YANITLAR"
          >
            <div className="quiz-toolbar">
              <Select
                label="Kategori"
                value={quizCategory}
                items={["Tümü", ...new Set(questions.map((q) => q.category))]}
                onChange={(v) => {
                  setQuizCategory(v);
                  setQi(0);
                }}
              />
              <span>
                {
                  Object.entries(answers).filter(
                    ([id, a]) => questions[Number(id)].correct === a,
                  ).length
                }{" "}
                doğru / {Object.keys(answers).length} yanıt
              </span>
              <button
                onClick={() => {
                  setAnswers({});
                  setQi(0);
                }}
              >
                Quiz sıfırla
              </button>
            </div>
            <div className="question">
              <span className="eyebrow">
                {qi + 1} / {activeQuestionIds.length} · {question.category} ·{" "}
                {question.type}
              </span>
              <h3>{question.question}</h3>
              <div className="answer-list">
                {question.options.map((option, i) => (
                  <button
                    key={option}
                    disabled={answers[questionId] !== undefined}
                    className={
                      answers[questionId] !== undefined
                        ? i === question.correct
                          ? "correct"
                          : i === answers[questionId]
                            ? "incorrect"
                            : ""
                        : ""
                    }
                    onClick={() =>
                      setAnswers((v) => ({ ...v, [questionId]: i }))
                    }
                  >
                    <span>{"ABCD"[i]}</span>
                    {option}
                  </button>
                ))}
              </div>
              {answers[questionId] !== undefined && (
                <div className="feedback" role="status">
                  {answers[questionId] === question.correct
                    ? "✓ Doğru. "
                    : "Yanıtı yeniden düşün: "}
                  {question.explanation}
                </div>
              )}
              <div className="actions">
                <button disabled={qi === 0} onClick={() => setQi(qi - 1)}>
                  ← Önceki
                </button>
                <button
                  className="primary"
                  disabled={qi >= activeQuestionIds.length - 1}
                  onClick={() => setQi(qi + 1)}
                >
                  Sonraki soru →
                </button>
              </div>
            </div>
          </Panel>
        )}
        {quizTab === "Önce tahmin et" && (
          <Panel
            title="Tahminini seç, sistemi çalıştır"
            kicker="CANLI SONUÇLA KARŞILAŞTIR"
          >
            <div className="tabs">
              {predictions.map((p, i) => (
                <button
                  key={p.title}
                  className={prediction === i ? "active" : ""}
                  onClick={() => {
                    setPrediction(i);
                    setPredictionAnswer(null);
                    setPredictionResult("");
                  }}
                >
                  {p.title}
                </button>
              ))}
            </div>
            <div className="question">
              <h3>{predictions[prediction].prompt}</h3>
              <div className="answer-list">
                {predictions[prediction].options.map((o, i) => (
                  <button
                    key={o}
                    className={predictionAnswer === i ? "active" : ""}
                    onClick={() => setPredictionAnswer(i)}
                  >
                    {o}
                  </button>
                ))}
              </div>
              <button
                className="primary"
                disabled={predictionAnswer === null}
                onClick={() => {
                  const next = predictions[prediction].setup();
                  advance(next, 20);
                  load(next);
                  pause(true);
                  conceal(false);
                  setPredictionResult(
                    `${predictionAnswer === predictions[prediction].correct ? "✓ Tahminin doğru." : "Tahmin bu sonuçla uyuşmadı."} 20 simülasyon saniyesi: ${predictions[prediction].result(next)}`,
                  );
                }}
              >
                Tahmini kilitle ve 20 s çalıştır
              </button>
              {predictionResult && (
                <div className="feedback" role="status">
                  {predictionResult}
                </div>
              )}
              <Graph
                history={s.history}
                title="Tahminin fiziksel sonucu"
                unit="ft"
                curves={altitudeCurves}
              />
            </div>
          </Panel>
        )}
        {quizTab === "Canlı challenge" && (
          <div className="learning-grid">
            <Panel title="Dört canlı görev" kicker="GERÇEK ÖLÇÜMLERLE PUANLAMA">
              <div className="lesson-list">
                {challenges.map((c, i) => (
                  <button
                    disabled={challengeActive}
                    className={challenge === i ? "active" : ""}
                    key={c.title}
                    onClick={() => {
                      setChallenge(i);
                      setChallengeReport("");
                    }}
                  >
                    <span>0{i + 1}</span>
                    {c.title}
                  </button>
                ))}
              </div>
            </Panel>
            <Panel
              title={challenges[challenge].title}
              kicker={`${challenges[challenge].duration} S SİMÜLASYON SÜRESİ`}
            >
              <p>{challenges[challenge].description}</p>
              <div className="actions">
                <button
                  className="primary"
                  disabled={challengeActive}
                  onClick={() => {
                    const next = challengeSetup(challenge);
                    load(next);
                    setBaseline(null);
                    setCaseStarted(false);
                    setChallengeReport("");
                    setChallengeDecision("");
                    setEvidence([]);
                    conceal(challenge === 2);
                    pause(false);
                  }}
                >
                  Challenge başlat
                </button>
                <button onClick={() => navigate("free")}>
                  Sistem kontrolleri →
                </button>
                {challengeActive && (
                  <button
                    onClick={() => {
                      if (s.challenge) s.challenge.active = false;
                      pause(true);
                      conceal(false);
                      setChallengeReport(
                        "Challenge sonlandırıldı; puan verilmedi.",
                      );
                    }}
                  >
                    Sonlandır
                  </button>
                )}
              </div>
              <progress max={challenges[challenge].duration} value={elapsed} />
              <p className="mono">
                {format(elapsed, 0)} / {challenges[challenge].duration} s
              </p>
              {challenge === 2 && (
                <>
                  <div className="actions">
                    {[
                      "Check Leak Detector",
                      "Check Pressure",
                      "Inspect Valve",
                    ].map((x) => (
                      <button key={x} onClick={() => tool(x)}>
                        {x}
                      </button>
                    ))}
                  </div>
                  <Select
                    label="Kaçak teşhisi"
                    value={challengeDecision}
                    items={[
                      "",
                      "Sol duct leak",
                      "Sağ duct leak",
                      "Kabin kaçağı",
                    ]}
                    onChange={updateDecision}
                  />
                  {evidence.slice(0, 3).map((e, i) => (
                    <div className="feedback" key={i}>
                      {e.text}
                    </div>
                  ))}
                </>
              )}
              {challenge === 3 && (
                <Select
                  label="Son kapasite değerlendirmesi"
                  value={challengeDecision}
                  items={["", "Packler yetiyor", "Packler yetmiyor"]}
                  onChange={updateDecision}
                />
              )}
              <Balance s={s} />
              {challengeReport && (
                <div className="feedback" role="status">
                  {challengeReport}
                </div>
              )}
              <p className="hint">
                Görev diğer ekranlarda da sürer. Zaman ve duraklatma üst
                çubuktan kontrol edilir. Son ölçümde otomatik duraklar.
              </p>
            </Panel>
          </div>
        )}
      </div>
      {(baseline || challengeActive) && !["labs", "quiz"].includes(page) && (
        <div className="training-dock">
          <span>
            {challengeActive
              ? `CHALLENGE · ${challenges[challenge].title} · ${format(elapsed, 0)} s`
              : `LAB ${String(lab + 1).padStart(2, "0")} · ${labs[lab].title}`}
          </span>
          <button onClick={() => navigate(challengeActive ? "quiz" : "labs")}>
            Göreve dön →
          </button>
        </div>
      )}
    </>
  );
}
