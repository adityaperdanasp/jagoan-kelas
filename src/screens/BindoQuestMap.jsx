import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Shell, { ScreenHeader } from "../components/Shell";
import BoBridgeBanner from "../components/BoBridgeBanner";
import { loadRawTopics } from "../data/contentLoader";
import { getSubjectProgress, computeStatuses } from "../data/progressService";
import { usePlayer } from "../data/PlayerContext";

// "Jejak Ceritamu" -- daftar bab Bahasa Indonesia, LAYAR TERPISAH dari
// BindoStorybookTrail.jsx (2026-08-08, dipecah dari 1 halaman panjang
// yang di-scroll -- user eksplisit minta "samain aja ama al idrisi":
// azkacraft PUNYA 2 layar beda (Landing vs Quest Map), tap "Solo
// Adventure" pindah LAYAR, bukan scroll di tempat kayak versi sebelumnya
// yang dianggap "jelek"). Entry point: tombol "Solo Adventure" di
// BindoStorybookTrail.jsx. Balik = ke situ lagi.
const BRAND = "#2F6FED";
const BRAND_DARK = "#1E56C4";
const ACCENT_3 = "#22B573";
const CARD_BORDER = "#F1E6D2";
const PAPER = "#FFFBF2";
const INK = "#4a3520";

const TOPIC_STYLE = [
  { icon: "✏️", color: "#FF9F40", colorDark: "#E08428" },
  { icon: "🔤", color: "#FF6F91", colorDark: "#E8547A" },
  { icon: "📐", color: BRAND, colorDark: BRAND_DARK },
  { icon: "🌊", color: ACCENT_3, colorDark: "#158A54" },
  { icon: "🎨", color: "#9B59FF", colorDark: "#7E3EDB" },
];
const CHAPTER_DECO = ["⭐", "✨", "🍃", "🌟", "🎈", "📎", "💫"];

export default function BindoQuestMap() {
  const { grade } = useParams();
  const navigate = useNavigate();
  const { player } = usePlayer();

  const [topics, setTopics] = useState(null);
  const [loadError, setLoadError] = useState(false);

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

  return (
    <Shell>
      <ScreenHeader onBack={() => navigate(`/kelas/${grade}/bindo`)} title="Jejak Ceritamu" subtitle={`Kelas ${grade}`} />

      {loadError && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", color: "var(--ink-400)" }}>
          Gagal muat bab. Coba cek koneksi internet kamu, ya!
        </div>
      )}

      {!loadError && !topics && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-400)" }}>Menyiapin bab...</div>
      )}

      {!loadError && topics && (
        <div style={{ flex: 1, overflowY: "auto", background: PAPER, padding: "8px 18px 30px" }}>
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
      )}
    </Shell>
  );
}
