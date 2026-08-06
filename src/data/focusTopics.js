import { hasContent, loadRawTopics } from "./contentLoader";
import { SUBJECTS } from "./content";

const CONTENT_SUBJECTS = SUBJECTS.filter((s) => hasContent(s.id));
const GRADES = [1, 2, 3, 4, 5, 6];

/** topicId global unik buat Focus Round picker/assignedTopics: "subject:grade:babKey" */
export function topicId(subject, grade, babKey) {
  return `${subject}:${grade}:${babKey}`;
}

export function parseTopicId(id) {
  const [subject, grade, babKey] = id.split(":");
  return { subject, grade, babKey };
}

async function loadFocusTopicsForGrades(grades) {
  const jobs = [];
  for (const subj of CONTENT_SUBJECTS) {
    for (const grade of grades) {
      jobs.push(
        loadRawTopics(subj.id, grade).then((raw) => ({ subj, grade, raw: raw || [] }))
      );
    }
  }
  const results = await Promise.all(jobs);
  return results
    .filter((r) => r.raw.length > 0)
    .map((r) => ({
      subjectId: r.subj.id,
      subjectName: r.subj.name,
      subjectEmoji: r.subj.emoji,
      grade: r.grade,
      topics: r.raw.map((t) => ({ id: topicId(r.subj.id, r.grade, t.key), title: t.title })),
    }));
}

/** Semua topik yang ADA kontennya, lintas subject x kelas 1-6 -- dipake ParentPortal
 * (orang tua boleh assign topik dari kelas manapun, gak dibatasin ke 1 kelas). */
export function loadAllFocusTopics() {
  return loadFocusTopicsForGrades(GRADES);
}

/** Topik 1 kelas doang, lintas subject -- dipake FocusRoundPicker (2026-08-06,
 * dipindah ke per-kelas dari `/kelas/:grade/fokus` biar list-nya gak segede
 * lintas 6 kelas x 6 subject, kepanjangan buat di-scroll anak). */
export function loadFocusTopicsForGrade(grade) {
  return loadFocusTopicsForGrades([Number(grade)]);
}
