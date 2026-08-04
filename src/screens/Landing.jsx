import { useNavigate } from "react-router-dom";
import Shell from "../components/Shell";
import Avatar from "../components/ds/Avatar";
import Button from "../components/ds/Button";
import ProgressXP from "../components/ds/ProgressXP";
import { Badge } from "../components/ds/Badge";

const PLAYER_NAME = "Azka";
const PLAYER_XP = 240;

export default function Landing() {
  const navigate = useNavigate();
  return (
    <Shell>
      <div style={{ padding: "22px 18px", display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar name={PLAYER_NAME} size={36} />
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", color: "var(--ink-900)" }}>
                Hai, {PLAYER_NAME}!
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: "0.7rem", color: "var(--ink-500)" }}>
                Siap belajar hari ini?
              </div>
            </div>
          </div>
          <ProgressXP xp={PLAYER_XP} maxStars={0} />
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
