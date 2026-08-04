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
- Skema progress (`players/{id}.progress.{subject}.{grade}.{babKey}`) **flat nested-map di 1 dokumen**, BUKAN subcollection kayak BrainBox punya `players/{id}/badges/{gameId}/...`/`topicStats/{gameId}/{topicKey}/...` (2 path terpisah). Digabung jadi satu struktur di sini karena scope-nya lebih kecil per topik (status+stars+xp+correct+wrong sekaligus, bukan 2 concern terpisah) — lihat bagian "Progress Tracking + Focus Round" di bawah buat detail lengkap.

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
- **Semua 3 section udah jalan pakai data asli** (per 2026-08-04, lihat bagian "Progress Tracking + Focus Round"):
  - **"Kirim Pesan"** — 1-arah (`players/{id}.parentMessage: {text, sentAt, read}`, nimpa pesan lama, bukan thread), muncul sebagai popup `OverlayCard` di Landing anak pas dibuka lagi, ditandain `read:true` begitu di-dismiss.
  - **"Fokus Minggu Ini"** (Assign) — `TopicPicker` (shared component, sama yang dipake `FocusRoundPicker`) nulis ke `players/{id}.assignedTopics` (array topicId `subject:grade:babKey`, max 8). Anak liat ini pre-checked pas buka `/fokus` sendiri.
  - **"Perlu Latihan Lagi"** (Needs Practice) — `computeWeakTopics()` di `progressService.js`, formula SAMA PERSIS BrainBox (`≥3 percobaan && akurasi<70%`, constants `MIN_ATTEMPTS`/`WEAK_ACCURACY`), baca dari `progress` map yang sama dipake locked/current/done. Title di-resolve dari `loadAllFocusTopics()` (gak didenormalisasi ke Firestore).
  - **Belum ada** (minor, bukan blocker): breakdown XP per subject di header portal — masih total doang (`player.xp` flat), sama kayak yang dicatat di TODO.
- Entry point: link kecil "Untuk orang tua →" di footer Landing (`Landing.jsx`), sengaja gak menonjol — sama alasan BrainBox: biar anak gak notice/ke-klik gak sengaja.

## Progress Tracking + Quiz Engine + Focus Round (selesai 2026-08-04)

Fondasi ini bikin app-nya "berfungsi" beneran (gak cuma nampilin daftar topik doang) — anak beneran ngerjain soal, progress kesimpen, XP naik, bab kebuka satu-satu.

**Schema** — `players/{id}.progress.{subject}.{grade}.{babKey} = {status, stars, xp, correct, wrong, lastAt}` (`progressService.js`). `status` CUMA pernah ditulis `"done"` — locked/current dihitung ULANG tiap baca (`computeStatuses()`: bab pertama yang belum `done` = `"current"`, sisanya `"locked"`), jadi gak ada 2 sumber kebenaran yang bisa out-of-sync kayak kalau "unlock next" ditulis eksplisit pas save.

- **`games/quiz/QuizRunner.jsx`** — komponen quiz reusable, dipake DUA jalur (practice per-topik normal DAN Focus Round). 1 soal/layar, handle `multiple_choice` (tombol) & `short_answer` (input teks, `normalizeAnswer.js` buat trim+lowercase compare). `onFinish({correct,wrong,total,results})` — `results` = `[{id,correct}]` per soal (pake `useRef`, bukan state, biar gak kena race batching pas dibaca tepat di titik finish), dipake FocusRoundQuiz buat atribusi correct/wrong balik ke topik asal soal.
- **`screens/TopicQuiz.jsx`** (`/kelas/:grade/:subject/topik/:babKey`) — practice normal, sample 8 soal acak dari `bab.soal`, `+10 XP`/jawaban benar, `recordTopicResult()` nulis `status:"done"` (INI yang bikin bab berikutnya kebuka).
- **`screens/FocusRoundPicker.jsx`** (`/fokus`) + **`FocusRoundQuiz.jsx`** (`/fokus/main`) — anak pilih max 8 topik lintas SEMUA subject+kelas (`loadAllFocusTopics()` di `focusTopics.js`, load semua 18 kombinasi subject×grade yang ada konten), pre-checked dari `assignedTopics` (yang di-set orang tua). Quiz-nya campur 3 soal/topik terpilih, `recordFocusRoundAttempt()` nulis correct/wrong+xp per topik TAPI **sengaja gak nyentuh `status`** (Focus Round nyumbang ke akurasi/weak-topic-calc doang, gak ganggu urutan locked/unlocked linear SubjectDetail) — sama filosofi kayak BrainBox misahin chapter-progress dari topicStats.
- **`components/TopicPicker.jsx`** — checklist topik shared, dipake `FocusRoundPicker` DAN `ParentPortal` (Assign section) biar UI-nya konsisten.
- Entry point Focus Round: tombol "🎯 Fokus Latihan" di Landing, di bawah "Ayo Main!".

`SubjectDetail.jsx` sekarang baca progress ASLI (`getSubjectProgress` + `computeStatuses`), bukan hardcoded lagi — topik current/done bisa diklik → `TopicQuiz`, "Lanjut Belajar" langsung lompat ke topik current.

`contentLoader.js` — `loadRawTopics()` (ganti nama dari `loadTopics` lama) sekarang include SOAL PENUH per bab (dibutuhin quiz), bukan cuma metadata. Masih lazy-load per kelas pakai `import.meta.glob`. `hasContent(subjectId)` cuma `true` buat `matematika`/`ipas`/`ppkn`.

**Verified end-to-end** (browser, bukan cuma baca kode): selesain quiz bab-1 Matematika kelas 4 → bab-1 jadi "Selesai", bab-2 kebuka, XP naik — dicek ulang abis reload (baca Firestore fresh, bukan state lokal doang). Focus Round 3-topik → round 9 soal campur → tulis ke 3 topik terpisah → muncul bener di "Perlu Latihan Lagi" Parent Portal. Assign topik dari Parent Portal → muncul pre-checked di picker anak.

**Minor gap yang tersisa** (bukan blocker, tapi nyatet aja): `stars` dihitung dari akurasi single-round doang (≥90%→3, ≥70%→2, ≥40%→1), gak ada logic "coba lagi buat naikin bintang" di UI; XP breakdown per-subject belum ada (masih `player.xp` flat total).

## Gaya kerja user (sama kayak BrainBox punya, disalin langsung)
- Komunikasi campur Indonesia-Inggris.
- **Diskusi dulu sebelum eksekusi** kalau ada keputusan arsitektur/scope — baru "gas"/"lanjut" abis sepakat. Tapi task yang udah dikasih instruksi detail (misal restrukturisasi soal dengan spec lengkap) boleh langsung dikerjain tanpa nanya ulang tiap step.
- **Ikutin spec/wireframe persis**, jangan improvisasi kalau ada yang ambigu — tanya, jangan nebak (kejadian: subject IPA/IPS vs IPAS, ditanya dulu baru dieksekusi).
- Testing di real device krusial buat bug yang gak muncul di desktop — belum pernah dites di device asli sama sekali buat project ini (masih full browser-pane testing).
- **Aksi yang butuh login interaktif (GitHub OAuth, Firebase Console) gak bisa diwakilin** — kasih instruksi jelas step-by-step, user yang jalanin sendiri, baru lanjut.

## Yang masih perlu ditindaklanjuti
1. **Konten IPS/PAI/B.Indo/B.Inggris belum ada sama sekali** — 4 dari 6 mata pelajaran masih fallback "coming soon". PAI butuh review ustadz sebelum ada apapun yang di-generate.
2. **80 soal IPAS (`belum_terpetakan`) + 341 soal Matematika (`belum_terpetakan`)** nunggu review manual user, termasuk keputusan soal kelas 6 Matematika yang cuma 4 bab resmi (perlu dikonfirmasi apa itu bener struktur buku yang dipakai).
3. **1 akun test nyangkut di Firestore production** (`players/azka-test`, PIN 1234, dari sesi testing auth) — aman dihapus manual kapan aja.
4. **Hero illustration di Landing masih placeholder emoji** (🎒✨) — README wireframe nyebut ini "open image slot", butuh aset ilustrasi asli anak-anak belajar.
5. **Drive Mode & Plane Mode masih v1/core-engine** — lihat daftar "BELUM ada" di bagian Games di atas (nitro, water gun, power-up, boss, dst). **DinoRace beneran (2-player racing) belum di-porting** — cuma unlock mechanism-nya yang jadi; butuh Firebase RTDB + race track UI, scope besar terpisah.
6. **Parent Portal XP breakdown masih total doang** (bukan per-subject) — lihat bagian Parent Portal.
7. **Stars/XP di TopicQuiz cuma dihitung dari 1 round** — gak ada mekanisme "ulang buat naikin bintang" di UI (progressService-nya udah `Math.max(stars, prev.stars)` jadi data-nya aman, cuma UI-nya belum kasih tombol "ulangi" yang jelas).
8. **Firebase Authentication belum diaktifin di console** (cuma Firestore) — belum masalah karena auth sistem sendiri (name+PIN) gak pakai Firebase Auth SDK, tapi kalau nanti butuh Google Sign-In/dst buat orang tua, perlu diaktifin.
9. **Belum ada dual-deploy pattern** kayak BrainBox (standalone domain per produk) — wajar karena masih 1 domain (`jagoan-kelas.vercel.app`), belum relevan sampai ada kebutuhan domain kustom.
