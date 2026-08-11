// Vercel serverless function -- SEMUA baca/tulis players/{id} SELAIN
// signup/signin (progress, XP, assignedTopics, pesan orang tua) sekarang
// lewat sini (2026-08-11, lihat komentar _lib/firebaseAdmin.js). Tiap
// request WAJIB bawa `{playerId, token}` yang valid (dibuktiin lewat
// signIn/signUp di api/auth.js) -- server nolak kalau token gak cocok
// player-nya atau kadaluarsa, jadi gak ada jalan buat ngatasnamain player
// lain tanpa pernah kebukti tau PIN-nya.
import { getDb } from "./_lib/firebaseAdmin.js";
import { verifyToken } from "./_lib/authToken.js";
import { FieldValue } from "firebase-admin/firestore";

function starsFor(accuracy) {
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.7) return 2;
  if (accuracy >= 0.4) return 1;
  return 0;
}

function stripPin(data) {
  const { pin, ...rest } = data || {};
  return rest;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { action, playerId, token } = req.body || {};
  if (!playerId || !verifyToken(token, playerId)) {
    res.status(401).json({ error: "Sesi gak valid, coba masuk lagi." });
    return;
  }

  try {
    const db = getDb();
    const ref = db.collection("players").doc(playerId);

    switch (action) {
      case "get": {
        const snap = await ref.get();
        res.status(200).json({ player: snap.exists ? { id: playerId, ...stripPin(snap.data()) } : null });
        return;
      }

      case "addXp": {
        const { xpEarned } = req.body;
        if (xpEarned) await ref.update({ xp: FieldValue.increment(xpEarned) });
        res.status(200).json({ ok: true });
        return;
      }

      case "getSubjectProgress": {
        const { subject, grade } = req.body;
        const snap = await ref.get();
        const progress = snap.exists ? snap.data().progress?.[subject]?.[String(grade)] || {} : {};
        res.status(200).json({ progress });
        return;
      }

      case "recordTopicResult": {
        const { subject, grade, babKey, correct, wrong, xpEarned } = req.body;
        const snap = await ref.get();
        const data = snap.exists ? snap.data() : {};
        const prev = data.progress?.[subject]?.[String(grade)]?.[babKey] || { correct: 0, wrong: 0, stars: 0, xp: 0 };
        const accuracy = correct + wrong > 0 ? correct / (correct + wrong) : 0;
        const path = `progress.${subject}.${grade}.${babKey}`;
        await ref.update({
          [path]: {
            status: "done",
            stars: Math.max(starsFor(accuracy), prev.stars || 0),
            xp: (prev.xp || 0) + xpEarned,
            correct: (prev.correct || 0) + correct,
            wrong: (prev.wrong || 0) + wrong,
            lastAt: Date.now(),
          },
          xp: FieldValue.increment(xpEarned),
        });
        res.status(200).json({ ok: true });
        return;
      }

      case "recordFocusRoundAttempt": {
        const { subject, grade, babKey, correct, wrong, xpEarned } = req.body;
        const snap = await ref.get();
        const data = snap.exists ? snap.data() : {};
        const prev = data.progress?.[subject]?.[String(grade)]?.[babKey] || { correct: 0, wrong: 0, xp: 0 };
        const path = `progress.${subject}.${grade}.${babKey}`;
        await ref.update({
          [`${path}.correct`]: (prev.correct || 0) + correct,
          [`${path}.wrong`]: (prev.wrong || 0) + wrong,
          [`${path}.xp`]: (prev.xp || 0) + xpEarned,
          [`${path}.lastAt`]: Date.now(),
          xp: FieldValue.increment(xpEarned),
        });
        res.status(200).json({ ok: true });
        return;
      }

      case "getAssignedTopics": {
        const snap = await ref.get();
        res.status(200).json({ assignedTopics: snap.exists ? snap.data().assignedTopics || [] : [] });
        return;
      }

      case "setAssignedTopics": {
        const { topicIds } = req.body;
        await ref.update({ assignedTopics: topicIds });
        res.status(200).json({ ok: true });
        return;
      }

      case "sendParentMessage": {
        const { text } = req.body;
        await ref.update({ parentMessage: { text, sentAt: Date.now(), read: false } });
        res.status(200).json({ ok: true });
        return;
      }

      case "markParentMessageRead": {
        await ref.update({ "parentMessage.read": true });
        res.status(200).json({ ok: true });
        return;
      }

      default:
        res.status(400).json({ error: "action gak dikenal" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
