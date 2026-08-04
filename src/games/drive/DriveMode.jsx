import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Shell from "../../components/Shell";
import Button from "../../components/ds/Button";
import Joystick from "../shared/Joystick";
import { useJoystick } from "../shared/useJoystick";
import { generateQuickQuestion } from "../shared/quickQuestion";

// Core engine di-port dari pola BrainBox mathville Drive Mode (car top-down
// dodge + dino chase + quiz-on-obstacle-hit), versi disederhanain -- 1 dino
// (bukan 2 di Hard), gak ada nitro/water-gun/vehicle-skin/cities (lihat
// CLAUDE.md buat daftar follow-up). Soal-nya grade-aware: ambil dari kelas
// yang lagi dimainin, bukan dipatok kelas 4 kayak BrainBox punya.

const SCORE_TARGET = 12;
const MAX_BITES = 3;
const BITE_IMMUNE_MS = 3000;
const CAR_R_PX = 16;
const OBSTACLE_R_PX = 15;
const DINO_R_PX = 15;
const CAR_SPEED = 0.45; // % dunia per frame, deflection penuh
const DINO_SPEED = CAR_SPEED * 0.88;
const OBSTACLE_ICONS = ["🚧", "🪨", "🚦", "🪵", "⚠️", "🧱"];
const CAR_START = { x: 50, y: 88 };
const DINO_START = { x: 50, y: 10 };

function rand(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}
function headingCss(angleRad) {
  return (angleRad * 180) / Math.PI + 90;
}

function makeObstacles(n) {
  const out = [];
  let guard = 0;
  while (out.length < n && guard++ < 300) {
    const x = rand(8, 92);
    const y = rand(20, 78);
    const tooCloseStart = Math.hypot(x - CAR_START.x, y - CAR_START.y) < 20;
    const tooCloseOthers = out.some((o) => Math.hypot(x - o.x, y - o.y) < 14);
    if (!tooCloseStart && !tooCloseOthers) {
      out.push({ id: "obs" + out.length, x, y, icon: OBSTACLE_ICONS[rand(0, OBSTACLE_ICONS.length - 1)] });
    }
  }
  return out;
}

export default function DriveMode() {
  const { grade } = useParams();
  const navigate = useNavigate();
  const joystick = useJoystick(42);

  const [phase, setPhase] = useState("picker"); // picker | playing | ended
  const [difficulty, setDifficulty] = useState("medium");
  const [obstacles, setObstacles] = useState([]);
  const [score, setScore] = useState(0);
  const [bites, setBites] = useState(0);
  const [won, setWon] = useState(false);
  const [toast, setToast] = useState(null);
  const [question, setQuestion] = useState(null);

  const worldRef = useRef(null);
  const carRef = useRef(null);
  const dinoRef = useRef(null);
  const gameRef = useRef({ x: CAR_START.x, y: CAR_START.y, dinoX: DINO_START.x, dinoY: DINO_START.y, paused: false, immuneUntil: 0 });
  const obstaclesRef = useRef([]);
  const rafRef = useRef(null);

  useEffect(() => {
    obstaclesRef.current = obstacles;
  }, [obstacles]);

  const pxDist = useCallback((ax, ay, bx, by) => {
    const rect = worldRef.current?.getBoundingClientRect();
    if (!rect) return Infinity;
    return Math.hypot(((ax - bx) / 100) * rect.width, ((ay - by) / 100) * rect.height);
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1200);
  }, []);

  const askQuestion = useCallback(() => {
    gameRef.current.paused = true;
    setQuestion(generateQuickQuestion(Number(grade), difficulty));
  }, [grade, difficulty]);

  function answerQuestion(opt) {
    if (!question) return;
    setQuestion((q) => ({ ...q, answered: opt }));
    setTimeout(() => {
      setQuestion(null);
      gameRef.current.paused = false;
    }, 800);
  }

  function endRun(didWin) {
    gameRef.current.paused = true;
    setWon(didWin);
    setPhase("ended");
  }

  function startRun(diff) {
    setDifficulty(diff);
    gameRef.current = { x: CAR_START.x, y: CAR_START.y, dinoX: DINO_START.x, dinoY: DINO_START.y, paused: false, immuneUntil: 0 };
    setObstacles(makeObstacles(diff === "easy" ? 6 : diff === "medium" ? 8 : 9));
    setScore(0);
    setBites(0);
    setQuestion(null);
    setPhase("playing");
  }

  // Loop -- posisi mobil/dino dimanipulasi langsung lewat ref DOM (bukan
  // React state tiap frame), sama kayak pola BrainBox, biar gak lag.
  useEffect(() => {
    if (phase !== "playing") return;
    function frame() {
      const g = gameRef.current;
      if (!g.paused) {
        const vec = joystick.vecRef.current;
        const mag = Math.min(1, Math.hypot(vec.x, vec.y));
        if (mag > 0.05) {
          const angle = Math.atan2(vec.y, vec.x);
          g.x = Math.max(0, Math.min(100, g.x + Math.cos(angle) * CAR_SPEED * mag));
          g.y = Math.max(0, Math.min(100, g.y + Math.sin(angle) * CAR_SPEED * mag));
          if (carRef.current) {
            carRef.current.style.left = g.x + "%";
            carRef.current.style.top = g.y + "%";
            carRef.current.style.transform = `translate(-50%,-50%) rotate(${headingCss(angle)}deg)`;
          }
        }
        const dx = g.x - g.dinoX;
        const dy = g.y - g.dinoY;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.5) {
          const dAngle = Math.atan2(dy, dx);
          const dinoDiffMult = difficulty === "hard" ? 1.08 : difficulty === "easy" ? 0.85 : 1;
          const step = Math.min(dist, DINO_SPEED * dinoDiffMult);
          g.dinoX = Math.max(0, Math.min(100, g.dinoX + Math.cos(dAngle) * step));
          g.dinoY = Math.max(0, Math.min(100, g.dinoY + Math.sin(dAngle) * step));
          if (dinoRef.current) {
            dinoRef.current.style.left = g.dinoX + "%";
            dinoRef.current.style.top = g.dinoY + "%";
            dinoRef.current.style.transform = `translate(-50%,-50%) rotate(${headingCss(dAngle)}deg)`;
          }
        }

        // obstacle collisions
        for (const o of obstaclesRef.current) {
          if (pxDist(o.x, o.y, g.x, g.y) < CAR_R_PX + OBSTACLE_R_PX) {
            const next = obstaclesRef.current.filter((x) => x !== o);
            obstaclesRef.current = next;
            setObstacles(next);
            setScore((s) => {
              const ns = Math.min(SCORE_TARGET, s + 1);
              if (ns >= SCORE_TARGET) endRun(true);
              else askQuestion();
              return ns;
            });
            break;
          }
        }
        // dino bite
        const now = performance.now();
        if (now >= g.immuneUntil && pxDist(g.dinoX, g.dinoY, g.x, g.y) < CAR_R_PX + DINO_R_PX) {
          g.immuneUntil = now + BITE_IMMUNE_MS;
          setBites((b) => {
            const nb = b + 1;
            const left = MAX_BITES - nb;
            if (nb >= MAX_BITES) endRun(false);
            else showToast(`Digigit! Nyawa tersisa: ${left}`);
            return nb;
          });
          if (carRef.current) {
            carRef.current.classList.add("jk-bitten");
            setTimeout(() => carRef.current?.classList.remove("jk-bitten"), BITE_IMMUNE_MS);
          }
          const kAngle = Math.atan2(g.dinoY - g.y, g.dinoX - g.x);
          g.dinoX = Math.max(0, Math.min(100, g.dinoX + Math.cos(kAngle) * 14));
          g.dinoY = Math.max(0, Math.min(100, g.dinoY + Math.sin(kAngle) * 14));
        }
      }
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, difficulty, pxDist, askQuestion, showToast, joystick]);

  return (
    <Shell>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 0" }}>
          <button onClick={() => navigate(`/kelas/${grade}/matematika`)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "1.2rem" }}>
            ←
          </button>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--ink-900)" }}>🚗 Drive Mode — Kelas {grade}</div>
          <div style={{ width: 24 }} />
        </div>

        {phase === "picker" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 24 }}>
            <div style={{ fontSize: 48 }}>🚗💨🦖</div>
            <div style={{ fontFamily: "var(--font-body)", color: "var(--ink-700)", textAlign: "center" }}>
              Kabur dari dino, tabrak rintangan buat dapet poin & soal kilat!
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
              {["easy", "medium", "hard"].map((d) => (
                <Button key={d} variant={d === "medium" ? "primary" : "secondary"} size="lg" onClick={() => startRun(d)}>
                  {d === "easy" ? "Gampang 🙂" : d === "medium" ? "Sedang 😎" : "Susah 🔥"}
                </Button>
              ))}
            </div>
          </div>
        )}

        {phase === "playing" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 18px" }}>
              <div style={{ fontFamily: "var(--font-body)", fontWeight: 700 }}>⭐ {score}/{SCORE_TARGET}</div>
              <div>{"❤️".repeat(MAX_BITES - bites)}{"🖤".repeat(bites)}</div>
            </div>
            <div
              ref={worldRef}
              style={{
                position: "relative",
                flex: 1,
                margin: "0 18px 18px",
                borderRadius: 20,
                background: "linear-gradient(180deg,#cdeccb,#a9d6a5)",
                overflow: "hidden",
              }}
            >
              {obstacles.map((o) => (
                <div key={o.id} style={{ position: "absolute", left: o.x + "%", top: o.y + "%", transform: "translate(-50%,-50%)", fontSize: 26 }}>
                  {o.icon}
                </div>
              ))}
              <div ref={dinoRef} style={{ position: "absolute", left: DINO_START.x + "%", top: DINO_START.y + "%", transform: "translate(-50%,-50%)", fontSize: 30 }}>
                🦖
              </div>
              <div ref={carRef} style={{ position: "absolute", left: CAR_START.x + "%", top: CAR_START.y + "%", transform: "translate(-50%,-50%)", fontSize: 28 }}>
                🚗
              </div>
              {toast && (
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "rgba(0,0,0,0.7)",
                    color: "#fff",
                    padding: "6px 14px",
                    borderRadius: 999,
                    fontSize: "0.8rem",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {toast}
                </div>
              )}
              {question && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(59,42,26,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                  <div style={{ background: "var(--cream-50)", borderRadius: 20, padding: 20, width: "100%", textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1rem", marginBottom: 14 }}>{question.prompt}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {question.options.map((opt) => {
                        const answered = question.answered;
                        const isCorrect = opt === question.correctLabel;
                        let bg = "#fff";
                        if (answered) {
                          if (isCorrect) bg = "var(--pastel-green)";
                          else if (opt === answered) bg = "var(--pastel-pink)";
                        }
                        return (
                          <button
                            key={opt}
                            disabled={!!answered}
                            onClick={() => answerQuestion(opt)}
                            style={{
                              padding: "12px 8px",
                              borderRadius: 12,
                              border: "2px solid var(--cream-300)",
                              background: bg,
                              fontFamily: "var(--font-display)",
                              fontWeight: 700,
                              cursor: answered ? "default" : "pointer",
                            }}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              <div style={{ position: "absolute", left: 14, bottom: 14 }}>
                <Joystick joystick={joystick} />
              </div>
            </div>
          </>
        )}

        {phase === "ended" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 56 }}>{won ? "🏆" : "🦖"}</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.3rem" }}>{won ? "Mantap, menang!" : "Digigit dino 3x!"}</div>
            <div style={{ fontFamily: "var(--font-body)", color: "var(--ink-500)" }}>{won ? `Kamu kumpulin ${SCORE_TARGET} poin!` : "Coba lagi yuk!"}</div>
            <div style={{ display: "flex", gap: 10, width: "100%" }}>
              <Button variant="primary" size="lg" style={{ flex: 1 }} onClick={() => setPhase("picker")}>
                Main Lagi
              </Button>
              <Button variant="secondary" size="lg" style={{ flex: 1 }} onClick={() => navigate(`/kelas/${grade}/matematika`)}>
                Keluar
              </Button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
