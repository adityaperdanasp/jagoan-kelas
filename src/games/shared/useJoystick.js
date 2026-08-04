import { useRef, useState, useCallback } from "react";

// Analog virtual joystick -- pola sama kayak BrainBox (drag dari tengah,
// vector -1..1 dinormalisasi dari deflection). Posisi nub visual lewat
// React state (jarang berubah relatif ke 60fps), tapi vecRef yang dibaca
// game loop tiap frame -- BUKAN re-render tiap gerakan, biar gak lag.
export function useJoystick(radius = 42) {
  const baseRef = useRef(null);
  const vecRef = useRef({ x: 0, y: 0 });
  const [nub, setNub] = useState({ x: 0, y: 0 });
  const activeRef = useRef(false);

  const updateFromClient = useCallback(
    (clientX, clientY) => {
      const base = baseRef.current;
      if (!base) return;
      const rect = base.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > radius) {
        dx = (dx / dist) * radius;
        dy = (dy / dist) * radius;
      }
      vecRef.current = { x: dx / radius, y: dy / radius };
      setNub({ x: dx, y: dy });
    },
    [radius]
  );

  const onPointerDown = useCallback(
    (e) => {
      activeRef.current = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      updateFromClient(e.clientX, e.clientY);
    },
    [updateFromClient]
  );

  const onPointerMove = useCallback(
    (e) => {
      if (!activeRef.current) return;
      updateFromClient(e.clientX, e.clientY);
    },
    [updateFromClient]
  );

  const release = useCallback(() => {
    activeRef.current = false;
    vecRef.current = { x: 0, y: 0 };
    setNub({ x: 0, y: 0 });
  }, []);

  return { baseRef, vecRef, nub, onPointerDown, onPointerMove, onPointerUp: release, onPointerLeave: release };
}
