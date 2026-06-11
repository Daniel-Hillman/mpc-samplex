import { useRef, useCallback } from 'react';

/**
 * SVG rotary knob. Drag vertically to adjust; double-click to reset.
 * 270° sweep from -135° to +135°.
 */
export default function Knob({ value, min = 0, max = 100, onChange, label, unit = '', size = 56, defaultValue }) {
  const dragRef = useRef(null);

  const norm = (value - min) / (max - min);
  const angle = -135 + norm * 270;

  const startDrag = useCallback(
    (e) => {
      e.preventDefault();
      const startY = e.clientY;
      const startValue = value;
      const range = max - min;
      const onMove = (ev) => {
        const dy = startY - ev.clientY;
        const next = Math.max(min, Math.min(max, startValue + (dy / 150) * range));
        onChange(Math.round(next));
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [value, min, max, onChange]
  );

  const onKeyDown = (e) => {
    const step = e.shiftKey ? 10 : 1;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      onChange(Math.min(max, value + step));
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      onChange(Math.max(min, value - step));
    }
  };

  const r = size / 2;
  const arcR = r - 5;
  const polar = (deg) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [r + arcR * Math.cos(rad), r + arcR * Math.sin(rad)];
  };
  const [sx, sy] = polar(-135);
  const [ex, ey] = polar(angle);
  const largeArc = angle - -135 > 180 ? 1 : 0;

  return (
    <div className="flex flex-col items-center gap-1.5 select-none">
      <div
        ref={dragRef}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        onPointerDown={startDrag}
        onKeyDown={onKeyDown}
        onDoubleClick={() => defaultValue !== undefined && onChange(defaultValue)}
        className="cursor-ns-resize rounded-full"
        style={{ width: size, height: size, touchAction: 'none' }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Track */}
          <path
            d={`M ${sx} ${sy} A ${arcR} ${arcR} 0 1 1 ${polar(135)[0]} ${polar(135)[1]}`}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Value arc */}
          {norm > 0.002 && (
            <path
              d={`M ${sx} ${sy} A ${arcR} ${arcR} 0 ${largeArc} 1 ${ex} ${ey}`}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}
          {/* Body */}
          <circle cx={r} cy={r} r={r - 11} fill="var(--color-surface-2)" stroke="var(--color-border-bright)" strokeWidth="1" />
          {/* Pointer */}
          <line
            x1={r}
            y1={r}
            x2={r + (r - 14) * Math.cos(((angle - 90) * Math.PI) / 180)}
            y2={r + (r - 14) * Math.sin(((angle - 90) * Math.PI) / 180)}
            stroke="var(--color-text-primary)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="text-center">
        <div className="font-mono text-xs text-text-secondary uppercase tracking-wider">{label}</div>
        <div className="font-mono text-sm text-text-primary">
          {value}
          {unit}
        </div>
      </div>
    </div>
  );
}
