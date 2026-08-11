import { useRef, useState } from "react";
import Button from "../../components/ds/Button";
import KikoTutorChat from "./KikoTutorChat";
import { answersMatch } from "./normalizeAnswer";
import { useT } from "../../data/translations";

// Komponen quiz reusable -- dipakai TopicQuiz (practice per-bab normal)
// DAN FocusRoundQuiz (campur beberapa bab). Satu soal per layar, feedback +
// penjelasan abis jawab, "Lanjut" ke soal berikutnya. onFinish({correct,
// wrong, total, results, wrongLog}) dipanggil begitu semua soal abis --
// "results" = [{id, correct}] per soal (pakai ref bukan state, biar gak
// kena race batching pas dibaca di finish), dipakai FocusRoundQuiz buat
// breakdown correct/wrong per topik asal soal.
//
// Tipe soal (2026-08-11, request eksplisit user: "kerjakan semua opsi
// jawaban") -- SEMUA nge-tap, gak ada yang ngetik lagi kecuali `short_answer`
// (dipertahankan buat backward-compat konten lama, tapi DIMINIMALISIR di
// content -- lihat script konversi di content-pipeline):
//   - multiple_choice -- tombol pilihan (yang lama, gak berubah)
//   - true_false      -- 2 tombol besar Benar/Salah
//   - match           -- menjodohkan, tap 1 kiri + 1 kanan buat pasangin
//   - sequence        -- urutkan, tap item satu-satu sesuai urutan yang benar
//   - fill_blank      -- isi kalimat rumpang, TAP dari word bank (bukan
//                        ngetik) -- ini pengganti short_answer yang paling
//                        langsung nembak akar masalah "salah ketik dianggap
//                        salah", interaksinya sama kayak MC (tap, bukan
//                        ngetik) cuma tampilannya kalimat+chip bukan list
//                        tombol.
//   - (default/short_answer) -- input teks manual, SATU-SATUNYA yang masih
//                        bisa kena typo, makanya `answersMatch()` sekarang
//                        fuzzy (lihat normalizeAnswer.js).
//
// "Tap-pilih visual" yang tadinya diusulin terpisah dari multiple_choice
// SENGAJA DIGABUNG ke multiple_choice -- dua-duanya sama-sama "tap tombol,
// gak ngetik", bedanya cuma kalau ada ASET GAMBAR per opsi (yang app ini
// belum punya pipeline-nya buat soal teks) -- gak ada gunanya jadi tipe
// terpisah tanpa gambar beneran.
export default function QuizRunner({ questions, onFinish, subjectName, gradeLabel, topicTitle }) {
  const { t } = useT();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  // State per-tipe interaktif (match/sequence) -- direset tiap ganti soal
  const [matchedPairs, setMatchedPairs] = useState([]); // index kiri yang udah bener kepasang
  const [pickedLeft, setPickedLeft] = useState(null);
  const [shakeRight, setShakeRight] = useState(null);
  const [matchMistake, setMatchMistake] = useState(false);
  const [seqPicked, setSeqPicked] = useState([]); // array of item text, urutan tap anak
  const [seqMistake, setSeqMistake] = useState(false);
  const logRef = useRef([]);
  // Detail LENGKAP tiap soal yang salah (bukan cuma {id,correct} kayak
  // `logRef`) -- dipake buat rekap "yang masih perlu dilatih" abis quiz
  // + jadi konteks buat Kiko pas anak tanya kenapa salah.
  const wrongLogRef = useRef([]);
  // Urutan tampil kanan (match) & item (sequence) di-acak SEKALI per soal,
  // bukan tiap render -- disimpen di ref biar gak ke-shuffle ulang tiap
  // klik (React re-render tiap setState).
  const shuffleRef = useRef({ forId: null, right: null, items: null });

  const q = questions[index];

  if (shuffleRef.current.forId !== q.id) {
    shuffleRef.current = {
      forId: q.id,
      right: q.type === "match" ? shuffle(q.pairs.map((p) => p.right)) : null,
      items: q.type === "sequence" ? shuffle(q.items) : null,
    };
  }

  const isMc = q.type === "multiple_choice";
  const isTrueFalse = q.type === "true_false";
  const isMatch = q.type === "match";
  const isSequence = q.type === "sequence";
  const isFillBlank = q.type === "fill_blank";
  const isTapChoice = isMc || isTrueFalse || isFillBlank;
  const given = isTapChoice ? selected : isMatch || isSequence ? null : textAnswer;

  function finalize(correct, givenDisplay) {
    if (answered) return;
    setAnswered(true);
    setIsCorrect(correct);
    logRef.current.push({ id: q.id, correct });
    if (correct) setCorrectCount((c) => c + 1);
    else {
      setWrongCount((w) => w + 1);
      wrongLogRef.current.push({
        id: q.id,
        prompt: q.question,
        options: q.options,
        correctAnswer: displayAnswer(q),
        kidAnswer: givenDisplay,
        explanation: q.explanation,
      });
    }
  }

  function submit(value) {
    if (answered) return;
    const val = value ?? textAnswer;
    if (isTapChoice) setSelected(value);
    finalize(answersMatch(val, q.answer), val);
  }

  function pickLeft(i) {
    if (answered || matchedPairs.includes(i)) return;
    setPickedLeft(i);
  }

  function pickRight(rightLabel) {
    if (answered || pickedLeft == null) return;
    const correctRight = q.pairs[pickedLeft].right;
    if (correctRight === rightLabel) {
      const nextMatched = [...matchedPairs, pickedLeft];
      setMatchedPairs(nextMatched);
      setPickedLeft(null);
      if (nextMatched.length === q.pairs.length) {
        finalize(!matchMistake, q.pairs.map((p) => `${p.left} = ${p.right}`).join(", "));
      }
    } else {
      setMatchMistake(true);
      setShakeRight(rightLabel);
      setTimeout(() => setShakeRight(null), 350);
      setPickedLeft(null);
    }
  }

  function pickSeqItem(itemText) {
    if (answered || seqPicked.includes(itemText)) return;
    const expected = q.answer[seqPicked.length];
    const next = [...seqPicked, itemText];
    if (itemText !== expected) setSeqMistake(true);
    setSeqPicked(next);
    if (next.length === q.answer.length) {
      const allRight = next.every((v, i) => v === q.answer[i]);
      finalize(allRight, next.join(" → "));
    }
  }

  function next() {
    if (index + 1 >= questions.length) {
      onFinish({
        correct: correctCount,
        wrong: wrongCount,
        total: questions.length,
        results: logRef.current,
        wrongLog: wrongLogRef.current,
      });
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setTextAnswer("");
    setAnswered(false);
    setIsCorrect(false);
    setMatchedPairs([]);
    setPickedLeft(null);
    setMatchMistake(false);
    setSeqPicked([]);
    setSeqMistake(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "0 18px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--ink-400)" }}>
          {t("quiz", "question", { i: index + 1, n: questions.length })}
        </div>
        <KikoTutorChat
          resetKey={q.id}
          subjectName={subjectName}
          gradeLabel={gradeLabel}
          topicTitle={topicTitle}
          question={q.question}
          correctAnswer={q.answer}
          kidAnswer={given}
          explanation={q.explanation}
          answered={answered}
          isCorrect={isCorrect}
        />
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

        {isMc && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {q.options.map((opt) => (
              <OptionButton key={opt} opt={opt} answered={answered} selected={selected} correctAnswer={q.answer} onClick={() => submit(opt)} />
            ))}
          </div>
        )}

        {isTrueFalse && (
          <div style={{ display: "flex", gap: 10 }}>
            {["Benar", "Salah"].map((opt) => (
              <div key={opt} style={{ flex: 1 }}>
                <OptionButton opt={opt} answered={answered} selected={selected} correctAnswer={q.answer} onClick={() => submit(opt)} big />
              </div>
            ))}
          </div>
        )}

        {isFillBlank && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {q.wordBank.map((opt) => (
              <Chip key={opt} label={opt} answered={answered} selected={selected} correctAnswer={q.answer} onClick={() => submit(opt)} />
            ))}
          </div>
        )}

        {isMatch && (
          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {q.pairs.map((p, i) => (
                <button
                  key={p.left}
                  disabled={answered || matchedPairs.includes(i)}
                  onClick={() => pickLeft(i)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: pickedLeft === i ? "2px solid var(--color-success)" : "2px solid var(--cream-300)",
                    background: matchedPairs.includes(i) ? "var(--pastel-green)" : "#fff",
                    fontFamily: "var(--font-body)",
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    textAlign: "left",
                    cursor: answered || matchedPairs.includes(i) ? "default" : "pointer",
                    opacity: matchedPairs.includes(i) ? 0.7 : 1,
                  }}
                >
                  {p.left}
                </button>
              ))}
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {shuffleRef.current.right.map((r) => {
                const done = q.pairs.some((p, i) => p.right === r && matchedPairs.includes(i));
                return (
                  <button
                    key={r}
                    disabled={answered || done}
                    onClick={() => pickRight(r)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "2px solid var(--cream-300)",
                      background: done ? "var(--pastel-green)" : "#fff",
                      fontFamily: "var(--font-body)",
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      textAlign: "left",
                      cursor: answered || done ? "default" : "pointer",
                      opacity: done ? 0.7 : 1,
                      animation: shakeRight === r ? "jkQuizShake 0.35s" : undefined,
                    }}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isSequence && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, minHeight: 40 }}>
              {seqPicked.length === 0 ? (
                <div style={{ fontFamily: "var(--font-body)", fontSize: "0.8rem", color: "var(--ink-300)", fontStyle: "italic" }}>
                  {t("quiz", "sequenceHint")}
                </div>
              ) : (
                seqPicked.map((it, i) => (
                  <div
                    key={it}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 999,
                      background: seqMistake && q.answer[i] !== it ? "var(--pastel-pink)" : "var(--pastel-blue)",
                      fontFamily: "var(--font-body)",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                    }}
                  >
                    {i + 1}. {it}
                  </div>
                ))
              )}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {shuffleRef.current.items.map((it) => (
                <Chip key={it} label={it} answered={answered || seqPicked.includes(it)} selected={null} correctAnswer={null} onClick={() => pickSeqItem(it)} />
              ))}
            </div>
          </div>
        )}

        {!isTapChoice && !isMatch && !isSequence && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              disabled={answered}
              placeholder={t("quiz", "typeAnswer")}
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
                {t("quiz", "answer")}
              </Button>
            )}
          </div>
        )}

        {answered && (
          <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: isCorrect ? "var(--color-success-bg)" : "var(--color-error-bg)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: isCorrect ? "var(--color-success)" : "var(--color-error)" }}>
              {isCorrect ? t("quiz", "correct") : t("quiz", "incorrect", { answer: displayAnswer(q) })}
            </div>
            {q.explanation && (
              <div style={{ fontFamily: "var(--font-body)", fontSize: "0.82rem", color: "var(--ink-700)", marginTop: 4 }}>{q.explanation}</div>
            )}
          </div>
        )}
      </div>

      {answered && (
        <Button variant="primary" size="lg" style={{ width: "100%", marginTop: 14 }} onClick={next}>
          {index + 1 >= questions.length ? t("common", "done") : t("common", "continueLabel")}
        </Button>
      )}
      <style>{`@keyframes jkQuizShake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }`}</style>
    </div>
  );
}

function displayAnswer(q) {
  if (q.type === "match") return q.pairs.map((p) => `${p.left} = ${p.right}`).join(", ");
  if (q.type === "sequence") return q.answer.join(" → ");
  return q.answer;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function OptionButton({ opt, answered, selected, correctAnswer, onClick, big }) {
  let bg = "#fff";
  if (answered) {
    if (answersMatch(opt, correctAnswer)) bg = "var(--pastel-green)";
    else if (opt === selected) bg = "var(--pastel-pink)";
  }
  return (
    <button
      disabled={answered}
      onClick={onClick}
      style={{
        padding: big ? "18px 14px" : "12px 14px",
        borderRadius: 12,
        border: "2px solid var(--cream-300)",
        background: bg,
        fontFamily: "var(--font-body)",
        fontWeight: 700,
        fontSize: big ? "1rem" : undefined,
        textAlign: big ? "center" : "left",
        width: "100%",
        cursor: answered ? "default" : "pointer",
      }}
    >
      {opt}
    </button>
  );
}

function Chip({ label, answered, selected, correctAnswer, onClick }) {
  let bg = "var(--pastel-blue)";
  if (answered && correctAnswer != null) {
    if (answersMatch(label, correctAnswer)) bg = "var(--pastel-green)";
    else if (label === selected) bg = "var(--pastel-pink)";
  }
  return (
    <button
      disabled={answered}
      onClick={onClick}
      style={{
        padding: "9px 16px",
        borderRadius: 999,
        border: "none",
        background: bg,
        fontFamily: "var(--font-body)",
        fontWeight: 700,
        fontSize: "0.85rem",
        cursor: answered ? "default" : "pointer",
        opacity: answered && correctAnswer == null ? 0.55 : 1,
      }}
    >
      {label}
    </button>
  );
}
