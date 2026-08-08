// 50 template sapaan harian buat KikoGreeting.jsx -- konsepnya di-port dari
// al-idrisi-games (`index.html` SC_GREETINGS, cari `sc-greeting` di
// `style.css`/`index.html`): 1 template kepilih per hari (index = hari
// epoch % panjang array, GANTI OTOMATIS tiap hari gonta-ganti kalender,
// bukan random tiap reload/refresh), "{name}" jadi token sendiri biar bisa
// di-highlight warna beda kayak sumbernya. BEDA dari sumbernya: cuma 5
// template di BrainBox, di sini 50 (permintaan user "bikin 50 template
// buat di ganti2 tiap hari" -- 50 hari muter dulu baru keulang, BUKAN
// translate literal 5 punya BrainBox, ditulis dari nol Bahasa Indonesia
// sesuai suara app ini).
export const KIKO_GREETINGS = [
  "Hai {name}, ayo main lagi!",
  "Semangat belajar hari ini, {name}!",
  "{name}, kamu jagoan kelas beneran nih!",
  "Yuk lanjut belajar, {name}!",
  "{name}, siap taklukin soal baru?",
  "Hebat terus ya, {name}!",
  "{name}, ayo kumpulin XP hari ini!",
  "Kangen belajar bareng {name} nih!",
  "{name}, hari ini mau belajar apa?",
  "Terus semangat, {name}!",
  "{name}, kamu pasti bisa!",
  "Ayo {name}, waktunya jadi jagoan!",
  "{name}, sudah siap main lagi?",
  "Kiko nungguin {name} nih!",
  "{name}, mari kita belajar bareng!",
  "Selamat datang lagi, {name}!",
  "{name}, otak encer butuh latihan terus!",
  "Gaskeun belajar, {name}!",
  "{name}, sedikit lagi jadi jago!",
  "Yuk {name}, kita mulai petualangan baru!",
  "{name}, jangan lupa senyum ya!",
  "Setiap hari kesempatan belajar, {name}!",
  "{name}, ayo tambah bintang hari ini!",
  "Kamu keren, {name}!",
  "{name}, siap-siap jadi paling pintar!",
  "Hai {name}, semoga harimu menyenangkan!",
  "{name}, waktunya asah otak!",
  "Mari coba tantangan baru, {name}!",
  "{name}, kamu sudah hebat sejauh ini!",
  "Terus belajar ya, {name}!",
  "{name}, satu soal lagi jadi jagoan!",
  "Kiko siap nemenin {name} hari ini!",
  "{name}, jangan menyerah ya!",
  "Ayo {name}, kelasmu menunggu!",
  "{name}, kamu bikin Kiko bangga!",
  "Hari baru, semangat baru, {name}!",
  "{name}, yuk cetak rekor XP baru!",
  "Kamu luar biasa, {name}!",
  "{name}, mari mulai petualangan hari ini!",
  "Belajar itu seru, {name}!",
  "{name}, ayo kita cari tahu hal baru!",
  "Semangat pagi, {name}!",
  "{name}, siap jadi bintang kelas?",
  "Yuk {name}, tantang dirimu sendiri!",
  "{name}, terus asah kemampuanmu!",
  "Kiko kangen main bareng {name}!",
  "{name}, ayo raih bintang sebanyak-banyaknya!",
  "Percaya diri ya, {name}!",
  "{name}, kamu makin jago tiap hari!",
  "Sampai jumpa lagi, {name}! Ayo belajar!",
];

/** Template mentah (masih ada token "{name}") buat hari ini -- substitusi
 * nama dilakuin per-kata di KikoGreeting.jsx (biar {name} bisa di-render
 * sebagai span warna beda, bukan string biasa). */
export function greetingTemplateForToday() {
  const dayIndex = Math.floor(Date.now() / 86400000) % KIKO_GREETINGS.length;
  return KIKO_GREETINGS[dayIndex];
}
