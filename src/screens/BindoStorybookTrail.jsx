import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Shell, { ScreenHeader } from "../components/Shell";
import Kiko from "../components/ds/Kiko";
import { KikoChatPanel } from "../games/quiz/KikoTutorChat";
import BoBridgeBanner from "../components/BoBridgeBanner";
import { loadRawTopics } from "../data/contentLoader";
import { getSubjectProgress, computeStatuses } from "../data/progressService";
import { usePlayer } from "../data/PlayerContext";
import { TRACK_BY_SUBJECT, useBgmTrack } from "../data/bgm";
import { wordOfDayForToday, funFactForToday } from "../data/bindoTrivia";

// LIVE (2026-08-08) -- user minta "design dan visual serta ilustrasi
// plek2 ikutin aja Language & Arts" (azkacraft) buat Bahasa Indonesia.
// Warna/layout di bawah di-port LANGSUNG dari azkacraft/style.css (hero-*,
// title-ribbon, stat-strip, info-card, timeline-*) + script.js
// (TOPIC_STYLE/CHAPTER_DECO/renderBookshelf) -- palet default "Sky
// Explorer" (boy/palette0) yang mereka pakai, BUKAN sistem ganti-tema
// gender/palet mereka (di luar scope, app ini gak punya konsep itu).
// Awalnya mockup preview-only (`/bindo/peta-mockup`), SEKARANG udah jadi
// halaman resmi subject "bindo" (`/kelas/:grade/bindo`, App.jsx) per
// approval eksplisit user -- SubjectDetail.jsx generic TETEP dipake buat
// 5 subject lain, cuma bindo yang punya halaman sendiri kayak gini.
//
// Beda sengaja dari sumbernya:
// - Hero mascot (CSS-built, boy/girl) DIGANTI Kiko (maskot resmi app ini),
//   ukuran ~sama (104px), tetep bounce, SEKARANG bisa di-tap buka AI chat
//   (azkacraft punya widget chat terpisah di layar lain, di sini digabung
//   ke satu tap di mascot-nya langsung -- request eksplisit user).
// - Mode-grid Solo/Multiplayer DICABUT -- app ini gak punya mode
//   multiplayer per-topik kayak azkacraft, cuma ada 1 jalur practice.
// - Stat-strip pakai DATA ASLI (XP/bab selesai/bab lagi jalan), bukan
//   dummy placeholder kayak contoh HTML statisnya azkacraft.
// - Word of the Day / Fun Fact isinya ditulis sendiri Bahasa Indonesia
//   (bindoTrivia.js), rotasi harian pola sama kayak KikoGreeting.
// - Bo Bridge banner REUSE komponen `BoBridgeBanner.jsx` yang UDAH ADA
//   (dipasang di SubjectDetail.jsx yang sekarang), bukan dibangun ulang.

const BRAND = "#2F6FED";
const BRAND_DARK = "#1E56C4";
const ACCENT_1 = "#FFB35C";
const ACCENT_2 = "#FFD866";
const ACCENT_3 = "#22B573";
const CARD_BORDER = "#F1E6D2";
const PAPER = "#FFFBF2";
const INK = "#4a3520";
const INK_SOFT = "#8a7d6d";
const SKY_GRADIENT = "linear-gradient(180deg,#BFE3FF 0%,#EAF6E9 100%)";

const TOPIC_STYLE = [
  { icon: "✏️", color: "#FF9F40", colorDark: "#E08428" },
  { icon: "🔤", color: "#FF6F91", colorDark: "#E8547A" },
  { icon: "📐", color: BRAND, colorDark: BRAND_DARK },
  { icon: "🌊", color: ACCENT_3, colorDark: "#158A54" },
  { icon: "🎨", color: "#9B59FF", colorDark: "#7E3EDB" },
];
const CHAPTER_DECO = ["⭐", "✨", "🍃", "🌟", "🎈", "📎", "💫"];

export default function BindoStorybookTrail() {
  const { grade } = useParams();
  const navigate = useNavigate();
  const { player } = usePlayer();
  useBgmTrack(TRACK_BY_SUBJECT.bindo);

  const [topics, setTopics] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const wordOfDay = wordOfDayForToday();
  const funFact = funFactForToday();

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadRawTopics("bindo", grade), getSubjectProgress(player.id, "bindo", grade)])
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

  const doneCount = topics ? topics.filter((t) => t.status === "done").length : 0;
  const xpTotal = topics ? topics.reduce((sum, t) => sum + (t.xp || 0), 0) : 0;
  const currentTopic = topics?.find((t) => t.status === "current");

  return (
    <Shell>
      <ScreenHeader onBack={() => navigate(`/kelas/${grade}`)} title="Bahasa Indonesia" subtitle={`Kelas ${grade}`} />

      {loadError && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", color: "var(--ink-400)" }}>
          Gagal muat peta. Coba cek koneksi internet kamu, ya!
        </div>
      )}

      {!loadError && !topics && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-400)" }}>Menyiapin peta...</div>
      )}

      {!loadError && topics && (
        <div style={{ flex: 1, overflowY: "auto", background: PAPER }}>
          {/* ---- Hero scene (port dari .hero-scene) ---- */}
          <div style={{ position: "relative", height: 210, background: SKY_GRADIENT, overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 22, left: 26, width: 56, height: 56, borderRadius: "50%", background: ACCENT_2, boxShadow: `0 0 30px ${ACCENT_2}` }} />
            {[
              { top: 20, left: 120, size: 4, dur: 2.2 },
              { top: 60, left: 180, size: 3, dur: 2.8 },
              { top: 34, left: 240, size: 5, dur: 2.4 },
              { top: 90, left: 300, size: 3, dur: 3 },
              { top: 18, left: 330, size: 4, dur: 2.6 },
              { top: 70, left: 60, size: 3, dur: 3.2 },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: s.top,
                  left: s.left,
                  width: s.size,
                  height: s.size,
                  borderRadius: "50%",
                  background: "#fff",
                  animation: `jkBindoTwinkle ${s.dur}s ease-in-out infinite`,
                }}
              />
            ))}
            <div style={{ position: "absolute", bottom: -30, left: -20, width: 220, height: 120, borderRadius: "50%", background: ACCENT_3, opacity: 0.3 }} />
            <div style={{ position: "absolute", bottom: -46, right: -40, width: 260, height: 140, borderRadius: "50%", background: BRAND, opacity: 0.18 }} />

            <button
              onClick={() => setChatOpen(true)}
              aria-label="Ngobrol sama Kiko"
              style={{
                position: "absolute",
                bottom: 14,
                right: 24,
                width: 104,
                height: 118,
                border: "none",
                background: "none",
                padding: 0,
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
                animation: "jkBindoMascotBounce 3.4s ease-in-out infinite",
                filter: "drop-shadow(0 6px 8px rgba(60,40,20,.22))",
              }}
            >
              <Kiko size={104} />
            </button>
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                bottom: 100,
                right: 96,
                background: "#fff",
                padding: "6px 12px",
                borderRadius: "14px 14px 14px 4px",
                fontFamily: "var(--font-body)",
                fontWeight: 700,
                fontSize: "0.78rem",
                color: INK,
                boxShadow: "0 3px 8px rgba(0,0,0,.10)",
                whiteSpace: "nowrap",
              }}
            >
              Kiko disini
            </div>
          </div>

          {/* ---- Body (port dari .home-body / .title-ribbon / .stat-strip / .info-card) ---- */}
          <div style={{ padding: "0 22px 20px", marginTop: -6, position: "relative", zIndex: 3 }}>
            <div
              style={{
                background: BRAND,
                borderRadius: 16,
                padding: "14px 10px 10px",
                boxShadow: `0 6px 0 ${BRAND_DARK}, 0 10px 20px rgba(0,0,0,.15)`,
                textAlign: "center",
              }}
            >
              <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.7rem", lineHeight: 1.1, color: "#fff" }}>
                Bahasa Indonesia
              </h1>
            </div>
            <div style={{ textAlign: "center", fontSize: "0.85rem", color: INK_SOFT, margin: "12px 0 18px", fontWeight: 700 }}>
              Petualangan Kata &amp; Cerita
            </div>

            <div
              style={{
                background: PAPER,
                border: `2px dashed ${CARD_BORDER}`,
                borderRadius: 18,
                padding: "14px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-around",
                textAlign: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 20 }}>⭐</div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.72rem", color: INK, marginTop: 4 }}>{xpTotal} XP</div>
              </div>
              <div style={{ width: 2, height: 28, background: CARD_BORDER }} />
              <div>
                <div style={{ fontSize: 20 }}>🏅</div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.72rem", color: INK, marginTop: 4 }}>
                  {doneCount} Bab Selesai
                </div>
              </div>
              <div style={{ width: 2, height: 28, background: CARD_BORDER }} />
              <div>
                <div style={{ fontSize: 20 }}>📖</div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.72rem", color: INK, marginTop: 4 }}>
                  {currentTopic ? currentTopic.title : "Selesai semua!"}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, background: PAPER, border: `2px solid ${CARD_BORDER}`, borderRadius: 18, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: "none", width: 42, height: 42, borderRadius: 12, background: ACCENT_1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                💡
              </div>
              <div>
                <div style={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.04em", color: BRAND, textTransform: "uppercase", marginBottom: 2 }}>
                  Kata Hari Ini
                </div>
                <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "0.95rem", color: INK }}>
                  {wordOfDay.word} <span style={{ fontSize: "0.75rem", fontWeight: 700, color: INK_SOFT }}>— {wordOfDay.meaning}</span>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 10, background: PAPER, border: `2px solid ${CARD_BORDER}`, borderRadius: 18, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: "none", width: 42, height: 42, borderRadius: 12, background: ACCENT_3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                🌊
              </div>
              <div>
                <div style={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.04em", color: BRAND, textTransform: "uppercase", marginBottom: 2 }}>
                  Fakta Menarik
                </div>
                <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "0.82rem", color: INK, lineHeight: 1.3 }}>{funFact}</div>
              </div>
            </div>
          </div>

          {/* ---- Storybook Trail chapter timeline (port dari .chapters-content/.timeline) ---- */}
          <div style={{ padding: "8px 18px 30px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, margin: "10px 0 18px" }}>
              <span style={{ fontSize: 20, transform: "rotate(-8deg)", display: "inline-block" }}>📚</span>
              <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", color: BRAND }}>Jejak Ceritamu</h2>
              <span style={{ fontSize: 20, transform: "rotate(8deg)", display: "inline-block" }}>✏️</span>
            </div>

            <BoBridgeBanner grade={grade} subject="bindo" />

            <div style={{ position: "relative", padding: "6px 0" }}>
              <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", borderLeft: `4px dashed ${CARD_BORDER}`, transform: "translateX(-50%)", zIndex: 0 }} />
              {topics.map((t, i) => {
                const unlocked = t.status !== "locked";
                const style = TOPIC_STYLE[i % TOPIC_STYLE.length];
                const justify = i % 2 === 0 ? "flex-start" : "flex-end";
                const iconSide = i % 2 === 0 ? "right" : "left";
                const iconRotate = (i % 3) * 12 - 12;
                const deco = CHAPTER_DECO[i % CHAPTER_DECO.length];
                const stars = t.stars || 0;
                const starsDisplay = "★".repeat(stars) + "☆".repeat(3 - stars);
                return (
                  <div key={t.key} style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: justify, marginBottom: 14 }}>
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        top: "50%",
                        [iconSide]: 2,
                        transform: `translateY(-50%) rotate(${iconRotate}deg)`,
                        fontSize: 19,
                        opacity: 0.55,
                        pointerEvents: "none",
                      }}
                    >
                      {deco}
                    </span>
                    <button
                      disabled={!unlocked}
                      onClick={() => unlocked && navigate(`/kelas/${grade}/bindo/topik/${t.key}`)}
                      style={{
                        border: `2px solid ${unlocked ? style.color : CARD_BORDER}`,
                        cursor: unlocked ? "pointer" : "not-allowed",
                        opacity: unlocked ? 1 : 0.7,
                        textAlign: "left",
                        width: "76%",
                        background: PAPER,
                        borderRadius: 18,
                        padding: 14,
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        boxShadow: "0 4px 10px rgba(0,0,0,.06)",
                      }}
                    >
                      <div
                        style={{
                          flex: "none",
                          width: 52,
                          height: 52,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 22,
                          background: style.color,
                          boxShadow: `0 3px 0 ${style.colorDark}`,
                        }}
                      >
                        {unlocked ? style.icon : "🔒"}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.84rem", color: INK, lineHeight: 1.25, marginBottom: 4 }}>
                          Bab {i + 1}: {t.title}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: "0.62rem", fontWeight: 800, padding: "2px 8px", borderRadius: 999, color: style.color, background: style.color + "22" }}>
                            {t.status === "done" ? "Selesai" : t.status === "current" ? "Lanjut" : "Terkunci"}
                          </span>
                          <span style={{ fontSize: "0.75rem", letterSpacing: 1, color: style.color }}>{starsDisplay}</span>
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <KikoChatPanel open={chatOpen} onClose={() => setChatOpen(false)} mode="general" resetKey={`bindo-map-${grade}`} />

      <style>{`
        @keyframes jkBindoTwinkle { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.9; } }
        @keyframes jkBindoMascotBounce { 0%, 100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-8px) rotate(3deg); } }
      `}</style>
    </Shell>
  );
}
