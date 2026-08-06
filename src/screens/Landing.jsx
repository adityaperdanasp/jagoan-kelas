import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Shell from "../components/Shell";
import Avatar from "../components/ds/Avatar";
import Button from "../components/ds/Button";
import ProgressXP from "../components/ds/ProgressXP";
import { Badge } from "../components/ds/Badge";
import OverlayCard from "../components/ds/OverlayCard";
import Kiko from "../components/ds/Kiko";
import RoamingCarDino from "../components/RoamingCarDino";
import { usePlayer } from "../data/PlayerContext";
import { useSecretTap } from "../games/dinorace/useSecretTap";
import { getPlayerDoc, markParentMessageRead } from "../data/authService";
import { TRACK_HUB, useBgmTrack, isBgmMuted, setBgmMuted } from "../data/bgm";

export default function Landing() {
  const navigate = useNavigate();
  const { player, logout } = usePlayer();
  const [parentMessage, setParentMessage] = useState(null);
  const [muted, setMuted] = useState(isBgmMuted);
  useBgmTrack(TRACK_HUB);

  function toggleMute() {
    const next = !muted;
    setBgmMuted(next);
    setMuted(next);
  }

  useEffect(() => {
    let cancelled = false;
    getPlayerDoc(player.id).then((fresh) => {
      if (!cancelled && fresh?.parentMessage && !fresh.parentMessage.read) {
        setParentMessage(fresh.parentMessage);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismissMessage() {
    setParentMessage(null);
    markParentMessageRead(player.id).catch(() => {});
  }

  function handleLogout() {
    logout();
    navigate("/masuk");
  }

  const handleSecretTap = useSecretTap(() => navigate("/rahasia/dinorace"));

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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ProgressXP xp={player.xp ?? 0} maxStars={0} />
            <button
              onClick={toggleMute}
              aria-label={muted ? "Nyalain musik" : "Matiin musik"}
              style={{
                border: "none",
                background: "var(--cream-200)",
                borderRadius: "50%",
                width: 28,
                height: 28,
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {muted ? "🔇" : "🔊"}
            </button>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, textAlign: "center" }}>
          <div
            onClick={handleSecretTap}
            style={{
              width: 220,
              height: 160,
              borderRadius: 20,
              background: "var(--pastel-gold)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              overflow: "hidden",
            }}
          >
            <Kiko size={140} />
          </div>
          <Badge color="gold" rotate={-3}>Jagoan Kelas</Badge>
          <div style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", color: "var(--ink-700)", maxWidth: 220 }}>
            Pilih kelas kamu, terus pilih pelajaran buat mulai main &amp; belajar!
          </div>
          <RoamingCarDino />
        </div>

        <Button variant="primary" size="lg" style={{ width: "100%", justifyContent: "center" }} onClick={() => navigate("/kelas")}>
          Ayo Main! 🚀
        </Button>
        <Button variant="secondary" size="md" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} onClick={() => navigate("/fokus")}>
          🎯 Fokus Latihan
        </Button>

        <Link
          to="/parents"
          style={{
            display: "block",
            textAlign: "center",
            fontFamily: "var(--font-body)",
            fontSize: "0.72rem",
            fontWeight: 700,
            color: "var(--ink-300)",
            textDecoration: "none",
            marginTop: 14,
          }}
        >
          Untuk orang tua →
        </Link>
      </div>

      <OverlayCard open={!!parentMessage} onClose={dismissMessage}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>💌</div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", color: "var(--ink-900)", marginBottom: 10 }}>
          Pesan dari orang tua kamu
        </div>
        <div style={{ fontFamily: "var(--font-body)", color: "var(--ink-700)", marginBottom: 18 }}>
          "{parentMessage?.text}"
        </div>
        <Button variant="primary" style={{ width: "100%" }} onClick={dismissMessage}>
          Makasih! 😊
        </Button>
      </OverlayCard>
    </Shell>
  );
}
