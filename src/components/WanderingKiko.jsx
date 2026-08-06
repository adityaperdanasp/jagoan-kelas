import { useEffect, useRef, useState } from "react";
import Kiko from "./ds/Kiko";

// Dekorasi "Kiko jalan-jalan" di halaman Pilih Kelas -- gantiin WanderingDino
// (2026-08-06, dino emoji diganti maskot resmi Kiko). Patroli bolak-balik
// murni dekoratif sekarang, gak ada tap-to-navigate lagi -- entry ke
// DinoRace dipindah ke tombol terpisah di PickGrade.jsx.
const PATROL_MIN = 6; // persen dari lebar container
const PATROL_MAX = 82;
const STEP_MS = 2600;

export default function WanderingKiko() {
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
    <div style={{ position: "relative", height: 56, margin: "4px 18px 0", overflow: "visible" }} aria-hidden="true">
      <div
        style={{
          position: "absolute",
          left: `${pos}%`,
          top: 0,
          transform: `translateX(-50%) scaleX(${facingLeft ? -1 : 1})`,
          transition: `left ${STEP_MS * 0.85}ms ease-in-out`,
          animation: "jkKikoBounce 0.5s ease-in-out infinite",
          filter: "drop-shadow(0 3px 3px rgba(0,0,0,0.15))",
        }}
      >
        <Kiko size={44} />
      </div>
      <style>{`
        @keyframes jkKikoBounce {
          0%, 100% { margin-top: 0px; }
          50% { margin-top: -6px; }
        }
      `}</style>
    </div>
  );
}
