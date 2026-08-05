// Ilustrasi anak belajar buat Landing hero slot -- ganti placeholder emoji
// 🎒✨. Flat-style SVG (bukan foto/AI-gen), pakai warna dari tokens.css biar
// konsisten sama design system, bukan approximate. Ukurannya isi penuh
// container 220x160 dari Landing.jsx.
export default function HeroIllustration({ style }) {
  return (
    <svg viewBox="0 0 220 160" width="100%" height="100%" style={style} role="img" aria-label="Anak duduk membaca buku">
      <circle cx="168" cy="34" r="6" fill="var(--pastel-gold)" opacity="0.9" />
      <path
        d="M28 20 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z"
        fill="var(--pastel-magenta)"
        opacity="0.9"
      />
      <path
        d="M190 100 l2.5 5.5 5.5 2.5 -5.5 2.5 -2.5 5.5 -2.5 -5.5 -5.5 -2.5 5.5 -2.5z"
        fill="var(--pastel-purple)"
        opacity="0.9"
      />

      {/* tumpukan buku di samping */}
      <rect x="150" y="118" width="40" height="10" rx="2" fill="var(--pastel-blue)" />
      <rect x="154" y="108" width="34" height="10" rx="2" fill="var(--pastel-pink)" />
      <rect x="149" y="98" width="36" height="10" rx="2" fill="var(--pastel-mint)" />

      {/* badan anak duduk bersila */}
      <ellipse cx="95" cy="140" rx="46" ry="8" fill="var(--ink-900)" opacity="0.08" />

      {/* kaki bersila */}
      <path d="M62 128 Q95 150 128 128 L124 138 Q95 156 66 138 Z" fill="var(--pastel-tan)" />

      {/* badan / baju */}
      <path d="M70 92 Q95 82 120 92 L124 132 Q95 142 66 132 Z" fill="var(--pastel-green)" />

      {/* lengan kiri pegang buku */}
      <path d="M70 100 Q56 108 60 122" stroke="var(--pastel-green)" strokeWidth="10" strokeLinecap="round" fill="none" />
      {/* lengan kanan pegang buku */}
      <path d="M120 100 Q134 108 130 122" stroke="var(--pastel-green)" strokeWidth="10" strokeLinecap="round" fill="none" />

      {/* buku terbuka */}
      <path d="M63 118 Q95 106 127 118 L127 130 Q95 118 63 130 Z" fill="var(--cream-100)" stroke="var(--ink-900)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M95 108 L95 122" stroke="var(--ink-900)" strokeWidth="2" />
      <path d="M72 116 L88 112 M72 122 L88 119" stroke="var(--ink-300)" strokeWidth="2" strokeLinecap="round" />
      <path d="M102 112 L118 116 M102 119 L118 122" stroke="var(--ink-300)" strokeWidth="2" strokeLinecap="round" />

      {/* kepala */}
      <circle cx="95" cy="66" r="26" fill="var(--pastel-tan)" />
      {/* rambut */}
      <path d="M69 62 Q66 34 95 32 Q124 34 121 62 Q118 44 95 44 Q72 44 69 62Z" fill="var(--ink-700)" />
      <path d="M69 60 Q70 50 76 46 L74 60Z" fill="var(--ink-700)" />
      <path d="M121 60 Q120 50 114 46 L116 60Z" fill="var(--ink-700)" />

      {/* wajah: mata + pipi + senyum */}
      <circle cx="86" cy="68" r="3" fill="var(--ink-900)" />
      <circle cx="104" cy="68" r="3" fill="var(--ink-900)" />
      <circle cx="80" cy="76" r="4" fill="var(--pastel-pink)" opacity="0.7" />
      <circle cx="110" cy="76" r="4" fill="var(--pastel-pink)" opacity="0.7" />
      <path d="M86 80 Q95 87 104 80" stroke="var(--ink-900)" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* tas ransel di sebelah kiri */}
      <rect x="24" y="108" width="28" height="30" rx="8" fill="var(--pastel-blue)" stroke="var(--ink-900)" strokeWidth="1.5" />
      <rect x="33" y="100" width="10" height="14" rx="5" fill="var(--pastel-blue)" stroke="var(--ink-900)" strokeWidth="1.5" />
      <circle cx="38" cy="122" r="3" fill="var(--pastel-gold)" />
    </svg>
  );
}
