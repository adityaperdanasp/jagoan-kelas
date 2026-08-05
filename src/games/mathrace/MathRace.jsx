import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ref, onValue, set, update, get, runTransaction, onDisconnect, off } from "firebase/database";
import Shell, { ScreenHeader } from "../../components/Shell";
import Button from "../../components/ds/Button";
import { rtdb } from "../../firebase";
import { usePlayer } from "../../data/PlayerContext";
import { generateQuickQuestion } from "../shared/quickQuestion";

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
const AVATARS = { p1: "🚗", p2: "🚕", p3: "🚙" };

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

  const [mode, setMode] = useState("lobby"); // lobby | waiting | solo | racing | finished
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [joinCode, setJoinCode] = useState("");
  const [code, setCode] = useState(null);
  const [role, setRole] = useState(null);
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [question, setQuestion] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [progress, setProgress] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [place, setPlace] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [finishMs, setFinishMs] = useState(null);

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
    setQuestion(generateQuickQuestion(grade, "medium"));
    setAnswered(false);
  }

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
        players: { [myRole]: { name: player.name, progress: 0, connected: true } },
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
    rollQuestion();
  }

  async function handleAnswer(choiceLabel) {
    if (answered || !question) return;
    setAnswered(true);
    const isCorrect = choiceLabel === question.correctLabel;
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
    if (code) {
      const result = await runTransaction(ref(rtdb, `mathrace_games/${code}/finishCount`), (cur) => (cur || 0) + 1);
      const myPlace = result.snapshot.val();
      setPlace(myPlace);
      await update(ref(rtdb, `mathrace_games/${code}/players/${role}`), { finished: true, place: myPlace });
    } else {
      setPlace(1);
    }
    setMode("finished");
  }

  function endRace() {
    finishRace();
  }

  function restart() {
    setMode("lobby");
    setCode(null);
    setRole(null);
    setRoom(null);
    setProgress(0);
    setQIndex(0);
    setQuestion(null);
    setAnswered(false);
    setPlace(null);
    setStartTime(null);
    setFinishMs(null);
    setError(null);
    setJoinCode("");
  }

  const playersInRoom = room?.players ? Object.entries(room.players) : [];

  return (
    <Shell>
      <ScreenHeader onBack={() => navigate(`/kelas/${grade}/matematika`)} title="🏁 Math Race" subtitle={`Kelas ${grade}`} />

      {mode === "lobby" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, padding: "10px 18px 22px" }}>
          <div style={{ textAlign: "center", fontSize: 40 }}>🏎️💨🏎️</div>
          <div style={{ textAlign: "center", color: "var(--ink-500)", fontFamily: "var(--font-body)" }}>
            Jawab soal matematika secepat mungkin, siapa duluan nyampe garis finis menang!
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
                  <span style={{ fontSize: "1.3rem" }}>{AVATARS[r]}</span>
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
                  <RaceLane key={r} avatar={AVATARS[r]} name={r === role ? `${p.name} (kamu)` : p.name} progress={r === role ? progress : p.progress || 0} />
                ))
              : <RaceLane avatar="🚗" name={`${player.name} (kamu)`} progress={progress} />}
          </div>

          <div style={{ textAlign: "center", fontFamily: "var(--font-body)", fontWeight: 700, color: "var(--ink-500)", fontSize: "0.8rem" }}>
            Soal {qIndex + 1}/{TOTAL_QUESTIONS}
          </div>

          <div style={{ background: "var(--pastel-blue)", borderRadius: 20, padding: 24, textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.4rem", color: "var(--ink-900)" }}>{question.prompt}</div>
          </div>

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
          <Button variant="primary" size="lg" style={{ width: "100%", justifyContent: "center" }} onClick={restart}>
            Main Lagi
          </Button>
          <Button variant="secondary" size="md" style={{ width: "100%", justifyContent: "center" }} onClick={() => navigate(`/kelas/${grade}/matematika`)}>
            Kembali
          </Button>
        </div>
      )}
    </Shell>
  );
}

function RaceLane({ avatar, name, progress }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "0.72rem", color: "var(--ink-500)", marginBottom: 2 }}>{name}</div>
      <div style={{ position: "relative", height: 26, borderRadius: 13, background: "var(--cream-100)", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, right: `${100 - progress}%`, background: "var(--pastel-green)", transition: "right 0.3s ease" }} />
        <div style={{ position: "absolute", left: `calc(${progress}% - 12px)`, top: "50%", transform: "translateY(-50%)", fontSize: "1.1rem", transition: "left 0.3s ease" }}>
          {avatar}
        </div>
      </div>
    </div>
  );
}
