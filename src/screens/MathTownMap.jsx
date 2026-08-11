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

// LIVE (2026-08-08, awalnya MOCKUP 2026-08-07) -- user: "untuk mathville
// inget ga di play alidirisi jg? ... yang ada truck jalan? didalamnya ada
// ai mascot kita bisa di click. Bisa ambil design dari sana? lalu kita
// gantikan ke matematika yang masih basi." Port dari al-idrisi-games/
// mathville (tema "Blockville Workshop": kayu/cherry/emas, BUKAN tema
// luar angkasa SolarQuest yang dipake buat IPAS) -- truck 🚚 jalan di
// jalan kota (Catmull-Rom curve, bukan bezier sederhana kayak SolarQuest)
// ngelewatin "stop" (topik), Kiko numpang di truck bisa di-tap buat chat,
// ornamen kota (pohon/rumah/gunung/awan/dst) di kiri-kanan jalan.
//
// BEDA dari MathVille asli: (1) chapter count VARIASI per kelas (5-9,
// beda dari IPAS yang selalu 8) -- layout jalan+ornamen digeneralisasi,
// gak di-hardcode kayak `CHAPTER_META`/`MAP_ORNAMENTS` aslinya yang
// pas buat PERSIS 9 stop. (2) MathVille asli "nothing ever locked" --
// jagoan-kelas tetep pake progression lock/current/done yang udah ada
// di seluruh app (`computeStatuses`), demi konsistensi sama IPAS map +
// SubjectDetail.jsx lain, jadi ada state locked (gak ada di source
// asli) dengan treatment sama kayak IPAS (dim + lock chip). (3) tombol
// Drive/Plane tetep dipertahanin sebagai icon di header, gak coba
// dimasukin ke visual town map (MathVille asli juga gak gitu -- Drive
// Mode punya sistem marker sendiri, terpisah dari town map).
//
// Awalnya preview-only (`/kelas/:grade/matematika/peta-mockup`), di-wire
// jadi halaman resmi subject "matematika" (`/kelas/:grade/matematika`,
// App.jsx) -- pola sama kayak Bindo & IPAS. Kartu promo "🏁 Math Race"
// yang dulu nempel di atas peta ini DICABUT sekalian -- udah jadi kartu
// sendiri di `PickSubject.jsx` (kerjaan sebelumnya), kalau dibiarin di
// sini bakal dobel/nyampur.

const MAP_CANVAS_WIDTH = 440;
const NODE_SPACING_Y = 170;
const NODE_START_Y = 70;
const HOP_MS = 1300;
// -46 di MathVille asli numpuk sama border pulsing node (radius 32px +
// box-shadow ring) -- user minta dirapihin, -72 ngasih jarak ~10px biar
// gak nempel/numpuk pas truck lagi "parkir" persis di satu stop.
const TRAVELER_Y_OFFSET = -72;

const WOOD = "#C1793E";
const WOOD_DARK = "#A8632F";
const CHERRY = "#E4572E";
const GOLD = "#F7C548";
const TAUPE = "#D8C7AE";
const INK = "#3B2A1A";
const INK_SOFT = "#7A6A56";
// Background peta -- sempet dicoba biru `--product-math` (2026-08-07)
// biar konsisten sama warna card subject Matematika, tapi user gak
// suka ("jelek") -- BALIK LAGI ke cream tema asli MathVille.
const MATH_BG = "#F7EEE0";

// Ikon "lokasi kota" -- disalin dari `CHAPTER_META` MathVille (9 lokasi
// asli: Town Hall/Bakery/Factor Grove/dst), di-cycle per index karena
// jumlah bab beda-beda per kelas di sini (bukan selalu 9).
const TOWN_ICONS = ["🏛️", "🥐", "🌳", "🌉", "🎡", "🚰", "🚦", "🏪", "🕰️"];

function buildTownLayout(n) {
  const positions = [];
  for (let i = 0; i < n; i++) {
    positions.push({ x: i % 2 === 0 ? 80 : 340, y: NODE_START_Y + i * NODE_SPACING_Y });
  }
  // Catmull-Rom -> per-segmen path "d" (port persis dari `catmullRomSegments`
  // MathVille) biar traveler bisa nyusurin lengkung asli via getPointAtLength,
  // bukan potong garis lurus diagonal.
  const segments = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = positions[i - 1] || positions[i];
    const p1 = positions[i];
    const p2 = positions[i + 1];
    const p3 = positions[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 5;
    const cp1y = p1.y + (p2.y - p0.y) / 5;
    const cp2x = p2.x - (p3.x - p1.x) / 5;
    const cp2y = p2.y - (p3.y - p1.y) / 5;
    segments.push(`M${p1.x},${p1.y} C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x},${p2.y}`);
  }
  const totalHeight = NODE_START_Y + (n - 1) * NODE_SPACING_Y + 110;
  return { positions, segments, totalHeight };
}

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// -- 8 bentuk ornamen, port PERSIS dari `ornamentSvg()` MathVille --
function OrnamentSvg({ shape, color, size }) {
  if (shape === "cloud") return <svg viewBox="0 0 40 22" width={size} height={size}><path d="M9 20 a7 7 0 0 1 -1 -13.9 A9 9 0 0 1 25 4 a7 7 0 0 1 6 16 z" fill={color} /></svg>;
  if (shape === "tree") return <svg viewBox="0 0 24 32" width={size} height={size}><rect x="10" y="22" width="4" height="9" fill={color} /><circle cx="12" cy="12" r="11" fill={color} /></svg>;
  if (shape === "bush") return <svg viewBox="0 0 32 18" width={size} height={size}><circle cx="9" cy="11" r="8" fill={color} /><circle cx="20" cy="8" r="9" fill={color} /><circle cx="27" cy="12" r="6" fill={color} /></svg>;
  if (shape === "house") return <svg viewBox="0 0 28 26" width={size} height={size}><path d="M14 1 L27 12 H21 V25 H7 V12 H1 Z" fill={color} /></svg>;
  if (shape === "mountain") return (
    <svg viewBox="0 0 48 28" width={size} height={size}>
      <path d="M0 28 L14 6 L22 18 L30 2 L48 28 Z" fill={color} />
      <path d="M30 2 L36 12 L33 12 L36 8 L39 12 L36 12" fill="#fff" opacity="0.7" />
    </svg>
  );
  if (shape === "wave") return <svg viewBox="0 0 60 16" width={size} height={size}><path d="M0 8 Q7.5 1 15 8 T30 8 T45 8 T60 8 V16 H0 Z" fill={color} /></svg>;
  if (shape === "deer") return (
    <svg viewBox="0 0 32 30" width={size} height={size}>
      <path d="M9 4 L7 10 M9 4 L11 9 M23 4 L25 10 M23 4 L21 9" stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <ellipse cx="16" cy="16" rx="7" ry="6" fill={color} />
      <circle cx="16" cy="8" r="5" fill={color} />
      <rect x="14" y="21" width="2" height="7" fill={color} /><rect x="18" y="21" width="2" height="7" fill={color} />
    </svg>
  );
  // bird
  return <svg viewBox="0 0 30 18" width={size} height={size}><path d="M2 10 Q8 2 15 9 Q22 2 28 10" stroke={color} strokeWidth="2.4" fill="none" strokeLinecap="round" /></svg>;
}

const ORNAMENT_SHAPES = [
  { shape: "cloud", color: "#E8D9C4", kind: "drift" },
  { shape: "tree", color: "#8FAE6B", kind: "sway" },
  { shape: "bush", color: "#C1793E", kind: "sway" },
  { shape: "house", color: "#E4572E", kind: "bob" },
  { shape: "mountain", color: "#A88E6B", kind: "still" },
  { shape: "wave", color: "#8FBFC4", kind: "still" },
  { shape: "deer", color: "#B48A5A", kind: "still" },
  { shape: "bird", color: "#8a6a4a", kind: "drift" },
];
const ORNAMENT_ANIM = { drift: "jkMvDrift", sway: "jkMvSway", bob: "jkMvBob", still: "none" };

// Sebaran ornamen di margin kiri/kanan jalan -- BUKAN posisi tangan
// kayak `MAP_ORNAMENTS` asli (itu di-hardcode pas buat 9 stop persis),
// di-generate proporsional ke `height` biar kepake di kelas manapun
// (5-9 bab). Seeded biar stabil antar render.
function TownOrnaments({ height }) {
  const ornaments = useMemo(() => {
    const rand = seededRandom(7);
    const count = Math.max(6, Math.round(height / 130));
    return Array.from({ length: count }).map((_, i) => {
      const def = ORNAMENT_SHAPES[i % ORNAMENT_SHAPES.length];
      const leftSide = i % 2 === 0;
      // Ukuran DULUAN, baru posisi -- biar lebar shape ikut diperhitungin
      // pas nentuin `x`, gak ada lagi yang kepotong di tepi kanvas (kejadian
      // sebelumnya: `x` bisa negatif di kiri / nabrak tepi 440 di kanan,
      // user lapor "ornamen banyak yang keluar garis").
      const size = 24 + rand() * 20;
      const margin = 4 + rand() * 26;
      return {
        key: "orn" + i,
        ...def,
        x: leftSide ? margin : MAP_CANVAS_WIDTH - margin - size,
        y: 20 + rand() * (height - 40),
        size,
        delay: rand() * 2,
        duration: 3 + rand() * 2,
      };
    });
  }, [height]);

  return (
    <>
      {ornaments.map((o) => (
        <div
          key={o.key}
          style={{
            position: "absolute",
            left: o.x,
            top: o.y,
            opacity: 0.85,
            animation: ORNAMENT_ANIM[o.kind] !== "none" ? `${ORNAMENT_ANIM[o.kind]} ${o.duration}s ease-in-out ${o.delay}s infinite` : "none",
          }}
        >
          <OrnamentSvg shape={o.shape} color={o.color} size={o.size} />
        </div>
      ))}
    </>
  );
}

export default function MathTownMap() {
  const { grade } = useParams();
  const navigate = useNavigate();
  const { player } = usePlayer();
  const { t, subjectName } = useT();
  useBgmTrack(TRACK_BY_SUBJECT.matematika);

  const [topics, setTopics] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [travelerIndex, setTravelerIndex] = useState(null);
  const [travelerPos, setTravelerPos] = useState(null);
  const [walking, setWalking] = useState(false);
  const [facingLeft, setFacingLeft] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [hintShown, setHintShown] = useState(true);
  const [scale, setScale] = useState(1);

  const segRefs = useRef([]);
  const travelerStateRef = useRef({ index: null, walking: false });
  const outerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadRawTopics("matematika", grade), getSubjectProgress(player.id, "matematika", grade, player.token)])
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

  const layout = useMemo(() => (topics ? buildTownLayout(topics.length) : null), [topics]);

  // Skala canvas 440px biar muat lebar layar (port `mvFitMapScale`).
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
      setFacingLeft(layout.positions[refIdx].x > meta.x);
    }
  }, [layout, topics, travelerIndex]);

  function pointOnSeg(segIndex, t, reversed) {
    const el = segRefs.current[segIndex];
    if (!el) return null;
    const len = el.getTotalLength();
    const p = el.getPointAtLength(len * Math.max(0, Math.min(1, reversed ? 1 - t : t)));
    return { x: p.x, y: p.y };
  }

  function walkTo(targetIndex, onArrive) {
    if (travelerStateRef.current.walking) return;
    const from = travelerStateRef.current.index;
    if (from === targetIndex) {
      onArrive();
      return;
    }
    travelerStateRef.current.walking = true;
    setWalking(true);

    const dir = targetIndex > from ? 1 : -1;
    const hops = [];
    for (let n = from; n !== targetIndex; n += dir) hops.push({ segIndex: dir === 1 ? n : n - 1, reversed: dir === -1 });

    function runHop(hopIdx) {
      if (hopIdx >= hops.length) {
        travelerStateRef.current.index = targetIndex;
        travelerStateRef.current.walking = false;
        setTravelerIndex(targetIndex);
        setWalking(false);
        onArrive();
        return;
      }
      const { segIndex, reversed } = hops[hopIdx];
      const segStart = pointOnSeg(segIndex, 0, reversed);
      const segEnd = pointOnSeg(segIndex, 1, reversed);
      if (segEnd && segStart) setFacingLeft(segEnd.x < segStart.x ? false : segEnd.x > segStart.x ? true : facingLeft);

      const startTime = performance.now();
      function frame(now) {
        const t = Math.min(1, (now - startTime) / HOP_MS);
        const p = pointOnSeg(segIndex, t, reversed);
        if (p) setTravelerPos({ x: p.x, y: p.y + TRAVELER_Y_OFFSET });
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
      navigate(`/kelas/${grade}/matematika/topik/${topic.key}`);
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
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.05rem", color: "var(--ink-900)" }}>{subjectName("matematika")}</div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--ink-500)" }}>{t("common", "grade")} {grade}</div>
          </div>
        </div>
        {/* Drive/Plane jadi icon aja di header (2026-08-07, request user) --
            gantiin 2 tombol lebar di footer, biar footer lega buat card
            Math Race. */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => navigate(`/kelas/${grade}/matematika/drive`)}
            aria-label="Drive Mode"
            title="Drive Mode"
            style={{ width: 38, height: 38, borderRadius: "50%", border: `2px solid ${TAUPE}`, background: "#fff", fontSize: "1.05rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            🚗
          </button>
          <button
            onClick={() => navigate(`/kelas/${grade}/matematika/plane`)}
            aria-label="Plane Mode"
            title="Plane Mode"
            style={{ width: 38, height: 38, borderRadius: "50%", border: `2px solid ${TAUPE}`, background: "#fff", fontSize: "1.05rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ✈️
          </button>
        </div>
      </div>

      {loadError && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center" }}>
          <div style={{ color: "var(--ink-400)" }}>{t("map", "loadError")}</div>
        </div>
      )}

      {!loadError && (!topics || !layout) && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-400)" }}>
          {t("map", "preparing")}
        </div>
      )}

      {!loadError && topics && layout && (
        <>
          <div ref={outerRef} style={{ flex: 1, overflowY: "auto", overflowX: "hidden", position: "relative", background: MATH_BG, paddingTop: 30 }}>
            <div style={{ position: "relative", width: MAP_CANVAS_WIDTH, height: layout.totalHeight * scale, transform: `scale(${scale})`, transformOrigin: "top left" }}>
              <TownOrnaments height={layout.totalHeight} />

              <svg width={MAP_CANVAS_WIDTH} height={layout.totalHeight} style={{ position: "absolute", top: 0, left: 0 }}>
                {layout.segments.map((d, i) => (
                  <path key={i} ref={(el) => (segRefs.current[i] = el)} d={d} fill="none" stroke={TAUPE} strokeWidth="7" strokeLinecap="round" strokeDasharray="1 18" />
                ))}
              </svg>

              {topics.map((t, i) => {
                const pos = layout.positions[i];
                const locked = t.status === "locked";
                const done = t.status === "done";
                const current = t.status === "current";
                const stars = t.stars || 0;
                const icon = TOWN_ICONS[i % TOWN_ICONS.length];
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
                        borderRadius: 20,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 28,
                        boxShadow: "0 2px 6px rgba(59,42,26,0.15)",
                        opacity: locked ? 0.55 : 1,
                        filter: locked ? "grayscale(0.5)" : "none",
                        background: done ? WOOD : MATH_BG,
                        border: `3px solid ${done ? WOOD_DARK : current ? CHERRY : TAUPE}`,
                        animation: current ? "jkMvStopPulse 1.8s ease-in-out infinite" : "none",
                      }}
                    >
                      <span>{icon}</span>
                      {done && (
                        <span
                          style={{
                            position: "absolute",
                            top: -4,
                            right: -4,
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: "#fff",
                            border: `2px solid ${WOOD}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: WOOD,
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          ✓
                        </span>
                      )}
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
                            border: `2px solid ${TAUPE}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                          }}
                        >
                          🔒
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
                        background: "rgba(247,238,224,0.92)",
                        padding: "2px 7px",
                        borderRadius: 8,
                      }}
                    >
                      {t.title}
                    </div>
                    {done && (
                      <div style={{ fontSize: 12, color: GOLD, letterSpacing: 1 }}>
                        {"★".repeat(stars)}
                        <span style={{ color: TAUPE }}>{"★".repeat(3 - stars)}</span>
                      </div>
                    )}
                  </button>
                );
              })}

              {travelerPos && (
                <button
                  onClick={() => {
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
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    filter: "drop-shadow(0 3px 4px rgba(59,42,26,0.35))",
                    zIndex: 2,
                    border: "none",
                    background: "none",
                    padding: 0,
                    cursor: "pointer",
                    // Badge Kiko sebelumnya tombol TERPISAH 18x18px nempel
                    // di ujung truck -- kekecilan buat jari beneran di HP
                    // (user lapor "gak bisa dipencet" versi sama di
                    // BinggrisWorldMap). Sekarang SELURUH truck (40x40)
                    // jadi tombolnya, sama pola kayak `ShipSvg` IPAS yang
                    // udah kebukti gampang dipencet -- badge Kiko di bawah
                    // ini murni dekoratif (gak ada onClick sendiri lagi).
                    animation: walking ? "jkMvWalkBounce 0.3s ease-in-out infinite" : "jkMvIdleBob 1.6s ease-in-out infinite",
                  }}
                >
                  <span style={{ fontSize: 30, display: "block", transform: facingLeft ? "scaleX(-1)" : "none" }}>🚚</span>
                  <span
                    style={{
                      position: "absolute",
                      top: -6,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      border: "none",
                      background: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      animation: "jkMvBadgeWiggle 1.8s ease-in-out infinite",
                    }}
                  >
                    <Kiko size={14} />
                  </span>
                  {hintShown && !walking && (
                    <span
                      style={{
                        position: "absolute",
                        left: "50%",
                        bottom: "100%",
                        transform: "translateX(-50%)",
                        marginBottom: 2,
                        whiteSpace: "nowrap",
                        background: "#FF8A3D",
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
        </>
      )}

      <KikoChatPanel open={chatOpen} onClose={() => setChatOpen(false)} mode="general" resetKey={`matematika-map-${grade}`} />

      <style>{`
        @keyframes jkMvDrift { 0% { transform: translateX(0); } 50% { transform: translateX(14px); } 100% { transform: translateX(0); } }
        @keyframes jkMvSway { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }
        @keyframes jkMvBob { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-5px) scale(1.04); } }
        @keyframes jkMvIdleBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        @keyframes jkMvWalkBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes jkMvBadgeWiggle { 0%, 100% { transform: translateX(-50%) rotate(-8deg); } 50% { transform: translateX(-50%) rotate(8deg); } }
        @keyframes jkMvStopPulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(228,87,46,0.22); }
          50% { box-shadow: 0 0 0 10px rgba(228,87,46,0.35); }
        }
      `}</style>
    </Shell>
  );
}
