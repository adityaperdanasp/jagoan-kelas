import { useNavigate } from "react-router-dom";
import Shell, { ScreenHeader } from "../components/Shell";
import { GRADES } from "../data/content";
import WanderingKiko from "../components/WanderingKiko";

export default function PickGrade() {
  const navigate = useNavigate();
  return (
    <Shell>
      <ScreenHeader onBack={() => navigate("/")} title="Pilih Kelas Kamu!" />
      <button
        onClick={() => { window.location.href = "/dinorace/index.html"; }}
        aria-label="Main DinoRace"
        style={{
          position: "absolute",
          top: 22,
          right: 18,
          border: "none",
          cursor: "pointer",
          background: "var(--pastel-purple)",
          borderRadius: "var(--radius-pill)",
          padding: "6px 12px",
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontFamily: "var(--font-body)",
          fontWeight: 700,
          fontSize: "0.72rem",
          color: "var(--ink-on-purple)",
          boxShadow: "var(--shadow-sticker-sm)",
        }}
      >
        🦕 DinoRace
      </button>
      <WanderingKiko />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
          padding: "18px 18px 22px",
          overflowY: "auto",
        }}
      >
        {GRADES.map((g) => (
          <div
            key={g.n}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              transform: `translateX(${g.offset}px)`,
            }}
          >
            <button
              onClick={() => navigate(`/kelas/${g.n}`)}
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                border: "none",
                cursor: "pointer",
                background: g.bg,
                boxShadow: "var(--shadow-sticker-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "1.5rem",
                color: g.ink,
                transition: "transform var(--duration-press) ease",
              }}
              onPointerDown={(e) => (e.currentTarget.style.transform = "translateY(2px)")}
              onPointerUp={(e) => (e.currentTarget.style.transform = "translateY(0)")}
              onPointerLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              {g.n}
            </button>
            <span style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "0.72rem", color: "var(--ink-500)" }}>
              Kelas {g.n}
            </span>
          </div>
        ))}
      </div>
    </Shell>
  );
}
