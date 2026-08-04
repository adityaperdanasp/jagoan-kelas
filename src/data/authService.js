import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

// Nama -> id stabil buat dokumen Firestore, sama pola kayak BrainBox
// (testerAccounts/{nameKey}): lowercase, non-alfanumerik jadi "-".
export function nameKeyOf(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function assertValid(name, pin) {
  if (!nameKeyOf(name)) throw new Error("Nama gak boleh kosong");
  if (!/^\d{4}$/.test(pin)) throw new Error("PIN harus 4 digit angka");
}

export async function signUp(name, pin) {
  assertValid(name, pin);
  const key = nameKeyOf(name);
  const ref = doc(db, "players", key);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    throw new Error("Nama ini udah dipakai. Coba Sign In, atau pakai nama lain.");
  }
  const data = { name: name.trim(), pin, xp: 0, createdAt: Date.now() };
  await setDoc(ref, data);
  return { id: key, ...data };
}

export async function signIn(name, pin) {
  assertValid(name, pin);
  const key = nameKeyOf(name);
  const ref = doc(db, "players", key);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error("Nama belum terdaftar. Coba Sign Up dulu.");
  }
  const data = snap.data();
  if (data.pin !== pin) {
    throw new Error("PIN salah, coba lagi.");
  }
  return { id: key, ...data };
}

// Dipakai Parent Portal buat sign-in pakai nama+PIN ANAK -- fungsi sama
// kayak signIn(), dinamain beda biar jelas konteksnya di pemanggil.
export const signInAsChild = signIn;

export async function getPlayerDoc(id) {
  const snap = await getDoc(doc(db, "players", id));
  return snap.exists() ? { id, ...snap.data() } : null;
}

// Pesan satu arah orang tua -> anak (nimpa pesan lama, bukan thread) --
// sama pola kayak BrainBox parents/script.js: nyimpen 1 pesan aktif aja,
// popup muncul di Landing anak pas dibuka lagi.
export async function sendParentMessage(childId, text) {
  await updateDoc(doc(db, "players", childId), {
    parentMessage: { text, sentAt: Date.now(), read: false },
  });
}

export async function markParentMessageRead(childId) {
  await updateDoc(doc(db, "players", childId), {
    "parentMessage.read": true,
  });
}
