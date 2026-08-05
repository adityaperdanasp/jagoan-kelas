import { useEffect, useRef, useState } from "react";

// Dekorasi "dino jalan-jalan" di halaman Pilih Kelas -- terinspirasi dari
// "map traveler" MathVille (al-idrisi-games/mathville/script.js) yang jalan
// di sepanjang SVG path town map. Halaman kelas di sini gak punya SVG path
// (cuma list zigzag via CSS transform), jadi versi ini patroli
// bolak-balik di jalur horizontal sendiri, bukan nyusurin node grade.
// Tap dino = shortcut langsung ke game DinoRace statis (public/dinorace).
const PATROL_MIN = 6; // persen dari lebar container
const PATROL_MAX = 82;
const STEP_MS = 2600;

export default function WanderingDino({ onTap }) {
  const [pos, setPos] = useState(PATROL_MIN);
  const [facingLeft, setFacingLeft] = useState(false);
  const dirRef = useRef(1);

  useEffect(() => {
    const id = setInterval(() => {
      dirRef.current = dirRef.current === 1 && pos >= PATROL_MAX ? -1 : dirRef.current === -1 && pos <= PATROL_MIN ? 1 : dirRef.current;
      setFacingLeft(dirRef.current === -1);
      setPos((p) => Math.min(PATROL_MAX, Math.max(PATROL_MIN, p + dirRef.current * 22)));
    }, STEP_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos]);

  return (
    <div style={{ position: "relative", height: 56, margin: "4px 18px 0", overflow: "visible" }}>
      <button
        onClick={onTap}
        aria-label="Main DinoRace"
        style={{
          position: "absolute",
          left: `${pos}%`,
          top: 0,
          transform: `translateX(-50%) scaleX(${facingLeft ? -1 : 1})`,
          transition: `left ${STEP_MS * 0.85}ms ease-in-out`,
          border: "none",
          background: "none",
          cursor: "pointer",
          fontSize: "2.1rem",
          lineHeight: 1,
          padding: 0,
          animation: "jkDinoBounce 0.5s ease-in-out infinite",
          filter: "drop-shadow(0 3px 3px rgba(0,0,0,0.15))",
        }}
      >
        🦕
      </button>
      <style>{`
        @keyframes jkDinoBounce {
          0%, 100% { margin-top: 0px; }
          50% { margin-top: -6px; }
        }
      `}</style>
    </div>
  );
}
