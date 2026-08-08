// Toggle "Boy/Girl x 3 palet" buat BindoStorybookTrail.jsx -- port PERSIS
// dari azkacraft (style.css `:root`/`[data-gender][data-palette]` blocks,
// script.js `PALETTE_COLORS`/`THEME_KEY`/`loadTheme`/`saveTheme`). 6
// kombinasi warna total, dipilih lewat toggle di layar depan Bahasa
// Indonesia, persisten localStorage -- request eksplisit user ("bisa
// bikin ada togle gonta ganti kombinasi warna juga? Samain kaya di al
// idrisi, ambil reponya").
const THEME_KEY = "jk_bindo_theme";

export const PALETTES = {
  boy: [
    { name: "Sky Explorer", brand: "#2F6FED", brandDark: "#1E56C4", accent1: "#FFB35C", accent1Dark: "#E89A3F", accent2: "#FFD866", accent3: "#22B573", accent3Dark: "#158A54", sky: "linear-gradient(180deg,#BFE3FF 0%,#EAF6E9 100%)" },
    { name: "Forest Ranger", brand: "#2F9E44", brandDark: "#1F7A34", accent1: "#FFB35C", accent1Dark: "#E89A3F", accent2: "#FFD866", accent3: "#2F6FED", accent3Dark: "#1E56C4", sky: "linear-gradient(180deg,#D9F2D0 0%,#EAF3FF 100%)" },
    { name: "Space Cadet", brand: "#5B5FEF", brandDark: "#4245C4", accent1: "#FF7A59", accent1Dark: "#E85F3F", accent2: "#FFD866", accent3: "#22B573", accent3Dark: "#158A54", sky: "linear-gradient(180deg,#D9D6FF 0%,#EAF6E9 100%)" },
  ],
  girl: [
    { name: "Coral Bloom", brand: "#FF6F91", brandDark: "#E8547A", accent1: "#B9A6FF", accent1Dark: "#9683E8", accent2: "#FFC857", accent3: "#2BB3A3", accent3Dark: "#1F9186", sky: "linear-gradient(180deg,#FFD6E8 0%,#E8F3FF 55%,#F3ECFF 100%)" },
    { name: "Berry Sorbet", brand: "#D6448C", brandDark: "#B32E70", accent1: "#FFB4A2", accent1Dark: "#E8927D", accent2: "#FFE066", accent3: "#5FC9A8", accent3Dark: "#3FA688", sky: "linear-gradient(180deg,#FFDCE8 0%,#FFF3D9 100%)" },
    { name: "Lilac Dream", brand: "#9B6BFF", brandDark: "#7E3EDB", accent1: "#6EC6FF", accent1Dark: "#4CA8E0", accent2: "#FFD6A5", accent3: "#FF8FAB", accent3Dark: "#E86E8C", sky: "linear-gradient(180deg,#E4DBFF 0%,#DCF2FF 100%)" },
  ],
};

// Preview dot 3 warna per swatch -- port PERSIS `PALETTE_COLORS`.
export const SWATCH_COLORS = {
  boy: [
    ["#2F6FED", "#22B573", "#FFB35C"],
    ["#2F9E44", "#2F6FED", "#FFB35C"],
    ["#5B5FEF", "#22B573", "#FF7A59"],
  ],
  girl: [
    ["#FF6F91", "#2BB3A3", "#B9A6FF"],
    ["#D6448C", "#5FC9A8", "#FFB4A2"],
    ["#9B6BFF", "#FF8FAB", "#6EC6FF"],
  ],
};

export function loadBindoTheme() {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if ((parsed.gender === "boy" || parsed.gender === "girl") && [0, 1, 2].includes(parsed.palette)) return parsed;
    }
  } catch {
    // localStorage kosong/corrupt -- fallback default di bawah
  }
  return { gender: "boy", palette: 0 };
}

export function saveBindoTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, JSON.stringify(theme));
  } catch {
    // localStorage bisa gagal (private mode/quota) -- theme cuma gak
    // persist ke sesi berikutnya, gak masalah buat sesi yang lagi jalan.
  }
}
