import { useState, useCallback } from 'react';
import { Play, Square, RotateCcw, Save, Copy, Trash2, Download, Repeat, Cast } from 'lucide-react';
import { useGrooveStore } from '../store/grooveStore';
import { useSequencer } from '../hooks/useSequencer';
import { useMidi } from '../hooks/useMidi';
import { exportGrooveAsMidi } from '../lib/export';
import { midiNoteToName } from '../lib/music-theory';
import { toast } from '../store/toastStore';
import StepCell from '../components/ui/StepCell';
import VelocitySlider from '../components/ui/VelocitySlider';
import Knob from '../components/ui/Knob';
import BeamModal from '../components/ui/BeamModal';

function RowControls({ row }) {
  const setRowLabel = useGrooveStore((s) => s.setRowLabel);
  const setRowNote = useGrooveStore((s) => s.setRowNote);
  const toggleMute = useGrooveStore((s) => s.toggleMute);
  const toggleSolo = useGrooveStore((s) => s.toggleSolo);
  const { sendNote } = useMidi();

  return (
    <div className="flex w-[252px] shrink-0 items-center gap-1.5 pr-2">
      <input
        className="input h-9 w-[88px] px-2 text-xs"
        value={row.label}
        onChange={(e) => setRowLabel(row.id, e.target.value)}
        aria-label="Row label"
      />
      <div className="flex items-center">
        <input
          type="number"
          className="input h-9 w-[52px] rounded-r-none px-1.5 text-center text-xs"
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
          onClick={() => sendNote(row.midiNote, 100, 120)}
        >
          {midiNoteToName(row.midiNote)}
        </button>
      </div>
      <button
        type="button"
        onClick={() => toggleMute(row.id)}
        aria-pressed={row.muted}
        aria-label={`Mute ${row.label}`}
        className="h-7 w-7 rounded-full font-mono text-xs font-bold transition-colors"
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
        className="h-7 w-7 rounded-full font-mono text-xs font-bold transition-colors"
        style={{
          background: row.soloed ? 'var(--color-success)' : 'var(--color-surface-2)',
          color: row.soloed ? '#0a0a0c' : 'var(--color-text-secondary)',
          border: `1px solid ${row.soloed ? 'var(--color-success)' : 'var(--color-border)'}`,
        }}
      >
        S
      </button>
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
          toast.info('Grid cleared');
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
  const currentStep = useGrooveStore((s) => s.currentStep);
  const resolution = useGrooveStore((s) => s.resolution);
  const setResolution = useGrooveStore((s) => s.setResolution);
  const loopEnabled = useGrooveStore((s) => s.loopEnabled);
  const toggleLoop = useGrooveStore((s) => s.toggleLoop);
  const toggleStep = useGrooveStore((s) => s.toggleStep);
  const setStepVelocity = useGrooveStore((s) => s.setStepVelocity);
  const activePatternName = useGrooveStore((s) => s.activePatternName);

  const { play, stop, reset } = useSequencer();
  const [velocityPopup, setVelocityPopup] = useState(null); // { rowId, stepIdx, x, y }
  const [beamOpen, setBeamOpen] = useState(false);

  const onExport = useCallback(() => {
    const ok = exportGrooveAsMidi(rows, bpm, activePatternName || 'untitled');
    if (ok) toast.success('Exported .mid file');
    else toast.warning('Nothing to export — add some steps first');
  }, [rows, bpm, activePatternName]);

  const popupRow = velocityPopup && rows.find((r) => r.id === velocityPopup.rowId);
  const popupVelocity = popupRow ? popupRow.steps[velocityPopup.stepIdx].velocity : 100;

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-tight">Groove editor</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            {activePatternName ? `Pattern: ${activePatternName}` : 'Unsaved pattern'} · 16 steps · {bpm} BPM
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
            style={
              loopEnabled
                ? { borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }
                : undefined
            }
          >
            <Repeat size={16} /> Loop
          </button>
        </div>

        <Knob label="Swing" value={swing} min={0} max={100} unit="%" onChange={setSwing} defaultValue={0} />

        <div className="flex flex-col gap-1.5">
          <span className="panel-title">Resolution</span>
          <div className="flex">
            {['1/16', '1/8'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setResolution(r)}
                aria-pressed={resolution === r}
                className="px-3 py-1.5 font-mono text-xs first:rounded-l last:rounded-r"
                style={{
                  background: resolution === r ? 'var(--color-accent)' : 'var(--color-surface-2)',
                  color: resolution === r ? '#0a0a0c' : 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                  fontWeight: resolution === r ? 700 : 400,
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="ml-0 w-full xl:ml-auto xl:w-auto">
          <PatternManager />
        </div>
      </div>

      {/* Step grid */}
      <div className="panel overflow-x-auto p-4">
        {/* Beat numbers */}
        <div className="mb-2 flex">
          <div className="w-[252px] shrink-0" />
          <div className="flex gap-[3px]">
            {Array.from({ length: 16 }, (_, i) => (
              <div
                key={i}
                className="flex h-5 w-9 items-center justify-center font-mono text-[10px]"
                style={{
                  color:
                    currentStep === i
                      ? 'var(--color-playhead)'
                      : i % 4 === 0
                        ? 'var(--color-text-secondary)'
                        : 'var(--color-text-muted)',
                  fontWeight: currentStep === i ? 700 : 400,
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        <div className="flex flex-col gap-[3px]">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center">
              <RowControls row={row} />
              <div className="flex gap-[3px]">
                {row.steps.map((step, i) => (
                  <StepCell
                    key={i}
                    active={step.active}
                    velocity={step.velocity}
                    isPlayhead={currentStep === i && isPlaying}
                    isDownbeat={i % 4 === 0}
                    rowLabel={row.label}
                    stepIdx={i}
                    onToggle={() => toggleStep(row.id, i)}
                    onVelocityRequest={(e) =>
                      setVelocityPopup({ rowId: row.id, stepIdx: i, x: e.clientX, y: e.clientY })
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-3 font-mono text-[11px] text-text-muted">
          Click to toggle · right-click for velocity · M mutes · S solos
        </p>
      </div>

      {velocityPopup && (
        <VelocitySlider
          x={velocityPopup.x}
          y={velocityPopup.y}
          velocity={popupVelocity}
          onChange={(v) => setStepVelocity(velocityPopup.rowId, velocityPopup.stepIdx, v)}
          onClose={() => setVelocityPopup(null)}
        />
      )}

      <BeamModal open={beamOpen} onClose={() => setBeamOpen(false)} isPlaying={isPlaying} play={play} stop={stop} />
    </div>
  );
}
