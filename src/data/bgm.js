// Background music -- di-port dari pola BrainBox mathville/bgm.js (baca
// komentar aslinya di sana buat detail iOS Safari workarounds, disalin
// APA ADANYA di sini karena itu fix bug asli, bukan preferensi gaya):
// - Volume lewat Web Audio GainNode, BUKAN <audio>.volume -- iOS Safari
//   ngabaikan .volume sepenuhnya (cuma tombol volume fisik yang ngefek).
// - AudioContext bisa nyangkut "suspended" di iOS Safari walau resume()
//   dipanggil dari dalem gesture handler -- listener gesture-nya SENGAJA
//   gak cuma sekali (retry tiap gesture), plus "kick" trick (play 1-frame
//   silent buffer) buat maksa hardware audio clock jalan.
// - switchTrack() ganti <audio>.src di element yang SAMA (MediaElement-
//   SourceNode tetep valid lintas ganti .src), no-op kalau src-nya sama
//   biar gak ada glitch restart pas dipanggil dari komponen yang gak
//   beneran pindah subject/mode.
//
// File audio-nya REUSE dari BrainBox (al-idrisi-games), bukan bikin baru
// -- disalin ke public/audio/bgm/ (lihat mapping TRACK_BY_SUBJECT di
// bawah), diputuskan bareng user biar "musiknya kayak BrainBox, ganti-
// ganti per pelajaran".

import { useEffect } from "react";

const VOLUME = 0.3;
const FADE_MS = 400;
const DEFAULT_SRC = "/audio/bgm/hub.mp3";

export const TRACK_BY_SUBJECT = {
  matematika: "/audio/bgm/matematika.mp3",
  ipas: "/audio/bgm/ipas.mp3",
  ppkn: "/audio/bgm/drive.mp3",
  pai: "/audio/bgm/hub.mp3",
  bindo: "/audio/bgm/bindo.mp3",
  binggris: "/audio/bgm/binggris.mp3",
};
export const TRACK_HUB = DEFAULT_SRC;
// Al-idrisi Drive Mode GAK punya track sendiri -- mathville/bgm.js cuma
// punya 2 track total (DEFAULT_SRC "bgm.mp3" dipake di mana-mana TERMASUK
// Drive Mode, + "plane-bgm.mp3" khusus Plane Mode lewat playPlaneTrack()).
// File "drive.mp3" di sini KEBALIK pas porting 2026-08-05 -- isinya
// byte-identik sama plane-bgm.mp3 (bukan bgm.mp3), jadi Drive Mode malah
// muter musik Plane Mode al-idrisi. Ketauan user 2026-08-07 ("samain
// dengan drive mode di alidrisi"). Fix: TRACK_DRIVE diarahin ke
// matematika.mp3 (file itu SUDAH byte-identik sama al-idrisi bgm.mp3,
// diverifikasi md5) -- gak bikin file baru, karena emang itu track yang
// bener (sama kayak Drive Mode al-idrisi make DEFAULT_SRC yang sama
// kayak seantero situs). File `drive.mp3` fisiknya DIBIARIN (masih
// dipake `TRACK_BY_SUBJECT.ppkn`, di luar scope perbaikan ini).
export const TRACK_DRIVE = "/audio/bgm/matematika.mp3";
export const TRACK_PLANE = "/audio/bgm/plane.mp3";
// Math Race gak punya BGM sama sekali sebelumnya (2026-08-09, user lapor
// bug) -- dicek dulu via md5 sebelum nyalin file baru: `multipleazka/
// audio/bgm/bgm.mp3` (track BGM al-idrisi punya Math Race sendiri) itu
// byte-identik sama `plane.mp3` yang UDAH ADA di repo ini (`59c758142e...`,
// sama juga kayak `drive.mp3` -- lihat komentar TRACK_DRIVE di atas soal
// history duplikat itu). Jadi cukup REUSE `plane.mp3`, gak perlu nambah
// file audio baru.
export const TRACK_MATHRACE = "/audio/bgm/plane.mp3";

const track = new Audio(DEFAULT_SRC);
track.loop = true;
track.preload = "auto";
track.dataset.src = DEFAULT_SRC;
if (import.meta.env.DEV) window.__jkBgmDebug = track;

let ctx = null;
let gain = null;
let unlocked = false;
let muted = localStorage.getItem("jk_bgm_muted") === "1";

function ensureAudioGraph() {
  if (ctx) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  ctx = new AudioCtx();
  const source = ctx.createMediaElementSource(track);
  gain = ctx.createGain();
  gain.gain.value = 0;
  source.connect(gain).connect(ctx.destination);
}

function fadeIn() {
  if (!gain || !ctx || muted) return;
  const now = ctx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(VOLUME, now + FADE_MS / 1000);
}

function fadeOut() {
  if (!gain || !ctx) return;
  const now = ctx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(0, now + FADE_MS / 1000);
}

function kickAudioContext() {
  if (!ctx) return;
  ctx.resume();
  const buffer = ctx.createBuffer(1, 1, 22050);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);
  src.start(0);
}

function unlockOnce() {
  ensureAudioGraph();
  kickAudioContext();
  if (unlocked) return;
  unlocked = true;
  track.play().then(fadeIn).catch((err) => console.warn("[bgm] playback blocked:", err));
}

/** Panggil sekali di root app -- daftarin listener gesture buat unlock
 * autoplay (browser nolak audio otomatis sebelum ada interaksi user). */
export function initBgmUnlock() {
  ["pointerdown", "touchend", "click", "keydown"].forEach((evt) =>
    document.addEventListener(evt, unlockOnce, { passive: true })
  );
}

/** Ganti track yang lagi diputer, crossfade halus. No-op kalau src sama. */
export function switchTrack(src) {
  if (!src || track.dataset.src === src) return;
  const wasPlaying = unlocked && !track.paused;
  fadeOut();
  setTimeout(() => {
    track.src = src;
    track.dataset.src = src;
    track.load();
    if (wasPlaying) track.play().then(fadeIn).catch((err) => console.warn("[bgm] playback blocked:", err));
  }, FADE_MS);
}

export function setBgmMuted(next) {
  muted = next;
  localStorage.setItem("jk_bgm_muted", next ? "1" : "0");
  if (next) fadeOut();
  else fadeIn();
}

export function isBgmMuted() {
  return muted;
}

/** Ganti BGM ke `src` pas komponen ke-mount / src berubah. Dipake screen-
 * screen yang punya track sendiri (per-subject, Drive/Plane mode, hub). */
export function useBgmTrack(src) {
  useEffect(() => {
    switchTrack(src);
  }, [src]);
}
