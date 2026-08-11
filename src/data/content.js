export const GRADE_COLORS = [
  { bg: "var(--pastel-pink)", ink: "var(--ink-on-pink)" },
  { bg: "var(--pastel-blue)", ink: "var(--ink-on-blue)" },
  { bg: "var(--pastel-green)", ink: "var(--ink-on-green)" },
  { bg: "var(--pastel-gold)", ink: "var(--ink-900)" },
  { bg: "var(--pastel-purple)", ink: "var(--ink-on-purple)" },
  { bg: "var(--pastel-magenta)", ink: "var(--ink-on-pink)" },
];

export const GRADES = Array.from({ length: 6 }).map((_, i) => {
  const c = GRADE_COLORS[i];
  return { n: i + 1, bg: c.bg, ink: c.ink, offset: i % 2 === 0 ? -34 : 34 };
});

// 6 mata pelajaran (bukan 7) -- IPA & IPS digabung jadi satu card "IPAS", sesuai
// Kurikulum Merdeka asli (buku IPAS gabungan sejak kelas 3; kelas 1-2 tematik).
// Diputuskan bareng user setelah nemu mismatch antara wireframe (7 card) dan
// struktur kurikulum asli (IPA+IPS udah merger).
export const SUBJECTS = [
  { id: "matematika", name: "Matematika", sub: "Angka & hitung-hitungan", emoji: "🔢", accent: "wood", rotate: -1 },
  { id: "ipas", name: "IPAS", sub: "Ilmu Pengetahuan Alam & Sosial", emoji: "🔬", accent: "science", rotate: 1 },
  { id: "ppkn", name: "PPKn", sub: "Pendidikan Pancasila", emoji: "🇮🇩", accent: "focus", rotate: -1 },
  { id: "pai", name: "Pendidikan Agama Islam", sub: "Belajar nilai & akhlak", emoji: "🕌", accent: "lang", rotate: 1 },
  { id: "bindo", name: "Bahasa Indonesia", sub: "Membaca & menulis", emoji: "📖", accent: "town", rotate: -1 },
  { id: "binggris", name: "Bahasa Inggris", sub: "English fun time", emoji: "🔤", accent: "math", rotate: 1 },
];

// Dipake ParentPortal/TopicPicker buat ngasih warna `--product-{accent}` per
// subject ke topic badge/pill -- reuse token yang sama kayak GameCard biar
// konsisten, gak bikin palet baru.
export const ACCENT_BY_SUBJECT = Object.fromEntries(SUBJECTS.map((s) => [s.id, s.accent]));

// Dummy topik contoh (Matematika Kelas 4) -- nanti diganti sumber data asli
// dari content-pipeline/output/matematika/kelas_4.json.
export const SAMPLE_TOPICS = [
  { name: "Perkalian & Pembagian", icon: "✅", status: "Selesai", chipColor: "green", bg: "var(--cream-100)", opacity: 1 },
  { name: "Pecahan", icon: "✅", status: "Selesai", chipColor: "green", bg: "var(--cream-100)", opacity: 1 },
  { name: "Bangun Datar", icon: "▶️", status: "Lanjut", chipColor: "blue", bg: "var(--pastel-blue)", opacity: 1 },
  { name: "Pengukuran", icon: "🔒", status: "Terkunci", chipColor: "gold", bg: "var(--cream-100)", opacity: 0.55 },
  { name: "Data & Diagram", icon: "🔒", status: "Terkunci", chipColor: "gold", bg: "var(--cream-100)", opacity: 0.55 },
];
