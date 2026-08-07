import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { increment } from "firebase/firestore";

// Schema: players/{id}.progress.{subject}.{grade}.{babKey} =
//   { status: "done", stars: 0-3, xp, correct, wrong, lastAt }
// "status" cuma pernah ditulis "done" (locked/current dihitung ULANG pas
// baca, bukan disimpen -- lihat computeStatuses) biar gak ada 2 sumber
// kebenaran yang bisa out-of-sync.

/** Nambah XP total player TANPA nyentuh progress per-topik apapun -- dipake
 * mode kayak Ninja Runner yang nulis topicStats sendiri per topik (xpEarned:0
 * di tiap panggilan recordFocusRoundAttempt) terus nambahin XP totalnya
 * sekali di sini, biar gak dobel-hitung. */
export async function addXp(playerId, xpEarned) {
  if (!xpEarned) return;
  await updateDoc(doc(db, "players", playerId), { xp: increment(xpEarned) });
}

export async function getSubjectProgress(playerId, subject, grade) {
  const snap = await getDoc(doc(db, "players", playerId));
  if (!snap.exists()) return {};
  return snap.data().progress?.[subject]?.[String(grade)] || {};
}

/** Gabungin daftar topik mentah (dari contentLoader) sama progress asli
 * jadi status locked/current/done -- bab pertama yang BELUM done jadi
 * "current" (bisa diklik), sisanya "locked". */
export function computeStatuses(rawTopics, progressMap) {
  let unlockedAssigned = false;
  return rawTopics.map((t) => {
    const p = progressMap[t.key];
    if (p?.status === "done") return { ...t, ...p };
    if (!unlockedAssigned) {
      unlockedAssigned = true;
      return { ...t, ...p, status: "current" };
    }
    return { ...t, ...p, status: "locked" };
  });
}

export function starsFor(accuracy) {
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.7) return 2;
  if (accuracy >= 0.4) return 1;
  return 0;
}

/** Practice topik normal (dari SubjectDetail) -- nulis status "done" +
 * stars + XP, ini yang bikin bab berikutnya kebuka (lihat computeStatuses). */
export async function recordTopicResult(playerId, subject, grade, babKey, { correct, wrong, xpEarned }) {
  const ref = doc(db, "players", playerId);
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : {};
  const prev = data.progress?.[subject]?.[String(grade)]?.[babKey] || { correct: 0, wrong: 0, stars: 0, xp: 0 };
  const accuracy = correct + wrong > 0 ? correct / (correct + wrong) : 0;
  const path = `progress.${subject}.${grade}.${babKey}`;
  await updateDoc(ref, {
    [path]: {
      status: "done",
      stars: Math.max(starsFor(accuracy), prev.stars || 0),
      xp: (prev.xp || 0) + xpEarned,
      correct: (prev.correct || 0) + correct,
      wrong: (prev.wrong || 0) + wrong,
      lastAt: Date.now(),
    },
    xp: increment(xpEarned),
  });
}

/** Focus Round -- CUMA nambah correct/wrong (buat weak-topic calc) + XP
 * kecil, SENGAJA gak nyentuh status/stars biar gak ganggu urutan
 * locked/unlocked linear di SubjectDetail (sama filosofi kayak BrainBox:
 * Focus Round nyumbang ke topicStats, bukan ke chapter-progress). Tetep
 * nambahin ke path+.xp (bukan cuma top-level xp) biar computeXpBySubject
 * ikut ngitung kontribusi Focus Round, gak cuma dari practice biasa. */
export async function recordFocusRoundAttempt(playerId, subject, grade, babKey, { correct, wrong, xpEarned }) {
  const ref = doc(db, "players", playerId);
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : {};
  const prev = data.progress?.[subject]?.[String(grade)]?.[babKey] || { correct: 0, wrong: 0, xp: 0 };
  const path = `progress.${subject}.${grade}.${babKey}`;
  await updateDoc(ref, {
    [path + ".correct"]: (prev.correct || 0) + correct,
    [path + ".wrong"]: (prev.wrong || 0) + wrong,
    [path + ".xp"]: (prev.xp || 0) + xpEarned,
    [path + ".lastAt"]: Date.now(),
    xp: increment(xpEarned),
  });
}

/** Jumlahin XP per subject dari progress map -- buat breakdown di Parent
 * Portal (sebelumnya cuma nampilin player.xp flat total). Baca dari field
 * "xp" per bab yang udah kesimpen (practice DAN Focus Round sama-sama
 * nyumbang ke situ), jadi gak butuh skema Firestore baru. */
export function computeXpBySubject(progressMap) {
  const bySubject = {};
  for (const [subject, byGrade] of Object.entries(progressMap || {})) {
    let total = 0;
    for (const byBab of Object.values(byGrade || {})) {
      for (const p of Object.values(byBab || {})) {
        total += p.xp || 0;
      }
    }
    if (total > 0) bySubject[subject] = total;
  }
  return bySubject;
}

export async function getAssignedTopics(playerId) {
  const snap = await getDoc(doc(db, "players", playerId));
  return snap.exists() ? snap.data().assignedTopics || [] : [];
}

export async function setAssignedTopics(playerId, topicIds) {
  await updateDoc(doc(db, "players", playerId), { assignedTopics: topicIds });
}

// Buat "Perlu Latihan Lagi" -- sama formula kayak BrainBox
// (parents/script.js): min 3 percobaan, akurasi <70%.
const MIN_ATTEMPTS = 3;
const WEAK_ACCURACY = 0.7;

export function computeWeakTopics(progressBySubject) {
  const weak = [];
  for (const [subject, byGrade] of Object.entries(progressBySubject || {})) {
    for (const [grade, byBab] of Object.entries(byGrade || {})) {
      for (const [babKey, p] of Object.entries(byBab || {})) {
        const total = (p.correct || 0) + (p.wrong || 0);
        if (total < MIN_ATTEMPTS) continue;
        const accuracy = p.correct / total;
        if (accuracy < WEAK_ACCURACY) {
          // Gak nyimpen title di sini -- babKey doang, judulnya di-resolve
          // di UI dari daftar topik (loadAllFocusTopics), biar gak
          // denormalisasi title ke Firestore.
          weak.push({ subject, grade, babKey, accuracy, total });
        }
      }
    }
  }
  weak.sort((a, b) => a.accuracy - b.accuracy);
  return weak;
}
