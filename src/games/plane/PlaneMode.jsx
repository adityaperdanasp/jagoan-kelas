import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Shell from "../../components/Shell";
import Button from "../../components/ds/Button";
import Joystick from "../shared/Joystick";
import { useJoystick } from "../shared/useJoystick";
import { generateQuickQuestion } from "../shared/quickQuestion";

// Core engine di-port dari pola BrainBox mathville Plane Mode (shmup
// vertikal: joystick, auto-fire, musuh turun+nembak balik, quiz berkala =
// bomb). Versi disederhanain dari versi "endless+boss+power-up" BrainBox --
// v1 ini: 1 tipe musuh + varian sine, gak ada power-up/wingmen/spread/boss/
// respawn-gauntlet/wave-ramp (lihat CLAUDE.md follow-up). Skor target buat
// menang (bukan endless) biar gak butuh balancing wave-ramp dulu.
// Elemen bullet/musuh dimanipulasi langsung ke DOM (bukan React state per
// frame) -- SAMA PERSIS pola BrainBox, biar gak lag.

const SHIP_SPEED = 0.75;
const BULLET_SPEED = 2.2;
const FIRE_INTERVAL_MS = 280;
const ENEMY_SPAWN_MS = 900;
const ENEMY_SPEED = 0.35;
const ENEMY_BULLET_SPEED = 0.9;
const ENEMY_FIRE_MIN_MS = 1400;
const ENEMY_FIRE_MAX_MS = 2600;
const HIT_RADIUS_PX = 22;
const MAX_LIVES = 3;
const HIT_INVULN_MS = 1500;
const QUESTION_INTERVAL_MS = 10000;
const SCORE_TARGET = 20;
const SHIP_START = { x: 50, y: 82 };
const ENEMY_EMOJIS = ["👾", "👽", "🛸"];

function rand(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

export default function PlaneMode() {
  const { grade } = useParams();
  const navigate = useNavigate();
  const joystick = useJoystick(42);

  const [phase, setPhase] = useState("picker"); // picker | playing | ended
  const [difficulty, setDifficulty] = useState("medium");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [won, setWon] = useState(false);
  const [question, setQuestion] = useState(null);

  const worldRef = useRef(null);
  const shipRef = useRef(null);
  const rafRef = useRef(null);
  const gRef = useRef(null); // mutable game state, gak lewat React re-render

  const pxDist = useCallback((ax, ay, bx, by) => {
    const rect = worldRef.current?.getBoundingClientRect();
    if (!rect) return Infinity;
    return Math.hypot(((ax - bx) / 100) * rect.width, ((ay - by) / 100) * rect.height);
  }, []);

  function spawnBullet(x, y) {
    const el = document.createElement("div");
    el.textContent = "🔸";
    el.style.cssText = "position:absolute;font-size:16px;transform:translate(-50%,-50%);";
    worldRef.current.appendChild(el);
    gRef.current.bullets.push({ x, y, el });
  }

  function spawnEnemyBullet(enemy) {
    const g = gRef.current;
    const el = document.createElement("div");
    el.textContent = "🔺";
    el.style.cssText = "position:absolute;font-size:14px;transform:translate(-50%,-50%);";
    worldRef.current.appendChild(el);
    const dx = g.x - enemy.x;
    const dy = g.y - (enemy.y + 3);
    const angle = Math.atan2(dy, dx) + ((Math.random() * 2 - 1) * 20 * Math.PI) / 180;
    g.enemyBullets.push({ x: enemy.x, y: enemy.y + 3, vx: Math.cos(angle) * ENEMY_BULLET_SPEED, vy: Math.sin(angle) * ENEMY_BULLET_SPEED, el });
  }

  function spawnEnemy() {
    const g = gRef.current;
    const el = document.createElement("div");
    el.textContent = ENEMY_EMOJIS[rand(0, ENEMY_EMOJIS.length - 1)];
    el.style.cssText = "position:absolute;font-size:26px;transform:translate(-50%,-50%);";
    worldRef.current.appendChild(el);
    g.enemies.push({ x: rand(10, 90), y: -6, el, phase: Math.random() * Math.PI * 2, nextFireAt: performance.now() + rand(ENEMY_FIRE_MIN_MS, ENEMY_FIRE_MAX_MS) });
  }

  function explosion(x, y) {
    const el = document.createElement("div");
    el.textContent = "💥";
    el.style.cssText = `position:absolute;left:${x}%;top:${y}%;font-size:26px;transform:translate(-50%,-50%);animation:jk-pop .4s ease-out forwards;`;
    worldRef.current.appendChild(el);
    setTimeout(() => el.remove(), 400);
  }

  function clearEnemies() {
    const g = gRef.current;
    g.enemies.forEach((e) => {
      explosion(e.x, e.y);
      e.el.remove();
    });
    g.enemies = [];
    g.enemyBullets.forEach((b) => b.el.remove());
    g.enemyBullets = [];
  }

  const askQuestion = useCallback(() => {
    gRef.current.paused = true;
    setQuestion(generateQuickQuestion(Number(grade), difficulty));
  }, [grade, difficulty]);

  function answerQuestion(opt) {
    if (!question) return;
    const correct = opt === question.correctLabel;
    setQuestion((q) => ({ ...q, answered: opt }));
    if (correct) {
      clearEnemies();
      setScore((s) => Math.min(SCORE_TARGET, s + 2));
    }
    setTimeout(() => {
      setQuestion(null);
      if (gRef.current) {
        gRef.current.paused = false;
        gRef.current.lastQuestionAt = performance.now();
      }
    }, 800);
  }

  function cleanupWorld() {
    const g = gRef.current;
    if (!g) return;
    g.bullets.forEach((b) => b.el.remove());
    g.enemyBullets.forEach((b) => b.el.remove());
    g.enemies.forEach((e) => e.el.remove());
  }

  function endRun(didWin) {
    gRef.current.paused = true;
    gRef.current.ended = true;
    setWon(didWin);
    setPhase("ended");
  }

  function startRun(diff) {
    cleanupWorld();
    setDifficulty(diff);
    gRef.current = {
      x: SHIP_START.x,
      y: SHIP_START.y,
      bullets: [],
      enemyBullets: [],
      enemies: [],
      lastFireAt: 0,
      lastSpawnAt: performance.now(),
      lastQuestionAt: performance.now(),
      invulnUntil: 0,
      paused: false,
      ended: false,
    };
    setScore(0);
    setLives(MAX_LIVES);
    setQuestion(null);
    setPhase("playing");
  }

  useEffect(() => {
    if (phase !== "playing") return;
    function frame() {
      const g = gRef.current;
      if (!g || g.ended) return;
      if (!g.paused) {
        const now = performance.now();
        const vec = joystick.vecRef.current;
        g.x = Math.max(6, Math.min(94, g.x + vec.x * SHIP_SPEED));
        g.y = Math.max(10, Math.min(94, g.y + vec.y * SHIP_SPEED));
        if (shipRef.current) {
          shipRef.current.style.left = g.x + "%";
          shipRef.current.style.top = g.y + "%";
        }

        if (now - g.lastFireAt > FIRE_INTERVAL_MS) {
          g.lastFireAt = now;
          spawnBullet(g.x, g.y - 5);
        }
        if (now - g.lastSpawnAt > ENEMY_SPAWN_MS) {
          g.lastSpawnAt = now;
          spawnEnemy();
        }
        if (now - g.lastQuestionAt > QUESTION_INTERVAL_MS) {
          askQuestion();
        }
        for (const e of g.enemies) {
          if (now > e.nextFireAt) {
            spawnEnemyBullet(e);
            e.nextFireAt = now + rand(ENEMY_FIRE_MIN_MS, ENEMY_FIRE_MAX_MS);
          }
        }

        g.bullets = g.bullets.filter((b) => {
          b.y -= BULLET_SPEED;
          if (b.y < -5) {
            b.el.remove();
            return false;
          }
          b.el.style.left = b.x + "%";
          b.el.style.top = b.y + "%";
          return true;
        });
        g.enemyBullets = g.enemyBullets.filter((b) => {
          b.x += b.vx;
          b.y += b.vy;
          if (b.y > 106 || b.y < -6 || b.x < -6 || b.x > 106) {
            b.el.remove();
            return false;
          }
          b.el.style.left = b.x + "%";
          b.el.style.top = b.y + "%";
          return true;
        });
        g.enemies = g.enemies.filter((e) => {
          e.y += ENEMY_SPEED;
          e.x += Math.sin(now / 300 + e.phase) * 0.3;
          e.x = Math.max(4, Math.min(96, e.x));
          if (e.y > 106) {
            e.el.remove();
            return false;
          }
          e.el.style.left = e.x + "%";
          e.el.style.top = e.y + "%";
          return true;
        });

        // bullet vs enemy
        outer: for (const e of g.enemies.slice()) {
          for (const b of g.bullets.slice()) {
            if (pxDist(e.x, e.y, b.x, b.y) < HIT_RADIUS_PX) {
              explosion(e.x, e.y);
              e.el.remove();
              b.el.remove();
              g.enemies = g.enemies.filter((x) => x !== e);
              g.bullets = g.bullets.filter((x) => x !== b);
              setScore((s) => {
                const ns = Math.min(SCORE_TARGET, s + 1);
                if (ns >= SCORE_TARGET) endRun(true);
                return ns;
              });
              break outer;
            }
          }
        }

        // ship hit
        if (now >= g.invulnUntil) {
          let hit = false;
          for (const e of g.enemies) {
            if (pxDist(e.x, e.y, g.x, g.y) < HIT_RADIUS_PX) hit = true;
          }
          for (const b of g.enemyBullets) {
            if (pxDist(b.x, b.y, g.x, g.y) < HIT_RADIUS_PX) hit = true;
          }
          if (hit) {
            g.invulnUntil = now + HIT_INVULN_MS;
            if (shipRef.current) {
              shipRef.current.classList.add("jk-bitten");
              setTimeout(() => shipRef.current?.classList.remove("jk-bitten"), HIT_INVULN_MS);
            }
            setLives((l) => {
              const nl = l - 1;
              if (nl <= 0) endRun(false);
              return nl;
            });
          }
        }
      }
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafRef.current);
      cleanupWorld();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <Shell>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 0" }}>
          <button onClick={() => navigate(`/kelas/${grade}/matematika`)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "1.2rem" }}>
            ←
          </button>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--ink-900)" }}>✈️ Plane Mode — Kelas {grade}</div>
          <div style={{ width: 24 }} />
        </div>

        {phase === "picker" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 24 }}>
            <div style={{ fontSize: 48 }}>✈️💥👾</div>
            <div style={{ fontFamily: "var(--font-body)", color: "var(--ink-700)", textAlign: "center" }}>
              Tembak musuh, hindarin peluru, jawab soal buat bom semua musuh!
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
              <div>{"❤️".repeat(Math.max(0, lives))}{"🖤".repeat(MAX_LIVES - Math.max(0, lives))}</div>
            </div>
            <div
              ref={worldRef}
              style={{
                position: "relative",
                flex: 1,
                margin: "0 18px 18px",
                borderRadius: 20,
                background: "linear-gradient(180deg,#1b2a4a,#3a4d7a)",
                overflow: "hidden",
              }}
            >
              <div ref={shipRef} style={{ position: "absolute", left: SHIP_START.x + "%", top: SHIP_START.y + "%", transform: "translate(-50%,-50%)", fontSize: 28 }}>
                🚀
              </div>
              {question && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(59,42,26,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
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
                    <div style={{ fontSize: "0.75rem", color: "var(--ink-400)", marginTop: 10 }}>Jawab bener = bom semua musuh! 💣</div>
                  </div>
                </div>
              )}
              <div style={{ position: "absolute", left: 14, bottom: 14 }}>
                <Joystick joystick={joystick} color="var(--pastel-purple)" />
              </div>
            </div>
          </>
        )}

        {phase === "ended" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 56 }}>{won ? "🏆" : "💥"}</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.3rem" }}>{won ? "Mantap, menang!" : "Kena musuh terus!"}</div>
            <div style={{ fontFamily: "var(--font-body)", color: "var(--ink-500)" }}>Skor akhir: {score}</div>
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
