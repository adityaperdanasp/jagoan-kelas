import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Shell, { ScreenHeader } from "../components/Shell";
import Button from "../components/ds/Button";
import PageDecor from "../components/PageDecor";
import QuizRunner from "../games/quiz/QuizRunner";
import Kiko from "../components/ds/Kiko";
import { KikoChatPanel } from "../games/quiz/KikoTutorChat";
import { loadTopicByKey } from "../data/contentLoader";
import { recordTopicResult, starsFor } from "../data/progressService";
import { pickEncouragement } from "../data/encouragement";
import { usePlayer } from "../data/PlayerContext";
import { useT } from "../data/translations";

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
  const { t, subjectName } = useT();
  const [topic, setTopic] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatWrongIdx, setChatWrongIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    loadTopicByKey(subject, grade, babKey)
      .then((t) => {
        if (cancelled) return;
        setTopic(t);
        if (t) setQuestions(pickRound(t.soal));
      })
      .catch(() => {
        // Dulu gak ke-tangkep -- gagal load = "Memuat soal..." nyangkut
        // selamanya, gak ada pesan error/cara coba lagi.
        if (cancelled) return;
        setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [subject, grade, babKey, retryTick]);

  async function handleFinish({ correct, wrong, wrongLog }) {
    setSaving(true);
    const xpEarned = correct * XP_PER_CORRECT;
    try {
      await recordTopicResult(player.id, subject, grade, babKey, { correct, wrong, xpEarned });
      login({ ...player, xp: (player.xp || 0) + xpEarned });
    } finally {
      setSaving(false);
      const accuracy = correct / (correct + wrong || 1);
      setResult({ correct, wrong, xpEarned, encouragement: pickEncouragement(accuracy), wrongLog: wrongLog || [] });
      setChatWrongIdx(0);
    }
  }

  function openKikoFor(idx) {
    setChatWrongIdx(idx);
    setChatOpen(true);
  }

  function handleRetry() {
    setResult(null);
    setQuestions(pickRound(topic.soal));
  }

  return (
    <Shell>
      <PageDecor seed={"topic-" + subject + "-" + babKey} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1 }}>
      <ScreenHeader onBack={() => navigate(`/kelas/${grade}/${subject}`)} title={topic?.title || t("common", "topic")} subtitle={`${t("common", "grade")} ${grade}`} />

      {!questions && !loadError && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-400)" }}>{t("quiz", "loadingQuestions")}</div>
      )}

      {loadError && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center" }}>
          <div style={{ color: "var(--ink-400)" }}>{t("quiz", "loadErrorQuestions")}</div>
          <Button variant="secondary" size="sm" onClick={() => setRetryTick((n) => n + 1)}>
            {t("common", "retry")}
          </Button>
        </div>
      )}

      {questions && !result && (
        <QuizRunner
          questions={questions}
          onFinish={handleFinish}
          subjectName={subjectName(subject)}
          gradeLabel={`${t("common", "grade")} ${grade}`}
          topicTitle={topic?.title}
        />
      )}

      {result && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "24px 18px", overflowY: "auto", textAlign: "center" }}>
          <div style={{ fontSize: 56 }}>{result.correct >= result.wrong ? "🎉" : "💪"}</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem", color: "var(--ink-900)" }}>
            {t("quiz", "correctCount", { correct: result.correct, total: result.correct + result.wrong })}
          </div>
          <div style={{ fontSize: 28, letterSpacing: 4 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ opacity: i < starsFor(result.correct / (result.correct + result.wrong || 1)) ? 1 : 0.25 }}>⭐</span>
            ))}
          </div>
          <div style={{ fontFamily: "var(--font-body)", color: "var(--ink-500)" }}>
            {saving ? t("quiz", "savingProgress") : `+${result.xpEarned} XP`}
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, color: "var(--ink-700)", maxWidth: 240 }}>
            {result.encouragement}
          </div>

          {/* Kiko + rekap (2026-08-10) -- port pola MathVille: abis quiz
              selesai, Kiko SELALU muncul (kalau sempurna = ucapan selamat,
              kalau ada yang salah = ajakan bahas soalnya), plus daftar
              soal yang salah biar anak/ortu bisa liat langsung apa yang
              perlu dilatih lagi (bukan cuma skor doang). */}
          <div style={{ width: "100%", maxWidth: 380 }}>
            {result.wrongLog.length === 0 ? (
              <button
                onClick={() => {
                  setChatWrongIdx(-1);
                  setChatOpen(true);
                }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                  background: "var(--surface-card-alt)", border: "2px solid var(--cream-300)", borderRadius: "var(--radius-lg)",
                  padding: "12px 14px", cursor: "pointer",
                }}
              >
                <Kiko size={34} />
                <span style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "0.85rem", color: "var(--ink-700)" }}>
                  {t("quiz", "perfectRound")}
                </span>
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Kiko size={28} />
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.9rem", color: "var(--ink-900)" }}>
                    {t("quiz", "reviewTitle")}
                  </span>
                </div>
                {result.wrongLog.map((w, i) => (
                  <div key={w.id} style={{ background: "var(--surface-card-alt)", border: "2px solid var(--cream-300)", borderRadius: "var(--radius-lg)", padding: 12 }}>
                    <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "0.85rem", color: "var(--ink-900)", marginBottom: 6 }}>
                      {w.prompt}
                    </div>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", color: "var(--color-error)" }}>
                      {t("quiz", "yourAnswer")}: {w.kidAnswer || "—"}
                    </div>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", color: "var(--color-success)", marginBottom: 8 }}>
                      {t("quiz", "correctAnswerLabel")}: {w.correctAnswer}
                    </div>
                    <button
                      onClick={() => openKikoFor(i)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6, border: "none", background: "var(--pastel-blue)",
                        borderRadius: "var(--radius-pill)", padding: "6px 12px", cursor: "pointer",
                        fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "0.75rem", color: "var(--ink-on-blue)",
                      }}
                    >
                      <Kiko size={18} /> {t("quiz", "askKikoAboutMiss")}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button variant="secondary" size="lg" onClick={handleRetry}>
            {t("quiz", "retryForStars")}
          </Button>
          <Button variant="primary" size="lg" onClick={() => navigate(`/kelas/${grade}/${subject}`)}>
            {t("quiz", "backToTopics")}
          </Button>
        </div>
      )}
      </div>

      {result && (
        <KikoChatPanel
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          mode={chatWrongIdx >= 0 && result.wrongLog[chatWrongIdx] ? "quiz" : "general"}
          resetKey={`topicquiz-${babKey}-${chatWrongIdx}`}
          subjectName={subjectName(subject)}
          gradeLabel={`${t("common", "grade")} ${grade}`}
          topicTitle={topic?.title}
          question={result.wrongLog[chatWrongIdx]?.prompt}
          correctAnswer={result.wrongLog[chatWrongIdx]?.correctAnswer}
          kidAnswer={result.wrongLog[chatWrongIdx]?.kidAnswer}
          explanation={result.wrongLog[chatWrongIdx]?.explanation}
          answered={chatWrongIdx >= 0}
          isCorrect={false}
        />
      )}
    </Shell>
  );
}
