import { useEffect, useRef, useState } from "react";
import Kiko from "../../components/ds/Kiko";
import Button from "../../components/ds/Button";
import { useT } from "../../data/translations";

// AI Tutor v2 (2026-08-06) -- upgrade dari tombol "🤖 Jelasin Lagi" yang
// cuma muncul on-demand pas jawaban salah (lihat generate-hint.js), jadi
// chat interaktif pakai wajah Kiko (maskot resmi). Beda penting dari v1:
// (1) SELALU muncul selama quiz jalan -- bukan cuma pas jawaban salah,
// anak boleh nanya duluan SEBELUM jawab; (2) quick-reply chip + input teks
// bebas, bukan 1 tombol 1 balasan; (3) percakapan multi-turn (riwayat
// dikirim ke /api/kiko-chat tiap giliran).
// Server-side (kiko-chat.js) yang jaga supaya Kiko GAK bocorin jawaban
// final sebelum anak submit (field "sudahJawab") -- bukan filter di sini.
// Gagal manggil API (network/key belum di-set) = bubble error ramah dari
// Kiko, TETEP GAK PERNAH nge-block kuis, sama filosofi kayak v1.
//
// Di-refactor (2026-08-06, sore) jadi 2 lapis: `KikoChatPanel` (export
// bernama, CONTROLLED via `open`/`onClose`, gak punya trigger sendiri) +
// default export `KikoTutorChat` yang bungkus panel itu + tombol pill
// "Tanya Kiko" internal (buat QuizRunner.jsx, gak ada perubahan API di
// situ). Kenapa dipisah: Landing.jsx butuh buka panel yang SAMA dari tap
// di Kiko hero (trigger-nya BEDA, bukan pill kecil), tapi mau reuse UI
// chat + logic fetch yang identik -- daripada duplikat semua state/fetch
// logic di 2 tempat.
const QUICK_REPLIES_QUIZ = [
  "Kasih petunjuk dong 🙏",
  "Coba jelasin pelan-pelan",
  "Aku masih bingung 😕",
];
const QUICK_REPLY_AFTER_ANSWER = "Kenapa jawabanku salah?";

export function KikoChatPanel({
  open,
  onClose,
  mode = "quiz",
  resetKey,
  subjectName,
  gradeLabel,
  topicTitle,
  question,
  correctAnswer,
  kidAnswer,
  explanation,
  answered,
  isCorrect,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    setMessages([]);
    setInput("");
    setLoading(false);
  }, [resetKey]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  async function send(text) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const history = [...messages, { role: "user", text: trimmed }];
    setMessages(history);
    setInput("");
    setLoading(true);
    try {
      const body =
        mode === "quiz"
          ? {
              subjectName,
              gradeLabel,
              topic: topicTitle,
              question,
              correctAnswer,
              kidAnswer,
              explanation,
              sudahJawab: !!answered,
              messages: history,
            }
          : { messages: history };
      const res = await fetch("/api/kiko-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("chat request failed");
      const data = await res.json();
      if (!data.reply) throw new Error("no reply in response");
      setMessages((m) => [...m, { role: "assistant", text: data.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Waduh, Kiko lagi istirahat sebentar. Coba tanya lagi sebentar lagi, ya! 🌙" }]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  // Mode "general" (Landing/KikoGreeting) sengaja gak punya quick-reply --
  // dulu ada 3 chip ("Hai Kiko!"/"Kamu suka pelajaran apa?"/"Kasih semangat
  // dong!"), user minta dicabut karena bikin panel kerasa sempit.
  const quickReplies =
    mode === "quiz" ? (answered && !isCorrect ? [QUICK_REPLY_AFTER_ANSWER, ...QUICK_REPLIES_QUIZ] : QUICK_REPLIES_QUIZ) : [];
  const welcomeText = mode === "quiz" ? "Hai! Aku Kiko 👋 Ada yang mau ditanyain soal ini?" : "Hai! Aku Kiko 👋 Mau ngobrol apa nih?";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(59,42,26,.5)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 0,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 430,
          maxHeight: "80vh",
          background: "var(--cream-50)",
          borderRadius: "var(--radius-2xl) var(--radius-2xl) 0 0",
          boxShadow: "var(--shadow-overlay)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 16px",
            borderBottom: "2px solid var(--cream-200)",
          }}
        >
          <Kiko size={34} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.95rem", color: "var(--ink-900)" }}>
              Ngobrol sama Kiko
            </div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: "0.68rem", color: "var(--ink-400)" }}>
              {mode === "quiz" ? "Nanya soal ini, gapapa kok!" : "Ngobrol santai, gapapa kok!"}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            style={{ border: "none", background: "none", cursor: "pointer", fontSize: "1.1rem", color: "var(--ink-500)", padding: 4 }}
          >
            ✕
          </button>
        </div>

        <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, minHeight: 160 }}>
          {messages.length === 0 && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <Kiko size={26} />
              <div style={{ background: "var(--surface-card-alt)", borderRadius: 14, padding: "8px 12px", fontFamily: "var(--font-body)", fontSize: "0.82rem", color: "var(--ink-700)", maxWidth: "78%" }}>
                {welcomeText}
              </div>
            </div>
          )}
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} style={{ alignSelf: "flex-end", background: "var(--pastel-blue)", borderRadius: 14, padding: "8px 12px", fontFamily: "var(--font-body)", fontSize: "0.82rem", color: "var(--ink-on-blue)", maxWidth: "78%" }}>
                {m.text}
              </div>
            ) : (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <Kiko size={26} />
                <div style={{ background: "var(--surface-card-alt)", borderRadius: 14, padding: "8px 12px", fontFamily: "var(--font-body)", fontSize: "0.82rem", color: "var(--ink-700)", maxWidth: "78%" }}>
                  {m.text}
                </div>
              </div>
            )
          )}
          {loading && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <Kiko size={26} />
              <div style={{ background: "var(--surface-card-alt)", borderRadius: 14, padding: "8px 12px", fontFamily: "var(--font-body)", fontSize: "0.82rem", color: "var(--ink-400)" }}>
                Kiko lagi mikir...
              </div>
            </div>
          )}
        </div>

        {quickReplies.length > 0 && (
          <div style={{ display: "flex", gap: 6, padding: "0 16px 10px", flexWrap: "wrap" }}>
            {quickReplies.map((qr) => (
              <button
                key={qr}
                disabled={loading}
                onClick={() => send(qr)}
                style={{
                  border: "2px solid var(--cream-300)",
                  background: "var(--surface-card-alt)",
                  borderRadius: "var(--radius-pill)",
                  padding: "6px 12px",
                  fontFamily: "var(--font-body)",
                  fontWeight: 700,
                  fontSize: "0.72rem",
                  color: "var(--ink-700)",
                  cursor: loading ? "default" : "pointer",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {qr}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, padding: "0 16px 16px" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder="Ketik pertanyaan kamu..."
            disabled={loading}
            style={{
              flex: 1,
              border: "2px solid var(--cream-300)",
              borderRadius: "var(--radius-lg)",
              padding: "10px 12px",
              fontFamily: "var(--font-body)",
              fontSize: "0.85rem",
            }}
          />
          <Button variant="primary" size="sm" disabled={!input.trim() || loading} onClick={() => send(input)}>
            Kirim
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function KikoTutorChat(props) {
  const [open, setOpen] = useState(false);
  const { t } = useT();
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          border: "2px solid var(--cream-300)",
          background: "var(--surface-card-alt)",
          borderRadius: "var(--radius-pill)",
          padding: "4px 10px 4px 4px",
          cursor: "pointer",
          boxShadow: "var(--shadow-sticker-sm)",
        }}
      >
        <Kiko size={22} />
        <span style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "0.72rem", color: "var(--ink-700)" }}>
          {t("common", "askKiko")}
        </span>
      </button>
      <KikoChatPanel {...props} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
