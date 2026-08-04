import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Shell, { ScreenHeader } from "../components/Shell";
import Button from "../components/ds/Button";
import ProgressXP from "../components/ds/ProgressXP";
import { Chip } from "../components/ds/Badge";
import { SUBJECTS } from "../data/content";
import { hasContent, loadRawTopics, statusDisplay } from "../data/contentLoader";
import { getSubjectProgress, computeStatuses } from "../data/progressService";
import { usePlayer } from "../data/PlayerContext";

export default function SubjectDetail() {
  const navigate = useNavigate();
  const { grade, subject } = useParams();
  const { player } = usePlayer();
  const subj = SUBJECTS.find((s) => s.id === subject) || SUBJECTS[0];
  const [topics, setTopics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([loadRawTopics(subject, grade), getSubjectProgress(player.id, subject, grade)]).then(
      ([raw, progressMap]) => {
        if (cancelled) return;
        setTopics(raw ? computeStatuses(raw, progressMap) : null);
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [subject, grade, player.id]);

  const doneCount = topics ? topics.filter((t) => t.status === "done").length : 0;
  const stars = topics && topics.length ? Math.round((doneCount / topics.length) * 3) : 0;
  const topicXp = topics ? topics.reduce((sum, t) => sum + (t.xp || 0), 0) : 0;
  const currentTopic = topics?.find((t) => t.status === "current");

  return (
    <Shell>
      <ScreenHeader
        onBack={() => navigate(`/kelas/${grade}`)}
        title={subj.name}
        subtitle={`Kelas ${grade}`}
        leading={
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.1rem",
              flex: "none",
            }}
          >
            {subj.emoji}
          </span>
        }
      />

      <div style={{ display: "flex", justifyContent: "center", padding: "16px 18px 0" }}>
        <ProgressXP xp={topicXp} stars={stars} maxStars={3} />
      </div>

      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", color: "var(--ink-700)", padding: "16px 18px 0" }}>
        Topik
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, padding: "10px 18px 18px", overflowY: "auto" }}>
        {!hasContent(subject) ? (
          <EmptyState text="Materi pelajaran ini lagi disiapin, tunggu update ya! 🚧" />
        ) : loading ? (
          <EmptyState text="Memuat topik..." />
        ) : !topics || topics.length === 0 ? (
          <EmptyState text="Belum ada topik buat kelas ini." />
        ) : (
          topics.map((t) => {
            const d = statusDisplay(t.status);
            const clickable = t.status !== "locked";
            return (
              <div
                key={t.key}
                onClick={clickable ? () => navigate(`/kelas/${grade}/${subject}/topik/${t.key}`) : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "12px 14px",
                  borderRadius: 16,
                  background: d.bg,
                  opacity: d.opacity,
                  cursor: clickable ? "pointer" : "default",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: "1.1rem" }}>{d.icon}</span>
                  <span style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "0.82rem", color: "var(--ink-900)" }}>
                    {t.title}
                  </span>
                </div>
                <Chip color={d.chipColor} selected>{d.label}</Chip>
              </div>
            );
          })
        )}
      </div>

      <div style={{ padding: "0 18px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
        {subject === "matematika" && (
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="secondary" size="lg" style={{ flex: 1, justifyContent: "center" }} onClick={() => navigate(`/kelas/${grade}/matematika/drive`)}>
              🚗 Drive
            </Button>
            <Button variant="secondary" size="lg" style={{ flex: 1, justifyContent: "center" }} onClick={() => navigate(`/kelas/${grade}/matematika/plane`)}>
              ✈️ Plane
            </Button>
          </div>
        )}
        <Button
          variant="primary"
          size="lg"
          style={{ width: "100%", justifyContent: "center" }}
          disabled={!currentTopic}
          onClick={() => currentTopic && navigate(`/kelas/${grade}/${subject}/topik/${currentTopic.key}`)}
        >
          Lanjut Belajar
        </Button>
      </div>
    </Shell>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", fontFamily: "var(--font-body)", fontSize: "0.85rem", color: "var(--ink-400)" }}>
      {text}
    </div>
  );
}
