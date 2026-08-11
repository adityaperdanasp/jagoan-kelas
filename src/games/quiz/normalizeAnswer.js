// Perbandingan jawaban short_answer -- BUKAN exact-match string lagi
// (2026-08-11, request eksplisit user: "soal isian dari kamu suka salah
// ketik aja dianggap salah"). 3 lapis toleransi:
//
// 1. Jawaban di data kadang nyimpen BEBERAPA alternatif sah dipisah "/"
//    (mis. "Tulang/rangka", "Tidak sadar/involunter") ATAU bentuk tambahan
//    dalam kurung (mis. "6 (enam)") -- SEBELUMNYA dibandingin sebagai 1
//    string utuh literal ("tulang/rangka"), jadi anak yang jawab cuma salah
//    satu bagiannya ("Tulang" doang) kehitung SALAH padahal itu jawaban
//    yang valid -- bug beneran, bukan cuma soal typo. Sekarang dipecah jadi
//    beberapa kandidat, cocok SALAH SATU aja dianggap benar.
// 2. Jawaban angka dibandingin sebagai NILAI (parseFloat), bukan string --
//    "07"/"7.0"/"7" semua kehitung sama kayak "7".
// 3. Jawaban kata (BUKAN angka) ditoleransi typo kecil (Levenshtein
//    distance <=1 buat kata >=4 huruf). Angka SENGAJA gak ditoleransi sama
//    sekali -- jarak-edit "6" ke "5" itu juga 1, tapi itu JAWABAN BEDA,
//    bukan typo, jadi harus exact.
function normalizeText(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:]+$/g, "")
    .replace(/\s+/g, " ");
}

function candidatesFor(correct) {
  const parts = new Set();
  String(correct ?? "")
    .split("/")
    .forEach((seg) => {
      const trimmed = seg.trim();
      if (!trimmed) return;
      parts.add(trimmed);
      const m = trimmed.match(/^(.*?)\s*\((.*?)\)\s*$/);
      if (m) {
        if (m[1].trim()) parts.add(m[1].trim());
        if (m[2].trim()) parts.add(m[2].trim());
      }
    });
  return [...parts];
}

function isNumeric(s) {
  return /^-?\d+([.,]\d+)?$/.test(s);
}

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function oneMatches(given, candidate) {
  const g = normalizeText(given);
  const c = normalizeText(candidate);
  if (!g || !c) return g === c;
  if (g === c) return true;
  const gNum = isNumeric(g);
  const cNum = isNumeric(c);
  if (gNum && cNum) return parseFloat(g.replace(",", ".")) === parseFloat(c.replace(",", "."));
  if (gNum || cNum) return false;
  const tolerance = Math.max(g.length, c.length) >= 4 ? 1 : 0;
  return levenshtein(g, c) <= tolerance;
}

export function answersMatch(given, correct) {
  return candidatesFor(correct).some((c) => oneMatches(given, c));
}
