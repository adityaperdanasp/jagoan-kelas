import { useNavigate, useParams } from "react-router-dom";
import Shell, { ScreenHeader } from "../components/Shell";
import GameCard from "../components/ds/GameCard";
import RoamingCarDino from "../components/RoamingCarDino";
import { SUBJECTS } from "../data/content";

export default function PickSubject() {
  const navigate = useNavigate();
  const { grade } = useParams();
  return (
    <Shell>
      <ScreenHeader onBack={() => navigate("/kelas")} title={`Kelas ${grade}`} subtitle="Pilih pelajaran" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, padding: "14px 18px 22px", overflowY: "auto" }}>
        <RoamingCarDino grade={grade} />
        {SUBJECTS.map((s) => (
          <GameCard
            key={s.id}
            accent={s.accent}
            icon={s.emoji}
            title={s.name}
            subtitle={s.sub}
            rotate={s.rotate}
            onClick={() => navigate(`/kelas/${grade}/${s.id}`)}
          />
        ))}
      </div>
    </Shell>
  );
}
