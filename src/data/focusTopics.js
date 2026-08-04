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

/** Semua topik yang ADA kontennya, lintas subject x kelas 1-6, buat picker. */
export async function loadAllFocusTopics() {
  const jobs = [];
  for (const subj of CONTENT_SUBJECTS) {
    for (const grade of GRADES) {
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
