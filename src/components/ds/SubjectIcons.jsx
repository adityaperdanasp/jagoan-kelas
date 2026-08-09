// Ikon subject/game khusus buat GameCard (2026-08-08) -- GANTIIN emoji
// mentah (🏁🔢🔬🇮🇩🕌📖🔤🎯🥷) yang user bilang "jelek, kegambaran
// emoticon". Style konsisten: gradient 2 warna (terang->gelap) + drop-
// shadow halus + highlight glossy putih transparan (pola SAMA kayak
// Kiko.jsx pake ellipse highlight) -- kesan "sedikit 3D"/sticker, BUKAN
// flat/datar kayak emoji font OS. Tiap ikon self-contained (nentuin
// warna sendiri), gak perlu selaras sama warna accent card di belakangnya
// -- GameCard udah nyediain kotak putih 52x52 sebagai bingkai netral.
const S = { width: "100%", height: "100%", display: "block" };

export function MathRaceIcon() {
  return (
    <svg viewBox="0 0 52 52" style={S}>
      <defs>
        <linearGradient id="poleGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9CA3AF" />
          <stop offset="1" stopColor="#6B7280" />
        </linearGradient>
        <filter id="raceShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.6" floodColor="#000" floodOpacity="0.22" />
        </filter>
      </defs>
      <g filter="url(#raceShadow)">
        <rect x="14" y="10" width="4" height="34" rx="2" fill="url(#poleGrad)" />
        <path d="M18 11 L42 11 L38 17 L42 23 L18 23 Z" fill="#fff" />
        {[0, 1, 2].map((row) =>
          [0, 1, 2, 3].map((col) => (row + col) % 2 === 0 ? (
            <rect key={`${row}-${col}`} x={18 + col * 6} y={11 + row * 4} width="6" height="4" fill="#20242c" />
          ) : null)
        )}
      </g>
      <ellipse cx="16" cy="12" rx="1.4" ry="4" fill="#fff" opacity="0.5" />
    </svg>
  );
}

export function MathNumbersIcon() {
  return (
    <svg viewBox="0 0 52 52" style={S}>
      <defs>
        <linearGradient id="numGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6FA3F7" />
          <stop offset="1" stopColor="#3163C4" />
        </linearGradient>
        <filter id="numShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.6" floodColor="#1E3A7A" floodOpacity="0.35" />
        </filter>
      </defs>
      <rect x="8" y="8" width="36" height="36" rx="12" fill="url(#numGrad)" filter="url(#numShadow)" />
      <ellipse cx="18" cy="16" rx="9" ry="5" fill="#fff" opacity="0.22" />
      <text x="26" y="24" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="800" fontSize="12" fill="#fff">12</text>
      <text x="26" y="38" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="800" fontSize="12" fill="#fff">34</text>
    </svg>
  );
}

export function ScienceIcon() {
  return (
    <svg viewBox="0 0 52 52" style={S}>
      <defs>
        <linearGradient id="sciGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8FDC9E" />
          <stop offset="1" stopColor="#3F9B54" />
        </linearGradient>
        <filter id="sciShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.6" floodColor="#1F5C2C" floodOpacity="0.3" />
        </filter>
      </defs>
      <rect x="8" y="8" width="36" height="36" rx="12" fill="url(#sciGrad)" filter="url(#sciShadow)" />
      <ellipse cx="17" cy="16" rx="8" ry="4.5" fill="#fff" opacity="0.2" />
      <g fill="#fff">
        <rect x="23.2" y="12" width="5.6" height="4" rx="1.4" />
        <rect x="24.4" y="15" width="3.2" height="6" />
        <path d="M26 20 L34 34 a4 4 0 0 1 -4 6 H24 a4 4 0 0 1 -4 -6 Z" />
        <rect x="17" y="38" width="18" height="3.4" rx="1.7" fill="#fff" />
      </g>
      <path d="M26 20 L34 34 a4 4 0 0 1 -4 6 H24 a4 4 0 0 1 -4 -6 Z" fill="none" stroke="#3F9B54" strokeWidth="0" />
      <rect x="21.4" y="28" width="9.2" height="3" fill="#3F9B54" opacity="0.55" />
    </svg>
  );
}

export function CivicsFlagIcon() {
  return (
    <svg viewBox="0 0 52 52" style={S}>
      <defs>
        <linearGradient id="flagPoleGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#D8B366" />
          <stop offset="1" stopColor="#A9803A" />
        </linearGradient>
        <linearGradient id="flagRedGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#EA5F58" />
          <stop offset="1" stopColor="#C8313A" />
        </linearGradient>
        <filter id="flagShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.6" floodColor="#5A1B1F" floodOpacity="0.3" />
        </filter>
      </defs>
      <g filter="url(#flagShadow)">
        <rect x="12" y="8" width="3.4" height="36" rx="1.7" fill="url(#flagPoleGrad)" />
        <circle cx="13.7" cy="7" r="2.6" fill="#E8B84B" />
        <path d="M15.4 9 H37 V25 H15.4 Z" fill="#fff" />
        <path d="M15.4 9 H37 V17 H15.4 Z" fill="url(#flagRedGrad)" />
      </g>
      <ellipse cx="17" cy="11" rx="4" ry="1.6" fill="#fff" opacity="0.35" />
    </svg>
  );
}

export function MosqueIcon() {
  return (
    <svg viewBox="0 0 52 52" style={S}>
      <defs>
        <linearGradient id="mosqueGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F3CB6E" />
          <stop offset="1" stopColor="#3F8F5B" />
        </linearGradient>
        <filter id="mosqueShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.6" floodColor="#2E4A2E" floodOpacity="0.3" />
        </filter>
      </defs>
      <rect x="8" y="8" width="36" height="36" rx="12" fill="url(#mosqueGrad)" filter="url(#mosqueShadow)" />
      <ellipse cx="17" cy="16" rx="8" ry="4.5" fill="#fff" opacity="0.18" />
      <g fill="#fff">
        <path d="M18 30 a8 8 0 0 1 16 0 v6 h-16 Z" />
        <rect x="24.6" y="13" width="1.8" height="6" />
        <circle cx="25.5" cy="12" r="1.6" />
        <rect x="16" y="36" width="20" height="3.4" rx="1.4" />
      </g>
    </svg>
  );
}

export function BookIcon() {
  return (
    <svg viewBox="0 0 52 52" style={S}>
      <defs>
        <linearGradient id="bookGradL" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E0AE72" />
          <stop offset="1" stopColor="#B87A3A" />
        </linearGradient>
        <linearGradient id="bookGradR" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F0C793" />
          <stop offset="1" stopColor="#C88A45" />
        </linearGradient>
        <filter id="bookShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.6" floodColor="#5A3A18" floodOpacity="0.3" />
        </filter>
      </defs>
      <g filter="url(#bookShadow)">
        <path d="M26 16 Q18 12 10 15 V37 Q18 34 26 38 Z" fill="url(#bookGradL)" />
        <path d="M26 16 Q34 12 42 15 V37 Q34 34 26 38 Z" fill="url(#bookGradR)" />
      </g>
      <g stroke="#fff" strokeWidth="1.4" opacity="0.75" strokeLinecap="round">
        <path d="M14 18 Q19 16.5 24 18.5" />
        <path d="M14 23 Q19 21.5 24 23.5" />
        <path d="M28 18.5 Q33 16.5 38 18" />
        <path d="M28 23.5 Q33 21.5 38 23" />
      </g>
      <rect x="25" y="15" width="2" height="23" fill="#8a5a2f" opacity="0.5" />
    </svg>
  );
}

export function EnglishBubbleIcon() {
  return (
    <svg viewBox="0 0 52 52" style={S}>
      <defs>
        <linearGradient id="bubGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6FA3F7" />
          <stop offset="1" stopColor="#3163C4" />
        </linearGradient>
        <filter id="bubShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.6" floodColor="#1E3A7A" floodOpacity="0.3" />
        </filter>
      </defs>
      <g filter="url(#bubShadow)">
        <path d="M10 12 h32 a4 4 0 0 1 4 4 v14 a4 4 0 0 1 -4 4 h-16 l-7 6 v-6 h-9 a4 4 0 0 1 -4 -4 v-14 a4 4 0 0 1 4 -4 Z" fill="url(#bubGrad)" />
      </g>
      <ellipse cx="18" cy="18" rx="7" ry="3.4" fill="#fff" opacity="0.22" />
      <text x="26" y="26" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="800" fontSize="13" fill="#fff">Aa</text>
    </svg>
  );
}

export function FocusTargetIcon() {
  return (
    <svg viewBox="0 0 52 52" style={S}>
      <defs>
        <radialGradient id="targetGrad" cx="0.35" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.35" stopColor="#F5645C" />
          <stop offset="0.55" stopColor="#fff" />
          <stop offset="0.8" stopColor="#D6524A" />
          <stop offset="1" stopColor="#A83932" />
        </radialGradient>
        <filter id="targetShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.6" floodColor="#5A1B1F" floodOpacity="0.3" />
        </filter>
      </defs>
      <circle cx="26" cy="26" r="17" fill="url(#targetGrad)" filter="url(#targetShadow)" />
      <circle cx="26" cy="26" r="6" fill="#7A2A26" />
      <g stroke="#3B2A1A" strokeWidth="2" strokeLinecap="round">
        <line x1="34" y1="14" x2="27" y2="21" />
      </g>
      <path d="M34 14 L38 10 L36 15 L40 13 L36 17 Z" fill="#8a6a4a" />
      <ellipse cx="20" cy="18" rx="6" ry="3" fill="#fff" opacity="0.4" />
    </svg>
  );
}

export function NinjaStarIcon() {
  return (
    <svg viewBox="0 0 52 52" style={S}>
      <defs>
        <linearGradient id="ninjaGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8B95A8" />
          <stop offset="0.5" stopColor="#4A5568" />
          <stop offset="1" stopColor="#232A38" />
        </linearGradient>
        <filter id="ninjaShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.6" floodColor="#000" floodOpacity="0.35" />
        </filter>
      </defs>
      <g filter="url(#ninjaShadow)" transform="rotate(15 26 26)">
        <path
          d="M26 6 L30 21 L46 26 L30 31 L26 46 L22 31 L6 26 L22 21 Z"
          fill="url(#ninjaGrad)"
        />
      </g>
      <circle cx="26" cy="26" r="4.4" fill="#1a1f29" />
      <ellipse cx="20" cy="16" rx="4" ry="2" fill="#fff" opacity="0.35" transform="rotate(15 20 16)" />
    </svg>
  );
}
