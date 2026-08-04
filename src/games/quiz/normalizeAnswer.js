// Perbandingan jawaban short_answer -- trim + lowercase + rapihin spasi.
// Anak nulis "40 " atau "Herbivora" harus tetep kehitung benar.
export function answersMatch(given, correct) {
  const norm = (s) =>
    String(s ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  return norm(given) === norm(correct);
}
