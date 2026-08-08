import { useNavigate, useParams } from "react-router-dom";
import Shell, { ScreenHeader } from "../components/Shell";
import GameCard from "../components/ds/GameCard";
import RoamingCarDino from "../components/RoamingCarDino";
import PageDecor from "../components/PageDecor";
import { SUBJECTS } from "../data/content";

export default function PickSubject() {
  const navigate = useNavigate();
  const { grade } = useParams();
  return (
    <Shell>
      <PageDecor seed="pick-subject" />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1 }}>
      <ScreenHeader onBack={() => navigate("/")} title={`Kelas ${grade}`} subtitle="Pilih pelajaran" />
      <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", gap: 10, padding: "14px 18px 22px", overflowY: "auto" }}>
        <RoamingCarDino grade={grade} />
        <GameCard
          accent="race"
          icon="🏁"
          title="Math Race"
          subtitle="Balapan jawab soal matematika!"
          onClick={() => navigate(`/kelas/${grade}/mathrace`)}
        />
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
        <GameCard
          accent="focus"
          icon="🎯"
          title="Fokus Latihan"
          subtitle="Campur soal dari pelajaran manapun"
          onClick={() => navigate(`/kelas/${grade}/fokus`)}
        />
        <GameCard
          accent="mint"
          icon="🥷"
          title="Ninja Runner"
          subtitle="Lari, lompat, jawab soal campur!"
          onClick={() => navigate(`/kelas/${grade}/ninja`)}
        />
      </div>
      </div>
    </Shell>
  );
}
