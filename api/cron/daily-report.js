// Vercel Cron -- jalan otomatis tiap hari jam 00:00 UTC = 07:00 WIB (lihat
// `crons` di vercel.json), ngirim ringkasan aktivitas 24 jam terakhir ke
// Telegram (2026-08-11, request user: "kayak alidrisigames/brainbox udah").
//
// Vercel OTOMATIS nempelin header `Authorization: Bearer {CRON_SECRET}`
// pas manggil endpoint ini KALAU env var `CRON_SECRET` ke-set -- itu yang
// dicek di bawah, biar endpoint ini gak bisa di-trigger sembarangan orang
// yang nembak URL-nya langsung (bukan Vercel Cron beneran).
import { getDb } from "../_lib/firebaseAdmin.js";
import { sendTelegram } from "../_lib/telegram.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const db = getDb();
    const snap = await db.collection("players").get();

    const since = Date.now() - DAY_MS;
    let total = 0;
    let newToday = 0;
    let activeToday = 0;
    const perSubject = {};
    const activeList = [];

    snap.forEach((doc) => {
      total++;
      const d = doc.data();
      if (d.createdAt && d.createdAt >= since) newToday++;

      // "Topik disentuh hari ini" (bukan XP hari ini) -- field `xp` per bab
      // itu KUMULATIF lintas semua waktu bab itu pernah dimainkan (lihat
      // recordTopicResult di progressService.js), jadi gak akurat kalau
      // dipakai buat "XP hari ini" pas anak main ulang bab lama. Ngitung
      // `lastAt` yang jatuh 24 jam terakhir itu akurat by construction.
      let babTouched = 0;
      for (const [subject, byGrade] of Object.entries(d.progress || {})) {
        for (const byBab of Object.values(byGrade || {})) {
          for (const p of Object.values(byBab || {})) {
            if (p.lastAt && p.lastAt >= since) {
              babTouched++;
              perSubject[subject] = (perSubject[subject] || 0) + 1;
            }
          }
        }
      }
      if (babTouched > 0) {
        activeToday++;
        activeList.push({ name: d.name || doc.id, count: babTouched });
      }
    });

    activeList.sort((a, b) => b.count - a.count);
    const top = activeList.slice(0, 5).map((p) => `${p.name} (${p.count} topik)`).join(", ") || "-";
    const subjectLines = Object.entries(perSubject).map(([s, n]) => `${s}: ${n}`).join(", ") || "-";
    const dateStr = new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" });

    const text = [
      `🎮 Laporan Harian Jagoan Kelas — ${dateStr}`,
      "",
      `• Total akun: ${total}`,
      `• Baru daftar (24 jam): ${newToday}`,
      `• Aktif (24 jam): ${activeToday}`,
      `• Topik disentuh per pelajaran: ${subjectLines}`,
      `• Paling aktif: ${top}`,
    ].join("\n");

    await sendTelegram(text);
    res.status(200).json({ ok: true, total, newToday, activeToday });
  } catch (err) {
    console.error("daily-report gagal:", err.message);
    await sendTelegram(`⚠️ Laporan harian GAGAL dibuat: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
}
