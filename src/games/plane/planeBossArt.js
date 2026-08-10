// SVG boss Plane Mode -- di-port PERSIS dari al-idrisi-games
// mathville/script.js (`PLANE_BOSS_SVGS` + `PLANE_BOSS_TYPES`), 2026-08-10.
// Gantiin boss emoji (🐉🦂👹🦑) yang dipakai sebelumnya: ukuran di layar
// sama, tapi sekarang kebaca sebagai "pesawat musuh gede di ujung wave",
// bukan makhluk random. Tiap siluet nyocokin perilaku boss-nya biar
// kebaca sekali lihat -- bomber (tebel), interceptor (cepet), gunship
// (lambat tapi nyakitin), delta (yang gerak angka-8), dst.
// SEMUA digambar nose-DOWN (ngadep ke pemain) -- beda dari pesawat pemain
// di `planeArt.jsx` yang nose-UP. Sengaja: mereka saling berhadapan.
//
// String (bukan komponen React) karena elemen boss dibikin lewat DOM
// manipulation langsung di PlaneMode.jsx (pola performa yang sama kayak
// bullet/musuh), jadi `el.innerHTML = ...` paling pas.
//
// Gak ada width/height di SVG-nya -- ukuran diatur dari satu tempat pas
// spawn, biar bisa di-scale tanpa nyentuh delapan gambar.
export const BOSS_SVGS = {
  // Heavy bomber -- sayap lurus lebar, ada pod mesin.
  bomber: `<svg viewBox="0 0 60 60" width="100%" height="100%">
      <path d="M3 28 L30 21 L57 28 L57 35 L30 31 L3 35 Z" fill="#C0392B" stroke="#6E1B12" stroke-width="2" stroke-linejoin="round"/>
      <rect x="10" y="26" width="8" height="11" rx="3.5" fill="#6E1B12"/>
      <rect x="42" y="26" width="8" height="11" rx="3.5" fill="#6E1B12"/>
      <path d="M19 9 L30 5 L41 9 L41 14 L30 11 L19 14 Z" fill="#A93226" stroke="#6E1B12" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M30 4 L37 18 L37 44 L30 56 L23 44 L23 18 Z" fill="#E74C3C" stroke="#6E1B12" stroke-width="2" stroke-linejoin="round"/>
      <ellipse cx="30" cy="41" rx="5" ry="7" fill="#FFE9A8" stroke="#6E1B12" stroke-width="1.5"/>
    </svg>`,
  // Interceptor -- sayap nyapu ke belakang, badan ramping.
  interceptor: `<svg viewBox="0 0 60 60" width="100%" height="100%">
      <path d="M5 16 L30 31 L55 16 L55 25 L30 41 L5 25 Z" fill="#8E44AD" stroke="#43206B" stroke-width="2" stroke-linejoin="round"/>
      <path d="M30 3 L36 17 L36 45 L30 57 L24 45 L24 17 Z" fill="#A96FD1" stroke="#43206B" stroke-width="2" stroke-linejoin="round"/>
      <rect x="26" y="6" width="8" height="7" rx="2.5" fill="#43206B"/>
      <ellipse cx="30" cy="40" rx="4.5" ry="6.5" fill="#EBDBF7" stroke="#43206B" stroke-width="1.5"/>
    </svg>`,
  // Gunship -- lambung berlapis tebel, 2 meriam samping.
  gunship: `<svg viewBox="0 0 60 60" width="100%" height="100%">
      <path d="M2 25 L30 19 L58 25 L58 38 L30 32 L2 38 Z" fill="#1E8449" stroke="#0B3D22" stroke-width="2" stroke-linejoin="round"/>
      <rect x="7" y="23" width="10" height="16" rx="4" fill="#0B3D22"/>
      <rect x="43" y="23" width="10" height="16" rx="4" fill="#0B3D22"/>
      <path d="M30 6 L39 20 L39 42 L30 54 L21 42 L21 20 Z" fill="#27AE60" stroke="#0B3D22" stroke-width="2" stroke-linejoin="round"/>
      <rect x="27" y="49" width="6" height="9" rx="2.5" fill="#0B3D22"/>
      <ellipse cx="30" cy="39" rx="5.5" ry="7" fill="#E8F8EF" stroke="#0B3D22" stroke-width="1.5"/>
    </svg>`,
  // Delta wing -- satu kepala panah gede.
  delta: `<svg viewBox="0 0 60 60" width="100%" height="100%">
      <path d="M30 56 L3 19 L14 13 L30 30 L46 13 L57 19 Z" fill="#1B9AAA" stroke="#0A4A53" stroke-width="2" stroke-linejoin="round"/>
      <path d="M30 3 L38 22 L34 47 L30 55 L26 47 L22 22 Z" fill="#4FC3D0" stroke="#0A4A53" stroke-width="2" stroke-linejoin="round"/>
      <ellipse cx="30" cy="36" rx="4.5" ry="6" fill="#E4F7FA" stroke="#0A4A53" stroke-width="1.5"/>
    </svg>`,
  // Twin-boom -- 2 batang ekor disambung tailplane.
  twinboom: `<svg viewBox="0 0 60 60" width="100%" height="100%">
      <rect x="10" y="8" width="40" height="6" rx="3" fill="#B9601B" stroke="#7A3B08" stroke-width="1.6"/>
      <rect x="9" y="10" width="8" height="34" rx="4" fill="#E8862E" stroke="#7A3B08" stroke-width="1.8"/>
      <rect x="43" y="10" width="8" height="34" rx="4" fill="#E8862E" stroke="#7A3B08" stroke-width="1.8"/>
      <path d="M6 28 L30 23 L54 28 L54 34 L30 30 L6 34 Z" fill="#D9741F" stroke="#7A3B08" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M30 10 L36 22 L36 42 L30 54 L24 42 L24 22 Z" fill="#F59B45" stroke="#7A3B08" stroke-width="2" stroke-linejoin="round"/>
      <ellipse cx="30" cy="38" rx="4.5" ry="6" fill="#FFF1DC" stroke="#7A3B08" stroke-width="1.5"/>
    </svg>`,
  // Flying wing -- gak ada badan terpisah, mesin nyatu di sayap.
  flyingwing: `<svg viewBox="0 0 60 60" width="100%" height="100%">
      <path d="M30 54 L2 30 L8 20 L22 26 L30 8 L38 26 L52 20 L58 30 Z" fill="#4C4C9D" stroke="#26264F" stroke-width="2" stroke-linejoin="round"/>
      <path d="M30 14 L35 28 L30 46 L25 28 Z" fill="#6E6EC7" stroke="#26264F" stroke-width="1.6" stroke-linejoin="round"/>
      <circle cx="14" cy="27" r="3" fill="#26264F"/>
      <circle cx="46" cy="27" r="3" fill="#26264F"/>
      <ellipse cx="30" cy="34" rx="4" ry="5.5" fill="#E3E3FA" stroke="#26264F" stroke-width="1.5"/>
    </svg>`,
  // Fighter -- ada canard di depan + sayap nyapu.
  fighter: `<svg viewBox="0 0 60 60" width="100%" height="100%">
      <path d="M7 20 L30 32 L53 20 L53 27 L30 42 L7 27 Z" fill="#C2185B" stroke="#6D0A31" stroke-width="2" stroke-linejoin="round"/>
      <path d="M17 40 L30 44 L43 40 L43 45 L30 49 L17 45 Z" fill="#AD1457" stroke="#6D0A31" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M30 3 L36 18 L35 44 L30 57 L25 44 L24 18 Z" fill="#E04A85" stroke="#6D0A31" stroke-width="2" stroke-linejoin="round"/>
      <rect x="27" y="5" width="6" height="6" rx="2" fill="#6D0A31"/>
      <ellipse cx="30" cy="36" rx="4.2" ry="6" fill="#FCE4EC" stroke="#6D0A31" stroke-width="1.5"/>
    </svg>`,
  // Rocket plane -- badan sempit, thruster gede di belakang.
  rocket: `<svg viewBox="0 0 60 60" width="100%" height="100%">
      <path d="M12 30 L30 24 L48 30 L48 36 L30 31 L12 36 Z" fill="#C98A12" stroke="#6B4405" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M20 6 L27 14 L27 6 Z" fill="#6B4405"/>
      <path d="M40 6 L33 14 L33 6 Z" fill="#6B4405"/>
      <path d="M30 4 L37 20 L37 42 L30 56 L23 42 L23 20 Z" fill="#F0B429" stroke="#6B4405" stroke-width="2" stroke-linejoin="round"/>
      <rect x="24" y="3" width="12" height="7" rx="3" fill="#8A5A08" stroke="#6B4405" stroke-width="1.4"/>
      <ellipse cx="30" cy="38" rx="4.5" ry="6.5" fill="#FFF6DF" stroke="#6B4405" stroke-width="1.5"/>
    </svg>`,
};

// 8 boss (al-idrisi juga 8, naik dari 4) -- siklusnya `bossesDefeated %
// length`, jadi 1 run panjang nampilin kedelapan-delapannya dulu sebelum
// ada yang keulang. Multiplier dipake ke BASE di PlaneMode.jsx, bukan
// angka absolut, biar tuning dasar cukup diubah di satu tempat.
export const BOSS_TYPES = [
  { svg: "bomber", hpMult: 1.0, speedMult: 1.0, fireMult: 1.0, move: "bounce" },
  { svg: "interceptor", hpMult: 0.85, speedMult: 1.4, fireMult: 0.7, move: "bounce" },
  { svg: "gunship", hpMult: 1.3, speedMult: 0.6, fireMult: 1.3, move: "bounce" },
  { svg: "delta", hpMult: 1.0, speedMult: 1.0, fireMult: 0.9, move: "figure8" },
  { svg: "twinboom", hpMult: 1.15, speedMult: 0.9, fireMult: 0.85, move: "bounce" },
  { svg: "flyingwing", hpMult: 0.95, speedMult: 1.2, fireMult: 1.1, move: "figure8" },
  { svg: "fighter", hpMult: 0.9, speedMult: 1.5, fireMult: 0.75, move: "bounce" },
  { svg: "rocket", hpMult: 1.25, speedMult: 0.7, fireMult: 1.2, move: "figure8" },
];

export const BOSS_PX = 84; // ukuran gambar boss di layar
// Hitbox boss harus nyaris sebesar gambarnya -- kalau enggak, peluru
// keliatan nembus badan boss tanpa kena. 84px/2 = 42px radius, dibagi
// HIT_RADIUS_PX (22) ~= 1.9.
export const BOSS_HIT_MULT = 1.9;
