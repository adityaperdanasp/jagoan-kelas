import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Shell, { ScreenHeader } from "../components/Shell";
import Button from "../components/ds/Button";
import QuizRunner from "../games/quiz/QuizRunner";
import { loadTopicByKey } from "../data/contentLoader";
import { recordTopicResult, starsFor } from "../data/progressService";
import { pickEncouragement } from "../data/encouragement";
import { usePlayer } from "../data/PlayerContext";
import { SUBJECTS } from "../data/content";

const ROUND_SIZE = 8;
const XP_PER_CORRECT = 10;

function pickRound(soal) {
  const shuffled = [...soal].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(ROUND_SIZE, shuffled.length));
}

export default function TopicQuiz() {
  const { grade, subject, babKey } = useParams();
  const navigate = useNavigate();
  const { player, login } = usePlayer();
  const [topic, setTopic] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadTopicByKey(subject, grade, babKey).then((t) => {
      if (cancelled) return;
      setTopic(t);
      if (t) setQuestions(pickRound(t.soal));
    });
    return () => {
      cancelled = true;
    };
  }, [subject, grade, babKey]);

  async function handleFinish({ correct, wrong }) {
    setSaving(true);
    const xpEarned = correct * XP_PER_CORRECT;
    try {
      await recordTopicResult(player.id, subject, grade, babKey, { correct, wrong, xpEarned });
      login({ ...player, xp: (player.xp || 0) + xpEarned });
    } finally {
      setSaving(false);
      const accuracy = correct / (correct + wrong || 1);
      setResult({ correct, wrong, xpEarned, encouragement: pickEncouragement(accuracy) });
    }
  }

  function handleRetry() {
    setResult(null);
    setQuestions(pickRound(topic.soal));
  }

  return (
    <Shell>
      <ScreenHeader onBack={() => navigate(`/kelas/${grade}/${subject}`)} title={topic?.title || "Topik"} subtitle={`Kelas ${grade}`} />

      {!questions && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-400)" }}>Memuat soal...</div>
      )}

      {questions && !result && (
        <QuizRunner
          questions={questions}
          onFinish={handleFinish}
          subjectName={SUBJECTS.find((s) => s.id === subject)?.name}
          gradeLabel={`Kelas ${grade}`}
          topicTitle={topic?.title}
        />
      )}

      {result && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 56 }}>{result.correct >= result.wrong ? "🎉" : "💪"}</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem", color: "var(--ink-900)" }}>
            {result.correct} / {result.correct + result.wrong} benar!
          </div>
          <div style={{ fontSize: 28, letterSpacing: 4 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ opacity: i < starsFor(result.correct / (result.correct + result.wrong || 1)) ? 1 : 0.25 }}>⭐</span>
            ))}
          </div>
          <div style={{ fontFamily: "var(--font-body)", color: "var(--ink-500)" }}>
            {saving ? "Nyimpen progress..." : `+${result.xpEarned} XP`}
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, color: "var(--ink-700)", maxWidth: 240 }}>
            {result.encouragement}
          </div>
          <Button variant="secondary" size="lg" onClick={handleRetry}>
            Ulangi buat Naikin Bintang 🔁
          </Button>
          <Button variant="primary" size="lg" onClick={() => navigate(`/kelas/${grade}/${subject}`)}>
            Kembali ke Topik
          </Button>
        </div>
      )}
    </Shell>
  );
}
