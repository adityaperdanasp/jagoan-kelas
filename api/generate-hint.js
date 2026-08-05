// Vercel serverless function -- AI Tutor v1, di-port dari pola BrainBox
// (al-idrisi-games/api/generate-hint.js), disederhanain ke single-shot
// (BrainBox versi awal juga single-shot sebelum di-upgrade ke chat
// interaktif -- lihat CLAUDE.md BrainBox bagian "Bo (maskot AI)"). Ditarik
// on-demand (tombol "🤖 Jelasin lagi" di QuizRunner pas jawaban salah),
// BUKAN otomatis tiap jawaban salah -- biar biaya API kepake cuma pas
// beneran diminta anak.
//
// ANTHROPIC_API_KEY WAJIB di-set manual di Vercel project env vars (gak
// bisa diwakilin -- itu API key akun Anthropic user sendiri). Kalau
// belum ke-set, endpoint ini balikin 500 dan client-side-nya cuma
// nyembunyiin tombol/card hint, GAK PERNAH nge-block kuis (sama filosofi
// kayak BrainBox).
//
// Beda penting dari BrainBox: konten Jagoan Kelas semua Bahasa Indonesia
// (anak SD Indonesia), jadi system prompt & respons WAJIB Bahasa
// Indonesia, bukan Inggris kayak BrainBox punya.
const SYSTEM_PROMPT = `Kamu adalah tutor AI ramah di Jagoan Kelas, aplikasi belajar buat anak SD Indonesia (kelas 1-6). Tugasmu: kasih penjelasan singkat & hangat buat anak yang baru aja salah jawab 1 soal.
Gaya bicara: kayak kakak/teman yang sabar dan seru belajar, BUKAN kayak buku teks atau asisten AI generik. Bahasa Indonesia yang santai tapi sopan, sesuai umur anak SD, TANPA markdown/bullet point, emoji secukupnya kalau pas aja.
Jawaban HARUS pendek: 1-3 kalimat aja.
Jelasin KENAPA jawaban yang benar itu benar, pakai angka/kata dari soal itu sendiri -- jangan cuma ngulang jawabannya doang.
Jangan pernah ngarang fakta di luar yang dikasih. Selalu kasih semangat di akhir -- jawaban salah itu bagian dari belajar, bukan hal yang harus bikin minder. Jangan nyebut nama anaknya di setiap kalimat, cukup sesekali kalau natural.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { subjectName, gradeLabel, topic, question, correctAnswer, kidAnswer, explanation } = req.body || {};
  if (!question || typeof question !== "string") {
    res.status(400).json({ error: "Missing 'question'" });
    return;
  }
  if (correctAnswer === undefined || correctAnswer === null) {
    res.status(400).json({ error: "Missing 'correctAnswer'" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server not configured: ANTHROPIC_API_KEY missing" });
    return;
  }

  const facts = {
    mataPelajaran: subjectName,
    kelas: gradeLabel,
    topik: topic,
    soal: question,
    jawabanBenar: correctAnswer,
    jawabanAnak: kidAnswer ?? "(gak dijawab / waktu habis)",
    penjelasanSingkat: explanation,
  };

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
        max_tokens: 200,
        system: SYSTEM_PROMPT,
        messages: [
          { role: "user", content: `Soal yang baru aja salah dijawab (JSON):\n${JSON.stringify(facts)}` },
        ],
      }),
    });

    const data = await anthropicRes.json();
    if (!anthropicRes.ok) {
      res.status(anthropicRes.status).json({ error: data.error?.message || "Anthropic API error" });
      return;
    }

    const hint = (data.content || []).find((b) => b.type === "text")?.text?.trim();
    if (!hint) {
      res.status(502).json({ error: "AI gak ngasih balasan teks" });
      return;
    }
    res.status(200).json({ hint });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
