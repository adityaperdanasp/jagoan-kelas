import { useState } from "react";
import Kiko from "./ds/Kiko";
import { greetingTemplateForToday } from "../data/kikoGreetings";

// Sapaan harian + trigger AI chat, di bagian bawah Landing.jsx -- di-port
// dari al-idrisi-games `sc-greeting` (avatar kecil + teks yang "gelombang"
// kata-per-kata, nama di-highlight warna gonta-ganti per hari, hint "Tap
// Bo!" yang cuma muncul sekali sampe di-tap, dismiss-nya lewat localStorage).
// Di sini pake Kiko + 50 template (`kikoGreetings.js`) dan warna nama pake
// token --ink-on-* yang app ini emang udah punya (nilainya SAMA PERSIS kayak
// 3 warna hardcoded BrainBox -- bukan kebetulan, token itu emang di-port
// dari sana dari awal). Tap = buka KikoChatPanel yang SAMA kayak tap Kiko
// gede di atas (onTap dikasih dari Landing.jsx, komponen ini gak nyimpen
// state chat sendiri).
const NAME_COLORS = ["var(--ink-on-blue)", "var(--ink-on-pink)", "var(--ink-on-green)"];
const HINT_KEY = "jk_kiko_greeting_hint_seen";

export default function KikoGreeting({ name, onTap }) {
  const [hintSeen, setHintSeen] = useState(() => {
    try {
      return !!localStorage.getItem(HINT_KEY);
    } catch {
      return false;
    }
  });

  const dayIndex = Math.floor(Date.now() / 86400000);
  const template = greetingTemplateForToday();
  const nameColor = NAME_COLORS[dayIndex % NAME_COLORS.length];
  const words = template.split(" ");

  function handleTap() {
    if (!hintSeen) {
      try {
        localStorage.setItem(HINT_KEY, "1");
      } catch {
        // localStorage bisa gagal (private mode/quota) -- hint doang yang
        // gak persist, gak masalah, chat tetep kebuka normal.
      }
      setHintSeen(true);
    }
    onTap?.();
  }

  return (
    <button
      onClick={handleTap}
      aria-label="Ngobrol sama Kiko"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        margin: "18px 12px 4px",
        border: "none",
        background: "none",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
        position: "relative",
        zIndex: 1,
      }}
    >
      <span style={{ position: "relative", flex: "none" }}>
        {!hintSeen && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "50%",
              bottom: "100%",
              marginBottom: 2,
              transform: "translateX(-50%)",
              fontFamily: "var(--font-body)",
              fontWeight: 800,
              fontSize: "0.6rem",
              color: "#fff",
              whiteSpace: "nowrap",
              background: "#FF8A3D",
              padding: "2px 8px",
              borderRadius: "10px 10px 10px 3px",
              animation: "jkGreetingHintPop 3.2s ease-out infinite",
            }}
          >
            Tap Kiko!
          </span>
        )}
        <span style={{ display: "block", animation: "jkGreetingWiggle 1.8s ease-in-out infinite" }}>
          <Kiko size={34} />
        </span>
      </span>
      <span style={{ fontFamily: "var(--font-body)", fontSize: "0.88rem", fontWeight: 700, color: "var(--ink-700)", textAlign: "left" }}>
        {words.map((w, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              marginRight: 4,
              animation: "jkGreetingWordBob 1.4s ease-in-out infinite",
              animationDelay: `${i * 0.12}s`,
            }}
          >
            {w.includes("{name}") ? <span style={{ color: nameColor, fontWeight: 800 }}>{w.replace("{name}", name)}</span> : w}
          </span>
        ))}
      </span>

      <style>{`
        @keyframes jkGreetingWiggle { 0%,50%,100%{transform:rotate(0)} 25%{transform:rotate(-6deg)} 75%{transform:rotate(6deg)} }
        @keyframes jkGreetingHintPop {
          0% { opacity: 0; transform: translateX(-50%) translateY(10%) scale(.5); }
          10% { opacity: 1; transform: translateX(-50%) translateY(-15%) scale(1.1); }
          15% { transform: translateX(-50%) translateY(-10%) scale(1); }
          35% { opacity: 1; }
          45%, 100% { opacity: 0; transform: translateX(-50%) translateY(-25%) scale(1); }
        }
        @keyframes jkGreetingWordBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
      `}</style>
    </button>
  );
}
