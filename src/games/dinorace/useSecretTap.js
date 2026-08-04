import { useRef, useCallback } from "react";

// Konami-code-style tap sequence -- ketuk kuadran (TL/TR/BL/BR) sesuai
// urutan rahasia dalam waktu terbatas antar-ketukan buat unlock DinoRace.
// Gak ada hint visual sama sekali (memang rahasia), reset kalau salah
// urutan atau kelamaan diem.
const SEQUENCE = ["TL", "TR", "TL", "TR", "BL", "BR"];
const TAP_TIMEOUT_MS = 2500;

export function useSecretTap(onUnlock) {
  const progressRef = useRef(0);
  const lastTapRef = useRef(0);

  const registerTap = useCallback(
    (zone) => {
      const now = Date.now();
      if (now - lastTapRef.current > TAP_TIMEOUT_MS) progressRef.current = 0;
      lastTapRef.current = now;

      if (zone === SEQUENCE[progressRef.current]) {
        progressRef.current += 1;
        if (progressRef.current >= SEQUENCE.length) {
          progressRef.current = 0;
          onUnlock();
        }
      } else {
        progressRef.current = zone === SEQUENCE[0] ? 1 : 0;
      }
    },
    [onUnlock]
  );

  // e = click/pointer event, target = elemen yang ukurannya dipakai buat nentuin kuadran
  const handleTapEvent = useCallback(
    (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const zone = (y < rect.height / 2 ? "T" : "B") + (x < rect.width / 2 ? "L" : "R");
      registerTap(zone);
    },
    [registerTap]
  );

  return handleTapEvent;
}
