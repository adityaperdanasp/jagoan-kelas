// Jagoan Kelas — Firebase project sendiri (jagoan-kelas), TERPISAH TOTAL
// dari project Firebase BrainBox (al-idrisi-games). Jangan disatuin.
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
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
export const auth = getAuth(app);
export const db = getFirestore(app);
// RTDB (dibikin 2026-08-05, sama project yang dipakai DinoRace) -- Math
// Race butuh sinkronisasi real-time (posisi antar pemain), Firestore
// gak cocok buat itu. Path: mathrace_games/{code}, mirip pola
// dinorace_games/{code} yang udah dipakai duluan.
export const rtdb = getDatabase(app);
