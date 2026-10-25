# Video Motivasi — Remotion

Video motivasi vertikal berbahasa Indonesia, dibuat sepenuhnya dengan React dan
[Remotion](https://remotion.dev). Hasil akhir: **1080×1920, 30 fps, 46,1 detik**
dengan narasi suara, musik latar, gambar stok berlisensi terbuka, animasi
kinetik, transisi crossfade, dan caption yang tersinkron.

## Isi video

| # | Headline | Visual |
|---|---|---|
| 01 | KAMU TIDAK KEKURANGAN **MOTIVASI** | Matahari terbit di pegunungan |
| 02 | SETIAP PAGI ADA **PILIHAN** | Cahaya pagi menembus jendela |
| 03 | DISIPLIN BUKAN **PERASAAN** | Siluet pelari saat fajar |
| 04 | KEMAJUAN LAHIR DARI HARI **BIASA** | Orang bekerja fokus |
| 05 | GAGAL BUKAN TANDA **BERHENTI** | Pemanjat tebing |
| 06 | SATU LANGKAH KECIL HARI **INI** | Tangga batu menanjak |
| 07 | MULAI SEBELUM **SIAP** | Jalan terbuka menuju horizon |
| — | **MULAI.** (outro) | Siluet di puncak gunung |

## Menjalankan

```bash
npm install
npm run dev      # buka Remotion Studio di http://localhost:3000
npm run render   # render ke out/motivation.mp4
npm run lint     # eslint + tsc
```

## Alur produksi aset

Semua media dihasilkan oleh dua skrip di `tools/`. Keduanya idempoten — jalankan
ulang akan memakai aset yang sudah ada, dan `FORCE=1` memaksa unduh ulang.

```bash
npm run voiceover   # narasi TTS + timing
npm run assets      # gambar + musik
```

### 1. Narasi suara — `tools/generate-voiceover.mjs`

Naskah ada di [`tools/voiceover-lines.json`](tools/voiceover-lines.json) — satu
sumber kebenaran untuk teks TTS *dan* caption. Setiap baris disintesis menjadi
file MP3 sendiri lewat `edge-tts` (voice `id-ID-ArdiNeural`), lalu durasinya
diukur dengan `ffprobe`.

**Kenapa satu file per baris:** durasi tiap baris jadi presisi, sehingga
komposisi bisa menempatkan setiap baris tepat pada frame-nya dan caption
diturunkan dari data yang sama. Tidak perlu forced alignment atau transkripsi.

Output: `public/voiceover/*.mp3` + [`src/voiceover-data.ts`](src/voiceover-data.ts)
(berisi `startFrame`, `durationInFrames`, `headline`, `emphasis` per baris).

### 2. Gambar & musik — `tools/fetch-assets.mjs`

- **Gambar:** [Wikimedia Commons API](https://commons.wikimedia.org/w/api.php)
  (tanpa API key). Setiap foto di-*cover-crop* ke 9:16 lalu diskalakan ke tepat
  1080×1920 dengan ffmpeg.
- **Musik:** MP3 dari CDN [Freesound](https://freesound.org).

Catatan teknis yang penting kalau skrip ini diubah:

- Kolom `keywords` per scene menyaring hasil pencarian Commons. Tanpa itu,
  pencarian seperti *"morning light window curtains"* mengembalikan surat hasil
  pindai tahun 1844 yang cuma berbagi kata di metadata.
- Skrip mengunduh **thumbnail** (`thumb.wikimedia.org`), bukan file asli.
  Wikimedia membalas HTTP 429 + `Retry-After: 60` untuk unduhan file asli berukuran
  besar, sedangkan thumbnail dilayani tanpa throttle.
- Foto wajib melewati ambang `sharpness` (`min(w/1080, h/1920) >= 1.0`) **dan**
  aspek ≤ 2,1. Panorama ultra-lebar membuang hampir semua pikselnya saat
  di-crop ke 9:16.

Output: `public/images/*.jpg`, `public/music/backsound.mp3`,
[`src/asset-data.ts`](src/asset-data.ts), dan [`ATTRIBUTION.md`](ATTRIBUTION.md).

## Arsitektur komposisi

```
src/
├── Root.tsx                    # registrasi <Composition id="Motivation">
├── Motivation.tsx              # timeline + audio + TransitionSeries
├── theme.ts                    # warna, margin, durasi transisi
├── fonts.ts                    # Anton (headline) + Inter (teks)
├── voiceover-data.ts           # AUTO-GENERATED
├── asset-data.ts               # AUTO-GENERATED
└── components/
    ├── NarrationScene.tsx      # layout satu baris narasi
    ├── OutroScene.tsx          # kartu penutup + kredit musik
    ├── BackgroundImage.tsx     # Ken Burns + scrim gradien
    ├── LightSweep.tsx          # sapuan cahaya diagonal
    ├── KineticHeadline.tsx     # headline muncul kata demi kata
    ├── NarrationCaption.tsx    # pill caption baris yang diucapkan
    └── ProgressBar.tsx         # progress global di atas
```

### Sinkronisasi audio dan video

Audio **tidak** diletakkan di dalam `TransitionSeries`. Setiap baris narasi
dipasang pada frame absolutnya sendiri lewat `<Sequence from={line.startFrame}>`,
sehingga perubahan durasi transisi tidak akan menggeser suara.

Agar visual tetap sejajar, setiap scene di `TransitionSeries` diberi durasi
`window + TRANSITION_FRAMES`. Karena tiap transisi memotong durasi total sebanyak
`TRANSITION_FRAMES`, penambahan itu membuat scene ke-*k* **mulai** tepat pada
frame dimulainya baris narasi ke-*k*. `Motivation.tsx` memverifikasi aritmetika
ini saat render dan langsung melempar error bila tidak cocok.

> Edit `tools/voiceover-lines.json`, jalankan `npm run voiceover`, lalu
> penyesuaian durasi komposisi terjadi otomatis.

## Lisensi aset

Lihat [`ATTRIBUTION.md`](ATTRIBUTION.md) untuk daftar lengkap. Ringkasnya:

- Musik **CC-BY 4.0** (tyops) → **wajib memberi kredit**. Kredit sudah
  ditampilkan di kartu penutup video dan juga tercantum di `ATTRIBUTION.md`.
- Sebagian gambar CC0 / Public domain (tanpa kewajiban kredit), sebagian lagi
  CC-BY / CC-BY-SA (perlu kredit).
- **Periksa ulang lisensi sebelum memonetisasi video ini**, dan tinjau ketentuan
  Microsoft sebelum memakai suara sintetis `edge-tts` secara komersial.

## Lisensi Remotion

Remotion gratis untuk tim hingga 3 orang. Untuk penggunaan perusahaan, lihat
[remotion.pro/license](https://www.remotion.pro/license).
