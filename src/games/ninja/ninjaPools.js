import { loadRawTopics } from "../../data/contentLoader";
import { topicId } from "../../data/focusTopics";

// 3 kartu subject Ninja Runner: MATH pakai generator prosedural (quickQuestion.js,
// sama kayak Drive/Plane Mode), LANG & ARTS gabungan Bahasa Indonesia+Inggris,
// SCIENCE dari IPAS -- padanan Jagoan Kelas buat 3 kategori BrainBox (Math/
// Language & Arts/Science dari mathville/azkacraft/azkauniverse). Cuma tipe
// multiple_choice yang dicampur (sama kayak BrainBox motong short_answer dari
// cross-subject pool-nya) biar gak butuh generate distractor buat soal isian.
export async function loadNinjaPools(grade) {
  const [bindo, binggris, ipas] = await Promise.all([
    loadRawTopics("bindo", grade),
    loadRawTopics("binggris", grade),
    loadRawTopics("ipas", grade),
  ]);

  function flatten(subjectId, raw) {
    if (!raw) return [];
    const out = [];
    raw.forEach((t) => {
      t.soal.forEach((q) => {
        if (q.type !== "multiple_choice") return;
        out.push({ ...q, _topicId: topicId(subjectId, grade, t.key) });
      });
    });
    return out;
  }

  return {
    lang: [...flatten("bindo", bindo), ...flatten("binggris", binggris)],
    sci: flatten("ipas", ipas),
  };
}

/** Ambil 1 soal random dari pool, prioritas match difficulty -- fallback ke
 * pool penuh kalau gak ada yang match (biar gak pernah stuck/kosong). */
export function pickFromPool(pool, difficulty) {
  if (!pool || !pool.length) return null;
  const byDiff = pool.filter((q) => q.difficulty === difficulty);
  const source = byDiff.length ? byDiff : pool;
  const q = source[Math.floor(Math.random() * source.length)];
  return { prompt: q.question, options: q.options, correctLabel: q.answer, _topicId: q._topicId };
}
