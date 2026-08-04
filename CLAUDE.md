# Jagoan Kelas — Project Notes

Aplikasi edukasi buat anak SD Indonesia kelas 1-6, ngikutin Kurikulum Merdeka. Tagline: "Belajar, tapi Gak Ngebosenin". Dibuat buat kelas anaknya Adit (sama konteksnya kayak BrainBox), tapi **infrastruktur 100% terpisah** dari BrainBox (`~/Documents/al-idrisi-games`) — repo GitHub beda, Firebase project beda, Vercel project beda, domain beda. BrainBox cuma dipakai sebagai REFERENSI POLA KODE (baca-only, gak pernah diedit dari sesi kerja project ini).

## Infra

- **Repo**: [github.com/adityaperdanasp/jagoan-kelas](https://github.com/adityaperdanasp/jagoan-kelas)
- **Hosting**: Vercel project `ellilo/jagoan-kelas` → [jagoan-kelas.vercel.app](https://jagoan-kelas.vercel.app), `vercel --prod --yes` buat deploy manual (belum ada custom domain)
- **Backend**: Firebase project `jagoan-kelas` (Firestore Database, region `asia-southeast2`/Jakarta, mode test). Config di `src/firebase.js` — `apiKey` itu public client identifier, aman di-commit (security lewat Firestore Rules, bukan kerahasiaan key), sama kayak pola `firebase.js` BrainBox.
- **Stack**: Vite + React + React Router (SPA, bukan Next.js). BrainBox pakai vanilla HTML/CSS/JS; project ini sengaja pakai React karena butuh handle 42 kombinasi kelas×pelajaran dengan komponen reusable, bukan reuse langsung kode BrainBox.
- **Auth ke GitHub**: SSH key (`~/.ssh/id_ed25519`) udah terhubung ke akun `adityaperdanasp`, dipakai buat push — bukan `gh auth login` (belum pernah login, `gh` CLI ke-install tapi nganggur).

## Desain — WAJIB ikutin wireframe persis, jangan improvisasi

Sumber: `~/Documents/jagoan-kelas/design_handoff_kids_game_wireframe/` (`README.md` + `Kids Game Wireframe.dc.html` + `_ds/` design tokens). Ini SPEC, bukan inspirasi.

- Token warna/font/radius/shadow di `src/styles/tokens.css` — nilai persis dari `_ds/tokens/*.css`, **jangan approximate**.
- Komponen di `src/components/ds/` (Avatar, Badge, Chip, Button, GameCard, ProgressXP, Input, SegmentedToggle) — di-port **1:1** dari source JSX yang ada di `_ds_bundle.js` (bundle itu nyimpen source component asli BrainBox design system, bukan cuma compiled CSS).
- 4 layar wireframe: Landing (`Landing.jsx`) → Pilih Kelas (`PickGrade.jsx`, path 6 node winding) → Pilih Pelajaran (`PickSubject.jsx`, 7→6 card) → Detail Pelajaran (`SubjectDetail.jsx`, list topik + status).
- **Deviasi yang UDAH disepakati sama user** (jangan revert tanpa nanya): wireframe aslinya nampilin **7 mata pelajaran** (Matematika/IPA/IPS/PPKn/PAI/B.Indo/B.Inggris terpisah), tapi diubah jadi **6** — IPA+IPS digabung jadi satu card "IPAS" (`src/data/content.js`) karena Kurikulum Merdeka asli emang udah merger keduanya jadi satu buku sejak kelas 3 (kelas 1-2 tematik). Kalau nanti ada permintaan "kok cuma 6 pelajaran" — ini bukan bug, ini keputusan sadar.

## Auth — pola disamain persis sama BrainBox

- **Sign Up / Sign In** pakai nama + PIN 4 digit (`src/screens/Auth.jsx`, `SegmentedToggle`), BUKAN email/password formal — sama filosofi kayak BrainBox (`al-idrisi-games/index.html` layar `#sc-screen-select`).
- Skema data: `players/{nameKey}` → `{name, pin, xp, createdAt}` (`src/data/authService.js`). `nameKey` = nama di-lowercase + non-alfanumerik jadi `-`, identik sama fungsi `nameKeyOf`/sanitasi BrainBox punya `testerAccounts/{nameKey}`.
  - Sign Up: tolak kalau `nameKey` udah ada dokumennya, langsung login abis create.
  - Sign In: cocokin `pin` plaintext ke yang tersimpan. **Plaintext PIN itu SENGAJA** (bukan lupa hash) — sama persis pola BrainBox, karena threat model-nya rendah (device fisik anak SD di kelas, bukan aplikasi publik dengan data sensitif).
- Avatar warna: `hashColor(seed ?? name)` di `Avatar.jsx` — fungsi hash-nya **disalin persis** dari BrainBox punya (PALETTE array yang sama, algoritma hash yang sama), bukan reimplementasi.
- Session: `localStorage` key `jagoan_kelas_player` nyimpen `{id, name, pin, xp, createdAt}` (`src/data/PlayerContext.jsx`) — analog `player.js` BrainBox (`aig_player`), tapi lebih simpel (BrainBox punya konsep `role: parent/child` yang gak dipakai di sini, gak ada kebutuhan itu).
- Proteksi rute: `RequireAuth` wrapper di `App.jsx` — semua rute selain `/masuk` redirect ke situ kalau `player` null.

### Beda sengaja dari BrainBox (dicatat biar transparan, bukan silent divergence)
- **Firestore, bukan Realtime Database.** BrainBox pakai RTDB (`al-idrisi-games` project) terutama karena butuh sinkronisasi real-time buat multiplayer (Math Race, DinoRace race state). Jagoan Kelas belum ada kebutuhan multiplayer real-time — Firestore lebih pas buat model data per-dokumen (progress per pelajaran) dan udah kepasang duluan pas setup awal. **DinoRace beneran (2-player) belum di-porting justru karena butuh RTDB** buat live pairing (lihat bagian Games di bawah) — kalau itu dikerjain, project Firebase yang sama bisa ditambahin RTDB juga (satu project bisa punya keduanya).
- Belum ada skema `badges`/`topicStats` kayak BrainBox (`players/{id}/badges/{gameId}/...`, `players/{id}/topicStats/{gameId}/{topicKey}/{correct,wrong,streak}`) — progress tracking (XP naik, topik jadi "selesai") **belum dibangun sama sekali**, `xp` di dokumen player masih statis 0 dari sign-up. Kalau mau ngerjain ini, ikutin bentuk BrainBox: `players/{id}/progress/{subjectId}/{grade}/{babKey}/{status, xp, stars}` (bukan flat kayak sekarang) biar konsisten sama pola nested-by-game(subject) BrainBox.

## Konten soal (content-pipeline)

Folder terpisah `~/Documents/jagoan-kelas/content-pipeline/` (di luar `app/`, cuma script Python + output JSON, gak ikut ke-deploy). Restrukturisasi bank soal mentah (`soal_matematika_1000.json`, `soal_ipas_1_6.json`) jadi format per-bab sesuai struktur Kurikulum Merdeka resmi (`input/struktur_bab_kemdikbud.md`, hasil riset web + verifikasi ulang).

- `bab_struktur.py` — struktur bab resmi per kelas per mapel (hardcoded dari riset, termasuk 8-bab tematik IPAS kelas 1 dari modul ajar Kemdikbud, BUKAN Buku Siswa resmi karena emang gak ada buku IPAS buat kelas 1-2).
- `classify_matematika.py` / `classify_ipas.py` — mapping soal existing ke bab pakai kombinasi topic-name langsung + keyword-scoring (buat topik generik kayak "Pengetahuan Alam & Sosial Tambahan"). Soal yang gak match apapun masuk `belum_terpetakan`, TIDAK dipaksa ke bab yang salah.
- `generators_matematika.py` — generator soal prosedural (gaya MathVille `generators.js`, jawaban dihitung via kode) buat ngisi bab yang kosong/tipis. Target 15 soal/bab.
- `draft_ipas.py` — soal IPAS ditulis manual (BUKAN generate acak, karena harus faktual akurat) buat 14 bab yang kosong, ditandai `"sumber": "draft_ai_perlu_review"` — **WAJIB direview manusia sebelum dianggap final**, khususnya sains (cahaya/bunyi, tubuh manusia, bumi) dan sejarah/geografi. Kelas 6 Bab 8 "Proyek Akhir IPAS" SENGAJA gak dibikinin soal (itu bab proyek, bukan materi kuis).
- Output di `content-pipeline/output/{matematika,ipas}/kelas_{1-6}.json`, di-copy manual ke `app/src/data/content/{subject}/kelas_{n}.json` (bukan symlink/build-step — kalau content-pipeline di-rerun, HARUS re-copy manual ke app).
- **PPKn**: soal per-bab (`soal_ppkn_per_bab.json`) dikasih user langsung udah dalam format final, di-split jadi per-kelas via script inline (bukan file terpisah, one-off) ke `app/src/data/content/ppkn/kelas_{n}.json`.
- **Belum ada konten sama sekali**: IPS (udah gabung ke IPAS), PAI (paling sensitif, WAJIB direview ustadz/guru agama, jangan pernah asal-generate), Bahasa Indonesia, Bahasa Inggris.

### Temuan penting soal mismatch kurikulum (buat direview manual user)
- Matematika: kelas 2 "Perkalian/Pembagian" (84 soal, gak ada bab resmi di kelas 2), kelas 3 "Pecahan"+"Keliling Bangun Datar" (materi kelas 2/4 dan kelas 5, bukan kelas 3), kelas 5 "Volume Bangun Ruang"+"Perbandingan&Skala" (materi kelas 4 dan kelas 6), kelas 6 cuma 4 bab resmi vs bank soal yang jauh lebih luas (~separuh soal kelas 6 gak ketampung: Bilangan Bulat, Operasi Campuran, Statistika).
- Semua soal mismatch ini ada di `belum_terpetakan` per file kelas, BUKAN dihapus — tinggal nunggu keputusan user.

## Games (Drive Mode / Plane Mode / DinoRace easter egg)

Folder `src/games/` — `drive/`, `plane/`, `dinorace/`, `shared/`. Semuanya **v1/core-engine**, di-port dari pola BrainBox mathville (baca kode aslinya di `al-idrisi-games/mathville/script.js`, cari komentar "Drive Mode"/"PLANE MODE") tapi DISEDERHANAIN — BrainBox sendiri butuh berbulan-bulan iterasi (nitro, water gun, vehicle skin, boss cycle, power-up, respawn gauntlet, dst, semua tercatat di CLAUDE.md BrainBox) buat nyampe ke versi sekarang. Jangan kaget kalau user minta salah satu fitur "lanjutan" ini nanti — itu emang belum ada, bukan bug.

- **`shared/quickQuestion.js`** — generator soal kilat grade-aware (beda dari `generators_matematika.py` yang per-bab kurikulum). Rentang angka per kelas 1-6, dipakai Drive Mode & Plane Mode dua-duanya. BrainBox punya bank soal FIXED grade-4 (dari MathVille) karena mathville cuma 1 kelas; kita generate langsung per grade karena app-nya 6 kelas.
- **`shared/useJoystick.js` + `Joystick.jsx`** — analog stick, pola sama kayak BrainBox (drag dari tengah, vector -1..1). Posisi visual nub lewat React state, tapi `vecRef` yang dibaca game loop tiap frame TIDAK lewat re-render (biar gak lag) — persis alasan BrainBox manipulasi DOM langsung.
- **`drive/DriveMode.jsx`** — mobil dodge-obstacle + dino chase + quiz kilat pas nabrak obstacle. Entry: tombol "🚗 Drive" di `SubjectDetail.jsx` (khusus subject Matematika), route `/kelas/:grade/matematika/drive`.
  - Ada: 1 dino ngejar (bukan 2 di Hard), obstacle dodge, quiz-on-hit, lives/bite-immunity, difficulty picker, win/lose.
  - **BELUM ada** (fitur BrainBox yang sengaja di-skip v1): nitro boost, water gun, vehicle skin picker, city-markers-ke-chapter, dino obstacle-avoidance steering (dino kita jalan lurus ke arah mobil, gak belok-belok ngindarin rintangan kayak BrainBox `dinoSteerAngle`).
- **`plane/PlaneMode.jsx`** — shmup vertikal, auto-fire, musuh turun+nembak balik, quiz berkala = bomb semua musuh. Entry: tombol "✈️ Plane" di sebelah Drive, route `/kelas/:grade/matematika/plane`.
  - Ada: ship+joystick, auto-fire, 1 tipe musuh (+variasi sine drift), musuh nembak balik (aimed, ada spread error), lives+invuln flash, ledakan visual, quiz berkala = bomb, skor target buat menang.
  - **BELUM ada**: power-up (rapid-fire/shield/heal/wingmen/spread), boss fight, endless mode + wave-difficulty-ramp, respawn gauntlet (3x kesempatan), high-score persisten, XP reward pas menang.
  - Elemen bullet/musuh dimanipulasi langsung ke DOM (`document.createElement` + `style.left/top` tiap frame, BUKAN React state) — SAMA PERSIS pola performa BrainBox, krusial buat FPS yang smooth pas banyak bullet di layar.
- **`dinorace/`** — CUMA unlock mechanism yang jadi, game beneran BELUM. `useSecretTap.js`: tap 6 kuadran (bagi hero image Landing jadi TL/TR/BL/BR) sesuai urutan rahasia `TL,TR,TL,TR,BL,BR` dalam window 2.5 detik/tap, salah urutan atau kelamaan diem = reset progress. Berhasil → navigate ke `/rahasia/dinorace` (`DinoRaceUnlock.jsx`), yang JUJUR nampilin "segera hadir", bukan pura-pura ada game-nya. **Urutan tap sequence-nya SENGAJA gak didokumentasiin di UI/README publik manapun** (biar tetep rahasia) — cuma ada di kode ini.
  - DinoRace ASLI (2-player racing, sumber di `~/Documents/dinorace` atau `al-idrisi-games/dinorace/`) belum di-porting sama sekali. Butuh: Firebase RTDB (bukan Firestore) buat room pairing real-time, UI race track + joystick kontrol mobil, sistem 2-player sync. Scope besar terpisah, belum mulai dikerjain.

## Parent Portal (`/parents`)

Pola disamain **persis** sama BrainBox `parents/index.html`/`script.js` (baca dulu itu kalau mau ubah sesuatu di sini). Poin kunci yang WAJIB dipertahankan kalau diubah:

- **Auth pakai PIN ANAK**, bukan PIN guru/dashboard terpisah — `signInAsChild()` di `authService.js` cuma alias ke `signIn()` yang sama dipakai anak login sendiri. Ini keputusan privacy yang sengaja: orang tua cuma bisa lihat data anaknya sendiri (butuh tau PIN anaknya), bukan semua murid. **Jangan pernah bikin 1 PIN admin buat semua data** — itu privacy bug persis yang dihindarin BrainBox.
- **Route `/parents` TIDAK di-wrap `RequireAuth`** — beda sesi dari login player utama, biar orang tua gak harus login sebagai anak dulu di app utama.
- **Yang jalan (real data)**: kirim pesan 1-arah (`players/{id}.parentMessage: {text, sentAt, read}`, nimpa pesan lama, bukan thread — sama kayak BrainBox), muncul sebagai popup `OverlayCard` di Landing anak pas dibuka lagi, ditandain `read:true` begitu di-dismiss.
- **Yang BELUM jalan** (placeholder "🚧 Segera hadir" di `ParentPortal.jsx`, BUKAN data palsu):
  - **"Fokus Minggu Ini"** (Assign) — BrainBox nya nyimpen ke `assignedTopics`, dibaca sama Focus Round MathVille (mode latihan campur-topik lintas subject). Jagoan Kelas gak punya mode Focus Round — kalau mau ngerjain ini, itu prasyaratnya.
  - **"Perlu Latihan Lagi"** (Needs Practice / weak topics) — BrainBox ngitung dari `topicStats/{topic}/{correct,wrong}` (formula: `≥3 percobaan && akurasi<70%`, constants `MIN_ATTEMPTS`/`WEAK_ACCURACY` di `parents/script.js`). Progress tracking (lihat TODO #1) harus dibangun dulu sebelum ini bisa jalan beneran.
  - **"Progress by Game/Subject"** — BrainBox breakdown XP per game. Kita cuma punya `player.xp` flat (bukan per-subject) — ditampilin apa adanya (total doang), breakdown per-subject nunggu progress tracking juga.
- Entry point: link kecil "Untuk orang tua →" di footer Landing (`Landing.jsx`), sengaja gak menonjol — sama alasan BrainBox: biar anak gak notice/ke-klik gak sengaja.

## Data loading di app

`src/data/contentLoader.js` — lazy-load per kelas pakai `import.meta.glob` (Vite code-split otomatis, gak bundle 42 kombinasi sekaligus). `hasContent(subjectId)` cuma `true` buat `matematika`/`ipas`/`ppkn` — subjek lain nampilin fallback "Materi lagi disiapin" di `SubjectDetail.jsx`, bukan error/crash.

Status topik (locked/current/done) masih **hardcoded default** (bab pertama = current, sisanya locked, gak ada yang done) — belum nyambung ke progress asli per player, karena skema progress belum dibangun (lihat bagian Auth di atas).

## Gaya kerja user (sama kayak BrainBox punya, disalin langsung)
- Komunikasi campur Indonesia-Inggris.
- **Diskusi dulu sebelum eksekusi** kalau ada keputusan arsitektur/scope — baru "gas"/"lanjut" abis sepakat. Tapi task yang udah dikasih instruksi detail (misal restrukturisasi soal dengan spec lengkap) boleh langsung dikerjain tanpa nanya ulang tiap step.
- **Ikutin spec/wireframe persis**, jangan improvisasi kalau ada yang ambigu — tanya, jangan nebak (kejadian: subject IPA/IPS vs IPAS, ditanya dulu baru dieksekusi).
- Testing di real device krusial buat bug yang gak muncul di desktop — belum pernah dites di device asli sama sekali buat project ini (masih full browser-pane testing).
- **Aksi yang butuh login interaktif (GitHub OAuth, Firebase Console) gak bisa diwakilin** — kasih instruksi jelas step-by-step, user yang jalanin sendiri, baru lanjut.

## Sedang dikerjain sekarang: Progress Tracking + Focus Round

Fokus kerjaan berikutnya (per keputusan 2026-08-04) — bangun fondasi progress tracking (TODO #1) buat ngidupin 2 section Parent Portal yang masih placeholder:
- **"Perlu Latihan Lagi"** butuh `topicStats` (correct/wrong per topik) beneran dicatat dari quiz yang dijawab anak.
- **"Fokus Minggu Ini"** butuh mode latihan campur-topik (equivalent Focus Round BrainBox) + Assign picker di Parent Portal yang nulis ke `assignedTopics`.

Rencana implementasi:
1. Quiz engine reusable (`src/games/quiz/`) yang bisa jalanin soal dari `bab.soal` (matematika/ipas/ppkn) — baik buat practice per-topik normal maupun Focus Round.
2. Schema `players/{id}.progress.{subject}.{grade}.{babKey} = {status, stars, xp, correct, wrong, lastAt}` — satu sumber data buat locked/current/done DAN buat weak-topic calc, ngikutin pola BrainBox (chapter progress + topicStats reuse jalur yang sama).
3. `SubjectDetail.jsx` disambungin ke progress asli (bukan hardcoded lagi), topik current/done bisa diklik → quiz beneran.
4. Focus Round: picker topik (max 8, lintas subject+kelas) + entry point + quiz gabungan, tulis ke `progress` yang sama tapi gak ngubah status locked/unlocked (sama kayak BrainBox: Focus Round nyumbang ke topicStats, gak nyentuh chapter-progress linear).
5. Parent Portal "Fokus Minggu Ini" & "Perlu Latihan Lagi" disambungin ke data asli.

## Yang masih perlu ditindaklanjuti
1. **Progress tracking belum ada** — XP statis 0, status topik hardcoded, gak ada tulis-balik ke Firestore pas anak nyelesein topik. Ini gap paling besar buat bikin app-nya "berfungsi" beneran.
2. **Konten IPS/PAI/B.Indo/B.Inggris belum ada sama sekali** — 4 dari 6 mata pelajaran masih fallback "coming soon". PAI butuh review ustadz sebelum ada apapun yang di-generate.
3. **80 soal IPAS (`belum_terpetakan`) + 341 soal Matematika (`belum_terpetakan`)** nunggu review manual user, termasuk keputusan soal kelas 6 Matematika yang cuma 4 bab resmi (perlu dikonfirmasi apa itu bener struktur buku yang dipakai).
4. **1 akun test nyangkut di Firestore production** (`players/azka-test`, PIN 1234, dari sesi testing auth) — aman dihapus manual kapan aja.
5. **Hero illustration di Landing masih placeholder emoji** (🎒✨) — README wireframe nyebut ini "open image slot", butuh aset ilustrasi asli anak-anak belajar.
6. **Drive Mode & Plane Mode masih v1/core-engine** — lihat daftar "BELUM ada" di bagian Games di atas (nitro, water gun, power-up, boss, dst). **DinoRace beneran (2-player racing) belum di-porting** — cuma unlock mechanism-nya yang jadi; butuh Firebase RTDB + race track UI, scope besar terpisah.
7. **Firebase Authentication belum diaktifin di console** (cuma Firestore) — belum masalah karena auth sistem sendiri (name+PIN) gak pakai Firebase Auth SDK, tapi kalau nanti butuh Google Sign-In/dst buat orang tua, perlu diaktifin.
8. **Belum ada dual-deploy pattern** kayak BrainBox (standalone domain per produk) — wajar karena masih 1 domain (`jagoan-kelas.vercel.app`), belum relevan sampai ada kebutuhan domain kustom.
9. **Parent Portal (`/parents`) baru "Kirim Pesan" doang yang jalan** — "Fokus Minggu Ini" & "Perlu Latihan Lagi" masih placeholder, nunggu progress tracking (poin 1) dan/atau fitur Focus Round-equivalent dibangun dulu (lihat bagian Parent Portal buat detail).
