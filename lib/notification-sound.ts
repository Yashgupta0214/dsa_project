// Synthetic Web Audio API Notification Chime & Mention Sound
// Generates authentic Discord-style pleasant ping and distinct high-priority mention chimes

export const playNotificationSound = () => {
  if (typeof window === "undefined") return;

  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Harmonic 1 - High bell tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now); // E5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    // Harmonic 2 - Body shimmer
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(440, now); // A4
    osc2.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5

    gain2.gain.setValueAtTime(0.18, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);

    osc1.stop(now + 0.36);
    osc2.stop(now + 0.36);
  } catch (err) {
    console.warn("Failed to play synthetic notification sound:", err);
  }
};

export const playMentionSound = () => {
  if (typeof window === "undefined") return;

  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Distinct triple-ping mention chime for @mentions
    [0, 0.1, 0.2].forEach((delay, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const freq = index === 0 ? 587.33 : index === 1 ? 880.0 : 1174.66; // D5, A5, D6
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0.3, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.26);
    });
  } catch (err) {
    console.warn("Failed to play mention sound:", err);
  }
};

// =========================================================================
// Real-time Synthetic Call Ringtone Synthesizer (Discord Style)
// =========================================================================
let ringtoneInterval: ReturnType<typeof setInterval> | null = null;
let ringtoneAudioCtx: AudioContext | null = null;
let ringtoneMasterGain: GainNode | null = null;

export const startRingtone = () => {
  if (typeof window === "undefined") return;
  stopRingtone();

  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    ringtoneAudioCtx = new AudioContextClass();
    if (ringtoneAudioCtx.state === "suspended") {
      ringtoneAudioCtx.resume().catch(() => {});
    }

    ringtoneMasterGain = ringtoneAudioCtx.createGain();
    ringtoneMasterGain.gain.setValueAtTime(0.32, ringtoneAudioCtx.currentTime);
    ringtoneMasterGain.connect(ringtoneAudioCtx.destination);

    const playChimePattern = () => {
      if (!ringtoneAudioCtx || !ringtoneMasterGain) return;
      if (ringtoneAudioCtx.state === "suspended") {
        ringtoneAudioCtx.resume().catch(() => {});
      }

      const ctx = ringtoneAudioCtx;
      const now = ctx.currentTime;

      // Authentic Discord incoming call melodic chime pattern
      // Sequence: C5 -> E5 -> G5 -> C6 -> G5 -> E5 (arpeggiated lush synth chime)
      const notes = [
        { freq: 523.25, time: 0.0, dur: 0.16 },   // C5
        { freq: 659.25, time: 0.15, dur: 0.16 },  // E5
        { freq: 783.99, time: 0.30, dur: 0.18 },  // G5
        { freq: 1046.5, time: 0.48, dur: 0.35 },  // C6
        { freq: 783.99, time: 0.85, dur: 0.18 },  // G5
        { freq: 659.25, time: 1.05, dur: 0.40 }   // E5
      ];

      notes.forEach(({ freq, time, dur }) => {
        try {
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.type = "sine";
          osc1.frequency.setValueAtTime(freq, now + time);

          // Attack - Decay envelope
          gain1.gain.setValueAtTime(0.001, now + time);
          gain1.gain.linearRampToValueAtTime(0.28, now + time + 0.02);
          gain1.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

          // Harmonic shimmer (triangle wave 1 octave up)
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = "triangle";
          osc2.frequency.setValueAtTime(freq * 2, now + time);

          gain2.gain.setValueAtTime(0.001, now + time);
          gain2.gain.linearRampToValueAtTime(0.08, now + time + 0.02);
          gain2.gain.exponentialRampToValueAtTime(0.001, now + time + dur * 0.7);

          osc1.connect(gain1);
          gain1.connect(ringtoneMasterGain!);

          osc2.connect(gain2);
          gain2.connect(ringtoneMasterGain!);

          osc1.start(now + time);
          osc1.stop(now + time + dur + 0.05);

          osc2.start(now + time);
          osc2.stop(now + time + dur + 0.05);
        } catch {
          // ignore individual note errors
        }
      });
    };

    playChimePattern();
    ringtoneInterval = setInterval(playChimePattern, 2400);
  } catch (err) {
    console.warn("Failed to start incoming ringtone:", err);
  }
};

export const stopRingtone = () => {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  if (ringtoneMasterGain && ringtoneAudioCtx) {
    try {
      ringtoneMasterGain.gain.linearRampToValueAtTime(
        0.001,
        ringtoneAudioCtx.currentTime + 0.08
      );
      const ctxToClose = ringtoneAudioCtx;
      setTimeout(() => {
        if (ctxToClose && ctxToClose.state !== "closed") {
          ctxToClose.close().catch(() => {});
        }
      }, 100);
    } catch {
      // ignore cleanup errors
    } finally {
      ringtoneAudioCtx = null;
      ringtoneMasterGain = null;
    }
  }
};

export const playCallEndSound = () => {
  if (typeof window === "undefined") return;

  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.25);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  } catch (err) {
    console.warn("Failed to play call end sound:", err);
  }
};
