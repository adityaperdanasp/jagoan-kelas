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
// lebih tinggi, nambah rear spoiler) dan nova (nambah decal petir).
//
// FIX turbo (2026-08-07): sumber al-idrisi nempatin spoiler bar-nya DI
// DEPAN (y=0, sebelum body/windshield) -- keliatan bener/simetris kalau
// statis, tapi begitu di-rotate lewat `headingCss()` (nose-up = depan di
// atas), bar itu jadi "mimpin" di ujung nose, persis kayak spoiler
// BELAKANG yang kebalik ke depan -- user lapor "mobil ijo kebalik ga?".
// Body/windshield/roda turbo di sini udah digeser biar proporsinya PERSIS
// sama kayak Blaze (nose-up bener), spoiler bar dipindah ke y=39-44
// (BELAKANG body, nempel abis roda belakang) -- posisi rear spoiler yang
// bener. Perubahan ini CUMA di jagoan-kelas (al-idrisi read-only, gak
// disentuh -- lihat CLAUDE.md).

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
      <rect x="3" y="1" width="20" height="38" rx="8" fill="#3FA84A" stroke="#2A7A32" strokeWidth="1.5" />
      <rect x="2" y="39" width="22" height="5" rx="2" fill="#2A7A32" />
      <rect x="6" y="7" width="14" height="10" rx="2.5" fill="#BFE3F0" />
      <rect x="0" y="9" width="4" height="8" rx="1.5" fill="#1A1A1A" />
      <rect x="22" y="9" width="4" height="8" rx="1.5" fill="#1A1A1A" />
      <rect x="0" y="23" width="4" height="8" rx="1.5" fill="#1A1A1A" />
      <rect x="22" y="23" width="4" height="8" rx="1.5" fill="#1A1A1A" />
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
//
// GAMBAR ULANG (2026-08-07) -- versi lama (SAMA PERSIS kayak al-idrisi
// `#drive-dino` di index.html) punya 1 lingkaran kepala + 1 titik merah
// DI TENGAH (posisi "mata" nyatu jadi satu, kayak wajah ngadep depan)
// plus overlay biru transparan mirip kaca depan mobil -- di statis
// keliatan oke, tapi user lapor "masih miring, belum tampak atas" karena
// bahasa visualnya beda dari mobil (yang jelas top-down: 4 roda di
// pojok + kaca depan kotak tengah). Fix: desain ulang biar SAMA JELAS
// top-down kayak mobil -- 2 titik mata di SISI KIRI/KANAN kepala (bukan
// 1 titik tengah, karena mata beneran ada di samping kepala kalau
// dilihat dari atas), duri punggung (dorsal spike) di garis tengah
// badan (petunjuk visual umum buat "ini dilihat dari atas"), dan 4 kaki
// (2 pasang, depan+belakang) nempel di SAMPING badan alih-alih 2 kaki
// doang. `jk-dino-leg-l`/`jk-dino-leg-r` dipake ulang di kedua pasang
// kaki (kiri selalu -l, kanan selalu -r) biar animasi jalan tetep pakai
// keyframes yang sama, gak perlu nambah CSS baru. Perubahan CUMA di
// jagoan-kelas (al-idrisi read-only, gak disentuh).
export function DinoSvg({ size = 27 }) {
  return (
    <svg viewBox="0 0 30 40" width={size} height={(size * 40) / 30}>
      <path d="M15 40 Q10 35 15 30 Q20 35 15 40 Z" fill="#5FA85A" stroke="#3F7A3D" strokeWidth="1.2" />
      <ellipse cx="15" cy="23" rx="8.5" ry="13" fill="#5FA85A" stroke="#3F7A3D" strokeWidth="1.5" />
      <rect className="jk-dino-leg jk-dino-leg-l" x="4" y="15" width="4" height="7" rx="2" fill="#3F7A3D" />
      <rect className="jk-dino-leg jk-dino-leg-r" x="22" y="15" width="4" height="7" rx="2" fill="#3F7A3D" />
      <rect className="jk-dino-leg jk-dino-leg-l" x="5" y="27" width="4" height="7" rx="2" fill="#3F7A3D" />
      <rect className="jk-dino-leg jk-dino-leg-r" x="21" y="27" width="4" height="7" rx="2" fill="#3F7A3D" />
      <path d="M15 11 L13 14 L17 14 Z" fill="#3F7A3D" />
      <path d="M15 16.5 L12.5 20 L17.5 20 Z" fill="#3F7A3D" />
      <path d="M15 22 L12.5 25.5 L17.5 25.5 Z" fill="#3F7A3D" />
      <circle cx="15" cy="8" r="6.5" fill="#5FA85A" stroke="#3F7A3D" strokeWidth="1.5" />
      <circle cx="10.5" cy="6.8" r="1.4" fill="#2A2A2A" />
      <circle cx="19.5" cy="6.8" r="1.4" fill="#2A2A2A" />
    </svg>
  );
}
