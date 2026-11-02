// Generates the English voiceover with ElevenLabs, one clip per script segment,
// and writes vo/<voice>/timing.json with each clip's duration.
// Existing clips are never overwritten: re-takes go to a new -vN file.
import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error("ELEVENLABS_API_KEY is not set");
  process.exit(1);
}
const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? fallback : process.argv[i + 1];
};
const retake = process.argv.includes("--retake");
const preferred = arg("--voice", process.env.ELEVENLABS_VOICE || "Brian,Adam,Eric,Josh");
const model = arg("--model", "eleven_multilingual_v2");

const api = (p, init = {}) =>
  fetch("https://api.elevenlabs.io" + p, { ...init, headers: { "xi-api-key": key, ...(init.headers || {}) } });

const voicesRes = await api("/v1/voices");
if (!voicesRes.ok) throw new Error(`voices ${voicesRes.status}: ${await voicesRes.text()}`);
const { voices } = await voicesRes.json();
let voice;
for (const want of preferred.split(",")) {
  voice = voices.find((v) => v.voice_id === want || v.name.toLowerCase().startsWith(want.toLowerCase()));
  if (voice) break;
}
voice ??= voices[0];
console.log("voice", voice.name, voice.voice_id, "| available:", voices.map((v) => v.name).join(", "));

const script = JSON.parse(await readFile(path.join(root, "explainer-script.json"), "utf8"));
const dir = path.join(root, "vo", voice.name.split(" ")[0].toLowerCase());
await mkdir(dir, { recursive: true });

function freePath(file) {
  const ext = path.extname(file);
  const base = file.slice(0, -ext.length);
  let candidate = file;
  for (let n = 2; existsSync(candidate); n += 1) candidate = `${base}-v${n}${ext}`;
  return candidate;
}

function probe(file) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, ["-i", file], { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    child.stderr.on("data", (chunk) => (err += chunk));
    child.on("error", reject);
    child.on("exit", () => {
      const m = err.match(/Duration:\s+(\d+):(\d+):(\d+\.?\d*)/);
      if (!m) reject(new Error("Could not read duration of " + file));
      else resolve(+m[1] * 3600 + +m[2] * 60 + +m[3]);
    });
  });
}

const timingPath = path.join(dir, "timing.json");
const previous = existsSync(timingPath) ? JSON.parse(await readFile(timingPath, "utf8")) : null;
const segments = [];
for (const [i, seg] of script.segments.entries()) {
  const prev = previous?.segments.find((s) => s.id === seg.id && s.text === seg.text);
  let file = prev && !retake && existsSync(path.join(dir, prev.file)) ? path.join(dir, prev.file) : null;
  if (!file) {
    file = freePath(path.join(dir, `${String(i + 1).padStart(2, "0")}-${seg.id}.mp3`));
    const res = await api(`/v1/text-to-speech/${voice.voice_id}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({
        text: seg.text,
        model_id: model,
        previous_text: script.segments[i - 1]?.text,
        next_text: script.segments[i + 1]?.text,
        voice_settings: { stability: 0.42, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true }
      })
    });
    if (!res.ok) throw new Error(`tts ${seg.id} ${res.status}: ${await res.text()}`);
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
    console.log("tts", seg.id);
  }
  segments.push({ id: seg.id, text: seg.text, file: path.basename(file), dur: await probe(file) });
}

await writeFile(timingPath, JSON.stringify({ voice: voice.name, voiceId: voice.voice_id, model, segments }, null, 2));
console.log("timing", timingPath);
for (const s of segments) console.log(s.dur.toFixed(2).padStart(6), s.id);
