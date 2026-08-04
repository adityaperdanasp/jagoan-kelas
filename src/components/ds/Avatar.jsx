const PALETTE = ["#F6C1C1", "#C1E1C1", "#C1D4F6", "#F6E3B4", "#D9C1F6", "#F6C1E0", "#C1F0E8"];

function hashColor(seed) {
  let hash = 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export default function Avatar({ name = "", size = 36, seed }) {
  const bg = hashColor(seed ?? name);
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-display)",
        fontWeight: "var(--weight-bold)",
        fontSize: size * 0.4,
        color: "var(--ink-900)",
        flexShrink: 0,
      }}
    >
      {name ? name[0].toUpperCase() : "?"}
    </span>
  );
}
