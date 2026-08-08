import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Shell from "../components/Shell";
import { loadRawTopics } from "../data/contentLoader";
import { getSubjectProgress, computeStatuses } from "../data/progressService";
import { usePlayer } from "../data/PlayerContext";
import { TRACK_BY_SUBJECT, useBgmTrack } from "../data/bgm";
import { dilemmaForIndex } from "../data/ppknDilemmas";
import Kiko from "../components/ds/Kiko";
import { KikoChatPanel } from "../games/quiz/KikoTutorChat";

// LIVE (2026-08-08) -- konsep ORISINIL "Kampung Pancasila" (kayak Bahasa
// Inggris "World Tour", bukan porting al-idrisi -- referensinya udah abis
// kepake). User minta ide gameplay yang lebih dari "peta doang, atraktif
// buat anak" -- ditambahin mekanik SKENARIO DILEMA sipil kecil yang
// muncul SEBELUM quiz dibuka (`ppknDilemmas.js`, bukan bagian bank soal),
// beda dari 4 map lain yang tap-node langsung ke quiz.
const MAP_CANVAS_WIDTH = 440;
const NODE_SPACING_Y = 170;
const NODE_START_Y = 70;
const HOP_MS = 900;
const TRAVELER_Y_OFFSET = -68;

const RED = "#C8313A";
const RED_DARK = "#A32530";
const GOLD = "#D4A017";
const CREAM = "#FDF6EE";
const BORDER = "#E3C9A8";
const INK = "#3A2A20";
const INK_SOFT = "#8A6F5C";
const ROAD = "#C9A97A";

const VILLAGE_ICONS = ["🏘️", "🏪", "🏫", "⛲", "🚩", "🌳", "🏠", "🎪"];

function buildVillageLayout(n) {
  const rand = seededRandom(33);
  const positions = [];
  for (let i = 0; i < n; i++) {
    const leftSide = i % 2 === 0;
    const jitter = rand() * 40;
    positions.push({
      x: leftSide ? 70 + jitter : 330 - jitter,
      y: NODE_START_Y + i * NODE_SPACING_Y,
    });
  }
  const totalHeight = NODE_START_Y + (n - 1) * NODE_SPACING_Y + 110;
  return { positions, totalHeight };
}

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function VillageOrnaments({ height }) {
  const items = useMemo(() => {
    const rand = seededRandom(15);
    const shapes = ["🌾", "🌸", "☁️"];
    const count = Math.max(5, Math.round(height / 170));
    return Array.from({ length: count }).map((_, i) => ({
      key: "orn" + i,
      shape: shapes[i % shapes.length],
      x: 10 + rand() * (MAP_CANVAS_WIDTH - 50),
      y: 20 + rand() * (height - 40),
      size: 18 + rand() * 14,
      delay: rand() * 2,
      duration: 4 + rand() * 3,
    }));
  }, [height]);
  return (
    <>
      {items.map((o) => (
        <div
          key={o.key}
          style={{
            position: "absolute",
            left: o.x,
            top: o.y,
            fontSize: o.size,
            opacity: 0.55,
            animation: `jkPkSway ${o.duration}s ease-in-out ${o.delay}s infinite`,
          }}
        >
          {o.shape}
        </div>
      ))}
    </>
  );
}

export default function PpknVillageMap() {
  const { grade } = useParams();
  const navigate = useNavigate();
  const { player } = usePlayer();
  useBgmTrack(TRACK_BY_SUBJECT.ppkn);

  const [topics, setTopics] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [travelerIndex, setTravelerIndex] = useState(null);
  const [travelerPos, setTravelerPos] = useState(null);
  const [walking, setWalking] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [hintShown, setHintShown] = useState(true);
  const [scale, setScale] = useState(1);
  const [dilemma, setDilemma] = useState(null); // { topic, index, picked }

  const travelerStateRef = useRef({ index: null, walking: false });
  const outerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadRawTopics("ppkn", grade), getSubjectProgress(player.id, "ppkn", grade)])
      .then(([raw, progressMap]) => {
        if (cancelled) return;
        setTopics(raw ? computeStatuses(raw, progressMap) : []);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [grade, player.id]);

  const layout = useMemo(() => (topics ? buildVillageLayout(topics.length) : null), [topics]);
  const doneCount = topics ? topics.filter((t) => t.status === "done").length : 0;

  useEffect(() => {
    function fit() {
      if (!outerRef.current) return;
      const avail = outerRef.current.clientWidth || MAP_CANVAS_WIDTH;
      setScale(Math.min(1, avail / MAP_CANVAS_WIDTH));
    }
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [layout]);

  useEffect(() => {
    if (!layout || travelerIndex !== null) return;
    const firstCurrent = topics.findIndex((t) => t.status === "current");
    const idx = firstCurrent >= 0 ? firstCurrent : topics.length - 1;
    travelerStateRef.current.index = idx;
    setTravelerIndex(idx);
    const meta = layout.positions[idx];
    setTravelerPos({ x: meta.x, y: meta.y + TRAVELER_Y_OFFSET });
  }, [layout, topics, travelerIndex]);

  function walkTo(targetIndex, onArrive) {
    if (travelerStateRef.current.walking || !layout) return;
    const from = travelerStateRef.current.index;
    if (from === targetIndex) {
      onArrive();
      return;
    }
    travelerStateRef.current.walking = true;
    setWalking(true);

    const dir = targetIndex > from ? 1 : -1;
    const stops = [];
    for (let n = from; n !== targetIndex; n += dir) stops.push(n + dir);

    function runHop(hopIdx) {
      if (hopIdx >= stops.length) {
        travelerStateRef.current.index = targetIndex;
        travelerStateRef.current.walking = false;
        setTravelerIndex(targetIndex);
        setWalking(false);
        onArrive();
        return;
      }
      const fromPos = layout.positions[hopIdx === 0 ? from : stops[hopIdx - 1]];
      const toPos = layout.positions[stops[hopIdx]];

      const startTime = performance.now();
      function frame(now) {
        const t = Math.min(1, (now - startTime) / HOP_MS);
        setTravelerPos({
          x: fromPos.x + (toPos.x - fromPos.x) * t,
          y: fromPos.y + (toPos.y - fromPos.y) * t + TRAVELER_Y_OFFSET,
        });
        if (t < 1) requestAnimationFrame(frame);
        else runHop(hopIdx + 1);
      }
      requestAnimationFrame(frame);
    }
    runHop(0);
  }

  function handleStopTap(i, topic) {
    if (topic.status === "locked" || walking) return;
    walkTo(i, () => {
      setDilemma({ topic, index: i, picked: null });
    });
  }

  function goToQuiz(topic) {
    setDilemma(null);
    navigate(`/kelas/${grade}/ppkn/topik/${topic.key}`);
  }

  return (
    <Shell>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "22px 18px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => navigate(`/kelas/${grade}`)}
            aria-label="Kembali"
            style={{ border: "none", background: "none", cursor: "pointer", fontSize: "1.2rem", padding: 4, lineHeight: 1, color: "var(--ink-900)" }}
          >
            ←
          </button>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.05rem", color: "var(--ink-900)" }}>PPKn</div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--ink-500)" }}>Kelas {grade}</div>
          </div>
        </div>
        <div
          title="Lencana Pancasila"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "6px 10px",
            borderRadius: 999,
            background: RED,
            color: "#fff",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "0.72rem",
          }}
        >
          🎖️ {doneCount}/{topics ? topics.length : 0}
        </div>
      </div>

      {loadError && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center" }}>
          <div style={{ color: "var(--ink-400)" }}>Gagal muat peta. Coba cek koneksi internet kamu, ya!</div>
        </div>
      )}

      {!loadError && (!topics || !layout) && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-400)" }}>
          Menyiapin kampung...
        </div>
      )}

      {!loadError && topics && layout && (
        <div ref={outerRef} style={{ flex: 1, overflowY: "auto", overflowX: "hidden", position: "relative", background: `linear-gradient(180deg, ${CREAM} 0%, #F3E6D4 100%)`, paddingTop: 30 }}>
          <div style={{ position: "relative", width: MAP_CANVAS_WIDTH, height: layout.totalHeight * scale, transform: `scale(${scale})`, transformOrigin: "top left" }}>
            <VillageOrnaments height={layout.totalHeight} />

            <svg width={MAP_CANVAS_WIDTH} height={layout.totalHeight} style={{ position: "absolute", top: 0, left: 0 }}>
              {layout.positions.slice(1).map((p, i) => {
                const prev = layout.positions[i];
                return (
                  <g key={i}>
                    <line x1={prev.x} y1={prev.y} x2={p.x} y2={p.y} stroke={ROAD} strokeWidth="12" strokeLinecap="round" opacity="0.9" />
                    <line x1={prev.x} y1={prev.y} x2={p.x} y2={p.y} stroke="#fff" strokeWidth="2" strokeDasharray="7 8" strokeLinecap="round" opacity="0.8" />
                  </g>
                );
              })}
            </svg>

            {topics.map((t, i) => {
              const pos = layout.positions[i];
              const locked = t.status === "locked";
              const done = t.status === "done";
              const current = t.status === "current";
              const stars = t.stars || 0;
              const icon = VILLAGE_ICONS[i % VILLAGE_ICONS.length];
              return (
                <button
                  key={t.key}
                  onClick={() => handleStopTap(i, t)}
                  disabled={locked}
                  style={{
                    position: "absolute",
                    left: pos.x,
                    top: pos.y,
                    transform: "translate(-50%,-50%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    width: 128,
                    textAlign: "center",
                    border: "none",
                    background: "none",
                    cursor: locked ? "not-allowed" : "pointer",
                    zIndex: 1,
                    fontFamily: "inherit",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: 64,
                      height: 64,
                      borderRadius: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 28,
                      boxShadow: "0 2px 6px rgba(58,42,32,0.18)",
                      opacity: locked ? 0.55 : 1,
                      filter: locked ? "grayscale(0.5)" : "none",
                      background: "#fff",
                      border: `3px solid ${done ? GOLD : current ? RED : BORDER}`,
                      animation: current ? "jkPkStopPulse 1.8s ease-in-out infinite" : "none",
                    }}
                  >
                    <span>{icon}</span>
                    {locked && (
                      <span
                        style={{
                          position: "absolute",
                          bottom: -4,
                          right: -4,
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: "#fff",
                          border: `2px solid ${BORDER}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                        }}
                      >
                        🔒
                      </span>
                    )}
                    {done && (
                      <span
                        style={{
                          position: "absolute",
                          top: -6,
                          right: -6,
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: "#fff",
                          border: `2px solid ${GOLD}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 13,
                        }}
                      >
                        🎖️
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontWeight: 700,
                      fontSize: "0.7rem",
                      color: INK_SOFT,
                      lineHeight: 1.3,
                      background: "rgba(253,246,238,0.92)",
                      padding: "2px 7px",
                      borderRadius: 8,
                      border: `1px solid ${BORDER}`,
                    }}
                  >
                    {t.title}
                  </div>
                  {done && (
                    <div style={{ fontSize: 12, color: GOLD, letterSpacing: 1 }}>
                      {"★".repeat(stars)}
                      <span style={{ color: BORDER }}>{"★".repeat(3 - stars)}</span>
                    </div>
                  )}
                </button>
              );
            })}

            {travelerPos && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setHintShown(false);
                  setChatOpen(true);
                }}
                style={{
                  position: "absolute",
                  left: travelerPos.x,
                  top: travelerPos.y,
                  marginLeft: -20,
                  width: 40,
                  height: 40,
                  border: "none",
                  padding: 0,
                  background: "none",
                  cursor: "pointer",
                  filter: "drop-shadow(0 3px 4px rgba(58,42,32,0.35))",
                  zIndex: 2,
                  animation: walking ? "jkPkWalkBounce 0.3s ease-in-out infinite" : "jkPkIdleBob 1.8s ease-in-out infinite",
                }}
              >
                <Kiko size={38} />
                {hintShown && !walking && (
                  <span
                    style={{
                      position: "absolute",
                      left: "50%",
                      bottom: "100%",
                      transform: "translateX(-50%)",
                      marginBottom: 2,
                      whiteSpace: "nowrap",
                      background: RED,
                      color: "#fff",
                      padding: "1px 6px",
                      borderRadius: "7px 7px 7px 2px",
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: "0.55rem",
                      pointerEvents: "none",
                    }}
                  >
                    Hai, ini Kiko!
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {dilemma && (
        <DilemmaModal
          index={dilemma.index}
          picked={dilemma.picked}
          onPick={(optIdx) => setDilemma((d) => ({ ...d, picked: optIdx }))}
          onContinue={() => goToQuiz(dilemma.topic)}
          onSkip={() => goToQuiz(dilemma.topic)}
        />
      )}

      <KikoChatPanel open={chatOpen} onClose={() => setChatOpen(false)} mode="general" resetKey={`ppkn-map-${grade}`} />

      <style>{`
        @keyframes jkPkSway { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }
        @keyframes jkPkIdleBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        @keyframes jkPkWalkBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes jkPkStopPulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(200,49,58,0.22); }
          50% { box-shadow: 0 0 0 10px rgba(200,49,58,0.35); }
        }
      `}</style>
    </Shell>
  );
}

function DilemmaModal({ index, picked, onPick, onContinue, onSkip }) {
  const d = dilemmaForIndex(index);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(58,42,32,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 20,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: "20px 18px",
          maxWidth: 360,
          width: "100%",
          boxShadow: "0 8px 24px rgba(58,42,32,0.3)",
        }}
      >
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.78rem", color: RED_DARK, marginBottom: 6 }}>
          🚩 Sebelum lanjut...
        </div>
        <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "0.9rem", color: INK, lineHeight: 1.4, marginBottom: 14 }}>
          {d.scenario}
        </div>

        {picked === null ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {d.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => onPick(i)}
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: `1.5px solid ${BORDER}`,
                  background: CREAM,
                  fontFamily: "var(--font-body)",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  color: INK,
                  cursor: "pointer",
                }}
              >
                {opt.text}
              </button>
            ))}
            <button
              onClick={onSkip}
              style={{ marginTop: 4, border: "none", background: "none", color: INK_SOFT, fontFamily: "var(--font-body)", fontSize: "0.72rem", cursor: "pointer", textDecoration: "underline" }}
            >
              Lewati
            </button>
          </div>
        ) : (
          <div>
            <div
              style={{
                background: "var(--pastel-gold)",
                borderRadius: 12,
                padding: "10px 12px",
                fontFamily: "var(--font-body)",
                fontWeight: 700,
                fontSize: "0.82rem",
                color: INK,
                marginBottom: 14,
              }}
            >
              {d.options[picked].feedback}
            </div>
            <button
              onClick={onContinue}
              style={{
                width: "100%",
                padding: "11px 12px",
                borderRadius: 999,
                border: "none",
                background: RED,
                color: "#fff",
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "0.82rem",
                cursor: "pointer",
              }}
            >
              Lanjut ke Kuis →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
