import { useEffect, useRef } from 'react';

/**
 * Floating velocity popup anchored at (x, y). Closes on outside click / Escape.
 */
export default function VelocitySlider({ x, y, velocity, onChange, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter') onClose();
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // Keep on-screen
  const left = Math.min(x, window.innerWidth - 230);
  const top = Math.min(y, window.innerHeight - 90);

  return (
    <div
      ref={ref}
      className="fixed z-50 rounded-md border p-3 toast-in"
      style={{ left, top, background: 'var(--color-surface-2)', borderColor: 'var(--color-border-bright)', width: 210 }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wider text-text-secondary">Velocity</span>
        <span className="font-mono text-sm" style={{ color: 'var(--color-accent)' }}>
          {velocity}
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={127}
        value={velocity}
        autoFocus
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        aria-label="Step velocity"
      />
      <div className="mt-1 flex justify-between font-mono text-xs text-text-muted">
        <span>1</span>
        <span>127</span>
      </div>
    </div>
  );
}
