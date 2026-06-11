import { useMidi } from '../../hooks/useMidi';

const STATUS_META = {
  idle: { label: 'MIDI: starting…', color: 'var(--color-text-muted)' },
  enabled: { label: 'MIDI: connected', color: 'var(--color-success)' },
  'no-devices': { label: 'MIDI: no devices', color: 'var(--color-warning)' },
  unavailable: { label: 'MIDI: unavailable', color: 'var(--color-danger)' },
};

export default function MidiStatusBadge() {
  const { status, outputs, selectedOutputId } = useMidi();
  const meta = STATUS_META[status] || STATUS_META.idle;
  const device = outputs.find((o) => o.id === selectedOutputId);
  const label = status === 'enabled' && device ? `MIDI: ${device.name}` : meta.label;

  return (
    <div
      className="flex items-center gap-2 rounded-full border px-3 py-1.5"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      title={label}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{
          background: meta.color,
          boxShadow: status === 'enabled' ? `0 0 6px ${meta.color}` : undefined,
        }}
      />
      <span className="max-w-[180px] truncate font-mono text-xs text-text-secondary">{label}</span>
    </div>
  );
}
