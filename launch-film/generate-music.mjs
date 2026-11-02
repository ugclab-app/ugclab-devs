import { writeFile } from "node:fs/promises";

const SR = 44100;

function midi(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function addTone(busL, busR, start, freq, dur, gain, attack, release, pan) {
  const n = busL.length;
  const from = Math.max(0, start | 0);
  const len = Math.min(n - from, Math.floor(dur * SR));
  let phase = 0;
  const left = Math.cos((pan * Math.PI) / 2);
  const right = Math.sin((pan * Math.PI) / 2);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const a = attack <= 0 ? 1 : Math.min(1, t / attack);
    const rel = Math.min(1, (dur - t) / release);
    const env = a * Math.max(0, rel);
    phase += (2 * Math.PI * freq) / SR;
    const s = Math.sin(phase) * env * gain;
    busL[from + i] += s * left;
    busR[from + i] += s * right;
  }
}

function addNoise(busL, busR, start, dur, gain, color, pan) {
  const n = busL.length;
  const from = Math.max(0, start | 0);
  const len = Math.min(n - from, Math.floor(dur * SR));
  let hp = 0;
  let prev = 0;
  const left = Math.cos((pan * Math.PI) / 2);
  const right = Math.sin((pan * Math.PI) / 2);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = Math.exp(-t / Math.max(0.012, dur * 0.45));
    const white = Math.random() * 2 - 1;
    hp = color * hp + (1 - color) * (white - prev);
    prev = white;
    const s = hp * env * gain;
    busL[from + i] += s * left;
    busR[from + i] += s * right;
  }
}

function addKick(busL, busR, duck, start) {
  const n = busL.length;
  const from = Math.max(0, start | 0);
  const len = Math.min(n - from, Math.floor(0.22 * SR));
  let phase = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = 168 * Math.exp(-t * 24) + 49;
    phase += (2 * Math.PI * f) / SR;
    const env = Math.exp(-t * 11);
    const click = t < 0.003 ? (1 - t / 0.003) * 0.35 : 0;
    const s = Math.sin(phase) * env * 0.72 + click;
    busL[from + i] += s;
    busR[from + i] += s;
    const d = Math.exp(-t * 9);
    if (d > duck[from + i]) duck[from + i] = d;
  }
}

export async function writeScore(file, durationSec) {
  const n = Math.floor(SR * durationSec);
  const drumsL = new Float32Array(n);
  const drumsR = new Float32Array(n);
  const musicL = new Float32Array(n);
  const musicR = new Float32Array(n);
  const duck = new Float32Array(n);

  const bpm = 118;
  const beat = 60 / bpm;
  const bar = beat * 4;
  const intro = 2.9;
  const chords = [
    { bass: midi(45), notes: [midi(57), midi(60), midi(64)] },
    { bass: midi(41), notes: [midi(53), midi(57), midi(60)] },
    { bass: midi(48), notes: [midi(60), midi(64), midi(67)] },
    { bass: midi(43), notes: [midi(55), midi(59), midi(62)] }
  ];
  const motifs = [
    [midi(76), midi(79), midi(81), null, midi(79), midi(76), midi(74), null],
    [midi(77), midi(74), midi(72), midi(74), midi(76), null, midi(72), midi(74)],
    [midi(76), midi(79), midi(84), midi(81), midi(79), midi(76), null, midi(79)],
    [midi(74), midi(76), midi(79), midi(81), midi(79), midi(76), midi(74), null]
  ];

  const bars = Math.ceil(durationSec / bar);
  for (let b = 0; b < bars; b++) {
    const at = b * bar;
    if (at >= durationSec) break;
    const chord = chords[b % chords.length];
    const groove = at >= intro ? 1 : 0.15;

    if (at + beat * 0 >= intro - 0.05) addKick(drumsL, drumsR, duck, Math.floor((at + beat * 0) * SR));
    if (at + beat * 2 >= intro) {
      addNoise(drumsL, drumsR, Math.floor((at + beat * 2) * SR), 0.16, 0.22, 0.35, 0.5);
      addTone(drumsL, drumsR, Math.floor((at + beat * 2) * SR), 188, 0.12, 0.12, 0.002, 0.08, 0.5);
    }
    for (let e = 0; e < 8; e++) {
      const hatAt = at + (beat / 2) * e;
      if (hatAt >= durationSec) break;
      const accent = e % 2 === 0 ? 0.045 : 0.028;
      addNoise(drumsL, drumsR, Math.floor(hatAt * SR), 0.04, accent * (at < intro ? 0.45 : 1), 0.08, e % 2 ? 0.62 : 0.38);
    }

    const bassGain = 0.22 * groove;
    if (bassGain > 0.02) {
      addTone(musicL, musicR, Math.floor(at * SR), chord.bass, beat * 1.8, bassGain, 0.015, 0.12, 0.5);
      addTone(musicL, musicR, Math.floor(at * SR), chord.bass / 2, beat * 1.6, bassGain * 0.45, 0.02, 0.14, 0.5);
      addTone(musicL, musicR, Math.floor((at + beat * 2) * SR), chord.bass * 1.5, beat * 1.4, bassGain * 0.55, 0.012, 0.1, 0.5);
    }

    for (const note of chord.notes) {
      for (const det of [-7, 0, 8]) {
        const freq = note * Math.pow(2, det / 1200);
        const pan = det < 0 ? 0.28 : det > 0 ? 0.72 : 0.5;
        addTone(musicL, musicR, Math.floor(at * SR), freq, bar * 0.96, 0.045, 0.28, 0.35, pan);
      }
      if (groove > 0.5) {
        addTone(musicL, musicR, Math.floor(at * SR), note * 2, 0.18, 0.05, 0.004, 0.08, 0.42);
        addTone(musicL, musicR, Math.floor((at + beat * 2.5) * SR), note * 2, 0.14, 0.035, 0.004, 0.06, 0.58);
      }
    }

    const motif = motifs[b % motifs.length];
    motif.forEach((freq, step) => {
      if (!freq || groove < 0.5) return;
      const when = at + (beat / 2) * step;
      if (when >= durationSec - 0.2) return;
      addTone(musicL, musicR, Math.floor(when * SR), freq, 0.22, 0.07, 0.004, 0.12, 0.66);
      addTone(musicL, musicR, Math.floor(when * SR), freq * 2, 0.12, 0.02, 0.003, 0.08, 0.7);
    });
  }

  const left = new Float32Array(n);
  const right = new Float32Array(n);
  let peak = 0;
  const tail = Math.floor(SR * 1.6);
  for (let i = 0; i < n; i++) {
    const sc = 1 - duck[i] * 0.62;
    const end = i > n - tail ? (n - i) / tail : 1;
    let l = (drumsL[i] + musicL[i] * sc) * end;
    let r = (drumsR[i] + musicR[i] * sc) * end;
    const d1 = Math.floor(0.11 * SR);
    const d2 = Math.floor(0.19 * SR);
    if (i >= d1) {
      l += musicL[i - d1] * sc * 0.16;
      r += musicR[i - d1] * sc * 0.2;
    }
    if (i >= d2) {
      l += musicL[i - d2] * sc * 0.08;
      r += musicR[i - d2] * sc * 0.1;
    }
    l = Math.tanh(l * 1.35);
    r = Math.tanh(r * 1.35);
    left[i] = l;
    right[i] = r;
    peak = Math.max(peak, Math.abs(l), Math.abs(r));
  }
  const norm = peak > 0 ? 0.9 / peak : 1;
  let sum = 0;
  const data = Buffer.alloc(44 + n * 4);
  data.write("RIFF", 0);
  data.writeUInt32LE(36 + n * 4, 4);
  data.write("WAVE", 8);
  data.write("fmt ", 12);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(2, 22);
  data.writeUInt32LE(SR, 24);
  data.writeUInt32LE(SR * 4, 28);
  data.writeUInt16LE(4, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    const l = left[i] * norm;
    const r = right[i] * norm;
    sum += l * l + r * r;
    data.writeInt16LE(Math.max(-32767, Math.min(32767, (l * 32767) | 0)), 44 + i * 4);
    data.writeInt16LE(Math.max(-32767, Math.min(32767, (r * 32767) | 0)), 46 + i * 4);
  }
  await writeFile(file, data);
  const rms = Math.sqrt(sum / (n * 2));
  console.log("music", file, "peak", peak.toFixed(3), "rms", rms.toFixed(3));
}
