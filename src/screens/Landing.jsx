import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Shell from "../components/Shell";
import Avatar from "../components/ds/Avatar";
import Button from "../components/ds/Button";
import ProgressXP from "../components/ds/ProgressXP";
import OverlayCard from "../components/ds/OverlayCard";
import Kiko from "../components/ds/Kiko";
import WalkingDino from "../components/WalkingDino";
import LandingDecor from "../components/LandingDecor";
import KikoGreeting from "../components/KikoGreeting";
import { KikoChatPanel } from "../games/quiz/KikoTutorChat";
import { GRADES } from "../data/content";
import { usePlayer } from "../data/PlayerContext";
import { useSecretTap } from "../games/dinorace/useSecretTap";
import { getPlayerDoc, markParentMessageRead } from "../data/authService";
import { TRACK_HUB, useBgmTrack, isBgmMuted, setBgmMuted } from "../data/bgm";

// Palet "pastel lucu" (2026-08-06, revamp Landing -- lihat CLAUDE.md buat
// histori 3 mockup A/B/C yang direview user sebelum ini) -- BUKAN token
// --pastel-* biasa (itu terlalu pucat, keluhan awal user "warna terlalu
// pale") DAN BUKAN token --ink-on-* dari mockup awal (itu kebalikannya,
// kegelapan/kurang "lucu"). Ini tier warna baru di tengah-tengah: cukup
// saturated buat nge-pop kayak card game (mirip Duolingo/Kahoot), tapi
// tetep ringan/ceria bukan gelap. Dipakai SEBAGAI BACKGROUND kartu kelas
// (teks putih di atasnya, kontras cukup karena udah lumayan saturated).
// Kelas 3 (index 2) & 6 (index 5) awalnya "#6FCF7C"/"#F06BA8" -- kena
// feedback user "terlalu gonjreng", diganti versi lebih desaturated/muted
// (sage green & dusty rose) biar "pastel gemes", bukan neon.
const GRADE_CARD_COLORS = ["#FF8FA8", "#5AB4E8", "#8FCB9B", "#FFC93D", "#B48CF0", "#E888B4"];

export default function Landing() {
  const navigate = useNavigate();
  const { player, logout } = usePlayer();
  const [parentMessage, setParentMessage] = useState(null);
  const [muted, setMuted] = useState(isBgmMuted);
  const [chatOpen, setChatOpen] = useState(false);
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
      <LandingDecor />
      <div style={{ padding: "22px 18px", display: "flex", flexDirection: "column", flex: 1, position: "relative", zIndex: 1 }}>
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

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0 4px" }}>
          <button
            onClick={() => setChatOpen(true)}
            aria-label="Ngobrol sama Kiko"
            style={{
              position: "relative",
              border: "none",
              background: "none",
              padding: 0,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              animation: "jkKikoWiggle 2.6s ease-in-out infinite",
              filter: "drop-shadow(0 10px 14px rgba(60,40,20,.28))",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: -6,
                right: -34,
                background: "color-mix(in srgb, var(--pastel-purple) 35%, white)",
                borderRadius: 12,
                padding: "5px 10px",
                fontFamily: "var(--font-body)",
                fontWeight: 800,
                fontSize: "0.62rem",
                color: "var(--ink-900)",
                whiteSpace: "nowrap",
                boxShadow: "var(--shadow-sticker-sm)",
                transform: "rotate(4deg)",
              }}
            >
              Kiko disini
              <span
                style={{
                  position: "absolute",
                  left: 14,
                  bottom: -5,
                  width: 10,
                  height: 10,
                  background: "color-mix(in srgb, var(--pastel-purple) 35%, white)",
                  transform: "rotate(45deg)",
                }}
              />
            </div>
            <Kiko size={112} />
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                right: -2,
                bottom: 8,
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "var(--pastel-purple)",
                border: "3px solid var(--cream-50)",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "jkBagPulse 1.6s ease-in-out infinite",
              }}
            >
              🎒
            </span>
          </button>
          <div
            onClick={handleSecretTap}
            style={{
              marginTop: 2,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "1.25rem",
              background: "linear-gradient(90deg, var(--ink-on-purple), var(--ink-on-blue))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Jagoan Kelas
          </div>
        </div>

        <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "0.8rem", color: "var(--ink-500)", textAlign: "center", margin: "2px 0 12px" }}>
          Pilih kelas kamu!
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, padding: "0 18px" }}>
          {GRADES.map((g, i) => (
            <button
              key={g.n}
              onClick={() => navigate(`/kelas/${g.n}`)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                aspectRatio: "1",
                borderRadius: 16,
                border: "none",
                cursor: "pointer",
                background: GRADE_CARD_COLORS[i],
                boxShadow: "var(--shadow-sticker-sm)",
                transition: "transform var(--duration-press) ease",
              }}
              onPointerDown={(e) => (e.currentTarget.style.transform = "translateY(2px)")}
              onPointerUp={(e) => (e.currentTarget.style.transform = "translateY(0)")}
              onPointerLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem", color: "#fff" }}>{g.n}</span>
              <span style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "0.62rem", color: "rgba(255,255,255,.9)" }}>Kelas {g.n}</span>
            </button>
          ))}
        </div>

        <div style={{ flex: 1, minHeight: 8 }} />

        <WalkingDino />

        <KikoGreeting name={player.name} onTap={() => setChatOpen(true)} />

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
            marginTop: 6,
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

      <KikoChatPanel open={chatOpen} onClose={() => setChatOpen(false)} mode="general" resetKey="landing" />

      <style>{`
        @keyframes jkKikoWiggle { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-4deg)} 75%{transform:rotate(4deg)} }
        @keyframes jkBagPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }
      `}</style>
    </Shell>
  );
}
