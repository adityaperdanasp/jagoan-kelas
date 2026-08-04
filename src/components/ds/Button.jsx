import { useState } from "react";

const VARIANTS = {
  primary: { bg: "var(--pastel-green)", ink: "var(--ink-900)", shadow: "0 4px 0 rgba(0,0,0,0.12)" },
  cta: { bg: "var(--cream-200)", ink: "var(--ink-900)", shadow: "var(--shadow-sticker-md)" },
  secondary: { bg: "var(--surface-card-alt)", ink: "var(--ink-900)", shadow: "var(--shadow-sticker-sm)", border: "2px solid var(--cream-300)" },
  ghost: { bg: "transparent", ink: "var(--ink-700)", shadow: "none" },
};
const SIZES = {
  sm: { padding: "9px 16px", font: "700 0.85rem" },
  md: { padding: "13px 20px", font: "800 1rem" },
  lg: { padding: "15px 24px", font: "800 1.05rem" },
};

export default function Button({ variant = "primary", size = "md", disabled, icon, children, onClick, style }) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.md;
  const [pressed, setPressed] = useState(false);
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        border: v.border || "none",
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "var(--font-display)",
        font: s.font + ' "Baloo 2", sans-serif',
        color: v.ink,
        background: v.bg,
        padding: s.padding,
        borderRadius: "var(--radius-lg)",
        boxShadow: disabled ? "none" : v.shadow,
        opacity: disabled ? 0.5 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        transform: pressed && !disabled ? "translateY(2px)" : "translateY(0)",
        transition: "transform var(--duration-press) ease, box-shadow var(--duration-press) ease",
        WebkitTapHighlightColor: "transparent",
        ...style,
      }}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </button>
  );
}
