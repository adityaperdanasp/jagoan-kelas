import { useRef, useState, useCallback, useEffect } from "react";

// Analog virtual joystick -- pola sama kayak BrainBox (drag dari tengah,
// vector -1..1 dinormalisasi dari deflection). Posisi nub visual lewat
// React state (jarang berubah relatif ke 60fps), tapi vecRef yang dibaca
// game loop tiap frame -- BUKAN re-render tiap gerakan, biar gak lag.
//
// Gerakan (pointermove) DAN lepas (pointerup/cancel) dipantau di WINDOW,
// bukan cuma di elemen base-nya sendiri -- bug yang ketemu di device asli
// (2026-08-07): base-nya kecil (radius ~40px), padahal buat dapet
// deflection PENUH jari/mouse WAJIB geser sampe/lewat batas lingkaran
// itu (itu emang cara kerja joystick), yang bikin `pointerleave` ke-fire
// di beberapa browser mobile walau `setPointerCapture` udah dipanggil --
// tiap kali itu kejadian, joystick ke-reset ke nol di tengah drag, jadi
// KERASA kayak "gak bisa digeser sama sekali". Listener di window imun
// dari masalah itu karena gak peduli posisi jari relatif ke elemen mana
// pun, cuma filter by `pointerId` biar 2 joystick (steer+aim) gak
// interferensi.
export function useJoystick(radius = 42) {
  const baseRef = useRef(null);
  const vecRef = useRef({ x: 0, y: 0 });
  const [nub, setNub] = useState({ x: 0, y: 0 });
  const activeRef = useRef(false);
  const pointerIdRef = useRef(null);

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

  const release = useCallback(() => {
    activeRef.current = false;
    pointerIdRef.current = null;
    vecRef.current = { x: 0, y: 0 };
    setNub({ x: 0, y: 0 });
  }, []);

  const onPointerDown = useCallback(
    (e) => {
      activeRef.current = true;
      pointerIdRef.current = e.pointerId;
      updateFromClient(e.clientX, e.clientY);
    },
    [updateFromClient]
  );

  useEffect(() => {
    function handleMove(e) {
      if (!activeRef.current || e.pointerId !== pointerIdRef.current) return;
      updateFromClient(e.clientX, e.clientY);
    }
    function handleRelease(e) {
      if (e.pointerId !== pointerIdRef.current) return;
      release();
    }
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleRelease);
    window.addEventListener("pointercancel", handleRelease);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleRelease);
      window.removeEventListener("pointercancel", handleRelease);
    };
  }, [updateFromClient, release]);

  return { baseRef, nub, vecRef, onPointerDown };
}
