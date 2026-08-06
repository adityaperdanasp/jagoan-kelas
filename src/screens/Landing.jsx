import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Shell from "../components/Shell";
import Avatar from "../components/ds/Avatar";
import Button from "../components/ds/Button";
import ProgressXP from "../components/ds/ProgressXP";
import { Badge } from "../components/ds/Badge";
import OverlayCard from "../components/ds/OverlayCard";
import Kiko from "../components/ds/Kiko";
import WanderingKiko from "../components/WanderingKiko";
import { GRADES } from "../data/content";
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

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center", padding: "10px 0 6px" }}>
          <div
            onClick={handleSecretTap}
            style={{
              width: 150,
              height: 112,
              borderRadius: 18,
              background: "var(--pastel-gold)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              overflow: "hidden",
            }}
          >
            <Kiko size={92} />
          </div>
          <Badge color="gold" rotate={-3}>Jagoan Kelas</Badge>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 4px 0" }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.95rem", color: "var(--ink-900)" }}>
            Pilih Kelas Kamu!
          </div>
          <button
            onClick={() => {
              window.location.href = "/dinorace/index.html";
            }}
            aria-label="Main DinoRace"
            style={{
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
        </div>
        <WanderingKiko />

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "8px 18px 10px" }}>
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
