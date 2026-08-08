// "Kata Hari Ini" + "Fakta Menarik" buat BindoStorybookTrail.jsx -- port
// KONSEP dari azkacraft (info-card "Word of the Day"/"Fun Fact" di layar
// landing-nya, lihat index.html #word-of-day-text/#fun-fact-text), TAPI
// isinya ditulis dari nol Bahasa Indonesia (bukan translate 300 entri
// mereka) -- pola rotasi harian SAMA PERSIS kayak kikoGreetings.js
// (dayIndex = hari epoch % panjang array, ganti tiap pergantian hari
// kalender, bukan random tiap reload).
export const WORD_OF_DAY = [
  { word: "Gigih", meaning: "terus berusaha meski susah" },
  { word: "Riang", meaning: "sangat gembira" },
  { word: "Cendekia", meaning: "orang yang pintar dan berilmu" },
  { word: "Lestari", meaning: "tetap terjaga, tidak berubah/rusak" },
  { word: "Waspada", meaning: "berhati-hati menghadapi bahaya" },
  { word: "Kreatif", meaning: "punya daya cipta yang baru" },
  { word: "Mandiri", meaning: "bisa berdiri sendiri, tidak bergantung orang lain" },
  { word: "Bijaksana", meaning: "selalu menggunakan akal budinya" },
  { word: "Antusias", meaning: "penuh semangat, bergairah" },
  { word: "Peduli", meaning: "memperhatikan / menghiraukan" },
  { word: "Teliti", meaning: "cermat dan hati-hati" },
  { word: "Sederhana", meaning: "bersahaja, tidak berlebihan" },
  { word: "Optimis", meaning: "selalu berpengharapan baik" },
  { word: "Tekun", meaning: "rajin dan bersungguh-sungguh" },
  { word: "Jujur", meaning: "berkata apa adanya, tidak bohong" },
  { word: "Kompak", meaning: "bersatu padu, erat" },
  { word: "Berani", meaning: "punya hati mantap dan rasa percaya diri" },
  { word: "Ramah", meaning: "baik hati dan menarik budi bahasanya" },
  { word: "Cerdik", meaning: "cepat mengerti, banyak akal" },
  { word: "Setia", meaning: "berpegang teguh pada janji" },
  { word: "Terampil", meaning: "cakap dalam menyelesaikan tugas" },
  { word: "Penasaran", meaning: "ingin tahu sekali" },
  { word: "Rukun", meaning: "baik dan damai, tidak bertengkar" },
  { word: "Hemat", meaning: "berhati-hati dalam membelanjakan sesuatu" },
  { word: "Disiplin", meaning: "taat pada aturan" },
  { word: "Imajinatif", meaning: "mempunyai daya khayal yang kuat" },
  { word: "Toleransi", meaning: "sikap menghargai perbedaan" },
  { word: "Empati", meaning: "ikut merasakan apa yang dirasakan orang lain" },
  { word: "Semangat", meaning: "kekuatan/dorongan untuk terus berjuang" },
  { word: "Solutif", meaning: "mampu memberi jalan keluar" },
];

export const FUN_FACT = [
  "Lautan menutupi lebih dari 70% permukaan Bumi kita!",
  "Madu gak pernah basi, lho — bisa disimpan ribuan tahun.",
  "Gajah adalah satu-satunya hewan yang gak bisa melompat.",
  "Jantung paus biru sebesar mobil kecil!",
  "Indonesia punya lebih dari 17.000 pulau.",
  "Bunglon berganti warna buat mengatur suhu tubuh, bukan cuma buat sembunyi.",
  "Satu awan bisa memiliki berat lebih dari 1 juta kilogram.",
  "Komodo cuma bisa ditemukan di Indonesia.",
  "Bintang laut gak punya otak sama sekali.",
  "Bulu burung unta lebih besar dari matanya.",
  "Batik Indonesia diakui UNESCO sebagai Warisan Budaya Dunia.",
  "Kelelawar adalah satu-satunya mamalia yang bisa terbang beneran.",
  "Candi Borobudur adalah candi Buddha terbesar di dunia.",
  "Semut bisa mengangkat beban 50 kali berat badannya sendiri.",
  "Air bisa berbentuk padat, cair, dan gas — semuanya H2O.",
  "Orangutan berbagi sekitar 97% DNA dengan manusia.",
  "Danau Toba adalah danau vulkanik terbesar di dunia.",
  "Jerapah tidur cuma sekitar 2 jam sehari.",
  "Kupu-kupu merasakan rasa manis pakai kakinya.",
  "Cahaya matahari butuh sekitar 8 menit buat sampai ke Bumi.",
  "Burung cendrawasih yang indah berasal dari Papua.",
  "Hiu sudah ada di Bumi lebih lama dari pohon!",
  "Ubur-ubur sudah ada sejak sebelum dinosaurus.",
  "Sungai Amazon menghasilkan lebih banyak oksigen dari hutan mana pun.",
  "Gunung Rinjani punya danau kawah berwarna biru kehijauan.",
  "Lebah bisa mengenali wajah manusia.",
  "Reog Ponorogo memakai topeng yang beratnya bisa lebih dari 50 kg.",
  "Tulang manusia lebih kuat dari beton jika dibandingkan beratnya.",
  "Angklung adalah alat musik Jawa Barat yang terbuat dari bambu.",
  "Penguin bisa melompat setinggi hampir 2 meter dari air.",
];

export function wordOfDayForToday() {
  const dayIndex = Math.floor(Date.now() / 86400000) % WORD_OF_DAY.length;
  return WORD_OF_DAY[dayIndex];
}

export function funFactForToday() {
  const dayIndex = Math.floor(Date.now() / 86400000) % FUN_FACT.length;
  return FUN_FACT[dayIndex];
}
