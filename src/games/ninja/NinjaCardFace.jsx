// Wajah kecil (mata putih+pupil gelap+senyum) di-port PERSIS dari
// al-idrisi-games mathville/script.js NINJA_CARD_FACE_SVG.
export default function NinjaCardFace({ size = 34 }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size}>
      <circle cx="14" cy="17" r="3.4" fill="#fff" />
      <circle cx="26" cy="17" r="3.4" fill="#fff" />
      <circle cx="14" cy="17.5" r="1.5" fill="#2b1f14" />
      <circle cx="26" cy="17.5" r="1.5" fill="#2b1f14" />
      <path d="M12 24 Q20 30 28 24" stroke="#2b1f14" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
