// SEMUA baca/tulis players/{id} SEKARANG lewat /api/player (server-side,
// 2026-08-11) -- bukan lagi Firestore client SDK langsung. Root cause:
// lihat komentar di api/_lib/firebaseAdmin.js (PIN + progress semua anak
// kebuka publik lewat REST tanpa auth apapun). Tiap fungsi di sini sekarang
// butuh `token` (dari `player.token`, disimpen PlayerContext abis
// signIn/signUp) buat ngebuktiin ke server "yang minta ini emang tau PIN
// player ini" -- server nolak kalau token gak cocok/kadaluarsa.
//
// Schema Firestore-nya SENDIRI gak berubah (masih persis kayak sebelumnya,
// cuma jalur aksesnya doang yang pindah): players/{id}.progress.{subject}.
// {grade}.{babKey} = { status: "done", stars: 0-3, xp, correct, wrong, lastAt }

async function callPlayerApi(action, playerId, token, extra) {
  const res = await fetch("/api/player", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, playerId, token, ...extra }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Gagal nyambung ke server.");
  return data;
}

/** Nambah XP total player TANPA nyentuh progress per-topik apapun -- dipake
 * mode kayak Ninja Runner yang nulis topicStats sendiri per topik (xpEarned:0
 * di tiap panggilan recordFocusRoundAttempt) terus nambahin XP totalnya
 * sekali di sini, biar gak dobel-hitung. */
export async function addXp(playerId, xpEarned, token) {
  if (!xpEarned) return;
  await callPlayerApi("addXp", playerId, token, { xpEarned });
}

export async function getSubjectProgress(playerId, subject, grade, token) {
  const { progress } = await callPlayerApi("getSubjectProgress", playerId, token, { subject, grade });
  return progress || {};
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
export async function recordTopicResult(playerId, subject, grade, babKey, { correct, wrong, xpEarned }, token) {
  await callPlayerApi("recordTopicResult", playerId, token, { subject, grade, babKey, correct, wrong, xpEarned });
}

/** Focus Round -- CUMA nambah correct/wrong (buat weak-topic calc) + XP
 * kecil, SENGAJA gak nyentuh status/stars biar gak ganggu urutan
 * locked/unlocked linear di SubjectDetail (sama filosofi kayak BrainBox:
 * Focus Round nyumbang ke topicStats, bukan ke chapter-progress). Tetep
 * nambahin ke path+.xp (bukan cuma top-level xp) biar computeXpBySubject
 * ikut ngitung kontribusi Focus Round, gak cuma dari practice biasa. */
export async function recordFocusRoundAttempt(playerId, subject, grade, babKey, { correct, wrong, xpEarned }, token) {
  await callPlayerApi("recordFocusRoundAttempt", playerId, token, { subject, grade, babKey, correct, wrong, xpEarned });
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

export async function getAssignedTopics(playerId, token) {
  const { assignedTopics } = await callPlayerApi("getAssignedTopics", playerId, token);
  return assignedTopics || [];
}

export async function setAssignedTopics(playerId, topicIds, token) {
  await callPlayerApi("setAssignedTopics", playerId, token, { topicIds });
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
