// Vercel serverless function -- AI Tutor v2 (2026-08-06), gantiin
// generate-hint.js (single-shot, DIHAPUS -- gak ada pemanggil lain lagi
// begitu QuizRunner pindah ke endpoint ini) jadi chat interaktif
// multi-turn, dipasangin wajah Kiko (maskot resmi) di UI (lihat
// KikoTutorChat.jsx). Beda dari v1: nerima `messages` (riwayat percakapan)
// dan dipanggil SELALU BISA diakses anak (bukan cuma on-demand pas jawaban
// salah) -- lihat komentar QuizRunner.jsx buat detail kapan tombolnya
// muncul.
//
// ANTHROPIC_API_KEY sama kayak v1 (WAJIB di-set manual di Vercel env
// vars, udah ke-set dari aktivasi v1 2026-08-05, gak perlu di-set ulang).
// Gagal = client-side nampilin bubble error ramah, TETEP GAK PERNAH
// nge-block kuis.
const SYSTEM_PROMPT_BASE = `Kamu adalah Kiko, maskot AI ramah di Jagoan Kelas, aplikasi belajar buat anak SD Indonesia (kelas 1-6). Kamu lagi ngobrol langsung sama anak lewat chat buat bantuin dia ngerjain 1 soal.
Gaya bicara: kayak kakak/teman yang sabar, ceria, dan seru belajar -- BUKAN kayak buku teks atau asisten AI generik. Bahasa Indonesia santai tapi sopan, sesuai umur anak SD. TULIS PLAIN TEXT DOANG -- JANGAN PERNAH pakai simbol markdown apapun (**tebal**, *miring*, # judul, bullet -/*, dst), walaupun buat nekenin bagian penting -- chat-nya nampilin teks apa adanya, simbol markdown bakal keliatan literal sebagai tanda bintang/pagar ke anak, bukan format. Boleh sesekali pakai emoji tapi jangan berlebihan.
Balasan HARUS pendek: maksimal 2-3 kalimat tiap giliran, biar enak dibaca anak-anak.
Jangan pernah ngarang fakta di luar konteks soal yang dikasih. Selalu suportif -- kalau anak masih bingung/salah, itu bagian normal dari belajar, bukan hal yang bikin minder.
ATURAN PALING PENTING soal ngasih jawaban: kalau field "sudahJawab" di konteks soal itu false, JANGAN PERNAH langsung kasih tau jawaban akhirnya -- kasih PETUNJUK/HINT/cara mikir aja biar anak nemuin sendiri jawabannya, walaupun anak minta jawaban langsung. Kalau "sudahJawab" true (anak udah submit jawaban), baru boleh jelasin kenapa jawaban yang benar itu benar, pakai angka/kata dari soal itu sendiri.
ATURAN TOPIK: kamu CUMA boleh ngobrolin soal/pelajaran yang lagi dibahas (konteks soal di bawah) -- gak ngasih hint pelajaran lain, gak ngobrolin hal di luar pelajaran sama sekali (topik random, curhat, minta cerita, dll), APALAGI hal yang gak pantas buat anak SD. Kalau anak nanya/ngajak ngobrol di luar itu, JANGAN ikutin topiknya walau sepintas -- tolak dengan ramah singkat terus ARAHIN BALIK ke soal yang lagi dikerjain (misal ajak coba mikirin soalnya lagi atau tawarin kasih petunjuk). Jangan ceramah panjang soal aturan ini ke anak, cukup 1 kalimat redirect terus lanjut fokus ke soal.`;

// Mode "general" (2026-08-06) -- Kiko di-tap langsung dari hero Landing.jsx
// (BUKAN dari dalam 1 soal quiz kayak mode di atas), jadi gak ada
// "sudahJawab"/topik-soal-spesifik buat dijadiin batasan. Tetep dikasih
// guardrail konten (aman buat anak SD) walau topiknya lebih bebas.
const GENERAL_SYSTEM_PROMPT = `Kamu adalah Kiko, maskot AI ramah di Jagoan Kelas, aplikasi belajar buat anak SD Indonesia (kelas 1-6). Anak lagi ngajak ngobrol bebas (BUKAN pas ngerjain soal tertentu).
Gaya bicara: kayak kakak/teman yang ceria dan seru, Bahasa Indonesia santai tapi sopan, sesuai umur anak SD. TULIS PLAIN TEXT DOANG -- JANGAN PERNAH pakai simbol markdown apapun.
Balasan HARUS pendek: maksimal 2-3 kalimat tiap giliran.
Boleh ngobrolin apa aja yang WAJAR buat anak SD (pelajaran sekolah, hal-hal seru seputar app ini, semangatin belajar, jawab pertanyaan umum sederhana) TAPI kalau ditanya/diajak hal yang gak pantas atau gak wajar buat anak SD, TOLAK dengan ramah terus alihin ke topik positif -- jangan ceramah panjang, cukup 1 kalimat redirect. Jangan pernah ngarang fakta serius (sejarah/sains/dll) -- kalau gak yakin, ngaku jujur gak tau daripada asal jawab.`;

// Safety net kalau model tetep keceplosan pakai markdown walau udah
// dilarang di system prompt (LLM gak selalu 100% nurut instruksi
// formatting) -- bubble chat di KikoTutorChat.jsx nampilin teks polos,
// jadi **tebal**/# dst bakal keliatan literal ke anak kalau gak di-strip.
function stripMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const {
    subjectName,
    gradeLabel,
    topic,
    question,
    correctAnswer,
    kidAnswer,
    explanation,
    sudahJawab,
    messages,
  } = req.body || {};

  // Ada 'question' = lagi bahas 1 soal quiz (dari KikoTutorChat.jsx di
  // QuizRunner). Gak ada = chat umum (dari Kiko di Landing.jsx hero) --
  // dibedain dari ADA-GAKNYA field ini, bukan flag terpisah, biar client
  // gak perlu ngirim apa-apa ekstra buat mode umum.
  const isQuizMode = question !== undefined && question !== null;
  if (isQuizMode) {
    if (typeof question !== "string") {
      res.status(400).json({ error: "'question' harus string" });
      return;
    }
    if (correctAnswer === undefined || correctAnswer === null) {
      res.status(400).json({ error: "Missing 'correctAnswer'" });
      return;
    }
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "Missing 'messages'" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server not configured: ANTHROPIC_API_KEY missing" });
    return;
  }

  const facts = isQuizMode
    ? {
        mataPelajaran: subjectName,
        kelas: gradeLabel,
        topik: topic,
        soal: question,
        jawabanBenar: correctAnswer,
        jawabanAnak: kidAnswer ?? "(belum jawab)",
        penjelasanSingkat: explanation,
        sudahJawab: !!sudahJawab,
      }
    : null;

  const chatMessages = messages
    .filter((m) => m && typeof m.text === "string" && m.text.trim())
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text.trim() }));

  if (chatMessages.length === 0 || chatMessages[0].role !== "user") {
    res.status(400).json({ error: "'messages' harus mulai dari giliran anak (role user)" });
    return;
  }

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 220,
        system: isQuizMode
          ? `${SYSTEM_PROMPT_BASE}\n\nKonteks soal yang lagi dibahas (JSON, buat kamu ngerti -- JANGAN ditunjukin mentah ke anak):\n${JSON.stringify(facts)}`
          : GENERAL_SYSTEM_PROMPT,
        messages: chatMessages,
      }),
    });

    const data = await anthropicRes.json();
    if (!anthropicRes.ok) {
      res.status(anthropicRes.status).json({ error: data.error?.message || "Anthropic API error" });
      return;
    }

    const reply = (data.content || []).find((b) => b.type === "text")?.text?.trim();
    if (!reply) {
      res.status(502).json({ error: "AI gak ngasih balasan teks" });
      return;
    }
    res.status(200).json({ reply: stripMarkdown(reply) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
