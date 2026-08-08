import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Shell from "../components/Shell";
import { loadRawTopics } from "../data/contentLoader";
import { getSubjectProgress, computeStatuses } from "../data/progressService";
import { usePlayer } from "../data/PlayerContext";
import { TRACK_BY_SUBJECT, useBgmTrack } from "../data/bgm";
import Kiko from "../components/ds/Kiko";
import { KikoChatPanel } from "../games/quiz/KikoTutorChat";
import { useT } from "../data/translations";

// LIVE (2026-08-08) -- konsep ORISINIL "Taman Akhlak", ke-3 dari
// brainstorm yang sama kayak Bahasa Inggris/PPKn di atas (al-idrisi
// referensi udah abis). Nuansa SENGAJA dibikin lebih TENANG/kalem
// dibanding 4 map lain (BUKAN "rame kayak game") -- user brainstorm
// awal minta "PAI: kebun yang tumbuh, lebih tenang" karena kontennya
// nilai akhlak & kisah nabi, bukan tema petualangan biasa.
const MAP_CANVAS_WIDTH = 440;
const NODE_SPACING_Y = 170;
const NODE_START_Y = 90;
const HOP_MS = 1000;
const TRAVELER_Y_OFFSET = -68;

const GREEN = "#4C8C6B";
const GREEN_DARK = "#356B4E";
const GOLD = "#D9A544";
const CREAM = "#F5F1E3";
const BORDER = "#CFE0CB";
const INK = "#33402E";
const INK_SOFT = "#7C8A72";

const PLANT_ICONS = ["🌷", "🌻", "🌼", "🌺", "🌹", "🌵", "🍀", "🌾"];

function buildGardenLayout(n) {
  const rand = seededRandom(51);
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

// "Jalan setapak batu" -- lingkaran kecil berjejer di sepanjang segmen
// (BUKAN garis putus-putus/kurva kayak 4 map lain), kesan taman tenang.
function SteppingStones({ from, to }) {
  const count = 6;
  const stones = [];
  for (let i = 1; i < count; i++) {
    const t = i / count;
    stones.push({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
  }
  return (
    <>
      {stones.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r="4" fill={BORDER} opacity="0.9" />
      ))}
    </>
  );
}

function GardenOrnaments({ height }) {
  const items = useMemo(() => {
    const rand = seededRandom(23);
    const shapes = ["🍃", "🌸"];
    const count = Math.max(5, Math.round(height / 180));
    return Array.from({ length: count }).map((_, i) => ({
      key: "orn" + i,
      shape: shapes[i % shapes.length],
      x: 10 + rand() * (MAP_CANVAS_WIDTH - 50),
      y: 20 + rand() * (height - 40),
      size: 16 + rand() * 12,
      delay: rand() * 2,
      duration: 5 + rand() * 3,
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
            opacity: 0.5,
            animation: `jkPaDrift ${o.duration}s ease-in-out ${o.delay}s infinite`,
          }}
        >
          {o.shape}
        </div>
      ))}
    </>
  );
}

// Gapura kecil (dekorasi statis di atas peta, BUKAN per-node) -- kubah +
// 2 pilar, gaya arsitektur masjid disederhanain jadi siluet, warna
// hijau-emas senada tema. Custom SVG (bukan emoji) biar proporsinya pas.
function GardenGate() {
  return (
    <svg viewBox="0 0 200 90" width={140} height={63} style={{ display: "block", margin: "0 auto" }}>
      <rect x="18" y="46" width="14" height="38" rx="3" fill={GREEN_DARK} />
      <rect x="168" y="46" width="14" height="38" rx="3" fill={GREEN_DARK} />
      <path d="M22 50 Q100 4 178 50" fill="none" stroke={GOLD} strokeWidth="7" strokeLinecap="round" />
      <path d="M22 50 Q100 4 178 50" fill="none" stroke={GREEN} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <circle cx="100" cy="18" r="6" fill={GOLD} />
    </svg>
  );
}

export default function PaiGardenPath() {
  const { grade } = useParams();
  const navigate = useNavigate();
  const { player } = usePlayer();
  const { t, subjectName } = useT();
  useBgmTrack(TRACK_BY_SUBJECT.pai);

  const [topics, setTopics] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [travelerIndex, setTravelerIndex] = useState(null);
  const [travelerPos, setTravelerPos] = useState(null);
  const [walking, setWalking] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [hintShown, setHintShown] = useState(true);
  const [scale, setScale] = useState(1);

  const travelerStateRef = useRef({ index: null, walking: false });
  const outerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadRawTopics("pai", grade), getSubjectProgress(player.id, "pai", grade)])
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

  const layout = useMemo(() => (topics ? buildGardenLayout(topics.length) : null), [topics]);
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
      navigate(`/kelas/${grade}/pai/topik/${topic.key}`);
    });
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
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.05rem", color: "var(--ink-900)" }}>{subjectName("pai")}</div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--ink-500)" }}>{t("common", "grade")} {grade}</div>
          </div>
        </div>
        <div
          title="Kuncup Mekar"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "6px 10px",
            borderRadius: 999,
            background: GREEN,
            color: "#fff",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "0.72rem",
          }}
        >
          🌸 {doneCount}/{topics ? topics.length : 0}
        </div>
      </div>

      {loadError && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center" }}>
          <div style={{ color: "var(--ink-400)" }}>{t("map", "loadErrorGarden")}</div>
        </div>
      )}

      {!loadError && (!topics || !layout) && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-400)" }}>
          {t("map", "preparingGarden")}
        </div>
      )}

      {!loadError && topics && layout && (
        <div ref={outerRef} style={{ flex: 1, overflowY: "auto", overflowX: "hidden", position: "relative", background: `linear-gradient(180deg, ${CREAM} 0%, #EAF0E0 100%)`, paddingTop: 14 }}>
          <GardenGate />
          <div style={{ position: "relative", width: MAP_CANVAS_WIDTH, height: layout.totalHeight * scale, transform: `scale(${scale})`, transformOrigin: "top left" }}>
            <GardenOrnaments height={layout.totalHeight} />

            <svg width={MAP_CANVAS_WIDTH} height={layout.totalHeight} style={{ position: "absolute", top: 0, left: 0 }}>
              {layout.positions.slice(1).map((p, i) => (
                <SteppingStones key={i} from={layout.positions[i]} to={p} />
              ))}
            </svg>

            {topics.map((t, i) => {
              const pos = layout.positions[i];
              const locked = t.status === "locked";
              const done = t.status === "done";
              const current = t.status === "current";
              const stars = t.stars || 0;
              const icon = PLANT_ICONS[i % PLANT_ICONS.length];
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
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: locked ? 22 : done ? 30 : 26,
                      boxShadow: "0 2px 6px rgba(51,64,46,0.16)",
                      opacity: locked ? 0.5 : 1,
                      filter: locked ? "grayscale(0.6)" : "none",
                      background: "#fff",
                      border: `3px solid ${done ? GOLD : current ? GREEN : BORDER}`,
                      transition: "font-size 0.3s ease",
                      animation: current ? "jkPaStopPulse 2.2s ease-in-out infinite" : "none",
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
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: "#fff",
                          border: `2px solid ${GOLD}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                        }}
                      >
                        ✨
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
                      background: "rgba(245,241,227,0.92)",
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
                  filter: "drop-shadow(0 3px 4px rgba(51,64,46,0.3))",
                  zIndex: 2,
                  animation: walking ? "jkPaWalkBounce 0.4s ease-in-out infinite" : "jkPaIdleBob 2.2s ease-in-out infinite",
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
                      background: GREEN,
                      color: "#fff",
                      padding: "1px 6px",
                      borderRadius: "7px 7px 7px 2px",
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: "0.55rem",
                      pointerEvents: "none",
                    }}
                  >
                    {t("map", "hiKiko")}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      <KikoChatPanel open={chatOpen} onClose={() => setChatOpen(false)} mode="general" resetKey={`pai-map-${grade}`} />

      <style>{`
        @keyframes jkPaDrift { 0% { transform: translateY(0); } 50% { transform: translateY(10px); } 100% { transform: translateY(0); } }
        @keyframes jkPaIdleBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        @keyframes jkPaWalkBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes jkPaStopPulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(76,140,107,0.18); }
          50% { box-shadow: 0 0 0 9px rgba(76,140,107,0.3); }
        }
      `}</style>
    </Shell>
  );
}
