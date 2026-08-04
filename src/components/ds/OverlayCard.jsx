export default function OverlayCard({ open, onClose, children, maxWidth = 340 }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(59,42,26,.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth,
          background: "var(--cream-50)",
          borderRadius: "var(--radius-2xl)",
          padding: "24px 20px",
          textAlign: "center",
          boxShadow: "var(--shadow-overlay)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
