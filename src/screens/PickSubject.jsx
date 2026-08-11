import { useNavigate, useParams } from "react-router-dom";
import Shell, { ScreenHeader } from "../components/Shell";
import GameCard from "../components/ds/GameCard";
import RoamingCarDino from "../components/RoamingCarDino";
import PageDecor from "../components/PageDecor";
import { SUBJECTS } from "../data/content";
import { useT } from "../data/translations";
import {
  MathRaceIcon,
  MathNumbersIcon,
  ScienceIcon,
  CivicsFlagIcon,
  MosqueIcon,
  BookIcon,
  EnglishBubbleIcon,
  FocusTargetIcon,
  NinjaStarIcon,
} from "../components/ds/SubjectIcons";

const SUBJECT_ICONS = {
  matematika: MathNumbersIcon,
  ipas: ScienceIcon,
  ppkn: CivicsFlagIcon,
  pai: MosqueIcon,
  bindo: BookIcon,
  binggris: EnglishBubbleIcon,
};

export default function PickSubject() {
  const navigate = useNavigate();
  const { grade } = useParams();
  const { t, subjectName, subjectSub } = useT();
  return (
    <Shell>
      <PageDecor seed="pick-subject" />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1 }}>
      <ScreenHeader onBack={() => navigate("/")} title={t("pickSubject", "title", { n: grade })} subtitle={t("pickSubject", "subtitle")} />
      <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", gap: 10, padding: "14px 18px 22px", overflowY: "auto" }}>
        <RoamingCarDino grade={grade} />
        <GameCard
          accent="race"
          icon={<MathRaceIcon />}
          watermark={<MathRaceIcon />}
          entranceDelay={0}
          title={t("pickSubject", "mathRaceTitle")}
          subtitle={t("pickSubject", "mathRaceSub")}
          onClick={() => navigate(`/kelas/${grade}/mathrace`)}
        />
        {SUBJECTS.map((s, i) => {
          const Icon = SUBJECT_ICONS[s.id];
          return (
            <GameCard
              key={s.id}
              accent={s.accent}
              icon={Icon ? <Icon /> : s.emoji}
              watermark={Icon ? <Icon /> : null}
              entranceDelay={(i + 1) * 60}
              title={subjectName(s.id)}
              subtitle={subjectSub(s.id)}
              rotate={s.rotate}
              onClick={() => navigate(`/kelas/${grade}/${s.id}`)}
            />
          );
        })}
        <GameCard
          accent="focus"
          icon={<FocusTargetIcon />}
          watermark={<FocusTargetIcon />}
          entranceDelay={(SUBJECTS.length + 1) * 60}
          title={t("pickSubject", "focusTitle")}
          subtitle={t("pickSubject", "focusSub")}
          onClick={() => navigate(`/kelas/${grade}/fokus`)}
        />
        <GameCard
          accent="mint"
          icon={<NinjaStarIcon />}
          watermark={<NinjaStarIcon />}
          entranceDelay={(SUBJECTS.length + 2) * 60}
          title={t("pickSubject", "ninjaTitle")}
          subtitle={t("pickSubject", "ninjaSub")}
          onClick={() => navigate(`/kelas/${grade}/ninja`)}
        />
      </div>
      </div>
    </Shell>
  );
}
