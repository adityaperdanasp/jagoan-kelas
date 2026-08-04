// Soal kilat buat Drive Mode / Plane Mode -- grade-aware (beda dari
// generators_matematika.py yang per-bab kurikulum), rentang angka
// disesuaikan per kelas, gaya sama kayak BrainBox mathville generators.js
// (jawaban dihitung, MC dengan distractor "jitter" di sekitar jawaban benar).

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function choice(arr) {
  return arr[rand(0, arr.length - 1)];
}
function fmt(n) {
  return n.toLocaleString("en-US");
}

// Rentang angka & operasi yang "wajar" per kelas, kasar tapi cukup buat
// soal kilat (bukan soal kurikulum resmi per bab).
const GRADE_RANGES = {
  1: { max: 20, ops: ["+", "-"] },
  2: { max: 100, ops: ["+", "-", "x"] },
  3: { max: 1000, ops: ["+", "-", "x", ":"] },
  4: { max: 10000, ops: ["+", "-", "x", ":"] },
  5: { max: 100000, ops: ["+", "-", "x", ":"] },
  6: { max: 1000000, ops: ["+", "-", "x", ":"] },
};

const DIFFICULTY_SCALE = { easy: 0.3, medium: 0.6, hard: 1 };

function buildMcOptions(correct) {
  const options = new Set([correct]);
  let guard = 0;
  while (options.size < 4 && guard++ < 40) {
    const magnitude = Math.max(1, Math.round(Math.abs(correct) * (0.1 + Math.random() * 0.3)));
    const cand = correct + magnitude * (Math.random() < 0.5 ? -1 : 1);
    if (cand >= 0 && cand !== correct) options.add(cand);
  }
  let bump = 1;
  while (options.size < 4) options.add(correct + bump++);
  const arr = [...options].sort(() => Math.random() - 0.5);
  return arr.map(fmt);
}

/** Generate 1 soal MC kilat buat kelas+difficulty tertentu. */
export function generateQuickQuestion(grade, difficulty = "medium") {
  const range = GRADE_RANGES[grade] || GRADE_RANGES[4];
  const scale = DIFFICULTY_SCALE[difficulty] || 0.6;
  const max = Math.max(5, Math.round(range.max * scale));
  const op = choice(range.ops);

  let a, b, correct, prompt;
  if (op === "+") {
    a = rand(1, max);
    b = rand(1, max);
    correct = a + b;
    prompt = `${fmt(a)} + ${fmt(b)} = ...`;
  } else if (op === "-") {
    a = rand(1, max);
    b = rand(0, a);
    correct = a - b;
    prompt = `${fmt(a)} - ${fmt(b)} = ...`;
  } else if (op === "x") {
    const factorMax = Math.max(2, Math.round(Math.sqrt(max)));
    a = rand(2, factorMax);
    b = rand(2, factorMax);
    correct = a * b;
    prompt = `${fmt(a)} x ${fmt(b)} = ...`;
  } else {
    b = rand(2, Math.max(2, Math.round(Math.sqrt(max))));
    correct = rand(2, Math.max(2, Math.round(Math.sqrt(max))));
    a = b * correct;
    prompt = `${fmt(a)} : ${fmt(b)} = ...`;
  }

  return { prompt, options: buildMcOptions(correct), correctLabel: fmt(correct) };
}
