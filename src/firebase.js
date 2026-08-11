// Jagoan Kelas — Firebase project sendiri (jagoan-kelas), TERPISAH TOTAL
// dari project Firebase BrainBox (al-idrisi-games). Jangan disatuin.
//
// Firestore (`db`) SENGAJA GAK di-init di sini lagi (2026-08-11) -- semua
// akses `players/{id}` (progress/XP/PIN/pesan ortu) sekarang lewat
// /api/auth + /api/player (Admin SDK server-side), bukan client SDK
// langsung. Root cause: client Firestore SDK cuma bisa "aman" selama
// Security Rules bisa bedain app asli vs REST client sembarangan -- app
// ini gak pernah pakai Firebase Auth beneran, jadi gak ada cara bedain itu
// di level Rules, dibuktiin PIN semua anak kebuka publik lewat curl tanpa
// auth apapun. Lihat komentar lengkap di `api/_lib/firebaseAdmin.js`.
// `getAuth()` juga gak pernah kepake (app ini pakai skema nama+PIN sendiri,
// bukan Firebase Auth) -- keduanya dicabut biar SDK-nya gak ikut ke-bundle
// client sama sekali.
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyA_26fgTPBYzH1Xpq_hXXEN7IvDvei-A-I",
  authDomain: "jagoan-kelas.firebaseapp.com",
  databaseURL: "https://jagoan-kelas-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "jagoan-kelas",
  storageBucket: "jagoan-kelas.firebasestorage.app",
  messagingSenderId: "516862721101",
  appId: "1:516862721101:web:aa38d54da64785d1f4f004",
};

export const app = initializeApp(firebaseConfig);
// RTDB (dibikin 2026-08-05, sama project yang dipakai DinoRace) -- Math
// Race butuh sinkronisasi real-time (posisi antar pemain), Firestore
// gak cocok buat itu. Path: mathrace_games/{code}, mirip pola
// dinorace_games/{code} yang udah dipakai duluan.
export const rtdb = getDatabase(app);
