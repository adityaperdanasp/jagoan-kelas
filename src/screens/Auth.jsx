import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Shell from "../components/Shell";
import { Badge } from "../components/ds/Badge";
import Kiko from "../components/ds/Kiko";
import AuthDecor from "../components/AuthDecor";
import SegmentedToggle from "../components/ds/SegmentedToggle";
import Input from "../components/ds/Input";
import Button from "../components/ds/Button";
import { usePlayer } from "../data/PlayerContext";
import { signUp, signIn } from "../data/authService";
import { useT } from "../data/translations";

export default function Auth() {
  const navigate = useNavigate();
  const { login } = usePlayer();
  const { t } = useT();
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
      setError(e.message || t("auth", "errorDefault"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <AuthDecor />
      <div style={{ padding: "26px 24px 36px", display: "flex", flexDirection: "column", gap: 24, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center" }}>
          <Badge color="gold">
            <Kiko size={24} />
            Jagoan Kelas
          </Badge>
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "1.875rem", fontWeight: 700, color: "var(--ink-900)" }}>
            {t("auth", "welcome")}
          </div>
          <div style={{ fontSize: "0.94rem", color: "var(--ink-400)", marginTop: 4 }}>
            {mode === "signup" ? t("auth", "taglineSignup") : t("auth", "taglineSignin")}
          </div>
        </div>

        <SegmentedToggle
          options={[
            { value: "signup", label: t("auth", "register") },
            { value: "signin", label: t("auth", "login") },
          ]}
          value={mode}
          onChange={(v) => {
            setMode(v);
            setError("");
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input label={t("auth", "nameLabel")} placeholder={t("auth", "namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            label={t("auth", "pinLabel")}
            pin
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            invalid={!!error}
            error={error}
          />
          <Button variant="cta" size="lg" disabled={loading || !name || pin.length !== 4} onClick={handleSubmit}>
            {loading ? t("auth", "submitting") : mode === "signup" ? t("auth", "registerCta") : t("auth", "loginCta")}
          </Button>
        </div>
      </div>
    </Shell>
  );
}
