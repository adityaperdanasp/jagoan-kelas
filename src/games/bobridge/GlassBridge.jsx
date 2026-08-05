import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Shell, { ScreenHeader } from "../../components/Shell";
import Button from "../../components/ds/Button";
import { SUBJECTS } from "../../data/content";
import { loadRawTopics } from "../../data/contentLoader";
import { answersMatch } from "../quiz/normalizeAnswer";

// Glass Bridge Challenge -- di-port dari azkacraft/script.js (cari komentar
// "GLASS BRIDGE CHALLENGE"), disederhanain jadi React tapi logic-nya SAMA:
// tahan tombol buat "jalan" naik 10 kaca (rAF loop, posisi via ref biar gak
// re-render tiap frame -- pola sama kayak Drive/Plane Mode), tiap nyampe
// kaca muncul soal MC 2 pilihan (1 bener + 1 salah acak dari bank soal
// subject/kelas ini), salah = kaca retak + soal baru DI KACA YANG SAMA,
// max 3 percobaan sebelum kaca pecah & jatuh. Nyampe kaca ke-10 = menang.
const TOTAL_STEPS = 10;
const MAX_ATTEMPTS = 3;
const MOVE_SPEED = 1.3; // % track per frame selama ditahan

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function GlassBridge() {
  const navigate = useNavigate();
  const { grade, subject } = useParams();
  const subj = SUBJECTS.find((s) => s.id === subject) || SUBJECTS[0];

  const [pool, setPool] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [attempt, setAttempt] = useState(1);
  const [tileState, setTileState] = useState(() => Array(TOTAL_STEPS).fill("idle")); // idle | current | crack1 | crack2 | crack3 | done
  const [question, setQuestion] = useState(null); // {prompt, options:[a,b], answer}
  const [answering, setAnswering] = useState(false);
  const [picked, setPicked] = useState(null); // {id, correct}
  const [ended, setEnded] = useState(null); // null | { won, step }

  const playerRef = useRef(null);
  const stateRef = useRef({ moving: false, paused: false, progress: 0 });
  const rafRef = useRef(null);
  // pool juga disimpen di ref -- rollQuestion() dipanggil dari dalam rAF
  // loop (lihat effect di bawah), yang closure-nya cuma dibuat ULANG pas
  // stepIndex berubah. Kalau rollQuestion baca `pool` (state) langsung,
  // dia bakal nutup ke nilai null dari render PERTAMA (sebelum soal
  // ke-load) selama-lamanya, gak pernah lihat update -- persis pola bug
  // stale-closure yang udah kejadian di Plane Mode (score-in-deps).
  const poolRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    loadRawTopics(subject, grade).then((topics) => {
      if (cancelled || !topics) return;
      const flat = [];
      topics.forEach((t) => {
        (t.soal || []).forEach((q) => {
          if (q.type === "multiple_choice" && Array.isArray(q.options) && q.options.length >= 2) {
            flat.push({ prompt: q.question, options: q.options, answer: q.answer });
          }
        });
      });
      poolRef.current = flat;
      setPool(flat);
    });
    return () => {
      cancelled = true;
    };
  }, [subject, grade]);

  useEffect(() => {
    function frame() {
      const st = stateRef.current;
      if (st.moving && !st.paused) {
        const nextBoundary = (stepIndex + 1) * (100 / TOTAL_STEPS);
        st.progress = Math.min(nextBoundary, st.progress + MOVE_SPEED);
        if (playerRef.current) playerRef.current.style.bottom = st.progress + "%";
        if (st.progress >= nextBoundary - 0.01) {
          st.paused = true;
          st.moving = false;
          rollQuestion(stepIndex);
        }
      }
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  function rollQuestion(step) {
    const currentPool = poolRef.current;
    if (!currentPool || currentPool.length === 0) return;
    setTileState((prev) => {
      const next = [...prev];
      next[step] = "current";
      return next;
    });
    const q = currentPool[Math.floor(Math.random() * currentPool.length)];
    const wrongOptions = q.options.filter((o) => !answersMatch(o, q.answer));
    const wrongPick = wrongOptions.length ? wrongOptions[Math.floor(Math.random() * wrongOptions.length)] : q.options[0];
    const pair = shuffle([q.answer, wrongPick]);
    setQuestion({ prompt: q.prompt, choices: pair, answer: q.answer });
    setPicked(null);
    setAnswering(true);
  }

  function handlePick(choice) {
    if (!answering) return;
    const isCorrect = answersMatch(choice, question.answer);
    setPicked({ choice, isCorrect });
    setAnswering(false);

    const step = stepIndex;
    if (isCorrect) {
      setTileState((prev) => {
        const next = [...prev];
        next[step] = "done";
        return next;
      });
      setTimeout(() => {
        setQuestion(null);
        const nextStep = step + 1;
        setStepIndex(nextStep);
        setAttempt(1);
        if (nextStep >= TOTAL_STEPS) {
          setEnded({ won: true, step: nextStep });
        } else {
          stateRef.current.paused = false;
        }
      }, 700);
    } else {
      if (attempt >= MAX_ATTEMPTS) {
        setTileState((prev) => {
          const next = [...prev];
          next[step] = "crack3";
          return next;
        });
        if (navigator.vibrate) navigator.vibrate([80, 60, 80, 60, 250]);
        setTimeout(() => {
          setQuestion(null);
          if (playerRef.current) playerRef.current.classList.add("jkGlassFalling");
          setTimeout(() => setEnded({ won: false, step }), 500);
        }, 600);
      } else {
        setTileState((prev) => {
          const next = [...prev];
          next[step] = attempt === 1 ? "crack1" : "crack2";
          return next;
        });
        setTimeout(() => {
          setAttempt((a) => a + 1);
          rollQuestion(step);
        }, 700);
      }
    }
  }

  function startMove() {
    if (!question && !ended) stateRef.current.moving = true;
  }
  function stopMove() {
    stateRef.current.moving = false;
  }

  function restart() {
    stateRef.current = { moving: false, paused: false, progress: 0 };
    if (playerRef.current) {
      playerRef.current.style.bottom = "0%";
      playerRef.current.classList.remove("jkGlassFalling");
    }
    setStepIndex(0);
    setAttempt(1);
    setTileState(Array(TOTAL_STEPS).fill("idle"));
    setQuestion(null);
    setEnded(null);
  }

  const tileColor = {
    idle: "var(--surface-card-alt)",
    current: "var(--pastel-blue)",
    crack1: "#F3D98A",
    crack2: "#EFB05C",
    crack3: "#E4572E",
    done: "var(--pastel-green)",
  };

  return (
    <Shell>
      <ScreenHeader onBack={() => navigate(`/kelas/${grade}/${subject}`)} title="🌉 Bo Bridge" subtitle={`${subj.name} — Kelas ${grade}`} />

      {!pool && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-400)" }}>Nyiapin kaca...</div>
      )}

      {pool && pool.length === 0 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 40 }}>🌉</div>
          <div style={{ color: "var(--ink-500)" }}>Belum ada soal buat kelas ini.</div>
          <Button variant="primary" onClick={() => navigate(`/kelas/${grade}/${subject}`)}>Kembali</Button>
        </div>
      )}

      {pool && pool.length > 0 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "10px 18px 18px", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "0.8rem", color: "var(--ink-500)" }}>
            <span>Kaca {stepIndex}/{TOTAL_STEPS}</span>
            <span>Coba {attempt}/{MAX_ATTEMPTS}</span>
          </div>

          <div
            style={{
              position: "relative",
              flex: 1,
              display: "flex",
              flexDirection: "column-reverse",
              gap: 4,
              padding: 10,
              borderRadius: 16,
              background: "var(--pastel-blue)",
              overflow: "hidden",
            }}
          >
            <div
              ref={playerRef}
              className="jkGlassPlayer"
              style={{
                position: "absolute",
                left: "50%",
                bottom: "0%",
                transform: "translateX(-50%)",
                zIndex: 2,
                transition: "opacity 0.4s ease",
              }}
            >
              <svg viewBox="0 0 24 24" width="26" height="26">
                <circle cx="12" cy="12" r="10" fill="#E4572E" stroke="#C6431F" strokeWidth="2" />
              </svg>
            </div>
            {tileState.map((st, i) => (
              <div
                key={i}
                style={{
                  flex: "1 1 0%",
                  minHeight: 0,
                  borderRadius: 8,
                  background: tileColor[st],
                  border: "2px solid rgba(0,0,0,0.06)",
                }}
              />
            ))}
          </div>

          <button
            onPointerDown={startMove}
            onPointerUp={stopMove}
            onPointerCancel={stopMove}
            onPointerLeave={stopMove}
            disabled={!!question || !!ended}
            style={{
              border: "none",
              borderRadius: 16,
              padding: "16px",
              background: question || ended ? "var(--cream-200)" : "var(--pastel-green)",
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "1rem",
              color: "var(--ink-900)",
              cursor: question || ended ? "default" : "pointer",
              WebkitTapHighlightColor: "transparent",
              touchAction: "none",
            }}
          >
            Tahan buat Jalan 🚶
          </button>
        </div>
      )}

      {question && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 10,
          }}
        >
          <div style={{ background: "var(--surface-card)", borderRadius: 20, padding: 20, width: "100%", maxWidth: 320, textAlign: "center" }}>
            <div style={{ fontSize: 28 }}>{picked ? (picked.isCorrect ? "🟢" : "🔴") : "🔴"}</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", color: "var(--ink-900)", margin: "10px 0 16px" }}>
              {question.prompt}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {question.choices.map((c, i) => {
                const isPicked = picked?.choice === c;
                const showState = picked && (isPicked || answersMatch(c, question.answer));
                return (
                  <button
                    key={i}
                    onClick={() => handlePick(c)}
                    disabled={!!picked}
                    style={{
                      border: "none",
                      borderRadius: 14,
                      padding: "13px 16px",
                      fontFamily: "var(--font-body)",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      cursor: picked ? "default" : "pointer",
                      background: showState
                        ? answersMatch(c, question.answer)
                          ? "var(--pastel-green)"
                          : "#F5B4A0"
                        : "var(--cream-100)",
                      color: "var(--ink-900)",
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {ended && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 10,
          }}
        >
          <div style={{ background: "var(--surface-card)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 320, textAlign: "center" }}>
            <div style={{ fontSize: 48 }}>{ended.won ? "🏆" : "💦"}</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1rem", color: "var(--ink-900)", margin: "10px 0 4px" }}>
              {ended.won ? "Berhasil nyebrang!" : "Kecebur! 😅"}
            </div>
            <div style={{ color: "var(--ink-500)", marginBottom: 18 }}>Nyampe kaca {ended.step}/{TOTAL_STEPS}</div>
            <Button variant="primary" size="lg" style={{ width: "100%", justifyContent: "center", marginBottom: 8 }} onClick={restart}>
              Coba Lagi
            </Button>
            <Button variant="secondary" size="md" style={{ width: "100%", justifyContent: "center" }} onClick={() => navigate(`/kelas/${grade}/${subject}`)}>
              Kembali
            </Button>
          </div>
        </div>
      )}

      <style>{`
        .jkGlassFalling { animation: jkGlassFall 0.5s ease-in forwards; }
        @keyframes jkGlassFall { to { opacity: 0; transform: translateX(-50%) scale(0.4) translateY(30px); } }
      `}</style>
    </Shell>
  );
}
