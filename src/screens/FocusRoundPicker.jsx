import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Shell, { ScreenHeader } from "../components/Shell";
import Button from "../components/ds/Button";
import TopicPicker from "../components/TopicPicker";
import { loadAllFocusTopics } from "../data/focusTopics";
import { getAssignedTopics } from "../data/progressService";
import { usePlayer } from "../data/PlayerContext";

const MAX_TOPICS = 8;

export default function FocusRoundPicker() {
  const navigate = useNavigate();
  const { player } = usePlayer();
  const [groups, setGroups] = useState(null);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadAllFocusTopics(), getAssignedTopics(player.id)]).then(([g, assigned]) => {
      if (cancelled) return;
      setGroups(g);
      setSelected(assigned.slice(0, MAX_TOPICS));
    });
    return () => {
      cancelled = true;
    };
  }, [player.id]);

  function toggle(id) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_TOPICS) return prev;
      return [...prev, id];
    });
  }

  return (
    <Shell>
      <ScreenHeader onBack={() => navigate("/")} title="Fokus Latihan" subtitle={`Pilih sampai ${MAX_TOPICS} topik`} />

      <div style={{ padding: "10px 18px 0", fontFamily: "var(--font-body)", fontSize: "0.8rem", fontWeight: 700, color: "var(--ink-500)" }}>
        {selected.length} / {MAX_TOPICS} topik dipilih
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 18px 18px" }}>
        {!groups ? (
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
          onClick={() => navigate("/fokus/main", { state: { topicIds: selected } })}
        >
          Mulai Latihan ({selected.length})
        </Button>
      </div>
    </Shell>
  );
}
