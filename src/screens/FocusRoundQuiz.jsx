import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Shell, { ScreenHeader } from "../components/Shell";
import Button from "../components/ds/Button";
import QuizRunner from "../games/quiz/QuizRunner";
import { loadTopicByKey } from "../data/contentLoader";
import { parseTopicId } from "../data/focusTopics";
import { recordFocusRoundAttempt } from "../data/progressService";
import { pickEncouragement } from "../data/encouragement";
import { usePlayer } from "../data/PlayerContext";

const PER_TOPIC = 3;
const XP_PER_CORRECT = 8; // dikit lebih kecil dari practice biasa (10) -- round ini gampang diulang

function pick(arr, n) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

export default function FocusRoundQuiz() {
  const location = useLocation();
  const navigate = useNavigate();
  const { grade } = useParams();
  const { player, login } = usePlayer();
  const topicIds = location.state?.topicIds || [];
  const [questions, setQuestions] = useState(null);
  const [idToTopic, setIdToTopic] = useState(null);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (topicIds.length === 0) return;
    let cancelled = false;
    Promise.all(
      topicIds.map(async (tid) => {
        const { subject, grade, babKey } = parseTopicId(tid);
        const topic = await loadTopicByKey(subject, grade, babKey);
        return { tid, subject, grade, babKey, soal: topic?.soal || [] };
      })
    ).then((entries) => {
      if (cancelled) return;
      const map = {};
      const pool = [];
      entries.forEach(({ tid, subject, grade, babKey, soal }) => {
        pick(soal, PER_TOPIC).forEach((q) => {
          map[q.id] = { tid, subject, grade, babKey };
          pool.push(q);
        });
      });
      setIdToTopic(map);
      setQuestions(pick(pool, pool.length));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFinish({ correct, wrong, results }) {
    setSaving(true);
    const byTopic = {};
    results.forEach((r) => {
      const t = idToTopic[r.id];
      if (!t) return;
      byTopic[t.tid] ??= { ...t, correct: 0, wrong: 0 };
      if (r.correct) byTopic[t.tid].correct += 1;
      else byTopic[t.tid].wrong += 1;
    });
    const totalXp = correct * XP_PER_CORRECT;
    try {
      // XP per topik = correct-nya di topik itu * XP_PER_CORRECT -- jumlahin
      // semua topik pasti balik ke totalXp persis (gak ada pembulatan aneh).
      await Promise.all(
        Object.values(byTopic).map((t) =>
          recordFocusRoundAttempt(player.id, t.subject, t.grade, t.babKey, {
            correct: t.correct,
            wrong: t.wrong,
            xpEarned: t.correct * XP_PER_CORRECT,
          })
        )
      );
      login({ ...player, xp: (player.xp || 0) + totalXp });
    } finally {
      setSaving(false);
      const accuracy = correct / (correct + wrong || 1);
      setResult({ correct, wrong, xpEarned: totalXp, encouragement: pickEncouragement(accuracy) });
    }
  }

  if (topicIds.length === 0) {
    return (
      <Shell>
        <ScreenHeader onBack={() => navigate(`/kelas/${grade}`)} title="Fokus Latihan" />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center" }}>
          <div style={{ color: "var(--ink-400)" }}>Belum ada topik dipilih.</div>
          <Button variant="primary" onClick={() => navigate(`/kelas/${grade}/fokus`)}>Pilih Topik</Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <ScreenHeader onBack={() => navigate(`/kelas/${grade}/fokus`)} title="Fokus Latihan" subtitle={`${topicIds.length} topik campur`} />

      {!questions && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-400)" }}>Menyiapin soal...</div>
      )}

      {questions && !result && (
        <QuizRunner questions={questions} onFinish={handleFinish} subjectName="Fokus Latihan" topicTitle="Topik campuran" />
      )}

      {result && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 56 }}>{result.correct >= result.wrong ? "🎉" : "💪"}</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem", color: "var(--ink-900)" }}>
            {result.correct} / {result.correct + result.wrong} benar!
          </div>
          <div style={{ fontFamily: "var(--font-body)", color: "var(--ink-500)" }}>
            {saving ? "Nyimpen progress..." : `+${result.xpEarned} XP`}
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, color: "var(--ink-700)", maxWidth: 240 }}>
            {result.encouragement}
          </div>
          <Button variant="primary" size="lg" onClick={() => navigate(`/kelas/${grade}`)}>
            Kembali
          </Button>
        </div>
      )}
    </Shell>
  );
}
