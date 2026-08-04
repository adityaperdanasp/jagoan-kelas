import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Shell, { ScreenHeader } from "../components/Shell";
import Button from "../components/ds/Button";
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

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 18px 18px", display: "flex", flexDirection: "column", gap: 18 }}>
        {!groups ? (
          <div style={{ textAlign: "center", color: "var(--ink-400)", padding: 40 }}>Memuat topik...</div>
        ) : (
          groups.map((g) => (
            <div key={`${g.subjectId}-${g.grade}`}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", color: "var(--ink-700)", marginBottom: 8 }}>
                {g.subjectEmoji} {g.subjectName} · Kelas {g.grade}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {g.topics.map((t) => {
                  const checked = selected.includes(t.id);
                  const disabled = !checked && selected.length >= MAX_TOPICS;
                  return (
                    <label
                      key={t.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 12,
                        background: checked ? "var(--pastel-blue)" : "var(--surface-card-alt)",
                        opacity: disabled ? 0.5 : 1,
                        cursor: disabled ? "default" : "pointer",
                      }}
                    >
                      <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggle(t.id)} />
                      <span style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", fontWeight: 700, color: "var(--ink-900)" }}>
                        {t.title}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))
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
