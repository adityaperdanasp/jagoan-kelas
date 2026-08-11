// Sign up / sign in SEKARANG lewat /api/auth (server-side, 2026-08-11) --
// BUKAN lagi baca/tulis Firestore langsung dari client. Root cause: tanpa
// ini, PIN semua anak bisa dibaca PLAINTEXT sama siapa aja yang nembak
// Firestore REST API langsung (dibuktiin lewat curl tanpa auth apapun bisa
// `list` SELURUH koleksi `players`) -- Firestore Rules gak bisa bedain
// "app asli" vs "REST client sembarangan" karena app ini gak pernah pakai
// Firebase Auth beneran. Lihat komentar lengkap di `api/_lib/firebaseAdmin.js`.
//
// `player` yang di-return SEKARANG termasuk `token` (tiket HMAC-signed) --
// WAJIB disimpen bareng identitas player (PlayerContext) dan dikirim balik
// di SETIAP panggilan `progressService.js` selanjutnya, itu yang
// ngebuktiin ke server "yang minta ini emang tau PIN player ini".
async function callAuthApi(body) {
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Ada yang salah, coba lagi.");
  }
  return data;
}

export async function signUp(name, pin) {
  const { player, token } = await callAuthApi({ action: "signup", name, pin });
  return { ...player, token };
}

export async function signIn(name, pin) {
  const { player, token } = await callAuthApi({ action: "signin", name, pin });
  return { ...player, token };
}

// Dipakai Parent Portal buat sign-in pakai nama+PIN ANAK -- fungsi sama
// kayak signIn(), dinamain beda biar jelas konteksnya di pemanggil.
export const signInAsChild = signIn;

export async function getPlayerDoc(id, token) {
  const res = await fetch("/api/player", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "get", playerId: id, token }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Gagal muat data player.");
  return data.player ? { ...data.player, token } : null;
}

// Pesan satu arah orang tua -> anak (nimpa pesan lama, bukan thread) --
// sama pola kayak BrainBox parents/script.js: nyimpen 1 pesan aktif aja,
// popup muncul di Landing anak pas dibuka lagi.
export async function sendParentMessage(childId, text, token) {
  const res = await fetch("/api/player", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "sendParentMessage", playerId: childId, token, text }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Gagal ngirim pesan.");
}

export async function markParentMessageRead(childId, token) {
  await fetch("/api/player", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "markParentMessageRead", playerId: childId, token }),
  });
}
