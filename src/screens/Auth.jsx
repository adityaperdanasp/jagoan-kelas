import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Shell from "../components/Shell";
import { Badge } from "../components/ds/Badge";
import SegmentedToggle from "../components/ds/SegmentedToggle";
import Input from "../components/ds/Input";
import Button from "../components/ds/Button";
import { usePlayer } from "../data/PlayerContext";
import { signUp, signIn } from "../data/authService";

export default function Auth() {
  const navigate = useNavigate();
  const { login } = usePlayer();
  const [mode, setMode] = useState("signup");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError("");
    setLoading(true);
    try {
      const player = mode === "signup" ? await signUp(name, pin) : await signIn(name, pin);
      login(player);
      navigate("/");
    } catch (e) {
      setError(e.message || "Ada yang salah, coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <div style={{ padding: "26px 24px 36px", display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ textAlign: "center" }}>
          <Badge color="gold">🎒 Jagoan Kelas</Badge>
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "1.875rem", fontWeight: 700, color: "var(--ink-900)" }}>
            Selamat Datang!
          </div>
          <div style={{ fontSize: "0.94rem", color: "var(--ink-400)", marginTop: 4 }}>
            {mode === "signup" ? "Buat akun buat mulai belajar!" : "Masuk lagi yuk, isi nama & PIN kamu."}
          </div>
        </div>

        <SegmentedToggle
          options={[
            { value: "signup", label: "Daftar" },
            { value: "signin", label: "Masuk" },
          ]}
          value={mode}
          onChange={(v) => {
            setMode(v);
            setError("");
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input label="Nama kamu" placeholder="mis. Azka" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            label="PIN 4 digit"
            pin
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            invalid={!!error}
            error={error}
          />
          <Button variant="cta" size="lg" disabled={loading || !name || pin.length !== 4} onClick={handleSubmit}>
            {loading ? "Tunggu bentar..." : mode === "signup" ? "Daftar & Main! 🚀" : "Masuk! 🚀"}
          </Button>
        </div>
      </div>
    </Shell>
  );
}
