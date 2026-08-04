import { useNavigate } from "react-router-dom";
import Shell from "../../components/Shell";
import Button from "../../components/ds/Button";
import { Badge } from "../../components/ds/Badge";

// Halaman reveal easter egg -- unlock mechanism-nya udah jalan penuh
// (lihat useSecretTap.js), tapi game DinoRace beneran (2-player racing,
// butuh Firebase Realtime Database buat pairing, bukan Firestore yang
// dipakai project ini) belum di-porting -- itu scope terpisah yang gede,
// lihat CLAUDE.md follow-up. Ini placeholder yang jujur, bukan pura-pura
// selesai.
export default function DinoRaceUnlock() {
  const navigate = useNavigate();
  return (
    <Shell>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 64 }}>🦖🎉</div>
        <Badge color="green" rotate={-2}>Easter Egg Ketemu!</Badge>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem", color: "var(--ink-900)" }}>
          DinoRace
        </div>
        <div style={{ fontFamily: "var(--font-body)", color: "var(--ink-500)", maxWidth: 260 }}>
          Kombinasi rahasianya ketemu! Game balapan 2-player-nya masih disiapin, segera hadir 🚧
        </div>
        <Button variant="primary" size="lg" onClick={() => navigate("/")}>
          Kembali
        </Button>
      </div>
    </Shell>
  );
}
