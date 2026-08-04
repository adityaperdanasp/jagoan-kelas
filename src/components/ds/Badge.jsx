const PASTELS = {
  pink: { bg: "var(--pastel-pink)", ink: "var(--ink-on-pink)" },
  green: { bg: "var(--pastel-green)", ink: "var(--ink-on-green)" },
  blue: { bg: "var(--pastel-blue)", ink: "var(--ink-on-blue)" },
  gold: { bg: "var(--pastel-gold)", ink: "var(--ink-900)" },
  purple: { bg: "var(--pastel-purple)", ink: "var(--ink-on-purple)" },
  magenta: { bg: "var(--pastel-magenta)", ink: "var(--ink-on-pink)" },
};

export function Badge({ color = "gold", rotate = -2, icon, children }) {
  const c = PASTELS[color] || PASTELS.gold;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-display)",
        fontWeight: "var(--weight-heavy)",
        fontSize: "1.1rem",
        background: c.bg,
        color: c.ink,
        padding: "8px 20px 8px 12px",
        borderRadius: "var(--radius-pill)",
        transform: `rotate(${rotate}deg)`,
        boxShadow: "var(--shadow-sticker-sm)",
      }}
    >
      {icon ? <span style={{ fontSize: "1.4rem" }} aria-hidden="true">{icon}</span> : null}
      {children}
    </span>
  );
}

export function Chip({ color = "blue", children, selected }) {
  const c = PASTELS[color] || PASTELS.blue;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontFamily: "var(--font-body)",
        fontWeight: "var(--weight-bold)",
        fontSize: "var(--text-caption)",
        padding: "5px 12px",
        borderRadius: "var(--radius-pill)",
        whiteSpace: "nowrap",
        background: selected ? c.bg : `color-mix(in srgb, ${c.bg} 45%, white)`,
        color: c.ink,
        boxShadow: selected ? "inset 0 0 0 2px " + c.ink : "none",
      }}
    >
      {children}
    </span>
  );
}
