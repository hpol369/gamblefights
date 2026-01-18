// Sound effects utility - supports real audio files with Web Audio API fallback

let audioContext: AudioContext | null = null;
const audioCache: Map<string, HTMLAudioElement> = new Map();

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

// Preload and cache audio files
function loadAudio(src: string): HTMLAudioElement | null {
  if (audioCache.has(src)) {
    const cached = audioCache.get(src)!;
    // Clone for overlapping sounds
    return cached.cloneNode() as HTMLAudioElement;
  }

  try {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audioCache.set(src, audio);
    return audio;
  } catch {
    return null;
  }
}

// Play audio file or fallback to synth
function playAudioOrFallback(src: string, fallback: () => void, volume: number = 0.5) {
  const audio = loadAudio(src);
  if (audio) {
    audio.volume = volume;
    audio.play().catch(() => fallback());
  } else {
    fallback();
  }
}

// ============================================
// COUNTDOWN SOUNDS
// ============================================

export function playCountdownBeep(number: number) {
  if (number === 0) {
    playAudioOrFallback('/sounds/fight.mp3', () => synthFightFanfare(), 0.6);
  } else {
    playAudioOrFallback('/sounds/beep.mp3', () => synthCountdownBeep(number), 0.4);
  }
}

function synthCountdownBeep(number: number) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  // Epic timpani-like sound
  osc.frequency.setValueAtTime(150 + number * 50, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);
  osc.type = 'triangle';

  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);

  // Add a click for punch
  const click = ctx.createOscillator();
  const clickGain = ctx.createGain();
  click.connect(clickGain);
  clickGain.connect(ctx.destination);
  click.frequency.value = 1000;
  click.type = 'square';
  clickGain.gain.setValueAtTime(0.2, ctx.currentTime);
  clickGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.02);
  click.start(ctx.currentTime);
  click.stop(ctx.currentTime + 0.02);
}

function synthFightFanfare() {
  const ctx = getAudioContext();
  const notes = [392, 523, 659, 784]; // G4, C5, E5, G5 - triumphant

  notes.forEach((freq, i) => {
    setTimeout(() => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    }, i * 80);
  });

  // Final brass chord
  setTimeout(() => {
    [523, 659, 784].forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    });
  }, 350);
}

// ============================================
// COMBAT SOUNDS
// ============================================

export function playSwordHit() {
  playAudioOrFallback('/sounds/sword-hit.mp3', synthSwordHit, 0.5);
}

function synthSwordHit() {
  const ctx = getAudioContext();

  // Metallic clang
  const bufferSize = ctx.sampleRate * 0.15;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    const t = i / ctx.sampleRate;
    // Combine noise with resonant frequency for metallic sound
    data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 20) * 0.5 +
              Math.sin(t * 3000) * Math.exp(-t * 30) * 0.5;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 3000;
  filter.Q.value = 5;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.5, ctx.currentTime);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start();

  // Add low thump for impact
  const thump = ctx.createOscillator();
  const thumpGain = ctx.createGain();
  thump.connect(thumpGain);
  thumpGain.connect(ctx.destination);
  thump.frequency.setValueAtTime(150, ctx.currentTime);
  thump.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
  thump.type = 'sine';
  thumpGain.gain.setValueAtTime(0.4, ctx.currentTime);
  thumpGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
  thump.start(ctx.currentTime);
  thump.stop(ctx.currentTime + 0.1);
}

export function playHurtSound() {
  playAudioOrFallback('/sounds/hurt.mp3', synthHurtSound, 0.4);
}

function synthHurtSound() {
  const ctx = getAudioContext();

  // Grunt-like sound with formants
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.frequency.setValueAtTime(120, ctx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);
  osc1.type = 'sawtooth';

  osc2.frequency.setValueAtTime(240, ctx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.15);
  osc2.type = 'sawtooth';

  gain.gain.setValueAtTime(0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

  osc1.start(ctx.currentTime);
  osc2.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.15);
  osc2.stop(ctx.currentTime + 0.15);
}

export function playBlockSound() {
  playAudioOrFallback('/sounds/block.mp3', synthBlockSound, 0.5);
}

function synthBlockSound() {
  const ctx = getAudioContext();

  // Heavy thud for shield block
  const bufferSize = ctx.sampleRate * 0.08;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    const t = i / ctx.sampleRate;
    data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 40) +
              Math.sin(t * 200) * Math.exp(-t * 25) * 0.8;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 500;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.5, ctx.currentTime);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start();
}

export function playDodgeSound() {
  playAudioOrFallback('/sounds/whoosh.mp3', synthDodgeSound, 0.4);
}

function synthDodgeSound() {
  const ctx = getAudioContext();

  // Swoosh sound
  const bufferSize = ctx.sampleRate * 0.2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    const t = i / ctx.sampleRate;
    const envelope = Math.sin(t * Math.PI / 0.2); // Bell curve
    data[i] = (Math.random() * 2 - 1) * envelope * 0.3;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(500, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.1);
  filter.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.2);
  filter.Q.value = 1;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, ctx.currentTime);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start();
}

// ============================================
// RESULT SOUNDS
// ============================================

export function playVictorySound() {
  playAudioOrFallback('/sounds/victory.mp3', synthVictorySound, 0.6);
}

function synthVictorySound() {
  const ctx = getAudioContext();

  // Epic orchestral victory fanfare
  const playChord = (frequencies: number[], startTime: number, duration: number, volume: number) => {
    frequencies.forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + startTime + 0.05);
      gain.gain.setValueAtTime(volume, ctx.currentTime + startTime + duration - 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);
      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    });
  };

  // Triumphant progression
  playChord([262, 330, 392], 0, 0.3, 0.2);     // C major
  playChord([294, 370, 440], 0.3, 0.3, 0.2);   // D major
  playChord([330, 415, 494], 0.6, 0.3, 0.25);  // E major
  playChord([392, 494, 587, 784], 0.9, 0.8, 0.3); // G major (full)
}

export function playDefeatSound() {
  playAudioOrFallback('/sounds/defeat.mp3', synthDefeatSound, 0.5);
}

function synthDefeatSound() {
  const ctx = getAudioContext();

  // Sad descending trombone
  const playNote = (startFreq: number, endFreq: number, startTime: number, duration: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(startFreq, ctx.currentTime + startTime);
    osc.frequency.linearRampToValueAtTime(endFreq, ctx.currentTime + startTime + duration);
    osc.type = 'sawtooth';

    gain.gain.setValueAtTime(0.25, ctx.currentTime + startTime);
    gain.gain.setValueAtTime(0.25, ctx.currentTime + startTime + duration * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);

    osc.start(ctx.currentTime + startTime);
    osc.stop(ctx.currentTime + startTime + duration);
  };

  // Classic "wah wah wah waaaaah"
  playNote(293, 277, 0, 0.25);
  playNote(277, 262, 0.3, 0.25);
  playNote(262, 247, 0.6, 0.25);
  playNote(247, 165, 0.9, 1.0); // Long sad final note
}

// ============================================
// COIN SOUNDS (for wagering)
// ============================================

export function playCoinSound() {
  playAudioOrFallback('/sounds/coins.mp3', synthCoinSound, 0.4);
}

function synthCoinSound() {
  const ctx = getAudioContext();

  // Metallic coin jingle
  const frequencies = [2000, 2500, 3000, 2200, 2800];
  frequencies.forEach((freq, i) => {
    setTimeout(() => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    }, i * 50);
  });
}
