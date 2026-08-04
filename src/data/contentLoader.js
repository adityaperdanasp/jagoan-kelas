// Lazy-loaded per kelas biar Vite code-split -- gak perlu bundle 42 kombinasi sekaligus.
const modules = import.meta.glob("./content/*/kelas_*.json");

const SUBJECTS_WITH_CONTENT = ["matematika", "ipas", "ppkn"];

export function hasContent(subjectId) {
  return SUBJECTS_WITH_CONTENT.includes(subjectId);
}

/**
 * Return normalized list of "topik" (satu bab/topik = satu baris di layar Detail
 * Pelajaran) buat subjectId+grade tertentu. null kalau belum ada datanya.
 * Status (locked/current/done) dihitung default: bab pertama = current, sisanya locked
 * -- belum ada progress tracking asli, itu nanti nyambung ke backend/Firebase.
 */
export async function loadTopics(subjectId, grade) {
  if (!hasContent(subjectId)) return null;
  const path = `./content/${subjectId}/kelas_${grade}.json`;
  const importer = modules[path];
  if (!importer) return null;
  const mod = await importer();
  const data = mod.default;

  let raw;
  if (data.semester) {
    raw = data.semester.flatMap((s) =>
      s.bab.map((b) => ({ key: `bab-${b.nomor_bab}`, title: b.judul_bab, soalCount: b.soal.length }))
    );
  } else if (data.topik) {
    raw = data.topik.map((t, i) => ({ key: `topik-${i}`, title: t.nama_topik, soalCount: t.soal.length }));
  } else {
    return null;
  }

  return raw.map((t, i) => {
    if (i === 0) return { ...t, status: "current" };
    return { ...t, status: "locked" };
  });
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
