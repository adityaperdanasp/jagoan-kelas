// Kirim notifikasi ke Telegram (bot khusus jagoan-kelas, TERPISAH dari bot
// lain yang mungkin dipakai buat project lain -- 2026-08-11, request user).
// Dipake 2 tempat: (1) alert error tak terduga di api/auth.js & api/player.js
// & api/kiko-chat.js, (2) laporan harian jam 7 pagi WIB (api/cron/daily-report.js).
//
// SENGAJA gak throw kalau gagal kirim (env var belum di-set, Telegram API
// down, dll) -- notifikasi gagal kirim TIDAK BOLEH bikin request utama
// (login/simpen progress anak) ikut gagal. Cukup log ke console (kebaca
// lewat Vercel logs) kalau ada masalah ngirim notifikasi-nya sendiri.
export async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error("Telegram belum ke-setup (TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID kosong), skip kirim:", text);
    return;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
      console.error("Gagal kirim Telegram:", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("Gagal kirim Telegram (exception):", err.message);
  }
}

// Dipanggil dari catch-block api/*.js -- error TAK TERDUGA doang (exception
// beneran), BUKAN penolakan normal (PIN salah/401, nama kepake/409, dst --
// itu bukan "error", itu app jalan bener nolak request yang emang salah).
export function alertError(source, err) {
  sendTelegram(`⚠️ Error di ${source}\n${err?.message || err}`);
}
