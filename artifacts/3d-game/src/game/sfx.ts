/**
 * Les sons du jeu, synthetises a la volee.
 *
 * Aucun fichier audio dans le depot : tout est genere par WebAudio a partir
 * d'oscillateurs, exactement comme la 3D est faite de primitives sans texture.
 * Le jeu gagne des retours sonores sans gagner un seul octet d'asset, et sans
 * dependance reseau — les outils de verification tournent hors ligne.
 *
 * Trois precautions, apprises a la dure sur les navigateurs mobiles :
 *
 * 1. Le contexte n'est cree qu'au premier geste du joueur. Le creer au
 *    chargement donne un contexte suspendu et, sur certains navigateurs, un
 *    avertissement en console.
 * 2. Tout est enveloppe : un navigateur sans WebAudio doit rendre le jeu
 *    silencieux, jamais casse.
 * 3. Chaque son a une enveloppe qui retombe a zero. Un gain laisse a zero pile
 *    produit un clic audible ; on descend vers 0.0001 en exponentiel.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

const MUTE_KEY = 'village-spatial-muted';

try {
  muted = typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1';
} catch {
  muted = false;
}

function ensureContext(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.32;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
  return ctx;
}

/** A appeler sur le premier geste du joueur — voir `App.tsx`. */
export function unlockAudio(): void {
  const c = ensureContext();
  if (c && c.state === 'suspended') void c.resume();
}

export function isMuted(): boolean {
  return muted;
}

export function toggleMute(): boolean {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.32;
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // navigation privee : le reglage ne survit pas a la session, tant pis
  }
  return muted;
}

type ToneOptions = {
  type?: OscillatorType;
  freq: number;
  /** Frequence d'arrivee pour un glissando. Absent = note tenue. */
  to?: number;
  duration: number;
  gain?: number;
  delay?: number;
};

function tone({ type = 'sine', freq, to, duration, gain = 0.5, delay = 0 }: ToneOptions): void {
  const c = ensureContext();
  if (!c || !master || muted) return;
  try {
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const env = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + duration);
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.02, duration * 0.2));
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(env);
    env.connect(master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  } catch {
    // Un son perdu ne doit jamais interrompre une image.
  }
}

/** Souffle blanc filtre — impacts, explosions, recolte. */
function noise(duration: number, gain: number, freq: number, delay = 0): void {
  const c = ensureContext();
  if (!c || !master || muted) return;
  try {
    const t0 = c.currentTime + delay;
    const frames = Math.max(1, Math.floor(c.sampleRate * duration));
    const buffer = c.createBuffer(1, frames, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, t0);
    filter.Q.value = 0.9;
    const env = c.createGain();
    env.gain.setValueAtTime(gain, t0);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter);
    filter.connect(env);
    env.connect(master);
    src.start(t0);
    src.stop(t0 + duration + 0.02);
  } catch {
    // idem
  }
}

// Anti-mitraillage : les tirs partent plusieurs fois par seconde, et empiler
// des dizaines d'oscillateurs sature le rendu autant que les oreilles.
const lastPlayed: Record<string, number> = {};
function throttled(key: string, minGap: number, play: () => void): void {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (now - (lastPlayed[key] || 0) < minGap) return;
  lastPlayed[key] = now;
  play();
}

export const sfx = {
  /** Recolte d'un gisement. */
  harvest: () => throttled('harvest', 80, () => {
    tone({ type: 'triangle', freq: 660, to: 1320, duration: 0.14, gain: 0.28 });
  }),

  /** Impact d'un tir sur un monstre. */
  hit: () => throttled('hit', 55, () => {
    noise(0.07, 0.13, 1800);
  }),

  /** Un monstre tombe. */
  kill: () => throttled('kill', 40, () => {
    tone({ type: 'square', freq: 380, to: 90, duration: 0.2, gain: 0.24 });
    noise(0.16, 0.16, 700);
  }),

  /** Enchainement : la note monte avec le compteur. */
  combo: (count: number) => throttled('combo', 60, () => {
    const step = Math.min(count, 8);
    tone({ type: 'triangle', freq: 520 * Math.pow(1.12, step), duration: 0.12, gain: 0.22 });
  }),

  /** Obus de mortier qui explose. */
  boom: () => throttled('boom', 120, () => {
    tone({ type: 'sine', freq: 180, to: 40, duration: 0.35, gain: 0.4 });
    noise(0.3, 0.24, 380);
  }),

  /** Arc du tesla. */
  zap: () => throttled('zap', 140, () => {
    noise(0.12, 0.14, 3200);
    tone({ type: 'sawtooth', freq: 900, to: 1600, duration: 0.1, gain: 0.14 });
  }),

  /** Le noyau encaisse. */
  coreHit: () => throttled('coreHit', 120, () => {
    tone({ type: 'sawtooth', freq: 150, to: 60, duration: 0.4, gain: 0.4 });
    noise(0.25, 0.2, 260);
  }),

  /** Batiment pose ou ameliore. */
  build: () => throttled('build', 120, () => {
    tone({ type: 'triangle', freq: 300, to: 620, duration: 0.18, gain: 0.32 });
    tone({ type: 'sine', freq: 880, duration: 0.14, gain: 0.2, delay: 0.09 });
  }),

  /** Lancement d'une vague. */
  waveStart: () => {
    tone({ type: 'sawtooth', freq: 200, to: 320, duration: 0.5, gain: 0.3 });
    tone({ type: 'sawtooth', freq: 150, to: 240, duration: 0.6, gain: 0.22, delay: 0.05 });
  },

  /** Vague repoussee — arpege majeur ascendant. */
  victory: () => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      tone({ type: 'triangle', freq: f, duration: 0.34, gain: 0.3, delay: i * 0.1 });
    });
  },

  /** Noyau detruit — la meme figure, en descendant et en mineur. */
  defeat: () => {
    [440, 349.23, 293.66, 220].forEach((f, i) => {
      tone({ type: 'sawtooth', freq: f, duration: 0.4, gain: 0.26, delay: i * 0.13 });
    });
  },

  /** Montee de niveau — la fanfare, le seul son volontairement long. */
  levelUp: () => {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      tone({ type: 'triangle', freq: f, duration: 0.4, gain: 0.34, delay: i * 0.08 });
      tone({ type: 'sine', freq: f * 2, duration: 0.3, gain: 0.14, delay: i * 0.08 + 0.02 });
    });
  },

  /** Touche d'interface. */
  tap: () => throttled('tap', 40, () => {
    tone({ type: 'sine', freq: 720, duration: 0.06, gain: 0.16 });
  }),
};
