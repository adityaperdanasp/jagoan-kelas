import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Shell from "../../components/Shell";
import Button from "../../components/ds/Button";
import Joystick from "../shared/Joystick";
import { useJoystick } from "../shared/useJoystick";
import { generateQuickQuestion } from "../shared/quickQuestion";
import { TRACK_DRIVE, useBgmTrack } from "../../data/bgm";

// Core engine di-port dari pola BrainBox mathville Drive Mode (car top-down
// dodge + dino chase + quiz-on-obstacle-hit), versi disederhanain -- 1 dino
// (bukan 2 di Hard), gak ada city-markers-ke-chapter atau dino obstacle-
// avoidance steering (lihat CLAUDE.md buat daftar follow-up). Soal-nya
// grade-aware: ambil dari kelas yang lagi dimainin, bukan dipatok kelas 4
// kayak BrainBox punya.
//
// Nitro boost (2026-08-04) di-port dari BrainBox mathville/script.js
// (DRIVE_NITRO_* constants) -- nilai SAMA PERSIS: 1.6x speed pas boost,
// abis dalam 2.5 detik boost terus-terusan, isi ulang penuh dalam 6 detik
// pas gak dipake. Frame-based (bukan real delta-time), sama simplifikasi
// kayak BrainBox (asumsi ~60fps, bukan ngukur elapsed time beneran).
//
// Water gun + vehicle skin picker (2026-08-05) di-port dari BrainBox
// (DRIVE_WATER_* constants + VEHICLE_SKINS). Water gun: joystick kanan
// terpisah buat aim 360 derajat, tahan (di luar deadzone) buat nembak jet
// air ke arah dino -- kena TOTAL sekian frame (akumulatif lintas beberapa
// semburan) bikin dino melambat sementara. Tombol nitro dipindah ke header
// atas (bukan lagi kanan-bawah) biar gak rebutan tempat sama aim-joystick
// yang butuh posisi jempol yang sama. Vehicle skin: ganti tampilan mobil
// (emoji, bukan SVG custom kayak BrainBox -- app ini emoji-based dari
// awal), persisten di localStorage, murni kosmetik.

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
const NITRO_MULT = 1.6;
const NITRO_DRAIN_PER_FRAME = 100 / (2.5 * 60); // abis dalam 2.5s @ ~60fps
const NITRO_REGEN_PER_FRAME = 100 / (6 * 60); // full dalam 6s @ ~60fps

const WATER_RANGE_PX = 128;
const WATER_CONE_RAD = Math.PI / 10; // half-angle ~18 derajat
const WATER_AIM_DEADZONE = 0.3;
const WATER_WET_NEEDED_FRAMES = 3 * 60; // 3 detik KENA (akumulatif, bukan mesti 1 semburan)
const WATER_SLOW_FRAMES = 2 * 60; // dino melambat 2 detik abis basah cukup
const WATER_SLOW_MULT = 0.7; // -30% speed
const WATER_MAX_STREAM_FRAMES = 1.5 * 60; // tangki abis abis nembak 1.5 detik nonstop
const WATER_COOLDOWN_FRAMES = 1.5 * 60; // baru bisa nembak lagi abis cooldown ini

const VEHICLE_SKINS = [
  { id: "car", emoji: "🚗", name: "Blaze" },
  { id: "taxi", emoji: "🚕", name: "Comet" },
  { id: "suv", emoji: "🚙", name: "Turbo" },
  { id: "police", emoji: "🚓", name: "Sunburst" },
  { id: "race", emoji: "🏎️", name: "Nova" },
];
const VEHICLE_SKIN_KEY = "jk_drive_vehicle_skin";

function getVehicleSkin() {
  const id = localStorage.getItem(VEHICLE_SKIN_KEY);
  return VEHICLE_SKINS.find((s) => s.id === id) || VEHICLE_SKINS[0];
}

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
  const aimJoystick = useJoystick(38);
  useBgmTrack(TRACK_DRIVE);

  const [phase, setPhase] = useState("picker"); // picker | playing | ended
  const [difficulty, setDifficulty] = useState("medium");
  const [obstacles, setObstacles] = useState([]);
  const [score, setScore] = useState(0);
  const [bites, setBites] = useState(0);
  const [won, setWon] = useState(false);
  const [toast, setToast] = useState(null);
  const [question, setQuestion] = useState(null);
  const [vehicleSkin, setVehicleSkin] = useState(getVehicleSkin);
  const [pickingSkin, setPickingSkin] = useState(false);

  const worldRef = useRef(null);
  const carRef = useRef(null);
  const dinoRef = useRef(null);
  const waterJetRef = useRef(null);
  const gameRef = useRef({
    x: CAR_START.x, y: CAR_START.y, dinoX: DINO_START.x, dinoY: DINO_START.y,
    paused: false, immuneUntil: 0, nitroFuel: 100,
    dinoWetFrames: 0, dinoSlowFrames: 0, waterStreamFrames: 0, waterCoolFrames: 0,
  });
  const obstaclesRef = useRef([]);
  const rafRef = useRef(null);
  const boostingRef = useRef(false);
  const nitroFillRef = useRef(null);
  const nitroBtnRef = useRef(null);

  function pickVehicleSkin(skin) {
    localStorage.setItem(VEHICLE_SKIN_KEY, skin.id);
    setVehicleSkin(skin);
    setPickingSkin(false);
  }

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
    gameRef.current = {
      x: CAR_START.x, y: CAR_START.y, dinoX: DINO_START.x, dinoY: DINO_START.y,
      paused: false, immuneUntil: 0, nitroFuel: 100,
      dinoWetFrames: 0, dinoSlowFrames: 0, waterStreamFrames: 0, waterCoolFrames: 0,
    };
    boostingRef.current = false;
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
        // Nitro fuel drain/regen -- boostingRef diset lewat tombol ⚡
        // (hold), fuel cuma regen pas LAGI GAK boost, sama kayak BrainBox.
        if (boostingRef.current && g.nitroFuel > 0) {
          g.nitroFuel = Math.max(0, g.nitroFuel - NITRO_DRAIN_PER_FRAME);
        } else {
          g.nitroFuel = Math.min(100, g.nitroFuel + NITRO_REGEN_PER_FRAME);
        }
        if (nitroFillRef.current) nitroFillRef.current.style.width = g.nitroFuel + "%";
        if (nitroBtnRef.current) nitroBtnRef.current.classList.toggle("jk-nitro-empty", g.nitroFuel <= 0);
        const nitroActive = boostingRef.current && g.nitroFuel > 0;
        const speedMult = nitroActive ? NITRO_MULT : 1;

        // Water gun -- aim-joystick kanan, tahan di luar deadzone buat
        // nembak. Tangki abis 1.5 detik nonstop, cooldown 1.5 detik
        // sebelum bisa nembak lagi. Kena dino TOTAL 3 detik (akumulatif
        // lintas semburan) trigger slow 2 detik -30% speed.
        const aimVec = aimJoystick.vecRef.current;
        const aimMag = Math.min(1, Math.hypot(aimVec.x, aimVec.y));
        let firing = false;
        if (g.waterCoolFrames > 0) {
          g.waterCoolFrames -= 1;
        } else if (aimMag > WATER_AIM_DEADZONE) {
          firing = true;
          g.waterStreamFrames += 1;
          if (g.waterStreamFrames >= WATER_MAX_STREAM_FRAMES) {
            g.waterCoolFrames = WATER_COOLDOWN_FRAMES;
            g.waterStreamFrames = 0;
            firing = false;
          }
        } else {
          g.waterStreamFrames = 0;
        }
        const aimAngle = Math.atan2(aimVec.y, aimVec.x);
        if (waterJetRef.current) {
          waterJetRef.current.style.display = firing ? "block" : "none";
          if (firing) {
            waterJetRef.current.style.left = g.x + "%";
            waterJetRef.current.style.top = g.y + "%";
            waterJetRef.current.style.transform = `translate(-50%,-50%) rotate(${headingCss(aimAngle)}deg)`;
          }
        }
        if (firing) {
          const distToDinoPx = pxDist(g.dinoX, g.dinoY, g.x, g.y);
          const angleToDino = Math.atan2(g.dinoY - g.y, g.dinoX - g.x);
          let angleDiff = Math.abs(angleToDino - aimAngle);
          if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
          if (distToDinoPx < WATER_RANGE_PX && angleDiff < WATER_CONE_RAD) {
            g.dinoWetFrames += 1;
            if (g.dinoWetFrames >= WATER_WET_NEEDED_FRAMES) {
              g.dinoSlowFrames = WATER_SLOW_FRAMES;
              g.dinoWetFrames = 0;
            }
          }
        }
        if (g.dinoSlowFrames > 0) g.dinoSlowFrames -= 1;
        const dinoSlowMult = g.dinoSlowFrames > 0 ? WATER_SLOW_MULT : 1;

        const vec = joystick.vecRef.current;
        const mag = Math.min(1, Math.hypot(vec.x, vec.y));
        if (mag > 0.05) {
          const angle = Math.atan2(vec.y, vec.x);
          g.x = Math.max(0, Math.min(100, g.x + Math.cos(angle) * CAR_SPEED * speedMult * mag));
          g.y = Math.max(0, Math.min(100, g.y + Math.sin(angle) * CAR_SPEED * speedMult * mag));
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
          const step = Math.min(dist, DINO_SPEED * dinoDiffMult * dinoSlowMult);
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
  }, [phase, difficulty, pxDist, askQuestion, showToast, joystick, aimJoystick]);

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

        {phase === "picker" && !pickingSkin && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 24 }}>
            <div style={{ fontSize: 48 }}>{vehicleSkin.emoji}💨🦖</div>
            <div style={{ fontFamily: "var(--font-body)", color: "var(--ink-700)", textAlign: "center" }}>
              Kabur dari dino, tabrak rintangan buat dapet poin & soal kilat! Tahan ⚡ buat nitro, aim-stick kanan buat semprot air 💦.
            </div>
            <Button variant="secondary" size="sm" onClick={() => setPickingSkin(true)}>
              Ganti Mobil: {vehicleSkin.name} {vehicleSkin.emoji}
            </Button>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
              {["easy", "medium", "hard"].map((d) => (
                <Button key={d} variant={d === "medium" ? "primary" : "secondary"} size="lg" onClick={() => startRun(d)}>
                  {d === "easy" ? "Gampang 🙂" : d === "medium" ? "Sedang 😎" : "Susah 🔥"}
                </Button>
              ))}
            </div>
          </div>
        )}

        {phase === "picker" && pickingSkin && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 24 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--ink-900)" }}>Pilih Mobil Kamu</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, width: "100%" }}>
              {VEHICLE_SKINS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => pickVehicleSkin(s)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    padding: "14px 8px", borderRadius: 16, cursor: "pointer",
                    border: s.id === vehicleSkin.id ? "3px solid var(--pastel-green)" : "2px solid var(--cream-300)",
                    background: s.id === vehicleSkin.id ? "var(--pastel-green)" : "var(--cream-50)",
                  }}
                >
                  <span style={{ fontSize: 32 }}>{s.emoji}</span>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", fontWeight: 700 }}>{s.name}</span>
                </button>
              ))}
            </div>
            <Button variant="secondary" size="md" onClick={() => setPickingSkin(false)}>
              Selesai
            </Button>
          </div>
        )}

        {phase === "playing" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 18px", gap: 10 }}>
              <div style={{ fontFamily: "var(--font-body)", fontWeight: 700 }}>⭐ {score}/{SCORE_TARGET}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 34, height: 8, borderRadius: 999, background: "var(--cream-300)", overflow: "hidden" }}>
                  <div ref={nitroFillRef} style={{ width: "100%", height: "100%", background: "var(--pastel-gold)" }} />
                </div>
                <button
                  ref={nitroBtnRef}
                  onPointerDown={(e) => {
                    boostingRef.current = true;
                    try {
                      e.currentTarget.setPointerCapture?.(e.pointerId);
                    } catch {
                      // beberapa environment (mis. simulated pointer event) nolak
                      // capture -- gak fatal, tombolnya masih kepencet biasa.
                    }
                  }}
                  onPointerUp={() => (boostingRef.current = false)}
                  onPointerLeave={() => (boostingRef.current = false)}
                  style={{
                    width: 34, height: 34, borderRadius: "50%", border: "none",
                    background: "var(--pastel-gold)", fontSize: 16, cursor: "pointer",
                    WebkitTapHighlightColor: "transparent", touchAction: "none",
                  }}
                >
                  ⚡
                </button>
              </div>
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
                {vehicleSkin.emoji}
              </div>
              <div
                ref={waterJetRef}
                style={{
                  position: "absolute", left: CAR_START.x + "%", top: CAR_START.y + "%",
                  transform: "translate(-50%,-50%)", fontSize: 20, display: "none", pointerEvents: "none",
                }}
              >
                💦
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
              <div style={{ position: "absolute", right: 14, bottom: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 11, fontFamily: "var(--font-body)", color: "var(--ink-500)" }}>💦 aim</span>
                <Joystick joystick={aimJoystick} size={76} color="var(--pastel-blue)" />
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
