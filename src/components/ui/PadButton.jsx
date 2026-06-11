import { useState, useCallback } from 'react';

/**
 * MPC-style pad. Square, dark rubber look, orange glow + pulse on trigger.
 */
export default function PadButton({ topLabel, mainLabel, subLabel, onTrigger, inScale = true, size = 'lg' }) {
  const [pulsing, setPulsing] = useState(false);

  const trigger = useCallback(() => {
    if (!inScale) return;
    onTrigger?.();
    setPulsing(true);
    setTimeout(() => setPulsing(false), 160);
  }, [onTrigger, inScale]);

  const sizeCls = size === 'lg' ? 'aspect-square w-full' : 'h-16 w-16';

  return (
    <button
      type="button"
      onClick={trigger}
      disabled={!inScale}
      aria-label={`Pad ${topLabel}: ${mainLabel}`}
      className={`${sizeCls} relative flex flex-col items-center justify-center gap-0.5 rounded-md border transition-all duration-100 ${
        pulsing ? 'pad-pulse' : ''
      } ${inScale ? 'hover:border-[var(--color-accent)]' : 'cursor-default opacity-35'}`}
      style={{
        background: pulsing
          ? 'rgba(255, 107, 0, 0.3)'
          : 'linear-gradient(180deg, var(--color-surface-2) 0%, var(--color-surface) 100%)',
        borderColor: pulsing ? 'var(--color-accent)' : 'var(--color-border)',
        boxShadow: pulsing ? '0 0 18px var(--color-accent-glow)' : 'inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      {topLabel != null && (
        <span className="absolute left-1.5 top-1 font-mono text-[10px] text-text-muted">{topLabel}</span>
      )}
      <span className="font-mono text-lg font-600 leading-none" style={{ fontWeight: 600 }}>
        {mainLabel}
      </span>
      {subLabel != null && <span className="font-mono text-xs text-text-secondary">{subLabel}</span>}
    </button>
  );
}
