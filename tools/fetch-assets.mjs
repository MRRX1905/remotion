// Downloads the openly licensed media used by the motivational video.
//
// Sources
//   Images : Wikimedia Commons API (no key). Openverse was tried first but its
//            API sits behind a Cloudflare bot challenge that blocks automated
//            fetching ("Just a moment..." + HTTP 429).
//   Music  : Freesound preview MP3 via its CDN (verified playable, 75.7s).
//
// Images are cropped and scaled to exactly 1080x1920 locally with ffmpeg, so the
// composition never has to upscale and the committed files stay small.
//
// Usage:  node tools/fetch-assets.mjs          (skips assets already on disk)
//         FORCE=1 node tools/fetch-assets.mjs  (re-download everything)

import {execFileSync} from "node:child_process";
import {existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const rewind = (p) => path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", p);

// Wikimedia's API etiquette requires a descriptive User-Agent.
const UA = "remotion-motivational-video-demo/1.0 (asset fetcher for a local Remotion project)";
const COMMONS = "https://commons.wikimedia.org/w/api.php";

const OUT_W = 1080;
const OUT_H = 1920;
const MIN_SCORE = 1.0; // a photo must already cover 1080x1920 before we crop
// Wikimedia throttles bursts of large *original* downloads with HTTP 429
// (Retry-After: 60), but serves pre-rendered thumbnails from a separate host
// (thumb.wikimedia.org) with no throttling. So always fetch a thumbnail.
const THUMB_WIDTH = 4000;
const MAX_ASPECT = 2.1; // an ultra-wide panorama wastes nearly all its pixels on a 9:16 crop

// score(a,b,c,d) = how much real resolution survives a centred 9:16 cover-crop.
// Equivalent to min(w/1080, h/1920) because the crop pins one axis.
const score = (w, h) => Math.min(w / OUT_W, h / OUT_H);

// `keywords` guards against Commons' noisy relevance: at least one keyword must
// appear in the file title, otherwise the candidate is discarded. Without this,
// a query like "morning light window curtains" happily returns a scanned 1844
// letter that merely shares metadata words.
const SCENES = [
  {id: "img-01", alt: "Matahari terbit di balik pegunungan",
   keywords: ["sunrise", "sunset", "dawn", "mountain", "mountains", "peak", "range", "landscape"],
   queries: ["sunrise over mountain range", "mountain landscape dawn golden hour", "sunrise alpine peaks"]},
  {id: "img-02", alt: "Cahaya pagi menembus jendela",
   keywords: ["window", "windows", "curtain", "curtains", "sunlight", "sunbeam", "room", "interior"],
   queries: ["sunlight through window indoor morning", "morning light window curtains", "sunshine window room interior"]},
  {id: "img-03", alt: "Siluet pelari di jalan",
   keywords: ["run", "runner", "running", "jog", "jogging", "marathon", "athlete", "sport", "race"],
   queries: ["running silhouette sunrise", "jogging silhouette road", "runner backlit sunrise"]},
  {id: "img-04", alt: "Orang bekerja fokus di meja",
   keywords: ["desk", "office", "laptop", "computer", "work", "working", "notebook", "writing", "study"],
   queries: ["man working laptop desk office", "person writing notebook desk", "working at desk computer"]},
  {id: "img-05", alt: "Pemanjat tebing meraih pegangan",
   keywords: ["climb", "climber", "climbing", "bouldering", "rock", "cliff", "mountaineer"],
   queries: ["rock climber climbing wall", "sport climbing reaching hand hold", "climber on rock face"]},
  {id: "img-06", alt: "Tangga batu menanjak",
   keywords: ["stair", "staircase", "stairs", "steps", "stairway"],
   queries: ["stone steps staircase forest", "stone stairs leading up hill", "old stone staircase steps"]},
  {id: "img-07", alt: "Jalan terbuka menuju horizon",
   keywords: ["road", "highway", "street", "route", "roadway", "path"],
   queries: ["empty road leading to horizon", "country road landscape sunset", "winding road mountains"]},
  {id: "img-08", alt: "Siluet seseorang di puncak gunung",
   keywords: ["summit", "peak", "hiker", "hiking", "silhouette", "mountain", "climber"],
   queries: ["silhouette hiker on mountain summit", "person standing on summit silhouette", "hiker mountain peak sunset"]},
];

// Verified by direct download: 44.1 kHz stereo MP3, 75.7 s, 190 kbps.
const MUSIC = {
  title: "Inspiring Dramatic Beat #05",
  creator: "tyops",
  license: "CC-BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  sourceUrl: "https://freesound.org/people/tyops/sounds/420631/",
  url: "https://cdn.freesound.org/previews/420/420631_3914271-hq.mp3",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, {headers: {"User-Agent": UA, Accept: "application/json"}});
      if (res.ok) return await res.json();
      console.warn(`  ! HTTP ${res.status} (attempt ${i}/${attempts})`);
    } catch (err) {
      console.warn(`  ! ${err.message} (attempt ${i}/${attempts})`);
    }
    await sleep(800 * i);
  }
  return null;
}

function probe(file) {
  try {
    const out = execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "stream=codec_name,width,height",
       "-show_entries", "format=duration", "-of", "json", file],
      {encoding: "utf8"},
    );
    const parsed = JSON.parse(out);
    const s = parsed.streams?.[0] ?? {};
    return {
      codec: s.codec_name,
      width: s.width ?? null,
      height: s.height ?? null,
      duration: parsed.format?.duration ? Number.parseFloat(parsed.format.duration) : null,
    };
  } catch {
    return null;
  }
}

// Wikimedia rate-limits bursts of large original downloads with HTTP 429.
// Backs off exponentially and honours Retry-After when the server sends it.
async function downloadRaw(url, dest, attempts = 6) {
  let lastError = "unknown error";
  for (let i = 1; i <= attempts; i++) {
    let waitMs = Math.min(1500 * 2 ** (i - 1), 30000);
    try {
      const res = await fetch(url, {headers: {"User-Agent": UA, Accept: "image/*,audio/*,*/*"}});
      if (!res.ok) {
        const retryAfter = Number.parseFloat(res.headers.get("retry-after") ?? "");
        if (Number.isFinite(retryAfter)) waitMs = Math.min(retryAfter * 1000, 60000);
        throw new Error(`HTTP ${res.status}`);
      }
      const type = res.headers.get("content-type") ?? "";
      if (!/^(image|audio)\//.test(type)) throw new Error(`unexpected content-type "${type}"`);
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 8 * 1024) throw new Error(`suspiciously small payload (${buffer.length} bytes)`);
      writeFileSync(dest, buffer);
      return {bytes: buffer.length};
    } catch (err) {
      lastError = err.message;
      if (i < attempts) {
        console.warn(`    · ${err.message} — retry ${i}/${attempts - 1} in ${Math.round(waitMs)}ms`);
        await sleep(waitMs);
      }
    }
  }
  throw new Error(lastError);
}

// Cover-crop to 9:16 and scale to exactly 1080x1920.
function cropToVertical(src, dest) {
  execFileSync("ffmpeg", [
    "-y", "-v", "error",
    "-i", src,
    "-vf", `scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=increase,crop=${OUT_W}:${OUT_H}`,
    "-q:v", "3",
    "-map_metadata", "-1",
    // Some Commons files decode to more than one frame; without these ffmpeg
    // tries to write an image sequence and fails on a single output filename.
    "-frames:v", "1",
    "-update", "1",
    dest,
  ]);
}

const stripHtml = (s) =>
  String(s ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const sidecarPath = (dir, id) => path.join(dir, `${id}.meta.json`);

async function fetchImage(scene, outDir) {
  const dest = path.join(outDir, `${scene.id}.jpg`);
  const tmp = path.join(outDir, `.${scene.id}.partial`);
  const sidecar = sidecarPath(outDir, scene.id);

  if (existsSync(dest) && existsSync(sidecar) && process.env.FORCE !== "1") {
    console.log(`  reusing ${scene.id}`);
    return JSON.parse(readFileSync(sidecar, "utf8"));
  }

  for (const query of scene.queries) {
    const url =
      `${COMMONS}?action=query&format=json&generator=search` +
      `&gsrsearch=${encodeURIComponent(`${query} filetype:bitmap`)}` +
      `&gsrnamespace=6&gsrlimit=40&gsrsort=relevance` +
      `&prop=imageinfo&iiprop=${encodeURIComponent("url|size|mime|extmetadata")}` +
      `&iiurlwidth=${THUMB_WIDTH}`;

    const data = await getJson(url);
    const pages = Object.values((data?.query ?? {}).pages ?? {});

    const candidates = pages
      .map((page) => ({page, info: (page.imageinfo ?? [])[0]}))
      .filter(({info}) => info?.url && info.width && info.height)
      .filter(({info}) => /^image\/(jpeg|png)$/.test(info.mime ?? ""))
      .filter(({page}) => {
        const title = String(page.title ?? "").toLowerCase();
        return scene.keywords.some((keyword) => title.includes(keyword));
      })
      .filter(({info}) => info.width / info.height <= MAX_ASPECT)
      .map((entry) => ({...entry, score: score(entry.info.width, entry.info.height)}))
      .filter((entry) => entry.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score);

    if (!candidates.length) continue;
    console.log(`  ${scene.id}: "${query}" → ${candidates.length} candidate(s)`);

    for (const {page, info, score: sh} of candidates.slice(0, 3)) {
      try {
        await sleep(400); // stay polite; this is someone else's API
        await downloadRaw(info.thumburl ?? info.url, tmp);

        // Measure the pixels we actually got. A requested thumbnail width can
        // come back smaller, and cropping an undersized one would upscale it.
        const source = probe(tmp);
        const sourceScore = score(source?.width ?? 0, source?.height ?? 0);
        if (sourceScore < MIN_SCORE) {
          throw new Error(
            `thumbnail too small to crop (${source?.width}x${source?.height}, score ${sourceScore.toFixed(2)})`,
          );
        }

        cropToVertical(tmp, dest);
        rmSync(tmp, {force: true});

        const meta = probe(dest);
        if (meta?.width !== OUT_W || meta?.height !== OUT_H) {
          throw new Error(`unexpected output size ${meta?.width}x${meta?.height}`);
        }

        const em = info.extmetadata ?? {};
        const record = {
          id: scene.id,
          file: `images/${scene.id}.jpg`,
          alt: scene.alt,
          width: OUT_W,
          height: OUT_H,
          sourceWidth: source.width,
          sourceHeight: source.height,
          license: em.LicenseShortName?.value ?? "Unknown",
          licenseUrl: em.LicenseUrl?.value ?? null,
          creator: stripHtml(em.Artist?.value) || "Unknown",
          title: String(page.title ?? "").replace(/^File:/, ""),
          sourceUrl: page.title ? `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}` : info.descriptionurl,
        };
        writeFileSync(sidecar, JSON.stringify(record, null, 2));
        console.log(
          `  fetched ${scene.id} ← "${record.title}" (original ${info.width}x${info.height} → thumb ${source.width}x${source.height}, ${record.license})`,
        );
        return record;
      } catch (err) {
        console.warn(`  ~ rejected candidate for ${scene.id}: ${err.message}`);
        rmSync(tmp, {force: true});
      }
    }
  }

  throw new Error(`no usable Wikimedia image found for ${scene.id} (queries: ${scene.queries.join(" / ")})`);
}

async function fetchMusic(outDir) {
  const dest = path.join(outDir, "backsound.mp3");
  const sidecar = sidecarPath(outDir, "backsound");

  if (existsSync(dest) && existsSync(sidecar) && process.env.FORCE !== "1") {
    console.log(`  reusing backsound.mp3`);
    return JSON.parse(readFileSync(sidecar, "utf8"));
  }

  await downloadRaw(MUSIC.url, dest);
  const meta = probe(dest);
  if (!meta?.duration || meta.duration < 40) throw new Error(`unusable duration (${meta?.duration})`);

  const record = {
    file: "music/backsound.mp3",
    title: MUSIC.title,
    creator: MUSIC.creator,
    license: MUSIC.license,
    licenseUrl: MUSIC.licenseUrl,
    sourceUrl: MUSIC.sourceUrl,
    durationInSeconds: meta.duration,
  };
  writeFileSync(sidecar, JSON.stringify(record, null, 2));
  console.log(`  fetched backsound.mp3 (${meta.duration.toFixed(1)}s, ${meta.codec}, ${record.license})`);
  return record;
}

// ---------------------------------------------------------------- main

const imageDir = rewind("public/images");
const musicDir = rewind("public/music");
mkdirSync(imageDir, {recursive: true});
mkdirSync(musicDir, {recursive: true});

console.log("images (Wikimedia Commons):");
const images = [];
for (const scene of SCENES) images.push(await fetchImage(scene, imageDir));

console.log("music (Freesound):");
const music = await fetchMusic(musicDir);

writeFileSync(
  rewind("ATTRIBUTION.md"),
  `# Attribution & Licences

Downloaded from openly licensed repositories. Files live in \`public/\` and are
loaded by the Remotion composition through \`staticFile()\`.

**Re-check the licences before publishing or monetising this video** — sources can
change their terms. Every asset below that needs a credit is listed explicitly.

## Music

| Track | Creator | Licence | Source |
|---|---|---|---|
| ${music.title} | ${music.creator} | ${music.license} | ${music.sourceUrl} |

The track is **${music.license}**, so attribution is required. Put this in your
video description:

> Music: "${music.title}" by ${music.creator}, licensed ${music.license} (${music.sourceUrl}).

## Images

| Scene | File | Source image | Creator | Licence |
|---|---|---|---|---|
${images.map((i) => `| ${i.id} | \`${i.file}\` | ${i.title} | ${i.creator} | ${i.license} |`).join("\n")}

Full source pages:

${images.map((i) => `- **${i.id}** — [${i.title}](${i.sourceUrl}) by ${i.creator}, ${i.license}`).join("\n")}

## Voice-over

Generated locally with [edge-tts](https://github.com/rany2/edge-tts) using the
Microsoft Edge voice \`id-ID-ArdiNeural\`. Review Microsoft's terms before
commercial use of synthetic voice output.
`,
);

writeFileSync(
  rewind("src/asset-data.ts"),
  `// AUTO-GENERATED by tools/fetch-assets.mjs — do not edit by hand.
// Regenerate with: node tools/fetch-assets.mjs

export type SceneImage = {
  id: string;
  file: string;
  alt: string;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  license: string;
  creator: string;
  title: string;
  sourceUrl: string;
};

export const SCENE_IMAGES: SceneImage[] = [
${images
  .map(
    (i) => `  {
    id: ${JSON.stringify(i.id)},
    file: ${JSON.stringify(i.file)},
    alt: ${JSON.stringify(i.alt)},
    width: ${i.width},
    height: ${i.height},
    sourceWidth: ${i.sourceWidth},
    sourceHeight: ${i.sourceHeight},
    license: ${JSON.stringify(i.license)},
    creator: ${JSON.stringify(i.creator)},
    title: ${JSON.stringify(i.title)},
    sourceUrl: ${JSON.stringify(i.sourceUrl)},
  },`,
  )
  .join("\n")}
];

export const BACKSOUND = {
  file: ${JSON.stringify(music.file)},
  title: ${JSON.stringify(music.title)},
  creator: ${JSON.stringify(music.creator)},
  license: ${JSON.stringify(music.license)},
  sourceUrl: ${JSON.stringify(music.sourceUrl)},
  durationInSeconds: ${music.durationInSeconds},
};
`,
);

console.log(`\n${images.length} images + 1 music track ready.`);
console.log("wrote ATTRIBUTION.md and src/asset-data.ts");
