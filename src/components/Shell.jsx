export default function Shell({ children }) {
  return (
    <main
      style={{
        maxWidth: 430,
        margin: "0 auto",
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        padding: "28px 16px",
      }}
    >
      <div
        style={{
          width: "100%",
          background: "var(--surface-card)",
          borderRadius: "var(--radius-3xl)",
          boxShadow: "var(--shadow-card)",
          position: "relative",
          overflow: "hidden",
          minHeight: 700,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </div>
    </main>
  );
}

export function ScreenHeader({ onBack, title, subtitle, leading }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "22px 18px 0" }}>
      <button
        onClick={onBack}
        aria-label="Kembali"
        style={{
          border: "none",
          background: "none",
          cursor: "pointer",
          fontSize: "1.2rem",
          padding: 4,
          lineHeight: 1,
          color: "var(--ink-900)",
        }}
      >
        ←
      </button>
      {leading}
      <div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.05rem", color: "var(--ink-900)" }}>
          {title}
        </div>
        {subtitle ? (
          <div style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--ink-500)" }}>
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}
