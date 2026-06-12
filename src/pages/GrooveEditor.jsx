import { useState, useCallback } from 'react';
import { Play, Square, RotateCcw, Save, Copy, Trash2, Download, Repeat, Cast, HelpCircle, Volume2, VolumeX } from 'lucide-react';
import { useGrooveStore } from '../store/grooveStore';
import { useSequencer } from '../hooks/useSequencer';
import { useMidi } from '../hooks/useMidi';
import { exportGrooveAsMidi } from '../lib/export';
import { midiNoteToName } from '../lib/music-theory';
import { RESOLUTIONS, RESOLUTION_ORDER, TICKS_PER_BAR, DEFAULT_VELOCITY } from '../lib/constants';
import { toast } from '../store/toastStore';
import VelocitySlider from '../components/ui/VelocitySlider';
import Knob from '../components/ui/Knob';
import BeamModal from '../components/ui/BeamModal';

const LABEL_W = 240;

function RowControls({ row }) {
  const setRowLabel = useGrooveStore((s) => s.setRowLabel);
  const setRowNote = useGrooveStore((s) => s.setRowNote);
  const toggleMute = useGrooveStore((s) => s.toggleMute);
  const toggleSolo = useGrooveStore((s) => s.toggleSolo);
  const clearRow = useGrooveStore((s) => s.clearRow);
  const { sendNote } = useMidi();

  return (
    <div className="flex shrink-0 items-center gap-1.5 pr-3" style={{ width: LABEL_W }}>
      <input
        className="input h-9 w-[84px] px-2 text-xs"
        value={row.label}
        onChange={(e) => setRowLabel(row.id, e.target.value)}
        aria-label="Row label"
      />
      <div className="flex items-center">
        <input
          type="number"
          className="input h-9 w-[48px] rounded-r-none px-1.5 text-center text-xs"
          value={row.midiNote}
          min={0}
          max={127}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!Number.isNaN(v)) setRowNote(row.id, v);
          }}
          aria-label={`${row.label} MIDI note`}
        />
        <button
          type="button"
          className="flex h-9 items-center rounded-r border border-l-0 px-1.5 font-mono text-[10px] text-text-secondary hover:text-text-primary"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}
          title="Preview note"
          onClick={() => sendNote(row.midiNote, 110, 120)}
        >
          {midiNoteToName(row.midiNote)}
        </button>
      </div>
      <button
        type="button"
        onClick={() => toggleMute(row.id)}
        aria-pressed={row.muted}
        aria-label={`Mute ${row.label}`}
        className="h-7 w-7 rounded font-mono text-xs font-bold transition-colors"
        style={{
          background: row.muted ? 'var(--color-danger)' : 'var(--color-surface-2)',
          color: row.muted ? '#0a0a0c' : 'var(--color-text-secondary)',
          border: `1px solid ${row.muted ? 'var(--color-danger)' : 'var(--color-border)'}`,
        }}
      >
        M
      </button>
      <button
        type="button"
        onClick={() => toggleSolo(row.id)}
        aria-pressed={row.soloed}
        aria-label={`Solo ${row.label}`}
        className="h-7 w-7 rounded font-mono text-xs font-bold transition-colors"
        style={{
          background: row.soloed ? 'var(--color-success)' : 'var(--color-surface-2)',
          color: row.soloed ? '#0a0a0c' : 'var(--color-text-secondary)',
          border: `1px solid ${row.soloed ? 'var(--color-success)' : 'var(--color-border)'}`,
        }}
      >
        S
      </button>
      <button
        type="button"
        onClick={() => clearRow(row.id)}
        aria-label={`Clear ${row.label}`}
        title="Clear this row"
        className="flex h-7 w-7 items-center justify-center rounded text-text-muted transition-colors hover:text-danger"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

/** One row's note lane: proportional cells over a constant-width bar. */
function GridRow({ row, res, onVelocityRequest }) {
  const toggleNote = useGrooveStore((s) => s.toggleNote);
  const removeNote = useGrooveStore((s) => s.removeNote);
  const currentTick = useGrooveStore((s) => s.currentTick);
  const isPlaying = useGrooveStore((s) => s.isPlaying);
  const { steps, stepTicks } = res;
  const stepsPerBeat = steps / 4;
  const playCol = isPlaying && currentTick >= 0 ? Math.floor(currentTick / stepTicks) : -1;

  // notes that don't sit on the current grid (e.g. triplets while viewing straight)
  const offGrid = Object.keys(row.notes)
    .map(Number)
    .filter((t) => t % stepTicks !== 0);

  return (
    <div className="relative" style={{ height: 38 }}>
      {/* beat dividers — always at the 4 quarter-note boundaries, so triplet and
          straight grids share the same anchors */}
      {[1, 2, 3].map((b) => (
        <div
          key={b}
          className="pointer-events-none absolute top-0 bottom-0 w-px"
          style={{ left: `${b * 25}%`, background: 'var(--color-border-bright)' }}
        />
      ))}

      {/* clickable cells */}
      {Array.from({ length: steps }, (_, c) => {
        const tick = c * stepTicks;
        const vel = row.notes[tick];
        const active = vel != null;
        const beatStart = c % stepsPerBeat === 0;
        const intensity = active ? 0.32 + (vel / 127) * 0.68 : 0;
        const isPlayhead = playCol === c;
        return (
          <button
            key={c}
            type="button"
            aria-label={`${row.label} tick ${tick} ${active ? `on, velocity ${vel}` : 'off'}`}
            aria-pressed={active}
            onClick={() => toggleNote(row.id, tick, DEFAULT_VELOCITY)}
            onContextMenu={(e) => {
              e.preventDefault();
              if (active) onVelocityRequest({ rowId: row.id, tick, x: e.clientX, y: e.clientY });
            }}
            className="absolute top-0 bottom-0"
            style={{ left: `${(c / steps) * 100}%`, width: `${(1 / steps) * 100}%`, padding: '3px 1.5px' }}
          >
            <span
              className={`block h-full w-full rounded-[3px] ${active ? 'pad-glow' : ''}`}
              style={{
                background: active
                  ? `rgba(255, 107, 0, ${intensity})`
                  : beatStart
                    ? 'var(--color-surface-2)'
                    : 'var(--color-surface)',
                border: `1px solid ${
                  isPlayhead ? 'var(--color-playhead)' : active ? 'var(--color-accent)' : 'var(--color-border)'
                }`,
                boxShadow: isPlayhead ? '0 0 8px var(--color-playhead-glow)' : undefined,
              }}
            />
          </button>
        );
      })}

      {/* off-grid notes — kept exactly where they were, shown as slim markers */}
      {offGrid.map((t) => (
        <button
          key={`og-${t}`}
          type="button"
          title="Off-grid hit (kept in place). Switch to a matching grid to edit, or click to remove."
          aria-label={`Off-grid hit at tick ${t} — click to remove`}
          onClick={() => removeNote(row.id, t)}
          className="absolute top-1 bottom-1 z-10 w-[6px] -translate-x-1/2 rounded-sm"
          style={{
            left: `${(t / TICKS_PER_BAR) * 100}%`,
            background: 'var(--color-playhead)',
            boxShadow: '0 0 8px var(--color-playhead-glow)',
            opacity: 0.85,
          }}
        />
      ))}

      {/* playhead line */}
      {playCol >= 0 && (
        <div
          className="pointer-events-none absolute top-0 bottom-0 z-20 w-px"
          style={{
            left: `${(currentTick / TICKS_PER_BAR) * 100}%`,
            background: 'var(--color-playhead)',
            opacity: 0.5,
          }}
        />
      )}
    </div>
  );
}

function BeatRuler({ res }) {
  const { steps } = res;
  return (
    <div className="flex items-end" style={{ height: 22 }}>
      <div className="shrink-0" style={{ width: LABEL_W }} />
      <div className="relative flex-1">
        {[0, 1, 2, 3].map((b) => (
          <span
            key={b}
            className="absolute bottom-0 font-mono text-[10px] font-bold"
            style={{ left: `${b * 25}%`, color: 'var(--color-text-secondary)', transform: 'translateX(2px)' }}
          >
            {b + 1}
          </span>
        ))}
        {/* faint tick marks for each cell so subdivisions are visible */}
        {Array.from({ length: steps }, (_, c) => (
          <span
            key={c}
            className="absolute bottom-0 w-px"
            style={{
              left: `${(c / steps) * 100}%`,
              height: c % (steps / 4) === 0 ? 8 : 4,
              background: 'var(--color-border)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ResolutionPicker() {
  const resolution = useGrooveStore((s) => s.resolution);
  const setResolution = useGrooveStore((s) => s.setResolution);

  const Group = ({ keys }) => (
    <div className="flex">
      {keys.map((k, i) => (
        <button
          key={k}
          type="button"
          onClick={() => setResolution(k)}
          aria-pressed={resolution === k}
          className={`h-9 px-3 font-mono text-xs ${i === 0 ? 'rounded-l' : ''} ${
            i === keys.length - 1 ? 'rounded-r' : ''
          }`}
          style={{
            background: resolution === k ? 'var(--color-accent)' : 'var(--color-surface-2)',
            color: resolution === k ? '#0a0a0c' : 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
            marginLeft: i === 0 ? 0 : -1,
            fontWeight: resolution === k ? 700 : 400,
          }}
        >
          {RESOLUTIONS[k].label}
        </button>
      ))}
    </div>
  );

  const straight = RESOLUTION_ORDER.filter((k) => !RESOLUTIONS[k].triplet);
  const triplet = RESOLUTION_ORDER.filter((k) => RESOLUTIONS[k].triplet);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="panel-title">Grid</span>
      <div className="flex flex-wrap items-center gap-2">
        <Group keys={straight} />
        <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">triplets</span>
        <Group keys={triplet} />
      </div>
    </div>
  );
}

function PatternManager() {
  const savedPatterns = useGrooveStore((s) => s.savedPatterns);
  const activePatternName = useGrooveStore((s) => s.activePatternName);
  const savePattern = useGrooveStore((s) => s.savePattern);
  const loadPattern = useGrooveStore((s) => s.loadPattern);
  const duplicatePattern = useGrooveStore((s) => s.duplicatePattern);
  const clearPattern = useGrooveStore((s) => s.clearPattern);
  const names = Object.keys(savedPatterns).sort();

  const onSave = () => {
    const name = window.prompt('Pattern name:', activePatternName || 'pattern 1');
    if (!name || !name.trim()) return;
    savePattern(name.trim());
    toast.success(`Pattern "${name.trim()}" saved`);
  };

  const onLoad = (e) => {
    const name = e.target.value;
    if (!name) return;
    if (loadPattern(name)) toast.info(`Loaded "${name}"`);
    e.target.value = '';
  };

  const onDuplicate = () => {
    if (!activePatternName) {
      toast.warning('Save the pattern first, then duplicate');
      return;
    }
    const copy = duplicatePattern(activePatternName);
    if (copy) toast.success(`Duplicated as "${copy}"`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="btn" onClick={onSave}>
        <Save size={14} /> Save
      </button>
      <select className="select" onChange={onLoad} value="" aria-label="Load pattern" disabled={!names.length}>
        <option value="">{names.length ? 'Load…' : 'No saved patterns'}</option>
        {names.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <button type="button" className="btn" onClick={onDuplicate}>
        <Copy size={14} /> Duplicate
      </button>
      <button
        type="button"
        className="btn btn-danger-outline"
        onClick={() => {
          clearPattern();
          toast.info('All hits cleared');
        }}
      >
        <Trash2 size={14} /> Clear
      </button>
    </div>
  );
}

export default function GrooveEditor() {
  const rows = useGrooveStore((s) => s.rows);
  const bpm = useGrooveStore((s) => s.bpm);
  const swing = useGrooveStore((s) => s.swing);
  const setSwing = useGrooveStore((s) => s.setSwing);
  const isPlaying = useGrooveStore((s) => s.isPlaying);
  const resolution = useGrooveStore((s) => s.resolution);
  const loopEnabled = useGrooveStore((s) => s.loopEnabled);
  const toggleLoop = useGrooveStore((s) => s.toggleLoop);
  const previewSound = useGrooveStore((s) => s.previewSound);
  const setPreviewSound = useGrooveStore((s) => s.setPreviewSound);
  const activePatternName = useGrooveStore((s) => s.activePatternName);

  const res = RESOLUTIONS[resolution] || RESOLUTIONS['1/16'];

  const { play, stop, reset } = useSequencer();
  const [velocityPopup, setVelocityPopup] = useState(null); // { rowId, tick, x, y }
  const [beamOpen, setBeamOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const onExport = useCallback(() => {
    const ok = exportGrooveAsMidi(rows, bpm, activePatternName || 'untitled');
    if (ok) toast.success('Exported .mid file');
    else toast.warning('Nothing to export — add some hits first');
  }, [rows, bpm, activePatternName]);

  const popupRow = velocityPopup && rows.find((r) => r.id === velocityPopup.rowId);
  const popupVelocity = popupRow ? popupRow.notes[velocityPopup.tick] ?? DEFAULT_VELOCITY : DEFAULT_VELOCITY;

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-tight">Groove editor</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            {activePatternName ? `Pattern: ${activePatternName}` : 'Unsaved pattern'} · 1 bar · {res.label} grid ·{' '}
            {bpm} BPM
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-accent" onClick={() => setBeamOpen(true)}>
            <Cast size={14} /> Beam to MPC
          </button>
          <button type="button" className="btn btn-info" onClick={onExport}>
            <Download size={14} /> Export .mid
          </button>
        </div>
      </div>

      {/* Transport + performance controls */}
      <div className="panel flex flex-wrap items-center gap-x-6 gap-y-4 p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-accent h-11 w-16"
            onClick={isPlaying ? stop : play}
            aria-label={isPlaying ? 'Stop' : 'Play'}
          >
            {isPlaying ? <Square size={18} /> : <Play size={18} />}
          </button>
          <button type="button" className="btn h-11" onClick={reset} aria-label="Reset playhead">
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            className="btn h-11"
            onClick={toggleLoop}
            aria-pressed={loopEnabled}
            aria-label="Toggle loop"
            style={loopEnabled ? { borderColor: 'var(--color-accent)', color: 'var(--color-accent)' } : undefined}
          >
            <Repeat size={16} /> Loop
          </button>
          <button
            type="button"
            className="btn h-11"
            onClick={() => setPreviewSound(!previewSound)}
            aria-pressed={previewSound}
            title="Hear the drums through the browser — no MPC needed"
            style={previewSound ? { borderColor: 'var(--color-accent)', color: 'var(--color-accent)' } : undefined}
          >
            {previewSound ? <Volume2 size={16} /> : <VolumeX size={16} />} Sound
          </button>
        </div>

        <Knob label="Swing" value={swing} min={0} max={100} unit="%" onChange={setSwing} defaultValue={0} />

        <ResolutionPicker />

        <div className="ml-0 w-full xl:ml-auto xl:w-auto">
          <PatternManager />
        </div>
      </div>

      {/* Step grid */}
      <div className="panel p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="panel-title">Pattern · {res.label}</span>
          <button
            type="button"
            className="flex items-center gap-1.5 font-mono text-[11px] text-text-muted hover:text-text-secondary"
            onClick={() => setShowHelp((v) => !v)}
            aria-expanded={showHelp}
          >
            <HelpCircle size={13} /> How it works
          </button>
        </div>

        {showHelp && (
          <div
            className="mb-3 rounded-md border p-3 font-mono text-[11px] leading-relaxed text-text-secondary"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}
          >
            <b className="text-text-primary">Click</b> a cell to place a hit ·{' '}
            <b className="text-text-primary">right-click</b> a hit for velocity · the four numbered{' '}
            <b className="text-text-primary">beats</b> stay fixed so you can see how triplets divide the bar. Switching the{' '}
            <b className="text-text-primary">Grid</b> never moves your hits — any that don't line up with the new grid show as{' '}
            <span style={{ color: 'var(--color-playhead)' }}>yellow markers</span> you can click to remove.
          </div>
        )}

        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            <BeatRuler res={res} />
            <div className="mt-1 flex flex-col gap-[5px]">
              {rows.map((row) => (
                <div key={row.id} className="flex items-center">
                  <RowControls row={row} />
                  <div className="flex-1">
                    <GridRow row={row} res={res} onVelocityRequest={setVelocityPopup} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {velocityPopup && (
        <VelocitySlider
          x={velocityPopup.x}
          y={velocityPopup.y}
          velocity={popupVelocity}
          onChange={(v) => useGrooveStore.getState().setNoteVelocity(velocityPopup.rowId, velocityPopup.tick, v)}
          onClose={() => setVelocityPopup(null)}
        />
      )}

      <BeamModal open={beamOpen} onClose={() => setBeamOpen(false)} isPlaying={isPlaying} play={play} stop={stop} />
    </div>
  );
}
