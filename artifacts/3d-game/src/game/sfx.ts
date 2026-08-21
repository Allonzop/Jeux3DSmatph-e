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
let musicGain: GainNode | null = null;
let muted = false;
let ambienceTimer: ReturnType<typeof setInterval> | null = null;

/** Volume general. */
const MASTER_VOLUME = 0.62;

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
    // 0.32 etait beaucoup trop bas : sur le haut-parleur d'un telephone, des
    // bips de 0,1 s a cette amplitude passaient inapercus — le retour de
    // playtest disait « il y a un bouton son mais on n'entend rien ».
    master.gain.value = muted ? 0 : MASTER_VOLUME;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
  return ctx;
}

/**
 * A appeler a chaque geste du joueur — voir `App.tsx`.
 *
 * Ce n'etait branche qu'une fois (`{ once: true }`). Si ce tout premier geste
 * tombait a un moment ou le navigateur refusait encore de demarrer l'audio, il
 * n'y avait plus jamais de seconde chance : le jeu restait muet pour toute la
 * session, sans rien pour le dire. On reessaie donc a chaque geste tant que le
 * contexte n'est pas `running` — c'est gratuit une fois qu'il l'est.
 */
export function unlockAudio(): void {
  const c = ensureContext();
  if (!c) return;
  if (c.state !== 'running') void c.resume();
  startAmbience();
}

// ---------------------------------------------------------------------------
// L'ambiance
// ---------------------------------------------------------------------------
//
// Les effets ponctuels ne suffisaient pas a donner l'impression que le jeu
// « a du son » : entre deux tirs, silence total. Une nappe lente tourne donc
// en permanence, et bascule sur une figure plus grave et plus rapide pendant
// les vagues. Comme le reste, c'est synthetise — aucun fichier.

let combat = false;
let ambienceStep = 0;

/** Deux gammes : calme (majeure aerienne) et combat (mineure, plus grave). */
const CALM_NOTES = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63];
const COMBAT_NOTES = [196.0, 233.08, 293.66, 349.23, 293.66, 233.08];

export function setCombatMusic(active: boolean): void {
  combat = active;
}

function startAmbience(): void {
  if (ambienceTimer !== null) return;
  const c = ensureContext();
  if (!c || !master) return;

  musicGain = c.createGain();
  musicGain.gain.value = 0.34;
  musicGain.connect(master);

  const beat = () => {
    if (muted || !ctx || !musicGain) return;
    const notes = combat ? COMBAT_NOTES : CALM_NOTES;
    const note = notes[ambienceStep % notes.length];
    ambienceStep += 1;

    try {
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = combat ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(note, t0);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(combat ? 900 : 1400, t0);
      // Attaque douce et longue extinction : une nappe, pas une note.
      const len = combat ? 1.1 : 1.8;
      env.gain.setValueAtTime(0.0001, t0);
      env.gain.exponentialRampToValueAtTime(combat ? 0.5 : 0.34, t0 + 0.25);
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
      osc.connect(filter);
      filter.connect(env);
      env.connect(musicGain);
      osc.start(t0);
      osc.stop(t0 + len + 0.05);
    } catch {
      // une note perdue n'interrompt rien
    }
  };

  beat();
  ambienceTimer = setInterval(beat, 1400);
}

export function isMuted(): boolean {
  return muted;
}

export function toggleMute(): boolean {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : MASTER_VOLUME;
  if (!muted) {
    // Preuve immediate que le son est revenu. Le bouton seul ne disait pas
    // dans quel sens on venait de basculer.
    unlockAudio();
    tone({ type: 'triangle', freq: 523.25, duration: 0.12, gain: 0.5 });
    tone({ type: 'triangle', freq: 784, duration: 0.16, gain: 0.5, delay: 0.1 });
  }
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
    tone({ type: 'triangle', freq: 660, to: 1320, duration: 0.16, gain: 0.5 });
  }),

  /** Impact d'un tir sur un monstre. */
  hit: () => throttled('hit', 55, () => {
    noise(0.08, 0.26, 1800);
  }),

  /** Un monstre tombe. */
  kill: () => throttled('kill', 40, () => {
    tone({ type: 'square', freq: 380, to: 90, duration: 0.22, gain: 0.45 });
    noise(0.18, 0.3, 700);
  }),

  /** Enchainement : la note monte avec le compteur. */
  combo: (count: number) => throttled('combo', 60, () => {
    const step = Math.min(count, 8);
    tone({ type: 'triangle', freq: 520 * Math.pow(1.12, step), duration: 0.13, gain: 0.42 });
  }),

  /** Obus de mortier qui explose. */
  boom: () => throttled('boom', 120, () => {
    tone({ type: 'sine', freq: 180, to: 40, duration: 0.36, gain: 0.62 });
    noise(0.3, 0.42, 380);
  }),

  /** Arc du tesla. */
  zap: () => throttled('zap', 140, () => {
    noise(0.12, 0.28, 3200);
    tone({ type: 'sawtooth', freq: 900, to: 1600, duration: 0.11, gain: 0.3 });
  }),

  /** Le noyau encaisse. */
  coreHit: () => throttled('coreHit', 120, () => {
    tone({ type: 'sawtooth', freq: 150, to: 60, duration: 0.42, gain: 0.66 });
    noise(0.26, 0.38, 260);
  }),

  /** Batiment pose ou ameliore. */
  build: () => throttled('build', 120, () => {
    tone({ type: 'triangle', freq: 300, to: 620, duration: 0.2, gain: 0.55 });
    tone({ type: 'sine', freq: 880, duration: 0.15, gain: 0.4, delay: 0.09 });
  }),

  /** Lancement d'une vague. */
  waveStart: () => {
    tone({ type: 'sawtooth', freq: 200, to: 320, duration: 0.55, gain: 0.6 });
    tone({ type: 'sawtooth', freq: 150, to: 240, duration: 0.65, gain: 0.45, delay: 0.05 });
  },

  /** Vague repoussee — arpege majeur ascendant. */
  victory: () => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      tone({ type: 'triangle', freq: f, duration: 0.36, gain: 0.52, delay: i * 0.1 });
    });
  },

  /** Noyau detruit — la meme figure, en descendant et en mineur. */
  defeat: () => {
    [440, 349.23, 293.66, 220].forEach((f, i) => {
      tone({ type: 'sawtooth', freq: f, duration: 0.42, gain: 0.48, delay: i * 0.13 });
    });
  },

  /** Montee de niveau — la fanfare, le seul son volontairement long. */
  levelUp: () => {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      tone({ type: 'triangle', freq: f, duration: 0.42, gain: 0.55, delay: i * 0.08 });
      tone({ type: 'sine', freq: f * 2, duration: 0.32, gain: 0.26, delay: i * 0.08 + 0.02 });
    });
  },

  /** Touche d'interface. */
  tap: () => throttled('tap', 40, () => {
    tone({ type: 'sine', freq: 720, duration: 0.07, gain: 0.32 });
  }),
};
