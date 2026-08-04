import { Routes, Route } from "react-router-dom";
import Landing from "./screens/Landing";
import PickGrade from "./screens/PickGrade";
import PickSubject from "./screens/PickSubject";
import SubjectDetail from "./screens/SubjectDetail";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/kelas" element={<PickGrade />} />
      <Route path="/kelas/:grade" element={<PickSubject />} />
      <Route path="/kelas/:grade/:subject" element={<SubjectDetail />} />
    </Routes>
  );
}
