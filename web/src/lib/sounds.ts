// Sound effects utility using Web Audio API

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

// Generate a beep sound
export function playBeep(frequency: number = 440, duration: number = 0.15, volume: number = 0.3) {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = 'square';

  gainNode.gain.setValueAtTime(volume, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

// Countdown beeps (3, 2, 1)
export function playCountdownBeep(number: number) {
  if (number === 0) {
    // "FIGHT!" - higher pitch fanfare
    playBeep(880, 0.1, 0.4);
    setTimeout(() => playBeep(1100, 0.15, 0.4), 100);
    setTimeout(() => playBeep(1320, 0.3, 0.5), 200);
  } else {
    // Regular countdown beep
    playBeep(440 + (3 - number) * 100, 0.2, 0.3);
  }
}

// Sword hit sound
export function playSwordHit() {
  const ctx = getAudioContext();

  // Create noise for metallic sound
  const bufferSize = ctx.sampleRate * 0.1;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  // High-pass filter for metallic sound
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 2000;

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

  noise.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  noise.start();
}

// Hurt sound (ouw!)
export function playHurtSound() {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  // Descending tone for "ouw" sound
  oscillator.frequency.setValueAtTime(400, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
  oscillator.type = 'sawtooth';

  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.25);
}

// Victory fanfare
export function playVictorySound() {
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    setTimeout(() => playBeep(freq, 0.2, 0.4), i * 150);
  });
  // Final chord
  setTimeout(() => {
    playBeep(523, 0.5, 0.3);
    playBeep(659, 0.5, 0.3);
    playBeep(784, 0.5, 0.3);
    playBeep(1047, 0.5, 0.4);
  }, 600);
}

// Sad trombone (wah wah wah waaah)
export function playDefeatSound() {
  const ctx = getAudioContext();

  const playNote = (startFreq: number, endFreq: number, startTime: number, duration: number) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(startFreq, ctx.currentTime + startTime);
    oscillator.frequency.linearRampToValueAtTime(endFreq, ctx.currentTime + startTime + duration);
    oscillator.type = 'sawtooth';

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime + startTime);
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime + startTime + duration * 0.8);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);

    oscillator.start(ctx.currentTime + startTime);
    oscillator.stop(ctx.currentTime + startTime + duration);
  };

  // Wah wah wah waaaaaah
  playNote(293, 277, 0, 0.3);      // D4 -> C#4
  playNote(277, 261, 0.35, 0.3);   // C#4 -> C4
  playNote(261, 247, 0.7, 0.3);    // C4 -> B3
  playNote(247, 185, 1.05, 0.8);   // B3 -> F#3 (long sad note)
}

// Block sound
export function playBlockSound() {
  const ctx = getAudioContext();

  const bufferSize = ctx.sampleRate * 0.05;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);

  noise.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  noise.start();
}

// Miss/dodge sound (whoosh)
export function playDodgeSound() {
  const ctx = getAudioContext();

  const bufferSize = ctx.sampleRate * 0.15;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    const t = i / ctx.sampleRate;
    data[i] = (Math.random() * 2 - 1) * Math.sin(t * 20) * Math.exp(-t * 10);
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1000;
  filter.Q.value = 0.5;

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0.2, ctx.currentTime);

  noise.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  noise.start();
}
