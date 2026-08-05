import { useNavigate } from "react-router-dom";
import Shell, { ScreenHeader } from "../components/Shell";
import { GRADES } from "../data/content";
import WanderingDino from "../components/WanderingDino";

export default function PickGrade() {
  const navigate = useNavigate();
  return (
    <Shell>
      <ScreenHeader onBack={() => navigate("/")} title="Pilih Kelas Kamu!" />
      <WanderingDino onTap={() => { window.location.href = "/dinorace/index.html"; }} />
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
