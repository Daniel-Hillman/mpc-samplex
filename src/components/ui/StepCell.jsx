import { memo } from 'react';

/**
 * One sequencer cell. Click toggles; right-click opens the velocity popup
 * (handled by parent via onVelocityRequest). Velocity shades the fill.
 */
function StepCell({ active, velocity, isPlayhead, isDownbeat, onToggle, onVelocityRequest, rowLabel, stepIdx }) {
  const intensity = active ? 0.35 + (velocity / 127) * 0.65 : 0;

  return (
    <button
      type="button"
      aria-label={`${rowLabel} step ${stepIdx + 1}${active ? ` on, velocity ${velocity}` : ' off'}`}
      aria-pressed={active}
      onClick={onToggle}
      onContextMenu={(e) => {
        e.preventDefault();
        onVelocityRequest(e);
      }}
      className={`relative h-9 w-9 min-w-9 rounded transition-colors duration-75 ${active ? 'pad-glow' : ''}`}
      style={{
        background: active
          ? `rgba(255, 107, 0, ${intensity})`
          : isDownbeat
            ? 'var(--color-surface-2)'
            : 'var(--color-surface)',
        border: `1px solid ${
          isPlayhead ? 'var(--color-playhead)' : active ? 'var(--color-accent)' : 'var(--color-border)'
        }`,
        boxShadow: isPlayhead
          ? `0 0 10px var(--color-playhead-glow)${active ? ', 0 0 12px var(--color-accent-glow)' : ''}`
          : undefined,
      }}
    >
      {isPlayhead && active && (
        <span
          className="pointer-events-none absolute inset-0 rounded"
          style={{ background: 'rgba(255, 214, 10, 0.25)', animation: 'playhead-blip 120ms ease-out forwards' }}
        />
      )}
    </button>
  );
}

export default memo(StepCell);
