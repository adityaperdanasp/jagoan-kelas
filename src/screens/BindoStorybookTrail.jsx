import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Shell, { ScreenHeader } from "../components/Shell";
import Kiko from "../components/ds/Kiko";
import { KikoChatPanel } from "../games/quiz/KikoTutorChat";
import { loadRawTopics } from "../data/contentLoader";
import { getSubjectProgress, computeStatuses } from "../data/progressService";
import { usePlayer } from "../data/PlayerContext";
import { TRACK_BY_SUBJECT, useBgmTrack } from "../data/bgm";
import { wordOfDayForToday, funFactForToday } from "../data/bindoTrivia";
import { PALETTES, SWATCH_COLORS, loadBindoTheme, saveBindoTheme } from "../data/bindoTheme";

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
//   ukuran ~sama (104px), SEKARANG bisa di-tap buka AI chat (azkacraft
//   punya widget chat terpisah di layar lain, di sini digabung ke satu
//   tap di mascot-nya langsung -- request eksplisit user).
// - Kiko GAK cuma bounce di tempat (2026-08-08, revisi) -- "jalan2 kanan
//   kiri joget2 naik turun" (request user) -- 2 animasi kepasang bareng:
//   `jkBindoKikoWalk` (geser `left` pelan bolak-balik, 14s) + terpisah
//   `jkBindoKikoDance` (bounce+rotate cepat, 0.9s) di elemen yang SAMA --
//   properti beda (`left` vs `transform`) jadi 2 animasi CSS gak nabrak,
//   hasilnya "jalan sambil joget" bukan lompat teleport antar titik.
// - Bubble "Kiko disini" jadi CHILD di dalem button Kiko (bukan sibling
//   posisi absolut sendiri) -- biar otomatis ikut kemanapun Kiko jalan,
//   gak perlu itung ulang posisi manual tiap frame. Ekor bubble (sudut
//   radius kecil) di KANAN-BAWAH (bukan kiri-bawah kayak port awal/
//   azkacraft asli) karena Kiko selalu di bawah-kanan bubble, biar
//   kebaca "Kiko yang ngomong" (request eksplisit user, bug ketemu pas
//   direview). Timing bubble juga diubah: dulu selalu nongol, sekarang
//   siklus nongol 2 detik / ilang 5 detik (`jkBindoBubbleCycle`, 7s loop)
//   -- gak nutupin pemandangan terus-terusan.
// - Mode-grid Solo/Multiplayer DITAMBAHIN balik (2026-08-08, semula
//   dicabut) -- "Multiplayer" SENGAJA visual doang dulu (toast "segera
//   hadir" pas di-tap) -- user eksplisit milih "visual doang" pas
//   ditanya, BUKAN fitur head-to-head beneran kayak Math Race (scope
//   kerjaan gede, di luar "ikutin desainnya doang").
// - Stat-strip pakai DATA ASLI (XP/bab selesai/bab lagi jalan), bukan
//   dummy placeholder kayak contoh HTML statisnya azkacraft.
// - Word of the Day / Fun Fact isinya ditulis sendiri Bahasa Indonesia
//   (bindoTrivia.js), rotasi harian pola sama kayak KikoGreeting.
//
// "Solo Adventure" awalnya cuma scroll ke daftar bab di HALAMAN YANG
// SAMA (1 layar panjang) -- user komplain "jelek", minta 2 layar
// terpisah kayak azkacraft asli (Landing vs Quest Map). SEKARANG "Solo
// Adventure" navigate ke `BindoQuestMap.jsx` (layar baru, route
// `/kelas/:grade/bindo/bab`), bukan scroll di tempat lagi -- file ini
// jadi CUMA "layar depan" (hero+Kiko+mode-grid+trivia), daftar bab
// timeline-nya pindah total ke file itu.
//
// Toggle warna Boy/Girl x 3 palet (2026-08-08) -- request eksplisit user
// ("bisa bikin ada togle gonta ganti kombinasi warna juga? Samain kaya
// di al idrisi, ambil reponya"). Definisi 6 kombinasi + persist
// localStorage di `bindoTheme.js` (di-port PERSIS dari azkacraft's
// `PALETTE_COLORS`/`THEME_KEY`), CUMA dipasang di layar ini (BUKAN
// `BindoQuestMap.jsx` -- daftar bab warnanya dari `TOPIC_STYLE` fixed
// per-kategori soal, independen dari brand/accent palette azkacraft
// sendiri, jadi emang gak perlu ikut berubah).

const CARD_BORDER = "#F1E6D2";
const PAPER = "#FFFBF2";
const INK = "#4a3520";
const INK_SOFT = "#8a7d6d";

export default function BindoStorybookTrail() {
  const { grade } = useParams();
  const navigate = useNavigate();
  const { player } = usePlayer();
  useBgmTrack(TRACK_BY_SUBJECT.bindo);

  const [topics, setTopics] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [mpToast, setMpToast] = useState(false);
  const [theme, setTheme] = useState(loadBindoTheme);
  const pal = PALETTES[theme.gender][theme.palette];

  function handleMultiplayerTap() {
    setMpToast(true);
    setTimeout(() => setMpToast(false), 1800);
  }

  function setGender(gender) {
    if (theme.gender === gender) return;
    const next = { gender, palette: 0 };
    setTheme(next);
    saveBindoTheme(next);
  }

  function setPalette(i) {
    const next = { ...theme, palette: i };
    setTheme(next);
    saveBindoTheme(next);
  }

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
          <div style={{ position: "relative", height: 210, background: pal.sky, overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 22, left: 26, width: 56, height: 56, borderRadius: "50%", background: pal.accent2, boxShadow: `0 0 30px ${pal.accent2}` }} />
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
            <div style={{ position: "absolute", bottom: -30, left: -20, width: 220, height: 120, borderRadius: "50%", background: pal.accent3, opacity: 0.3 }} />
            <div style={{ position: "absolute", bottom: -46, right: -40, width: 260, height: 140, borderRadius: "50%", background: pal.brand, opacity: 0.18 }} />

            <button
              onClick={() => setChatOpen(true)}
              aria-label="Ngobrol sama Kiko"
              style={{
                position: "absolute",
                bottom: 14,
                width: 104,
                height: 118,
                border: "none",
                background: "none",
                padding: 0,
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
                animation: "jkBindoKikoWalk 14s ease-in-out infinite, jkBindoKikoDance 0.9s ease-in-out infinite",
                filter: "drop-shadow(0 6px 8px rgba(60,40,20,.22))",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  bottom: "88%",
                  right: 4,
                  background: "#fff",
                  padding: "6px 12px",
                  borderRadius: "14px 14px 4px 14px",
                  fontFamily: "var(--font-body)",
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  color: INK,
                  boxShadow: "0 3px 8px rgba(0,0,0,.10)",
                  whiteSpace: "nowrap",
                  animation: "jkBindoBubbleCycle 7s ease-in-out infinite",
                }}
              >
                Kiko disini
              </span>
              <Kiko size={104} />
            </button>
          </div>

          {/* ---- Body (port dari .home-body / .title-ribbon / .stat-strip / .info-card) ---- */}
          <div style={{ padding: "0 22px 20px", marginTop: -6, position: "relative", zIndex: 3 }}>
            <div
              style={{
                background: pal.brand,
                borderRadius: 16,
                padding: "14px 10px 10px",
                boxShadow: `0 6px 0 ${pal.brandDark}, 0 10px 20px rgba(0,0,0,.15)`,
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

            <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
              <button
                onClick={() => navigate(`/kelas/${grade}/bindo/bab`)}
                style={{
                  border: "none",
                  cursor: "pointer",
                  borderRadius: 20,
                  padding: "20px 12px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  background: pal.accent3,
                  boxShadow: `0 8px 0 ${pal.accent3Dark}`,
                }}
              >
                <span style={{ width: 50, height: 50, borderRadius: "50%", background: "rgba(255,255,255,.28)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                  📖
                </span>
                <span style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "1rem", color: "#fff" }}>Solo Adventure</span>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, textAlign: "center", color: "rgba(255,255,255,.92)" }}>Main sendiri</span>
              </button>
              <button
                onClick={handleMultiplayerTap}
                style={{
                  border: "none",
                  cursor: "pointer",
                  borderRadius: 20,
                  padding: "20px 12px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  background: pal.accent1,
                  boxShadow: `0 8px 0 ${pal.accent1Dark}`,
                }}
              >
                <span style={{ width: 50, height: 50, borderRadius: "50%", background: "rgba(255,255,255,.28)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                  🤝
                </span>
                <span style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "1rem", color: INK }}>Multiplayer</span>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, textAlign: "center", color: "#5a4a30" }}>Lawan teman</span>
              </button>
              {mpToast && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "calc(100% + 8px)",
                    right: 0,
                    background: INK,
                    color: "#fff",
                    padding: "6px 12px",
                    borderRadius: 12,
                    fontFamily: "var(--font-body)",
                    fontWeight: 700,
                    fontSize: "0.72rem",
                    whiteSpace: "nowrap",
                    boxShadow: "0 4px 10px rgba(0,0,0,.18)",
                  }}
                >
                  Mode ini segera hadir! 🚧
                </div>
              )}
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
              <div style={{ flex: "none", width: 42, height: 42, borderRadius: 12, background: pal.accent1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                💡
              </div>
              <div>
                <div style={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.04em", color: pal.brand, textTransform: "uppercase", marginBottom: 2 }}>
                  Kata Hari Ini
                </div>
                <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "0.95rem", color: INK }}>
                  {wordOfDay.word} <span style={{ fontSize: "0.75rem", fontWeight: 700, color: INK_SOFT }}>— {wordOfDay.meaning}</span>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 10, background: PAPER, border: `2px solid ${CARD_BORDER}`, borderRadius: 18, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: "none", width: 42, height: 42, borderRadius: 12, background: pal.accent3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                🌊
              </div>
              <div>
                <div style={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.04em", color: pal.brand, textTransform: "uppercase", marginBottom: 2 }}>
                  Fakta Menarik
                </div>
                <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "0.82rem", color: INK, lineHeight: 1.3 }}>{funFact}</div>
              </div>
            </div>

            <div style={{ marginTop: 13, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 3, background: "#ffffffd0", padding: 3, borderRadius: 999, boxShadow: "0 4px 14px rgba(0,0,0,.08)", width: "fit-content" }}>
                {[
                  { key: "boy", label: "Boys", dot: "#2F6FED" },
                  { key: "girl", label: "Girls", dot: "#FF6F91" },
                ].map((g) => {
                  const active = theme.gender === g.key;
                  return (
                    <button
                      key={g.key}
                      onClick={() => setGender(g.key)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        border: "none",
                        cursor: "pointer",
                        padding: "5px 10px",
                        borderRadius: 999,
                        fontFamily: "var(--font-body)",
                        fontWeight: 700,
                        fontSize: "0.68rem",
                        background: active ? g.dot : "transparent",
                        color: active ? "#fff" : "#7a6f63",
                      }}
                    >
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: g.dot, display: "inline-block" }} />
                      {g.label}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                {SWATCH_COLORS[theme.gender].map((colors, i) => (
                  <button
                    key={i}
                    onClick={() => setPalette(i)}
                    aria-label={PALETTES[theme.gender][i].name}
                    title={PALETTES[theme.gender][i].name}
                    style={{
                      border: `2px solid ${theme.palette === i ? pal.brand : "transparent"}`,
                      cursor: "pointer",
                      background: "#fff",
                      padding: 4,
                      borderRadius: 12,
                      boxShadow: "0 2px 6px rgba(0,0,0,.08)",
                    }}
                  >
                    <div style={{ display: "flex", width: 38, height: 20, borderRadius: 8, overflow: "hidden" }}>
                      {colors.map((c, j) => (
                        <span key={j} style={{ flex: 1, background: c }} />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <KikoChatPanel open={chatOpen} onClose={() => setChatOpen(false)} mode="general" resetKey={`bindo-map-${grade}`} />

      <style>{`
        @keyframes jkBindoTwinkle { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.9; } }
        @keyframes jkBindoKikoWalk {
          0%   { left: 4%; }
          25%  { left: 62%; }
          50%  { left: 68%; }
          75%  { left: 20%; }
          100% { left: 4%; }
        }
        @keyframes jkBindoKikoDance {
          0%, 100% { transform: translateY(0) rotate(-4deg); }
          50%      { transform: translateY(-12px) rotate(4deg); }
        }
        @keyframes jkBindoBubbleCycle {
          0%   { opacity: 0; }
          2%   { opacity: 1; }
          28%  { opacity: 1; }
          32%  { opacity: 0; }
          100% { opacity: 0; }
        }
      `}</style>
    </Shell>
  );
}
