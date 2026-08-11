import { Fragment } from "react";
import { ACCENT_BY_SUBJECT } from "../data/content";

// Dipake FocusRoundPicker (anak milih sendiri) DAN ParentPortal (orang tua
// nge-assign) -- checklist topik dikelompokin per subject+kelas, dibatasin
// `max` item. Layout porting persis `parents/style.css` BrainBox (grid 2
// kolom, label group uppercase berwarna, item jadi pill bertinta per subject
// -- reuse token `--product-{accent}` yang sama kayak GameCard biar konsisten,
// gak bikin palet baru) -- request eksplisit user: "vibes jagoan kelas kayak
// murahan banget", samain plek plek ke desain playalidrisi.fun/parents.
export default function TopicPicker({ groups, selected, onToggle, max }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {groups.map((g, gi) => {
        const accent = ACCENT_BY_SUBJECT[g.subjectId] || "math";
        const bg = `var(--product-${accent})`;
        const ink = `var(--product-${accent}-ink)`;
        return (
          <Fragment key={`${g.subjectId}-${g.grade}`}>
            <div
              style={{
                gridColumn: "1 / -1",
                fontFamily: "var(--font-body)",
                fontWeight: 800,
                fontSize: "0.68rem",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: ink,
                marginTop: gi === 0 ? 0 : 10,
              }}
            >
              {g.subjectEmoji} {g.subjectName} · Kelas {g.grade}
            </div>
            {g.topics.map((t) => {
              const checked = selected.includes(t.id);
              const disabled = !checked && selected.length >= max;
              return (
                <label
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    borderRadius: 12,
                    padding: "9px 10px",
                    cursor: disabled ? "default" : "pointer",
                    background: bg,
                    boxShadow: checked ? `inset 0 0 0 2px ${ink}` : "inset 0 0 0 2px transparent",
                    opacity: disabled ? 0.5 : 1,
                  }}
                >
                  <input type="checkbox" checked={checked} disabled={disabled} onChange={() => onToggle(t.id)} style={{ display: "none" }} />
                  <span
                    style={{
                      fontSize: 14,
                      width: 24,
                      height: 24,
                      flexShrink: 0,
                      borderRadius: "50%",
                      background: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 1px 3px rgba(59,42,26,.12)",
                    }}
                  >
                    {g.subjectEmoji}
                  </span>
                  <span style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "0.76rem", color: "var(--ink-900)", lineHeight: 1.2 }}>
                    {t.title}
                  </span>
                </label>
              );
            })}
          </Fragment>
        );
      })}
    </div>
  );
}
