import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ref, onValue, set, update, get, runTransaction, onDisconnect, off } from "firebase/database";
import Shell, { ScreenHeader } from "../../components/Shell";
import Button from "../../components/ds/Button";
import PageDecor from "../../components/PageDecor";
import Kiko from "../../components/ds/Kiko";
import { KikoChatPanel } from "../quiz/KikoTutorChat";
import { rtdb } from "../../firebase";
import { usePlayer } from "../../data/PlayerContext";
import { generateQuickQuestion } from "../shared/quickQuestion";
import { TRACK_MATHRACE, useBgmTrack } from "../../data/bgm";
import { pickEncouragement } from "../../data/encouragement";

// Math Race -- multiplayer 2-3 pemain, di-desain berdasarkan deskripsi
// al-idrisi-games CLAUDE.md ("Racing kuis matematika, multiplayer 2-3
// pemain, Firebase RTDB realtime") -- BEDA dari DinoRace, sumbernya
// (`multipleazka`) gak ke-copy ke jagoan-kelas jadi ini dibangun dari nol
// di React, tapi pola pairing room-code-nya niru DinoRace yang udah
// terbukti jalan (dinorace_games/{code} -> mathrace_games/{code}).
//
// Race-nya BUKAN client-authoritative-sync-posisi kayak DinoRace (gak
// perlu physics real-time) -- tiap pemain jawab soal SENDIRI-SENDIRI
// (soal beda per pemain, di-generate lokal dari quickQuestion.js yang
// udah dipakai Drive/Plane Mode), jawaban benar = maju N%. Progress
// ditulis ke RTDB tiap jawaban benar, semua klien dengerin progress
// pemain lain buat gambar track bareng -- pola paling murah buat
// "race" tanpa perlu sinkron posisi per-frame.
const TOTAL_QUESTIONS = 10;
const STEP_PCT = 100 / TOTAL_QUESTIONS;
const ROLES = ["p1", "p2", "p3"];

// 4 fitur yang tadinya belum ke-port dari al-idrisi `multipleazka`
// (2026-08-10, bug report user "tidak ada ai lawan, tidak ada opsi
// jawaban isian atau easy medium hard..., tidak ada pilihan mobil"):
// difficulty (ngatur rentang angka, `generateQuickQuestion` UDAH nerima
// param ini dari awal -- cuma dulu di-hardcode "medium" di sini, gak
// ada UI buat milih), 6 kendaraan (`VEHICLE_EMOJI` al-idrisi), mode
// jawaban pilihan-ganda vs isian (ketik angka), dan AI lawan buat Solo
// Play (progress jalan konstan, ngejar garis finis dalem `opponentSeconds`
// -- nilai DIFFICULTY di bawah disalin PERSIS dari `multipleazka/script.js`).
const DIFFICULTY = {
  easy: { label: "Gampang 🙂", opponentSeconds: 90 },
  medium: { label: "Sedang 😎", opponentSeconds: 55 },
  hard: { label: "Susah 🔥", opponentSeconds: 40 },
};
const VEHICLES = [
  { id: "car", emoji: "🏎️", label: "Mobil" },
  { id: "plane", emoji: "🛩️", label: "Pesawat" },
  { id: "ship", emoji: "🚢", label: "Kapal" },
  { id: "bus", emoji: "🚌", label: "Bus" },
  { id: "truck", emoji: "🚚", label: "Truk" },
  { id: "train", emoji: "🚂", label: "Kereta" },
];
const VEHICLE_EMOJI = Object.fromEntries(VEHICLES.map((v) => [v.id, v.emoji]));

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function MathRace() {
  const navigate = useNavigate();
  const { grade } = useParams();
  const { player } = usePlayer();
  useBgmTrack(TRACK_MATHRACE);

  const [mode, setMode] = useState("lobby"); // lobby | waiting | solo | racing | finished
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [joinCode, setJoinCode] = useState("");
  const [code, setCode] = useState(null);
  const [role, setRole] = useState(null);
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [difficulty, setDifficulty] = useState("medium");
  const [answerMode, setAnswerMode] = useState("choice"); // "choice" | "type"
  const [vehicle, setVehicle] = useState("car");
  const [typedValue, setTypedValue] = useState("");

  const [question, setQuestion] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(null);
  const [progress, setProgress] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [place, setPlace] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [finishMs, setFinishMs] = useState(null);
  const [encouragement, setEncouragement] = useState("");
  const [chatOpen, setChatOpen] = useState(false);

  // AI lawan (Solo Play doang) -- progress jalan konstan lewat setInterval,
  // BUKAN React state per-tick (biar gak re-render tiap 100ms), cuma
  // di-flush ke state pas race selesai/dibandingin buat nentuin placement.
  const [aiProgress, setAiProgress] = useState(0);
  const aiProgressRef = useRef(0);
  const aiTimerRef = useRef(null);

  const roomPathRef = useRef(null);

  // ----- multiplayer room listener -----
  useEffect(() => {
    if (!code) return;
    const roomRef = ref(rtdb, `mathrace_games/${code}`);
    roomPathRef.current = `mathrace_games/${code}`;
    const unsub = onValue(roomRef, (snap) => {
      const val = snap.val();
      setRoom(val);
      if (val && val.status === "racing" && mode === "waiting") {
        setMode("racing");
        setStartTime(Date.now());
        rollQuestion();
      }
    });
    return () => off(roomRef, "value", unsub);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  function rollQuestion() {
    setQuestion(generateQuickQuestion(grade, difficulty));
    setAnswered(false);
    setLastCorrect(null);
    setTypedValue("");
  }

  function stopAiOpponent() {
    if (aiTimerRef.current) {
      clearInterval(aiTimerRef.current);
      aiTimerRef.current = null;
    }
  }

  // Progress konstan (gak reaktif ke performa anak, PERSIS filosofi
  // al-idrisi punya) -- ngejar 100% dalem `opponentSeconds` detik, di-tick
  // tiap 100ms biar progress bar-nya keliatan mulus.
  function startAiOpponent() {
    stopAiOpponent();
    aiProgressRef.current = 0;
    setAiProgress(0);
    const seconds = DIFFICULTY[difficulty].opponentSeconds;
    const stepPct = 100 / (seconds * 10);
    aiTimerRef.current = setInterval(() => {
      aiProgressRef.current = Math.min(100, aiProgressRef.current + stepPct);
      setAiProgress(aiProgressRef.current);
      if (aiProgressRef.current >= 100) stopAiOpponent();
    }, 100);
  }

  useEffect(() => stopAiOpponent, []);

  async function createRoom(n) {
    setBusy(true);
    setError(null);
    try {
      const newCode = genCode();
      const myRole = "p1";
      await set(ref(rtdb, `mathrace_games/${newCode}`), {
        grade,
        maxPlayers: n,
        status: "waiting",
        createdAt: Date.now(),
        finishCount: 0,
        players: { [myRole]: { name: player.name, progress: 0, connected: true, vehicle } },
      });
      onDisconnect(ref(rtdb, `mathrace_games/${newCode}/players/${myRole}/connected`)).set(false);
      setCode(newCode);
      setRole(myRole);
      setMaxPlayers(n);
      setMode("waiting");
    } catch {
      setError("Gagal bikin room. Coba lagi ya.");
    } finally {
      setBusy(false);
    }
  }

  async function joinRoom() {
    const c = joinCode.trim().toUpperCase();
    if (c.length !== 6) {
      setError("Kode harus 6 karakter.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const snap = await get(ref(rtdb, `mathrace_games/${c}`));
      const val = snap.val();
      if (!val) {
        setError("Kode gak ketemu.");
        return;
      }
      if (val.status !== "waiting") {
        setError("Race udah mulai / selesai.");
        return;
      }
      const takenRoles = Object.keys(val.players || {});
      const openRole = ROLES.slice(0, val.maxPlayers).find((r) => !takenRoles.includes(r));
      if (!openRole) {
        setError("Room udah penuh.");
        return;
      }
      await update(ref(rtdb, `mathrace_games/${c}/players/${openRole}`), {
        name: player.name,
        progress: 0,
        connected: true,
        vehicle,
      });
      onDisconnect(ref(rtdb, `mathrace_games/${c}/players/${openRole}/connected`)).set(false);
      setCode(c);
      setRole(openRole);
      setMaxPlayers(val.maxPlayers);
      setMode("waiting");
    } catch {
      setError("Gagal join room. Coba lagi ya.");
    } finally {
      setBusy(false);
    }
  }

  async function startRace() {
    if (!code) return;
    await update(ref(rtdb, `mathrace_games/${code}`), { status: "racing", startedAt: Date.now() });
  }

  function startSolo() {
    setMode("racing");
    setStartTime(Date.now());
    startAiOpponent();
    rollQuestion();
  }

  function submitTyped() {
    if (!typedValue) return;
    handleAnswer(typedValue);
  }

  // `given` -- label tombol MC (udah persis format `fmt()`, misal "1,234")
  // ATAU angka ketikan mode isian (digit polos, misal "1234") -- normalize
  // dua-duanya (buang koma/spasi) sebelum dibandingin biar isian tetep
  // dianggap bener walau anak gak ngetik pemisah ribuan.
  async function handleAnswer(given) {
    if (answered || !question) return;
    setAnswered(true);
    const norm = (s) => String(s).replace(/[,.\s]/g, "");
    const isCorrect = norm(given) === norm(question.correctLabel);
    setLastCorrect(isCorrect);
    if (!isCorrect) {
      setTimeout(() => {
        if (qIndex + 1 >= TOTAL_QUESTIONS) return endRace();
        rollQuestion();
      }, 500);
      return;
    }
    const nextProgress = Math.min(100, progress + STEP_PCT);
    setProgress(nextProgress);
    if (code && role) {
      update(ref(rtdb, `mathrace_games/${code}/players/${role}`), { progress: nextProgress }).catch(() => {});
    }
    setTimeout(async () => {
      const nextIndex = qIndex + 1;
      setQIndex(nextIndex);
      if (nextProgress >= 100 || nextIndex >= TOTAL_QUESTIONS) {
        await finishRace();
      } else {
        rollQuestion();
      }
    }, 500);
  }

  async function finishRace() {
    setFinishMs(Date.now() - (startTime || Date.now()));
    let myPlace = 1;
    if (code) {
      const result = await runTransaction(ref(rtdb, `mathrace_games/${code}/finishCount`), (cur) => (cur || 0) + 1);
      myPlace = result.snapshot.val();
      setPlace(myPlace);
      await update(ref(rtdb, `mathrace_games/${code}/players/${role}`), { finished: true, place: myPlace });
    } else {
      // Solo -- placement ditentuin ngelawan AI: kalau AI udah nyampe 100%
      // duluan (progress-nya jalan konstan dari `startAiOpponent()`, gak
      // nunggu anak selesai), anak finis ke-2, kalau enggak ya ke-1.
      stopAiOpponent();
      myPlace = aiProgressRef.current >= 100 ? 2 : 1;
      setPlace(myPlace);
    }
    // Reuse pesan semangat non-personalized yang udah ada (`encouragement.js`,
    // dipake juga di TopicQuiz/FocusRoundQuiz) -- gak ada skor akurasi di
    // Math Race, jadi tier-nya di-derive dari posisi finis: juara 1/solo =
    // tier HIGH, juara 2 = MID, sisanya = LOW (tetep positif, bukan nge-judge).
    setEncouragement(pickEncouragement(myPlace === 1 ? 1 : myPlace === 2 ? 0.6 : 0.3));
    setMode("finished");
  }

  function endRace() {
    finishRace();
  }

  function restart() {
    stopAiOpponent();
    setMode("lobby");
    setCode(null);
    setRole(null);
    setRoom(null);
    setProgress(0);
    setQIndex(0);
    setQuestion(null);
    setAnswered(false);
    setLastCorrect(null);
    setPlace(null);
    setStartTime(null);
    setFinishMs(null);
    setError(null);
    setJoinCode("");
    setTypedValue("");
    setAiProgress(0);
    aiProgressRef.current = 0;
  }

  const playersInRoom = room?.players ? Object.entries(room.players) : [];

  return (
    <Shell>
      <PageDecor seed="mathrace" />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1 }}>
      <ScreenHeader onBack={() => navigate(`/kelas/${grade}`)} title="🏁 Math Race" subtitle={`Kelas ${grade}`} />

      {mode === "lobby" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, padding: "10px 18px 22px" }}>
          <div style={{ textAlign: "center", fontSize: 40 }}>🏎️💨🏎️</div>
          <div style={{ textAlign: "center", color: "var(--ink-500)", fontFamily: "var(--font-body)" }}>
            Jawab soal matematika secepat mungkin, siapa duluan nyampe garis finis menang!
          </div>

          <div style={{ background: "var(--cream-100)", borderRadius: 16, padding: 16 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, marginBottom: 10 }}>🎚️ Tingkat Kesulitan</div>
            <div style={{ display: "flex", gap: 8 }}>
              {Object.entries(DIFFICULTY).map(([key, d]) => (
                <Button key={key} variant={difficulty === key ? "primary" : "secondary"} size="sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => setDifficulty(key)}>
                  {d.label}
                </Button>
              ))}
            </div>
          </div>

          <div style={{ background: "var(--cream-100)", borderRadius: 16, padding: 16 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, marginBottom: 10 }}>✍️ Cara Jawab</div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant={answerMode === "choice" ? "primary" : "secondary"} size="sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => setAnswerMode("choice")}>
                Pilihan Ganda
              </Button>
              <Button variant={answerMode === "type" ? "primary" : "secondary"} size="sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => setAnswerMode("type")}>
                Isian (Ketik)
              </Button>
            </div>
          </div>

          <div style={{ background: "var(--cream-100)", borderRadius: 16, padding: 16 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, marginBottom: 10 }}>🚦 Pilih Kendaraan</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {VEHICLES.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVehicle(v.id)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    padding: "10px 4px", borderRadius: 12, cursor: "pointer",
                    border: vehicle === v.id ? "3px solid var(--pastel-green)" : "2px solid var(--cream-300)",
                    background: vehicle === v.id ? "var(--pastel-green)" : "var(--surface-card-alt)",
                  }}
                >
                  <span style={{ fontSize: "1.4rem" }}>{v.emoji}</span>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "0.68rem", fontWeight: 700 }}>{v.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: "var(--cream-100)", borderRadius: 16, padding: 16 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, marginBottom: 10 }}>🏃 Solo Play</div>
            <Button variant="primary" size="lg" style={{ width: "100%", justifyContent: "center" }} onClick={startSolo}>
              Main Sendiri
            </Button>
          </div>

          <div style={{ background: "var(--cream-100)", borderRadius: 16, padding: 16 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, marginBottom: 10 }}>👥 Bikin Race Baru</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <Button variant={maxPlayers === 2 ? "primary" : "secondary"} size="sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => setMaxPlayers(2)}>
                👥 2 Pemain
              </Button>
              <Button variant={maxPlayers === 3 ? "primary" : "secondary"} size="sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => setMaxPlayers(3)}>
                👥👤 3 Pemain
              </Button>
            </div>
            <Button variant="secondary" size="lg" style={{ width: "100%", justifyContent: "center" }} disabled={busy} onClick={() => createRoom(maxPlayers)}>
              Bikin Room
            </Button>
          </div>

          <div style={{ background: "var(--cream-100)", borderRadius: 16, padding: 16 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, marginBottom: 10 }}>🔑 Join Room</div>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="KODE 6 DIGIT"
              maxLength={6}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                border: "2px solid var(--cream-300)",
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "1.1rem",
                textAlign: "center",
                letterSpacing: 3,
                marginBottom: 10,
                boxSizing: "border-box",
              }}
            />
            <Button variant="secondary" size="lg" style={{ width: "100%", justifyContent: "center" }} disabled={busy} onClick={joinRoom}>
              Join
            </Button>
          </div>

          {error && <div style={{ color: "#C6431F", textAlign: "center", fontFamily: "var(--font-body)", fontWeight: 700 }}>{error}</div>}
        </div>
      )}

      {mode === "waiting" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 40 }}>⏳</div>
          <div style={{ fontFamily: "var(--font-body)", color: "var(--ink-500)" }}>Kode Room:</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "2rem", letterSpacing: 4, color: "var(--ink-900)" }}>{code}</div>
          <div style={{ fontFamily: "var(--font-body)", color: "var(--ink-500)" }}>Kasih kode ini ke temen kamu buat join</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
            {ROLES.slice(0, maxPlayers).map((r) => {
              const p = room?.players?.[r];
              return (
                <div key={r} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 12, background: "var(--cream-100)" }}>
                  <span style={{ fontSize: "1.3rem" }}>{VEHICLE_EMOJI[p?.vehicle] || "🚗"}</span>
                  <span style={{ fontFamily: "var(--font-body)", fontWeight: 700, color: p ? "var(--ink-900)" : "var(--ink-300)" }}>
                    {p ? p.name : "Menunggu..."}
                  </span>
                </div>
              );
            })}
          </div>
          {role === "p1" && (
            <Button variant="primary" size="lg" style={{ width: "100%", justifyContent: "center" }} disabled={playersInRoom.length < 2} onClick={startRace}>
              {playersInRoom.length < 2 ? "Nunggu pemain lain..." : "Mulai Race! 🏁"}
            </Button>
          )}
          {role !== "p1" && <div style={{ color: "var(--ink-400)" }}>Nunggu host mulai race...</div>}
        </div>
      )}

      {mode === "racing" && question && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "10px 18px 22px", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {code && playersInRoom.length > 0
              ? playersInRoom.map(([r, p]) => (
                  <RaceLane key={r} avatar={VEHICLE_EMOJI[p.vehicle] || "🚗"} name={r === role ? `${p.name} (kamu)` : p.name} progress={r === role ? progress : p.progress || 0} />
                ))
              : (
                <>
                  <RaceLane avatar={VEHICLE_EMOJI[vehicle]} name={`${player.name} (kamu)`} progress={progress} />
                  <RaceLane avatar="🤖" name="Lawan AI" progress={aiProgress} />
                </>
              )}
          </div>

          <div style={{ textAlign: "center", fontFamily: "var(--font-body)", fontWeight: 700, color: "var(--ink-500)", fontSize: "0.8rem" }}>
            Soal {qIndex + 1}/{TOTAL_QUESTIONS}
          </div>

          <div style={{ background: "var(--pastel-blue)", borderRadius: 20, padding: 24, textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.4rem", color: "var(--ink-900)" }}>{question.prompt}</div>
          </div>

          {answerMode === "choice" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {question.options.map((opt, i) => (
                <button
                  key={i}
                  disabled={answered}
                  onClick={() => handleAnswer(opt)}
                  style={{
                    border: "none",
                    borderRadius: 14,
                    padding: "16px 10px",
                    fontFamily: "var(--font-display)",
                    fontWeight: 800,
                    fontSize: "1.1rem",
                    cursor: answered ? "default" : "pointer",
                    background: answered ? (opt === question.correctLabel ? "var(--pastel-green)" : "var(--cream-100)") : "var(--surface-card-alt)",
                    color: "var(--ink-900)",
                    boxShadow: "var(--shadow-sticker-sm)",
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                value={typedValue}
                onChange={(e) => setTypedValue(e.target.value.replace(/[^0-9]/g, ""))}
                disabled={answered}
                inputMode="numeric"
                placeholder="Ketik jawaban..."
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && !answered && typedValue && submitTyped()}
                style={{
                  border: `2px solid ${answered ? (lastCorrect ? "var(--color-success)" : "var(--color-error)") : "var(--cream-300)"}`,
                  borderRadius: "var(--radius-lg)",
                  padding: "14px 16px",
                  fontFamily: "var(--font-display)",
                  fontSize: "1.2rem",
                  fontWeight: 800,
                  textAlign: "center",
                  boxSizing: "border-box",
                }}
              />
              {!answered && (
                <Button variant="primary" size="lg" disabled={!typedValue} onClick={submitTyped}>
                  Jawab
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {mode === "finished" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 56 }}>{place === 1 ? "🏆" : "🏁"}</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem", color: "var(--ink-900)" }}>
            {place ? `Kamu finis ke-${place}!` : "Selesai!"}
          </div>
          {finishMs && (
            <div style={{ color: "var(--ink-500)" }}>Waktu: {(finishMs / 1000).toFixed(1)} detik</div>
          )}
          {encouragement && (
            <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, color: "var(--ink-700)", maxWidth: 240 }}>{encouragement}</div>
          )}
          <Button variant="primary" size="lg" style={{ width: "100%", justifyContent: "center" }} onClick={restart}>
            Main Lagi
          </Button>
          <Button variant="secondary" size="md" style={{ width: "100%", justifyContent: "center" }} onClick={() => navigate(`/kelas/${grade}`)}>
            Kembali
          </Button>
        </div>
      )}

      {/* "AI box" (2026-08-10, bug report user "tidak ada AI box") --
          al-idrisi `multipleazka` punya `.game-bo` PERSISTEN (fixed
          bottom-right, selalu ada selama race+abis race) buat ngobrol
          bebas, TERPISAH dari `ai-hint-card` yang otomatis ngejelasin
          soal terakhir yang salah di layar reward. Kita port bagian
          PERSISTEN-nya doang (chat umum, KikoChatPanel mode "general"
          yang emang udah ada) -- MathRace gak punya konsep "1 soal
          terakhir yang salah" sejelas TopicQuiz (jawaban salah LANGSUNG
          ganti soal, gak ada state buat direnungin), jadi versi
          auto-explain-miss-nya gak di-port, cukup entry point chat aja. */}
      {(mode === "racing" || mode === "finished") && (
        <button
          onClick={() => setChatOpen(true)}
          style={{
            position: "fixed",
            bottom: "calc(22px + env(safe-area-inset-bottom, 0px))",
            right: 14,
            zIndex: 50,
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "none",
            padding: 0,
            background: "#fff",
            boxShadow: "0 3px 10px rgba(0,0,0,.18)",
            cursor: "pointer",
            animation: "jkMathRaceKikoWiggle 1.8s ease-in-out infinite",
          }}
          aria-label="Ngobrol sama Kiko"
        >
          <Kiko size={40} />
        </button>
      )}
      <KikoChatPanel open={chatOpen} onClose={() => setChatOpen(false)} mode="general" resetKey="mathrace" />

      <style>{`
        @keyframes jkMathRaceKikoWiggle {
          0%, 100% { transform: rotate(-8deg); }
          50% { transform: rotate(8deg); }
        }
      `}</style>
      </div>
    </Shell>
  );
}

function RaceLane({ avatar, name, progress }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "0.72rem", color: "var(--ink-500)", marginBottom: 2 }}>{name}</div>
      <div style={{ position: "relative", height: 26, borderRadius: 13, background: "var(--cream-100)", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, right: `${100 - progress}%`, background: "var(--pastel-green)", transition: "right 0.3s ease" }} />
        {/* Mobil emoji ngadep KIRI secara default (kayak font emoji lain),
            tapi track-nya jalan kiri->kanan (`left` naik) -- scaleX(-1)
            biar keliatan ngadep arah jalannya, bukan mundur. Pola sama
            kayak fix Dino Bridge walker (`BoBridgeBanner.jsx`). */}
        <div style={{ position: "absolute", left: `calc(${progress}% - 12px)`, top: "50%", transform: "translateY(-50%) scaleX(-1)", fontSize: "1.1rem", transition: "left 0.3s ease" }}>
          {avatar}
        </div>
      </div>
    </div>
  );
}
