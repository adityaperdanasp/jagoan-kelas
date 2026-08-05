import { useEffect } from "react";
import { Navigate, Routes, Route } from "react-router-dom";
import { PlayerProvider, usePlayer } from "./data/PlayerContext";
import { initBgmUnlock } from "./data/bgm";
import Auth from "./screens/Auth";
import Landing from "./screens/Landing";
import PickGrade from "./screens/PickGrade";
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
      <Route path="/kelas" element={<RequireAuth><PickGrade /></RequireAuth>} />
      <Route path="/kelas/:grade" element={<RequireAuth><PickSubject /></RequireAuth>} />
      <Route path="/kelas/:grade/:subject" element={<RequireAuth><SubjectDetail /></RequireAuth>} />
      <Route path="/kelas/:grade/:subject/topik/:babKey" element={<RequireAuth><TopicQuiz /></RequireAuth>} />
      <Route path="/kelas/:grade/matematika/drive" element={<RequireAuth><DriveMode /></RequireAuth>} />
      <Route path="/kelas/:grade/matematika/plane" element={<RequireAuth><PlaneMode /></RequireAuth>} />
      <Route path="/kelas/:grade/matematika/mathrace" element={<RequireAuth><MathRace /></RequireAuth>} />
      <Route path="/rahasia/dinorace" element={<RequireAuth><DinoRaceUnlock /></RequireAuth>} />
      <Route path="/kelas/:grade/:subject/bobridge" element={<RequireAuth><GlassBridge /></RequireAuth>} />
      <Route path="/parents" element={<ParentPortal />} />
      <Route path="/fokus" element={<RequireAuth><FocusRoundPicker /></RequireAuth>} />
      <Route path="/fokus/main" element={<RequireAuth><FocusRoundQuiz /></RequireAuth>} />
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
