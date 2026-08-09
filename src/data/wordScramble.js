// "Susun Kata" -- mini-game scramble kalimat, DIPAKE BARENG Bindo & Binggris
// (2026-08-09, user: "gameplay apa yang harus gw kembangin buat bahasa
// indonesia dan bahasa inggris agar lebih menarik, ga static aja" -> milih
// bikin 1 komponen reusable ketimbang 2 mekanik beda, biar kerjaan gak
// dobel -- pola sama kayak Dino Bridge/Focus Round yang juga lintas-subject).
// Kalimat SENGAJA pendek (5 kata) & susunan SVO alami biar cuma ada 1 urutan
// yang masuk akal (hindari ambiguitas "kalimat lain juga valid").
export const SENTENCES = {
  bindo: [
    "Aku suka membaca buku cerita",
    "Ibu memasak nasi goreng enak",
    "Adik bermain bola di taman",
    "Kami belajar bahasa Indonesia bersama",
    "Kucing itu tidur di sofa",
    "Ayah pergi bekerja setiap pagi",
    "Kakak menulis surat untuk sahabat",
    "Burung berkicau merdu di pohon",
    "Kita harus menjaga kebersihan lingkungan",
    "Guru mengajar dengan penuh semangat",
  ],
  binggris: [
    "I like to read books",
    "She is my best friend",
    "We go to school together",
    "The cat sleeps on the sofa",
    "My mother cooks delicious food",
    "He plays football in the park",
    "They study English every day",
    "Birds sing sweetly in trees",
    "We must keep our environment clean",
    "The teacher explains the lesson clearly",
  ],
};
