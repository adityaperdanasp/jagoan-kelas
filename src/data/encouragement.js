// Pesan semangat random -- SENGAJA gak pakai nama anak (beda dari "Kirim
// Pesan" Parent Portal yang personal). Ini pola umum/generic, ditampilin di
// layar hasil TopicQuiz & FocusRoundQuiz biar berasa lebih hidup dari cuma
// angka skor. Dipilih random per accuracy tier -- BUKAN AI-generated (lihat
// AI Tutor terpisah kalau butuh feedback yang beneran ngerti konteks soal).

const HIGH = [
  "Keren banget! Kamu jagoan kelas hari ini! 🌟",
  "Mantap jiwa! Terus dipertahankan ya! 🎉",
  "Wah, jago banget! Lanjutkan semangatnya!",
  "Top markotop! Otak kamu lagi encer nih!",
  "Luar biasa! Kamu emang jagoannya!",
];

const MID = [
  "Bagus! Sedikit lagi jadi jagoan sejati! 💪",
  "Oke banget! Terus asah biar makin jago!",
  "Good job! Latihan bikin makin mantap!",
  "Lumayan keren nih, ayo terus semangat!",
  "Kerja bagus! Sedikit lagi sempurna!",
];

const LOW = [
  "Gapapa, yang penting udah coba! Ayo lagi! 💪",
  "Santai, semua jagoan pernah salah kok. Coba lagi ya!",
  "Terus semangat! Latihan bikin makin jago!",
  "Gak apa-apa, besok pasti lebih jago!",
  "Jangan menyerah, kamu pasti bisa lebih baik!",
];

/** accuracy: 0..1. Pilih random 1 pesan sesuai tier. */
export function pickEncouragement(accuracy) {
  const pool = accuracy >= 0.8 ? HIGH : accuracy >= 0.5 ? MID : LOW;
  return pool[Math.floor(Math.random() * pool.length)];
}
