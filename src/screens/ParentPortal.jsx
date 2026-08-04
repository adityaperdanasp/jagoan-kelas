import { useState } from "react";
import Shell from "../components/Shell";
import Avatar from "../components/ds/Avatar";
import Button from "../components/ds/Button";
import Input from "../components/ds/Input";
import { Badge } from "../components/ds/Badge";
import { signInAsChild, getPlayerDoc, sendParentMessage } from "../data/authService";

// Parent Portal -- pola sama persis kayak BrainBox parents/index.html:
// sign in pakai nama+PIN ANAK (BUKAN PIN dashboard guru terpisah), biar
// orang tua cuma bisa liat data anaknya sendiri (privacy-safe by design).
// "This Week's Focus" (Assign Focus Topics) dan "Needs Practice" section
// BrainBox butuh fitur Focus Round + topicStats yang belum ada di Jagoan
// Kelas -- ditandai "segera hadir" di sini, bukan dipalsuin datanya.
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

          <Section title="🎯 Fokus Minggu Ini" desc="Segera hadir — butuh mode latihan campur-topik yang belum ada di Jagoan Kelas.">
            <ComingSoon />
          </Section>

          <Section title="⚠️ Perlu Latihan Lagi" desc="Segera hadir — butuh pencatatan akurasi per topik yang belum dibangun.">
            <ComingSoon />
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

function ComingSoon() {
  return <div style={{ fontSize: "0.8rem", color: "var(--ink-300)", fontStyle: "italic" }}>🚧 Segera hadir</div>;
}
