import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  Zap,
  Download,
  RotateCcw,
  Activity,
  Cast,
  ListChecks,
  Wand2,
  Play,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useMidi } from '../hooks/useMidi';
import { useMidiStore } from '../store/midiStore';
import { useGrooveStore } from '../store/grooveStore';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { MPC_PAD_REFERENCE, LS_KEYS, MIN_BPM, MAX_BPM } from '../lib/constants';
import { midiNoteToName } from '../lib/music-theory';
import { exportGrooveAsMidi } from '../lib/export';
import { sendProgramChange } from '../lib/midi';
import { setClockMode } from '../lib/midiClock';
import { toast } from '../store/toastStore';

/* ---------- 1. Connection status ---------- */
function ConnectionStatus() {
  const { status, outputs, inputs, selectedOutputId, refreshDevices, sendNote } = useMidi();

  const testNote = () => {
    if (sendNote(60, 110, 250)) toast.success('Test note sent (middle C)');
    else toast.error('Send failed — select an output first');
  };

  const DeviceTable = ({ title, devices }) => (
    <div className="min-w-[280px] flex-1">
      <h3 className="mb-2 font-mono text-xs uppercase tracking-wider text-text-muted">{title}</h3>
      {devices.length ? (
        <table className="w-full font-mono text-sm">
          <thead>
            <tr className="text-left text-xs text-text-muted">
              <th className="pb-1.5 font-normal">Name</th>
              <th className="pb-1.5 font-normal">Manufacturer</th>
              <th className="pb-1.5 font-normal">State</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                <td className="py-1.5 pr-3">
                  {d.name}
                  {d.id === selectedOutputId && (
                    <span className="ml-2 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{ background: 'var(--color-accent)', color: '#0a0a0c' }}>
                      active
                    </span>
                  )}
                </td>
                <td className="py-1.5 pr-3 text-text-secondary">{d.manufacturer || '—'}</td>
                <td className="py-1.5" style={{ color: d.state === 'connected' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {d.state}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="rounded border border-dashed px-3 py-4 text-center font-mono text-xs text-text-muted" style={{ borderColor: 'var(--color-border)' }}>
          None detected
        </p>
      )}
    </div>
  );

  return (
    <section className="panel p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="panel-title">Connection status</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn"
            onClick={() => {
              refreshDevices();
              toast.info('Devices re-scanned');
            }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button type="button" className="btn btn-accent" onClick={testNote}>
            <Zap size={14} /> Test (middle C)
          </button>
        </div>
      </div>
      <p className="mb-4 font-mono text-xs text-text-secondary">
        WebMIDI status: <span style={{ color: status === 'enabled' ? 'var(--color-success)' : 'var(--color-warning)' }}>{status}</span>
      </p>
      <div className="flex flex-wrap gap-8">
        <DeviceTable title="Outputs" devices={outputs} />
        <DeviceTable title="Inputs" devices={inputs} />
      </div>
    </section>
  );
}

/* ---------- 2. MPC setup checklist (manual-accurate) ---------- */
const SETUP_STEPS = [
  { id: 'usb', text: 'Connect the MPC Sample via USB-C (it does power, audio and MIDI over one cable).' },
  { id: 'port', text: 'On the MPC: SHIFT + PAD 8 opens MIDI Config. Set MIDI Port: USB — it is USB or the TRS jacks, not both.' },
  { id: 'padin', text: 'Same menu: set Pad MIDI In: On so incoming notes trigger the pads.' },
  { id: 'channel', text: 'MIDI In Channel: All works with any app channel. If you set a specific channel, match it below.' },
  { id: 'test', text: 'Press Test (middle C) above — a pad should flash/trigger. If not, run the note finder.' },
];

function SetupPanel() {
  const midiChannel = useMidiStore((s) => s.midiChannel);
  const setMidiChannel = useMidiStore((s) => s.setMidiChannel);
  const [done, setDone] = useLocalStorage(LS_KEYS.setup, {});

  const toggle = (id) => setDone((d) => ({ ...d, [id]: !d[id] }));
  const doneCount = SETUP_STEPS.filter((s) => done[s.id]).length;

  return (
    <section className="panel p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="panel-title flex items-center gap-2">
          <ListChecks size={14} /> MPC setup
        </h2>
        <span className="font-mono text-xs" style={{ color: doneCount === SETUP_STEPS.length ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
          {doneCount}/{SETUP_STEPS.length}
        </span>
      </div>
      <p className="mb-4 text-sm text-text-secondary">
        The MPC Sample listens on <b>one global MIDI In channel</b> (All or 1–16) — there are no per-track channels.
        These switches make it hear the app:
      </p>
      <ul className="flex flex-col gap-2.5">
        {SETUP_STEPS.map((step) => (
          <li key={step.id} className="flex items-start gap-3">
            <button
              type="button"
              role="checkbox"
              aria-checked={Boolean(done[step.id])}
              aria-label={`Step: ${step.text}`}
              onClick={() => toggle(step.id)}
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border font-mono text-[10px] font-bold"
              style={{
                background: done[step.id] ? 'var(--color-success)' : 'var(--color-surface-2)',
                borderColor: done[step.id] ? 'var(--color-success)' : 'var(--color-border-bright)',
                color: '#0a0a0c',
              }}
            >
              {done[step.id] ? '✓' : ''}
            </button>
            <span className="text-sm leading-relaxed" style={{ color: done[step.id] ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}>
              {step.text}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center gap-3 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
        <span className="font-mono text-xs text-text-muted">App sends on channel</span>
        <select
          className="select"
          value={midiChannel}
          onChange={(e) => setMidiChannel(Number(e.target.value))}
          aria-label="App MIDI send channel"
        >
          {Array.from({ length: 16 }, (_, i) => i + 1).map((ch) => (
            <option key={ch} value={ch}>
              {ch}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}

/* ---------- 3. Clock sync ---------- */
function ClockSyncPanel() {
  const clockMode = useMidiStore((s) => s.clockMode);
  const clockInputId = useMidiStore((s) => s.clockInputId);
  const externalBpm = useMidiStore((s) => s.externalBpm);
  const inputs = useMidiStore((s) => s.inputs);
  const isPlaying = useGrooveStore((s) => s.isPlaying);

  const [pendingInput, setPendingInput] = useState(clockInputId || '');

  const choose = (mode) => {
    if (mode === 'receive') {
      const inputId = pendingInput || inputs[0]?.id;
      if (!inputId) {
        toast.warning('No MIDI inputs detected — connect the MPC first');
        return;
      }
      if (setClockMode('receive', inputId)) {
        toast.info('Following external clock — set MPC MIDI Sync Out to Midi Clock');
      } else {
        toast.error('Could not attach to that input');
      }
    } else {
      setClockMode(mode);
      if (mode === 'send') toast.info('Sending MIDI clock — set MPC MIDI Sync In to Midi Clock');
    }
  };

  const MODES = [
    { key: 'off', label: 'Off', desc: 'No clock messages' },
    { key: 'send', label: 'Send', desc: 'App is the tempo master — MPC follows (MIDI Sync In: Midi Clock)' },
    { key: 'receive', label: 'Follow', desc: 'App follows the MPC (MIDI Sync Out: Midi Clock)' },
  ];

  return (
    <section className="panel p-5">
      <h2 className="panel-title mb-4 flex items-center gap-2">
        <Activity size={14} /> Clock sync
      </h2>
      <p className="mb-4 text-sm text-text-secondary">
        MIDI beat clock (24 ticks per beat) locks both sequencers to one tempo. Start/Stop messages ride along, so
        transports start together.
      </p>
      <div className="mb-4 flex flex-col gap-2">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => choose(m.key)}
            aria-pressed={clockMode === m.key}
            className="flex items-center gap-3 rounded border px-3 py-2.5 text-left transition-colors"
            style={{
              background: clockMode === m.key ? 'var(--color-accent-dim)' : 'var(--color-surface-2)',
              borderColor: clockMode === m.key ? 'var(--color-accent)' : 'var(--color-border)',
            }}
          >
            <span className="w-14 font-mono text-sm font-bold">{m.label}</span>
            <span className="font-mono text-xs leading-relaxed text-text-secondary">{m.desc}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          className="select"
          value={pendingInput}
          onChange={(e) => {
            setPendingInput(e.target.value);
            if (clockMode === 'receive' && e.target.value) setClockMode('receive', e.target.value);
          }}
          aria-label="Clock input device"
          disabled={!inputs.length}
        >
          {inputs.length ? (
            <>
              <option value="">Clock input…</option>
              {inputs.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </>
          ) : (
            <option value="">No inputs</option>
          )}
        </select>

        {clockMode === 'send' && (
          <span className="flex items-center gap-2 font-mono text-xs" style={{ color: 'var(--color-accent)' }}>
            <span className="h-2 w-2 rounded-full" style={{ background: 'var(--color-accent)', animation: 'hero-pulse 1s ease-in-out infinite' }} />
            sending clock {isPlaying ? '+ transport running' : '(transport stopped)'}
          </span>
        )}
        {clockMode === 'receive' && (
          <span className="flex items-center gap-2 font-mono text-xs" style={{ color: 'var(--color-info)' }}>
            <span className="h-2 w-2 rounded-full" style={{ background: 'var(--color-info)', animation: 'hero-pulse 1s ease-in-out infinite' }} />
            {externalBpm ? `external tempo ${externalBpm} BPM` : 'waiting for clock…'}
          </span>
        )}
      </div>
    </section>
  );
}

/* ---------- 4. Sequence launcher (Program Change) ---------- */
function SequenceLauncher() {
  const [bank, setBank] = useState(0);
  const [lastSent, setLastSent] = useState(null);
  const banks = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  const launch = (slot) => {
    const program = bank * 16 + slot;
    if (sendProgramChange(program)) {
      setLastSent(program);
      toast.success(`Program Change ${program} → sequence ${banks[bank]}${String(slot + 1).padStart(2, '0')}`);
    } else {
      toast.warning('No MIDI output selected');
    }
  };

  return (
    <section className="panel p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="panel-title flex items-center gap-2">
          <Play size={14} /> Sequence launcher
        </h2>
        <div className="flex items-center gap-1">
          {banks.map((b, i) => (
            <button
              key={b}
              type="button"
              onClick={() => setBank(i)}
              aria-pressed={bank === i}
              className="h-8 w-8 rounded font-mono text-xs font-bold"
              style={{
                background: bank === i ? 'var(--color-accent)' : 'var(--color-surface-2)',
                color: bank === i ? '#0a0a0c' : 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              {b}
            </button>
          ))}
        </div>
      </div>
      <p className="mb-4 text-sm text-text-secondary">
        On the MPC set <b>Receive Program Change: Sequence</b> (MIDI Config) — each button fires a Program Change
        that switches the matching sequence. Live set, remote-controlled.
      </p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {Array.from({ length: 16 }, (_, slot) => {
          const program = bank * 16 + slot;
          const active = lastSent === program;
          return (
            <button
              key={slot}
              type="button"
              onClick={() => launch(slot)}
              aria-label={`Launch sequence ${banks[bank]}${slot + 1}`}
              className={`flex h-14 flex-col items-center justify-center rounded font-mono transition-all ${active ? 'pad-glow' : ''}`}
              style={{
                background: active ? 'rgba(255,107,0,0.25)' : 'var(--color-surface-2)',
                border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
              }}
            >
              <span className="text-sm font-bold">{banks[bank]}{String(slot + 1).padStart(2, '0')}</span>
              <span className="text-[9px] text-text-muted">PC {program}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 font-mono text-[11px] text-text-muted">
        Assumes PC 0 = sequence A01 ascending — Akai doesn't publish the mapping, so verify against your unit.
      </p>
    </section>
  );
}

/* ---------- 5. Pad note finder (prober) ---------- */
function NoteProber() {
  const { sendNote, hasOutput } = useMidi();
  const [customMap, setCustomMap] = useLocalStorage(LS_KEYS.padMap, {});
  const [probeNote, setProbeNote] = useState(36);
  const [targetPad, setTargetPad] = useState(1);
  const [sweeping, setSweeping] = useState(false);
  const sweepRef = useRef(null);
  const rows = useGrooveStore((s) => s.rows);
  const setRowNote = useGrooveStore((s) => s.setRowNote);

  const fire = (note) => sendNote(note, 110, 150);

  useEffect(() => {
    if (sweeping) {
      sweepRef.current = setInterval(() => {
        setProbeNote((n) => {
          const next = n >= 127 ? 0 : n + 1;
          fire(next);
          return next;
        });
      }, 650);
    }
    return () => {
      if (sweepRef.current) clearInterval(sweepRef.current);
      sweepRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sweeping]);

  const mark = () => {
    setCustomMap((m) => ({ ...m, [`drum-${targetPad}`]: probeNote }));
    toast.success(`Pad ${targetPad} = note ${probeNote} (${midiNoteToName(probeNote)})`);
    if (targetPad < 16) {
      setTargetPad(targetPad + 1);
      const next = Math.min(127, probeNote + 1);
      setProbeNote(next);
      if (!sweeping) fire(next);
    } else {
      setSweeping(false);
      toast.success('All 16 pads mapped');
    }
  };

  const applyToGroove = () => {
    let applied = 0;
    rows.forEach((row, i) => {
      const note = customMap[`drum-${i + 1}`];
      if (note != null) {
        setRowNote(row.id, note);
        applied += 1;
      }
    });
    if (applied) toast.success(`Applied ${applied} probed notes to groove rows`);
    else toast.warning('No probed pads yet — map some first');
  };

  const mappedCount = Array.from({ length: 16 }, (_, i) => customMap[`drum-${i + 1}`]).filter((v) => v != null).length;

  return (
    <section className="panel p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="panel-title flex items-center gap-2">
          <Wand2 size={14} /> Pad note finder
        </h2>
        <span className="font-mono text-xs" style={{ color: mappedCount === 16 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
          {mappedCount}/16 mapped
        </span>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-text-secondary">
        The manual doesn't publish a pad→note chart, so find yours: send notes until a pad fires, then mark which
        pad lit up. Watch the MPC while you go.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" className="btn" aria-label="Previous note" onClick={() => { const n = Math.max(0, probeNote - 1); setProbeNote(n); fire(n); }}>
          <ChevronLeft size={14} />
        </button>
        <div className="flex h-10 min-w-[120px] items-center justify-center rounded border px-3 font-mono text-sm" style={{ borderColor: 'var(--color-border-bright)', background: 'var(--color-bg)' }}>
          <span style={{ color: 'var(--color-accent)' }}>{probeNote}</span>
          <span className="ml-2 text-text-secondary">{midiNoteToName(probeNote)}</span>
        </div>
        <button type="button" className="btn" aria-label="Next note" onClick={() => { const n = Math.min(127, probeNote + 1); setProbeNote(n); fire(n); }}>
          <ChevronRight size={14} />
        </button>
        <button type="button" className="btn" onClick={() => fire(probeNote)} disabled={!hasOutput}>
          <Zap size={14} /> Send
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setSweeping((s) => !s)}
          disabled={!hasOutput}
          aria-pressed={sweeping}
          style={sweeping ? { borderColor: 'var(--color-accent)', color: 'var(--color-accent)' } : undefined}
        >
          {sweeping ? 'Stop sweep' : 'Auto sweep'}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-accent" onClick={mark} disabled={!hasOutput}>
          Pad {targetPad} just fired — mark it
        </button>
        <select
          className="select"
          value={targetPad}
          onChange={(e) => setTargetPad(Number(e.target.value))}
          aria-label="Target pad"
        >
          {Array.from({ length: 16 }, (_, i) => i + 1).map((p) => (
            <option key={p} value={p}>
              Pad {p}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 grid grid-cols-8 gap-1.5">
        {Array.from({ length: 16 }, (_, i) => {
          const note = customMap[`drum-${i + 1}`];
          return (
            <div
              key={i}
              className="flex h-10 flex-col items-center justify-center rounded border font-mono"
              style={{
                borderColor: note != null ? 'var(--color-success)' : 'var(--color-border)',
                background: note != null ? 'rgba(48,209,88,0.08)' : 'var(--color-surface-2)',
              }}
              title={note != null ? `Pad ${i + 1} = ${midiNoteToName(note)} (${note})` : `Pad ${i + 1} unmapped`}
            >
              <span className="text-[9px] text-text-muted">{i + 1}</span>
              <span className="text-[10px]" style={{ color: note != null ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                {note != null ? note : '—'}
              </span>
            </div>
          );
        })}
      </div>

      <button type="button" className="btn btn-info" onClick={applyToGroove}>
        Apply pads 1–8 to groove rows
      </button>
    </section>
  );
}

/* ---------- 6. Tempo sync reference ---------- */
const DIVISIONS = [
  { label: '1/1 (bar)', beats: 4 },
  { label: '1/2', beats: 2 },
  { label: '1/4', beats: 1 },
  { label: '1/8', beats: 0.5 },
  { label: '1/16', beats: 0.25 },
  { label: '1/32', beats: 0.125 },
];

function TempoSync() {
  const bpm = useGrooveStore((s) => s.bpm);
  const setBpm = useGrooveStore((s) => s.setBpm);
  const beatMs = 60000 / bpm;
  const fmt = (ms) => (ms >= 100 ? ms.toFixed(1) : ms.toFixed(2));

  return (
    <section className="panel p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="panel-title">Tempo sync reference</h2>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-text-muted">BPM</span>
          <input
            type="number"
            className="input w-20 text-center"
            value={bpm}
            min={MIN_BPM}
            max={MAX_BPM}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isNaN(v)) setBpm(v);
            }}
            aria-label="Reference BPM"
          />
        </div>
      </div>
      <p className="mb-3 text-sm text-text-secondary">
        Note lengths in milliseconds at {bpm} BPM — for delay times, chop lengths and the MPC's fixed-length
        sampling (e.g. a 2-bar loop = {fmt(beatMs * 8)} ms).
      </p>
      <table className="w-full font-mono text-sm">
        <thead>
          <tr className="text-left text-xs text-text-muted">
            <th className="pb-2 font-normal">Division</th>
            <th className="pb-2 text-right font-normal">Straight</th>
            <th className="pb-2 text-right font-normal">Dotted (×1.5)</th>
            <th className="pb-2 text-right font-normal">Triplet (×⅔)</th>
          </tr>
        </thead>
        <tbody>
          {DIVISIONS.map((d) => {
            const straight = beatMs * d.beats;
            return (
              <tr key={d.label} style={{ borderTop: '1px solid var(--color-border)' }}>
                <td className="py-2 font-semibold">{d.label}</td>
                <td className="py-2 text-right" style={{ color: 'var(--color-accent)' }}>
                  {fmt(straight)} ms
                </td>
                <td className="py-2 text-right text-text-secondary">{fmt(straight * 1.5)} ms</td>
                <td className="py-2 text-right text-text-secondary">{fmt(straight * (2 / 3))} ms</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

/* ---------- 7. Getting patterns onto the MPC ---------- */
function PatternTransfer() {
  const rows = useGrooveStore((s) => s.rows);
  const bpm = useGrooveStore((s) => s.bpm);
  const activePatternName = useGrooveStore((s) => s.activePatternName);

  return (
    <section className="panel p-5">
      <h2 className="panel-title mb-4">Getting patterns onto the MPC</h2>
      <p className="mb-4 text-sm leading-relaxed text-text-secondary">
        The MPC Sample imports <b>audio only</b> — no .mid or .mpcpattern files. Two real routes:
      </p>

      <div className="mb-4 rounded-md border p-4" style={{ borderColor: 'var(--color-accent)', background: 'rgba(255,107,0,0.05)' }}>
        <h3 className="mb-1.5 flex items-center gap-2 font-mono text-sm font-bold" style={{ color: 'var(--color-accent)' }}>
          <Cast size={14} /> A — Beam it (recommended, no files)
        </h3>
        <p className="mb-3 text-sm leading-relaxed text-text-primary">
          Stream the groove over USB MIDI while the MPC's sequence loops, then press <b>SHIFT + SEQ REC (RECALL)</b>{' '}
          on the hardware — it retrospectively captures the last loop straight into the sequence.
        </p>
        <Link to="/groove" className="btn btn-accent">
          <Cast size={14} /> Open Groove editor → Beam to MPC
        </Link>
      </div>

      <div className="rounded-md border p-4" style={{ borderColor: 'var(--color-border)' }}>
        <h3 className="mb-1.5 font-mono text-sm font-bold text-text-primary">B — Via MPC3 desktop (v3.8+)</h3>
        <p className="mb-3 text-sm leading-relaxed text-text-secondary">
          Export a .mid here, drop it into the free MPC3 software, then use 3.8's MPC Sample integration to export
          the track to the hardware. MPC Sample projects also open in MPC3 for finishing in-the-box.
        </p>
        <button
          type="button"
          className="btn btn-info"
          onClick={() => {
            const ok = exportGrooveAsMidi(rows, bpm, activePatternName || 'untitled');
            if (ok) toast.success('Current groove exported as .mid');
            else toast.warning('Groove is empty — add steps on the Groove page first');
          }}
        >
          <Download size={14} /> Export .mid from current groove
        </button>
      </div>
    </section>
  );
}

/* ---------- 8. Pad → MIDI reference ---------- */
function PadReference() {
  const [query, setQuery] = useState('');
  const [customMap, setCustomMap] = useLocalStorage(LS_KEYS.padMap, {});

  const rows = useMemo(() => {
    const merged = MPC_PAD_REFERENCE.map((r) => ({
      ...r,
      midiNote: customMap[`drum-${r.pad}`] ?? r.midiNote,
      isCustom: customMap[`drum-${r.pad}`] != null,
    }));
    if (!query.trim()) return merged;
    const q = query.toLowerCase();
    return merged.filter(
      (r) =>
        String(r.pad).includes(q) ||
        String(r.midiNote).includes(q) ||
        r.gmName.toLowerCase().includes(q) ||
        midiNoteToName(r.midiNote).toLowerCase().includes(q)
    );
  }, [customMap, query]);

  const setNote = (pad, value) => {
    const v = Number(value);
    if (Number.isNaN(v) || v < 0 || v > 127) return;
    setCustomMap((m) => ({ ...m, [`drum-${pad}`]: v }));
  };

  const resetMap = () => {
    setCustomMap((m) => {
      const next = { ...m };
      Object.keys(next).forEach((k) => {
        if (k.startsWith('drum-')) delete next[k];
      });
      return next;
    });
    toast.info('Pad mapping reset to defaults');
  };

  return (
    <section className="panel p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="panel-title">Pad → MIDI map</h2>
        <button type="button" className="btn" onClick={resetMap} title="Reset custom mapping">
          <RotateCcw size={13} /> Reset
        </button>
      </div>
      <p className="mb-3 max-w-2xl text-sm text-text-secondary">
        Working map used across the app. Defaults are GM-style starting values — the manual doesn't publish an
        official chart, so verify with the pad note finder (green = confirmed/custom).
      </p>

      <div className="relative mb-3 max-w-xs">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
        <input
          className="input w-full pl-8"
          placeholder="Search pad, note, name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search pad reference"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] font-mono text-sm">
          <thead>
            <tr className="text-left text-xs text-text-muted">
              <th className="pb-2 font-normal">Pad</th>
              <th className="pb-2 font-normal">MIDI note</th>
              <th className="pb-2 font-normal">Name</th>
              <th className="pb-2 font-normal">GM sound</th>
              <th className="pb-2 font-normal">Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.pad} style={{ borderTop: '1px solid var(--color-border)' }}>
                <td className="py-2 font-bold" style={{ color: 'var(--color-accent)' }}>
                  {r.pad}
                </td>
                <td className="py-2">
                  <input
                    type="number"
                    min={0}
                    max={127}
                    className="input w-16 py-1 text-center text-xs"
                    value={r.midiNote}
                    onChange={(e) => setNote(r.pad, e.target.value)}
                    aria-label={`Pad ${r.pad} MIDI note`}
                    style={r.isCustom ? { borderColor: 'var(--color-success)' } : undefined}
                  />
                </td>
                <td className="py-2 text-text-secondary">{midiNoteToName(r.midiNote)}</td>
                <td className="py-2 text-text-secondary">{r.gmName}</td>
                <td className="py-2" style={{ color: r.isCustom ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                  {r.isCustom ? 'verified/custom' : 'default'}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-text-muted">
                  No pads match “{query}”
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function MpcSampleHelper() {
  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div>
        <h1 className="font-mono text-xl font-bold tracking-tight">MPC Sample helper</h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          Connection, sync and transfer tools — checked against the official manual (firmware 1.3).
        </p>
      </div>
      <ConnectionStatus />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SetupPanel />
        <ClockSyncPanel />
      </div>
      <SequenceLauncher />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <NoteProber />
        <TempoSync />
      </div>
      <PatternTransfer />
      <PadReference />
    </div>
  );
}
