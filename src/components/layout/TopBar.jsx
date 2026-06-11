import { ChevronUp, ChevronDown, Activity } from 'lucide-react';
import { useGrooveStore } from '../../store/grooveStore';
import { useMidiStore } from '../../store/midiStore';
import { setClockMode } from '../../lib/midiClock';
import { toast } from '../../store/toastStore';
import { MIN_BPM, MAX_BPM } from '../../lib/constants';
import DeviceSelector from '../ui/DeviceSelector';
import MidiStatusBadge from './MidiStatusBadge';

function ClockToggle() {
  const clockMode = useMidiStore((s) => s.clockMode);
  const externalBpm = useMidiStore((s) => s.externalBpm);

  const cycle = () => {
    if (clockMode === 'off') {
      setClockMode('send');
      toast.info('Sending MIDI clock — set MPC MIDI Sync In to Midi Clock');
    } else {
      setClockMode('off');
      toast.info('MIDI clock off');
    }
  };

  const meta =
    clockMode === 'send'
      ? { label: 'CLK OUT', color: 'var(--color-accent)', glow: true }
      : clockMode === 'receive'
        ? { label: externalBpm ? `EXT ${externalBpm}` : 'EXT …', color: 'var(--color-info)', glow: true }
        : { label: 'CLK', color: 'var(--color-text-muted)', glow: false };

  return (
    <button
      type="button"
      onClick={cycle}
      aria-pressed={clockMode !== 'off'}
      aria-label="Toggle MIDI clock send"
      title={
        clockMode === 'receive'
          ? 'Following MPC clock (configure on the MPC page) — click to stop'
          : 'Send MIDI beat clock so the MPC follows the app tempo'
      }
      className="flex items-center gap-1.5 rounded border px-2.5 py-1.5 font-mono text-xs font-semibold"
      style={{
        borderColor: clockMode !== 'off' ? meta.color : 'var(--color-border)',
        color: meta.color,
        background: 'var(--color-surface-2)',
        boxShadow: meta.glow ? `0 0 10px ${clockMode === 'send' ? 'var(--color-accent-glow)' : 'rgba(10,132,255,0.25)'}` : undefined,
      }}
    >
      <Activity size={13} />
      {meta.label}
    </button>
  );
}

export default function TopBar() {
  const bpm = useGrooveStore((s) => s.bpm);
  const setBpm = useGrooveStore((s) => s.setBpm);
  const clockMode = useMidiStore((s) => s.clockMode);

  return (
    <header
      className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-3 py-2 sm:px-5"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="panel-title hidden sm:inline">Output</span>
        <DeviceSelector compact />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <ClockToggle />
        <div className="flex items-center gap-2">
          <span className="panel-title">BPM</span>
          <input
            type="number"
            className="input w-[72px] text-center"
            value={bpm}
            min={MIN_BPM}
            max={MAX_BPM}
            disabled={clockMode === 'receive'}
            title={clockMode === 'receive' ? 'BPM follows the MPC clock' : undefined}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isNaN(v)) setBpm(v);
            }}
            aria-label="Global BPM"
          />
          <div className="flex flex-col">
            <button
              type="button"
              aria-label="Increase BPM"
              className="rounded-t border border-b-0 px-1 text-text-secondary hover:text-text-primary"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}
              onClick={() => setBpm(bpm + 1)}
            >
              <ChevronUp size={12} />
            </button>
            <button
              type="button"
              aria-label="Decrease BPM"
              className="rounded-b border px-1 text-text-secondary hover:text-text-primary"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}
              onClick={() => setBpm(bpm - 1)}
            >
              <ChevronDown size={12} />
            </button>
          </div>
        </div>
        <MidiStatusBadge />
      </div>
    </header>
  );
}
