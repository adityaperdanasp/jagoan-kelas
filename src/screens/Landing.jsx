import { useNavigate } from "react-router-dom";
import Shell from "../components/Shell";
import Avatar from "../components/ds/Avatar";
import Button from "../components/ds/Button";
import ProgressXP from "../components/ds/ProgressXP";
import { Badge } from "../components/ds/Badge";
import { usePlayer } from "../data/PlayerContext";

export default function Landing() {
  const navigate = useNavigate();
  const { player, logout } = usePlayer();

  function handleLogout() {
    logout();
    navigate("/masuk");
  }

  return (
    <Shell>
      <div style={{ padding: "22px 18px", display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar name={player.name} size={36} />
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", color: "var(--ink-900)" }}>
                Hai, {player.name}!
              </div>
              <button
                onClick={handleLogout}
                style={{
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  padding: 0,
                  fontFamily: "var(--font-body)",
                  fontSize: "0.7rem",
                  color: "var(--ink-400)",
                  textDecoration: "underline",
                }}
              >
                Keluar
              </button>
            </div>
          </div>
          <ProgressXP xp={player.xp ?? 0} maxStars={0} />
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, textAlign: "center" }}>
          <div
            style={{
              width: 220,
              height: 160,
              borderRadius: 20,
              background: "var(--pastel-gold)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 56,
            }}
          >
            🎒✨
          </div>
          <Badge color="gold" rotate={-3}>Jagoan Kelas</Badge>
          <div style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", color: "var(--ink-700)", maxWidth: 220 }}>
            Pilih kelas kamu, terus pilih pelajaran buat mulai main &amp; belajar!
          </div>
        </div>

        <Button variant="primary" size="lg" style={{ width: "100%", justifyContent: "center" }} onClick={() => navigate("/kelas")}>
          Ayo Main! 🚀
        </Button>
      </div>
    </Shell>
  );
}
