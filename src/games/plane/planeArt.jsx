// SVG pesawat -- di-port PERSIS dari al-idrisi-games mathville/script.js
// (VEHICLE_SKINS.plane), gantiin emoji 🚀 yang dipakai sebelumnya. Emoji
// roket kebanyakan platform DIGAMBAR miring/diagonal (efek "meluncur"),
// padahal pesawat di sini gak pernah di-rotate (selalu ngadep lurus ke
// atas, gak kayak mobil Drive Mode yang muter ngikutin arah gerak) --
// jadi biar keliatan "lurus ke depan" ya art-nya emang harus digambar
// lurus dari awal, bukan soal rotasi. 5 skin ID (falcon/inferno/viper/
// solstice/ghost) sama persis kayak al-idrisi.

export const PLANE_SKINS = [
  { id: "falcon", name: "Falcon", glow: "#4A90D9" },
  { id: "inferno", name: "Inferno", glow: "#E4572E" },
  { id: "viper", name: "Viper", glow: "#3FA84A" },
  { id: "solstice", name: "Solstice", glow: "#F7C548" },
  { id: "ghost", name: "Ghost", glow: "#9DB3D6" },
];

function PlaneFalcon({ size = 27 }) {
  return (
    <svg viewBox="0 0 30 34" width={size} height={(size * 34) / 30}>
      <path d="M15 1 L20 20 L15 17 L10 20 Z" fill="#4A90D9" stroke="#2E6BA3" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M15 17 L15 33" stroke="#2E6BA3" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 22 L15 17 L15 24 Z" fill="#6EA8E0" stroke="#2E6BA3" strokeWidth="1.2" />
      <path d="M26 22 L15 17 L15 24 Z" fill="#6EA8E0" stroke="#2E6BA3" strokeWidth="1.2" />
      <circle cx="15" cy="12" r="3" fill="#BFE3F0" />
    </svg>
  );
}
function PlaneInferno({ size = 27 }) {
  return (
    <svg viewBox="0 0 30 34" width={size} height={(size * 34) / 30}>
      <path d="M15 1 C11.5 7 11.5 20 11.5 25 L18.5 25 C18.5 20 18.5 7 15 1 Z" fill="#E4572E" stroke="#B8391A" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M11.5 19 L4 27 L11.5 24 Z" fill="#FF9466" stroke="#B8391A" strokeWidth="1.2" />
      <path d="M18.5 19 L26 27 L18.5 24 Z" fill="#FF9466" stroke="#B8391A" strokeWidth="1.2" />
      <circle cx="15" cy="10" r="2.5" fill="#FFE1C1" />
      <path d="M12 25 Q15 32 18 25 Z" fill="#FFD93D" opacity="0.9" />
    </svg>
  );
}
function PlaneViper({ size = 27 }) {
  return (
    <svg viewBox="0 0 30 34" width={size} height={(size * 34) / 30}>
      <path d="M15 6 L29 25 L15 20 L1 25 Z" fill="#2A2A2A" stroke="#1A1A1A" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M15 6 L17.5 1 L15 -1 L12.5 1 Z" fill="#2A2A2A" stroke="#1A1A1A" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="15" cy="14" r="2.5" fill="#3FA84A" />
    </svg>
  );
}
function PlaneSolstice({ size = 27 }) {
  return (
    <svg viewBox="0 0 30 34" width={size} height={(size * 34) / 30}>
      <circle cx="15" cy="3" r="2.2" fill="#C99A2E" stroke="#8A6A1E" strokeWidth="1" />
      <rect x="13" y="5" width="4" height="25" rx="2" fill="#F7C548" stroke="#C99A2E" strokeWidth="1.3" />
      <rect x="3" y="12" width="24" height="3.4" rx="1.5" fill="#FFE08A" stroke="#C99A2E" strokeWidth="1.2" />
      <rect x="6" y="21" width="18" height="3.4" rx="1.5" fill="#FFE08A" stroke="#C99A2E" strokeWidth="1.2" />
      <circle cx="15" cy="9" r="2.3" fill="#FFF6D9" />
    </svg>
  );
}
function PlaneGhost({ size = 27 }) {
  return (
    <svg viewBox="0 0 30 34" width={size} height={(size * 34) / 30}>
      <path d="M15 0 L17 27 L15 24 L13 27 Z" fill="#E9EEF6" stroke="#9DB3D6" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8 25 L15 22 L15 26.5 Z" fill="#F5F8FC" stroke="#9DB3D6" strokeWidth="1.1" />
      <path d="M22 25 L15 22 L15 26.5 Z" fill="#F5F8FC" stroke="#9DB3D6" strokeWidth="1.1" />
      <circle cx="15" cy="9" r="2.5" fill="#C1D4F6" />
    </svg>
  );
}

const PLANE_SVG_BY_ID = {
  falcon: PlaneFalcon,
  inferno: PlaneInferno,
  viper: PlaneViper,
  solstice: PlaneSolstice,
  ghost: PlaneGhost,
};

// Sama pola kayak `VehicleSkinSvg` di Drive Mode (`vehicleArt.jsx`) --
// glow pulse pakai warna khas skin, `.jk-vehicle-glow` (tokens.css) di-
// reuse (bukan bikin keyframes baru, animasinya generik/gak spesifik
// mobil).
export function PlaneSkinSvg({ skinId, size = 27, glow }) {
  const Plane = PLANE_SVG_BY_ID[skinId] || PlaneFalcon;
  return (
    <span className="jk-vehicle-glow" style={{ display: "inline-block", lineHeight: 0, "--vehicle-glow": glow }}>
      <Plane size={size} />
    </span>
  );
}
