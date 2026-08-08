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
import BindoQuestMap from "./screens/BindoQuestMap";
import BinggrisWorldMap from "./screens/BinggrisWorldMap";
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
      {/* Daftar bab -- layar TERPISAH (bukan scroll di halaman yang sama),
          masuk lewat tombol "Solo Adventure" di BindoStorybookTrail --
          samain pola 2-layar (Landing vs Quest Map) azkacraft persis. */}
      <Route path="/kelas/:grade/bindo/bab" element={<RequireAuth><BindoQuestMap /></RequireAuth>} />
      {/* IPAS punya halaman sendiri ("SolarQuest", 2026-08-08, awalnya
          mockup preview-only) -- pola sama kayak bindo di atas. */}
      <Route path="/kelas/:grade/ipas" element={<RequireAuth><IpasQuestMap /></RequireAuth>} />
      {/* Matematika punya halaman sendiri ("Blockville Workshop" town map,
          2026-08-08, awalnya mockup preview-only) -- pola sama kayak
          bindo/ipas di atas. */}
      <Route path="/kelas/:grade/matematika" element={<RequireAuth><MathTownMap /></RequireAuth>} />
      {/* Bahasa Inggris punya halaman sendiri ("Kiko's World Tour",
          2026-08-08, konsep ORISINIL -- bukan porting al-idrisi, sumber
          referensinya udah abis kepake) -- pola sama kayak bindo/ipas/
          matematika di atas. */}
      <Route path="/kelas/:grade/binggris" element={<RequireAuth><BinggrisWorldMap /></RequireAuth>} />
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
