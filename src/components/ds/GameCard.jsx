import { useState } from "react";

const ACCENTS = {
  math: { bg: "var(--product-math)", ink: "var(--product-math-ink)", inkSoft: "var(--ink-on-blue-soft)" },
  lang: { bg: "var(--product-lang)", ink: "var(--product-lang-ink)", inkSoft: "var(--ink-on-pink-soft)" },
  science: { bg: "var(--product-science)", ink: "var(--product-science-ink)", inkSoft: "var(--ink-on-green-soft)" },
  town: { bg: "var(--product-town)", ink: "var(--product-town-ink)", inkSoft: "var(--ink-on-tan-soft)" },
  focus: { bg: "var(--product-focus)", ink: "var(--product-focus-ink)", inkSoft: "var(--ink-on-purple-soft)" },
  wood: { bg: "var(--product-wood)", ink: "var(--product-wood-ink)", inkSoft: "var(--ink-on-wood-soft)" },
  mint: { bg: "var(--product-mint)", ink: "var(--product-mint-ink)", inkSoft: "var(--product-mint-ink)" },
};

export default function GameCard({ accent = "math", icon, title, subtitle, rotate, onClick, href }) {
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
        transform: `translateY(${hover ? -2 : 0}px) scale(${hover ? 1.01 : 1}) rotate(${rotate ?? 0}deg)`,
        transition: "transform 0.15s ease",
        WebkitTapHighlightColor: "transparent",
      }}
    >
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
        }}
      >
        {icon}
      </span>
      <span>
        <span style={{ display: "block", fontFamily: "var(--font-display)", fontWeight: "var(--weight-bold)", fontSize: "1.06rem", color: c.ink }}>
          {title}
        </span>
        <span style={{ display: "block", fontFamily: "var(--font-body)", fontSize: "0.81rem", color: c.inkSoft }}>
          {subtitle}
        </span>
      </span>
    </Tag>
  );
}
