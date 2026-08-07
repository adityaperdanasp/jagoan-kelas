import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Shell from "../../components/Shell";
import Button from "../../components/ds/Button";
import Kiko from "../../components/ds/Kiko";
import NinjaCardFace from "./NinjaCardFace";
import { generateQuickQuestion } from "../shared/quickQuestion";
import { loadNinjaPools, pickFromPool } from "./ninjaPools";
import { recordFocusRoundAttempt, addXp } from "../../data/progressService";
import { usePlayer } from "../../data/PlayerContext";

// Ninja Runner -- di-port dari al-idrisi-games mathville/script.js (cari
// komentar "Ninja Runner"), diadaptasi ke React. Mekanik/timing/warna/nama
// badge SAMA PERSIS (per permintaan eksplisit user, "samain aja"), cuma
// karakter pelarinya Kiko (bob+hop) gantiin stick-figure ninja BrainBox, dan
// 3 kategori subject dipetain ke konten Jagoan Kelas sendiri (lihat
// ninjaPools.js). Soal campur lintas subject SENGAJA gak nyentuh status
// locked/current/done topik manapun (sama filosofi Focus Round) -- cuma
// nyumbang correct/wrong ke topicStats (buat "Perlu Latihan Lagi") + XP.
const TOTAL_Q = 20;
const PTS = { easy: 10, medium: 25, hard: 50 };
const STREAK_BONUS_TIERS = [[3, 5], [5, 15], [10, 30]];
const DIFFS = ["easy", "medium", "hard"];
const SUBJECTS = { math: "MATH", lang: "LANG & ARTS", sci: "SCIENCE" };
const DIFF_LABELS = { easy: "Twig Sprout", medium: "Star Ninja", hard: "Golden Sensei" };
const OBSTACLE_MS = 1800;
const ENEMY_MS = 1800;
const XP_PER_CORRECT = 8; // sama rate kayak Focus Round -- skor "poin" di layar tetep formula BrainBox (PTS+streak), XP profil pakai ekonomi kita sendiri biar konsisten sama mode lain

function streakBonus(streak) {
  let bonus = 0;
  for (const [need, pts] of STREAK_BONUS_TIERS) if (streak >= need) bonus = pts;
  return bonus;
}

export default function NinjaRunner() {
  const { grade } = useParams();
  const navigate = useNavigate();
  const { player, login } = usePlayer();

  const [pools, setPools] = useState(null);
  const [phase, setPhase] = useState("loading"); // loading | lane | gates | question | slicing | finish
  const [qnum, setQnum] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [jumping, setJumping] = useState(false);
  const [obstacleState, setObstacleState] = useState(null); // null | "approaching" | "dodged" | "bumped"
  const [enemyApproaching, setEnemyApproaching] = useState(false);
  const [gates, setGates] = useState([]);
  const [question, setQuestion] = useState(null); // {prompt, options, correctLabel, _topicId, subjectKey, difficulty}
  const [answeredOpt, setAnsweredOpt] = useState(null);
  const [slicePrompt, setSlicePrompt] = useState(null);
  const [toast, setToast] = useState(null);
  const [wrongLog, setWrongLog] = useState([]);
  const [showReview, setShowReview] = useState(false);
  const [saving, setSaving] = useState(false);

  const obstacleDodgedRef = useRef(false);
  const timerRef = useRef(null);
  const topicStatsRef = useRef({}); // { [topicId]: {correct, wrong} }
  const correctCountRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    loadNinjaPools(grade).then((p) => {
      if (cancelled) return;
      setPools(p);
      setPhase("lane");
    });
    return () => {
      cancelled = true;
      clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grade]);

  // ---- run-lane: obstacle (jump to dodge) -> enemy (reaching = trigger gates) ----
  useEffect(() => {
    if (phase !== "lane") return;
    obstacleDodgedRef.current = false;
    setObstacleState("approaching");
    setEnemyApproaching(false);
    timerRef.current = setTimeout(() => {
      setObstacleState(obstacleDodgedRef.current ? "dodged" : "bumped");
      setTimeout(() => setObstacleState(null), 350);
      setEnemyApproaching(true);
      timerRef.current = setTimeout(() => {
        setEnemyApproaching(false);
        rollGates();
        setPhase("gates");
      }, ENEMY_MS);
    }, OBSTACLE_MS);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qnum]);

  function doJump() {
    if (phase !== "lane" || jumping) return;
    setJumping(true);
    setTimeout(() => setJumping(false), 450);
    if (obstacleState === "approaching") obstacleDodgedRef.current = true;
  }

  function rollGates() {
    setGates(Object.keys(SUBJECTS).map((key) => ({ key, diff: DIFFS[Math.floor(Math.random() * 3)] })));
  }

  function pickCard(subjectKey, difficulty) {
    let q;
    if (subjectKey === "math") {
      const raw = generateQuickQuestion(Number(grade), difficulty);
      q = { ...raw };
    } else {
      q = pickFromPool(pools[subjectKey], difficulty);
    }
    if (!q) return; // pool kosong buat kelas ini -- gate-nya diem, jarang kejadian (semua kelas ada konten IPAS/Bahasa)
    setQuestion({ ...q, subjectKey, difficulty });
    setAnsweredOpt(null);
    setPhase("question");
  }

  function answer(opt) {
    if (answeredOpt) return;
    const q = question;
    const isCorrect = opt === q.correctLabel;
    setAnsweredOpt(opt);

    if (q._topicId) {
      const bucket = (topicStatsRef.current[q._topicId] ??= { correct: 0, wrong: 0 });
      if (isCorrect) bucket.correct += 1;
      else bucket.wrong += 1;
    }

    if (isCorrect) {
      correctCountRef.current += 1;
      const prevBonus = streakBonus(streak);
      const newStreak = streak + 1;
      const bonus = streakBonus(newStreak);
      setStreak(newStreak);
      setScore((s) => s + PTS[q.difficulty] + bonus);
      if (bonus > prevBonus) {
        setToast(`🔥 ${newStreak} in a row! +${bonus} bonus`);
        setTimeout(() => setToast(null), 1600);
      }
      setSlicePrompt(q.prompt);
      setPhase("slicing");
      setTimeout(() => advance(), 550);
    } else {
      setStreak(0);
      setWrongLog((l) => [...l, { prompt: q.prompt, subject: SUBJECTS[q.subjectKey], your: opt, correct: q.correctLabel }]);
      setTimeout(() => advance(), 550);
    }
  }

  function advance() {
    setQuestion(null);
    setSlicePrompt(null);
    setAnsweredOpt(null);
    // qnum dibaca dari closure (bukan functional updater) SENGAJA -- updater
    // yang manggil setPhase() sebagai side-effect di dalemnya bikin StrictMode
    // (double-invoke) ngerender frame antara question:null tapi phase masih
    // "question" (baca question.subjectKey di hint text = crash null). Pola
    // bug yang sama kejadian & difix di respawn gauntlet Plane Mode.
    const next = qnum + 1;
    if (next > TOTAL_Q) {
      finishRun();
      return;
    }
    setQnum(next);
    setPhase("lane");
  }

  async function finishRun() {
    setPhase("finish");
    setSaving(true);
    // XP per topik dibagi dari correct-count-nya sendiri (bukan xpEarned:0)
    // biar "XP per Pelajaran" Parent Portal ikut ngitung kontribusi Ninja
    // Runner, sama presisi kayak Focus Round (recordFocusRoundAttempt nulis
    // path+".xp" DAN top-level xp bareng lewat increment()). Sisa XP yang gak
    // punya topicId (jawaban benar dari kartu MATH, procedural) ditambahin
    // via addXp() -- biar gak dobel-hitung, cuma leftover-nya doang.
    let attributedXp = 0;
    const totalXp = correctCountRef.current * XP_PER_CORRECT;
    try {
      await Promise.all(
        Object.entries(topicStatsRef.current).map(([tid, stats]) => {
          const [subject, g, ...rest] = tid.split(":");
          const babKey = rest.join(":");
          const xp = stats.correct * XP_PER_CORRECT;
          attributedXp += xp;
          return recordFocusRoundAttempt(player.id, subject, g, babKey, { correct: stats.correct, wrong: stats.wrong, xpEarned: xp });
        })
      );
      await addXp(player.id, totalXp - attributedXp);
      if (totalXp > 0) login({ ...player, xp: (player.xp || 0) + totalXp });
    } finally {
      setSaving(false);
    }
  }

  if (phase === "loading" || !pools) {
    return (
      <Shell>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-400)" }}>Menyiapin...</div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 0" }}>
          <button onClick={() => navigate(`/kelas/${grade}`)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "1.2rem" }}>
            ←
          </button>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--ink-900)" }}>🥷 Ninja Runner</div>
          <div style={{ width: 24 }} />
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: "10px 18px" }}>
          <Pill>Soal {Math.min(qnum, TOTAL_Q)}/{TOTAL_Q}</Pill>
          <Pill>⭐ {score}</Pill>
          {streak >= 2 && <Pill className="jk-nj-streak-pill">🔥 {streak}</Pill>}
        </div>

        <div className="jk-nj-world">
          <div className="jk-nj-ground" />

          <div className={`jk-nj-runner ${phase === "question" || phase === "slicing" ? "" : "running"} ${jumping ? "jumping" : ""}`}>
            <Kiko size={44} />
          </div>

          {phase === "lane" && (
            <div className="jk-nj-run-lane">
              {obstacleState && (
                <div className={`jk-nj-obstacle ${obstacleState === "approaching" ? "" : obstacleState}`} key={"obs" + qnum}>
                  🪨
                </div>
              )}
              {enemyApproaching && (
                <div className="jk-nj-enemy" key={"enemy" + qnum}>
                  👹
                </div>
              )}
            </div>
          )}
          {phase === "lane" && (
            <button className="jk-nj-jump-btn" onClick={doJump}>
              ⬆ JUMP
            </button>
          )}

          {phase === "gates" && (
            <div className="jk-nj-gate-row">
              {gates.map((g) => (
                <button key={g.key} className={`jk-nj-card ${g.key}${g.diff === "hard" ? " diff-hard" : ""}`} onClick={() => pickCard(g.key, g.diff)}>
                  <div className="jk-nj-inner-frame">
                    <div className="jk-nj-face-wrap">
                      <NinjaCardFace />
                    </div>
                  </div>
                  <div className="jk-nj-card-title">{SUBJECTS[g.key]}</div>
                  <div className={`jk-nj-diff-badge ${g.diff}`}>{DIFF_LABELS[g.diff]}</div>
                </button>
              ))}
            </div>
          )}

          {(phase === "question" || phase === "slicing") && question && (
            <div className="jk-nj-encounter">
              {phase === "question" ? (
                <div className="jk-nj-qcard">{question.prompt}</div>
              ) : (
                <div className="jk-nj-qcard" style={{ position: "relative" }}>
                  <div className="jk-nj-qhalf jk-nj-qhalf-a">{slicePrompt}</div>
                  <div className="jk-nj-qhalf jk-nj-qhalf-b">{slicePrompt}</div>
                </div>
              )}
              {phase === "question" && (
                <div className="jk-nj-bubbles">
                  {question.options.map((opt) => (
                    <button
                      key={opt}
                      className={`jk-nj-rbubble ${answeredOpt === opt && opt !== question.correctLabel ? "wrong-flash" : ""}`}
                      disabled={!!answeredOpt}
                      onClick={() => answer(opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="jk-nj-hint">
            {phase === "lane" && "Batu di depan! Tap JUMP buat lompatin 🪨"}
            {phase === "gates" && "Pilih subject (kesulitan tiap kartu acak):"}
            {phase === "question" && `Jawab soal ${SUBJECTS[question.subjectKey]} (${question.difficulty.toUpperCase()}):`}
          </div>

          {toast && (
            <div
              style={{
                position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
                background: "#e4572e", color: "#fff", padding: "6px 14px", borderRadius: 999,
                fontSize: "0.8rem", fontFamily: "var(--font-body)", fontWeight: 700, zIndex: 20,
              }}
            >
              {toast}
            </div>
          )}
        </div>
      </div>

      {phase === "finish" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(43,31,20,.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 50 }}>
          <div style={{ background: "var(--cream-50)", borderRadius: 20, padding: "24px 26px", textAlign: "center", maxWidth: 340, width: "100%" }}>
            {!showReview ? (
              <>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.25rem", color: "var(--ink-900)", marginBottom: 6 }}>
                  🏁 Your journey has completed.
                </div>
                <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "0.85rem", color: "var(--ink-500)", marginBottom: 16 }}>
                  20 soal selesai dijawab!
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.9rem", color: "#c9821f", marginBottom: 18 }}>
                  {score} poin
                </div>
                {saving && <div style={{ fontSize: "0.75rem", color: "var(--ink-400)", marginBottom: 10 }}>Nyimpen progress...</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {wrongLog.length > 0 && (
                    <Button variant="secondary" onClick={() => setShowReview(true)}>
                      Lihat {wrongLog.length} Soal yang Salah
                    </Button>
                  )}
                  <Button variant="primary" onClick={() => navigate(`/kelas/${grade}`)}>
                    Selesai
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", color: "var(--ink-900)", marginBottom: 12 }}>
                  Yuk kita bahas...
                </div>
                <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                  {wrongLog.map((w, i) => (
                    <div key={i} style={{ background: "var(--cream-100)", border: "2px solid var(--cream-300)", borderRadius: 14, padding: "12px 14px", textAlign: "left" }}>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", color: "var(--ink-900)", marginBottom: 6 }}>
                        {w.prompt}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--color-error)", fontWeight: 700 }}>Jawaban kamu: {w.your}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--color-success)", fontWeight: 700 }}>Jawaban benar: {w.correct}</div>
                    </div>
                  ))}
                </div>
                <Button variant="primary" style={{ width: "100%" }} onClick={() => navigate(`/kelas/${grade}`)}>
                  Selesai
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </Shell>
  );
}

function Pill({ children, className = "" }) {
  return (
    <span
      className={className}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "0.8rem",
        color: "var(--ink-700)", background: "var(--cream-100)", padding: "6px 12px", borderRadius: 999,
      }}
    >
      {children}
    </span>
  );
}
