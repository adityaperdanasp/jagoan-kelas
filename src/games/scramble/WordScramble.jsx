import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Shell, { ScreenHeader } from "../../components/Shell";
import Button from "../../components/ds/Button";
import { SENTENCES } from "../../data/wordScramble";
import { pickEncouragement } from "../../data/encouragement";
import { TRACK_BY_SUBJECT, useBgmTrack } from "../../data/bgm";
import { useT } from "../../data/translations";

// "Susun Kata" (2026-08-09) -- mini-game ORISINIL, gameplay pertama yang
// SHARED lintas Bindo & Binggris (1 komponen, 2 skin) -- user: "gameplay
// apa yang harus gw kembangin buat bahasa indonesia dan bahasa inggris
// agar lebih menarik, ga static aja" -> dipilih "Susun Kata" karena bisa
// dibangun sekali dipake 2 kali (pola sama kayak Dino Bridge/Focus Round
// yang juga lintas-subject), ketimbang bikin 2 mekanik beda dari nol.
// BUKAN bagian dari sistem progress/XP resmi (gak nulis ke Firestore) --
// pola sama kayak Dino Bridge, murni bonus mini-game buat variasi.
const ROUNDS_PER_SESSION = 5;

function shuffleWords(sentence) {
  const words = sentence.split(" ");
  const tagged = words.map((text, i) => ({ id: `${i}-${text}`, text }));
  let shuffled = tagged;
  // Kalimat cuma 5 kata -- kemungkinan hasil acak SAMA PERSIS urutan asli
  // lumayan (1/120), jadi coba ulang sampe beda biar gak langsung ke-jawab.
  let attempts = 0;
  do {
    shuffled = [...tagged].sort(() => Math.random() - 0.5);
    attempts += 1;
  } while (attempts < 8 && shuffled.every((w, i) => w.id === tagged[i].id));
  return shuffled;
}

export default function WordScramble() {
  const { grade, subject } = useParams(); // subject: "bindo" | "binggris"
  const navigate = useNavigate();
  const { t, subjectName } = useT();
  useBgmTrack(TRACK_BY_SUBJECT[subject]);

  const pool = SENTENCES[subject] || SENTENCES.bindo;
  const [startIdx] = useState(() => Math.floor(Math.random() * pool.length));
  const [roundIndex, setRoundIndex] = useState(0);
  const [words, setWords] = useState([]);
  const [answerOrder, setAnswerOrder] = useState([]);
  const [checked, setChecked] = useState(null); // null | "correct" | "wrong"
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [encouragement, setEncouragement] = useState("");

  const sentence = pool[(startIdx + roundIndex) % pool.length];

  useEffect(() => {
    setWords(shuffleWords(sentence));
    setAnswerOrder([]);
    setChecked(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIndex, subject]);

  function tapTrayWord(id) {
    if (checked === "correct") return;
    setChecked(null);
    setAnswerOrder((cur) => [...cur, id]);
  }
  function tapAnswerWord(id) {
    if (checked === "correct") return;
    setChecked(null);
    setAnswerOrder((cur) => cur.filter((x) => x !== id));
  }
  function reshuffle() {
    setWords(shuffleWords(sentence));
    setAnswerOrder([]);
    setChecked(null);
  }
  function checkAnswer() {
    const built = answerOrder.map((id) => words.find((w) => w.id === id)?.text).join(" ");
    const ok = built === sentence;
    setChecked(ok ? "correct" : "wrong");
    if (ok) setCorrectCount((c) => c + 1);
  }
  function nextRound() {
    if (roundIndex + 1 >= ROUNDS_PER_SESSION) {
      setEncouragement(pickEncouragement(correctCount / ROUNDS_PER_SESSION));
      setFinished(true);
      return;
    }
    setRoundIndex((i) => i + 1);
  }
  function restart() {
    setRoundIndex(0);
    setCorrectCount(0);
    setFinished(false);
  }

  const tray = useMemo(() => words.filter((w) => !answerOrder.includes(w.id)), [words, answerOrder]);
  const answerWords = answerOrder.map((id) => words.find((w) => w.id === id)).filter(Boolean);
  const allPlaced = answerOrder.length === words.length && words.length > 0;

  return (
    <Shell>
      <ScreenHeader
        onBack={() => navigate(`/kelas/${grade}/${subject}`)}
        title={t("scramble", "title")}
        subtitle={`${subjectName(subject)} · ${t("common", "grade")} ${grade}`}
      />

      {!finished ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 18px 18px" }}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--ink-400)", marginTop: 8 }}>
            {t("scramble", "round", { i: roundIndex + 1, n: ROUNDS_PER_SESSION })}
          </div>

          <div style={{ fontFamily: "var(--font-body)", fontSize: "0.72rem", color: "var(--ink-400)", margin: "4px 0 10px" }}>
            {t("scramble", "tapHint")}
          </div>

          <div
            style={{
              minHeight: 70,
              background: "var(--surface-card-alt)",
              borderRadius: "var(--radius-xl)",
              padding: 12,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
              boxShadow: "var(--shadow-sticker-sm)",
            }}
          >
            {answerWords.map((w) => (
              <button
                key={w.id}
                onClick={() => tapAnswerWord(w.id)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: `2px solid ${checked === "correct" ? "var(--color-success)" : checked === "wrong" ? "var(--color-error)" : "var(--cream-300)"}`,
                  background: checked === "correct" ? "var(--pastel-green)" : checked === "wrong" ? "var(--pastel-pink)" : "#fff",
                  fontFamily: "var(--font-body)",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {w.text}
              </button>
            ))}
          </div>

          {checked && (
            <div
              style={{
                marginTop: 10,
                fontFamily: "var(--font-body)",
                fontWeight: 700,
                color: checked === "correct" ? "var(--color-success)" : "var(--color-error)",
              }}
            >
              {checked === "correct" ? t("scramble", "correct") : t("scramble", "wrong")}
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18 }}>
            {tray.map((w) => (
              <button
                key={w.id}
                onClick={() => tapTrayWord(w.id)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "2px solid var(--cream-300)",
                  background: "var(--cream-100)",
                  fontFamily: "var(--font-body)",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {w.text}
              </button>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          {checked === "correct" ? (
            <Button variant="primary" size="lg" style={{ width: "100%" }} onClick={nextRound}>
              {roundIndex + 1 >= ROUNDS_PER_SESSION ? t("scramble", "finish") : t("scramble", "nextRound")}
            </Button>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              <Button variant="secondary" size="lg" style={{ flex: 1 }} onClick={reshuffle}>
                {t("scramble", "shuffle")}
              </Button>
              <Button variant="primary" size="lg" style={{ flex: 1 }} disabled={!allPlaced} onClick={checkAnswer}>
                {t("scramble", "check")}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 56 }}>{correctCount >= ROUNDS_PER_SESSION - 1 ? "🎉" : "💪"}</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem", color: "var(--ink-900)" }}>
            {t("quiz", "correctCount", { correct: correctCount, total: ROUNDS_PER_SESSION })}
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, color: "var(--ink-700)", maxWidth: 240 }}>{encouragement}</div>
          <Button variant="secondary" size="lg" style={{ width: "100%" }} onClick={restart}>
            {t("scramble", "playAgain")}
          </Button>
          <Button variant="primary" size="lg" style={{ width: "100%" }} onClick={() => navigate(`/kelas/${grade}/${subject}`)}>
            {t("common", "back")}
          </Button>
        </div>
      )}
    </Shell>
  );
}
