import { useEffect } from "react";
import { Navigate, Routes, Route } from "react-router-dom";
import { PlayerProvider, usePlayer } from "./data/PlayerContext";
import { initBgmUnlock } from "./data/bgm";
import Auth from "./screens/Auth";
import Landing from "./screens/Landing";
import PickSubject from "./screens/PickSubject";
import SubjectDetail from "./screens/SubjectDetail";
import DriveMode from "./games/drive/DriveMode";
import PlaneMode from "./games/plane/PlaneMode";
import DinoRaceUnlock from "./games/dinorace/DinoRaceUnlock";
import GlassBridge from "./games/bobridge/GlassBridge";
import MathRace from "./games/mathrace/MathRace";
import ParentPortal from "./screens/ParentPortal";
import TopicQuiz from "./screens/TopicQuiz";
import FocusRoundPicker from "./screens/FocusRoundPicker";
import FocusRoundQuiz from "./screens/FocusRoundQuiz";
import IpasQuestMap from "./screens/IpasQuestMap";
import MathTownMap from "./screens/MathTownMap";
import BindoStorybookTrail from "./screens/BindoStorybookTrail";
import NinjaRunner from "./games/ninja/NinjaRunner";

function RequireAuth({ children }) {
  const { player } = usePlayer();
  if (!player) return <Navigate to="/masuk" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/masuk" element={<Auth />} />
      <Route path="/" element={<RequireAuth><Landing /></RequireAuth>} />
      <Route path="/kelas/:grade" element={<RequireAuth><PickSubject /></RequireAuth>} />
      {/* Bindo punya halaman sendiri ("Storybook Trail", 2026-08-08) --
          route statis ini menang atas ":subject" generik di bawahnya
          (React Router ranking: segmen statis > dinamis, gak soal urutan
          deklarasi), jadi 5 subject lain tetep kena SubjectDetail.jsx. */}
      <Route path="/kelas/:grade/bindo" element={<RequireAuth><BindoStorybookTrail /></RequireAuth>} />
      <Route path="/kelas/:grade/:subject" element={<RequireAuth><SubjectDetail /></RequireAuth>} />
      <Route path="/kelas/:grade/:subject/topik/:babKey" element={<RequireAuth><TopicQuiz /></RequireAuth>} />
      <Route path="/kelas/:grade/matematika/drive" element={<RequireAuth><DriveMode /></RequireAuth>} />
      <Route path="/kelas/:grade/matematika/plane" element={<RequireAuth><PlaneMode /></RequireAuth>} />
      <Route path="/kelas/:grade/mathrace" element={<RequireAuth><MathRace /></RequireAuth>} />
      <Route path="/rahasia/dinorace" element={<RequireAuth><DinoRaceUnlock /></RequireAuth>} />
      <Route path="/kelas/:grade/:subject/bobridge" element={<RequireAuth><GlassBridge /></RequireAuth>} />
      <Route path="/parents" element={<ParentPortal />} />
      <Route path="/kelas/:grade/fokus" element={<RequireAuth><FocusRoundPicker /></RequireAuth>} />
      <Route path="/kelas/:grade/fokus/main" element={<RequireAuth><FocusRoundQuiz /></RequireAuth>} />
      <Route path="/kelas/:grade/ninja" element={<RequireAuth><NinjaRunner /></RequireAuth>} />
      {/* MOCKUP (2026-08-07) -- preview route terpisah, belum gantiin
          SubjectDetail.jsx buat ipas beneran, nunggu approval user. */}
      <Route path="/kelas/:grade/ipas/peta-mockup" element={<RequireAuth><IpasQuestMap /></RequireAuth>} />
      <Route path="/kelas/:grade/matematika/peta-mockup" element={<RequireAuth><MathTownMap /></RequireAuth>} />
    </Routes>
  );
}

export default function App() {
  useEffect(() => {
    initBgmUnlock();
  }, []);

  return (
    <PlayerProvider>
      <AppRoutes />
    </PlayerProvider>
  );
}
