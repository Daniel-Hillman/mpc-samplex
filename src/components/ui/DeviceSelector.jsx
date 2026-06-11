import { useMidi } from '../../hooks/useMidi';
import { toast } from '../../store/toastStore';

export default function DeviceSelector({ compact = false }) {
  const { status, outputs, selectedOutputId, setSelectedOutputId } = useMidi();

  if (status === 'unavailable') {
    return (
      <span className="font-mono text-xs text-text-muted" title="WebMIDI requires Chrome or Edge">
        MIDI unavailable
      </span>
    );
  }

  const onChange = (e) => {
    const id = e.target.value || null;
    setSelectedOutputId(id);
    const dev = outputs.find((o) => o.id === id);
    if (dev) toast.success(`Output: ${dev.name}`);
  };

  return (
    <select
      className="select"
      style={{ maxWidth: compact ? 180 : 280 }}
      value={selectedOutputId || ''}
      onChange={onChange}
      aria-label="MIDI output device"
      disabled={outputs.length === 0}
    >
      {outputs.length === 0 ? (
        <option value="">No MIDI outputs</option>
      ) : (
        <>
          <option value="">Select output…</option>
          {outputs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </>
      )}
    </select>
  );
}
