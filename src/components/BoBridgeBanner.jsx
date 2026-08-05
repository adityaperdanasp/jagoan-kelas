import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// Dino Bridge (nama tampilan -- kode/route masih "bobridge" secara
// internal) -- di-port dari azkacraft/script.js (cari komentar "Bo
// Bridge"). Banner ambient: dino jalan ngelewatin sebaris kaca, looping
// terus, kaca-kacanya muncul di depan & ilang di belakang (reveal window
// berbasis jarak progress ke tiap kaca). TAP banner = buka Glass Bridge
// Challenge (game beneran, route terpisah). Dino dipakai sebagai
// "walker" (bukan Bo si maskot BrainBox, gak ada asetnya di project ini)
// -- user eksplisit minta nama tampilan diganti "Dino Bridge" biar gak
// bikin bingung ("kok Bo Bridge yang keluar malah dino").
const TILES = 9;
const DURATION_MS = 8000;
const REVEAL_WINDOW = 0.16;

export default function BoBridgeBanner({ grade, subject }) {
  const navigate = useNavigate();
  const bannerRef = useRef(null);
  const walkerRef = useRef(null);
  const tilesRef = useRef([]);

  useEffect(() => {
    const banner = bannerRef.current;
    const walker = walkerRef.current;
    if (!banner || !walker) return;
    let rafId;
    let startAt = null;

    function frame(now) {
      if (startAt === null) startAt = now;
      const progress = ((now - startAt) % DURATION_MS) / DURATION_MS;
      const bannerWidth = banner.clientWidth;
      const walkerX = -30 + progress * (bannerWidth + 60);
      // scaleX(-1) -- emoji 🦕 defaultnya ngadep KIRI, tapi jalannya ke
      // kanan (progress 0->1), jadi tanpa di-flip keliatan jalan mundur.
      walker.style.transform = `translateX(${walkerX}px) scaleX(-1)`;

      tilesRef.current.forEach((tile, i) => {
        if (!tile) return;
        const tileFrac = (i + 0.5) / TILES;
        let diff = progress - tileFrac;
        if (diff > 0.5) diff -= 1;
        if (diff < -0.5) diff += 1;
        const shown = diff > -REVEAL_WINDOW && diff < REVEAL_WINDOW;
        tile.style.opacity = shown ? "1" : "0";
      });

      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <button
      ref={bannerRef}
      onClick={() => navigate(`/kelas/${grade}/${subject}/bobridge`)}
      aria-label="Main Dino Bridge"
      style={{
        position: "relative",
        width: "100%",
        height: 60,
        borderRadius: 14,
        background: "linear-gradient(180deg, var(--pastel-blue), var(--cream-100))",
        border: "none",
        overflow: "hidden",
        cursor: "pointer",
        padding: 0,
        marginTop: 10,
      }}
    >
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 10, display: "flex", justifyContent: "space-evenly", padding: "0 20px" }}>
        {Array.from({ length: TILES }).map((_, i) => (
          <div
            key={i}
            ref={(el) => (tilesRef.current[i] = el)}
            style={{
              width: 16,
              height: 10,
              borderRadius: 3,
              background: "var(--surface-card)",
              boxShadow: "0 2px 0 rgba(0,0,0,0.08)",
              opacity: 0,
              transition: "opacity 0.15s linear",
            }}
          />
        ))}
      </div>
      <div ref={walkerRef} style={{ position: "absolute", left: 0, bottom: 6, fontSize: "1.3rem", willChange: "transform" }}>
        🦕
      </div>
      <div
        style={{
          position: "absolute",
          top: 6,
          left: 10,
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: "0.68rem",
          color: "var(--ink-500)",
        }}
      >
        🌉 Dino Bridge — tap buat main!
      </div>
    </button>
  );
}
