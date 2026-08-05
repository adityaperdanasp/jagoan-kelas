const KEY = "jk_last_grade";

// Dipakai RoamingCarDino buat nentuin kelas mana yang dibuka pas tap mobil
// -- jagoan-kelas multi-kelas (beda dari mathville BrainBox yang cuma 1
// kelas tetap), jadi "langsung ke Drive Mode" butuh tau kelas terakhir
// yang dibuka. SubjectDetail nyimpen tiap kali dibuka, default kelas 1
// kalau belum pernah buka apa-apa.
export function setLastGrade(grade) {
  try {
    localStorage.setItem(KEY, String(grade));
  } catch {
    /* localStorage gak tersedia (private mode dll) -- gak fatal */
  }
}

export function getLastGrade() {
  try {
    return localStorage.getItem(KEY) || "1";
  } catch {
    return "1";
  }
}
