import { useEffect, useRef, useState } from 'react';
import { X, Cast, Play, Square, Activity } from 'lucide-react';
import { useGrooveStore } from '../../store/grooveStore';
import { useMidiStore } from '../../store/midiStore';
import { setClockMode } from '../../lib/midiClock';
import { toast } from '../../store/toastStore';

/**
 * Guided pattern transfer using the MPC Sample's Sequence Recall:
 * the app loops the groove over USB MIDI, the MPC's pads fire, and
 * SHIFT+SEQ REC retrospectively captures the last loop into a sequence.
 */
export default function BeamModal({ open, onClose, isPlaying, play, stop }) {
  const clockMode = useMidiStore((s) => s.clockMode);
  const hasOutput = useMidiStore((s) => Boolean(s.selectedOutputId) && s.status === 'enabled');
  const currentTick = useGrooveStore((s) => s.currentTick);
  const loopEnabled = useGrooveStore((s) => s.loopEnabled);
  const toggleLoop = useGrooveStore((s) => s.toggleLoop);

  const [loops, setLoops] = useState(0);
  const prevTick = useRef(-1);

  // Count completed loops while streaming: the tick counter wrapping back toward
  // the start of the bar means one full pass just finished.
  useEffect(() => {
    if (!open) return;
    if (prevTick.current >= 0 && currentTick >= 0 && currentTick < prevTick.current) {
      setLoops((n) => n + 1);
    }
    prevTick.current = currentTick;
  }, [currentTick, open]);

  useEffect(() => {
    if (!open) {
      setLoops(0);
      prevTick.current = -1;
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const startStreaming = () => {
    if (!hasOutput) {
      toast.warning('Select a MIDI output first');
      return;
    }
    if (!loopEnabled) toggleLoop();
    setLoops(0);
    play();
  };

  const steps = [
    <>
      On the MPC: <b>SHIFT + PAD 8</b> (MIDI Config) → set <b>MIDI Port: USB</b> and <b>Pad MIDI In: On</b>.
      Leave <b>MIDI In Channel: All</b> (or match the app channel on the MPC page).
    </>,
    <>
      Recommended — set <b>MIDI Sync In: Midi Clock</b> on the MPC and enable{' '}
      <button
        type="button"
        className="rounded border px-1.5 py-0.5 font-mono text-[11px] font-bold"
        style={{
          borderColor: clockMode === 'send' ? 'var(--color-accent)' : 'var(--color-border-bright)',
          color: clockMode === 'send' ? 'var(--color-accent)' : 'var(--color-text-primary)',
        }}
        onClick={() => {
          setClockMode(clockMode === 'send' ? 'off' : 'send');
        }}
      >
        <Activity size={10} className="mr-1 inline" />
        {clockMode === 'send' ? 'CLK OUT on' : 'enable CLK OUT'}
      </button>{' '}
      so both machines run at exactly the same tempo.
    </>,
    <>
      On the MPC: pick the target sequence and press <b>PLAY</b> so it loops (with sync it follows the app
      transport automatically).
    </>,
    <>
      Press <b>Start streaming</b> below. The groove loops over MIDI and the MPC pads should trigger.
    </>,
    <>
      After at least one clean full loop, on the MPC press <b>SHIFT + SEQ REC (RECALL)</b> — the last loop's
      events are written into the sequence. Wrong take? <b>SHIFT + −/UNDO</b> on the MPC and recall again.
    </>,
  ];

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Beam to MPC"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="panel toast-in max-h-[90vh] w-full max-w-xl overflow-y-auto p-6"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border-bright)' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-mono text-lg font-bold">
            <Cast size={18} style={{ color: 'var(--color-accent)' }} /> Beam to MPC
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-text-secondary">
          The MPC Sample can't load MIDI files — but its <b>Sequence Recall</b> can capture anything the pads just
          played. Stream the groove in, then recall it on the hardware. No files, no SD card.
        </p>

        <ol className="mb-5 flex flex-col gap-3">
          {steps.map((content, i) => (
            <li key={i} className="flex gap-3">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold"
                style={{
                  background: i === 3 ? 'var(--color-accent)' : 'var(--color-surface-2)',
                  color: i === 3 ? '#0a0a0c' : 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border-bright)',
                }}
              >
                {i + 1}
              </span>
              <span className="text-sm leading-relaxed text-text-primary">{content}</span>
            </li>
          ))}
        </ol>

        <div
          className="flex flex-wrap items-center gap-4 rounded-md border p-4"
          style={{ borderColor: isPlaying ? 'var(--color-accent)' : 'var(--color-border)', background: 'var(--color-surface-2)' }}
        >
          <button
            type="button"
            className={`btn h-12 px-5 ${isPlaying ? '' : 'btn-accent'}`}
            onClick={isPlaying ? stop : startStreaming}
          >
            {isPlaying ? <Square size={16} /> : <Play size={16} />}
            {isPlaying ? 'Stop streaming' : 'Start streaming'}
          </button>
          {isPlaying ? (
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full pad-glow" style={{ background: 'var(--color-accent)', animation: 'hero-pulse 1s ease-in-out infinite' }} />
              <div className="font-mono text-sm">
                <div style={{ color: 'var(--color-accent)' }}>Streaming — loop {loops}</div>
                <div className="text-xs text-text-secondary">Press SHIFT + SEQ REC on the MPC to capture</div>
              </div>
            </div>
          ) : (
            <span className="font-mono text-xs text-text-muted">
              {hasOutput ? 'Pattern loops over MIDI until you stop it.' : 'No MIDI output selected — connect the MPC first.'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
