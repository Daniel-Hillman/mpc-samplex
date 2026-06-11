import { FileText, FileMusic, Play, Volume2, VolumeX } from 'lucide-react';
import { useChordStore } from '../store/chordStore';
import { useAudition } from '../hooks/useAudition';
import { ROOT_NOTES } from '../lib/constants';
import {
  SCALE_LABELS,
  getScalePitchClasses,
  getPadMapNotes,
  getAllChordsInKey,
  getRelativeKey,
  getParallelModes,
  getIntervalNames,
  midiNoteToName,
  NOTE_NAMES,
} from '../lib/music-theory';
import { exportPadMapAsMidi, exportPadMapAsText } from '../lib/export';
import { toast } from '../store/toastStore';
import PadButton from '../components/ui/PadButton';

const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_PC_LEFT = { 1: 18, 3: 46, 6: 102, 8: 130, 10: 158 };

function PianoRoll({ scalePcs, rootPc }) {
  // Two octaves: 14 white keys, 28px each
  const octaves = [0, 1];
  return (
    <div className="relative h-32" style={{ width: 14 * 28 }}>
      <div className="flex h-full">
        {octaves.map((o) =>
          WHITE_PCS.map((pc) => {
            const inScale = scalePcs.includes(pc);
            const isRoot = pc === rootPc;
            return (
              <div
                key={`${o}-${pc}`}
                className="flex h-full w-[28px] items-end justify-center rounded-b border pb-1.5"
                style={{
                  background: isRoot && inScale ? 'var(--color-accent)' : inScale ? '#E8E8EC' : '#3A3A42',
                  borderColor: 'var(--color-bg)',
                  boxShadow: isRoot && inScale ? '0 0 12px var(--color-accent-glow)' : undefined,
                }}
              >
                <span
                  className="font-mono text-[9px] font-bold"
                  style={{ color: isRoot && inScale ? '#0a0a0c' : inScale ? '#131316' : '#6A6A75' }}
                >
                  {NOTE_NAMES[pc]}
                </span>
              </div>
            );
          })
        )}
      </div>
      {octaves.map((o) =>
        Object.entries(BLACK_PC_LEFT).map(([pcStr, left]) => {
          const pc = Number(pcStr);
          const inScale = scalePcs.includes(pc);
          const isRoot = pc === rootPc;
          return (
            <div
              key={`${o}-${pc}`}
              className="absolute top-0 flex h-[60%] w-[18px] items-end justify-center rounded-b pb-1"
              style={{
                left: left + o * 196,
                background: isRoot && inScale ? 'var(--color-accent)' : inScale ? '#8E8E9A' : '#101013',
                border: '1px solid var(--color-bg)',
                boxShadow: isRoot && inScale ? '0 0 12px var(--color-accent-glow)' : undefined,
              }}
            >
              <span className="font-mono text-[8px] font-bold" style={{ color: inScale ? '#0a0a0c' : '#3F3F4A' }}>
                {NOTE_NAMES[pc].replace('#', '♯')}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}

export default function ScaleHelper() {
  const scaleRoot = useChordStore((s) => s.scaleRoot);
  const scaleName = useChordStore((s) => s.scaleName);
  const scaleOctave = useChordStore((s) => s.scaleOctave);
  const setScaleRoot = useChordStore((s) => s.setScaleRoot);
  const setScaleName = useChordStore((s) => s.setScaleName);
  const setScaleOctave = useChordStore((s) => s.setScaleOctave);
  const { playNote, playNotes, previewSound, setPreviewSound, hasOutput } = useAudition();

  const scalePcs = getScalePitchClasses(scaleRoot, scaleName);
  const rootPc = NOTE_NAMES.indexOf(scaleRoot);
  const padNotes = getPadMapNotes(scaleRoot, scaleName, scaleOctave);
  const chordsInKey = getAllChordsInKey(scaleRoot, scaleName, scaleOctave + 1);
  const relative = getRelativeKey(scaleRoot, scaleName);
  const modes = getParallelModes(scaleRoot, scaleName);
  const intervalNames = getIntervalNames(scaleName);
  const scaleLabel = SCALE_LABELS[scaleName];

  // MPC layout: pad 13–16 on top row, 1–4 on bottom
  const padGridOrder = [12, 13, 14, 15, 8, 9, 10, 11, 4, 5, 6, 7, 0, 1, 2, 3];

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-tight">Scale helper</h1>
          <p className="mt-0.5 text-sm text-text-secondary">Explore scales and map them straight onto your pads.</p>
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => setPreviewSound(!previewSound)}
          aria-pressed={previewSound}
          title="Play notes through the browser — no MIDI device needed"
          style={previewSound ? { borderColor: 'var(--color-accent)', color: 'var(--color-accent)' } : undefined}
        >
          {previewSound ? <Volume2 size={14} /> : <VolumeX size={14} />}
          Browser sound {previewSound ? 'on' : 'off'}
        </button>
      </div>

      {/* Explorer controls */}
      <section className="panel p-5">
        <h2 className="panel-title mb-4">Scale explorer</h2>
        <div className="mb-4 flex flex-wrap items-end gap-5">
          <div>
            <span className="mb-1.5 block font-mono text-xs text-text-muted">Root</span>
            <div className="flex flex-wrap gap-1">
              {ROOT_NOTES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setScaleRoot(r)}
                  aria-pressed={scaleRoot === r}
                  className="h-9 w-9 rounded font-mono text-xs font-semibold"
                  style={{
                    background: scaleRoot === r ? 'var(--color-accent)' : 'var(--color-surface-2)',
                    color: scaleRoot === r ? '#0a0a0c' : 'var(--color-text-secondary)',
                    border: `1px solid ${scaleRoot === r ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="mb-1.5 block font-mono text-xs text-text-muted">Scale / mode</span>
            <select className="select" value={scaleName} onChange={(e) => setScaleName(e.target.value)} aria-label="Scale">
              {Object.entries(SCALE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="mb-1.5 block font-mono text-xs text-text-muted">Pad octave</span>
            <select
              className="select"
              value={scaleOctave}
              onChange={(e) => setScaleOctave(Number(e.target.value))}
              aria-label="Pad start octave"
            >
              {[0, 1, 2, 3, 4, 5].map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-10">
          <div className="max-w-full overflow-x-auto pb-1">
            <PianoRoll scalePcs={scalePcs} rootPc={rootPc} />
          </div>
          <div>
            <div className="mb-1 font-mono text-xs uppercase tracking-wider text-text-muted">Notes</div>
            <div className="mb-3 flex gap-1.5">
              {scalePcs.map((pc, i) => (
                <span
                  key={i}
                  className="rounded px-2 py-1 font-mono text-sm font-semibold"
                  style={{
                    background: pc === rootPc ? 'var(--color-accent)' : 'var(--color-surface-2)',
                    color: pc === rootPc ? '#0a0a0c' : 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {NOTE_NAMES[pc]}
                </span>
              ))}
            </div>
            <div className="mb-1 font-mono text-xs uppercase tracking-wider text-text-muted">Intervals</div>
            <div className="flex gap-1.5">
              {intervalNames.map((iv, i) => (
                <span key={i} className="rounded px-2 py-1 font-mono text-xs text-text-secondary" style={{ border: '1px solid var(--color-border)' }}>
                  {iv}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Diatonic chords */}
        {chordsInKey.length > 0 && (
          <div className="mt-5">
            <div className="mb-2 font-mono text-xs uppercase tracking-wider text-text-muted">Chords in key</div>
            <div className="flex flex-wrap gap-1.5">
              {chordsInKey.map((c) => (
                <button
                  key={c.degree}
                  type="button"
                  onClick={() => {
                    if (!playNotes(c.notes, 700, 95)) toast.warning('Turn on Browser sound or select a MIDI output');
                  }}
                  className="flex flex-col items-center rounded border px-3 py-2 transition-colors hover:border-[var(--color-accent)]"
                  style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)' }}
                  title={`Play ${c.name}`}
                >
                  <span className="font-mono text-[10px] text-text-muted">{c.roman}</span>
                  <span className="font-mono text-sm font-bold">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Pad mapper */}
        <section className="panel p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="panel-title">MPC pad mapper</h2>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-info"
                onClick={() => {
                  exportPadMapAsText(padNotes, scaleLabel, scaleRoot);
                  toast.success('Pad map exported as .txt');
                }}
              >
                <FileText size={14} /> .txt
              </button>
              <button
                type="button"
                className="btn btn-info"
                onClick={() => {
                  exportPadMapAsMidi(padNotes, scaleLabel, scaleRoot);
                  toast.success('Pad map exported as .mid');
                }}
              >
                <FileMusic size={14} /> .mid
              </button>
            </div>
          </div>

          <div className="mx-auto grid max-w-[420px] grid-cols-4 gap-2.5">
            {padGridOrder.map((idx) => {
              const note = padNotes[idx];
              return (
                <PadButton
                  key={idx}
                  topLabel={idx + 1}
                  mainLabel={note != null ? midiNoteToName(note) : '—'}
                  subLabel={note != null ? note : ''}
                  inScale={note != null}
                  onTrigger={() => {
                    if (!playNote(note, 105, 220)) toast.warning('Turn on Browser sound or select a MIDI output');
                  }}
                />
              );
            })}
          </div>
          <p className="mt-3 text-center font-mono text-[11px] text-text-muted">
            {scaleRoot} {scaleLabel} from octave {scaleOctave} · pad 1 bottom-left · click a pad to hear it
            {!hasOutput && !previewSound && ' (no MIDI output and browser sound is off)'}
          </p>
        </section>

        {/* Relative key + modes */}
        <section className="panel p-5">
          <h2 className="panel-title mb-4">Relative key finder</h2>
          {relative ? (
            <button
              type="button"
              className="mb-5 flex items-center gap-3 rounded-md border px-4 py-3 text-left transition-colors hover:border-[var(--color-accent)]"
              style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)' }}
              onClick={() => {
                setScaleRoot(relative.rootName);
                setScaleName(relative.scaleName);
                toast.info(`Switched to ${relative.rootName} ${SCALE_LABELS[relative.scaleName]}`);
              }}
            >
              <span className="font-mono text-xs uppercase tracking-wider text-text-muted">{relative.label}</span>
              <span className="font-mono text-lg font-bold" style={{ color: 'var(--color-accent)' }}>
                {relative.rootName} {SCALE_LABELS[relative.scaleName]}
              </span>
              <Play size={14} className="ml-auto" style={{ color: 'var(--color-text-muted)' }} />
            </button>
          ) : (
            <p className="mb-5 font-mono text-sm text-text-muted">No simple relative key for this scale.</p>
          )}

          <h3 className="panel-title mb-3">Modes of the same parent scale</h3>
          {modes.length ? (
            <div className="flex flex-col gap-1">
              {modes.map((m) => (
                <button
                  key={m.scaleName}
                  type="button"
                  onClick={() => {
                    setScaleRoot(m.rootName);
                    setScaleName(m.scaleName);
                  }}
                  className="flex items-center justify-between rounded border px-3 py-2 font-mono text-sm transition-colors hover:border-[var(--color-border-bright)]"
                  style={{
                    background: m.isCurrent ? 'var(--color-accent-dim)' : 'var(--color-surface-2)',
                    borderColor: m.isCurrent ? 'var(--color-accent)' : 'var(--color-border)',
                    color: m.isCurrent ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  }}
                >
                  <span className="font-semibold">{m.rootName} {m.label}</span>
                  {m.isCurrent && <span className="text-[10px] uppercase" style={{ color: 'var(--color-accent)' }}>current</span>}
                </button>
              ))}
            </div>
          ) : (
            <p className="font-mono text-sm text-text-muted">
              Modal rotation applies to the seven diatonic modes — pick Major, Dorian, Phrygian, Lydian, Mixolydian,
              Natural Minor or Locrian.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
