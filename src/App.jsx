import { useEffect, lazy, Suspense } from "react";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import { PlayerProvider, usePlayer } from "./data/PlayerContext";
import { LanguageProvider } from "./data/LanguageContext";
import { initBgmUnlock } from "./data/bgm";
import Kiko from "./components/ds/Kiko";

// Bug #7 (2026-08-10) -- user: "saat sudah masuk page kelas dan memilih
// pelajaran kenapa load lama banget?... Apa ada kurang di arsitektur
// saya?" JAWABANNYA IYA: sebelumnya SEMUA screen + game (Drive/Plane/
// NinjaRunner/6 peta subject/dst) di-`import` EAGER di sini, jadi build
// production nge-bundle SEMUANYA jadi 1 file JS gede (>1.1MB, warning
// "chunk lebih dari 500kB" pas build) -- anak HARUS download+parse+
// eksekusi KODE SELURUH APP (termasuk game yang belum tentu dia mainin)
// SEBELUM layar pertama kebuka sama sekali, apalagi di jaringan seluler
// yang lebih lambat dari WiFi kantor/rumah tempat testing biasa. Fix:
// `lazy()` per screen/game -- Vite otomatis code-split tiap komponen
// jadi chunk-nya sendiri (udah kebukti di output build sebelumnya, file
// `kelas_N-*.js` per konten JSON udah lazy dari awal lewat
// `import.meta.glob`, screen/game-nya doang yang belum). Sekarang cuma
// screen yang lagi dibuka yang di-download, "menyiapkan taman"/"loading"
// generic muncul SEBENTAR pas nunggu 1 chunk itu doang (biasanya cuma
// beberapa KB), bukan nunggu >1MB kayak sebelumnya.
const Auth = lazy(() => import("./screens/Auth"));
const Landing = lazy(() => import("./screens/Landing"));
const PickSubject = lazy(() => import("./screens/PickSubject"));
const SubjectDetail = lazy(() => import("./screens/SubjectDetail"));
const DriveMode = lazy(() => import("./games/drive/DriveMode"));
const PlaneMode = lazy(() => import("./games/plane/PlaneMode"));
const DinoRaceUnlock = lazy(() => import("./games/dinorace/DinoRaceUnlock"));
const GlassBridge = lazy(() => import("./games/bobridge/GlassBridge"));
const MathRace = lazy(() => import("./games/mathrace/MathRace"));
const ParentPortal = lazy(() => import("./screens/ParentPortal"));
const TopicQuiz = lazy(() => import("./screens/TopicQuiz"));
const FocusRoundPicker = lazy(() => import("./screens/FocusRoundPicker"));
const FocusRoundQuiz = lazy(() => import("./screens/FocusRoundQuiz"));
const IpasQuestMap = lazy(() => import("./screens/IpasQuestMap"));
const MathTownMap = lazy(() => import("./screens/MathTownMap"));
const BindoStorybookTrail = lazy(() => import("./screens/BindoStorybookTrail"));
const BindoQuestMap = lazy(() => import("./screens/BindoQuestMap"));
const BinggrisWorldMap = lazy(() => import("./screens/BinggrisWorldMap"));
const PpknVillageMap = lazy(() => import("./screens/PpknVillageMap"));
const PaiGardenPath = lazy(() => import("./screens/PaiGardenPath"));
const NinjaRunner = lazy(() => import("./games/ninja/NinjaRunner"));
const WordScramble = lazy(() => import("./games/scramble/WordScramble"));

// Fallback generic (bukan per-screen) -- Suspense di App level cuma
// nunggu DOWNLOAD chunk-nya, bukan fetch data (tiap screen udah punya
// loading state sendiri buat itu, gak diubah). Muncul SEBENTAR doang,
// cuma pas chunk itu beneran belum ke-cache browser.
function RouteLoadingFallback() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-card)" }}>
      <Kiko size={64} style={{ animation: "jkRouteLoadingBob 1s ease-in-out infinite" }} />
      <style>{`@keyframes jkRouteLoadingBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }`}</style>
    </div>
  );
}

function RequireAuth({ children }) {
  const { player } = usePlayer();
  if (!player) return <Navigate to="/masuk" replace />;
  return children;
}

// Bug #12 (2026-08-10) -- user: "sudah milih latihan dan mulai latihan.
// Muncuk page putih, harus scroll keats baru soal ke refresh." Root
// cause: React Router SPA nav TIDAK reset scroll position (beda dari
// full page load browser biasa) -- pindah dari layar panjang (misal
// FocusRoundPicker yang di-scroll jauh ke bawah buat centang topik) ke
// layar baru yang lebih pendek bikin browser nyangkut di scrollY lama,
// konten baru ke-render di ATAS titik itu jadi keliatan putih kosong
// sampe di-scroll manual. Fix generic di App level (bukan cuma Focus
// Round) -- reset ke atas SETIAP route berubah, biar kelas bug yang
// sama gak muncul lagi di layar lain manapun.
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppRoutes() {
  return (
    <>
    <ScrollToTop />
    <Suspense fallback={<RouteLoadingFallback />}>
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
      {/* PPKn punya halaman sendiri ("Kampung Pancasila", 2026-08-08,
          konsep ORISINIL kayak binggris -- ada mekanik tambahan: skenario
          dilema sipil kecil muncul sebelum quiz dibuka, bukan cuma peta
          biasa) -- pola route sama kayak subject lain di atas. */}
      <Route path="/kelas/:grade/ppkn" element={<RequireAuth><PpknVillageMap /></RequireAuth>} />
      {/* PAI punya halaman sendiri ("Taman Akhlak", 2026-08-08, konsep
          ORISINIL, nuansa lebih tenang dibanding map lain) -- pola route
          sama kayak subject lain di atas, subject terakhir yang masih
          plain sekarang cuma tinggal ini abis di-wire. */}
      <Route path="/kelas/:grade/pai" element={<RequireAuth><PaiGardenPath /></RequireAuth>} />
      <Route path="/kelas/:grade/:subject" element={<RequireAuth><SubjectDetail /></RequireAuth>} />
      <Route path="/kelas/:grade/:subject/topik/:babKey" element={<RequireAuth><TopicQuiz /></RequireAuth>} />
      <Route path="/kelas/:grade/matematika/drive" element={<RequireAuth><DriveMode /></RequireAuth>} />
      <Route path="/kelas/:grade/matematika/plane" element={<RequireAuth><PlaneMode /></RequireAuth>} />
      <Route path="/kelas/:grade/mathrace" element={<RequireAuth><MathRace /></RequireAuth>} />
      <Route path="/rahasia/dinorace" element={<RequireAuth><DinoRaceUnlock /></RequireAuth>} />
      <Route path="/kelas/:grade/:subject/bobridge" element={<RequireAuth><GlassBridge /></RequireAuth>} />
      {/* "Susun Kata" (2026-08-09) -- mini-game shared Bindo & Binggris,
          1 komponen generic (route dinamis kayak /bobridge di atas, subject
          dibaca dari param), gantiin harus bikin 2 komponen/route beda. */}
      <Route path="/kelas/:grade/:subject/susun-kata" element={<RequireAuth><WordScramble /></RequireAuth>} />
      <Route path="/parents" element={<ParentPortal />} />
      <Route path="/kelas/:grade/fokus" element={<RequireAuth><FocusRoundPicker /></RequireAuth>} />
      <Route path="/kelas/:grade/fokus/main" element={<RequireAuth><FocusRoundQuiz /></RequireAuth>} />
      <Route path="/kelas/:grade/ninja" element={<RequireAuth><NinjaRunner /></RequireAuth>} />
    </Routes>
    </Suspense>
    </>
  );
}

export default function App() {
  useEffect(() => {
    initBgmUnlock();
  }, []);

  return (
    <LanguageProvider>
      <PlayerProvider>
        <AppRoutes />
      </PlayerProvider>
    </LanguageProvider>
  );
}
