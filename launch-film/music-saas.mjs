// Bright "modern SaaS" bed: airy maj7/9 chords with sidechain pump, plucky 16th
// arpeggio, soft four-on-the-floor, shaker, plus a whoosh into every scene change
// and an impact on the final scene. Everything is synthesized, so no licensing.
import { writeFile } from "node:fs/promises";

const SR = 44100;
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// deterministic noise so re-renders sound identical
let seed = 1234567;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

function addVoice(L, R, at, freq, dur, gain, { attack = 0.005, decay = 0, harmonics = 1, bright = 1, pan = 0.5 } = {}) {
  const from = Math.max(0, Math.floor(at * SR));
  const len = Math.min(L.length - from, Math.floor(dur * SR));
  const lg = Math.cos((pan * Math.PI) / 2), rg = Math.sin((pan * Math.PI) / 2);
  const release = Math.min(0.12, dur * 0.4);
  for (let i = 0; i < len; i += 1) {
    const t = i / SR;
    let env = Math.min(1, t / attack) * Math.min(1, (dur - t) / release);
    if (decay > 0) env *= Math.exp(-t / decay);
    let s = 0;
    for (let k = 1; k <= harmonics; k += 1) {
      // higher partials die faster: a cheap low-pass "pluck"
      const hk = Math.exp(-t * (k - 1) * (6 / bright));
      s += (Math.sin(2 * Math.PI * freq * k * t) / k) * hk;
    }
    s *= env * gain;
    L[from + i] += s * lg;
    R[from + i] += s * rg;
  }
}

function addNoise(L, R, at, dur, gain, { hp = 0.5, shape = "decay", pan = 0.5, sweep = false } = {}) {
  const from = Math.max(0, Math.floor(at * SR));
  const len = Math.min(L.length - from, Math.floor(dur * SR));
  const lg = Math.cos((pan * Math.PI) / 2), rg = Math.sin((pan * Math.PI) / 2);
  let prev = 0, hpOut = 0, lp = 0;
  for (let i = 0; i < len; i += 1) {
    const t = i / SR, p = t / dur;
    const env = shape === "rise" ? Math.pow(p, 2.2) * (p > 0.96 ? (1 - p) / 0.04 : 1) : Math.exp(-t / Math.max(0.01, dur * 0.35));
    const w = rnd() * 2 - 1;
    hpOut = hp * hpOut + (1 - hp) * (w - prev);
    prev = w;
    const cut = sweep ? 0.02 + 0.5 * p * p : 1;
    lp += cut * (hpOut - lp);
    const s = (sweep ? lp : hpOut) * env * gain;
    L[from + i] += s * lg;
    R[from + i] += s * rg;
  }
}

function addKick(L, R, duck, at, gain = 0.8) {
  const from = Math.max(0, Math.floor(at * SR));
  const len = Math.min(L.length - from, Math.floor(0.28 * SR));
  let ph = 0;
  for (let i = 0; i < len; i += 1) {
    const t = i / SR;
    ph += (2 * Math.PI * (140 * Math.exp(-t * 30) + 46)) / SR;
    const s = Math.sin(ph) * Math.exp(-t * 9) * gain;
    L[from + i] += s;
    R[from + i] += s;
    const d = Math.exp(-t * 6);
    if (d > duck[from + i]) duck[from + i] = d;
  }
}

// small Schroeder reverb for the "air" around pads and plucks
function reverb(input, sizes, mix) {
  const out = new Float32Array(input.length);
  const combs = sizes.map((d) => ({ buf: new Float32Array(d), i: 0, fb: 0.78 }));
  const aps = [347, 113].map((d) => ({ buf: new Float32Array(d), i: 0 }));
  for (let n = 0; n < input.length; n += 1) {
    let s = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.buf[c.i] = input[n] + y * c.fb;
      c.i = (c.i + 1) % c.buf.length;
      s += y;
    }
    s /= combs.length;
    for (const a of aps) {
      const y = a.buf[a.i];
      const x = s + y * 0.5;
      a.buf[a.i] = x;
      a.i = (a.i + 1) % a.buf.length;
      s = y - x * 0.5;
    }
    out[n] = input[n] + s * mix;
  }
  return out;
}

// Each style is a full arrangement: tempo, harmony, instrument timbres and a
// 16-step drum/bass grid. Every reel gets its own style so they don't sound alike.
// Grids are 16ths within one bar: "x" = hit, "." = rest.
const steps = (s) => [...s].map((c, i) => (c === "x" ? i : -1)).filter((i) => i >= 0);
export const STYLES = {
  // the original bed (ig-01, ig-02, ig-04): Fmaj9 - Am7 - Dm9 - Bbmaj7(#11)
  bright: {
    bpm: 122,
    prog: [
      { bass: 41, pad: [57, 60, 64, 67], arp: [65, 69, 72, 76, 79, 76, 72, 69] },
      { bass: 45, pad: [57, 60, 64, 67], arp: [64, 67, 72, 76, 79, 76, 72, 67] },
      { bass: 38, pad: [57, 60, 62, 65], arp: [62, 65, 69, 72, 76, 72, 69, 65] },
      { bass: 46, pad: [57, 58, 62, 65], arp: [62, 65, 69, 70, 74, 70, 69, 65] }
    ],
    pad: { gain: 0.032, harmonics: 3, bright: 3, attack: 0.06 },
    arp: { every: 1, gain: 0.05, harmonics: 5, bright: 1.2, decay: 0.09, len: 0.22, lift: 12 },
    bass: { steps: steps("x...x...x...x..."), gain: 0.2, harmonics: 2, len: 0.9 },
    kick: steps("x...x...x...x..."), snare: steps("....x.......x..."), hat: steps("xxxxxxxxxxxxxxxx"),
    hatGain: 0.035, swing: 0, pump: 0.7, reverb: 0.55
  },
  // warm lo-fi: Dm9 - G13 - Cmaj9 - A7(b9), swung hats, soft e-piano, vinyl crackle
  lofi: {
    bpm: 84,
    prog: [
      { bass: 38, pad: [53, 57, 60, 64], arp: [69, 72, 76, 72, 69, 65, 64, 65] },
      { bass: 43, pad: [53, 59, 64, 65], arp: [71, 74, 76, 74, 71, 67, 65, 67] },
      { bass: 36, pad: [52, 55, 59, 62], arp: [67, 71, 74, 71, 67, 64, 62, 64] },
      { bass: 45, pad: [55, 58, 61, 64], arp: [69, 73, 76, 73, 70, 67, 64, 61] }
    ],
    pad: { gain: 0.045, harmonics: 2, bright: 1.2, attack: 0.02 },
    arp: { every: 2, gain: 0.055, harmonics: 3, bright: 0.8, decay: 0.25, len: 0.6, lift: 0 },
    bass: { steps: steps("x......x..x....."), gain: 0.24, harmonics: 1, len: 1.6 },
    kick: steps("x......x..x....."), snare: steps("....x.......x..."), hat: steps("x.x.x.x.x.x.x.x."),
    hatGain: 0.03, swing: 0.33, pump: 0.25, reverb: 0.4, crackle: 0.012
  },
  // darker driving future-house: Am9 - Fmaj7 - C - G, off-beat bass, bright saw plucks
  drive: {
    bpm: 126,
    prog: [
      { bass: 45, pad: [57, 60, 64, 71], arp: [69, 72, 76, 79, 81, 79, 76, 72] },
      { bass: 41, pad: [57, 60, 64, 65], arp: [65, 69, 72, 76, 77, 76, 72, 69] },
      { bass: 48, pad: [55, 60, 64, 67], arp: [64, 67, 72, 76, 79, 76, 72, 67] },
      { bass: 43, pad: [55, 59, 62, 67], arp: [62, 67, 71, 74, 79, 74, 71, 67] }
    ],
    pad: { gain: 0.026, harmonics: 7, bright: 2, attack: 0.1 },
    arp: { every: 2, gain: 0.06, harmonics: 9, bright: 0.7, decay: 0.07, len: 0.2, lift: 12 },
    bass: { steps: steps("..x...x...x...x."), gain: 0.22, harmonics: 4, len: 0.45 },
    kick: steps("x...x...x...x..."), snare: steps("....x.......x..."), hat: steps("..x...x...x...x."),
    hatGain: 0.06, swing: 0, pump: 0.85, reverb: 0.45, clap: true
  },
  // sunny tropical: Ebmaj7 - Cm7 - Abmaj7 - Bb6, marimba plucks, syncopated groove
  tropical: {
    bpm: 108,
    prog: [
      { bass: 39, pad: [55, 58, 62, 63], arp: [75, 70, 74, 70, 79, 74, 70, 67] },
      { bass: 36, pad: [55, 58, 60, 63], arp: [72, 67, 70, 67, 75, 70, 67, 63] },
      { bass: 44, pad: [55, 60, 63, 67], arp: [72, 68, 75, 68, 79, 75, 72, 68] },
      { bass: 46, pad: [55, 58, 62, 65], arp: [74, 70, 77, 70, 79, 77, 74, 70] }
    ],
    pad: { gain: 0.022, harmonics: 2, bright: 2, attack: 0.15 },
    arp: { gain: 0.07, harmonics: 4, bright: 0.35, decay: 0.12, len: 0.35, lift: 0, pattern: steps("x..x..x...x..x..") },
    bass: { steps: steps("x..x..x.x..x..x."), gain: 0.2, harmonics: 1, len: 0.5 },
    kick: steps("x...x...x...x..."), snare: steps("...x..x....x..x."), hat: steps("xxxxxxxxxxxxxxxx"),
    hatGain: 0.03, swing: 0.12, pump: 0.4, reverb: 0.5
  },
  // cinematic build for longer story reels: Cm - Ab - Eb - Bb, half-time, strings + toms
  epic: {
    bpm: 92,
    prog: [
      { bass: 36, pad: [55, 60, 63, 67], arp: [72, 75, 79, 75, 72, 67, 63, 67] },
      { bass: 44, pad: [56, 60, 63, 68], arp: [72, 75, 80, 75, 72, 68, 63, 68] },
      { bass: 39, pad: [55, 58, 63, 67], arp: [70, 75, 79, 75, 70, 67, 63, 67] },
      { bass: 46, pad: [53, 58, 62, 65], arp: [70, 74, 77, 74, 70, 65, 62, 65] }
    ],
    pad: { gain: 0.04, harmonics: 6, bright: 4, attack: 0.5 },
    arp: { every: 2, gain: 0.06, harmonics: 4, bright: 1, decay: 0.4, len: 0.9, lift: 12 },
    bass: { steps: steps("x.......x......."), gain: 0.26, harmonics: 3, len: 3.5 },
    kick: steps("x.........x....."), snare: steps("........x......."), hat: steps("x...x...x...x..."),
    hatGain: 0.025, swing: 0, pump: 0.35, reverb: 0.75, toms: true
  },
  // playful funk-pop: C6 - Am7 - Dm7 - G9, staccato chord stabs on the off-beats
  funk: {
    bpm: 114,
    prog: [
      { bass: 36, pad: [60, 64, 67, 69], arp: [72, 76, 79, 81, 79, 76, 72, 76] },
      { bass: 45, pad: [60, 64, 67, 69], arp: [69, 72, 76, 79, 76, 72, 69, 72] },
      { bass: 38, pad: [60, 62, 65, 69], arp: [69, 72, 74, 77, 74, 72, 69, 72] },
      { bass: 43, pad: [59, 62, 65, 69], arp: [67, 71, 74, 77, 74, 71, 67, 71] }
    ],
    pad: { gain: 0.05, harmonics: 4, bright: 1, attack: 0.004, stabs: steps("..x...x..x.x..x.") },
    arp: { every: 4, gain: 0.05, harmonics: 3, bright: 1, decay: 0.15, len: 0.35, lift: 0 },
    bass: { steps: steps("x..x..x.xx.x..x."), gain: 0.24, harmonics: 3, len: 0.35, octaves: true },
    kick: steps("x.....x.x......."), snare: steps("....x.......x..."), hat: steps("x.xxx.xxx.xxx.xx"),
    hatGain: 0.04, swing: 0.08, pump: 0.3, reverb: 0.3, clap: true
  },
  // breezy chill-pop: Gmaj7 - Em9 - Cmaj9 - D6sus, airy plucks on a dotted rhythm
  chill: {
    bpm: 98,
    prog: [
      { bass: 43, pad: [59, 62, 66, 69], arp: [74, 78, 81, 78, 74, 71, 74, 78] },
      { bass: 40, pad: [59, 62, 66, 67], arp: [71, 74, 78, 74, 71, 67, 71, 74] },
      { bass: 36, pad: [59, 62, 64, 67], arp: [71, 74, 76, 79, 76, 74, 71, 67] },
      { bass: 38, pad: [57, 62, 66, 67], arp: [69, 74, 76, 78, 76, 74, 69, 66] }
    ],
    pad: { gain: 0.03, harmonics: 3, bright: 2.5, attack: 0.25 },
    arp: { gain: 0.06, harmonics: 3, bright: 0.9, decay: 0.18, len: 0.45, lift: 0, pattern: steps("x..x..x.x..x..x.") },
    bass: { steps: steps("x.....x...x....."), gain: 0.22, harmonics: 1, len: 1.2 },
    kick: steps("x.....x...x....."), snare: steps("....x.......x..."), hat: steps("..x...x...x...x."),
    hatGain: 0.035, swing: 0.15, pump: 0.45, reverb: 0.6, clap: true
  },
  // night-drive synthwave: Am - F - C - G, rolling 8th bass, wide detuned pads, slow arp
  night: {
    bpm: 104,
    prog: [
      { bass: 45, pad: [57, 60, 64, 69], arp: [69, 72, 76, 81, 76, 72, 69, 64] },
      { bass: 41, pad: [57, 60, 65, 69], arp: [65, 69, 72, 77, 72, 69, 65, 60] },
      { bass: 48, pad: [55, 60, 64, 67], arp: [67, 72, 76, 79, 76, 72, 67, 64] },
      { bass: 43, pad: [55, 59, 62, 67], arp: [67, 71, 74, 79, 74, 71, 67, 62] }
    ],
    pad: { gain: 0.034, harmonics: 8, bright: 3, attack: 0.35 },
    arp: { every: 2, gain: 0.045, harmonics: 6, bright: 0.9, decay: 0.2, len: 0.4, lift: 12 },
    bass: { steps: steps("x.x.x.x.x.x.x.x."), gain: 0.2, harmonics: 5, len: 0.4, octaves: true },
    kick: steps("x.......x......."), snare: steps("....x.......x..."), hat: steps("x.x.x.x.x.x.x.x."),
    hatGain: 0.025, swing: 0, pump: 0.6, reverb: 0.8
  },
  // market-day afro-pop: Bb - Gm7 - Ebmaj7 - F, log-drum plucks, busy shaker, off-beat claps
  afro: {
    bpm: 106,
    prog: [
      { bass: 46, pad: [58, 62, 65, 69], arp: [70, 74, 77, 74, 82, 77, 74, 70] },
      { bass: 43, pad: [58, 62, 65, 67], arp: [67, 70, 74, 70, 79, 74, 70, 67] },
      { bass: 39, pad: [58, 62, 63, 67], arp: [67, 70, 75, 70, 79, 75, 70, 67] },
      { bass: 41, pad: [57, 60, 65, 69], arp: [69, 72, 77, 72, 81, 77, 72, 69] }
    ],
    pad: { gain: 0.02, harmonics: 2, bright: 2, attack: 0.2 },
    arp: { gain: 0.075, harmonics: 2, bright: 0.25, decay: 0.09, len: 0.25, lift: 0, pattern: steps("x.xx..x.x.x..xx.") },
    bass: { steps: steps("x..x...xx..x...."), gain: 0.26, harmonics: 1, len: 0.6 },
    kick: steps("x...x...x...x..."), snare: steps("...x..x....x..x."), hat: steps("xxxxxxxxxxxxxxxx"),
    hatGain: 0.045, swing: 0.2, pump: 0.3, reverb: 0.35, clap: true
  },
  // punchy electro-pop: Em9 - Cmaj7 - G - D/F#, fast 16th pluck arp, octave bass, hard sidechain
  electro: {
    bpm: 128,
    prog: [
      { bass: 40, pad: [59, 62, 66, 67], arp: [76, 79, 83, 86, 83, 79, 76, 71] },
      { bass: 36, pad: [59, 60, 64, 67], arp: [72, 76, 79, 83, 79, 76, 72, 67] },
      { bass: 43, pad: [59, 62, 67, 71], arp: [74, 79, 83, 86, 83, 79, 74, 71] },
      { bass: 42, pad: [57, 62, 66, 69], arp: [74, 78, 81, 86, 81, 78, 74, 69] }
    ],
    pad: { gain: 0.028, harmonics: 5, bright: 1.4, attack: 0.03 },
    arp: { gain: 0.06, harmonics: 3, bright: 1.2, decay: 0.07, len: 0.125, lift: 0, pattern: steps("xxxxxxxxxxxxxxxx") },
    bass: { steps: steps("x.x.x.x.x.x.x.xx"), gain: 0.22, harmonics: 3, len: 0.18 },
    kick: steps("x...x...x...x..."), snare: steps("....x.......x..."), hat: steps("..x...x...x...x."),
    hatGain: 0.05, swing: 0, pump: 0.9, reverb: 0.3, clap: true
  }
};

export async function writeSaasScore(file, durationSec, { hits = [], finale = null, style = "bright" } = {}) {
  const S = STYLES[style];
  if (!S) throw new Error(`unknown music style "${style}" (have: ${Object.keys(STYLES).join(", ")})`);
  const n = Math.floor(SR * durationSec);
  const dL = new Float32Array(n), dR = new Float32Array(n);
  const pL = new Float32Array(n), pR = new Float32Array(n);
  const fxL = new Float32Array(n), fxR = new Float32Array(n);
  const duck = new Float32Array(n);
  const beat = 60 / S.bpm, bar = beat * 4, six = beat / 4;
  // odd 16ths are pushed late by `swing` for a laid-back groove
  const stepAt = (barAt, s) => barAt + s * six + (s % 2 ? S.swing * six : 0);

  const introBars = 1;
  const bars = Math.ceil(durationSec / bar);
  for (let b = 0; b < bars; b += 1) {
    const at = b * bar;
    const c = S.prog[b % S.prog.length];
    const full = b >= introBars;
    const P = S.pad, B = S.bass, A = S.arp;

    if (P.stabs && full) {
      for (const s of P.stabs) for (const note of c.pad)
        addVoice(pL, pR, stepAt(at, s), midi(note), six * 1.2, P.gain * 0.8, { attack: P.attack, decay: 0.08, harmonics: P.harmonics, bright: P.bright, pan: 0.5 + ((note % 3) - 1) * 0.2 });
    } else {
      for (const note of c.pad) {
        for (const det of [-9, 0, 9]) {
          addVoice(pL, pR, at, midi(note) * Math.pow(2, det / 1200), bar, P.gain, { attack: P.attack, harmonics: P.harmonics, bright: P.bright, pan: det < 0 ? 0.25 : det > 0 ? 0.75 : 0.5 });
        }
      }
    }
    if (full) {
      B.steps.forEach((s, k) => {
        const oct = B.octaves && k % 2 ? 0 : -12;
        addVoice(pL, pR, stepAt(at, s), midi(c.bass + oct), Math.min(B.len * beat, bar - s * six), B.gain, { attack: 0.01, harmonics: B.harmonics, bright: 1.5 });
      });
    }
    const arpSteps = A.pattern ?? [...Array(16).keys()].filter((s) => s % A.every === 0);
    arpSteps.forEach((s, k) => {
      const when = stepAt(at, s);
      if (when > durationSec - 0.3) return;
      const note = c.arp[k % 8] + (s >= 8 && full ? A.lift : 0);
      const g = (full ? A.gain : A.gain * 0.6) * (s % 4 === 0 ? 1.2 : 1);
      addVoice(pL, pR, when, midi(note), A.len, g, { attack: 0.003, decay: A.decay, harmonics: A.harmonics, bright: A.bright, pan: k % 2 ? 0.68 : 0.32 });
    });
    for (const s of S.kick) {
      const when = stepAt(at, s);
      if (when > durationSec - 0.2) break;
      if (full) addKick(dL, dR, duck, when, 0.75);
      else if (s === 0) addKick(dL, dR, duck, when, 0.35);
    }
    if (full) for (const s of S.snare) {
      const when = stepAt(at, s);
      if (when > durationSec - 0.2) break;
      addNoise(dL, dR, when, S.clap ? 0.18 : 0.14, S.clap ? 0.2 : 0.16, { hp: S.clap ? 0.55 : 0.3, pan: 0.5 });
      addVoice(dL, dR, when, 210, 0.09, 0.07, { decay: 0.03 });
    }
    if (S.toms && full && b % 2 === 1) {
      [10, 12, 14].forEach((s, k) => addVoice(dL, dR, stepAt(at, s), [110, 90, 70][k], 0.4, 0.35, { decay: 0.14 }));
    }
    for (const s of S.hat) {
      const when = stepAt(at, s);
      if (when > durationSec - 0.1) break;
      addNoise(dL, dR, when, 0.035, (full ? S.hatGain : S.hatGain / 2) * (s % 4 === 2 ? 1.6 : s % 2 ? 0.7 : 1), { hp: 0.05, pan: s % 2 ? 0.7 : 0.3 });
    }
  }
  if (S.crackle) {
    for (let t = 0; t < durationSec; t += 0.02 + rnd() * 0.12) addNoise(dL, dR, t, 0.006, S.crackle * (0.5 + rnd()), { hp: 0.02, pan: rnd() });
  }

  for (const h of hits) {
    if (h < 0.5) continue;
    addNoise(fxL, fxR, h - 0.55, 0.55, 0.32, { hp: 0.2, shape: "rise", sweep: true, pan: 0.4 });
    addNoise(fxL, fxR, h - 0.55, 0.55, 0.32, { hp: 0.2, shape: "rise", sweep: true, pan: 0.6 });
    addVoice(fxL, fxR, h, 1046.5, 0.5, 0.03, { decay: 0.15, harmonics: 2 });
  }
  if (finale != null) {
    addNoise(fxL, fxR, finale - 1.1, 1.1, 0.4, { hp: 0.15, shape: "rise", sweep: true });
    addVoice(fxL, fxR, finale, 55, 1.6, 0.55, { decay: 0.5 });
    addNoise(fxL, fxR, finale, 1.4, 0.18, { hp: 0.6 });
  }

  const wetL = reverb(pL, [1557, 1617, 1491, 1422], S.reverb);
  const wetR = reverb(pR, [1580, 1640, 1514, 1445], S.reverb);
  const left = new Float32Array(n), right = new Float32Array(n);
  let peak = 0;
  const tail = Math.floor(SR * 1.8);
  for (let i = 0; i < n; i += 1) {
    const pump = 1 - duck[i] * S.pump;
    const end = i > n - tail ? (n - i) / tail : 1;
    left[i] = Math.tanh((dL[i] + wetL[i] * pump + fxL[i]) * 1.2) * end;
    right[i] = Math.tanh((dR[i] + wetR[i] * pump + fxR[i]) * 1.2) * end;
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  }
  const norm = peak > 0 ? 0.9 / peak : 1;
  const data = Buffer.alloc(44 + n * 4);
  data.write("RIFF", 0);
  data.writeUInt32LE(36 + n * 4, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(2, 22);
  data.writeUInt32LE(SR, 24);
  data.writeUInt32LE(SR * 4, 28);
  data.writeUInt16LE(4, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i += 1) {
    data.writeInt16LE(Math.max(-32767, Math.min(32767, (left[i] * norm * 32767) | 0)), 44 + i * 4);
    data.writeInt16LE(Math.max(-32767, Math.min(32767, (right[i] * norm * 32767) | 0)), 46 + i * 4);
  }
  await writeFile(file, data);
  console.log(`music (saas/${style})`, file);
}
