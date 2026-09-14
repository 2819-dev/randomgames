"use client";

let ctx: AudioContext | null = null;

function audio() {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      ctx = new AC();
    }
    return ctx;
  } catch {
    return null;
  }
}

export function beep(freq = 440, duration = 0.08, type: OscillatorType = "square", gain = 0.04) {
  try {
    const ac = audio();
    if (!ac) return;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g);
    g.connect(ac.destination);
    const now = ac.currentTime;
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.start(now);
    osc.stop(now + duration);
  } catch {
    /* audio optional */
  }
}

export function playWin() {
  [523, 659, 784, 1046].forEach((f, i) => {
    window.setTimeout(() => beep(f, 0.12, "triangle", 0.05), i * 90);
  });
}

export function playBonk() {
  beep(120, 0.15, "sawtooth", 0.05);
}

export function playTap() {
  beep(660, 0.05, "square", 0.03);
}
