// Skenario dilema sipil kecil, ditampilin SEBELUM quiz PPKn dibuka (bukan
// bagian dari bank soal) -- konsep dari brainstorm "Kampung Pancasila"
// (2026-08-08), user minta ide gameplay orisinil di luar cuma "peta doang".
// Ditulis dari nol, digenericisasi (BUKAN 1:1 per bab, di-cycle by index)
// karena jumlah bab beda-beda per kelas. Semua pilihan dikasih feedback
// POSITIF/reflektif -- SENGAJA gak ada framing "salah" yang nge-judge,
// konsisten sama nada non-punitive `encouragement.js` di seluruh app ini.
export const DILEMMAS = [
  {
    scenario: "Temanmu kesulitan membawa buku pelajaran yang berat sendirian. Kamu...",
    options: [
      { text: "Bantu bawakan sebagian bukunya", feedback: "Keren! Itu namanya gotong royong. 🤝" },
      { text: "Biarkan saja, capek", feedback: "Nggak apa-apa capek, tapi coba bantu dikit aja yuk lain kali. 💪" },
      { text: "Ketawain dia kerepotan", feedback: "Hmm, mendingan dibantu ya, bukan diketawain. 😊" },
    ],
  },
  {
    scenario: "Rapat kelas milih ketua kelompok, tiap orang punya pendapat beda. Sebaiknya...",
    options: [
      { text: "Musyawarah sampai sepakat", feedback: "Betul! Musyawarah mufakat itu inti demokrasi kita. 🗳️" },
      { text: "Paksain pendapat sendiri", feedback: "Coba dengerin pendapat temen dulu ya, biar adil buat semua. 🙂" },
      { text: "Diem aja, gak ikutan milih", feedback: "Suaramu penting lho, coba ikutan kasih pendapat. ✋" },
    ],
  },
  {
    scenario: "Ada temen baru dari daerah lain, logat & bahasanya beda. Kamu...",
    options: [
      { text: "Kenalan & ajak main bareng", feedback: "Mantap! Itu namanya Bhinneka Tunggal Ika. 🇮🇩" },
      { text: "Jauhin karena beda", feedback: "Beda daerah itu seru lho buat dikenalin, coba deketin yuk. 🌏" },
      { text: "Ejek logatnya", feedback: "Mendingan dikenalin aja, semua logat itu keren kok. 😊" },
    ],
  },
  {
    scenario: "Kamu nemu uang temenmu yang jatuh di kelas. Kamu...",
    options: [
      { text: "Kembaliin ke pemiliknya", feedback: "Jujur itu keren! Pancasila banget. ⭐" },
      { text: "Simpen buat diri sendiri", feedback: "Coba dikembaliin ya, pasti temenmu seneng banget. 🙂" },
      { text: "Diem-diem aja", feedback: "Kejujuran itu penting, coba beraniin diri buat balikin ya. 💛" },
    ],
  },
  {
    scenario: "Kelas kotor sebelum pelajaran mulai. Sebaiknya...",
    options: [
      { text: "Ajak temen piket bareng-bareng", feedback: "Gotong royong bikin kerjaan jadi ringan! 🧹" },
      { text: "Tunggu petugas piket doang", feedback: "Bantuin dikit yuk, biar cepet selesai bareng-bareng. 🙂" },
      { text: "Pura-pura gak liat", feedback: "Kelas bersih itu tanggung jawab bareng lho. 🏫" },
    ],
  },
  {
    scenario: "Kamu janji ikut lomba 17 Agustus tapi lagi capek banget. Sebaiknya...",
    options: [
      { text: "Tetep dateng, tepatin janji", feedback: "Tanggung jawab itu keren, salut! 🎖️" },
      { text: "Bolos tanpa kabar", feedback: "Coba kabarin temen-temen kalau capek ya, biar mereka gak nunggu. 📣" },
      { text: "Suruh orang lain gantiin", feedback: "Janji sendiri sebaiknya ditepatin sendiri kalau bisa ya. 🙂" },
    ],
  },
  {
    scenario: "Ada sampah berserakan di taman sekolah. Kamu...",
    options: [
      { text: "Pungut & buang ke tempatnya", feedback: "Cinta lingkungan, mantap! 🌳" },
      { text: "Biarin aja", feedback: "Coba pungut dikit yuk, taman jadi enak diliat. 🙂" },
      { text: "Nambah buang sampah lagi", feedback: "Yuk jaga taman sekolah bareng-bareng ya. 🌱" },
    ],
  },
  {
    scenario: "Adik kelas nangis karena barangnya ilang. Kamu...",
    options: [
      { text: "Bantu cariin & hibur dia", feedback: "Peduli sama orang lain itu nilai Pancasila banget. ❤️" },
      { text: "Cuekin, bukan urusanmu", feedback: "Coba samperin dia, kasih semangat dikit aja udah cukup kok. 🙂" },
      { text: "Ketawain dia", feedback: "Mendingan dihibur ya, biar dia gak sedih lagi. 😊" },
    ],
  },
];

export function dilemmaForIndex(i) {
  return DILEMMAS[i % DILEMMAS.length];
}
