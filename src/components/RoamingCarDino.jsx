import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// Dekorasi "mobil dikejar dino" -- di-port dari hub landing al-idrisi-games
// (index.html, cari komentar "ROAMING CAR + DINO"): mobil jalan random ke
// titik-titik acak, dino ngejar dengan kecepatan yang naik-turun (sinus)
// tapi jaraknya dibatasin (ROAM_MIN_DIST) biar GAK PERNAH nangkep mobilnya.
// Tap mobil = langsung ke Drive Mode.
// Dipasang di `PickSubject.jsx` (2026-08-06, dulu sempet di `Landing.jsx`
// -- dipindah biar match penempatan al-idrisi: di sana ini nempel di hub
// tempat milih game, yang padanannya di jagoan-kelas itu layar milih
// pelajaran, bukan layar sambutan). Karena PickSubject udah tau `grade`
// dari URL params, `grade` di-terima sebagai PROP -- gak perlu lagi trik
// "kelas terakhir dibuka" (`lastGrade.js`, udah dihapus) yang dulu jadi
// workaround pas komponen ini masih di Landing (layar tanpa konteks kelas).
const ROAM_CAR_SPEED = 0.9;
const ROAM_DINO_BASE_SPEED = 0.65;
const ROAM_DINO_AMPLITUDE = 0.55;
const ROAM_MIN_DIST = 46;

export default function RoamingCarDino({ grade }) {
  const navigate = useNavigate();
  const layerRef = useRef(null);
  const carRef = useRef(null);
  const dinoRef = useRef(null);
  const dinoSpriteRef = useRef(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const rect = layer.getBoundingClientRect();
    const margin = 22;
    const w = Math.max(10, rect.width - margin * 2);
    const h = Math.max(10, rect.height - margin * 2);

    const state = {
      car: { x: rect.width * 0.5, y: rect.height * 0.7 },
      dino: { x: rect.width * 0.5, y: rect.height * 0.2 },
      target: null,
      heading: Math.PI / 2,
      startTime: performance.now(),
    };

    function pickTarget() {
      const spread = Math.PI * 0.75;
      let tx, ty;
      for (let tries = 0; tries < 10; tries++) {
        const angle = state.heading + (Math.random() * 2 - 1) * spread;
        const dist = 40 + Math.random() * Math.max(40, Math.min(w, h) * 0.7);
        tx = state.car.x + Math.cos(angle) * dist;
        ty = state.car.y + Math.sin(angle) * dist;
        if (tx >= margin && tx <= margin + w && ty >= margin && ty <= margin + h) break;
      }
      state.target = {
        x: Math.max(margin, Math.min(margin + w, tx)),
        y: Math.max(margin, Math.min(margin + h, ty)),
      };
    }
    pickTarget();

    let rafId;
    function frame(now) {
      const ct = state.target;
      const cdx = ct.x - state.car.x;
      const cdy = ct.y - state.car.y;
      const cdist = Math.hypot(cdx, cdy);
      if (cdist < 4) {
        pickTarget();
      } else {
        const step = Math.min(cdist, ROAM_CAR_SPEED);
        const cAngle = Math.atan2(cdy, cdx);
        state.heading = cAngle;
        state.car.x += Math.cos(cAngle) * step;
        state.car.y += Math.sin(cAngle) * step;
        if (carRef.current) {
          carRef.current.style.transform = `translate(${state.car.x}px, ${state.car.y}px) rotate(${(cAngle * 180) / Math.PI + 90}deg)`;
        }
      }

      const t = (now - state.startTime) / 1000;
      const dinoSpeed = Math.max(0, ROAM_DINO_BASE_SPEED + Math.sin(t * 1.3) * ROAM_DINO_AMPLITUDE);
      const ddx = state.car.x - state.dino.x;
      const ddy = state.car.y - state.dino.y;
      const ddist = Math.hypot(ddx, ddy);
      const dAngle = Math.atan2(ddy, ddx);
      let moved = false;
      if (ddist > ROAM_MIN_DIST) {
        const step = Math.min(ddist - ROAM_MIN_DIST, dinoSpeed);
        state.dino.x += Math.cos(dAngle) * step;
        state.dino.y += Math.sin(dAngle) * step;
        moved = step > 0.02;
      }
      if (dinoRef.current) {
        dinoRef.current.style.transform = `translate(${state.dino.x}px, ${state.dino.y}px)`;
        dinoRef.current.classList.toggle("jkRoamWalking", moved);
      }
      if (dinoSpriteRef.current) {
        dinoSpriteRef.current.style.transform = `rotate(${(dAngle * 180) / Math.PI + 90}deg)`;
      }

      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  function goDrive() {
    navigate(`/kelas/${grade}/matematika/drive`);
  }

  return (
    <div
      ref={layerRef}
      style={{
        position: "relative",
        width: "100%",
        height: 92,
        borderRadius: 14,
        background: "var(--cream-200)",
        overflow: "hidden",
      }}
    >
      <div
        ref={dinoRef}
        style={{ position: "absolute", left: 0, top: 0, willChange: "transform" }}
      >
        <div ref={dinoSpriteRef} style={{ willChange: "transform" }}>
          <svg viewBox="0 0 30 40" width="22" height="30">
            <path d="M15 39 Q9 34 15 29 Q21 34 15 39 Z" fill="#5FA85A" stroke="#3F7A3D" strokeWidth="1.2" />
            <ellipse cx="15" cy="24" rx="9" ry="10" fill="#5FA85A" stroke="#3F7A3D" strokeWidth="1.5" />
            <rect x="4" y="27" width="4" height="8" rx="2" fill="#3F7A3D" />
            <rect x="22" y="27" width="4" height="8" rx="2" fill="#3F7A3D" />
            <path
              d="M15 2 Q9 2.5 8.5 9 Q8 15 15 17.5 Q22 15 21.5 9 Q21 2.5 15 2 Z"
              fill="#5FA85A"
              stroke="#3F7A3D"
              strokeWidth="1.5"
            />
            <circle cx="9.3" cy="9.5" r="1.5" fill="#1B2B1A" />
            <circle cx="20.7" cy="9.5" r="1.5" fill="#1B2B1A" />
          </svg>
        </div>
      </div>
      <button
        ref={carRef}
        onClick={goDrive}
        aria-label="Main Drive Mode"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          border: "none",
          background: "none",
          padding: 0,
          cursor: "pointer",
          willChange: "transform",
          lineHeight: 0,
        }}
      >
        <svg viewBox="0 0 26 40" width="19" height="30">
          <rect x="3" y="1" width="20" height="38" rx="8" fill="#E4572E" stroke="#C6431F" strokeWidth="1.5" />
          <rect x="6" y="7" width="14" height="10" rx="2.5" fill="#BFE3F0" />
          <rect x="0" y="9" width="4" height="8" rx="1.5" fill="#3B2A1A" />
          <rect x="22" y="9" width="4" height="8" rx="1.5" fill="#3B2A1A" />
          <rect x="0" y="23" width="4" height="8" rx="1.5" fill="#3B2A1A" />
          <rect x="22" y="23" width="4" height="8" rx="1.5" fill="#3B2A1A" />
        </svg>
      </button>
      <style>{`
        @keyframes jkRoamDinoBounce { 0%,100%{ margin-top:0 } 50%{ margin-top:-3px } }
        .jkRoamWalking { animation: jkRoamDinoBounce 0.35s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
