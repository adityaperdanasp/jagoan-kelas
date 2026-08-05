// Lazy-loaded per kelas biar Vite code-split -- gak perlu bundle 42 kombinasi sekaligus.
const modules = import.meta.glob("./content/*/kelas_*.json");

const SUBJECTS_WITH_CONTENT = ["matematika", "ipas", "ppkn", "binggris", "bindo", "pai"];

export function hasContent(subjectId) {
  return SUBJECTS_WITH_CONTENT.includes(subjectId);
}

/** Daftar topik MENTAH (tanpa status locked/current/done -- itu dihitung
 * terpisah di progressService dari data progress asli), termasuk soal-nya
 * penuh (dipakai TopicQuiz/FocusRound). null kalau belum ada datanya. */
export async function loadRawTopics(subjectId, grade) {
  if (!hasContent(subjectId)) return null;
  const path = `./content/${subjectId}/kelas_${grade}.json`;
  const importer = modules[path];
  if (!importer) return null;
  const mod = await importer();
  const data = mod.default;

  if (data.semester) {
    return data.semester.flatMap((s) =>
      s.bab.map((b) => ({ key: `bab-${b.nomor_bab}`, title: b.judul_bab, soal: b.soal }))
    );
  }
  if (data.topik) {
    return data.topik.map((t, i) => ({ key: `topik-${i}`, title: t.nama_topik, soal: t.soal }));
  }
  return null;
}

export async function loadTopicByKey(subjectId, grade, babKey) {
  const topics = await loadRawTopics(subjectId, grade);
  return topics?.find((t) => t.key === babKey) || null;
}

export function statusDisplay(status) {
  switch (status) {
    case "done":
      return { icon: "✅", label: "Selesai", chipColor: "green", bg: "var(--cream-100)", opacity: 1 };
    case "current":
      return { icon: "▶️", label: "Lanjut", chipColor: "blue", bg: "var(--pastel-blue)", opacity: 1 };
    default:
      return { icon: "🔒", label: "Terkunci", chipColor: "gold", bg: "var(--cream-100)", opacity: 0.55 };
  }
}
