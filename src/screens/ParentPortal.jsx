import { useEffect, useState } from "react";
import Shell from "../components/Shell";
import Avatar from "../components/ds/Avatar";
import Button from "../components/ds/Button";
import Input from "../components/ds/Input";
import { Badge } from "../components/ds/Badge";
import TopicPicker from "../components/TopicPicker";
import { signInAsChild, getPlayerDoc, sendParentMessage } from "../data/authService";
import { setAssignedTopics, computeWeakTopics, computeXpBySubject } from "../data/progressService";
import { loadAllFocusTopics, topicId } from "../data/focusTopics";
import { SUBJECTS } from "../data/content";

const MAX_TOPICS = 8;

// Parent Portal -- pola sama persis kayak BrainBox parents/index.html:
// sign in pakai nama+PIN ANAK (BUKAN PIN dashboard guru terpisah), biar
// orang tua cuma bisa liat data anaknya sendiri (privacy-safe by design).
export default function ParentPortal() {
  const [screen, setScreen] = useState("signin"); // signin | portal
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [child, setChild] = useState(null);
  const [message, setMessage] = useState("");
  const [sendNote, setSendNote] = useState("");
  const [sending, setSending] = useState(false);

  const [groups, setGroups] = useState(null);
  const [selected, setSelected] = useState([]);
  const [saveNote, setSaveNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [weakTopics, setWeakTopics] = useState(null);

  useEffect(() => {
    if (screen !== "portal" || !child) return;
    let cancelled = false;
    loadAllFocusTopics().then((g) => {
      if (cancelled) return;
      setGroups(g);
      setSelected(child.assignedTopics || []);

      const titleById = {};
      g.forEach((grp) => grp.topics.forEach((t) => (titleById[t.id] = { title: t.title, subjectName: grp.subjectName })));
      const weak = computeWeakTopics(child.progress).map((w) => {
        const id = topicId(w.subject, w.grade, w.babKey);
        const meta = titleById[id];
        return { ...w, id, title: meta?.title || w.babKey, subjectName: meta?.subjectName || w.subject };
      });
      setWeakTopics(weak);
    });
    return () => {
      cancelled = true;
    };
  }, [screen, child]);

  async function handleSignIn() {
    setError("");
    setLoading(true);
    try {
      const player = await signInAsChild(name, pin);
      setChild(player);
      setScreen("portal");
    } catch (e) {
      setError(e.message || "Ada yang salah, coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  function handleSignOut() {
    setChild(null);
    setName("");
    setPin("");
    setMessage("");
    setSendNote("");
    setGroups(null);
    setWeakTopics(null);
    setScreen("signin");
  }

  async function handleSendMessage() {
    if (!message.trim()) {
      setSendNote("Tulis pesannya dulu ya!");
      return;
    }
    setSending(true);
    setSendNote("");
    try {
      await sendParentMessage(child.id, message.trim());
      setSendNote("Terkirim! Bakal muncul pas anak buka aplikasinya lagi. ✓");
      const fresh = await getPlayerDoc(child.id);
      setChild(fresh);
      setMessage("");
    } catch {
      setSendNote("Gagal ngirim, coba lagi.");
    } finally {
      setSending(false);
    }
  }

  function toggleTopic(id) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_TOPICS) return prev;
      return [...prev, id];
    });
  }

  async function handleSaveTopics() {
    setSaving(true);
    setSaveNote("");
    try {
      await setAssignedTopics(child.id, selected);
      setSaveNote("Tersimpan! ✓");
      setTimeout(() => setSaveNote(""), 2500);
    } catch {
      setSaveNote("Gagal nyimpen, coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell>
      {screen === "signin" && (
        <div style={{ padding: "26px 24px 36px", display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ textAlign: "center" }}>
            <Badge color="purple">👪 Parent Portal</Badge>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--ink-900)" }}>
              Lihat progress anak kamu
            </div>
            <div style={{ fontSize: "0.9rem", color: "var(--ink-400)", marginTop: 6 }}>
              Masuk pakai nama &amp; PIN anak kamu — sama yang dia pakai buat main.
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Input label="Nama anak" placeholder="mis. Azka" value={name} onChange={(e) => setName(e.target.value)} />
            <Input
              label="PIN 4 digit anak"
              pin
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              invalid={!!error}
              error={error}
            />
            <Button variant="cta" size="lg" disabled={loading || !name || pin.length !== 4} onClick={handleSignIn}>
              {loading ? "Tunggu bentar..." : "Lihat Progress →"}
            </Button>
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--ink-300)", textAlign: "center" }}>
            Lupa PIN-nya? Tanya anak kamu — sama yang dia pakai buat masuk & main.
          </div>
        </div>
      )}

      {screen === "portal" && child && (
        <div style={{ padding: "22px 18px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar name={child.name} size={44} />
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", color: "var(--ink-900)" }}>
                {child.name}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--ink-400)" }}>✨ {child.xp ?? 0} XP total</div>
            </div>
          </div>

          <Section title="📊 XP per Pelajaran" desc="Rincian XP yang udah dikumpulin anak per mata pelajaran.">
            {(() => {
              const bySubject = computeXpBySubject(child.progress);
              const rows = SUBJECTS.map((s) => ({ ...s, xp: bySubject[s.id] || 0 })).filter((s) => s.xp > 0);
              if (rows.length === 0) {
                return (
                  <div style={{ fontSize: "0.8rem", color: "var(--ink-300)", fontStyle: "italic" }}>
                    Belum ada XP tercatat — ayo mulai belajar dulu!
                  </div>
                );
              }
              const maxXp = Math.max(...rows.map((r) => r.xp));
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {rows
                    .sort((a, b) => b.xp - a.xp)
                    .map((s) => (
                      <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "1rem", width: 22 }}>{s.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--ink-900)" }}>{s.name}</div>
                          <div style={{ height: 6, background: "var(--cream-300)", borderRadius: 999, marginTop: 3 }}>
                            <div style={{ height: "100%", width: `${(s.xp / maxXp) * 100}%`, background: "var(--pastel-green)", borderRadius: 999 }} />
                          </div>
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "var(--ink-400)", minWidth: 44, textAlign: "right" }}>{s.xp} XP</span>
                      </div>
                    ))}
                </div>
              );
            })()}
          </Section>

          <Section title="💌 Kirim Pesan" desc="Kirim semangat singkat — bakal muncul di layar anak pas dia buka aplikasi lagi.">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="mis. Bunda bangga sama kamu yang rajin belajar!"
              style={{
                width: "100%",
                border: "2px solid var(--cream-300)",
                borderRadius: "var(--radius-lg)",
                padding: "12px 14px",
                fontFamily: "var(--font-body)",
                fontSize: "0.9rem",
                resize: "none",
                boxSizing: "border-box",
              }}
            />
            <Button variant="primary" size="sm" disabled={sending} onClick={handleSendMessage} style={{ marginTop: 8 }}>
              {sending ? "Ngirim..." : "Kirim Pesan"}
            </Button>
            {sendNote && <div style={{ fontSize: "0.78rem", color: "var(--ink-500)", marginTop: 6 }}>{sendNote}</div>}
            {child.parentMessage && (
              <div style={{ fontSize: "0.75rem", color: "var(--ink-300)", marginTop: 8 }}>
                Terakhir dikirim {new Date(child.parentMessage.sentAt).toLocaleDateString("id-ID")}
                {child.parentMessage.read ? " · udah dibaca" : " · belum dibaca"}: "{child.parentMessage.text}"
              </div>
            )}
          </Section>

          <Section title="🎯 Fokus Minggu Ini" desc={`Pilih sampai ${MAX_TOPICS} topik lintas pelajaran — bakal ke-highlight pas anak buka Fokus Latihan.`}>
            {!groups ? (
              <div style={{ fontSize: "0.8rem", color: "var(--ink-300)" }}>Memuat topik...</div>
            ) : (
              <>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--ink-500)", marginBottom: 10 }}>
                  {selected.length} / {MAX_TOPICS} dipilih
                </div>
                <div style={{ maxHeight: 260, overflowY: "auto", marginBottom: 10 }}>
                  <TopicPicker groups={groups} selected={selected} onToggle={toggleTopic} max={MAX_TOPICS} />
                </div>
                <Button variant="primary" size="sm" disabled={saving} onClick={handleSaveTopics}>
                  {saving ? "Nyimpen..." : "Simpan Fokus"}
                </Button>
                {saveNote && <div style={{ fontSize: "0.78rem", color: "var(--ink-500)", marginTop: 6 }}>{saveNote}</div>}
              </>
            )}
          </Section>

          <Section title="⚠️ Perlu Latihan Lagi" desc="Topik dengan akurasi di bawah 70% (minimal 3 percobaan).">
            {!weakTopics ? (
              <div style={{ fontSize: "0.8rem", color: "var(--ink-300)" }}>Memuat...</div>
            ) : weakTopics.length === 0 ? (
              <div style={{ fontSize: "0.8rem", color: "var(--ink-300)", fontStyle: "italic" }}>
                Belum ada yang perlu dikhawatirin — terus latihan buat ngumpulin datanya!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {weakTopics.slice(0, 6).map((w) => {
                  const pct = Math.round(w.accuracy * 100);
                  return (
                    <div key={w.id} style={{ background: "var(--cream-100)", borderRadius: 10, padding: "8px 12px" }}>
                      <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "0.82rem", color: "var(--ink-900)" }}>
                        {w.title} <span style={{ fontWeight: 400, color: "var(--ink-400)" }}>{w.subjectName}</span>
                      </div>
                      <div style={{ height: 6, background: "var(--cream-300)", borderRadius: 999, marginTop: 4 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "var(--color-error)", borderRadius: 999 }} />
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--ink-400)", marginTop: 2 }}>
                        {pct}% benar ({w.total}x dicoba)
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            Keluar
          </Button>
        </div>
      )}
    </Shell>
  );
}

function Section({ title, desc, children }) {
  return (
    <div style={{ background: "var(--surface-card-alt)", borderRadius: "var(--radius-xl)", padding: 16, boxShadow: "var(--shadow-sticker-sm)" }}>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem", color: "var(--ink-900)" }}>{title}</div>
      <div style={{ fontSize: "0.78rem", color: "var(--ink-400)", marginTop: 2, marginBottom: 10 }}>{desc}</div>
      {children}
    </div>
  );
}
