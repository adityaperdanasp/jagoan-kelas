import { ref, set, get, onValue, push, onChildAdded, remove, off } from "firebase/database";
import { rtdb } from "../../firebase";

/* ============================================================
   Plane Mode 2 pemain -- lapisan transport (2026-08-10)
   Di-port dari al-idrisi-games mathville/script.js (cari "p2p"), yang
   UDAH TERBUKTI jalan di 2 HP fisik beda jaringan (konfirmasi user).

   KENAPA WebRTC, BUKAN Firebase buat data game
   Firebase RTDB itu database yang disinkron, bukan transport game --
   tiap update muter lewat server, sekitar 150-400ms. Cukup buat kuis
   multiplayer Math Race (gak ada yang perlu dodge dalam sepersekian
   detik), TAPI kelamaan buat bullet-hell: posisi yang telat = posisi
   yang SALAH. Jadi Firebase dipake SEKALI doang buat tuker detail
   koneksi (offer/answer/ICE), abis itu 2 HP ngobrol LANGSUNG lewat
   DataChannel (~20-100ms di WiFi rumahan).

   Signaling ditaro di `mathrace_games/{code}/planeSignal` -- SENGAJA
   numpang root yang RULES-nya udah kebukti ke-allow, bukan bikin root
   `plane_games/` baru (al-idrisi kena persis masalah ini: root baru
   ditolak 401 karena rules-nya per-path eksplisit tanpa wildcard).

   SIAPA NGE-SIMULASIIN APA
   Yang bikin room = HOST, dia satu-satunya yang nyimulasiin dunia
   bersama (spawn musuh, gerak, peluru musuh, boss, power-up, kapan soal
   muncul), disiarin ~20x/detik. GUEST gak nyimulasiin apa-apa -- dia
   render apa yang diterima ke array yang SAMA PERSIS dipake mode solo,
   jadi semua kode collision jalan tanpa diubah buat dua-duanya.

   KENAPA TIAP PEMAIN NGADILI KENA-NYA SENDIRI
   Desain "host yang mutusin siapa kena" itu kerasa jelek di jaringan:
   host ngadili kapal kamu pakai posisi yang udah basi beberapa ratus
   ms, jadi kamu udah dodge di layar sendiri tapi tetep kena. Di sini
   tiap pemain ngecek kapal-vs-peluru LOKAL, lawan persis apa yang
   kegambar di layarnya sendiri. Kalau di layarmu kamu dodge, ya kamu
   dodge. Nyawa & skor emang per-pemain, jadi gak ada yang perlu
   disepakatin dua sisi.

   MATI
   Nyawa habis ngakhirin PENERBANGANMU, bukan ronde-nya: kamu dapet
   banner "Game Over" tapi tetep nonton layar partner. Ronde baru
   beneran selesai kalau dua-duanya udah jatuh.
   ============================================================ */

export const P2P_SEND_INTERVAL_MS = 50; // 20 update dunia/detik
export const P2P_KILL_GRACE_MS = 700; // abaikan id musuh selama ini abis dibunuh, biar snapshot yang lagi "di jalan" gak ngidupin dia lagi
export const P2P_LINK_TIMEOUT_MS = 3000; // gak ada paket selama ini = kasih peringatan koneksi
const P2P_CONNECT_TIMEOUT_MS = 12000; // gak kebuka channel selama ini abis join = nyerah + pesan error, bukan nyangkut selamanya

const P2P_ICE = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    // STUN doang cuma jalan kalau NAT dua HP kooperatif -- biasanya
    // aman kalau satu WiFi, TAPI gagal total kalau beda jaringan (1
    // WiFi + 1 data seluler), padahal itu justru skenario paling
    // mungkin buat "orang tua + anak, 2 HP". TURN relay gratis
    // (OpenRelay) ini fallback-nya. Ini persis bug yang al-idrisi
    // temuin pas tes di 2 HP fisik.
    { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
  ],
};

function signalPath(code) {
  return `mathrace_games/${code}/planeSignal`;
}

export function makeRoomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Controller transport. Framework-agnostic -- PlaneMode.jsx cuma naro
 * callback, gak ada React di sini sama sekali.
 *
 * cb: { onOpen(role), onMessage(msg), onFail(reason), onBanner(text, isWarn) }
 */
export class PlaneP2P {
  constructor(cb) {
    this.cb = cb || {};
    this.role = null;
    this.code = null;
    this.pc = null;
    this.channel = null;
    this.started = false;
    this.closed = false;
    this.connectTimer = null;
    this.lastSendAt = 0;
    this.lastRecvAt = 0;
    this.iceUnsub = [];
    this.answerUnsub = null;
    // Klaim dari guest yang belum sempet dikirim (dikirim tiap tick)
    this.pendingKills = [];
    this.pendingPickups = [];
    this.pendingBossHits = 0;
    // id musuh yang baru aja dibunuh lokal -> jangan diidupin lagi sama snapshot
    this.recentKills = new Map();
    this.peer = { score: 0, lives: 3, down: false, wingmen: false };
  }

  active() {
    return !!(this.channel && this.channel.readyState === "open" && !this.closed);
  }

  _armConnectTimeout() {
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.connectTimer = setTimeout(() => {
      if (this.started || this.closed) return;
      this._fail("Gagal nyambung ke pemain satunya. Coba dua HP di WiFi yang sama, terus ulangi.");
    }, P2P_CONNECT_TIMEOUT_MS);
  }

  _fail(reason) {
    const cb = this.cb;
    this.close();
    cb.onFail?.(reason);
  }

  _attachPeer(pc, mySlot, theirSlot) {
    const code = this.code;
    pc.onicecandidate = (e) => {
      if (e.candidate) push(ref(rtdb, `${signalPath(code)}/${mySlot}`), e.candidate.toJSON());
    };
    const iceRef = ref(rtdb, `${signalPath(code)}/${theirSlot}`);
    const unsub = onChildAdded(iceRef, (snap) => {
      const cand = snap.val();
      if (cand) pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
    });
    this.iceUnsub.push(() => off(iceRef, "child_added", unsub));
    pc.onconnectionstatechange = () => {
      if (this.closed) return;
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        if (!this.started) this._fail("Gagal nyambung ke pemain satunya. Coba dua HP di WiFi yang sama, terus ulangi.");
        else this.cb.onBanner?.("Koneksi putus", true);
      }
    };
  }

  _attachChannel(channel) {
    this.channel = channel;
    channel.onopen = () => {
      if (this.connectTimer) clearTimeout(this.connectTimer);
      this.started = true;
      this.lastRecvAt = performance.now();
      this.cb.onBanner?.("", false);
      this.cb.onOpen?.(this.role);
    };
    channel.onmessage = (e) => {
      this.lastRecvAt = performance.now();
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      this.cb.onMessage?.(msg);
    };
    channel.onclose = () => this.cb.onBanner?.("Partner keluar", true);
  }

  async createRoom() {
    this.role = "host";
    this.code = makeRoomCode();
    const pc = new RTCPeerConnection(P2P_ICE);
    this.pc = pc;
    // Host yang buka channel. ordered+reliable (default) -- payload-nya
    // kecil, dan update dunia yang hilang lebih ganggu daripada nunggu
    // beberapa ms.
    this._attachChannel(pc.createDataChannel("plane", { ordered: true }));
    this._attachPeer(pc, "hostIce", "guestIce");

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await set(ref(rtdb, signalPath(this.code)), {
      kind: "plane2p",
      createdAt: Date.now(),
      offer: { type: offer.type, sdp: offer.sdp },
    });

    const answerRef = ref(rtdb, `${signalPath(this.code)}/answer`);
    this.answerUnsub = onValue(answerRef, async (snap) => {
      const ans = snap.val();
      if (!ans || pc.currentRemoteDescription) return;
      // Baru ARM timer nyerah pas guest beneran jawab -- room bisa nganggur
      // lama nunggu kode dibagiin, itu bukan "gagal connect".
      this._armConnectTimeout();
      await pc.setRemoteDescription(new RTCSessionDescription(ans));
    });
    return this.code;
  }

  async joinRoom(code) {
    const snap = await get(ref(rtdb, signalPath(code)));
    if (!snap.exists()) throw new Error("Room dengan kode itu gak ketemu.");
    const data = snap.val();
    if (!data.offer) throw new Error("Room-nya belum siap.");
    if (data.answer) throw new Error("Room-nya udah penuh.");

    this.role = "guest";
    this.code = code;
    const pc = new RTCPeerConnection(P2P_ICE);
    this.pc = pc;
    pc.ondatachannel = (e) => this._attachChannel(e.channel);
    this._attachPeer(pc, "guestIce", "hostIce");

    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await set(ref(rtdb, `${signalPath(code)}/answer`), { type: answer.type, sdp: answer.sdp });
    this._armConnectTimeout();
  }

  send(msg) {
    if (!this.active()) return;
    try {
      this.channel.send(JSON.stringify(msg));
    } catch {
      /* channel lagi nutup -- diemin, tick berikutnya bakal ke-skip sendiri */
    }
  }

  markKill(id) {
    this.recentKills.set(id, performance.now());
    if (this.role === "guest") this.pendingKills.push(id);
  }
  markPickup(id) {
    if (this.role === "guest") this.pendingPickups.push(id);
  }
  markBossHit(n) {
    if (this.role === "guest") this.pendingBossHits += n;
  }
  wasRecentlyKilled(id, now) {
    const t = this.recentKills.get(id);
    return t !== undefined && now - t < P2P_KILL_GRACE_MS;
  }

  close() {
    this.closed = true;
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.iceUnsub.forEach((fn) => {
      try {
        fn();
      } catch {
        /* ignore */
      }
    });
    this.iceUnsub = [];
    if (this.answerUnsub) {
      try {
        this.answerUnsub();
      } catch {
        /* ignore */
      }
      this.answerUnsub = null;
    }
    if (this.channel) {
      try {
        this.channel.close();
      } catch {
        /* ignore */
      }
    }
    if (this.pc) {
      try {
        this.pc.close();
      } catch {
        /* ignore */
      }
    }
    // Bersihin signaling biar kode room gak nyangkut "penuh" selamanya.
    if (this.role === "host" && this.code) {
      remove(ref(rtdb, signalPath(this.code))).catch(() => {});
    }
    this.channel = null;
    this.pc = null;
  }
}
