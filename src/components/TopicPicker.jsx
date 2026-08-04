// Dipake FocusRoundPicker (anak milih sendiri) DAN ParentPortal (orang tua
// nge-assign) -- checklist topik dikelompokin per subject+kelas, dibatasin
// `max` item.
export default function TopicPicker({ groups, selected, onToggle, max }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {groups.map((g) => (
        <div key={`${g.subjectId}-${g.grade}`}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", color: "var(--ink-700)", marginBottom: 8 }}>
            {g.subjectEmoji} {g.subjectName} · Kelas {g.grade}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {g.topics.map((t) => {
              const checked = selected.includes(t.id);
              const disabled = !checked && selected.length >= max;
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
                  <input type="checkbox" checked={checked} disabled={disabled} onChange={() => onToggle(t.id)} />
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", fontWeight: 700, color: "var(--ink-900)" }}>
                    {t.title}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
