// Kiko -- maskot resmi Jagoan Kelas (diputuskan 2026-08-05, versi "Robi 1"
// sebelumnya, di-rename final jadi Kiko). Palet final: badan biru
// (--pastel-blue), telinga ungu (--pastel-purple), antena gold
// (--pastel-gold), pipi pink (--pastel-pink), badge dada hijau
// (--pastel-green), panel muka cream terang (BUKAN gelap -- user
// eksplisit nolak versi awal yang solid ink-900 karena "kegelapan").
// Desain ini FINAL, jangan diubah tanpa diminta eksplisit lagi.
export default function Kiko({ size = 96, style }) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      style={style}
      role="img"
      aria-label="Kiko"
    >
      <ellipse cx="100" cy="184" rx="46" ry="8" fill="var(--ink-900)" opacity="0.08" />
      <path d="M100 44 Q94 26 104 14" stroke="var(--ink-900)" strokeWidth="5" strokeLinecap="round" fill="none" />
      <circle cx="107" cy="11" r="10" fill="var(--pastel-gold)" stroke="var(--ink-900)" strokeWidth="4" />
      <circle cx="34" cy="102" r="16" fill="var(--pastel-purple)" stroke="var(--ink-900)" strokeWidth="4" />
      <circle cx="166" cy="102" r="16" fill="var(--pastel-purple)" stroke="var(--ink-900)" strokeWidth="4" />
      <path
        d="M46 100 Q46 40 100 40 Q154 40 154 100 Q160 166 100 172 Q40 166 46 100Z"
        fill="var(--pastel-blue)"
        stroke="var(--ink-900)"
        strokeWidth="5"
      />
      <ellipse cx="72" cy="58" rx="14" ry="8" fill="white" opacity="0.5" />
      <rect x="62" y="78" width="76" height="58" rx="22" fill="#FFF7E8" stroke="var(--ink-900)" strokeWidth="3.5" />
      <circle cx="85" cy="106" r="12.5" fill="var(--ink-900)" />
      <circle cx="115" cy="106" r="12.5" fill="var(--ink-900)" />
      <circle cx="88.5" cy="102" r="3.4" fill="white" />
      <circle cx="118.5" cy="102" r="3.4" fill="white" />
      <circle cx="81.5" cy="110" r="1.6" fill="white" opacity="0.7" />
      <circle cx="111.5" cy="110" r="1.6" fill="white" opacity="0.7" />
      <path d="M84 122 Q100 138 116 122" stroke="var(--ink-900)" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <circle cx="58" cy="120" r="9" fill="var(--pastel-pink)" />
      <circle cx="142" cy="120" r="9" fill="var(--pastel-pink)" />
      <rect x="76" y="150" width="48" height="18" rx="9" fill="var(--pastel-green)" stroke="var(--ink-900)" strokeWidth="3.5" />
    </svg>
  );
}
