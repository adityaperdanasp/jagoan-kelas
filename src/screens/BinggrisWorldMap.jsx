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
import { phraseForIndex } from "../data/binggrisPhrases";

// LIVE (2026-08-08) -- konsep ORISINIL "Kiko's World Tour", BUKAN porting
// dari al-idrisi-games (semua desain BrainBox yang relevan udah kepake:
// Bindo=Storybook Trail, IPAS=SolarQuest, Matematika=Blockville). User:
// "sisa pkn bahasa inggris dan PAI ya? di al idrisi udah kepake smua,
// coba ide dong" -> dipilih Bahasa Inggris duluan ("Kiko's World Tour").
// Peta dunia sederhana, tiap bab = 1 "kota" landmark ikonik (abstrak,
// bukan nama kota asli, biar netral), Kiko naik pesawat kertas terbang
// nyusurin garis rute penerbangan putus-putus (BUKAN kurva Catmull-Rom
// kayak Matematika / bezier kayak IPAS -- garis lurus putus-putus ala
// peta rute penerbangan beneran, lebih pas buat tema travel). Bab
// selesai dapet "stempel paspor" (bukan cuma centang biasa) -- ornamen
// lingkaran tinta merah muter dikit, ala cap paspor asli.
const MAP_CANVAS_WIDTH = 440;
const NODE_SPACING_Y = 170;
const NODE_START_Y = 70;
const HOP_MS = 1100;
const TRAVELER_Y_OFFSET = -70;

const NAVY = "#2C4B6B";
const NAVY_DARK = "#1D3550";
const RED = "#D6524A";
const GOLD = "#E8B84B";
const CREAM = "#F6ECD9";
const BORDER = "#C9B48C";
const INK = "#33291A";
const INK_SOFT = "#7A6A50";

const LANDMARKS = ["🗼", "🏰", "🗽", "🎡", "⛩️", "🏔️", "🌉", "🏟️"];

function buildRouteLayout(n) {
  const rand = seededRandom(21);
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

// Nuansa awan/burung ambient -- lebih ringan dari ornamen kota Matematika,
// biar kesan "langit terbuka" bukan "kota ramai".
function SkyOrnaments({ height }) {
  const clouds = useMemo(() => {
    const rand = seededRandom(9);
    const count = Math.max(5, Math.round(height / 180));
    return Array.from({ length: count }).map((_, i) => ({
      key: "cloud" + i,
      x: 10 + rand() * (MAP_CANVAS_WIDTH - 60),
      y: 20 + rand() * (height - 40),
      size: 26 + rand() * 22,
      delay: rand() * 2,
      duration: 5 + rand() * 3,
    }));
  }, [height]);
  return (
    <>
      {clouds.map((c) => (
        <div
          key={c.key}
          style={{
            position: "absolute",
            left: c.x,
            top: c.y,
            opacity: 0.6,
            animation: `jkBgDrift ${c.duration}s ease-in-out ${c.delay}s infinite`,
          }}
        >
          <svg viewBox="0 0 40 22" width={c.size} height={c.size}>
            <path d="M9 20 a7 7 0 0 1 -1 -13.9 A9 9 0 0 1 25 4 a7 7 0 0 1 6 16 z" fill="#fff" />
          </svg>
        </div>
      ))}
    </>
  );
}

export default function BinggrisWorldMap() {
  const { grade } = useParams();
  const navigate = useNavigate();
  const { player } = usePlayer();
  const { t, subjectName } = useT();
  useBgmTrack(TRACK_BY_SUBJECT.binggris);

  const [topics, setTopics] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [travelerIndex, setTravelerIndex] = useState(null);
  const [travelerPos, setTravelerPos] = useState(null);
  const [walking, setWalking] = useState(false);
  const [facingLeft, setFacingLeft] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [hintShown, setHintShown] = useState(true);
  const [scale, setScale] = useState(1);

  const travelerStateRef = useRef({ index: null, walking: false });
  const outerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadRawTopics("binggris", grade), getSubjectProgress(player.id, "binggris", grade)])
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

  const layout = useMemo(() => (topics ? buildRouteLayout(topics.length) : null), [topics]);
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
    const refIdx = idx + 1 < topics.length ? idx + 1 : idx - 1;
    if (refIdx >= 0 && refIdx < topics.length) {
      setFacingLeft(layout.positions[refIdx].x < meta.x);
    }
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
      setFacingLeft(toPos.x < fromPos.x);

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
      navigate(`/kelas/${grade}/binggris/topik/${topic.key}`);
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
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.05rem", color: "var(--ink-900)" }}>{subjectName("binggris")}</div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--ink-500)" }}>{t("common", "grade")} {grade}</div>
          </div>
        </div>
        <div
          title="Stempel paspor"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "6px 10px",
            borderRadius: 999,
            background: NAVY,
            color: "#fff",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "0.72rem",
          }}
        >
          🛂 {doneCount}/{topics ? topics.length : 0}
        </div>
      </div>

      {loadError && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center" }}>
          <div style={{ color: "var(--ink-400)" }}>{t("map", "loadError")}</div>
        </div>
      )}

      {!loadError && (!topics || !layout) && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-400)" }}>
          {t("map", "preparingWorld")}
        </div>
      )}

      {!loadError && topics && layout && (
        <div ref={outerRef} style={{ flex: 1, overflowY: "auto", overflowX: "hidden", position: "relative", background: `linear-gradient(180deg, ${CREAM} 0%, #EFE1C4 100%)`, paddingTop: 30 }}>
          <div style={{ position: "relative", width: MAP_CANVAS_WIDTH, height: layout.totalHeight * scale, transform: `scale(${scale})`, transformOrigin: "top left" }}>
            <SkyOrnaments height={layout.totalHeight} />

            <svg width={MAP_CANVAS_WIDTH} height={layout.totalHeight} style={{ position: "absolute", top: 0, left: 0 }}>
              {layout.positions.slice(1).map((p, i) => {
                const prev = layout.positions[i];
                return (
                  <line
                    key={i}
                    x1={prev.x}
                    y1={prev.y}
                    x2={p.x}
                    y2={p.y}
                    stroke={NAVY}
                    strokeWidth="2.5"
                    strokeDasharray="2 10"
                    strokeLinecap="round"
                    opacity="0.55"
                  />
                );
              })}
            </svg>

            {topics.map((t, i) => {
              const pos = layout.positions[i];
              const locked = t.status === "locked";
              const done = t.status === "done";
              const current = t.status === "current";
              const stars = t.stars || 0;
              const icon = LANDMARKS[i % LANDMARKS.length];
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
                      fontSize: 28,
                      boxShadow: "0 2px 6px rgba(51,41,26,0.18)",
                      opacity: locked ? 0.55 : 1,
                      filter: locked ? "grayscale(0.5)" : "none",
                      background: "#fff",
                      border: `3px solid ${done ? NAVY : current ? RED : BORDER}`,
                      animation: current ? "jkBgStopPulse 1.8s ease-in-out infinite" : "none",
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
                      <div
                        aria-hidden
                        style={{
                          position: "absolute",
                          top: -14,
                          left: -18,
                          width: 46,
                          height: 46,
                          borderRadius: "50%",
                          border: `2.5px dashed ${RED}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: "rotate(-16deg)",
                          color: RED,
                          opacity: 0.85,
                          fontFamily: "var(--font-display)",
                          fontWeight: 800,
                          fontSize: "0.5rem",
                          lineHeight: 1.1,
                          textAlign: "center",
                          pointerEvents: "none",
                        }}
                      >
                        OK!
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontWeight: 700,
                      fontSize: "0.7rem",
                      color: INK_SOFT,
                      lineHeight: 1.3,
                      background: "rgba(246,236,217,0.92)",
                      padding: "2px 7px",
                      borderRadius: 8,
                      border: `1px dashed ${BORDER}`,
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
              <div
                style={{
                  position: "absolute",
                  left: travelerPos.x,
                  top: travelerPos.y,
                  marginLeft: -20,
                  width: 40,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  filter: "drop-shadow(0 3px 4px rgba(44,75,107,0.35))",
                  zIndex: 2,
                  pointerEvents: "none",
                  animation: walking ? "jkBgFlyBounce 0.3s ease-in-out infinite" : "jkBgIdleBob 1.8s ease-in-out infinite",
                }}
              >
                <span style={{ fontSize: 30, display: "block", transform: facingLeft ? "scaleX(-1)" : "none" }}>✈️</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setHintShown(false);
                    setChatOpen(true);
                  }}
                  style={{
                    position: "absolute",
                    top: -6,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    pointerEvents: "auto",
                    cursor: "pointer",
                    border: "none",
                    padding: 0,
                    background: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    animation: "jkBgBadgeWiggle 1.8s ease-in-out infinite",
                  }}
                >
                  <Kiko size={14} />
                </button>
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
                    {t("map", "hiKiko")}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {topics && (
        <div style={{ padding: "10px 18px 0" }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.72rem", color: NAVY, marginBottom: 8 }}>
            {t("binggris", "collection")}
          </div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
            {topics.map((topic, i) => {
              const done = topic.status === "done";
              const p = phraseForIndex(i);
              return (
                <div
                  key={topic.key}
                  style={{
                    flex: "none",
                    width: 150,
                    borderRadius: 14,
                    padding: "10px 12px",
                    background: done ? "#fff" : CREAM,
                    border: `1.5px solid ${done ? GOLD : BORDER}`,
                    opacity: done ? 1 : 0.6,
                  }}
                >
                  {done ? (
                    <>
                      <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "0.72rem", color: INK }}>{p.phrase}</div>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: "0.66rem", color: INK_SOFT, marginTop: 2 }}>{p.meaning}</div>
                    </>
                  ) : (
                    <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "0.68rem", color: INK_SOFT, textAlign: "center" }}>
                      🔒<br />{t("binggris", "locked")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ padding: "10px 18px 18px" }}>
        <button
          onClick={() => navigate(`/kelas/${grade}/binggris/susun-kata`)}
          style={{
            width: "100%",
            border: "none",
            cursor: "pointer",
            borderRadius: 16,
            padding: "12px 16px",
            background: NAVY,
            boxShadow: `0 6px 0 ${NAVY_DARK}`,
            textAlign: "left",
          }}
        >
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.85rem", color: "#fff" }}>{t("scramble", "entryCta")}</div>
          <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "0.68rem", color: "rgba(255,255,255,.85)", marginTop: 2 }}>{t("scramble", "entrySubBinggris")}</div>
        </button>
      </div>

      <KikoChatPanel open={chatOpen} onClose={() => setChatOpen(false)} mode="general" resetKey={`binggris-map-${grade}`} />

      <style>{`
        @keyframes jkBgDrift { 0% { transform: translateX(0); } 50% { transform: translateX(12px); } 100% { transform: translateX(0); } }
        @keyframes jkBgIdleBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        @keyframes jkBgFlyBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes jkBgBadgeWiggle { 0%, 100% { transform: translateX(-50%) rotate(-8deg); } 50% { transform: translateX(-50%) rotate(8deg); } }
        @keyframes jkBgStopPulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(214,82,74,0.22); }
          50% { box-shadow: 0 0 0 10px rgba(214,82,74,0.35); }
        }
      `}</style>
    </Shell>
  );
}
