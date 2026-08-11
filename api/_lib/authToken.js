// "Tiket login" ringan -- HMAC-signed token (playerId + expiry), BUKAN
// JWT library (gak butuh, cuma 1 claim), ditandatangani pake secret
// server-only (`AUTH_TOKEN_SECRET`, Vercel env var, JANGAN PERNAH sampe
// ke client). Diterbitin sekali abis signIn/signUp BENERAN cocok PIN-nya
// (dicek di api/auth.js), dipake ulang di tiap panggilan api/player.js
// buat ngebuktiin "yang minta ini emang udah pernah kebukti tau PIN
// player ini", tanpa perlu ngirim ulang PIN-nya tiap request.
import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 hari -- anak jarang logout manual, HP dipake bareng2

function sign(payload) {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!secret) throw new Error("Server belum siap: AUTH_TOKEN_SECRET belum di-set di Vercel env vars.");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function issueToken(playerId) {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = `${playerId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token, expectedPlayerId) {
  if (typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [playerId, expStr, sig] = parts;
  if (playerId !== expectedPlayerId) return false;
  const expected = sign(`${playerId}.${expStr}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const exp = Number(expStr);
  return Boolean(exp) && Date.now() <= exp;
}
