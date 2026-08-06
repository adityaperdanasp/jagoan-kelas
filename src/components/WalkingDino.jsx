// Dino kecil jalan dari kiri ke kanan layar terus-terusan (loop, BUKAN
// patroli bolak-balik kayak WanderingKiko/WanderingDino lama) -- di bawah
// grid pilih kelas di Landing.jsx. Tap = langsung ke DinoRace. Gantiin
// WanderingKiko (dihapus, murni dekoratif doang, gak ada tap-target) DAN
// tombol pill "🦕 DinoRace" (dihapus, terlalu nonjol/berlabel) -- versi
// ini "easter egg santai" (keliatan tapi gak dilabelin eksplisit), beda
// dari secret-tap-sequence di Kiko hero yang emang sengaja sembunyi total
// (2026-08-06, feedback user, mirip pola roam-dino di landing al-idrisi).
export default function WalkingDino() {
  return (
    <div style={{ position: "relative", height: 40, margin: "2px 0 4px", overflow: "visible" }}>
      <button
        onClick={() => {
          window.location.href = "/dinorace/index.html";
        }}
        aria-label="Main DinoRace"
        style={{
          position: "absolute",
          top: 0,
          border: "none",
          background: "none",
          cursor: "pointer",
          fontSize: "1.6rem",
          lineHeight: 1,
          padding: 0,
          WebkitTapHighlightColor: "transparent",
          animation: "jkDinoWalkAcross 7s linear infinite, jkDinoWalkBounce 0.4s ease-in-out infinite",
          filter: "drop-shadow(0 3px 3px rgba(0,0,0,0.15))",
          transform: "scaleX(-1)",
        }}
      >
        🦕
      </button>
      <style>{`
        @keyframes jkDinoWalkAcross {
          from { left: -12%; }
          to { left: 112%; }
        }
        @keyframes jkDinoWalkBounce {
          0%, 100% { margin-top: 0px; }
          50% { margin-top: -4px; }
        }
      `}</style>
    </div>
  );
}
