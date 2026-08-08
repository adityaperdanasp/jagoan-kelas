// Ornamen pastel generik buat halaman-halaman yang masih polos (request
// user: "semua page harus ada blob, ilustrasi dan ornamen, jangan polos").
// AuthDecor.jsx/LandingDecor.jsx (2 layar pertama yang didekorasi) masing-
// masing nulis posisi elemen manual satu-satu -- gak scalable buat "semua
// page". Di sini posisinya di-GENERATE dari `seed` (nama layar) lewat PRNG
// seeded (mulberry32, pola sama kayak `seededRandom(42)`-nya TwinkleStars
// di IpasQuestMap.jsx) -- tiap layar dapet pola beda-beda (gak keliatan
// "copas" identik lintas halaman) tapi STABIL antar render (posisi gak
// "loncat-loncat" tiap state lain berubah).
const STAR_CLIP = "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";
const PASTELS = [
  "var(--pastel-pink)",
  "var(--pastel-green)",
  "var(--pastel-blue)",
  "var(--pastel-gold)",
  "var(--pastel-purple)",
  "var(--pastel-magenta)",
  "var(--pastel-mint)",
];
const SPARKLE_EMOJI = ["✨", "⭐"];

function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function PageDecor({ seed = "page" }) {
  const rand = mulberry32(hashSeed(seed));
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const between = (a, b) => a + rand() * (b - a);
  const edgePos = () => (rand() > 0.5 ? { left: `${between(2, 12).toFixed(1)}%` } : { right: `${between(2, 12).toFixed(1)}%` });

  const blobs = [0, 1, 2, 3].map((corner) => {
    const size = between(80, 170);
    const pos = {};
    if (corner === 0) {
      pos.top = -size * 0.4;
      pos.left = -size * 0.35;
    } else if (corner === 1) {
      pos.top = -size * 0.35;
      pos.right = -size * 0.3;
    } else if (corner === 2) {
      pos.bottom = -size * 0.35;
      pos.left = -size * 0.3;
    } else {
      pos.bottom = -size * 0.35;
      pos.right = -size * 0.3;
    }
    return { size, bg: pick(PASTELS), opacity: between(0.35, 0.55), ...pos };
  });

  const stars = Array.from({ length: 7 }).map(() => ({
    size: between(10, 20),
    top: `${between(2, 92).toFixed(1)}%`,
    ...edgePos(),
    bg: pick(PASTELS),
    rotate: between(-16, 16),
    bob: rand() > 0.4,
    delay: between(0, 1.2),
  }));

  const dots = Array.from({ length: 5 }).map(() => ({
    size: between(5, 9),
    top: `${between(2, 95).toFixed(1)}%`,
    ...edgePos(),
  }));

  const sparkles = Array.from({ length: 3 }).map(() => ({
    emoji: pick(SPARKLE_EMOJI),
    size: between(11, 15),
    top: `${between(5, 90).toFixed(1)}%`,
    ...edgePos(),
    rotate: between(-12, 12),
  }));

  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
      {blobs.map((b, i) => (
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

      {stars.map((s, i) => (
        <div
          key={"star" + i}
          style={{
            position: "absolute",
            width: s.size,
            height: s.size,
            top: s.top,
            left: s.left,
            right: s.right,
            background: s.bg,
            clipPath: STAR_CLIP,
            "--r": `${s.rotate}deg`,
            transform: s.bob ? undefined : `rotate(${s.rotate}deg)`,
            animation: s.bob ? "jkPageDecorBob 6.5s ease-in-out infinite" : undefined,
            animationDelay: s.bob ? `${s.delay}s` : undefined,
          }}
        />
      ))}

      {dots.map((d, i) => (
        <div
          key={"dot" + i}
          style={{
            position: "absolute",
            width: d.size,
            height: d.size,
            top: d.top,
            left: d.left,
            right: d.right,
            background: "#fff",
            opacity: 0.85,
            borderRadius: "50%",
          }}
        />
      ))}

      {sparkles.map((s, i) => (
        <div
          key={"sparkle" + i}
          style={{ position: "absolute", top: s.top, left: s.left, right: s.right, fontSize: s.size, transform: `rotate(${s.rotate}deg)` }}
        >
          {s.emoji}
        </div>
      ))}

      <style>{`@keyframes jkPageDecorBob { 0%,100%{transform:translateY(0) rotate(var(--r,0deg))} 50%{transform:translateY(-8px) rotate(var(--r,0deg))} }`}</style>
    </div>
  );
}
