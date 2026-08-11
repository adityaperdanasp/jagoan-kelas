import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Shell from "../../components/Shell";
import Button from "../../components/ds/Button";
import Joystick from "../shared/Joystick";
import { useJoystick } from "../shared/useJoystick";
import { generateQuickQuestion } from "../shared/quickQuestion";
import { TRACK_PLANE, useBgmTrack } from "../../data/bgm";
import { PLANE_SKINS, PlaneSkinSvg } from "./planeArt";
import { BOSS_SVGS, BOSS_TYPES, BOSS_PX, BOSS_HIT_MULT } from "./planeBossArt";
import { PlaneP2P, P2P_SEND_INTERVAL_MS, P2P_LINK_TIMEOUT_MS } from "./planeP2P";

// Core engine di-port dari pola BrainBox mathville Plane Mode (shmup
// vertikal: joystick, auto-fire, musuh turun+nembak balik, quiz berkala =
// bomb). Elemen bullet/musuh/power-up dimanipulasi langsung ke DOM (bukan
// React state per frame) -- SAMA PERSIS pola BrainBox, biar gak lag.
//
// Fase lanjutan (2026-08-05) di-port dari BrainBox `mathville/script.js`
// (cari komentar "PLANE MODE" / "Phase 5" / "Phase 6" / "v2" / "v3"),
// nilai-nilai konstanta diadaptasi (BUKAN dicopy 1:1 semua -- BrainBox-nya
// endless murni & butuh berbulan-bulan balancing lintas playtesting, kita
// ambil bentuknya: power-up, boss, respawn gauntlet, endless+ramp, high
// score persisten):
// - Power-up drop dari musuh biasa yang mati, dipungut nabrak badan
//   pesawat. Boss muncul tiap skor nyampe threshold (naik tiap boss
//   kalah), HP beberapa kali kena, jawaban benar juga ngasih damage ke
//   boss (bukan cuma bom musuh biasa).
// - Nyawa habis TIDAK langsung game over -- respawn gauntlet: jawab
//   beberapa soal benar BERTURUT-TURUT buat balik main full nyawa, max
//   sekian kali per sesi.
// - Endless: ngalahin boss GAK ngakhirin game, lanjut makin susah (spawn
//   makin rapat, threshold boss berikutnya makin jauh).
// - High score persisten per kelas (localStorage, bukan Firestore -- ini
//   cuma rekor lokal di device, beda dari XP yang kesimpen ke akun).
//
// Pesawat SVG + picker + 3 power-up baru (2026-08-06) -- di-port dari
// al-idrisi-games mathville (`VEHICLE_SKINS.plane` + `PLANE_POWERUP_TYPES`)
// nyusul feedback user: (1) pesawat 🚀 emoji keliatan "miring" -- rocket
// emoji kebanyakan platform DIGAMBAR diagonal/meluncur, padahal pesawat di
// sini gak pernah di-rotate (beda dari mobil Drive Mode yang muter
// ngikutin arah gerak) -- ganti ke SVG nose-up asli dari `planeArt.jsx`,
// (2) picker 5 pesawat sebelum main (falcon/inferno/viper/solstice/ghost,
// sama persis id+warna kayak al-idrisi), (3) power-up cuma ada rapid+
// shield sebelumnya, al-idrisi punya 5 (+ heal/wingmen/spread) -- lihat
// bagian POWERUP_TYPES di bawah.

const SHIP_SPEED = 0.75;
const BULLET_SPEED = 2.2;
const FIRE_INTERVAL_MS = 280;
const RAPID_FIRE_INTERVAL_MS = 140; // 2x auto-fire rate pas rapid-fire aktif
const ENEMY_SPAWN_MS = 900;
const ENEMY_SPAWN_MS_MIN = 400; // spawn interval gak boleh lebih cepet dari ini walau density ramp tinggi
const ENEMY_SPEED = 0.35;
const ENEMY_BULLET_SPEED = 0.9;
const ENEMY_FIRE_MIN_MS = 1400;
const ENEMY_FIRE_MAX_MS = 2600;
// Peluru di-aim ke posisi kapal, tapi sengaja MELESET acak sekian derajat --
// kalau akurat 100% jadi mustahil dihindarin. Boss lebih akurat (spread lebih
// sempit) dari musuh biasa, biar berasa naik level.
const ENEMY_AIM_SPREAD_DEG = 24;
const BOSS_AIM_SPREAD_DEG = 12;
const HIT_RADIUS_PX = 22;
const MAX_LIVES = 3;
const HIT_INVULN_MS = 1500;
const QUESTION_INTERVAL_MS = 10000;
const QUESTION_INTERVAL_MIN_MS = 7000; // makin cepet seiring endless ramp, tapi ada batas bawah
const SHIP_START = { x: 50, y: 82 };
// 4 tipe musuh biasa, pola gerak BEDA-BEDA (2026-08-10, port konsep dari
// al-idrisi v3) -- sebelumnya semua musuh gerak identik (sinus doang), jadi
// walau emoji-nya 3 macem rasanya tetep monoton. `speed` = pengali
// ENEMY_SPEED, `move` dipake di frame loop buat nentuin gerak horizontalnya.
const ENEMY_TYPES = [
  { emoji: "👾", move: "straight", speed: 1.0 }, // turun lurus, gampang dibaca
  { emoji: "👽", move: "sine", speed: 0.9 },     // ayun kiri-kanan halus (pola lama)
  { emoji: "🛸", move: "homing", speed: 0.8 },   // pelan tapi ngedeketin kapal
  { emoji: "🦇", move: "zigzag", speed: 1.15 },  // cepet + belok patah-patah
];
const ENEMY_HOMING_STEP = 0.12;
const ENEMY_ZIGZAG_STEP = 0.22;

// --- Power-up (Fase 5, 5-way 2026-08-06) ---
const POWERUP_DROP_CHANCE = 0.22; // per musuh biasa yang mati (bukan boss)
const POWERUP_FALL_SPEED = 0.28;
const POWERUP_PICKUP_RADIUS_PX = 26;
const RAPID_DURATION_MS = 8000;
const SHIELD_DURATION_MS = 6000;
const WINGMEN_DURATION_MS = 10000; // 2 pesawat kecil pengawal, auto-fire bareng
const SPREAD_DURATION_MS = 10000; // tembakan nambah 2 peluru miring (bukan gantiin yang lurus)
const SPREAD_ANGLE_DEG = 18;
const POWERUP_TYPES = ["rapid", "shield", "heal", "wingmen", "spread"];
const POWERUP_EMOJI = { rapid: "⚡", shield: "🛡️", heal: "❤️", wingmen: "👯", spread: "🔱" };
const VEHICLE_SKIN_KEY = "jk_plane_vehicle_skin";

function getPlaneSkin() {
  const id = localStorage.getItem(VEHICLE_SKIN_KEY);
  return PLANE_SKINS.find((s) => s.id === id) || PLANE_SKINS[0];
}

// --- Boss (Fase 5-6, boss jadi SVG pesawat 2026-08-10) ---
// Threshold dinaikin dari 15/15/flat ke 40/40/x1.2 ngikutin al-idrisi:
// dulu boss ketemu kekerapan, apalagi enemy density naik 1.2x tiap boss
// kalah bikin skor manjat lebih cepet dari threshold-nya -- jarak antar
// boss malah MENGECIL sepanjang run. Growth 1.2 yang sama bikin jaraknya
// kira-kira tetep/melebar pelan.
const BOSS_SCORE_THRESHOLD_START = 40;
const BOSS_THRESHOLD_STEP = 40;
const BOSS_THRESHOLD_GROWTH = 1.2;
const BOSS_BASE_HP = 21;
const BOSS_BASE_SPEED = 0.25;
const BOSS_BASE_FIRE_MIN_MS = 560;
const BOSS_BASE_FIRE_MAX_MS = 1040;
const BOSS_Y = 16;
const BOSS_FIGURE8_AMP_Y = 5; // simpangan vertikal buat tipe yang move-nya "figure8"
const BOSS_QUESTION_DAMAGE = 3; // jawaban benar pas ada boss = damage, bukan cuma bom musuh biasa
const BOSS_WIN_XP_BONUS = 3; // skor bonus tiap boss kalah

// --- Respawn gauntlet (v2) ---
const MAX_RESPAWNS = 3;
const RESPAWN_CORRECT_NEEDED = 3;

// --- Endless ramp (v2) ---
const ENEMY_DENSITY_BOSS_MULT = 1.2; // compounding tiap boss kalah

function rand(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

// Id entitas buat sinkronisasi 2P -- host ngirim id, guest pake id itu
// buat nyocokin elemen DOM yang udah ada (biar transisi CSS-nya mulus,
// bukan bikin-hapus tiap paket). Di mode solo id-nya cuma nganggur.
function nextId(g) {
  g.idSeq = (g.idSeq || 0) + 1;
  return g.idSeq;
}
function round1(n) {
  return Math.round(n * 10) / 10;
}

function highScoreKey(grade) {
  return `jk_plane_highscore_kelas${grade}`;
}

export default function PlaneMode() {
  const { grade } = useParams();
  const navigate = useNavigate();
  const joystick = useJoystick(42);
  useBgmTrack(TRACK_PLANE);

  const [phase, setPhase] = useState("picker"); // picker | playing | ended
  const [difficulty, setDifficulty] = useState("medium");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [question, setQuestion] = useState(null);
  const [bossHp, setBossHp] = useState(null); // null = gak ada boss lagi
  const [respawning, setRespawning] = useState(false);
  const [respawnProgress, setRespawnProgress] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [activePowerups, setActivePowerups] = useState({ rapid: false, shield: false, wingmen: false, spread: false });
  const [planeSkin, setPlaneSkin] = useState(getPlaneSkin);
  // UX reorder (2026-08-10) -- user: "samain sama UX alidirisi... dari
  // pilih pesawat dulu baru masuk ke pilihan solo/multiplier baru ke page
  // create game atau join game. tiru aja UXnya plek plek". Al-idrisi's
  // Plane Mode entry beneran cuma 2 overlay berurutan: vehicle/skin picker
  // lalu #plane-mode-overlay (Solo/2 Players) -- gak ada tahap difficulty
  // sama sekali di sana (itu cuma ada di Drive Mode/mobil). Karena
  // difficulty picker jagoan-kelas Plane Mode masih fitur yang jalan &
  // gak diminta dihapus, ditaro sebagai step TAMBAHAN tapi cuma di jalur
  // Solo (2P tetap langsung ke room, hardcoded "medium" persis kayak
  // sebelumnya -- lihat startRun("medium") di bawah).
  const [pickerStep, setPickerStep] = useState("vehicle"); // vehicle | mode | difficulty | room

  // --- 2 pemain (2026-08-10) ---
  const [coop, setCoop] = useState(null); // null = solo | "host" | "guest"
  const [lobby, setLobby] = useState(null); // null | "menu" | "hosting" | "joining" | "connecting"
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [coopError, setCoopError] = useState("");
  const [banner, setBanner] = useState("");
  const [peerHud, setPeerHud] = useState(null); // {score, lives, down}
  const [down, setDown] = useState(false); // nyawa habis TAPI ronde belum kelar (nonton partner)
  const p2pRef = useRef(null);
  const peerShipRef = useRef(null);
  const peerBulletEls = useRef([]);
  const peerWingmenEls = useRef([]);

  const worldRef = useRef(null);
  const shipRef = useRef(null);
  const rafRef = useRef(null);
  const gRef = useRef(null); // mutable game state, gak lewat React re-render
  const activePowerupsRef = useRef({ rapid: false, shield: false, wingmen: false, spread: false }); // buat deteksi PERUBAHAN tiap frame -- baca React state `activePowerups` di sini bakal stale (closure frame() dibuat sekali, gak keikut re-render)

  function pickPlaneSkin(skin) {
    localStorage.setItem(VEHICLE_SKIN_KEY, skin.id);
    setPlaneSkin(skin);
    setPickerStep("mode");
  }

  useEffect(() => {
    const saved = Number(localStorage.getItem(highScoreKey(grade)) || 0);
    setHighScore(saved);
  }, [grade]);

  const pxDist = useCallback((ax, ay, bx, by) => {
    const rect = worldRef.current?.getBoundingClientRect();
    if (!rect) return Infinity;
    return Math.hypot(((ax - bx) / 100) * rect.width, ((ay - by) / 100) * rect.height);
  }, []);

  // angleDeg diukur dari lurus-ke-atas (0 = lurus, positif = miring
  // kanan) -- dipake power-up spread buat nembak 2 peluru miring
  // TAMBAHAN (bukan gantiin yang lurus), sama kayak pola al-idrisi
  // `spawnPlaneBulletAt`.
  function spawnBulletAt(x, y, angleDeg = 0) {
    const el = document.createElement("div");
    el.textContent = "🔸";
    el.style.cssText = "position:absolute;font-size:16px;transform:translate(-50%,-50%);";
    worldRef.current.appendChild(el);
    const rad = (angleDeg * Math.PI) / 180;
    const vx = Math.sin(rad) * BULLET_SPEED;
    const vy = -Math.cos(rad) * BULLET_SPEED;
    gRef.current.bullets.push({ x, y, vx, vy, el });
  }

  // Tembakan pesawat sendiri -- spread power-up NAMBAH 2 peluru miring
  // (±SPREAD_ANGLE_DEG) di samping yang lurus, jadi 3 total pas aktif.
  function fireShip() {
    const g = gRef.current;
    spawnBulletAt(g.x, g.y - 5, 0);
    if (performance.now() < g.spreadUntil) {
      spawnBulletAt(g.x, g.y - 5, -SPREAD_ANGLE_DEG);
      spawnBulletAt(g.x, g.y - 5, SPREAD_ANGLE_DEG);
    }
  }

  // 2 pesawat kecil pengawal (power-up wingmen) -- dibuat sekali pas buff
  // mulai, dicabut pas buff abis. Mungut wingmen KEDUA kali pas udah aktif
  // cuma nambahin durasi (lihat pemanggil di pickup handler), gak
  // nge-duplicate pesawatnya -- sama pola kayak `ensurePlaneWingmen`.
  function ensureWingmen() {
    const g = gRef.current;
    if (g.wingmen.length) return;
    [-11, 11].forEach((offsetX) => {
      const el = document.createElement("div");
      // Bug 2026-08-09: emoji "🛩️" ORIENTASINYA GAK KONSISTEN antar
      // platform (kayak masalah 🚀 yang udah di-fix buat pesawat utama --
      // lihat planeArt.jsx), jadi wingmen keliatan "kebalik" sementara
      // pesawat utama udah bener nose-up. Fix sama: SVG mini digambar
      // nose-up dari awal (bukan emoji), gak pernah di-rotate -- konsisten
      // sama pesawat utama yang juga gak pernah di-rotate.
      el.innerHTML = '<svg viewBox="0 0 20 24" width="15" height="18"><path d="M10 1 L14 14 L10 11 L6 14 Z" fill="#BFD9F5" stroke="#4A7FC7" stroke-width="1.3" stroke-linejoin="round"/></svg>';
      el.style.cssText = "position:absolute;transform:translate(-50%,-50%);opacity:.92;line-height:0;";
      worldRef.current.appendChild(el);
      g.wingmen.push({ el, offsetX, lastFireAt: performance.now() });
    });
  }
  function removeWingmen() {
    const g = gRef.current;
    g.wingmen.forEach((w) => w.el.remove());
    g.wingmen = [];
  }

  function spawnEnemyBullet(x, y, spreadDeg = ENEMY_AIM_SPREAD_DEG) {
    const g = gRef.current;
    const el = document.createElement("div");
    el.textContent = "🔺";
    el.style.cssText = "position:absolute;font-size:14px;transform:translate(-50%,-50%);";
    worldRef.current.appendChild(el);
    const dx = g.x - x;
    const dy = g.y - (y + 3);
    const angle = Math.atan2(dy, dx) + ((Math.random() * 2 - 1) * spreadDeg * Math.PI) / 180;
    g.enemyBullets.push({ id: nextId(g), x, y: y + 3, vx: Math.cos(angle) * ENEMY_BULLET_SPEED, vy: Math.sin(angle) * ENEMY_BULLET_SPEED, el });
  }

  function spawnEnemy() {
    const g = gRef.current;
    const type = ENEMY_TYPES[rand(0, ENEMY_TYPES.length - 1)];
    const el = document.createElement("div");
    el.textContent = type.emoji;
    el.style.cssText = "position:absolute;font-size:26px;transform:translate(-50%,-50%);";
    worldRef.current.appendChild(el);
    g.enemies.push({
      id: nextId(g),
      emoji: type.emoji,
      x: rand(10, 90),
      y: -6,
      el,
      move: type.move,
      speed: type.speed,
      phase: Math.random() * Math.PI * 2,
      nextFireAt: performance.now() + rand(ENEMY_FIRE_MIN_MS, ENEMY_FIRE_MAX_MS),
    });
  }

  function spawnPowerup(x, y) {
    const g = gRef.current;
    const type = POWERUP_TYPES[rand(0, POWERUP_TYPES.length - 1)];
    const el = document.createElement("div");
    el.textContent = POWERUP_EMOJI[type];
    el.style.cssText = "position:absolute;font-size:22px;transform:translate(-50%,-50%);filter:drop-shadow(0 0 4px rgba(255,255,255,0.8));";
    worldRef.current.appendChild(el);
    g.powerups.push({ id: nextId(g), x, y, type, el });
  }

  function spawnBoss() {
    const g = gRef.current;
    const typeIdx = g.bossesDefeated % BOSS_TYPES.length;
    const type = BOSS_TYPES[typeIdx];
    const hp = Math.round(BOSS_BASE_HP * type.hpMult);
    const el = document.createElement("div");
    el.innerHTML = BOSS_SVGS[type.svg];
    el.style.cssText = `position:absolute;width:${BOSS_PX}px;height:${BOSS_PX}px;transform:translate(-50%,-50%);line-height:0;filter:drop-shadow(0 3px 6px rgba(0,0,0,.45));`;
    worldRef.current.appendChild(el);
    g.boss = {
      x: 50,
      y: BOSS_Y,
      hp,
      hpMax: hp,
      el,
      dir: 1,
      type,
      typeIdx,
      spawnedAt: performance.now(),
      nextFireAt: performance.now() + BOSS_BASE_FIRE_MIN_MS * type.fireMult,
    };
    setBossHp({ hp, max: hp });
  }

  function explosion(x, y, big) {
    const el = document.createElement("div");
    el.textContent = "💥";
    el.style.cssText = `position:absolute;left:${x}%;top:${y}%;font-size:${big ? 44 : 26}px;transform:translate(-50%,-50%);animation:jk-pop .4s ease-out forwards;`;
    worldRef.current.appendChild(el);
    setTimeout(() => el.remove(), 400);
  }

  function clearEnemies() {
    const g = gRef.current;
    g.enemies.forEach((e) => {
      explosion(e.x, e.y);
      e.el.remove();
    });
    g.enemies = [];
    g.enemyBullets.forEach((b) => b.el.remove());
    g.enemyBullets = [];
  }

  function damageBoss(amount) {
    const g = gRef.current;
    if (!g.boss) return;
    g.boss.hp -= amount;
    if (g.boss.hp <= 0) {
      handleBossDefeat();
    } else {
      setBossHp({ hp: g.boss.hp, max: g.boss.hpMax });
    }
  }

  function handleBossDefeat() {
    const g = gRef.current;
    explosion(g.boss.x, g.boss.y, true);
    g.boss.el.remove();
    g.boss = null;
    setBossHp(null);
    g.bossesDefeated += 1;
    // Step-nya ikut tumbuh (bukan flat) -- lihat komentar di konstanta:
    // enemy density juga naik 1.2x tiap boss kalah, kalau step-nya flat
    // jarak antar boss malah mengecil sepanjang run.
    g.bossStep = (g.bossStep || BOSS_THRESHOLD_STEP) * BOSS_THRESHOLD_GROWTH;
    g.bossThreshold += Math.round(g.bossStep);
    g.enemyDensity *= ENEMY_DENSITY_BOSS_MULT;
    bumpScore(BOSS_WIN_XP_BONUS);
  }

  // Skor "beneran" disimpen di gRef.current.score (dibaca tiap frame buat
  // cek boss threshold dkk) -- React state `score` cuma buat DISPLAY, biar
  // gak perlu masukin `score` ke dependency array game loop (yang bakal
  // bikin loop-nya restart & world ke-cleanup tiap kali skor berubah).
  function bumpScore(delta) {
    const g = gRef.current;
    g.score = (g.score || 0) + delta;
    setScore(g.score);
  }

  // ---------- 2P: terapin dunia dari host / status partner ----------

  // "Bikin list lokalku sama kayak punya mereka": update yang udah ada,
  // bikin yang baru, buang yang ilang. Entitas MEMPERTAHANKAN elemen DOM-nya
  // lintas update, biar transisi CSS punya sesuatu buat dianimasiin.
  function syncList(current, incoming, makeEl, assign) {
    const g = gRef.current;
    const p2p = p2pRef.current;
    const now = performance.now();
    const byId = new Map(current.map((it) => [it.id, it]));
    const next = [];
    for (const row of incoming) {
      const [id, x, y, extra] = row;
      // Lewatin yang baru aja kita tembak -- host belum sempet mroses kill
      // kita, nambahin lagi di sini bikin musuhnya "hidup lagi" sekejap.
      if (p2p && p2p.wasRecentlyKilled(id, now)) continue;
      let item = byId.get(id);
      if (!item) {
        const el = makeEl(extra);
        el.style.left = x + "%";
        el.style.top = y + "%";
        worldRef.current.appendChild(el);
        item = { id, x, y, el };
        if (extra !== undefined) item.type = extra;
      } else {
        byId.delete(id);
      }
      item.x = x;
      item.y = y;
      item.el.style.left = x + "%";
      item.el.style.top = y + "%";
      next.push(item);
    }
    for (const stale of byId.values()) stale.el.remove();
    assign(next);
    return g;
  }

  function applyWorld(msg) {
    const g = gRef.current;
    if (!g) return;
    applyPeerStatus(msg.st, msg.s, msg.sb);
    syncList(
      g.enemies,
      msg.e || [],
      (emoji) => {
        const el = document.createElement("div");
        el.textContent = emoji || "👾";
        el.style.cssText = "position:absolute;font-size:26px;transform:translate(-50%,-50%);transition:left .05s linear,top .05s linear;";
        return el;
      },
      (arr) => (g.enemies = arr)
    );
    syncList(
      g.enemyBullets,
      msg.b || [],
      () => {
        const el = document.createElement("div");
        el.textContent = "🔺";
        el.style.cssText = "position:absolute;font-size:14px;transform:translate(-50%,-50%);transition:left .05s linear,top .05s linear;";
        return el;
      },
      (arr) => (g.enemyBullets = arr)
    );
    syncList(
      g.powerups,
      msg.pu || [],
      (type) => {
        const el = document.createElement("div");
        el.textContent = POWERUP_EMOJI[type] || "⚡";
        el.style.cssText = "position:absolute;font-size:22px;transform:translate(-50%,-50%);filter:drop-shadow(0 0 4px rgba(255,255,255,0.8));";
        return el;
      },
      (arr) => (g.powerups = arr)
    );
    syncBoss(msg.bo);
  }

  function syncBoss(bo) {
    const g = gRef.current;
    if (!bo) {
      if (g.boss) {
        g.boss.el.remove();
        g.boss = null;
        setBossHp(null);
      }
      return;
    }
    const [x, y, hp, hpMax, typeIdx] = bo;
    if (!g.boss) {
      const type = BOSS_TYPES[typeIdx] || BOSS_TYPES[0];
      const el = document.createElement("div");
      el.innerHTML = BOSS_SVGS[type.svg];
      el.style.cssText = `position:absolute;width:${BOSS_PX}px;height:${BOSS_PX}px;transform:translate(-50%,-50%);line-height:0;filter:drop-shadow(0 3px 6px rgba(0,0,0,.45));transition:left .05s linear,top .05s linear;`;
      worldRef.current.appendChild(el);
      g.boss = { x, y, hp, hpMax, el, type, typeIdx, dir: 1, spawnedAt: performance.now(), nextFireAt: Infinity };
    }
    g.boss.x = x;
    g.boss.y = y;
    g.boss.hp = hp;
    g.boss.hpMax = hpMax;
    g.boss.el.style.left = x + "%";
    g.boss.el.style.top = y + "%";
    setBossHp({ hp, max: hpMax });
  }

  // Kapal + peluru + HUD partner -- ditangani sama persis di kedua sisi.
  function applyPeerStatus(st, ship, bullets) {
    const p2p = p2pRef.current;
    if (!p2p) return;
    if (ship && peerShipRef.current) {
      peerShipRef.current.style.display = "block";
      peerShipRef.current.style.left = ship[0] + "%";
      peerShipRef.current.style.top = ship[1] + "%";
    }
    if (st) {
      p2p.peer.score = st[0];
      p2p.peer.lives = st[1];
      p2p.peer.down = !!st[2];
      p2p.peer.wingmen = !!st[3];
      if (peerShipRef.current) peerShipRef.current.style.opacity = p2p.peer.down ? "0.25" : "1";
      setPeerHud({ score: st[0], lives: st[1], down: !!st[2] });
    }
    updatePeerWingmen(ship);
    renderPeerBullets(bullets || []);
  }

  // Mirror `ensureWingmen`, tapi buat pesawat pengawal PARTNER -- buff
  // wingmen dulunya state lokal doang, jadi layar pemain satunya gak
  // pernah tau itu ada (salah satu bug yang al-idrisi temuin di 2 HP).
  function updatePeerWingmen(ship) {
    const p2p = p2pRef.current;
    if (!p2p) return;
    const active = !!p2p.peer.wingmen;
    if (active && !peerWingmenEls.current.length) {
      [-11, 11].forEach((offsetX) => {
        const el = document.createElement("div");
        el.innerHTML = '<svg viewBox="0 0 20 24" width="13" height="16"><path d="M10 1 L14 14 L10 11 L6 14 Z" fill="#D8C7F5" stroke="#7A5FC7" stroke-width="1.3" stroke-linejoin="round"/></svg>';
        el.style.cssText = "position:absolute;transform:translate(-50%,-50%);opacity:.85;line-height:0;";
        worldRef.current.appendChild(el);
        peerWingmenEls.current.push({ el, offsetX });
      });
    } else if (!active && peerWingmenEls.current.length) {
      peerWingmenEls.current.forEach((w) => w.el.remove());
      peerWingmenEls.current = [];
    }
    if (ship && peerWingmenEls.current.length) {
      peerWingmenEls.current.forEach((w) => {
        w.el.style.left = Math.max(4, Math.min(96, ship[0] + w.offsetX)) + "%";
        w.el.style.top = ship[1] + 6 + "%";
      });
    }
  }

  function renderPeerBullets(list) {
    const els = peerBulletEls.current;
    while (els.length < list.length) {
      const el = document.createElement("div");
      el.style.cssText = "position:absolute;width:4px;height:12px;border-radius:2px;background:#C9A7F5;transform:translate(-50%,-50%);";
      worldRef.current.appendChild(el);
      els.push(el);
    }
    while (els.length > list.length) els.pop().remove();
    list.forEach((b, i) => {
      els[i].style.left = b[0] + "%";
      els[i].style.top = b[1] + "%";
    });
  }

  // Dipanggil tiap frame, di-throttle ke P2P_SEND_INTERVAL_MS (20x/detik).
  function p2pTick(now) {
    const p2p = p2pRef.current;
    const g = gRef.current;
    if (!p2p || !p2p.active() || !g) return;
    // setBanner dipanggil tiap tick tanpa baca state `banner` -- `frame()`
    // dibikin sekali (dep [phase]) jadi nilai state di closure-nya bakal
    // basi. React sendiri bail-out kalau nilainya sama, jadi aman.
    setBanner(now - p2p.lastRecvAt > P2P_LINK_TIMEOUT_MS ? (p2p.role === "guest" ? "Nunggu host…" : "Nunggu partner…") : "");
    if (now - p2p.lastSendAt < P2P_SEND_INTERVAL_MS) return;
    p2p.lastSendAt = now;

    // Slot ke-4 = flag wingmen, biar layar partner ikut gambar pesawat
    // pengawalnya (dulu state ini lokal doang -> pemain satunya gak liat).
    const st = [g.score | 0, g.livesNow ?? MAX_LIVES, g.down ? 1 : 0, now < g.wingmenUntil ? 1 : 0];
    const ship = [round1(g.x), round1(g.y)];
    const myBullets = g.bullets.map((b) => [round1(b.x), round1(b.y)]);

    if (p2p.role === "host") {
      p2p.send({
        t: "w",
        st,
        s: ship,
        sb: myBullets,
        e: g.enemies.map((e) => [e.id, round1(e.x), round1(e.y), e.emoji]),
        b: g.enemyBullets.map((b) => [b.id, round1(b.x), round1(b.y)]),
        // Kirim TIPE power-up, bukan emoji -- guest butuh tipenya buat
        // nerapin buff yang bener pas mungut, emoji bisa dia cari sendiri.
        pu: g.powerups.map((p) => [p.id, round1(p.x), round1(p.y), p.type]),
        bo: g.boss ? [round1(g.boss.x), round1(g.boss.y), g.boss.hp, g.boss.hpMax, g.boss.typeIdx] : null,
      });
    } else {
      p2p.send({
        t: "g",
        st,
        s: ship,
        sb: myBullets,
        k: p2p.pendingKills.splice(0),
        pk: p2p.pendingPickups.splice(0),
        bh: (() => {
          const n = p2p.pendingBossHits;
          p2p.pendingBossHits = 0;
          return n;
        })(),
      });
    }
  }

  function handleP2PMessage(msg) {
    const g = gRef.current;
    if (!g) return;
    const p2p = p2pRef.current;
    switch (msg.t) {
      case "w":
        if (p2p.role === "guest") applyWorld(msg);
        break;
      case "g":
        applyPeerStatus(msg.st, msg.s, msg.sb);
        if (p2p.role !== "host") break;
        // Klaim guest diterapin ke dunia otoritatif
        (msg.k || []).forEach((id) => {
          const e = g.enemies.find((x) => x.id === id);
          if (e) {
            e.el.remove();
            g.enemies = g.enemies.filter((x) => x !== e);
          }
        });
        (msg.pk || []).forEach((id) => {
          const p = g.powerups.find((x) => x.id === id);
          if (p) {
            p.el.remove();
            g.powerups = g.powerups.filter((x) => x !== p);
          }
        });
        if (msg.bh && g.boss) damageBoss(msg.bh);
        break;
      case "q":
        // Soal SELALU datang dari host biar dua pemain dapet soal yang sama
        if (!g.questionActive) showCoopQuestion(msg.q);
        break;
      case "bomb":
        // Partner jawab bener -- bom itu perubahan dunia, jadi cuma host
        // yang nerapin; guest liat hasilnya di snapshot berikutnya.
        if (p2p.role === "host") {
          clearEnemies();
          if (g.boss) damageBoss(BOSS_QUESTION_DAMAGE);
        }
        break;
      case "over":
        p2p.peer.down = true;
        setPeerHud((h) => ({ ...(h || { score: 0, lives: 0 }), down: true }));
        // Dua-duanya jatuh -> ronde beneran selesai
        if (g.down) endRun();
        break;
      default:
        break;
    }
  }

  function showCoopQuestion(q) {
    const g = gRef.current;
    g.questionActive = true;
    // DI 2P GAK BOLEH pause -- itu bakal ngebekuin dunia bersama punya host
    // (atau macetin guest). Gantinya kasih invuln window panjang, jadi anak
    // gak kena tembak selagi ngerjain soal.
    g.invulnUntil = performance.now() + 6000;
    setQuestion(q);
  }

  const askQuestion = useCallback(() => {
    const g = gRef.current;
    // Guard `questionActive` (bug al-idrisi di 2P): tanpa pause, frame loop
    // ngecek "udah waktunya soal?" TIAP FRAME, jadi begitu lewat jadwal
    // fungsi ini kepanggil ~60x/detik selama kartu belum dijawab --
    // soal ke-regenerate acak terus & DOM di-rebuild tiap frame (kartunya
    // keliatan geter dan gak bisa dipencet).
    if (g.questionActive) return;
    const q = generateQuickQuestion(Number(grade), difficulty);
    const p2p = p2pRef.current;
    if (p2p && p2p.active()) {
      if (p2p.role !== "host") return; // cuma host yang nentuin kapan soal muncul
      p2p.send({ t: "q", q });
      showCoopQuestion(q);
      return;
    }
    g.questionActive = true;
    g.paused = true;
    setQuestion(q);
  }, [grade, difficulty]);

  function answerQuestion(opt) {
    if (!question) return;
    const correct = opt === question.correctLabel;
    const p2p = p2pRef.current;
    const isCoop = !!(p2p && p2p.active());
    setQuestion((q) => ({ ...q, answered: opt }));
    if (correct) {
      bumpScore(2);
      if (isCoop && p2p.role === "guest") {
        // Guest gak nyimulasiin dunia -- minta host yang ngebom & mukul boss
        p2p.send({ t: "bomb" });
      } else {
        clearEnemies();
        if (gRef.current.boss) damageBoss(BOSS_QUESTION_DAMAGE);
      }
    }
    setTimeout(() => {
      setQuestion(null);
      if (gRef.current) {
        gRef.current.questionActive = false;
        if (!isCoop) gRef.current.paused = false;
        gRef.current.lastQuestionAt = performance.now();
      }
    }, 800);
  }

  // respawnProgressRef nyimpen progress ASLI (dibaca/ditulis sinkron) --
  // setRespawnProgress React state cuma buat DISPLAY. StrictMode dev
  // nge-double-invoke updater function functional-form (`setX(p => ...)`),
  // jadi side effect (setLives/setRespawning/dst) DILARANG ditaro di situ,
  // makanya percabangan berhasil/gagal-nya dihitung dari ref, bukan dari
  // parameter updater.
  const respawnProgressRef = useRef(0);

  function startRespawnGauntlet() {
    const g = gRef.current;
    const isCoop = !!(p2pRef.current && p2pRef.current.active());
    respawnProgressRef.current = 0;
    setRespawning(true);
    setRespawnProgress(0);
    g.questionActive = true;
    // Di 2P gak boleh pause (bakal bekuin dunia bersama) -- pake invuln
    // window panjang, trik yang sama kayak soal biasa. Ini yang bikin
    // respawn gauntlet akhirnya bisa ada juga di mode 2 pemain.
    if (isCoop) g.invulnUntil = performance.now() + 20000;
    else g.paused = true;
    setQuestion(generateQuickQuestion(Number(grade), difficulty));
  }

  function answerRespawnQuestion(opt) {
    if (!question) return;
    const correct = opt === question.correctLabel;
    setQuestion((q) => ({ ...q, answered: opt }));
    setTimeout(() => {
      if (correct) {
        respawnProgressRef.current += 1;
        setRespawnProgress(respawnProgressRef.current);
        if (respawnProgressRef.current >= RESPAWN_CORRECT_NEEDED) {
          // berhasil -- balik main full nyawa
          setRespawning(false);
          setQuestion(null);
          setLives(MAX_LIVES);
          const g = gRef.current;
          g.respawnsUsed += 1;
          g.questionActive = false;
          g.invulnUntil = performance.now() + HIT_INVULN_MS;
          g.paused = false;
        } else {
          setQuestion(generateQuickQuestion(Number(grade), difficulty));
        }
      } else {
        // salah cuma reroll soal, progress gak turun (sama kayak BrainBox)
        setQuestion(generateQuickQuestion(Number(grade), difficulty));
      }
    }, 700);
  }

  function cleanupWorld() {
    const g = gRef.current;
    if (!g) return;
    g.bullets.forEach((b) => b.el.remove());
    g.enemyBullets.forEach((b) => b.el.remove());
    g.enemies.forEach((e) => e.el.remove());
    g.powerups.forEach((p) => p.el.remove());
    (g.wingmen || []).forEach((w) => w.el.remove());
    if (g.boss) g.boss.el.remove();
  }

  function endRun() {
    const g = gRef.current;
    g.paused = true;
    g.ended = true;
    setPhase("ended");
    if (g.score > highScore) {
      setHighScore(g.score);
      localStorage.setItem(highScoreKey(grade), String(g.score));
    }
  }

  // ---------- 2P: lobby ----------

  // Callback P2P dibikin SEKALI pas connect, jadi kalau `handleP2PMessage`
  // di-pass langsung dia bakal ngunci versi render saat itu. Semua state
  // penting emang lewat ref, TAPI dilewatin via ref ini biar gak ada jebakan
  // stale-closure yang susah dilacak di jalur networking.
  const msgHandlerRef = useRef(null);
  msgHandlerRef.current = handleP2PMessage;

  function makeP2P() {
    return new PlaneP2P({
      onOpen: () => {
        setLobby(null);
        setCoopError("");
        setCoop(p2pRef.current.role);
        // Dua-duanya mulai ronde sendiri; simulasi host yang jadi acuan
        // dunia bersama dari sini.
        startRun("medium");
      },
      onMessage: (msg) => msgHandlerRef.current?.(msg),
      onFail: (reason) => {
        p2pRef.current = null;
        setLobby(null);
        setCoop(null);
        setCoopError(reason);
      },
      onBanner: (text) => setBanner(text),
    });
  }

  async function hostRoom() {
    setCoopError("");
    try {
      p2pRef.current = makeP2P();
      const code = await p2pRef.current.createRoom();
      setRoomCode(code);
      setLobby("hosting");
    } catch {
      p2pRef.current = null;
      setLobby(null);
      setCoopError("Gagal bikin room. Cek koneksi internet, ya.");
    }
  }

  async function joinRoom(code) {
    setCoopError("");
    setLobby("connecting");
    try {
      p2pRef.current = makeP2P();
      await p2pRef.current.joinRoom(code);
    } catch (e) {
      p2pRef.current?.close();
      p2pRef.current = null;
      setLobby(null);
      setCoopError(e.message || "Gagal gabung room.");
    }
  }

  // Tutup koneksi pas keluar dari layar Plane Mode
  useEffect(() => {
    return () => {
      p2pRef.current?.close();
      p2pRef.current = null;
    };
  }, []);

  function startRun(diff) {
    cleanupWorld();
    setDifficulty(diff);
    gRef.current = {
      x: SHIP_START.x,
      y: SHIP_START.y,
      score: 0,
      bullets: [],
      enemyBullets: [],
      enemies: [],
      powerups: [],
      boss: null,
      bossThreshold: BOSS_SCORE_THRESHOLD_START,
      bossStep: BOSS_THRESHOLD_STEP,
      bossesDefeated: 0,
      enemyDensity: 1,
      respawnsUsed: 0,
      rapidUntil: 0,
      shieldUntil: 0,
      wingmenUntil: 0,
      spreadUntil: 0,
      wingmen: [],
      lastFireAt: 0,
      lastSpawnAt: performance.now(),
      lastQuestionAt: performance.now(),
      invulnUntil: 0,
      paused: false,
      ended: false,
      questionActive: false,
      idSeq: 0,
      livesNow: MAX_LIVES, // mirror `lives` yang kebaca sinkron di p2pTick
      down: false,
    };
    setScore(0);
    setLives(MAX_LIVES);
    setDown(false);
    setQuestion(null);
    setBossHp(null);
    setRespawning(false);
    activePowerupsRef.current = { rapid: false, shield: false, wingmen: false, spread: false };
    setActivePowerups(activePowerupsRef.current);
    setPhase("playing");
  }

  useEffect(() => {
    if (phase !== "playing") return;
    function frame() {
      const g = gRef.current;
      if (!g || g.ended) return;
      // `now` WAJIB di luar `if (!g.paused)` -- `p2pTick(now)` di bawah
      // (di luar blok itu) kepanggil TIAP frame gak peduli pause,
      // sebelumnya `const now` ke-declare di dalem blok jadi out-of-scope
      // pas dipanggil, `ReferenceError: now is not defined` bahkan di
      // mode solo (`p2pTick` sendiri no-op kalau `p2pRef.current` null,
      // tapi baris pemanggilnya tetep jalan apapun mode-nya).
      const now = performance.now();
      if (!g.paused) {
        const rapidActive = now < g.rapidUntil;
        const shieldActive = now < g.shieldUntil;
        const wingmenActive = now < g.wingmenUntil;
        const spreadActive = now < g.spreadUntil;
        const prevActive = activePowerupsRef.current;
        if (rapidActive !== prevActive.rapid || shieldActive !== prevActive.shield || wingmenActive !== prevActive.wingmen || spreadActive !== prevActive.spread) {
          activePowerupsRef.current = { rapid: rapidActive, shield: shieldActive, wingmen: wingmenActive, spread: spreadActive };
          setActivePowerups(activePowerupsRef.current);
        }

        // Kalau udah jatuh (mode 2P), kapal sendiri ilang & berhenti nembak --
        // tinggal nonton layar partner sampai dia juga jatuh.
        if (!g.down) {
          const vec = joystick.vecRef.current;
          g.x = Math.max(6, Math.min(94, g.x + vec.x * SHIP_SPEED));
          g.y = Math.max(10, Math.min(94, g.y + vec.y * SHIP_SPEED));
          if (shipRef.current) {
            shipRef.current.style.left = g.x + "%";
            shipRef.current.style.top = g.y + "%";
          }

          const fireInterval = rapidActive ? RAPID_FIRE_INTERVAL_MS : FIRE_INTERVAL_MS;
          if (now - g.lastFireAt > fireInterval) {
            g.lastFireAt = now;
            fireShip();
          }
        } else if (shipRef.current) {
          shipRef.current.style.display = "none";
        }

        // Wingmen -- 2 pesawat kecil ngikutin posisi ship (offset kiri-
        // kanan), nembak di interval NORMAL (gak kepengaruh rapid-fire,
        // sama kayak al-idrisi biar simpel).
        if (wingmenActive) {
          g.wingmen.forEach((w) => {
            const wx = Math.max(4, Math.min(96, g.x + w.offsetX));
            const wy = g.y + 6;
            w.el.style.left = wx + "%";
            w.el.style.top = wy + "%";
            if (now - w.lastFireAt > FIRE_INTERVAL_MS) {
              w.lastFireAt = now;
              spawnBulletAt(wx, wy - 4, 0);
            }
          });
        } else if (g.wingmen.length) {
          removeWingmen();
        }
        // Guest GAK nyimulasiin dunia bersama sama sekali -- dia cuma
        // ngerender snapshot host (lihat applyWorld). Semua yang di blok
        // ini nge-spawn/nggerakin entitas milik dunia, jadi khusus host.
        const isGuest = p2pRef.current && p2pRef.current.active() && p2pRef.current.role === "guest";

        if (!isGuest) {
          // musuh biasa berhenti spawn total pas boss lagi aktif
          const spawnMs = Math.max(ENEMY_SPAWN_MS_MIN, ENEMY_SPAWN_MS / g.enemyDensity);
          if (!g.boss && now - g.lastSpawnAt > spawnMs) {
            g.lastSpawnAt = now;
            spawnEnemy();
          }
          const questionInterval = Math.max(QUESTION_INTERVAL_MIN_MS, QUESTION_INTERVAL_MS - g.bossesDefeated * 500);
          if (now - g.lastQuestionAt > questionInterval) {
            askQuestion();
          }
          // boss muncul begitu skor nyampe threshold & belum ada boss aktif
          if (!g.boss && g.score >= g.bossThreshold) {
            spawnBoss();
          }

          for (const e of g.enemies) {
            if (now > e.nextFireAt) {
              spawnEnemyBullet(e.x, e.y + 3);
              e.nextFireAt = now + rand(ENEMY_FIRE_MIN_MS, ENEMY_FIRE_MAX_MS);
            }
          }
          if (g.boss && now > g.boss.nextFireAt) {
            spawnEnemyBullet(g.boss.x, g.boss.y + 8, BOSS_AIM_SPREAD_DEG);
            g.boss.nextFireAt =
              now + rand(BOSS_BASE_FIRE_MIN_MS, BOSS_BASE_FIRE_MAX_MS) * g.boss.type.fireMult;
          }
        }

        g.bullets = g.bullets.filter((b) => {
          b.x += b.vx || 0;
          b.y += b.vy ?? -BULLET_SPEED;
          if (b.y < -5 || b.x < -6 || b.x > 106) {
            b.el.remove();
            return false;
          }
          b.el.style.left = b.x + "%";
          b.el.style.top = b.y + "%";
          return true;
        });
        // Entitas dunia digerakin CUMA sama host -- di guest posisinya udah
        // ditentuin snapshot yang masuk, nggerakin lagi di sini bakal bikin
        // dobel-gerak lalu ke-snap balik tiap paket (keliatan patah-patah).
        if (!isGuest) {
        g.enemyBullets = g.enemyBullets.filter((b) => {
          b.x += b.vx;
          b.y += b.vy;
          if (b.y > 106 || b.y < -6 || b.x < -6 || b.x > 106) {
            b.el.remove();
            return false;
          }
          b.el.style.left = b.x + "%";
          b.el.style.top = b.y + "%";
          return true;
        });
        g.enemies = g.enemies.filter((e) => {
          e.y += ENEMY_SPEED * (e.speed || 1);
          // Gerak horizontal beda per tipe (lihat ENEMY_TYPES) -- "straight"
          // sengaja gak geser sama sekali.
          if (e.move === "sine") e.x += Math.sin(now / 300 + e.phase) * 0.3;
          else if (e.move === "homing") e.x += Math.sign(g.x - e.x) * ENEMY_HOMING_STEP;
          else if (e.move === "zigzag") e.x += (Math.sin(now / 140 + e.phase) > 0 ? 1 : -1) * ENEMY_ZIGZAG_STEP;
          e.x = Math.max(4, Math.min(96, e.x));
          if (e.y > 106) {
            e.el.remove();
            return false;
          }
          e.el.style.left = e.x + "%";
          e.el.style.top = e.y + "%";
          return true;
        });
        g.powerups = g.powerups.filter((p) => {
          p.y += POWERUP_FALL_SPEED;
          if (p.y > 106) {
            p.el.remove();
            return false;
          }
          p.el.style.left = p.x + "%";
          p.el.style.top = p.y + "%";
          return true;
        });
        if (g.boss) {
          g.boss.x += g.boss.dir * BOSS_BASE_SPEED * g.boss.type.speedMult;
          if (g.boss.x < 12 || g.boss.x > 88) g.boss.dir *= -1;
          g.boss.x = Math.max(12, Math.min(88, g.boss.x));
          // Tipe "figure8": sumbu X tetep mantul kiri-kanan kayak boss lain,
          // TAPI Y-nya ikut naik-turun -- kombinasi itu yang bikin
          // lintasannya kebaca sebagai angka 8, bukan cuma geser doang.
          g.boss.y =
            g.boss.type.move === "figure8"
              ? BOSS_Y + Math.sin((now - g.boss.spawnedAt) / 420) * BOSS_FIGURE8_AMP_Y
              : BOSS_Y;
          g.boss.el.style.left = g.boss.x + "%";
          g.boss.el.style.top = g.boss.y + "%";
        }
        } // end !isGuest (gerak entitas dunia)

        // Collision SELALU dicek LOKAL di kedua sisi, lawan persis apa yang
        // kegambar di layar sendiri -- lihat komentar panjang di planeP2P.js
        // soal kenapa bukan host yang ngadili.
        // bullet vs enemy biasa (drop power-up chance)
        outer: for (const e of g.enemies.slice()) {
          for (const b of g.bullets.slice()) {
            if (pxDist(e.x, e.y, b.x, b.y) < HIT_RADIUS_PX) {
              explosion(e.x, e.y);
              e.el.remove();
              b.el.remove();
              g.enemies = g.enemies.filter((x) => x !== e);
              g.bullets = g.bullets.filter((x) => x !== b);
              if (p2pRef.current) p2pRef.current.markKill(e.id);
              if (!isGuest && Math.random() < POWERUP_DROP_CHANCE) spawnPowerup(e.x, e.y);
              bumpScore(1);
              break outer;
            }
          }
        }
        // bullet vs boss
        if (g.boss) {
          for (const b of g.bullets.slice()) {
            if (pxDist(g.boss.x, g.boss.y, b.x, b.y) < HIT_RADIUS_PX * BOSS_HIT_MULT) {
              b.el.remove();
              g.bullets = g.bullets.filter((x) => x !== b);
              // Guest gak megang HP boss otoritatif -- dia lapor ke host,
              // host yang ngurangin & nyiarin HP barunya.
              if (isGuest) p2pRef.current.markBossHit(1);
              else damageBoss(1);
              break;
            }
          }
        }
        // power-up pickup -- heal instan (nambah nyawa), 4 lainnya buff
        // ber-durasi (nge-refresh timer kalau dipungut lagi pas udah aktif).
        g.powerups = g.powerups.filter((p) => {
          if (pxDist(p.x, p.y, g.x, g.y) < POWERUP_PICKUP_RADIUS_PX) {
            p.el.remove();
            if (p2pRef.current) p2pRef.current.markPickup(p.id);
            if (p.type === "rapid") g.rapidUntil = now + RAPID_DURATION_MS;
            else if (p.type === "shield") g.shieldUntil = now + SHIELD_DURATION_MS;
            else if (p.type === "heal") setLives((l) => Math.min(MAX_LIVES, l + 1));
            else if (p.type === "wingmen") {
              g.wingmenUntil = now + WINGMEN_DURATION_MS;
              ensureWingmen();
            } else if (p.type === "spread") g.spreadUntil = now + SPREAD_DURATION_MS;
            return false;
          }
          return true;
        });

        // ship hit -- yang udah jatuh (2P) gak bisa kena lagi
        if (now >= g.invulnUntil && !g.down) {
          let hit = false;
          for (const e of g.enemies) {
            if (pxDist(e.x, e.y, g.x, g.y) < HIT_RADIUS_PX) hit = true;
          }
          for (const b of g.enemyBullets) {
            if (pxDist(b.x, b.y, g.x, g.y) < HIT_RADIUS_PX) hit = true;
          }
          if (g.boss && pxDist(g.boss.x, g.boss.y, g.x, g.y) < HIT_RADIUS_PX * BOSS_HIT_MULT) hit = true;
          if (hit) {
            if (now < g.shieldUntil) {
              // shield nyerap 1 hit, gak kurangin nyawa
              g.shieldUntil = 0;
              g.invulnUntil = now + 400;
            } else {
              g.invulnUntil = now + HIT_INVULN_MS;
              if (shipRef.current) {
                shipRef.current.classList.add("jk-bitten");
                setTimeout(() => shipRef.current?.classList.remove("jk-bitten"), HIT_INVULN_MS);
              }
              setLives((l) => {
                const nl = l - 1;
                g.livesNow = nl;
                if (nl <= 0) {
                  if (g.respawnsUsed < MAX_RESPAWNS) {
                    startRespawnGauntlet();
                  } else if (p2pRef.current && p2pRef.current.active()) {
                    // Di 2P nyawa habis GAK ngakhirin ronde -- kamu jadi
                    // penonton, tetep liat layar partner sampe dia juga
                    // jatuh, baru layar akhir muncul buat berdua.
                    g.down = true;
                    setDown(true);
                    p2pRef.current.send({ t: "over" });
                    if (p2pRef.current.peer.down) endRun();
                  } else {
                    endRun();
                  }
                }
                return nl;
              });
            }
          }
        }
      }
      p2pTick(now);
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafRef.current);
      cleanupWorld();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <Shell>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 0" }}>
          <button onClick={() => navigate(`/kelas/${grade}/matematika`)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "1.2rem" }}>
            ←
          </button>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--ink-900)" }}>✈️ Plane Mode — Kelas {grade}</div>
          <div style={{ width: 24 }} />
        </div>

        {phase === "picker" && pickerStep === "vehicle" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 24 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--ink-900)" }}>Pilih Pesawat Kamu</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, width: "100%" }}>
              {PLANE_SKINS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => pickPlaneSkin(s)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    padding: "14px 8px", borderRadius: 16, cursor: "pointer",
                    border: s.id === planeSkin.id ? "3px solid var(--pastel-green)" : "2px solid var(--cream-300)",
                    background: s.id === planeSkin.id ? "var(--pastel-green)" : "var(--cream-50)",
                  }}
                >
                  <PlaneSkinSvg skinId={s.id} size={30} glow={s.glow} />
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", fontWeight: 700 }}>{s.name}</span>
                </button>
              ))}
            </div>
            {highScore > 0 && (
              <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, color: "var(--ink-500)" }}>🏆 Rekor kamu: {highScore}</div>
            )}
          </div>
        )}

        {phase === "picker" && pickerStep === "mode" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <PlaneSkinSvg skinId={planeSkin.id} size={40} glow={planeSkin.glow} />
              <span style={{ fontSize: 32 }}>💥👾</span>
            </div>
            <div style={{ fontFamily: "var(--font-body)", color: "var(--ink-700)", textAlign: "center" }}>
              Tembak musuh, hindarin peluru, jawab soal buat bom semua musuh! Pungut ⚡🛡️❤️👯🔱, lawan boss 🐉, dan main terus tanpa batas.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
              <Button variant="primary" size="lg" onClick={() => setPickerStep("difficulty")}>
                🧑 Solo
              </Button>
              <Button variant="secondary" size="lg" onClick={() => setPickerStep("room")}>
                👥 2 Pemain
              </Button>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setPickerStep("vehicle")}>
              ‹ Ganti Pesawat: {planeSkin.name}
            </Button>
          </div>
        )}

        {phase === "picker" && pickerStep === "difficulty" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 24 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--ink-900)" }}>🎚️ Tingkat Kesulitan</div>
            {highScore > 0 && (
              <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, color: "var(--ink-500)" }}>🏆 Rekor kamu: {highScore}</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
              {["easy", "medium", "hard"].map((d) => (
                <Button key={d} variant={d === "medium" ? "primary" : "secondary"} size="lg" onClick={() => startRun(d)}>
                  {d === "easy" ? "Gampang 🙂" : d === "medium" ? "Sedang 😎" : "Susah 🔥"}
                </Button>
              ))}
            </div>
            <Button variant="secondary" size="sm" onClick={() => setPickerStep("mode")}>
              ‹ Kembali
            </Button>
          </div>
        )}

        {phase === "picker" && pickerStep === "room" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 24 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.05rem", color: "var(--ink-900)", textAlign: "center" }}>
              👥 Main Berdua
            </div>
            <div style={{ width: "100%" }}>
              {!lobby && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
                  <Button variant="primary" size="lg" onClick={hostRoom}>
                    Bikin Game
                  </Button>
                  <div style={{ textAlign: "center", fontFamily: "var(--font-body)", color: "var(--ink-400)", fontSize: "0.8rem" }}>atau</div>
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="MASUKKAN KODE 6 DIGIT"
                    inputMode="numeric"
                    style={{
                      border: "2px solid var(--cream-300)", borderRadius: "var(--radius-lg)", padding: "10px 12px",
                      fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1rem", letterSpacing: 4, textAlign: "center",
                    }}
                  />
                  <Button variant="secondary" size="lg" disabled={joinCode.length !== 6} onClick={() => joinRoom(joinCode)}>
                    Gabung Game
                  </Button>
                </div>
              )}
              {lobby === "hosting" && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", color: "var(--ink-500)" }}>Kasih kode ini ke temanmu:</div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "2rem", letterSpacing: 6, color: "var(--ink-900)", margin: "6px 0" }}>
                    {roomCode}
                  </div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--ink-400)" }}>Nunggu pemain kedua…</div>
                </div>
              )}
              {lobby === "connecting" && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, color: "var(--ink-500)", fontSize: "0.85rem" }}>Nyambungin ke pemain satunya…</div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "2rem", letterSpacing: 6, color: "var(--ink-900)", margin: "6px 0" }}>
                    {joinCode}
                  </div>
                </div>
              )}
              {coopError && (
                <div style={{ marginTop: 8, textAlign: "center", fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--color-error)", fontWeight: 700 }}>
                  {coopError}
                </div>
              )}
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigate(`/kelas/${grade}`)}>
              ‹ Kembali
            </Button>
          </div>
        )}

        {phase === "playing" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 18px" }}>
              <div style={{ fontFamily: "var(--font-body)", fontWeight: 700 }}>⭐ {score}</div>
              <div style={{ display: "flex", gap: 6 }}>
                {activePowerups.rapid && <span title="Rapid-fire aktif">⚡</span>}
                {activePowerups.shield && <span title="Shield aktif">🛡️</span>}
                {activePowerups.wingmen && <span title="Wingmen aktif">👯</span>}
                {activePowerups.spread && <span title="Spread-shot aktif">🔱</span>}
              </div>
              <div>{"❤️".repeat(Math.max(0, lives))}{"🖤".repeat(MAX_LIVES - Math.max(0, lives))}</div>
            </div>
            {coop && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 18px 6px", fontFamily: "var(--font-body)", fontSize: "0.74rem", fontWeight: 700 }}>
                <span style={{ color: "#8E6FD0" }}>
                  👥 Partner: {peerHud ? `⭐ ${peerHud.score} ${peerHud.down ? "💀" : "❤️".repeat(Math.max(0, peerHud.lives))}` : "…"}
                </span>
                {banner && <span style={{ color: "var(--color-error)" }}>{banner}</span>}
              </div>
            )}
            {down && (
              <div style={{ padding: "0 18px 6px", fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "0.78rem", color: "var(--color-error)", textAlign: "center" }}>
                💀 Kamu jatuh — nonton partner dulu ya…
              </div>
            )}
            {bossHp && (
              <div style={{ padding: "0 18px 8px" }}>
                <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-body)", color: "var(--ink-500)", marginBottom: 2 }}>🐉 Boss</div>
                <div style={{ height: 8, background: "var(--cream-300)", borderRadius: 999 }}>
                  <div style={{ height: "100%", width: `${(bossHp.hp / bossHp.max) * 100}%`, background: "var(--color-error)", borderRadius: 999, transition: "width 0.2s" }} />
                </div>
              </div>
            )}
            <div
              ref={worldRef}
              style={{
                position: "relative",
                flex: 1,
                margin: "0 18px 18px",
                borderRadius: 20,
                background: "linear-gradient(180deg,#1b2a4a,#3a4d7a)",
                overflow: "hidden",
              }}
            >
              {/* Kapal partner -- posisinya di-update lewat DOM langsung dari
                  paket status, transisi CSS ngehalusin jeda antar paket
                  (20x/detik, bukan tiap frame). */}
              {coop && (
                <div
                  ref={peerShipRef}
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%,-50%)",
                    lineHeight: 0,
                    display: "none",
                    transition: "left .05s linear, top .05s linear",
                    filter: "hue-rotate(120deg)",
                  }}
                >
                  <PlaneSkinSvg skinId={planeSkin.id} size={24} glow="#B98CF0" />
                </div>
              )}
              <div ref={shipRef} style={{ position: "absolute", left: SHIP_START.x + "%", top: SHIP_START.y + "%", transform: "translate(-50%,-50%)", lineHeight: 0 }}>
                <PlaneSkinSvg skinId={planeSkin.id} size={26} glow={planeSkin.glow} />
              </div>
              {question && !respawning && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(59,42,26,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                  <div style={{ background: "var(--cream-50)", borderRadius: 20, padding: 20, width: "100%", textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1rem", marginBottom: 14 }}>{question.prompt}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {question.options.map((opt) => {
                        const answered = question.answered;
                        const isCorrect = opt === question.correctLabel;
                        let bg = "#fff";
                        if (answered) {
                          if (isCorrect) bg = "var(--pastel-green)";
                          else if (opt === answered) bg = "var(--pastel-pink)";
                        }
                        return (
                          <button
                            key={opt}
                            disabled={!!answered}
                            onClick={() => answerQuestion(opt)}
                            style={{
                              padding: "12px 8px",
                              borderRadius: 12,
                              border: "2px solid var(--cream-300)",
                              background: bg,
                              fontFamily: "var(--font-display)",
                              fontWeight: 700,
                              cursor: answered ? "default" : "pointer",
                            }}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--ink-400)", marginTop: 10 }}>
                      {gRef.current?.boss ? "Jawab bener = bom musuh + damage boss! 💣" : "Jawab bener = bom semua musuh! 💣"}
                    </div>
                  </div>
                </div>
              )}
              {respawning && question && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(59,42,26,.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                  <div style={{ background: "var(--cream-50)", borderRadius: 20, padding: 20, width: "100%", textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", color: "var(--color-error)", marginBottom: 6 }}>
                      💔 Kesempatan Terakhir!
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--ink-500)", marginBottom: 10 }}>
                      Jawab {RESPAWN_CORRECT_NEEDED} soal benar berturut-turut buat balik main! ({respawnProgress}/{RESPAWN_CORRECT_NEEDED})
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1rem", marginBottom: 14 }}>{question.prompt}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {question.options.map((opt) => {
                        const answered = question.answered;
                        const isCorrect = opt === question.correctLabel;
                        let bg = "#fff";
                        if (answered) {
                          if (isCorrect) bg = "var(--pastel-green)";
                          else if (opt === answered) bg = "var(--pastel-pink)";
                        }
                        return (
                          <button
                            key={opt}
                            disabled={!!answered}
                            onClick={() => answerRespawnQuestion(opt)}
                            style={{
                              padding: "12px 8px",
                              borderRadius: 12,
                              border: "2px solid var(--cream-300)",
                              background: bg,
                              fontFamily: "var(--font-display)",
                              fontWeight: 700,
                              cursor: answered ? "default" : "pointer",
                            }}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              <div style={{ position: "absolute", left: 14, bottom: 14 }}>
                <Joystick joystick={joystick} color="var(--pastel-purple)" />
              </div>
            </div>
          </>
        )}

        {phase === "ended" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 56 }}>{score >= highScore && score > 0 ? "🏆" : "💥"}</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.3rem" }}>
              {score >= highScore && score > 0 ? "Rekor baru!" : "Kena musuh terus!"}
            </div>
            <div style={{ fontFamily: "var(--font-body)", color: "var(--ink-500)" }}>
              Skor akhir: {score} · Rekor: {highScore}
            </div>
            <div style={{ display: "flex", gap: 10, width: "100%" }}>
              <Button variant="primary" size="lg" style={{ flex: 1 }} onClick={() => setPhase("picker")}>
                Main Lagi
              </Button>
              <Button variant="secondary" size="lg" style={{ flex: 1 }} onClick={() => navigate(`/kelas/${grade}/matematika`)}>
                Keluar
              </Button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
