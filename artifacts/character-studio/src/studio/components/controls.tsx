import { useEffect, useRef, useState } from 'react';

interface FieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {hint && <span className="field-hint">{hint}</span>}
      </span>
      <span className="field-control">{children}</span>
    </label>
  );
}

interface SelectProps<T extends string> {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  /** Ajoute une option « aucun » qui produit `null`. */
  labelOf?: (value: T) => string;
}

export function Select<T extends string>({ value, options, onChange, labelOf }: SelectProps<T>) {
  return (
    <select className="control" value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o} value={o}>{labelOf ? labelOf(o) : o}</option>
      ))}
    </select>
  );
}

/** Valeur sentinelle de l'option « aucun ». Ne peut collisionner avec aucune
 *  clé de registre, qui sont toutes des identifiants camelCase. */
const NONE = '__none__';

interface NullableSelectProps<T extends string> {
  value: T | null;
  options: readonly T[];
  onChange: (value: T | null) => void;
}

/** Menu déroulant issu d'un registre, plus l'option « aucun » (PRD §4.2). */
export function NullableSelect<T extends string>({ value, options, onChange }: NullableSelectProps<T>) {
  return (
    <select
      className="control"
      value={value ?? NONE}
      onChange={(e) => onChange(e.target.value === NONE ? null : (e.target.value as T))}
    >
      <option value={NONE}>— aucun —</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

export function Slider({ value, min, max, step, onChange }: SliderProps) {
  return (
    <span className="slider-row">
      <input
        className="control slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <output className="slider-value">{value.toFixed(2)}</output>
    </span>
  );
}

interface ColorFieldProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Sélecteur de couleur à mise à jour limitée.
 *
 * `shared.ts` du kit met en cache un `MeshToonMaterial` par chaîne de couleur,
 * sans jamais l'évincer. Émettre une valeur à chaque pixel du glissement
 * ferait grossir ce cache indéfiniment ; on se limite donc à ~15 mises à jour
 * par seconde, ce qui reste parfaitement fluide à l'œil. Voir RAPPORT.md.
 */
const COLOR_THROTTLE_MS = 65;

export function ColorField({ value, onChange }: ColorFieldProps) {
  const [local, setLocal] = useState(value);
  const lastEmit = useRef(0);
  const pending = useRef<number | undefined>(undefined);

  // Suit les changements venus d'ailleurs (« Surprends-moi », import…).
  useEffect(() => { setLocal(value); }, [value]);
  useEffect(() => () => window.clearTimeout(pending.current), []);

  const emit = (next: string) => {
    setLocal(next);
    const now = performance.now();
    window.clearTimeout(pending.current);
    if (now - lastEmit.current >= COLOR_THROTTLE_MS) {
      lastEmit.current = now;
      onChange(next);
    } else {
      // Toujours planifier la dernière valeur, sinon relâcher la souris
      // pendant la fenêtre de throttle perdrait la couleur choisie.
      pending.current = window.setTimeout(() => {
        lastEmit.current = performance.now();
        onChange(next);
      }, COLOR_THROTTLE_MS);
    }
  };

  return (
    <span className="color-row">
      <input
        className="control color"
        type="color"
        value={local}
        onChange={(e) => emit(e.target.value.toLowerCase())}
      />
      <input
        className="control color-hex"
        type="text"
        spellCheck={false}
        value={local}
        onChange={(e) => {
          const next = e.target.value.toLowerCase();
          setLocal(next);
          if (/^#[0-9a-f]{6}$/.test(next)) onChange(next);
        }}
      />
    </span>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      className={`toggle ${value ? 'on' : ''}`}
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
    >
      <span className="toggle-knob" />
    </button>
  );
}

interface TextFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mono?: boolean;
}

export function TextField({ value, onChange, placeholder, mono }: TextFieldProps) {
  return (
    <input
      className={`control ${mono ? 'mono' : ''}`}
      type="text"
      spellCheck={false}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

interface NumberFieldProps {
  value: number;
  onChange: (value: number) => void;
  onReroll?: () => void;
}

/** Champ numérique + bouton « relancer » pour le seed (PRD §4.2). */
export function SeedField({ value, onChange, onReroll }: NumberFieldProps) {
  return (
    <span className="seed-row">
      <input
        className="control mono"
        type="number"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.floor(n));
        }}
      />
      {onReroll && (
        <button type="button" className="btn small" onClick={onReroll} title="Nouveau seed">
          relancer
        </button>
      )}
    </span>
  );
}

interface TagFieldProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagField({ tags, onChange }: TagFieldProps) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const next = draft.trim().toLowerCase();
    if (next && !tags.includes(next)) onChange([...tags, next]);
    setDraft('');
  };

  return (
    <span className="tag-field">
      <span className="tag-list">
        {tags.map((t) => (
          <button
            key={t}
            type="button"
            className="tag removable"
            onClick={() => onChange(tags.filter((x) => x !== t))}
            title="Retirer"
          >
            {t} <span aria-hidden>×</span>
          </button>
        ))}
      </span>
      <input
        className="control"
        type="text"
        value={draft}
        placeholder="ajouter un tag…"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); }
          if (e.key === 'Backspace' && !draft && tags.length) onChange(tags.slice(0, -1));
        }}
      />
    </span>
  );
}
