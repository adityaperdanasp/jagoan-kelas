import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Shell, { ScreenHeader } from "../components/Shell";
import Button from "../components/ds/Button";
import TopicPicker from "../components/TopicPicker";
import { loadFocusTopicsForGrade, parseTopicId } from "../data/focusTopics";
import { getAssignedTopics } from "../data/progressService";
import { usePlayer } from "../data/PlayerContext";

const MAX_TOPICS = 8;

export default function FocusRoundPicker() {
  const navigate = useNavigate();
  const { grade } = useParams();
  const { player } = usePlayer();
  const [groups, setGroups] = useState(null);
  const [selected, setSelected] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    Promise.all([loadFocusTopicsForGrade(grade), getAssignedTopics(player.id)])
      .then(([g, assigned]) => {
        if (cancelled) return;
        setGroups(g);
        // Assigned topics orang tua bisa lintas kelas (ParentPortal gak dibatasin) --
        // filter ke kelas ini doang biar gak ada id "ke-select" yang gak nongol
        // di list (bikin counter "X/8 topik dipilih" nyasar dari checkbox yang keliatan).
        setSelected(assigned.filter((id) => parseTopicId(id).grade === String(grade)).slice(0, MAX_TOPICS));
      })
      .catch(() => {
        // Dulu gak ke-tangkep -- gagal load = "Memuat topik..." nyangkut
        // selamanya, gak ada pesan error/cara coba lagi.
        if (cancelled) return;
        setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [player.id, grade, retryTick]);

  function toggle(id) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_TOPICS) return prev;
      return [...prev, id];
    });
  }

  return (
    <Shell>
      <ScreenHeader onBack={() => navigate(`/kelas/${grade}`)} title="Fokus Latihan" subtitle={`Kelas ${grade} · Pilih sampai ${MAX_TOPICS} topik`} />

      <div style={{ padding: "10px 18px 0", fontFamily: "var(--font-body)", fontSize: "0.8rem", fontWeight: 700, color: "var(--ink-500)" }}>
        {selected.length} / {MAX_TOPICS} topik dipilih
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 18px 18px" }}>
        {loadError ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ color: "var(--ink-400)", marginBottom: 12 }}>Gagal muat topik. Coba cek koneksi internet kamu, ya!</div>
            <Button variant="secondary" size="sm" onClick={() => setRetryTick((n) => n + 1)}>
              Coba Lagi
            </Button>
          </div>
        ) : !groups ? (
          <div style={{ textAlign: "center", color: "var(--ink-400)", padding: 40 }}>Memuat topik...</div>
        ) : (
          <TopicPicker groups={groups} selected={selected} onToggle={toggle} max={MAX_TOPICS} />
        )}
      </div>

      <div style={{ padding: "0 18px 22px" }}>
        <Button
          variant="primary"
          size="lg"
          style={{ width: "100%", justifyContent: "center" }}
          disabled={selected.length === 0}
          onClick={() => navigate(`/kelas/${grade}/fokus/main`, { state: { topicIds: selected } })}
        >
          Mulai Latihan ({selected.length})
        </Button>
      </div>
    </Shell>
  );
}
