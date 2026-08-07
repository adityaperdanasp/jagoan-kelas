// Ornamen pastel buat layar Landing (pilih kelas) -- pola & teknik SAMA
// PERSIS AuthDecor.jsx (blob/bintang clip-path/dot/sparkle + bob animation,
// di-port dari al-idrisi-games "Sticker Craft" hub), posisi beda karena
// layout-nya beda (header+Kiko+grid 6 kelas+dino, bukan form). Request
// user: "bikin banyak ornamen dan ilustrasi lucu kaya di playalidrisi.fun,
// ini masih polos bgt" -- dikasih ke Landing.jsx doang (AuthDecor tetep
// dipake Auth.jsx, gak digabung jadi 1 komponen shared karena posisinya
// emang beda per layar, bukan reusable 1:1).

const STAR_CLIP = "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";

const BLOBS = [
  { size: 160, top: -70, left: -60, bg: "var(--pastel-gold)", opacity: 0.5 },
  { size: 90, top: -40, right: -30, bg: "var(--pastel-purple)", opacity: 0.4 },
  { size: 130, bottom: -60, left: -50, bg: "var(--pastel-green)", opacity: 0.45 },
  { size: 100, bottom: -50, right: -40, bg: "var(--pastel-pink)", opacity: 0.45 },
];

const STARS = [
  { size: 14, top: "1%", left: "16%", bg: "var(--pastel-pink)", rotate: 10, bob: true },
  { size: 12, top: "4%", right: "8%", bg: "var(--pastel-blue)", opacity: 0.85 },
  { size: 16, top: "19%", left: "5%", bg: "var(--pastel-purple)", rotate: -12, bob: true, delay: 0.4 },
  { size: 14, top: "15%", right: "9%", bg: "var(--pastel-green)", rotate: 8, bob: true, delay: 0.8 },
  { size: 12, top: "34%", left: "4%", bg: "var(--pastel-gold)", opacity: 0.9 },
  { size: 13, top: "34%", right: "4%", bg: "var(--pastel-magenta)", rotate: -8, bob: true, delay: 0.2 },
  { size: 14, bottom: "16%", left: "9%", bg: "var(--pastel-blue)", rotate: 12, bob: true, delay: 0.6 },
  { size: 12, bottom: "16%", right: "11%", bg: "var(--pastel-pink)", rotate: -14, opacity: 0.9 },
];

const DOTS = [
  { size: 7, top: "6%", left: "40%" },
  { size: 6, top: "10%", right: "22%" },
  { size: 6, top: "43%", left: "8%" },
  { size: 6, top: "43%", right: "9%" },
  { size: 7, bottom: "22%", left: "24%" },
  { size: 7, bottom: "22%", right: "26%" },
];

const SPARKLES = [
  { emoji: "✨", top: "10%", right: "30%", size: 13, rotate: 6 },
  { emoji: "⭐", top: "47%", left: "30%", size: 12, rotate: -8 },
  { emoji: "✨", bottom: "9%", left: "44%", size: 13, rotate: 10 },
];

export default function LandingDecor() {
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
            animation: s.bob ? `jkLandingBob 6.5s ease-in-out infinite` : undefined,
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

      <style>{`@keyframes jkLandingBob { 0%,100%{transform:translateY(0) rotate(var(--r,0deg))} 50%{transform:translateY(-8px) rotate(var(--r,0deg))} }`}</style>
    </div>
  );
}
