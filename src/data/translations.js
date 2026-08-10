import { useLanguage } from "./LanguageContext";

// Kamus UI (2026-08-08) -- lihat komentar `LanguageContext.jsx` buat scope
// (UI doang, soal quiz & isi pelajaran TETEP Bahasa Indonesia). Key
// datar (bukan nested) biar gampang di-grep pas nambah screen baru.
const STRINGS = {
  common: {
    id: { back: "Kembali", grade: "Kelas", locked: "Terkunci", continueLabel: "Lanjut", done: "Selesai", retry: "Coba Lagi", loading: "Memuat...", askKiko: "Tanya Kiko", forParents: "Untuk orang tua →", topic: "Topik" },
    en: { back: "Back", grade: "Grade", locked: "Locked", continueLabel: "Continue", done: "Done", retry: "Try Again", loading: "Loading...", askKiko: "Ask Kiko", forParents: "For parents →", topic: "Topic" },
  },
  subjects: {
    matematika: { id: "Matematika", en: "Math", subId: "Angka & hitung-hitungan", subEn: "Numbers & arithmetic" },
    ipas: { id: "IPAS", en: "Science & Social Studies", subId: "Ilmu Pengetahuan Alam & Sosial", subEn: "Natural & Social Science" },
    ppkn: { id: "PPKn", en: "Civics (Pancasila)", subId: "Pendidikan Pancasila", subEn: "Pancasila Education" },
    pai: { id: "Pendidikan Agama Islam", en: "Islamic Studies", subId: "Belajar nilai & akhlak", subEn: "Values & character" },
    bindo: { id: "Bahasa Indonesia", en: "Indonesian Language", subId: "Membaca & menulis", subEn: "Reading & writing" },
    binggris: { id: "Bahasa Inggris", en: "English", subId: "English fun time", subEn: "English fun time" },
  },
  landing: {
    id: { hi: "Hai, {name}!", logout: "Keluar", pickGrade: "Pilih kelas kamu!", gradeLabel: "Kelas {n}", talkToKiko: "Ngobrol sama Kiko", kikoHere: "Kiko disini", messageFromParent: "Pesan dari orang tua kamu", thanks: "Makasih! 😊", tapKiko: "Tap Kiko!" },
    en: { hi: "Hi, {name}!", logout: "Log out", pickGrade: "Pick your grade!", gradeLabel: "Grade {n}", talkToKiko: "Chat with Kiko", kikoHere: "Kiko is here", messageFromParent: "A message from your parent", thanks: "Thanks! 😊", tapKiko: "Tap Kiko!" },
  },
  pickSubject: {
    id: { title: "Kelas {n}", subtitle: "Pilih pelajaran", mathRaceTitle: "Math Race", mathRaceSub: "Balapan jawab soal matematika!", focusTitle: "Fokus Latihan", focusSub: "Campur soal dari pelajaran manapun", ninjaTitle: "Ninja Runner", ninjaSub: "Lari, lompat, jawab soal campur!" },
    en: { title: "Grade {n}", subtitle: "Pick a subject", mathRaceTitle: "Math Race", mathRaceSub: "Race to answer math questions!", focusTitle: "Focus Practice", focusSub: "Mixed questions from any subject", ninjaTitle: "Ninja Runner", ninjaSub: "Run, jump, answer mixed questions!" },
  },
  auth: {
    id: { welcome: "Selamat Datang!", taglineSignup: "Buat akun buat mulai belajar!", taglineSignin: "Masuk lagi yuk, isi nama & PIN kamu.", register: "Daftar", login: "Masuk", nameLabel: "Nama kamu", namePlaceholder: "mis. Azka", pinLabel: "PIN 4 digit", registerCta: "Daftar & Main! 🚀", loginCta: "Masuk! 🚀", submitting: "Tunggu bentar...", errorDefault: "Ada yang salah, coba lagi." },
    en: { welcome: "Welcome!", taglineSignup: "Create an account to start learning!", taglineSignin: "Welcome back, enter your name & PIN.", register: "Sign Up", login: "Log In", nameLabel: "Your name", namePlaceholder: "e.g. Azka", pinLabel: "4-digit PIN", registerCta: "Sign Up & Play! 🚀", loginCta: "Log In! 🚀", submitting: "Just a sec...", errorDefault: "Something went wrong, try again." },
  },
  map: {
    id: {
      loadError: "Gagal muat peta. Coba cek koneksi internet kamu, ya!",
      preparing: "Menyiapin peta...",
      preparingVillage: "Menyiapin kampung...",
      preparingGarden: "Menyiapin taman...",
      preparingWorld: "Menyiapin peta dunia...",
      loadErrorGarden: "Gagal muat taman. Coba cek koneksi internet kamu, ya!",
      hiKiko: "Hai, ini Kiko!",
    },
    en: {
      loadError: "Couldn't load the map. Check your internet connection!",
      preparing: "Getting the map ready...",
      preparingVillage: "Getting the village ready...",
      preparingGarden: "Getting the garden ready...",
      preparingWorld: "Getting the world map ready...",
      loadErrorGarden: "Couldn't load the garden. Check your internet connection!",
      hiKiko: "Hi, I'm Kiko!",
    },
  },
  binggris: {
    id: { collection: "📖 Koleksi Frasa", locked: "Selesaikan bab buat buka" },
    en: { collection: "📖 Phrase Collection", locked: "Finish a chapter to unlock" },
  },
  dilemma: {
    id: { before: "🚩 Sebelum lanjut...", skip: "Lewati", continueQuiz: "Lanjut ke Kuis →" },
    en: { before: "🚩 Before you continue...", skip: "Skip", continueQuiz: "Continue to Quiz →" },
  },
  bindo: {
    id: {
      tagline: "Petualangan Kata & Cerita",
      soloAdventure: "Solo Adventure",
      soloSub: "Main sendiri",
      multiplayer: "Multiplayer",
      multiplayerSub: "Lawan teman",
      comingSoon: "Mode ini segera hadir! 🚧",
      babDone: "{n} Bab Selesai",
      allDone: "Selesai semua!",
      wordOfDay: "Kata Hari Ini",
      funFact: "Fakta Menarik",
      questTitle: "Jejak Ceritamu",
      preparingChapters: "Menyiapin bab...",
      loadErrorChapters: "Gagal muat bab. Coba cek koneksi internet kamu, ya!",
      chapter: "Bab {n}",
      guessCta: "Main ▶",
      guessTitle: "Tebak Kata",
      guessPrompt: "Kata apa yang artinya:",
      guessRound: "Soal {i} / {n}",
    },
    en: {
      tagline: "A Word & Story Adventure",
      soloAdventure: "Solo Adventure",
      soloSub: "Play alone",
      multiplayer: "Multiplayer",
      multiplayerSub: "Play a friend",
      comingSoon: "This mode is coming soon! 🚧",
      babDone: "{n} Chapters Done",
      allDone: "All done!",
      wordOfDay: "Word of the Day",
      funFact: "Fun Fact",
      questTitle: "Your Story Trail",
      preparingChapters: "Getting the chapters ready...",
      loadErrorChapters: "Couldn't load the chapters. Check your internet connection!",
      chapter: "Chapter {n}",
      guessCta: "Play ▶",
      guessTitle: "Guess the Word",
      guessPrompt: "Which word means:",
      guessRound: "Round {i} / {n}",
    },
  },
  scramble: {
    id: {
      title: "Susun Kata",
      entryCta: "🔤 Susun Kata — Main Yuk!",
      entrySubBindo: "Susun kata jadi kalimat yang benar",
      entrySubBinggris: "Susun kata jadi kalimat Inggris yang benar",
      round: "Soal {i} / {n}",
      check: "Periksa",
      shuffle: "Acak Ulang",
      nextRound: "Lanjut",
      finish: "Selesai",
      correct: "Betul! 🎉",
      wrong: "Belum pas, coba lagi!",
      tapHint: "Tap kata di bawah buat nyusun kalimatnya",
      playAgain: "Main Lagi",
    },
    en: {
      title: "Word Scramble",
      entryCta: "🔤 Word Scramble — Play Now!",
      entrySubBindo: "Put the words in the right order",
      entrySubBinggris: "Arrange the words into English!",
      round: "Round {i} / {n}",
      check: "Check",
      shuffle: "Shuffle Again",
      nextRound: "Continue",
      finish: "Done",
      correct: "Correct! 🎉",
      wrong: "Not quite, try again!",
      tapHint: "Tap the words below to build the sentence",
      playAgain: "Play Again",
    },
  },
  quiz: {
    id: { question: "Soal {i} / {n}", typeAnswer: "Ketik jawaban kamu...", answer: "Jawab", correct: "Bener! 🎉", incorrect: "Kurang tepat. Jawabannya: {answer}", savingProgress: "Nyimpen progress...", correctCount: "{correct} / {total} benar!", retryForStars: "Ulangi buat Naikin Bintang 🔁", backToTopics: "Kembali ke Topik", loadingQuestions: "Memuat soal...", loadErrorQuestions: "Gagal muat soal. Coba cek koneksi internet kamu, ya!", reviewTitle: "Yuk lihat lagi yang masih salah", yourAnswer: "Jawaban kamu", correctAnswerLabel: "Jawaban benar", askKikoAboutMiss: "Tanya Kiko soal ini", perfectRound: "Kiko: Wah, sempurna! Kamu jago banget 🎉", askKikoGeneral: "Ngobrol sama Kiko" },
    en: { question: "Question {i} / {n}", typeAnswer: "Type your answer...", answer: "Answer", correct: "Correct! 🎉", incorrect: "Not quite. The answer is: {answer}", savingProgress: "Saving progress...", correctCount: "{correct} / {total} correct!", retryForStars: "Retry for More Stars 🔁", backToTopics: "Back to Topics", loadingQuestions: "Loading questions...", loadErrorQuestions: "Couldn't load questions. Check your internet connection!", reviewTitle: "Let's review what you missed", yourAnswer: "Your answer", correctAnswerLabel: "Correct answer", askKikoAboutMiss: "Ask Kiko about this one", perfectRound: "Kiko: Wow, perfect score! You're amazing 🎉", askKikoGeneral: "Chat with Kiko" },
  },
};

function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
}

export function useT() {
  const { lang } = useLanguage();
  function t(group, key, vars) {
    const entry = STRINGS[group]?.[lang]?.[key] ?? STRINGS[group]?.id?.[key] ?? key;
    return interpolate(entry, vars);
  }
  function subjectName(subjectId) {
    const s = STRINGS.subjects[subjectId];
    if (!s) return subjectId;
    return lang === "en" ? s.en : s.id;
  }
  function subjectSub(subjectId) {
    const s = STRINGS.subjects[subjectId];
    if (!s) return "";
    return lang === "en" ? s.subEn : s.subId;
  }
  return { t, lang, subjectName, subjectSub };
}
