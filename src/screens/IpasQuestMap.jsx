import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Shell, { ScreenHeader } from "../components/Shell";
import { loadRawTopics } from "../data/contentLoader";
import { getSubjectProgress, computeStatuses } from "../data/progressService";
import { usePlayer } from "../data/PlayerContext";
import { TRACK_BY_SUBJECT, useBgmTrack } from "../data/bgm";
import Kiko from "../components/ds/Kiko";
import { KikoChatPanel } from "../games/quiz/KikoTutorChat";
import { DinoSvg } from "../games/drive/vehicleArt";
import { useT } from "../data/translations";

// LIVE (2026-08-08, awalnya MOCKUP v2 2026-08-07) -- user minta "plek2
// ikutin SolarQuest" (port SEPRESISI mungkin, bukan reinterpretasi).
// Semua angka/warna/shape di bawah ini disalin LANGSUNG dari
// al-idrisi-games/azkauniverse (style.css section 6b "QUEST PATH MAP" +
// script.js `renderQuestPathMap`/`planetSVG`/`buildPathStarfield`/
// `flyShipTo`), termasuk planet art asli (sun/mercury/earth/mars/jupiter
// -- BUKAN planet generik pastel versi v1 mockup) di-cycle per index
// karena IPAS 8 topik/kelas vs SolarQuest yang cuma 5 (di-hardcode di
// sana). Satu-satunya yang GAK disamain persis: font (tetep pake token
// font app ini, bukan import Fredoka/Baloo 2 asing) dan bahasa
// (Indonesia, ngikutin UI app ini).
//
// Awalnya preview-only (`/kelas/:grade/ipas/peta-mockup`), di-wire jadi
// halaman resmi subject "ipas" (`/kelas/:grade/ipas`, App.jsx) per user
// eksplisit minta disamain sama Bahasa Indonesia ("ipas bukan udah pake
// solarquest ya? kok masi static bgt") -- pola sama persis: route statis
// `/kelas/:grade/ipas` ditaro sebelum `/kelas/:grade/:subject` generik,
// `onBack` diubah dari `/kelas/${grade}/ipas` (dulu nunjuk ke
// SubjectDetail.jsx sebagai "detail sebenarnya") ke `/kelas/${grade}`
// (PickSubject), title header dari "Peta IPAS" jadi "IPAS".

const NODE_SPACING_Y = 230;
const NODE_START_Y = 90;
const MAP_WIDTH = 400;
const SHIP_HOP_MS = 1300;
const SHIP_AVOID_RADIUS = 55;

// -- warna disalin dari style.css [data-theme="colorful"] (tema default) --
const ACCENT_YELLOW = "#ffd93d";
const SECONDARY = "#1266d8";
const HALO_GLOW = "rgba(255, 217, 160, 0.5)";
const LOCKED_COLOR = "rgba(255, 255, 255, 0.3)";
const STAR_FILLED = "#ffd93d";

function buildPathLayout(n) {
  const positions = [];
  for (let i = 0; i < n; i++) {
    const x = i === 0 ? 50 : i % 2 === 1 ? 28 : 72;
    const y = NODE_START_Y + i * NODE_SPACING_Y;
    positions.push({ x, y, side: x < 50 ? "left" : x > 50 ? "right" : "center" });
  }
  const segments = [];
  for (let i = 0; i < n - 1; i++) {
    const a = positions[i];
    const b = positions[i + 1];
    const ax = (a.x / 100) * MAP_WIDTH;
    const ay = a.y;
    const bx = (b.x / 100) * MAP_WIDTH;
    const by = b.y;
    segments.push(`M${ax},${ay} C${ax},${ay + (by - ay) * 0.4} ${bx},${ay + (by - ay) * 0.6} ${bx},${by}`);
  }
  const totalHeight = NODE_START_Y + (n - 1) * NODE_SPACING_Y + 110;
  return { positions, segments, totalHeight };
}

// -- port PERSIS dari azkauniverse/script.js `planetSVG()` -- 5 tema
// asli (sun/mercury/earth/mars/jupiter), di-cycle per index karena IPAS
// punya lebih dari 5 topik. `uid` nyegah id gradient nabrak pas 1 tema
// muncul lebih dari sekali di halaman yang sama.
const PLANET_THEMES = ["sun", "mercury", "earth", "mars", "jupiter"];

function PlanetSvg({ index }) {
  const theme = PLANET_THEMES[index % PLANET_THEMES.length];
  const uid = `p${index}`;
  if (theme === "sun") {
    return (
      <svg viewBox="0 0 100 100">
        <defs>
          <radialGradient id={`sunG${uid}`} cx="38%" cy="32%" r="75%">
            <stop offset="0%" stopColor="#fff3d0" />
            <stop offset="45%" stopColor="#ffd27a" />
            <stop offset="100%" stopColor="#e8912e" />
          </radialGradient>
        </defs>
        <g fill="none" stroke="#ffcf7e" strokeWidth="2.5" opacity="0.8">
          <path d="M50 4 L50 16" /><path d="M50 84 L50 96" />
          <path d="M4 50 L16 50" /><path d="M84 50 L96 50" />
          <path d="M16 16 L24 24" /><path d="M76 76 L84 84" />
          <path d="M84 16 L76 24" /><path d="M16 84 L24 76" />
        </g>
        <circle cx="50" cy="50" r="26" fill={`url(#sunG${uid})`} />
      </svg>
    );
  }
  if (theme === "mercury") {
    return (
      <svg viewBox="0 0 100 100">
        <defs>
          <radialGradient id={`atomG${uid}`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#dff0ff" />
            <stop offset="45%" stopColor="#7cc0ff" />
            <stop offset="100%" stopColor="#1266d8" />
          </radialGradient>
        </defs>
        <g fill="none" stroke="#bfe0ff" strokeWidth="2">
          <ellipse cx="50" cy="50" rx="40" ry="15" />
          <ellipse cx="50" cy="50" rx="40" ry="15" transform="rotate(60 50 50)" />
          <ellipse cx="50" cy="50" rx="40" ry="15" transform="rotate(120 50 50)" />
        </g>
        <circle cx="50" cy="50" r="20" fill={`url(#atomG${uid})`} />
        <circle cx="90" cy="50" r="3.5" fill="#fff" />
      </svg>
    );
  }
  if (theme === "earth") {
    return (
      <svg viewBox="0 0 100 100">
        <defs>
          <radialGradient id={`earthG${uid}`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#eafff2" />
            <stop offset="45%" stopColor="#5fd0a6" />
            <stop offset="100%" stopColor="#1a7fb8" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="28" fill={`url(#earthG${uid})`} />
        <path d="M32 34 q10 -6 18 2 q6 8 -4 12 q-10 4 -16 -4 q-4 -6 2 -10" fill="#2f9e6b" opacity="0.85" />
        <path d="M60 55 q8 -2 12 6 q2 6 -6 8 q-8 2 -10 -6 q-1 -5 4 -8" fill="#2f9e6b" opacity="0.85" />
        <g fill="none" stroke="#f2a94e" strokeWidth="2" strokeLinecap="round">
          <path d="M78 30 a30 30 0 0 1 6 14" /><path d="M22 70 a30 30 0 0 1 -6 -14" />
        </g>
      </svg>
    );
  }
  if (theme === "mars") {
    return (
      <svg viewBox="0 0 100 100">
        <defs>
          <radialGradient id={`marsG${uid}`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffcfa8" />
            <stop offset="45%" stopColor="#e2703f" />
            <stop offset="100%" stopColor="#9c3d1f" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="28" fill={`url(#marsG${uid})`} />
        <g stroke="#ffe3cc" strokeWidth="1.4" opacity="0.75">
          <line x1="24" y1="38" x2="76" y2="38" /><line x1="24" y1="50" x2="76" y2="50" /><line x1="24" y1="62" x2="76" y2="62" />
          <line x1="38" y1="24" x2="38" y2="76" /><line x1="62" y1="24" x2="62" y2="76" />
        </g>
      </svg>
    );
  }
  // jupiter
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <radialGradient id={`jupG${uid}`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fff0c9" />
          <stop offset="45%" stopColor="#e0b06a" />
          <stop offset="100%" stopColor="#a9743a" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="28" fill={`url(#jupG${uid})`} />
      <path d="M22 42 h56 M22 50 h56 M22 58 h56" stroke="#a9743a" strokeWidth="3" opacity="0.4" />
      <circle cx="50" cy="50" r="28" fill="none" stroke="#fff" strokeWidth="1.4" opacity="0.5" />
      <path d="M50 36 v14 l9 5" stroke="#7a4f1e" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function ShipSvg() {
  return (
    <svg viewBox="0 0 40 40" width="30" height="30">
      <path d="M20 4 L27 26 L20 21 L13 26 Z" fill="#f4f6ff" stroke="#1266d8" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="20" cy="15" r="3" fill="#1266d8" />
      <path d="M13 22 L6 31 L13 27 Z" fill="#ff5d8f" />
      <path d="M27 22 L34 31 L27 27 Z" fill="#ff5d8f" />
      <path d="M17 25 L20 36 L23 25 Z" fill="#ffd93d" />
    </svg>
  );
}

// Sama pola kayak SolarQuest: 3x glyph ★ YANG SAMA, cuma beda warna buat
// yang "kosong" -- ganti ke unicode ☆ malah keliatan solid juga di font
// app ini (glyph fallback beda), jadi warna doang yang bedain, bukan
// karakter.
// Deterministic pseudo-random (seeded) -- generate sama persis tiap
// render selama `seed` gak berubah, biar posisi bintang gak "loncat"
// pas re-render (misal abis fetch progress selesai).
function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Ornamen tambahan (BUKAN port dari SolarQuest -- al-idrisi cuma punya
// dots statis buat parallax, gak ada kelap-kelip sama sekali) diminta
// user biar berasa "luar angkasa beneran": banyak bintang kecil yang
// nyala-redup gantian (opacity animasi, delay+durasi acak per bintang
// via seeded random biar stabil), plus beberapa aksen ✨ lebih besar
// yang juga muter pelan.
function TwinkleStars({ height }) {
  const stars = useMemo(() => {
    const rand = seededRandom(42);
    const count = Math.min(140, Math.max(50, Math.round(height / 22)));
    const dots = Array.from({ length: count }).map((_, i) => ({
      key: "dot" + i,
      left: rand() * 100,
      top: rand() * height,
      size: 1 + rand() * 2,
      delay: rand() * 4,
      duration: 2 + rand() * 2.5,
    }));
    const sparkleCount = Math.max(6, Math.round(height / 260));
    const sparkles = Array.from({ length: sparkleCount }).map((_, i) => ({
      key: "sparkle" + i,
      left: rand() * 100,
      top: rand() * height,
      size: 10 + rand() * 8,
      delay: rand() * 5,
      duration: 3 + rand() * 2,
    }));
    return { dots, sparkles };
  }, [height]);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {stars.dots.map((s) => (
        <span
          key={s.key}
          style={{
            position: "absolute",
            left: s.left + "%",
            top: s.top,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 0 4px 1px rgba(255,255,255,0.6)",
            animation: `jkStarTwinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
      {stars.sparkles.map((s) => (
        <span
          key={s.key}
          style={{
            position: "absolute",
            left: s.left + "%",
            top: s.top,
            fontSize: s.size,
            animation: `jkStarTwinkle ${s.duration}s ease-in-out ${s.delay}s infinite, jkStarSpin 9s linear infinite`,
            filter: "drop-shadow(0 0 3px rgba(255,217,160,0.6))",
          }}
        >
          ✨
        </span>
      ))}
    </div>
  );
}

function StarsRow({ count, locked }) {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <span key={i} style={{ color: i < count ? STAR_FILLED : locked ? LOCKED_COLOR : "rgba(255,255,255,0.3)" }}>
          ★
        </span>
      ))}
    </>
  );
}

// -- port PERSIS dari `buildPathStarfield()`: 3 layer tile SVG dot
// pattern, beda density/opacity/speed, parallax lewat scroll listener
// di container yang beneran scroll (bukan window, karena Shell app ini
// scroll di dalem div, bukan document body kayak SolarQuest).
function useParallaxStarfield(containerRef, fieldRef) {
  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    field.innerHTML = "";
    function layerBg(count, size, opacity) {
      const dots = [];
      for (let i = 0; i < count; i++) {
        const x = Math.random() * 200;
        const y = Math.random() * 200;
        const r = Math.random() * size + 0.4;
        dots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="rgb(255,255,255)" opacity="${opacity}"/>`);
      }
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">${dots.join("")}</svg>`;
      return "url('data:image/svg+xml;utf8," + encodeURIComponent(svg) + "')";
    }
    const layers = [
      { bg: layerBg(40, 1.1, 0.9), speed: 0.08, size: "200px 200px" },
      { bg: layerBg(28, 1.6, 0.7), speed: 0.18, size: "260px 260px" },
      { bg: layerBg(16, 2.2, 0.55), speed: 0.32, size: "320px 320px" },
    ];
    const els = layers.map((l) => {
      const div = document.createElement("div");
      div.style.position = "absolute";
      div.style.inset = "-10% -10%";
      div.style.backgroundRepeat = "repeat";
      div.style.willChange = "transform";
      div.style.backgroundImage = l.bg;
      div.style.backgroundSize = l.size;
      div.dataset.speed = l.speed;
      field.appendChild(div);
      return div;
    });

    const container = containerRef.current;
    let ticking = false;
    function update() {
      const scrolled = container.scrollTop;
      els.forEach((el) => {
        const speed = parseFloat(el.dataset.speed);
        el.style.transform = `translateY(${scrolled * speed * -0.15}px)`;
      });
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    }
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      container?.addEventListener("scroll", onScroll, { passive: true });
    }
    return () => container?.removeEventListener("scroll", onScroll);
  }, [containerRef, fieldRef]);
}

export default function IpasQuestMap() {
  const { grade } = useParams();
  const navigate = useNavigate();
  const { player } = usePlayer();
  const { t, subjectName } = useT();
  useBgmTrack(TRACK_BY_SUBJECT.ipas);

  const [topics, setTopics] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [shipIndex, setShipIndex] = useState(null);
  const [shipPos, setShipPos] = useState(null);
  const [shipFlying, setShipFlying] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [shipHintShown, setShipHintShown] = useState(true);

  const segRefs = useRef([]);
  const shipStateRef = useRef({ index: null, flying: false });
  const scrollRef = useRef(null);
  const fieldRef = useRef(null);
  useParallaxStarfield(scrollRef, fieldRef);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadRawTopics("ipas", grade), getSubjectProgress(player.id, "ipas", grade, player.token)])
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

  const layout = useMemo(() => (topics ? buildPathLayout(topics.length) : null), [topics]);

  useEffect(() => {
    if (!layout || shipIndex !== null) return;
    const firstCurrent = topics.findIndex((t) => t.status === "current");
    const idx = firstCurrent >= 0 ? firstCurrent : topics.length - 1;
    shipStateRef.current.index = idx;
    setShipIndex(idx);
    setShipPos(layout.positions[idx]);
  }, [layout, topics, shipIndex]);

  function pointOnSeg(segIndex, t) {
    const el = segRefs.current[segIndex];
    if (!el) return { x: 0, y: 0 };
    const len = el.getTotalLength();
    const p = el.getPointAtLength(len * Math.max(0, Math.min(1, t)));
    return { x: p.x, y: p.y };
  }

  function flyShipTo(targetIndex, onArrive) {
    if (shipStateRef.current.flying) return;
    const from = shipStateRef.current.index;
    if (from === targetIndex) {
      onArrive();
      return;
    }
    shipStateRef.current.flying = true;
    setShipFlying(true);

    const dir = targetIndex > from ? 1 : -1;
    const hops = [];
    for (let n = from; n !== targetIndex; n += dir) {
      hops.push({ segIndex: dir === 1 ? n : n - 1, reversed: dir === -1 });
    }
    const passThrough = [];
    for (let n = Math.min(from, targetIndex) + 1; n < Math.max(from, targetIndex); n++) passThrough.push(n);

    function runHop(hopIdx) {
      if (hopIdx >= hops.length) {
        shipStateRef.current.index = targetIndex;
        shipStateRef.current.flying = false;
        setShipIndex(targetIndex);
        setShipFlying(false);
        onArrive();
        return;
      }
      const { segIndex, reversed } = hops[hopIdx];
      const startTime = performance.now();

      function frame(now) {
        const t = Math.min(1, (now - startTime) / SHIP_HOP_MS);
        const segT = reversed ? 1 - t : t;
        let { x, y } = pointOnSeg(segIndex, segT);

        passThrough.forEach((n) => {
          const pos = layout.positions[n];
          const nx = (pos.x / 100) * MAP_WIDTH;
          const ny = pos.y;
          const dx = x - nx;
          const dy = y - ny;
          const dist = Math.hypot(dx, dy);
          if (dist < SHIP_AVOID_RADIUS && dist > 0.001) {
            const scale = SHIP_AVOID_RADIUS / dist;
            x = nx + dx * scale;
            y = ny + dy * scale;
          }
        });

        const aheadT = reversed ? segT - 0.02 : segT + 0.02;
        const ahead = pointOnSeg(segIndex, aheadT);
        const angle = Math.atan2(ahead.y - y, ahead.x - x) * (180 / Math.PI);
        setShipPos({ x: (x / MAP_WIDTH) * 100, y, angle: angle + 90 });

        if (t < 1) requestAnimationFrame(frame);
        else runHop(hopIdx + 1);
      }
      requestAnimationFrame(frame);
    }
    runHop(0);
  }

  function handlePlanetTap(i, topic) {
    if (topic.status === "locked" || shipFlying) return;
    flyShipTo(i, () => {
      navigate(`/kelas/${grade}/ipas/topik/${topic.key}`);
    });
  }

  return (
    <Shell>
      <ScreenHeader onBack={() => navigate(`/kelas/${grade}`)} title={subjectName("ipas")} subtitle={`${t("common", "grade")} ${grade}`} />

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
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            position: "relative",
            background: "linear-gradient(160deg, #0b0f2e 0%, #1b1464 45%, #3a1b6e 100%)",
          }}
        >
          <div style={{ position: "relative", width: "100%", height: layout.totalHeight }}>
            <div ref={fieldRef} style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }} />
            <TwinkleStars height={layout.totalHeight} />

            <svg
              viewBox={`0 0 ${MAP_WIDTH} ${layout.totalHeight}`}
              width="100%"
              height={layout.totalHeight}
              preserveAspectRatio="none"
              style={{ position: "absolute", inset: 0, overflow: "visible" }}
            >
              <defs>
                <linearGradient id="ipasPathLit" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={ACCENT_YELLOW} />
                  <stop offset="100%" stopColor={SECONDARY} />
                </linearGradient>
                <filter id="ipasPathGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {layout.segments.map((d, i) => {
                const lit = topics[i + 1]?.status !== "locked";
                return (
                  <path
                    key={i}
                    ref={(el) => (segRefs.current[i] = el)}
                    d={d}
                    fill="none"
                    stroke={lit ? "url(#ipasPathLit)" : LOCKED_COLOR}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={lit ? "0" : "2 12"}
                    filter={lit ? "url(#ipasPathGlow)" : undefined}
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
              const meta = done ? `Selesai · ${stars}/3 bintang` : current ? "Lagi dimainin" : "Terkunci";
              return (
                <button
                  key={t.key}
                  onClick={() => handlePlanetTap(i, t)}
                  disabled={locked}
                  style={{
                    position: "absolute",
                    left: pos.x + "%",
                    top: pos.y,
                    transform: "translate(-50%,-50%)",
                    width: 168,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: pos.side === "left" ? "flex-end" : pos.side === "right" ? "flex-start" : "center",
                    textAlign: pos.side === "left" ? "right" : pos.side === "right" ? "left" : "center",
                    gap: 6,
                    border: "none",
                    background: "none",
                    cursor: locked ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <div style={{ position: "relative", width: 74, height: 74 }}>
                    {!locked && (
                      <span
                        className="jk-ipas-halo"
                        style={{
                          position: "absolute",
                          inset: -12,
                          borderRadius: "50%",
                          background: `radial-gradient(circle, ${HALO_GLOW}, transparent 70%)`,
                        }}
                      />
                    )}
                    <span style={{ position: "relative", display: "block", width: "100%", height: "100%", filter: locked ? "grayscale(0.85)" : "none", opacity: locked ? 0.6 : 1 }}>
                      <PlanetSvg index={i} />
                    </span>
                    {locked && (
                      <span
                        style={{
                          position: "absolute",
                          bottom: -2,
                          right: -2,
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: "#fff",
                          border: "2px solid var(--gentle-bg, #e9f2fc)",
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
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.82rem", color: locked ? LOCKED_COLOR : "#fff" }}>
                    {t.title}
                  </span>
                  <span style={{ fontSize: "0.72rem", letterSpacing: 2 }}>
                    <StarsRow count={stars} locked={locked} />
                  </span>
                  <span
                    style={{
                      fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
                      fontSize: "0.55rem",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.55)",
                    }}
                  >
                    {meta}
                  </span>
                </button>
              );
            })}

            <button
              onClick={() => (window.location.href = "/dinorace/index.html")}
              title="Bonus: DinoRace!"
              style={{
                position: "absolute",
                left: "88%",
                top: layout.totalHeight - 55,
                transform: "translate(-50%,-50%)",
                width: 30,
                height: 30,
                border: "none",
                background: "none",
                cursor: "pointer",
                padding: 0,
                animation: "jkDinoFabBounce 2.2s ease-in-out infinite",
              }}
            >
              <span style={{ position: "relative", display: "inline-block", width: 30, height: 42 }}>
                <DinoSvg size={30} />
                <span
                  style={{
                    position: "absolute",
                    top: -6,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 22,
                    height: 14,
                    borderRadius: "50% 50% 40% 40%",
                    background: "rgba(191,227,240,0.55)",
                    border: "1.5px solid #8fb9c9",
                  }}
                />
              </span>
            </button>

            {shipPos && (
              <button
                onClick={() => {
                  setShipHintShown(false);
                  setChatOpen(true);
                }}
                style={{
                  position: "absolute",
                  left: shipPos.x + "%",
                  top: shipPos.y,
                  transform: `translate(-50%,-50%) rotate(${shipPos.angle ?? 0}deg)`,
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  padding: 0,
                  zIndex: 5,
                  filter: "drop-shadow(0 3px 6px rgba(10, 5, 40, 0.35))",
                }}
              >
                <ShipSvg />
                <span
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "38%",
                    transform: `translate(-50%,-50%) rotate(${-(shipPos.angle ?? 0)}deg)`,
                    pointerEvents: "none",
                  }}
                >
                  <Kiko size={12} />
                </span>
                {shipHintShown && !shipFlying && (
                  <span
                    style={{
                      position: "absolute",
                      left: "50%",
                      bottom: "100%",
                      transform: `translateX(-50%) rotate(${-(shipPos.angle ?? 0)}deg)`,
                      whiteSpace: "nowrap",
                      background: "#FF8A3D",
                      color: "#fff",
                      borderRadius: "8px 8px 8px 2px",
                      padding: "2px 7px",
                      fontSize: "0.62rem",
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      marginBottom: 2,
                    }}
                  >
                    {t("map", "hiKiko")} 👋
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      <KikoChatPanel open={chatOpen} onClose={() => setChatOpen(false)} mode="general" resetKey={`ipas-map-${grade}`} />

      <style>{`
        @keyframes jkDinoFabBounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25%      { transform: translateY(-10px) rotate(-6deg); }
          50%      { transform: translateY(0) rotate(0deg); }
          75%      { transform: translateY(-5px) rotate(5deg); }
        }
        @keyframes jkIpasHaloPulse {
          0%, 100% { opacity: 0.55; transform: scale(0.94); }
          50% { opacity: 1; transform: scale(1.06); }
        }
        .jk-ipas-halo { animation: jkIpasHaloPulse 3.2s ease-in-out infinite; }
        @keyframes jkStarTwinkle {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 1; }
        }
        @keyframes jkStarSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Shell>
  );
}
