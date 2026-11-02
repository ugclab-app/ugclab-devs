import { chromium } from "playwright";
import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeScore } from "./generate-music.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? fallback : process.argv[i + 1];
};
const htmlFile = arg("--html", "index.html");
const query = arg("--query", "");
const [w, h] = arg("--size", "1920x1080").split("x").map(Number);
const size = { width: w, height: h };
const film = process.argv.includes("--out") ? path.basename(arg("--out"), ".mp4") : path.basename(htmlFile, ".html");
const pageUrl = (shot) =>
  pathToFileURL(htmlPath).href + "?" + [query, shot ? "shot=" + shot : ""].filter(Boolean).join("&");
const htmlPath = path.join(root, htmlFile);
const previewDir = film === "index" ? path.join(root, "preview") : path.join(root, "preview", film);
const outDir = film === "index" ? path.join(root, "out") : path.join(root, "out", film);
// Never overwrite an existing render: pick the next free -vN suffix instead.
function freePath(file) {
  const ext = path.extname(file);
  const base = file.slice(0, -ext.length);
  let candidate = file;
  for (let n = 2; existsSync(candidate); n += 1) candidate = `${base}-v${n}${ext}`;
  return candidate;
}
const mp4Path = freePath(path.join(root, arg("--out", "tescommerce-launch.mp4")));
let shots = ["hero-badge", "starter", "growth", "pro", "end-cta"];

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}`));
    });
  });
}

const browser = await chromium.launch({ headless: true });

if (process.argv.includes("--preview")) {
  await mkdir(previewDir, { recursive: true });
  const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1 });
  await page.goto(pageUrl("__list"));
  await page.waitForFunction(() => window.__filmReady === true);
  shots = (await page.evaluate(() => window.__previewShots)) ?? shots;
  for (const name of shots) {
    await page.goto(pageUrl(name));
    await page.waitForFunction(() => window.__filmReady === true);
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(previewDir, name + ".png") });
    console.log("shot", name);
  }
  await browser.close();
  process.exit(0);
}

await mkdir(outDir, { recursive: true });
const context = await browser.newContext({
  viewport: size,
  deviceScaleFactor: 1,
  recordVideo: { dir: outDir, size: size }
});
const page = await context.newPage();
await page.goto(pageUrl());
const filmMs = await page.evaluate(() => window.__filmMs);
console.log("film ms", filmMs);
await page.waitForFunction(() => window.__filmDone === true, null, { timeout: filmMs + 20000 });
await page.waitForTimeout(400);
const video = page.video();
await context.close();
await browser.close();
const webmPath = await video.path();
console.log("webm", webmPath);
const duration = await probe(ffmpegPath, webmPath);
console.log("duration", duration);
const wavPath = path.join(outDir, "music.wav");
await writeScore(wavPath, duration);
const fadeStart = Math.max(0, duration - 1.15).toFixed(2);

await run(ffmpegPath, [
  "-y",
  "-i", webmPath,
  "-i", wavPath,
  "-filter_complex",
  `[1:a]afade=t=in:st=0:d=0.2,afade=t=out:st=${fadeStart}:d=1.05[a]`,
  "-map", "0:v",
  "-map", "[a]",
  "-shortest",
  "-c:v", "libx264",
  "-pix_fmt", "yuv420p",
  "-crf", "17",
  "-preset", "medium",
  "-r", "30",
  "-c:a", "aac",
  "-b:a", "192k",
  "-movflags", "+faststart",
  mp4Path
]);
console.log("mp4", mp4Path);

function probe(cmd, file) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, ["-i", file], { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    child.stderr.on("data", (chunk) => {
      err += chunk.toString();
    });
    child.on("error", reject);
    child.on("exit", () => {
      const match = err.match(/Duration:\s+(\d+):(\d+):(\d+\.?\d*)/);
      if (!match) reject(new Error("Could not read video duration"));
      else resolve(Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]));
    });
  });
}
