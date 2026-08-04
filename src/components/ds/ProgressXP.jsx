export default function ProgressXP({ xp, stars = 0, maxStars = 3 }) {
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      {maxStars ? (
        <div style={{ display: "flex", gap: 2, fontSize: 22 }}>
          {Array.from({ length: maxStars }).map((_, i) => (
            <span key={i} style={{ opacity: i < stars ? 1 : 0.25 }}>⭐</span>
          ))}
        </div>
      ) : null}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--font-body)",
          fontWeight: "var(--weight-bold)",
          fontSize: "0.8rem",
          color: "var(--ink-500)",
          background: "var(--cream-100)",
          padding: "6px 14px",
          borderRadius: "var(--radius-pill)",
        }}
      >
        ✨ {xp} XP
      </span>
    </div>
  );
}
