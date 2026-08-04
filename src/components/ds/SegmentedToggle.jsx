export default function SegmentedToggle({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, background: "var(--cream-300)", padding: 5, borderRadius: "var(--radius-lg)" }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1,
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-display)",
              fontWeight: "var(--weight-bold)",
              fontSize: "0.92rem",
              color: active ? "var(--ink-900)" : "var(--ink-400)",
              background: active ? "#fff" : "none",
              boxShadow: active ? "var(--shadow-sticker-sm)" : "none",
              padding: "10px 0",
              borderRadius: "var(--radius-md)",
              transition: "transform 0.15s ease",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
