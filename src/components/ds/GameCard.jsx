import { useState } from "react";

const ACCENTS = {
  math: { bg: "var(--product-math)", ink: "var(--product-math-ink)", inkSoft: "var(--ink-on-blue-soft)" },
  lang: { bg: "var(--product-lang)", ink: "var(--product-lang-ink)", inkSoft: "var(--ink-on-pink-soft)" },
  science: { bg: "var(--product-science)", ink: "var(--product-science-ink)", inkSoft: "var(--ink-on-green-soft)" },
  town: { bg: "var(--product-town)", ink: "var(--product-town-ink)", inkSoft: "var(--ink-on-tan-soft)" },
  focus: { bg: "var(--product-focus)", ink: "var(--product-focus-ink)", inkSoft: "var(--ink-on-purple-soft)" },
  wood: { bg: "var(--product-wood)", ink: "var(--product-wood-ink)", inkSoft: "var(--ink-on-wood-soft)" },
  mint: { bg: "var(--product-mint)", ink: "var(--product-mint-ink)", inkSoft: "var(--product-mint-ink)" },
  race: { bg: "var(--product-race)", ink: "var(--product-race-ink)", inkSoft: "var(--ink-on-pink-soft)" },
};

// Watermark ikon di ruang kosong kanan card + entrance stagger pas halaman
// dibuka (2026-08-11) -- request user: tiru "vibe" video promo (Pomelli AI
// ad) yang nunjukin ikon translucent gede + card muncul bertahap, TAPI versi
// kita numpang ikon subject yang UDAH ADA (`SubjectIcons.jsx`, gradient+
// shadow), bukan blob generic random kayak videonya (yang gak nyambung ke
// subjeknya -- PAI dapet ikon gembok, dst). Watermark di-`brightness(0)
// invert(1)` jadi silhouette putih rata -- pola yang SAMA kayak "highlight
// glossy putih transparan" yang udah dipake di dalem tiap SubjectIcons SVG
// sendiri (lihat komentar di file itu), jadi konsisten sama bahasa visual
// yang udah ada, bukan gaya baru.
const WATERMARK_KEYFRAMES = `
@keyframes jkCardWatermarkBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes jkCardEnter { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
`;

export default function GameCard({ accent = "math", icon, title, subtitle, rotate, onClick, href, watermark, entranceDelay }) {
  const c = ACCENTS[accent] || ACCENTS.math;
  const [hover, setHover] = useState(false);
  const Tag = href ? "a" : "button";
  return (
    <Tag
      href={href}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        textDecoration: "none",
        border: "none",
        textAlign: "left",
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 14,
        cursor: "pointer",
        borderRadius: "var(--radius-xl)",
        padding: 16,
        background: c.bg,
        position: "relative",
        overflow: "hidden",
        transform: `translateY(${hover ? -2 : 0}px) scale(${hover ? 1.01 : 1}) rotate(${rotate ?? 0}deg)`,
        transition: "transform 0.15s ease",
        WebkitTapHighlightColor: "transparent",
        ...(entranceDelay != null && {
          animation: "jkCardEnter 0.35s ease-out backwards",
          animationDelay: `${entranceDelay}ms`,
        }),
      }}
    >
      {watermark && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            right: -14,
            top: "50%",
            width: 92,
            height: 92,
            marginTop: -46,
            opacity: 0.16,
            filter: "brightness(0) invert(1)",
            animation: "jkCardWatermarkBob 6.5s ease-in-out infinite",
            pointerEvents: "none",
          }}
        >
          {watermark}
        </span>
      )}
      <span
        style={{
          width: 52,
          height: 52,
          borderRadius: "var(--radius-lg)",
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "none",
          fontSize: 26,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {icon}
      </span>
      <span style={{ position: "relative" }}>
        <span style={{ display: "block", fontFamily: "var(--font-display)", fontWeight: "var(--weight-bold)", fontSize: "1.06rem", color: c.ink }}>
          {title}
        </span>
        <span style={{ display: "block", fontFamily: "var(--font-body)", fontSize: "0.81rem", color: c.inkSoft }}>
          {subtitle}
        </span>
      </span>
      <style>{WATERMARK_KEYFRAMES}</style>
    </Tag>
  );
}
