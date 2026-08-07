// Ornamen pastel buat layar Auth -- di-port dari al-idrisi-games (index.html,
// cari komentar "Page-level floating decoration" / style.css .sc-blob/.sc-star/
// .sc-cloud/.sc-dot/.sc-balloon), teknik & warna SAMA PERSIS (clip-path bintang,
// token --pastel-* yang emang udah identik nilainya sama punya BrainBox),
// cuma posisi/jumlah disesuaikan ke lebar card Jagoan Kelas (bukan re-desain).
// Request user: "bikin lebih berwarna dan menarik... ikutin aja reponya".

const STAR_CLIP = "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";

const BLOBS = [
  { size: 190, top: -90, left: -70, bg: "var(--pastel-gold)", opacity: 0.6 },
  { size: 140, bottom: -80, right: -60, bg: "var(--pastel-pink)", opacity: 0.5 },
  { size: 100, bottom: 110, left: -50, bg: "var(--pastel-green)", opacity: 0.45 },
  { size: 80, top: "30%", right: -36, bg: "var(--pastel-purple)", opacity: 0.4 },
];

const CLOUDS = [
  [
    { size: 48, top: 44, left: "6%" },
    { size: 24, top: 78, left: "calc(6% + 22px)" },
  ],
  [
    { size: 38, top: 130, right: "5%" },
    { size: 20, top: 156, right: "calc(5% + 24px)" },
  ],
];

const STARS = [
  { size: 24, top: "9%", right: "11%", bg: "var(--pastel-magenta)", rotate: 8, bob: true },
  { size: 16, bottom: "16%", left: "7%", bg: "var(--pastel-purple)", rotate: -12, bob: true, delay: 1 },
  { size: 13, top: "26%", left: "5%", bg: "var(--pastel-gold)", opacity: 0.9 },
  { size: 14, top: "6%", left: "26%", bg: "var(--pastel-pink)", rotate: 15, bob: true, delay: 0.8 },
  { size: 17, top: "40%", right: "14%", bg: "var(--pastel-green)", rotate: -8, bob: true, delay: 0.2 },
  { size: 11, bottom: "26%", right: "16%", bg: "var(--pastel-gold)", opacity: 0.9 },
  { size: 10, top: "3%", right: "38%", bg: "var(--pastel-blue)", opacity: 0.85 },
];

const DOTS = [
  { size: 7, top: "3%", left: "48%" },
  { size: 6, top: "16%", right: "32%" },
  { size: 6, bottom: "12%", left: "36%" },
  { size: 8, bottom: "22%", right: "7%" },
  { size: 6, top: "54%", left: "9%" },
];

const SPARKLES = [
  { emoji: "✨", top: "17%", left: "12%", size: 15, rotate: 8 },
  { emoji: "⭐", bottom: "30%", right: "9%", size: 15, rotate: -10 },
  { emoji: "✨", top: "48%", right: "22%", size: 12, rotate: -6 },
];

export default function AuthDecor() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
      {BLOBS.map((b, i) => (
        <div
          key={"blob" + i}
          style={{
            position: "absolute",
            width: b.size,
            height: b.size,
            top: b.top,
            left: b.left,
            right: b.right,
            bottom: b.bottom,
            background: b.bg,
            opacity: b.opacity,
            borderRadius: "50%",
          }}
        />
      ))}

      {CLOUDS.map((pair, i) => (
        <div key={"cloud" + i}>
          {pair.map((c, j) => (
            <div
              key={j}
              style={{
                position: "absolute",
                width: c.size,
                height: c.size,
                top: c.top,
                left: c.left,
                right: c.right,
                background: "#fff",
                opacity: 0.9,
                borderRadius: "50%",
              }}
            />
          ))}
        </div>
      ))}

      {STARS.map((s, i) => (
        <div
          key={"star" + i}
          style={{
            position: "absolute",
            width: s.size,
            height: s.size,
            top: s.top,
            left: s.left,
            right: s.right,
            bottom: s.bottom,
            background: s.bg,
            opacity: s.opacity,
            clipPath: STAR_CLIP,
            "--r": `${s.rotate || 0}deg`,
            transform: s.bob ? undefined : `rotate(${s.rotate || 0}deg)`,
            animation: s.bob ? `jkAuthBob 6.5s ease-in-out infinite` : undefined,
            animationDelay: s.delay ? `${s.delay}s` : undefined,
          }}
        />
      ))}

      {DOTS.map((d, i) => (
        <div
          key={"dot" + i}
          style={{
            position: "absolute",
            width: d.size,
            height: d.size,
            top: d.top,
            left: d.left,
            right: d.right,
            bottom: d.bottom,
            background: "#fff",
            opacity: 0.85,
            borderRadius: "50%",
          }}
        />
      ))}

      {SPARKLES.map((s, i) => (
        <div
          key={"sparkle" + i}
          style={{
            position: "absolute",
            top: s.top,
            left: s.left,
            right: s.right,
            bottom: s.bottom,
            fontSize: s.size,
            transform: `rotate(${s.rotate}deg)`,
          }}
        >
          {s.emoji}
        </div>
      ))}

      <style>{`@keyframes jkAuthBob { 0%,100%{transform:translateY(0) rotate(var(--r,0deg))} 50%{transform:translateY(-8px) rotate(var(--r,0deg))} }`}</style>
    </div>
  );
}
