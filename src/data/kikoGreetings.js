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
//
// Versi EN ditambah 2026-08-09 (user lapor bug: abis toggle EN, teks ini
// TETEP Bahasa Indonesia -- dulu SENGAJA di-skip dari scope translate UI
// karena dianggap "pool konten" kayak encouragement.js, tapi user nganggep
// ini bug, bukan out-of-scope, jadi di-translate juga). Isinya PADANAN
// makna (bukan translate kata-per-kata) tiap baris ID, urutan index HARUS
// sama biar `dayIndex % length` nunjuk ke pasangan yang related di 2
// bahasa -- keduanya WAJIB sama panjang (50).
const KIKO_GREETINGS_ID = [
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

const KIKO_GREETINGS_EN = [
  "Hi {name}, let's play again!",
  "Stay excited to learn today, {name}!",
  "{name}, you're a real class champion!",
  "Let's keep learning, {name}!",
  "{name}, ready to conquer new questions?",
  "Keep it up, {name}!",
  "{name}, let's collect some XP today!",
  "Kiko missed learning with {name}!",
  "{name}, what do you want to learn today?",
  "Keep going, {name}!",
  "{name}, you've got this!",
  "Come on {name}, time to be a champion!",
  "{name}, ready to play again?",
  "Kiko is waiting for {name}!",
  "{name}, let's learn together!",
  "Welcome back, {name}!",
  "{name}, a sharp mind needs practice!",
  "Let's go learn, {name}!",
  "{name}, you're almost a pro!",
  "Come on {name}, let's start a new adventure!",
  "{name}, don't forget to smile!",
  "Every day is a chance to learn, {name}!",
  "{name}, let's earn more stars today!",
  "You're awesome, {name}!",
  "{name}, get ready to be the smartest!",
  "Hi {name}, hope you have a great day!",
  "{name}, time to sharpen your brain!",
  "Let's try a new challenge, {name}!",
  "{name}, you've done great so far!",
  "Keep learning, {name}!",
  "{name}, one more question to be a champion!",
  "Kiko is ready to hang out with {name} today!",
  "{name}, don't give up!",
  "Come on {name}, your class is waiting!",
  "{name}, you make Kiko proud!",
  "New day, new energy, {name}!",
  "{name}, let's beat your XP record!",
  "You're amazing, {name}!",
  "{name}, let's start today's adventure!",
  "Learning is fun, {name}!",
  "{name}, let's discover something new!",
  "Good morning energy, {name}!",
  "{name}, ready to be the class star?",
  "Come on {name}, challenge yourself!",
  "{name}, keep sharpening your skills!",
  "Kiko misses playing with {name}!",
  "{name}, let's collect as many stars as you can!",
  "Stay confident, {name}!",
  "{name}, you're getting better every day!",
  "See you again, {name}! Let's learn!",
];

export const KIKO_GREETINGS = KIKO_GREETINGS_ID;

/** Template mentah (masih ada token "{name}") buat hari ini -- substitusi
 * nama dilakuin per-kata di KikoGreeting.jsx (biar {name} bisa di-render
 * sebagai span warna beda, bukan string biasa). `lang`: "id" | "en". */
export function greetingTemplateForToday(lang) {
  const pool = lang === "en" ? KIKO_GREETINGS_EN : KIKO_GREETINGS_ID;
  const dayIndex = Math.floor(Date.now() / 86400000) % pool.length;
  return pool[dayIndex];
}
