// Frame-accurate renderer: the page exposes renderAt(t); every frame is drawn
// explicitly and piped to ffmpeg, so motion is perfectly smooth and in sync with
// the voiceover. Never deletes or overwrites earlier renders.
//
//   node render-film.mjs --html explainer.html --out tescommerce-explainer.mp4 [--vo vo/brian] [--preview]
//   reels: --music saas --style bright|lofi|drive|tropical|epic|funk|chill|night|afro|electro (pick a style no other reel uses)
import { chromium } from "playwright";
import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeScore } from "./generate-music.mjs";
import { writeSaasScore } from "./music-saas.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? fallback : process.argv[i + 1];
};
const htmlPath = path.join(root, arg("--html", "explainer.html"));
const fps = Number(arg("--fps", "30"));
const [width, height] = arg("--size", "1920x1080").split("x").map(Number);
const voDir = arg("--vo", null);
const query = arg("--query", "");

function freePath(file) {
  const ext = path.extname(file);
  const base = file.slice(0, -ext.length);
  let candidate = file;
  for (let n = 2; existsSync(candidate); n += 1) candidate = `${base}-v${n}${ext}`;
  return candidate;
}
const mp4Path = freePath(path.join(root, arg("--out", "tescommerce-explainer.mp4")));
const film = path.basename(mp4Path, ".mp4");
const workDir = path.join(root, "out", film);
await mkdir(workDir, { recursive: true });

const timing = voDir ? JSON.parse(await readFile(path.join(root, voDir, "timing.json"), "utf8")) : null;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
await page.addInitScript((t) => {
  window.__VO = t;
}, timing);
await page.goto(pathToFileURL(htmlPath).href + (query ? "?" + query : ""));
await page.waitForFunction(() => window.__ready === true);
const plan = await page.evaluate(() => window.__plan);
console.log("duration", plan.duration.toFixed(2), "s");
for (const s of plan.scenes) console.log(s.start.toFixed(2).padStart(6), s.dur.toFixed(2).padStart(5), s.id);

if (process.argv.includes("--preview")) {
  const dir = path.join(root, "preview", film);
  await mkdir(dir, { recursive: true });
  const times = arg("--at", null)?.split(",").map(Number) ??
    plan.scenes.flatMap((s) => [s.start + s.dur * 0.35, s.start + s.dur * 0.85]);
  for (const t of times) {
    await page.evaluate((x) => window.renderAt(x), t);
    await page.screenshot({ path: path.join(dir, `t${t.toFixed(2)}.png`) });
  }
  console.log("preview", dir, times.length, "frames");
  await browser.close();
  process.exit(0);
}

const run = (args, opts = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { stdio: [opts.stdin ? "pipe" : "ignore", "inherit", "inherit"] });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("ffmpeg exited " + code))));
    if (opts.stdin) opts.stdin(child);
  });

// 1. frames -> silent video (or reuse one with --video to only remix audio)
const reuse = arg("--video", null);
const silent = reuse ? path.join(root, reuse) : freePath(path.join(workDir, "video.mp4"));
const total = Math.ceil(plan.duration * fps);
if (!reuse) await run(
  ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-preset", "slow", "-r", String(fps), silent],
  {
    stdin: async (child) => {
      const started = Date.now();
      for (let f = 0; f < total; f += 1) {
        await page.evaluate((x) => window.renderAt(x), f / fps);
        const buf = await page.screenshot({ type: "jpeg", quality: 95 });
        if (!child.stdin.write(buf)) await new Promise((r) => child.stdin.once("drain", r));
        if (f % fps === 0) process.stdout.write(`\rframe ${f}/${total} (${((Date.now() - started) / 1000).toFixed(0)}s)`);
      }
      child.stdin.end();
      process.stdout.write("\n");
    }
  }
);
await browser.close();

// 2. music bed + voiceover clips placed at their scene offsets
const musicPath = freePath(path.join(workDir, "music.wav"));
if (arg("--music", "classic") === "saas") {
  const starts = plan.scenes.map((s) => s.start);
  await writeSaasScore(musicPath, plan.duration, { hits: starts.slice(1, -1), finale: starts[starts.length - 1], style: arg("--style", "bright") });
} else {
  await writeScore(musicPath, plan.duration);
}
const inputs = ["-i", silent, "-i", musicPath];
const fadeOut = Math.max(0, plan.duration - 1.4).toFixed(2);
let filter = `[1:a]volume=${timing ? 0.32 : 0.55},afade=t=in:st=0:d=0.3,afade=t=out:st=${fadeOut}:d=1.3[music]`;
let mapAudio = "[music]";
if (!timing) {
  filter += `;[music]loudnorm=I=-14:TP=-1.5:LRA=9,aresample=44100[master]`;
  mapAudio = "[master]";
}
if (timing) {
  const clips = plan.scenes.filter((s) => s.vo);
  clips.forEach((s, i) => {
    inputs.push("-i", path.join(root, voDir, s.vo));
    const ms = Math.round((s.start + s.voOffset) * 1000);
    // each clip brought to broadcast voice level before placing it
    filter += `;[${i + 2}:a]loudnorm=I=-15:TP=-2:LRA=7,aresample=44100,aformat=channel_layouts=stereo,adelay=${ms}|${ms}[v${i}]`;
  });
  filter += `;${clips.map((_, i) => `[v${i}]`).join("")}amix=inputs=${clips.length}:normalize=0,asplit[vo][key]`;
  filter += `;[music][key]sidechaincompress=threshold=0.02:ratio=6:attack=20:release=400[ducked]`;
  filter += `;[ducked][vo]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9,aresample=44100[mix]`;
  mapAudio = "[mix]";
}
await run([
  "-y", "-loglevel", "error", ...inputs,
  "-filter_complex", filter,
  "-map", "0:v", "-map", mapAudio,
  "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-t", plan.duration.toFixed(3),
  "-movflags", "+faststart", mp4Path
]);
console.log("mp4", mp4Path);
