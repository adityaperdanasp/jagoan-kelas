import { useEffect, useState } from "react";
import Shell from "../components/Shell";
import Avatar from "../components/ds/Avatar";
import Button from "../components/ds/Button";
import Input from "../components/ds/Input";
import { Badge } from "../components/ds/Badge";
import TopicPicker from "../components/TopicPicker";
import PageDecor from "../components/PageDecor";
import { signInAsChild, getPlayerDoc, sendParentMessage } from "../data/authService";
import { setAssignedTopics, computeWeakTopics, computeXpBySubject } from "../data/progressService";
import { loadAllFocusTopics, topicId } from "../data/focusTopics";
import { SUBJECTS, ACCENT_BY_SUBJECT } from "../data/content";

const MAX_TOPICS = 8;

// Lavender-nya `--product-focus`/`--product-focus-ink` -- token yang SAMA
// dipake BrainBox punya parents/style.css buat bedain Parent Portal dari
// warna tiap game (purple konsisten di semua section, bukan ikut accent
// subject). Tombol aksi (Kirim Pesan/Simpan Fokus) numpang style ini juga.
const LAVENDER_BTN = { background: "var(--product-focus)", color: "var(--product-focus-ink)" };

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
  const [topicMeta, setTopicMeta] = useState({});
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

      const metaById = {};
      g.forEach((grp) =>
        grp.topics.forEach((t) => {
          metaById[t.id] = { title: t.title, subjectId: grp.subjectId, subjectName: grp.subjectName, subjectEmoji: grp.subjectEmoji };
        })
      );
      setTopicMeta(metaById);

      const weak = computeWeakTopics(child.progress).map((w) => {
        const id = topicId(w.subject, w.grade, w.babKey);
        const meta = metaById[id];
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
    setTopicMeta({});
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
      await sendParentMessage(child.id, message.trim(), child.token);
      setSendNote("Terkirim! Bakal muncul pas anak buka aplikasinya lagi. ✓");
      const fresh = await getPlayerDoc(child.id, child.token);
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
      await setAssignedTopics(child.id, selected, child.token);
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
        <>
        <PageDecor seed="parent-signin" />
        <div style={{ position: "relative", zIndex: 1, padding: "26px 24px 36px", display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ textAlign: "center" }}>
            <Badge color="purple">👪 Parent Portal</Badge>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 800, lineHeight: 1.3, color: "var(--ink-900)" }}>
              Lihat progress anak.
              <br />
              Atur apa yang perlu dilatih.
            </div>
            <div style={{ fontSize: "0.88rem", color: "var(--ink-on-purple-soft)", marginTop: 8 }}>
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
        </>
      )}

      {screen === "portal" && child && (
        <>
        <PageDecor seed="parent-portal" />
        <div style={{ position: "relative", zIndex: 1, padding: "22px 18px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar name={child.name} size={44} />
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", color: "var(--ink-900)" }}>
                {child.name}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--ink-400)" }}>✨ {child.xp ?? 0} XP total</div>
            </div>
          </div>

          <Section title="✨ Progress per Pelajaran" desc="Rincian XP yang udah dikumpulin anak per mata pelajaran.">
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
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {rows
                    .sort((a, b) => b.xp - a.xp)
                    .map((s) => (
                      <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 16,
                            background: `var(--product-${s.accent})`,
                          }}
                        >
                          {s.emoji}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "0.78rem", color: "var(--ink-900)", marginBottom: 4 }}>
                            {s.name} — {s.xp} XP
                          </div>
                          <div style={{ height: 8, background: "var(--cream-300)", borderRadius: 999, overflow: "hidden" }}>
                            <div
                              style={{
                                height: "100%",
                                width: `${Math.max((s.xp / maxXp) * 100, 4)}%`,
                                borderRadius: 999,
                                background: `var(--product-${s.accent}-ink)`,
                              }}
                            />
                          </div>
                        </div>
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
                border: "2px solid var(--product-focus)",
                borderRadius: "var(--radius-lg)",
                padding: "10px 12px",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                fontSize: "0.85rem",
                resize: "vertical",
                boxSizing: "border-box",
                marginBottom: 10,
              }}
            />
            <Button variant="primary" size="sm" disabled={sending} onClick={handleSendMessage} style={LAVENDER_BTN}>
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
                <div
                  style={{
                    border: "2px dashed var(--product-focus)",
                    background: "rgba(230,212,247,0.18)",
                    borderRadius: "var(--radius-md)",
                    padding: "10px 12px",
                    marginBottom: 14,
                  }}
                >
                  <div style={{ fontFamily: "var(--font-body)", fontWeight: 800, fontSize: "0.75rem", color: "var(--ink-on-purple-soft)", marginBottom: selected.length ? 8 : 0 }}>
                    {selected.length} / {MAX_TOPICS} dipilih
                  </div>
                  {selected.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {selected.map((id) => {
                        const meta = topicMeta[id];
                        if (!meta) return null;
                        const accent = ACCENT_BY_SUBJECT[meta.subjectId] || "math";
                        return (
                          <span
                            key={id}
                            style={{
                              fontFamily: "var(--font-body)",
                              fontWeight: 700,
                              fontSize: "0.68rem",
                              padding: "5px 10px",
                              borderRadius: 999,
                              whiteSpace: "nowrap",
                              background: `var(--product-${accent})`,
                              color: `var(--product-${accent}-ink)`,
                            }}
                          >
                            {meta.subjectEmoji} {meta.title}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div style={{ maxHeight: 260, overflowY: "auto", marginBottom: 14 }}>
                  <TopicPicker groups={groups} selected={selected} onToggle={toggleTopic} max={MAX_TOPICS} />
                </div>
                <Button variant="primary" size="sm" disabled={saving} onClick={handleSaveTopics} style={LAVENDER_BTN}>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {weakTopics.slice(0, 6).map((w) => {
                  const pct = Math.round(w.accuracy * 100);
                  return (
                    <div key={w.id}>
                      <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "0.85rem", color: "var(--ink-900)", marginBottom: 6 }}>
                        {w.title}
                        <span
                          style={{
                            fontFamily: "var(--font-body)",
                            fontWeight: 700,
                            fontSize: "0.62rem",
                            color: "#b3862a",
                            background: "#fdf0d8",
                            padding: "2px 8px",
                            borderRadius: 999,
                            marginLeft: 6,
                          }}
                        >
                          {w.subjectName}
                        </span>
                      </div>
                      <div style={{ height: 8, background: "var(--cream-300)", borderRadius: 999, overflow: "hidden", marginBottom: 4 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "#e2685f", borderRadius: 999 }} />
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--ink-400)" }}>
                        {pct}% benar <span style={{ color: "var(--ink-300)" }}>({w.total}x dicoba)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleSignOut}
            style={{ width: "100%", justifyContent: "center", border: "2px solid var(--product-focus)", color: "var(--ink-on-purple-soft)" }}
          >
            Keluar
          </Button>
        </div>
        </>
      )}
    </Shell>
  );
}

// Lavender gradient + judul ungu -- port persis `.p-section`/`.p-section-title`
// BrainBox punya (`parents/style.css`), dipertahankan SAMA di semua section
// (bukan ikut accent per-subject) biar Parent Portal kebaca sebagai 1 area
// yang konsisten, beda dari warna-warni tiap game di layar lain.
function Section({ title, desc, children }) {
  return (
    <div
      style={{
        background: "linear-gradient(165deg, #ffffff 0%, rgba(230,212,247,0.35) 100%)",
        borderRadius: "var(--radius-xl)",
        padding: 16,
        boxShadow: "var(--shadow-sticker-sm)",
      }}
    >
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", color: "var(--product-focus-ink)" }}>{title}</div>
      <div style={{ fontFamily: "var(--font-body)", fontSize: "0.8rem", color: "var(--ink-on-purple-soft)", marginTop: 4, marginBottom: 14 }}>{desc}</div>
      {children}
    </div>
  );
}
