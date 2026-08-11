// Shared Firebase Admin SDK init buat api/auth.js + api/player.js -- prefix
// `_lib` bikin Vercel GAK nge-treat file ini (atau folder ini) jadi route
// publik sendiri (convention Vercel: file/folder diawali underscore di
// dalem `api/` di-skip dari routing).
//
// 2026-08-11 -- SEBELUM ini, semua baca/tulis `players/{id}` (termasuk PIN
// plaintext) lewat client SDK langsung, yang artinya Firestore Rules gak
// bisa bedain "app asli" vs "siapa aja yang nembak REST API langsung" --
// dibuktiin: `curl` tanpa auth apapun bisa `list` SELURUH koleksi players
// termasuk PIN semua anak. Fix: SEMUA operasi `players/{id}` sekarang
// WAJIB lewat endpoint ini (Admin SDK, bypass Firestore Rules pakai
// service account, PIN gak pernah dikirim balik ke client) -- Firestore
// Rules abis ini di-kunci total (`allow read, write: if false`) begitu
// user konfirmasi flow baru jalan, biar direct client access ke collection
// ini mustahil lagi walau URL/project-id ketauan.
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let dbInstance;

export function getDb() {
  if (dbInstance) return dbInstance;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error("Server belum siap: FIREBASE_SERVICE_ACCOUNT_JSON belum di-set di Vercel env vars.");
  }
  const serviceAccount = JSON.parse(raw);
  const app = getApps()[0] || initializeApp({ credential: cert(serviceAccount) });
  dbInstance = getFirestore(app);
  return dbInstance;
}
