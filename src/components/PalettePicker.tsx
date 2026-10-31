import { PALETTES, useStore } from '../store';

export default function PalettePicker() {
  const { palette, setPalette } = useStore();
  return (
    <div className="palettes" role="radiogroup" aria-label="Colour theme">
      {PALETTES.map((p) => (
        <button
          key={p.id}
          type="button"
          role="radio"
          aria-checked={palette === p.id}
          aria-label={p.label}
          title={p.label}
          className={palette === p.id ? 'swatch on' : 'swatch'}
          style={{ background: p.color }}
          onClick={() => setPalette(p.id)}
        />
      ))}
    </div>
  );
}
