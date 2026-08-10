import { useT } from "../data/translations";

// Full-bleed (2026-08-10, request user "kok kaya ada card besar sendiri...
// samain kayak playalidrisi... layar full ga ada lagi card besarnya") --
// SEBELUMNYA `<main>` dikasih padding 28px/16px + card dalem dikasih
// border-radius 32px + shadow gede, jadi keliatan kayak card ngambang di
// atas background gradient body. Al-idrisi punya pola yang MIRIP struktur
// (`#app { max-width:480px; margin:0 auto; min-height:100vh; ...}`,
// mathville/style.css) TAPI TANPA padding luar/border-radius/shadow gede
// -- di layar HP asli (viewport < 480px) itu artinya app-nya ngisi
// PERSIS tepi-ke-tepi, gak ada gutter buat shadow "ngambang" muncul.
// Shadow lembut (`0 0 40px`, port persis nilai al-idrisi) cuma keliatan
// kalau browser LEBIH LEBAR dari 480px (preview desktop doang) -- itu
// disengaja sama sumber aslinya juga, bukan approximation.
export default function Shell({ children }) {
  return (
    <main
      style={{
        maxWidth: 480,
        margin: "0 auto",
        minHeight: "100vh",
        background: "var(--surface-card)",
        boxShadow: "0 0 40px rgba(0,0,0,0.08)",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </main>
  );
}

export function ScreenHeader({ onBack, title, subtitle, leading }) {
  const { t } = useT();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "22px 18px 0" }}>
      <button
        onClick={onBack}
        aria-label={t("common", "back")}
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
