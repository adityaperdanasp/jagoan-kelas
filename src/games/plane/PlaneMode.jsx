import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Shell from "../../components/Shell";
import Button from "../../components/ds/Button";
import Joystick from "../shared/Joystick";
import { useJoystick } from "../shared/useJoystick";
import { generateQuickQuestion } from "../shared/quickQuestion";
import { TRACK_PLANE, useBgmTrack } from "../../data/bgm";

// Core engine di-port dari pola BrainBox mathville Plane Mode (shmup
// vertikal: joystick, auto-fire, musuh turun+nembak balik, quiz berkala =
// bomb). Elemen bullet/musuh/power-up dimanipulasi langsung ke DOM (bukan
// React state per frame) -- SAMA PERSIS pola BrainBox, biar gak lag.
//
// Fase lanjutan (2026-08-05) di-port dari BrainBox `mathville/script.js`
// (cari komentar "PLANE MODE" / "Phase 5" / "Phase 6" / "v2" / "v3"),
// nilai-nilai konstanta diadaptasi (BUKAN dicopy 1:1 semua -- BrainBox-nya
// endless murni & butuh berbulan-bulan balancing lintas playtesting, kita
// ambil bentuknya: power-up, boss, respawn gauntlet, endless+ramp, high
// score persisten):
// - Power-up (⚡ rapid-fire / 🛡️ shield) drop dari musuh biasa yang mati,
//   dipungut nabrak badan pesawat.
// - Boss muncul tiap skor nyampe threshold (naik tiap boss kalah), HP
//   beberapa kali kena, jawaban benar juga ngasih damage ke boss (bukan
//   cuma bom musuh biasa).
// - Nyawa habis TIDAK langsung game over -- respawn gauntlet: jawab
//   beberapa soal benar BERTURUT-TURUT buat balik main full nyawa, max
//   sekian kali per sesi.
// - Endless: ngalahin boss GAK ngakhirin game, lanjut makin susah (spawn
//   makin rapat, threshold boss berikutnya makin jauh).
// - High score persisten per kelas (localStorage, bukan Firestore -- ini
//   cuma rekor lokal di device, beda dari XP yang kesimpen ke akun).

const SHIP_SPEED = 0.75;
const BULLET_SPEED = 2.2;
const FIRE_INTERVAL_MS = 280;
const RAPID_FIRE_INTERVAL_MS = 140; // 2x auto-fire rate pas rapid-fire aktif
const ENEMY_SPAWN_MS = 900;
const ENEMY_SPAWN_MS_MIN = 400; // spawn interval gak boleh lebih cepet dari ini walau density ramp tinggi
const ENEMY_SPEED = 0.35;
const ENEMY_BULLET_SPEED = 0.9;
const ENEMY_FIRE_MIN_MS = 1400;
const ENEMY_FIRE_MAX_MS = 2600;
const HIT_RADIUS_PX = 22;
const MAX_LIVES = 3;
const HIT_INVULN_MS = 1500;
const QUESTION_INTERVAL_MS = 10000;
const QUESTION_INTERVAL_MIN_MS = 7000; // makin cepet seiring endless ramp, tapi ada batas bawah
const SHIP_START = { x: 50, y: 82 };
const ENEMY_EMOJIS = ["👾", "👽", "🛸"];

// --- Power-up (Fase 5) ---
const POWERUP_DROP_CHANCE = 0.22; // per musuh biasa yang mati (bukan boss)
const POWERUP_FALL_SPEED = 0.28;
const POWERUP_PICKUP_RADIUS_PX = 26;
const RAPID_DURATION_MS = 8000;
const SHIELD_DURATION_MS = 6000;

// --- Boss (Fase 5-6) ---
const BOSS_SCORE_THRESHOLD_START = 15;
const BOSS_THRESHOLD_STEP = 15; // makin jauh tiap boss berikutnya
const BOSS_HP_MAX = 8;
const BOSS_SPEED = 0.28;
const BOSS_FIRE_MIN_MS = 900;
const BOSS_FIRE_MAX_MS = 1600;
const BOSS_Y = 16;
const BOSS_QUESTION_DAMAGE = 3; // jawaban benar pas ada boss = damage, bukan cuma bom musuh biasa
const BOSS_WIN_XP_BONUS = 3; // skor bonus tiap boss kalah

// --- Respawn gauntlet (v2) ---
const MAX_RESPAWNS = 3;
const RESPAWN_CORRECT_NEEDED = 3;

// --- Endless ramp (v2) ---
const ENEMY_DENSITY_BOSS_MULT = 1.2; // compounding tiap boss kalah

function rand(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function highScoreKey(grade) {
  return `jk_plane_highscore_kelas${grade}`;
}

export default function PlaneMode() {
  const { grade } = useParams();
  const navigate = useNavigate();
  const joystick = useJoystick(42);
  useBgmTrack(TRACK_PLANE);

  const [phase, setPhase] = useState("picker"); // picker | playing | ended
  const [difficulty, setDifficulty] = useState("medium");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [question, setQuestion] = useState(null);
  const [bossHp, setBossHp] = useState(null); // null = gak ada boss lagi
  const [respawning, setRespawning] = useState(false);
  const [respawnProgress, setRespawnProgress] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [activePowerups, setActivePowerups] = useState({ rapid: false, shield: false });

  const worldRef = useRef(null);
  const shipRef = useRef(null);
  const rafRef = useRef(null);
  const gRef = useRef(null); // mutable game state, gak lewat React re-render
  const activePowerupsRef = useRef({ rapid: false, shield: false }); // buat deteksi PERUBAHAN tiap frame -- baca React state `activePowerups` di sini bakal stale (closure frame() dibuat sekali, gak keikut re-render)

  useEffect(() => {
    const saved = Number(localStorage.getItem(highScoreKey(grade)) || 0);
    setHighScore(saved);
  }, [grade]);

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

  function spawnEnemyBullet(x, y) {
    const g = gRef.current;
    const el = document.createElement("div");
    el.textContent = "🔺";
    el.style.cssText = "position:absolute;font-size:14px;transform:translate(-50%,-50%);";
    worldRef.current.appendChild(el);
    const dx = g.x - x;
    const dy = g.y - (y + 3);
    const angle = Math.atan2(dy, dx) + ((Math.random() * 2 - 1) * 20 * Math.PI) / 180;
    g.enemyBullets.push({ x, y: y + 3, vx: Math.cos(angle) * ENEMY_BULLET_SPEED, vy: Math.sin(angle) * ENEMY_BULLET_SPEED, el });
  }

  function spawnEnemy() {
    const g = gRef.current;
    const el = document.createElement("div");
    el.textContent = ENEMY_EMOJIS[rand(0, ENEMY_EMOJIS.length - 1)];
    el.style.cssText = "position:absolute;font-size:26px;transform:translate(-50%,-50%);";
    worldRef.current.appendChild(el);
    g.enemies.push({ x: rand(10, 90), y: -6, el, phase: Math.random() * Math.PI * 2, nextFireAt: performance.now() + rand(ENEMY_FIRE_MIN_MS, ENEMY_FIRE_MAX_MS) });
  }

  function spawnPowerup(x, y) {
    const g = gRef.current;
    const type = Math.random() < 0.5 ? "rapid" : "shield";
    const el = document.createElement("div");
    el.textContent = type === "rapid" ? "⚡" : "🛡️";
    el.style.cssText = "position:absolute;font-size:22px;transform:translate(-50%,-50%);filter:drop-shadow(0 0 4px rgba(255,255,255,0.8));";
    worldRef.current.appendChild(el);
    g.powerups.push({ x, y, type, el });
  }

  function spawnBoss() {
    const g = gRef.current;
    const el = document.createElement("div");
    el.textContent = "🐉";
    el.style.cssText = "position:absolute;font-size:44px;transform:translate(-50%,-50%);";
    worldRef.current.appendChild(el);
    g.boss = { x: 50, y: BOSS_Y, hp: BOSS_HP_MAX, el, dir: 1, nextFireAt: performance.now() + BOSS_FIRE_MIN_MS };
    setBossHp({ hp: BOSS_HP_MAX, max: BOSS_HP_MAX });
  }

  function explosion(x, y, big) {
    const el = document.createElement("div");
    el.textContent = "💥";
    el.style.cssText = `position:absolute;left:${x}%;top:${y}%;font-size:${big ? 44 : 26}px;transform:translate(-50%,-50%);animation:jk-pop .4s ease-out forwards;`;
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

  function damageBoss(amount) {
    const g = gRef.current;
    if (!g.boss) return;
    g.boss.hp -= amount;
    if (g.boss.hp <= 0) {
      handleBossDefeat();
    } else {
      setBossHp({ hp: g.boss.hp, max: BOSS_HP_MAX });
    }
  }

  function handleBossDefeat() {
    const g = gRef.current;
    explosion(g.boss.x, g.boss.y, true);
    g.boss.el.remove();
    g.boss = null;
    setBossHp(null);
    g.bossesDefeated += 1;
    g.bossThreshold += BOSS_THRESHOLD_STEP;
    g.enemyDensity *= ENEMY_DENSITY_BOSS_MULT;
    bumpScore(BOSS_WIN_XP_BONUS);
  }

  // Skor "beneran" disimpen di gRef.current.score (dibaca tiap frame buat
  // cek boss threshold dkk) -- React state `score` cuma buat DISPLAY, biar
  // gak perlu masukin `score` ke dependency array game loop (yang bakal
  // bikin loop-nya restart & world ke-cleanup tiap kali skor berubah).
  function bumpScore(delta) {
    const g = gRef.current;
    g.score = (g.score || 0) + delta;
    setScore(g.score);
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
      bumpScore(2);
      if (gRef.current.boss) damageBoss(BOSS_QUESTION_DAMAGE);
    }
    setTimeout(() => {
      setQuestion(null);
      if (gRef.current) {
        gRef.current.paused = false;
        gRef.current.lastQuestionAt = performance.now();
      }
    }, 800);
  }

  // respawnProgressRef nyimpen progress ASLI (dibaca/ditulis sinkron) --
  // setRespawnProgress React state cuma buat DISPLAY. StrictMode dev
  // nge-double-invoke updater function functional-form (`setX(p => ...)`),
  // jadi side effect (setLives/setRespawning/dst) DILARANG ditaro di situ,
  // makanya percabangan berhasil/gagal-nya dihitung dari ref, bukan dari
  // parameter updater.
  const respawnProgressRef = useRef(0);

  function startRespawnGauntlet() {
    respawnProgressRef.current = 0;
    setRespawning(true);
    setRespawnProgress(0);
    gRef.current.paused = true;
    setQuestion(generateQuickQuestion(Number(grade), difficulty));
  }

  function answerRespawnQuestion(opt) {
    if (!question) return;
    const correct = opt === question.correctLabel;
    setQuestion((q) => ({ ...q, answered: opt }));
    setTimeout(() => {
      if (correct) {
        respawnProgressRef.current += 1;
        setRespawnProgress(respawnProgressRef.current);
        if (respawnProgressRef.current >= RESPAWN_CORRECT_NEEDED) {
          // berhasil -- balik main full nyawa
          setRespawning(false);
          setQuestion(null);
          setLives(MAX_LIVES);
          const g = gRef.current;
          g.respawnsUsed += 1;
          g.invulnUntil = performance.now() + HIT_INVULN_MS;
          g.paused = false;
        } else {
          setQuestion(generateQuickQuestion(Number(grade), difficulty));
        }
      } else {
        // salah cuma reroll soal, progress gak turun (sama kayak BrainBox)
        setQuestion(generateQuickQuestion(Number(grade), difficulty));
      }
    }, 700);
  }

  function cleanupWorld() {
    const g = gRef.current;
    if (!g) return;
    g.bullets.forEach((b) => b.el.remove());
    g.enemyBullets.forEach((b) => b.el.remove());
    g.enemies.forEach((e) => e.el.remove());
    g.powerups.forEach((p) => p.el.remove());
    if (g.boss) g.boss.el.remove();
  }

  function endRun() {
    const g = gRef.current;
    g.paused = true;
    g.ended = true;
    setPhase("ended");
    if (g.score > highScore) {
      setHighScore(g.score);
      localStorage.setItem(highScoreKey(grade), String(g.score));
    }
  }

  function startRun(diff) {
    cleanupWorld();
    setDifficulty(diff);
    gRef.current = {
      x: SHIP_START.x,
      y: SHIP_START.y,
      score: 0,
      bullets: [],
      enemyBullets: [],
      enemies: [],
      powerups: [],
      boss: null,
      bossThreshold: BOSS_SCORE_THRESHOLD_START,
      bossesDefeated: 0,
      enemyDensity: 1,
      respawnsUsed: 0,
      rapidUntil: 0,
      shieldUntil: 0,
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
    setBossHp(null);
    setRespawning(false);
    activePowerupsRef.current = { rapid: false, shield: false };
    setActivePowerups(activePowerupsRef.current);
    setPhase("playing");
  }

  useEffect(() => {
    if (phase !== "playing") return;
    function frame() {
      const g = gRef.current;
      if (!g || g.ended) return;
      if (!g.paused) {
        const now = performance.now();
        const rapidActive = now < g.rapidUntil;
        const shieldActive = now < g.shieldUntil;
        if (rapidActive !== activePowerupsRef.current.rapid || shieldActive !== activePowerupsRef.current.shield) {
          activePowerupsRef.current = { rapid: rapidActive, shield: shieldActive };
          setActivePowerups(activePowerupsRef.current);
        }

        const vec = joystick.vecRef.current;
        g.x = Math.max(6, Math.min(94, g.x + vec.x * SHIP_SPEED));
        g.y = Math.max(10, Math.min(94, g.y + vec.y * SHIP_SPEED));
        if (shipRef.current) {
          shipRef.current.style.left = g.x + "%";
          shipRef.current.style.top = g.y + "%";
        }

        const fireInterval = rapidActive ? RAPID_FIRE_INTERVAL_MS : FIRE_INTERVAL_MS;
        if (now - g.lastFireAt > fireInterval) {
          g.lastFireAt = now;
          spawnBullet(g.x, g.y - 5);
        }
        // musuh biasa berhenti spawn total pas boss lagi aktif
        const spawnMs = Math.max(ENEMY_SPAWN_MS_MIN, ENEMY_SPAWN_MS / g.enemyDensity);
        if (!g.boss && now - g.lastSpawnAt > spawnMs) {
          g.lastSpawnAt = now;
          spawnEnemy();
        }
        const questionInterval = Math.max(QUESTION_INTERVAL_MIN_MS, QUESTION_INTERVAL_MS - g.bossesDefeated * 500);
        if (now - g.lastQuestionAt > questionInterval) {
          askQuestion();
        }
        // boss muncul begitu skor nyampe threshold & belum ada boss aktif
        if (!g.boss && g.score >= g.bossThreshold) {
          spawnBoss();
        }

        for (const e of g.enemies) {
          if (now > e.nextFireAt) {
            spawnEnemyBullet(e.x, e.y + 3);
            e.nextFireAt = now + rand(ENEMY_FIRE_MIN_MS, ENEMY_FIRE_MAX_MS);
          }
        }
        if (g.boss && now > g.boss.nextFireAt) {
          spawnEnemyBullet(g.boss.x, g.boss.y + 8);
          g.boss.nextFireAt = now + rand(BOSS_FIRE_MIN_MS, BOSS_FIRE_MAX_MS);
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
        g.powerups = g.powerups.filter((p) => {
          p.y += POWERUP_FALL_SPEED;
          if (p.y > 106) {
            p.el.remove();
            return false;
          }
          p.el.style.left = p.x + "%";
          p.el.style.top = p.y + "%";
          return true;
        });
        if (g.boss) {
          g.boss.x += g.boss.dir * BOSS_SPEED;
          if (g.boss.x < 12 || g.boss.x > 88) g.boss.dir *= -1;
          g.boss.x = Math.max(12, Math.min(88, g.boss.x));
          g.boss.el.style.left = g.boss.x + "%";
          g.boss.el.style.top = g.boss.y + "%";
        }

        // bullet vs enemy biasa (drop power-up chance)
        outer: for (const e of g.enemies.slice()) {
          for (const b of g.bullets.slice()) {
            if (pxDist(e.x, e.y, b.x, b.y) < HIT_RADIUS_PX) {
              explosion(e.x, e.y);
              e.el.remove();
              b.el.remove();
              g.enemies = g.enemies.filter((x) => x !== e);
              g.bullets = g.bullets.filter((x) => x !== b);
              if (Math.random() < POWERUP_DROP_CHANCE) spawnPowerup(e.x, e.y);
              bumpScore(1);
              break outer;
            }
          }
        }
        // bullet vs boss
        if (g.boss) {
          for (const b of g.bullets.slice()) {
            if (pxDist(g.boss.x, g.boss.y, b.x, b.y) < HIT_RADIUS_PX + 8) {
              b.el.remove();
              g.bullets = g.bullets.filter((x) => x !== b);
              damageBoss(1);
              break;
            }
          }
        }
        // power-up pickup
        g.powerups = g.powerups.filter((p) => {
          if (pxDist(p.x, p.y, g.x, g.y) < POWERUP_PICKUP_RADIUS_PX) {
            p.el.remove();
            if (p.type === "rapid") g.rapidUntil = now + RAPID_DURATION_MS;
            else g.shieldUntil = now + SHIELD_DURATION_MS;
            return false;
          }
          return true;
        });

        // ship hit
        if (now >= g.invulnUntil) {
          let hit = false;
          for (const e of g.enemies) {
            if (pxDist(e.x, e.y, g.x, g.y) < HIT_RADIUS_PX) hit = true;
          }
          for (const b of g.enemyBullets) {
            if (pxDist(b.x, b.y, g.x, g.y) < HIT_RADIUS_PX) hit = true;
          }
          if (g.boss && pxDist(g.boss.x, g.boss.y, g.x, g.y) < HIT_RADIUS_PX + 10) hit = true;
          if (hit) {
            if (now < g.shieldUntil) {
              // shield nyerap 1 hit, gak kurangin nyawa
              g.shieldUntil = 0;
              g.invulnUntil = now + 400;
            } else {
              g.invulnUntil = now + HIT_INVULN_MS;
              if (shipRef.current) {
                shipRef.current.classList.add("jk-bitten");
                setTimeout(() => shipRef.current?.classList.remove("jk-bitten"), HIT_INVULN_MS);
              }
              setLives((l) => {
                const nl = l - 1;
                if (nl <= 0) {
                  if (g.respawnsUsed < MAX_RESPAWNS) {
                    startRespawnGauntlet();
                  } else {
                    endRun();
                  }
                }
                return nl;
              });
            }
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
              Tembak musuh, hindarin peluru, jawab soal buat bom semua musuh! Pungut ⚡/🛡️, lawan boss 🐉, dan main terus tanpa batas.
            </div>
            {highScore > 0 && (
              <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, color: "var(--ink-500)" }}>🏆 Rekor kamu: {highScore}</div>
            )}
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 18px" }}>
              <div style={{ fontFamily: "var(--font-body)", fontWeight: 700 }}>⭐ {score}</div>
              <div style={{ display: "flex", gap: 6 }}>
                {activePowerups.rapid && <span title="Rapid-fire aktif">⚡</span>}
                {activePowerups.shield && <span title="Shield aktif">🛡️</span>}
              </div>
              <div>{"❤️".repeat(Math.max(0, lives))}{"🖤".repeat(MAX_LIVES - Math.max(0, lives))}</div>
            </div>
            {bossHp && (
              <div style={{ padding: "0 18px 8px" }}>
                <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-body)", color: "var(--ink-500)", marginBottom: 2 }}>🐉 Boss</div>
                <div style={{ height: 8, background: "var(--cream-300)", borderRadius: 999 }}>
                  <div style={{ height: "100%", width: `${(bossHp.hp / bossHp.max) * 100}%`, background: "var(--color-error)", borderRadius: 999, transition: "width 0.2s" }} />
                </div>
              </div>
            )}
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
              {question && !respawning && (
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
                    <div style={{ fontSize: "0.75rem", color: "var(--ink-400)", marginTop: 10 }}>
                      {gRef.current?.boss ? "Jawab bener = bom musuh + damage boss! 💣" : "Jawab bener = bom semua musuh! 💣"}
                    </div>
                  </div>
                </div>
              )}
              {respawning && question && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(59,42,26,.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                  <div style={{ background: "var(--cream-50)", borderRadius: 20, padding: 20, width: "100%", textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", color: "var(--color-error)", marginBottom: 6 }}>
                      💔 Kesempatan Terakhir!
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--ink-500)", marginBottom: 10 }}>
                      Jawab {RESPAWN_CORRECT_NEEDED} soal benar berturut-turut buat balik main! ({respawnProgress}/{RESPAWN_CORRECT_NEEDED})
                    </div>
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
                            onClick={() => answerRespawnQuestion(opt)}
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
                <Joystick joystick={joystick} color="var(--pastel-purple)" />
              </div>
            </div>
          </>
        )}

        {phase === "ended" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 56 }}>{score >= highScore && score > 0 ? "🏆" : "💥"}</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.3rem" }}>
              {score >= highScore && score > 0 ? "Rekor baru!" : "Kena musuh terus!"}
            </div>
            <div style={{ fontFamily: "var(--font-body)", color: "var(--ink-500)" }}>
              Skor akhir: {score} · Rekor: {highScore}
            </div>
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
