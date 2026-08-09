// Koleksi frasa Inggris (2026-08-09) -- ngisi slot yang ditinggal Dino
// Bridge pas dicabut dari Bahasa Inggris ("dino bridge delete dari bahasa
// inggris"), sekarang dipake buat reward kecil tiap bab selesai: 1 kartu
// frasa+arti nongol per stempel paspor yang udah didapet (`BinggrisWorldMap.
// jsx`). Generic pool di-cycle by index (bukan 1:1 sama isi bab per kelas,
// jumlah bab beda-beda tiap kelas) -- pola sama kayak `ppknDilemmas.js`/
// `bindoTrivia.js`. Tema travel, nyambung sama konsep "Kiko's World Tour".
export const PHRASES = [
  { phrase: "Where is the airport?", meaning: "Di mana bandara?" },
  { phrase: "How much does this cost?", meaning: "Berapa harganya?" },
  { phrase: "Nice to meet you!", meaning: "Senang bertemu denganmu!" },
  { phrase: "Can you help me, please?", meaning: "Bisa bantu aku?" },
  { phrase: "What time is it?", meaning: "Jam berapa sekarang?" },
  { phrase: "I would like some water", meaning: "Aku mau minum air" },
  { phrase: "See you tomorrow!", meaning: "Sampai jumpa besok!" },
  { phrase: "Have a safe trip!", meaning: "Semoga perjalanannya aman!" },
];

export function phraseForIndex(i) {
  return PHRASES[i % PHRASES.length];
}
