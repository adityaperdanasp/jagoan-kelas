import { useRef, useState } from "react";
import Button from "../../components/ds/Button";
import { answersMatch } from "./normalizeAnswer";

// Komponen quiz reusable -- dipakai TopicQuiz (practice per-bab normal)
// DAN FocusRoundQuiz (campur beberapa bab). Satu soal per layar, MC
// (tombol) atau short_answer (input teks), feedback + penjelasan abis
// jawab, "Lanjut" ke soal berikutnya. onFinish({correct, wrong, total, results})
// dipanggil begitu semua soal abis -- "results" = [{id, correct}] per soal
// (pakai ref bukan state, biar gak kena race batching pas dibaca di finish),
// dipakai FocusRoundQuiz buat breakdown correct/wrong per topik asal soal.
//
// AI Tutor (2026-08-05) -- tombol "🤖 Jelasin lagi" ON-DEMAND pas jawaban
// salah (bukan otomatis, biar API kepake cuma pas beneran diminta),
// manggil /api/generate-hint (Vercel serverless, lihat file itu). Gagal
// (network/API key belum di-set) = tombol ilang diem-diem, GAK PERNAH
// nge-block kuis -- sama filosofi kayak BrainBox.
export default function QuizRunner({ questions, onFinish, subjectName, gradeLabel, topicTitle }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [hint, setHint] = useState(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintFailed, setHintFailed] = useState(false);
  const logRef = useRef([]);

  const q = questions[index];
  const isMc = q.type === "multiple_choice";
  const given = isMc ? selected : textAnswer;
  const isCorrect = answered && answersMatch(given, q.answer);

  function submit(value) {
    if (answered) return;
    const val = value ?? textAnswer;
    if (isMc) setSelected(value);
    const correct = answersMatch(val, q.answer);
    setAnswered(true);
    logRef.current.push({ id: q.id, correct });
    if (correct) setCorrectCount((c) => c + 1);
    else setWrongCount((w) => w + 1);
  }

  async function askHint() {
    setHintLoading(true);
    setHintFailed(false);
    try {
      const res = await fetch("/api/generate-hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectName,
          gradeLabel,
          topic: topicTitle,
          question: q.question,
          correctAnswer: q.answer,
          kidAnswer: given,
          explanation: q.explanation,
        }),
      });
      if (!res.ok) throw new Error("hint request failed");
      const data = await res.json();
      if (!data.hint) throw new Error("no hint in response");
      setHint(data.hint);
    } catch {
      // Diem-diem gagal -- tombol/card hint ilang, kuis TETEP jalan.
      setHintFailed(true);
    } finally {
      setHintLoading(false);
    }
  }

  function next() {
    setHint(null);
    setHintFailed(false);
    if (index + 1 >= questions.length) {
      onFinish({
        correct: correctCount,
        wrong: wrongCount,
        total: questions.length,
        results: logRef.current,
      });
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setTextAnswer("");
    setAnswered(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "0 18px 18px" }}>
      <div style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--ink-400)", marginBottom: 8 }}>
        Soal {index + 1} / {questions.length}
      </div>

      <div
        style={{
          background: "var(--surface-card-alt)",
          borderRadius: "var(--radius-xl)",
          padding: 20,
          boxShadow: "var(--shadow-sticker-sm)",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem", color: "var(--ink-900)", marginBottom: 18 }}>
          {q.question}
        </div>

        {isMc ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {q.options.map((opt) => {
              let bg = "#fff";
              if (answered) {
                if (answersMatch(opt, q.answer)) bg = "var(--pastel-green)";
                else if (opt === selected) bg = "var(--pastel-pink)";
              }
              return (
                <button
                  key={opt}
                  disabled={answered}
                  onClick={() => submit(opt)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "2px solid var(--cream-300)",
                    background: bg,
                    fontFamily: "var(--font-body)",
                    fontWeight: 700,
                    textAlign: "left",
                    cursor: answered ? "default" : "pointer",
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              disabled={answered}
              placeholder="Ketik jawaban kamu..."
              style={{
                border: `2px solid ${answered ? (isCorrect ? "var(--color-success)" : "var(--color-error)") : "var(--cream-300)"}`,
                borderRadius: "var(--radius-lg)",
                padding: "12px 14px",
                fontFamily: "var(--font-body)",
                fontSize: "1rem",
                fontWeight: 700,
              }}
              onKeyDown={(e) => e.key === "Enter" && !answered && textAnswer && submit()}
            />
            {!answered && (
              <Button variant="secondary" disabled={!textAnswer} onClick={() => submit()}>
                Jawab
              </Button>
            )}
          </div>
        )}

        {answered && (
          <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: isCorrect ? "var(--color-success-bg)" : "var(--color-error-bg)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: isCorrect ? "var(--color-success)" : "var(--color-error)" }}>
              {isCorrect ? "Bener! 🎉" : `Kurang tepat. Jawabannya: ${q.answer}`}
            </div>
            {q.explanation && (
              <div style={{ fontFamily: "var(--font-body)", fontSize: "0.82rem", color: "var(--ink-700)", marginTop: 4 }}>{q.explanation}</div>
            )}
            {!isCorrect && !hint && !hintFailed && (
              <Button variant="secondary" size="sm" disabled={hintLoading} onClick={askHint} style={{ marginTop: 10 }}>
                {hintLoading ? "Mikir..." : "🤖 Jelasin Lagi"}
              </Button>
            )}
            {hint && (
              <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: "var(--surface-card-alt)", display: "flex", gap: 8 }}>
                <span style={{ fontSize: "1.1rem" }}>🤖</span>
                <div style={{ fontFamily: "var(--font-body)", fontSize: "0.82rem", color: "var(--ink-700)" }}>{hint}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {answered && (
        <Button variant="primary" size="lg" style={{ width: "100%", marginTop: 14 }} onClick={next}>
          {index + 1 >= questions.length ? "Selesai" : "Lanjut"}
        </Button>
      )}
    </div>
  );
}
