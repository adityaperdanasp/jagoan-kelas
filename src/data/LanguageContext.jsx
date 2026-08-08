import { createContext, useCallback, useContext, useMemo, useState } from "react";

// Toggle bahasa UI (2026-08-08) -- user: "Bikin togle untuk bahasa
// indonesia/english di landing page... togle kecil sederhana aja kaya di
// website2 seperti google dll". SCOPE (dikonfirmasi lewat AskUserQuestion):
// UI DOANG (tombol/label/header/nama subject) -- soal quiz & konten
// pelajaran TETEP Bahasa Indonesia (nerjemahin ribuan soal 6 subject x 6
// kelas itu proyek terpisah, dan buat subject "Bahasa Indonesia" sendiri
// nerjemahin ke Inggris jelas gak masuk akal).
const LanguageContext = createContext(null);
const STORAGE_KEY = "jk_lang";

function loadLang() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "en" ? "en" : "id";
  } catch {
    return "id";
  }
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(loadLang);

  const setLang = useCallback((next) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === "id" ? "en" : "id");
  }, [lang, setLang]);

  const value = useMemo(() => ({ lang, setLang, toggleLang }), [lang, setLang, toggleLang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
