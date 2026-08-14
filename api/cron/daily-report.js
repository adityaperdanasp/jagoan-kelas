// Vercel Cron -- jalan otomatis tiap hari jam 00:00 UTC = 07:00 WIB (lihat
// `crons` di vercel.json), ngirim ringkasan aktivitas 24 jam terakhir ke
// Telegram (2026-08-11, request user: "kayak alidrisigames/brainbox udah").
//
// 2 CARA VERIFIKASI request boleh jalan atau ditolak:
//   1. Header `Authorization: Bearer {CRON_SECRET}` -- ini yang Vercel Cron
//      OTOMATIS nempelin sendiri kalau env var CRON_SECRET ke-set, dipakai
//      buat jadwal 7 pagi otomatis.
//   2. Query param `?secret=...` -- buat trigger MANUAL/ad-hoc dari HP
//      (buka link di browser, gak bisa nyetel header custom dari situ).
//      Trade-off: secret di URL bisa nyangkut di history browser -- buat
//      skala/resiko laporan ini (bukan data sensitif anak, cuma statistik
//      agregat) dianggap oke, tapi disadari.
import { getDb } from "../_lib/firebaseAdmin.js";
import { sendTelegram } from "../_lib/telegram.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization === `Bearer ${secret}`;
  const queryParam = secret && req.query?.secret === secret;
  if (secret && !authHeader && !queryParam) {
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

      // Topik SPESIFIK apa yang disentuh (bukan cuma hitungan angka) --
      // request user: "apa saja yang dimainkan". `xp` per bab itu
      // KUMULATIF lintas semua waktu bab itu pernah dimainkan (lihat
      // recordTopicResult di progressService.js), jadi gak dipakai di sini
      // -- ngitung `lastAt` yang jatuh 24 jam terakhir itu akurat by
      // construction buat nentuin "disentuh hari ini apa nggak".
      //
      // Judul topik LENGKAP (mis. "Pengurangan sampai dengan 10") gak
      // ditampilin -- itu nyimpen di file konten terpisah (src/data/content)
      // yang gak reliable ditarik dari fungsi server ini (resiko gak
      // ke-bundle Vercel). Kode topik (subject/babKey) udah cukup
      // informatif buat laporan harian.
      const topicsToday = [];
      for (const [subject, byGrade] of Object.entries(d.progress || {})) {
        for (const [grade, byBab] of Object.entries(byGrade || {})) {
          for (const [babKey, p] of Object.entries(byBab || {})) {
            if (p.lastAt && p.lastAt >= since) {
              topicsToday.push(`${subject} k${grade}/${babKey}`);
              perSubject[subject] = (perSubject[subject] || 0) + 1;
            }
          }
        }
      }
      if (topicsToday.length > 0) {
        activeToday++;
        activeList.push({ name: d.name || doc.id, topics: topicsToday });
      }
    });

    activeList.sort((a, b) => b.topics.length - a.topics.length);
    // Daftar LENGKAP (bukan cuma top 5) -- request user: "bisa kasih data
    // siapa aja yang main? nama." Di-cap 50 baris sebagai jaga-jaga doang
    // (pesan Telegram maks ~4096 karakter) -- di skala kelas/personal ini
    // gak bakal kesentuh.
    const namesList = activeList
      .slice(0, 50)
      .map((p) => `  - ${p.name}: ${p.topics.join(", ")}`)
      .join("\n") || "  (gak ada yang aktif)";
    const extra = activeList.length > 50 ? `\n  ...+${activeList.length - 50} lagi` : "";
    const subjectLines = Object.entries(perSubject).map(([s, n]) => `${s}: ${n}`).join(", ") || "-";
    const dateStr = new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" });

    const text = [
      `🎮 Laporan Harian Jagoan Kelas — ${dateStr}`,
      "",
      `• Total akun: ${total}`,
      `• Baru daftar (24 jam): ${newToday}`,
      `• Aktif (24 jam): ${activeToday}`,
      `• Topik disentuh per pelajaran: ${subjectLines}`,
      `• Yang main hari ini:`,
      namesList + extra,
    ].join("\n");

    await sendTelegram(text);
    // Response JSON di-extend (2026-08-11, request user: agent Telegram
    // laen "bell" mau tarik per-player breakdown sendiri, bukan cuma parse
    // teks Telegram) -- `players` array nampung nama + topik yang
    // DISENTUH (bukan "berapa kali main", data ini gak nyimpen counter
    // percobaan per hari, cuma `lastAt` -- lihat komentar di atas).
    res.status(200).json({
      ok: true,
      date: dateStr,
      total,
      newToday,
      activeToday,
      perSubject,
      players: activeList.map((p) => ({ name: p.name, topicsToday: p.topics, topicCount: p.topics.length })),
    });
  } catch (err) {
    console.error("daily-report gagal:", err.message);
    await sendTelegram(`⚠️ Laporan harian GAGAL dibuat: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
}
