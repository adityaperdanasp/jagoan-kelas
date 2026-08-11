// Vercel serverless function -- sign up / sign in, SEKARANG server-side
// (2026-08-11, lihat komentar _lib/firebaseAdmin.js buat root cause).
// PIN dicek DI SINI (Admin SDK), gak pernah dikirim balik ke client dalam
// bentuk apapun -- client cuma dapet `{player, token}`, `player` udah
// di-strip field `pin`-nya.
import { getDb } from "./_lib/firebaseAdmin.js";
import { issueToken } from "./_lib/authToken.js";

function nameKeyOf(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

  const { action, name, pin } = req.body || {};
  const key = nameKeyOf(name);
  if (!key) {
    res.status(400).json({ error: "Nama gak boleh kosong" });
    return;
  }
  if (!/^\d{4}$/.test(String(pin || ""))) {
    res.status(400).json({ error: "PIN harus 4 digit angka" });
    return;
  }

  try {
    const db = getDb();
    const ref = db.collection("players").doc(key);

    if (action === "signup") {
      const existing = await ref.get();
      if (existing.exists) {
        res.status(409).json({ error: "Nama ini udah dipakai. Coba Sign In, atau pakai nama lain." });
        return;
      }
      const data = { name: String(name).trim(), pin, xp: 0, createdAt: Date.now() };
      await ref.set(data);
      res.status(200).json({ player: { id: key, ...stripPin(data) }, token: issueToken(key) });
      return;
    }

    if (action === "signin") {
      const snap = await ref.get();
      if (!snap.exists) {
        res.status(404).json({ error: "Nama belum terdaftar. Coba Sign Up dulu." });
        return;
      }
      const data = snap.data();
      if (String(data.pin) !== String(pin)) {
        res.status(401).json({ error: "PIN salah, coba lagi." });
        return;
      }
      res.status(200).json({ player: { id: key, ...stripPin(data) }, token: issueToken(key) });
      return;
    }

    res.status(400).json({ error: "action harus 'signup' atau 'signin'" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
