import { useNavigate } from "react-router-dom";
import Shell from "../../components/Shell";
import Button from "../../components/ds/Button";
import { Badge } from "../../components/ds/Badge";
import PageDecor from "../../components/PageDecor";

// Halaman reveal easter egg -- unlock mechanism-nya udah jalan penuh
// (lihat useSecretTap.js). Game DinoRace-nya sendiri BUKAN reimplementasi
// React (butuh Firebase Realtime Database buat pairing 2-player, beda dari
// Firestore yang dipakai project ini) -- di-reuse langsung dari file statis
// al-idrisi-games/dinorace (public/dinorace/index.html), sama pola kayak
// BrainBox sendiri nge-embed DinoRace-nya. Halaman ini cuma reveal + link
// keluar ke game statisnya.
export default function DinoRaceUnlock() {
  const navigate = useNavigate();
  return (
    <Shell>
      <PageDecor seed="dinorace-unlock" />
      <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 64 }}>🦖🎉</div>
        <Badge color="green" rotate={-2}>Easter Egg Ketemu!</Badge>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem", color: "var(--ink-900)" }}>
          DinoRace
        </div>
        <div style={{ fontFamily: "var(--font-body)", color: "var(--ink-500)", maxWidth: 260 }}>
          Kombinasi rahasianya ketemu! Ayo balapan dino sama temenmu 🦕
        </div>
        <Button variant="primary" size="lg" onClick={() => { window.location.href = "/dinorace/index.html"; }}>
          Main Sekarang! 🏁
        </Button>
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          Kembali
        </Button>
      </div>
    </Shell>
  );
}
