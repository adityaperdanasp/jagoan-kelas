// SVG top-down mobil+dino Drive Mode -- di-port PERSIS dari al-idrisi-games
// mathville/index.html + script.js (VEHICLE_SKINS.car), gantiin emoji polos
// (🚗🦖) yang dipakai sebelumnya. Emoji font gak "nose-up" (orientasi natural
// beda-beda per platform/emoji), jadi pas di-rotate ngikutin arah gerak
// (`headingCss()`), hasilnya keliatan "miring"/salah arah -- bug yang
// dilaporin user 2026-08-06. SVG di bawah ini DIGAMBAR nose-up (0deg =
// ngadep atas di viewBox-nya), match asumsi `headingCss()` yang emang
// dikalibrasi buat art nose-up (lihat komentar di DriveMode.jsx).
//
// 5 skin ID (blaze/comet/turbo/sunburst/nova) SAMA PERSIS kayak
// VEHICLE_SKINS.car di al-idrisi -- body shape identik smua (rect
// rounded + windshield + 4 roda), cuma warna beda, KECUALI turbo (viewBox
// lebih tinggi + spoiler rect di depan) dan nova (nambah decal petir).

export const VEHICLE_SKINS = [
  { id: "blaze", name: "Blaze", glow: "#E4572E" },
  { id: "comet", name: "Comet", glow: "#4A90D9" },
  { id: "turbo", name: "Turbo", glow: "#3FA84A" },
  { id: "sunburst", name: "Sunburst", glow: "#F7C548" },
  { id: "nova", name: "Nova", glow: "#9B59D0" },
];

function CarBlaze({ size = 23 }) {
  return (
    <svg viewBox="0 0 26 40" width={size} height={(size * 40) / 26}>
      <rect x="3" y="1" width="20" height="38" rx="8" fill="#E4572E" stroke="#C6431F" strokeWidth="1.5" />
      <rect x="6" y="7" width="14" height="10" rx="2.5" fill="#BFE3F0" />
      <rect x="0" y="9" width="4" height="8" rx="1.5" fill="#3B2A1A" />
      <rect x="22" y="9" width="4" height="8" rx="1.5" fill="#3B2A1A" />
      <rect x="0" y="23" width="4" height="8" rx="1.5" fill="#3B2A1A" />
      <rect x="22" y="23" width="4" height="8" rx="1.5" fill="#3B2A1A" />
    </svg>
  );
}
function CarComet({ size = 23 }) {
  return (
    <svg viewBox="0 0 26 40" width={size} height={(size * 40) / 26}>
      <rect x="3" y="1" width="20" height="38" rx="8" fill="#2E6BA3" stroke="#1E4E7A" strokeWidth="1.5" />
      <rect x="11" y="1" width="4" height="38" fill="#EAF6FF" opacity="0.85" />
      <rect x="6" y="7" width="14" height="10" rx="2.5" fill="#BFE3F0" />
      <rect x="0" y="9" width="4" height="8" rx="1.5" fill="#1A1A1A" />
      <rect x="22" y="9" width="4" height="8" rx="1.5" fill="#1A1A1A" />
      <rect x="0" y="23" width="4" height="8" rx="1.5" fill="#1A1A1A" />
      <rect x="22" y="23" width="4" height="8" rx="1.5" fill="#1A1A1A" />
    </svg>
  );
}
function CarTurbo({ size = 23 }) {
  return (
    <svg viewBox="0 0 26 44" width={size} height={(size * 44) / 26}>
      <rect x="3" y="5" width="20" height="38" rx="8" fill="#3FA84A" stroke="#2A7A32" strokeWidth="1.5" />
      <rect x="2" y="0" width="22" height="5" rx="2" fill="#2A7A32" />
      <rect x="6" y="11" width="14" height="10" rx="2.5" fill="#BFE3F0" />
      <rect x="0" y="13" width="4" height="8" rx="1.5" fill="#1A1A1A" />
      <rect x="22" y="13" width="4" height="8" rx="1.5" fill="#1A1A1A" />
      <rect x="0" y="27" width="4" height="8" rx="1.5" fill="#1A1A1A" />
      <rect x="22" y="27" width="4" height="8" rx="1.5" fill="#1A1A1A" />
    </svg>
  );
}
function CarSunburst({ size = 23 }) {
  return (
    <svg viewBox="0 0 26 40" width={size} height={(size * 40) / 26}>
      <rect x="3" y="1" width="20" height="38" rx="8" fill="#F7C548" stroke="#C99A2E" strokeWidth="1.5" />
      <rect x="3" y="17" width="20" height="6" fill="#1A1A1A" />
      <rect x="6" y="7" width="14" height="10" rx="2.5" fill="#BFE3F0" />
      <rect x="0" y="9" width="4" height="8" rx="1.5" fill="#1A1A1A" />
      <rect x="22" y="9" width="4" height="8" rx="1.5" fill="#1A1A1A" />
      <rect x="0" y="23" width="4" height="8" rx="1.5" fill="#1A1A1A" />
      <rect x="22" y="23" width="4" height="8" rx="1.5" fill="#1A1A1A" />
    </svg>
  );
}
function CarNova({ size = 23 }) {
  return (
    <svg viewBox="0 0 26 40" width={size} height={(size * 40) / 26}>
      <rect x="3" y="1" width="20" height="38" rx="8" fill="#7A4FC7" stroke="#5B3894" strokeWidth="1.5" />
      <rect x="6" y="7" width="14" height="10" rx="2.5" fill="#2A2044" opacity="0.5" />
      <path d="M14 6 L9 18 L13 18 L10 30 L18 15 L14 15 Z" fill="#F7E14A" />
      <rect x="0" y="9" width="4" height="8" rx="1.5" fill="#1A1A1A" />
      <rect x="22" y="9" width="4" height="8" rx="1.5" fill="#1A1A1A" />
      <rect x="0" y="23" width="4" height="8" rx="1.5" fill="#1A1A1A" />
      <rect x="22" y="23" width="4" height="8" rx="1.5" fill="#1A1A1A" />
    </svg>
  );
}

export const CAR_SVG_BY_ID = {
  blaze: CarBlaze,
  comet: CarComet,
  turbo: CarTurbo,
  sunburst: CarSunburst,
  nova: CarNova,
};

// Helper dipake di 3 tempat DriveMode.jsx (baris dekoratif picker, grid
// pilih skin, mobil in-game) -- render skin yang bener dari CAR_SVG_BY_ID
// + glow pulse (`.jk-vehicle-glow`, lihat tokens.css) pakai warna khas
// skin itu (`--vehicle-glow` custom property, di-set inline sama kayak
// pola JS al-idrisi `style.setProperty`).
export function VehicleSkinSvg({ skinId, size = 23, glow }) {
  const Car = CAR_SVG_BY_ID[skinId] || CarBlaze;
  return (
    <span className="jk-vehicle-glow" style={{ display: "inline-block", lineHeight: 0, "--vehicle-glow": glow }}>
      <Car size={size} />
    </span>
  );
}

// Kaki (`jk-dino-leg-l`/`jk-dino-leg-r`) di-toggle jalan lewat class
// `jk-dino-walking` di elemen PEMBUNGKUS (bukan svg ini sendiri) -- lihat
// keyframes `jk-dino-leg-swing` di tokens.css.
export function DinoSvg({ size = 27 }) {
  return (
    <svg viewBox="0 0 30 40" width={size} height={(size * 40) / 30}>
      <path d="M15 39 Q9 34 15 29 Q21 34 15 39 Z" fill="#5FA85A" stroke="#3F7A3D" strokeWidth="1.2" />
      <ellipse cx="15" cy="24" rx="10" ry="13" fill="#5FA85A" stroke="#3F7A3D" strokeWidth="1.5" />
      <rect className="jk-dino-leg jk-dino-leg-l" x="4" y="30" width="4" height="8" rx="2" fill="#3F7A3D" />
      <rect className="jk-dino-leg jk-dino-leg-r" x="22" y="30" width="4" height="8" rx="2" fill="#3F7A3D" />
      <circle cx="15" cy="10" r="9.5" fill="#5FA85A" stroke="#3F7A3D" strokeWidth="1.5" />
      <circle cx="15" cy="10" r="9.5" fill="rgba(191,227,240,.5)" stroke="#8fb9c9" strokeWidth="1.5" />
      <circle cx="15" cy="3.5" r="1.6" fill="#E4572E" />
    </svg>
  );
}
