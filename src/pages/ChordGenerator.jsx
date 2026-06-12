import { useEffect, useRef, useCallback, useState } from 'react';
import * as Tone from 'tone';
import {
  Play,
  Square,
  Download,
  Repeat,
  ArrowUp,
  ArrowDown,
  Trash2,
  GripVertical,
  Volume2,
  VolumeX,
  Plus,
  Waves,
  Grid3x3,
} from 'lucide-react';
import { useChordStore } from '../store/chordStore';
import { useGrooveStore } from '../store/grooveStore';
import { useAudition } from '../hooks/useAudition';
import { exportChordProgressionAsMidi } from '../lib/export';
import { ROOT_NOTES as ROOTS } from '../lib/constants';
import {
  CHORD_LABELS,
  VOICINGS,
  SCALE_LABELS,
  NOTE_NAMES,
  midiNoteToName,
  getPadMapNotes,
  getAllChordsInKey,
  getChordDisplayName,
  mapChordTo16Levels,
  getRetuneOptions,
  voiceLeadChord,
  voiceLeadProgression,
} from '../lib/music-theory';
import { toast } from '../store/toastStore';

const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_KEYS = [
  { pc: 1, left: 9.5 },
  { pc: 3, left: 23.5 },
  { pc: 6, left: 51.5 },
  { pc: 8, left: 65.5 },
  { pc: 10, left: 79.5 },
];

// Same 3-state code as the Scale keyboard: chord tones glow orange, everything
// else recedes into the panel so the chord shape reads instantly.
function MiniPiano({ notes }) {
  const pcs = new Set(notes.map((n) => ((n % 12) + 12) % 12));
  return (
    <div className="relative h-24" style={{ width: 98 }}>
      <div className="flex h-full">
        {WHITE_KEYS.map((pc) => (
          <div
            key={pc}
            className="h-full w-[14px] rounded-b-sm border"
            style={{
              background: pcs.has(pc) ? 'var(--color-accent)' : 'var(--key-off)',
              borderColor: 'var(--color-bg)',
              boxShadow: pcs.has(pc) ? '0 0 10px var(--color-accent-glow)' : undefined,
            }}
          />
        ))}
      </div>
      {BLACK_KEYS.map(({ pc, left }) => (
        <div
          key={pc}
          className="absolute top-0 h-[58%] w-[9px] rounded-b-sm"
          style={{
            left,
            background: pcs.has(pc) ? 'var(--color-accent)' : 'var(--key-off-black)',
            border: '1px solid var(--color-bg)',
            boxShadow: pcs.has(pc) ? '0 0 10px var(--color-accent-glow)' : undefined,
          }}
        />
      ))}
    </div>
  );
}

function SoundToggle() {
  const { previewSound, setPreviewSound } = useAudition();
  return (
    <button
      type="button"
      className="btn"
      onClick={() => setPreviewSound(!previewSound)}
      aria-pressed={previewSound}
      title="Play chords through the browser — no MIDI device needed"
      style={previewSound ? { borderColor: 'var(--color-accent)', color: 'var(--color-accent)' } : undefined}
    >
      {previewSound ? <Volume2 size={14} /> : <VolumeX size={14} />}
      Browser sound {previewSound ? 'on' : 'off'}
    </button>
  );
}

function ChordBuilder() {
  const root = useChordStore((s) => s.root);
  const chordType = useChordStore((s) => s.chordType);
  const voicing = useChordStore((s) => s.voicing);
  const octave = useChordStore((s) => s.octave);
  const setRoot = useChordStore((s) => s.setRoot);
  const setChordType = useChordStore((s) => s.setChordType);
  const setVoicing = useChordStore((s) => s.setVoicing);
  const setOctave = useChordStore((s) => s.setOctave);
  const currentChord = useChordStore((s) => s.currentChord);
  const addToProgression = useChordStore((s) => s.addToProgression);
  const bpm = useGrooveStore((s) => s.bpm);
  const { playNotes, previewSound, hasOutput } = useAudition();

  const chord = currentChord();
  const beatMs = 60000 / bpm;
  const canSound = previewSound || hasOutput;

  const playChord = () => {
    if (!playNotes(chord.notes, beatMs * 1.6, 100)) {
      toast.warning('Turn on Browser sound or select a MIDI output');
    }
  };

  const strum = (direction) => {
    if (!playNotes(chord.notes, beatMs * 1.5, 100, 55, direction)) {
      toast.warning('Turn on Browser sound or select a MIDI output');
    }
  };

  const onAdd = () => {
    const idx = addToProgression(chord);
    if (idx < 0) toast.warning('Progression is full — clear a slot first');
    else toast.success(`${chord.name} → slot ${idx + 1}`);
  };

  return (
    <section className="panel p-5">
      <h2 className="panel-title section-head mb-4">Chord builder</h2>

      {/* Root selector */}
      <div className="mb-4">
        <span className="mb-1.5 block font-mono text-xs text-text-muted">Root</span>
        <div className="grid grid-cols-6 gap-1 sm:grid-cols-12">
          {ROOTS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoot(r)}
              aria-pressed={root === r}
              className="h-9 rounded font-mono text-xs font-semibold transition-colors"
              style={{
                background: root === r ? 'var(--color-accent)' : 'var(--color-surface-2)',
                color: root === r ? '#0a0a0c' : 'var(--color-text-secondary)',
                border: `1px solid ${root === r ? 'var(--color-accent)' : 'var(--color-border)'}`,
                boxShadow: root === r ? '0 0 12px var(--color-accent-glow)' : undefined,
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chord type */}
      <div className="mb-4">
        <span className="mb-1.5 block font-mono text-xs text-text-muted">Type</span>
        <div className="grid grid-cols-3 gap-1 sm:grid-cols-6">
          {Object.entries(CHORD_LABELS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setChordType(key)}
              aria-pressed={chordType === key}
              className="h-9 rounded font-mono text-xs transition-colors"
              style={{
                background: chordType === key ? 'var(--color-accent-dim)' : 'var(--color-surface-2)',
                color: chordType === key ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                border: `1px solid ${chordType === key ? 'var(--color-accent)' : 'var(--color-border)'}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div>
          <span className="mb-1.5 block font-mono text-xs text-text-muted">Voicing</span>
          <select className="select" value={voicing} onChange={(e) => setVoicing(e.target.value)} aria-label="Voicing">
            {Object.entries(VOICINGS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="mb-1.5 block font-mono text-xs text-text-muted">Octave</span>
          <div className="flex">
            {[1, 2, 3, 4, 5, 6, 7].map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOctave(o)}
                aria-pressed={octave === o}
                className="h-9 w-9 font-mono text-xs first:rounded-l last:rounded-r"
                style={{
                  background: octave === o ? 'var(--color-accent)' : 'var(--color-surface-2)',
                  color: octave === o ? '#0a0a0c' : 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                  fontWeight: octave === o ? 700 : 400,
                }}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions + draggable chip */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-accent h-11 px-5" onClick={playChord} disabled={!canSound}>
          <Play size={16} /> Play chord
        </button>
        <button type="button" className="btn h-11" onClick={() => strum('up')} disabled={!canSound}>
          <ArrowUp size={14} /> Strum
        </button>
        <button type="button" className="btn h-11" onClick={() => strum('down')} disabled={!canSound}>
          <ArrowDown size={14} /> Strum
        </button>
        <button type="button" className="btn h-11" onClick={onAdd} title="Add to first empty progression slot">
          <Plus size={14} /> Add to progression
        </button>

        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('application/x-mpc-chord', JSON.stringify(chord));
            e.dataTransfer.effectAllowed = 'copy';
          }}
          className="ml-auto flex cursor-grab items-center gap-2 rounded-md border px-4 py-2.5 active:cursor-grabbing"
          style={{
            background: 'var(--color-surface-2)',
            borderColor: 'var(--color-accent)',
            boxShadow: '0 0 12px var(--color-accent-glow)',
          }}
          title="Drag into a progression slot"
        >
          <GripVertical size={14} style={{ color: 'var(--color-text-muted)' }} />
          <span className="font-mono text-base font-bold">{chord.name}</span>
          <span className="font-mono text-xs text-text-secondary">drag to slot</span>
        </div>
      </div>
    </section>
  );
}

function InKeyPalette() {
  const scaleRoot = useChordStore((s) => s.scaleRoot);
  const scaleName = useChordStore((s) => s.scaleName);
  const scaleOctave = useChordStore((s) => s.scaleOctave);
  const setScaleRoot = useChordStore((s) => s.setScaleRoot);
  const setScaleName = useChordStore((s) => s.setScaleName);
  const addToProgression = useChordStore((s) => s.addToProgression);
  const { playNotes } = useAudition();

  const chords = getAllChordsInKey(scaleRoot, scaleName, scaleOctave + 1);
  if (!chords.length) return null;

  const toChordObject = (c) => ({
    name: c.name,
    root: c.rootName,
    chordType: c.type === 'unknown' ? 'major' : c.type,
    voicing: 'root',
    octave: scaleOctave + 1,
    notes: c.notes,
  });

  return (
    <section className="panel p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="panel-title section-head">Chords in key</h2>
        <div className="flex flex-wrap items-center gap-2">
          <select className="select" value={scaleRoot} onChange={(e) => setScaleRoot(e.target.value)} aria-label="Key root">
            {ROOTS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select className="select" value={scaleName} onChange={(e) => setScaleName(e.target.value)} aria-label="Key scale">
            {Object.entries(SCALE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {chords.map((c) => (
          <div
            key={c.degree}
            className="flex items-stretch overflow-hidden rounded-md border"
            style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)' }}
          >
            <button
              type="button"
              onClick={() => playNotes(c.notes, 800, 95)}
              className="flex flex-col items-center px-3 py-2 transition-colors hover:bg-[var(--color-surface)]"
              title={`Hear ${c.name}`}
            >
              <span className="font-mono text-[10px] text-text-muted">{c.roman}</span>
              <span className="font-mono text-sm font-bold">{c.name}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const idx = addToProgression(toChordObject(c));
                if (idx < 0) toast.warning('Progression is full');
                else toast.success(`${c.name} → slot ${idx + 1}`);
              }}
              className="flex items-center border-l px-1.5 text-text-muted transition-colors hover:text-[var(--color-accent)]"
              style={{ borderColor: 'var(--color-border)' }}
              aria-label={`Add ${c.name} to progression`}
              title="Add to progression"
            >
              <Plus size={13} />
            </button>
          </div>
        ))}
      </div>
      <p className="mt-3 font-mono text-[11px] text-text-muted">
        Diatonic chords of {scaleRoot} {SCALE_LABELS[scaleName]} — every chord here fits together. Click to hear,
        + to drop into the progression. Classic moves: I–IV–V, ii–V–I, i–VI–III–VII.
      </p>
    </section>
  );
}

function ProgressionBuilder() {
  const progression = useChordStore((s) => s.progression);
  const setSlot = useChordStore((s) => s.setSlot);
  const clearSlot = useChordStore((s) => s.clearSlot);
  const clearProgression = useChordStore((s) => s.clearProgression);
  const playing = useChordStore((s) => s.progressionPlaying);
  const setPlaying = useChordStore((s) => s.setProgressionPlaying);
  const step = useChordStore((s) => s.progressionStep);
  const setStep = useChordStore((s) => s.setProgressionStep);
  const loop = useChordStore((s) => s.progressionLoop);
  const toggleLoop = useChordStore((s) => s.toggleProgressionLoop);
  const smooth = useChordStore((s) => s.smoothVoicing);
  const toggleSmooth = useChordStore((s) => s.toggleSmoothVoicing);
  const currentChord = useChordStore((s) => s.currentChord);
  const bpm = useGrooveStore((s) => s.bpm);
  const { playNotes } = useAudition();

  const timerRef = useRef(null);
  const prevNotesRef = useRef(null);

  const stopPlayback = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    prevNotesRef.current = null;
    setPlaying(false);
    setStep(-1);
  }, [setPlaying, setStep]);

  useEffect(() => stopPlayback, [stopPlayback]); // cleanup on unmount

  const startPlayback = () => {
    const slots = useChordStore.getState().progression;
    if (!slots.some(Boolean)) {
      toast.warning('Progression is empty — add chords to the slots');
      return;
    }
    const barMs = (60000 / bpm) * 4;
    prevNotesRef.current = null;
    let i = -1;
    const tick = () => {
      const { progression: slotsNow, progressionLoop, smoothVoicing } = useChordStore.getState();
      // advance to next filled slot
      let next = i + 1;
      while (next < 8 && !slotsNow[next]) next += 1;
      if (next >= 8) {
        if (!progressionLoop) {
          stopPlayback();
          return;
        }
        next = slotsNow.findIndex(Boolean);
        if (next < 0) {
          stopPlayback();
          return;
        }
      }
      i = next;
      setStep(i);
      const chord = slotsNow[i];
      if (chord) {
        const notes = smoothVoicing ? voiceLeadChord(prevNotesRef.current, chord.notes) : chord.notes;
        prevNotesRef.current = notes;
        playNotes(notes, barMs * 0.92, 95);
      }
    };
    setPlaying(true);
    tick();
    timerRef.current = setInterval(tick, barMs);
  };

  const onExport = () => {
    const filled = progression.filter(Boolean);
    const list = smooth ? voiceLeadProgression(filled) : filled;
    if (exportChordProgressionAsMidi(list, bpm)) {
      toast.success(`Progression exported as .mid${smooth ? ' (smooth voicings)' : ''}`);
    } else {
      toast.warning('Progression is empty');
    }
  };

  return (
    <section className="panel p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="panel-title section-head">Progression</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-accent"
            onClick={playing ? stopPlayback : startPlayback}
            aria-label={playing ? 'Stop progression' : 'Play progression'}
          >
            {playing ? <Square size={14} /> : <Play size={14} />}
            {playing ? 'Stop' : 'Play'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={toggleLoop}
            aria-pressed={loop}
            style={loop ? { borderColor: 'var(--color-accent)', color: 'var(--color-accent)' } : undefined}
          >
            <Repeat size={14} /> Loop
          </button>
          <button
            type="button"
            className="btn"
            onClick={toggleSmooth}
            aria-pressed={smooth}
            title="Voice leading: re-voices each chord so notes move as little as possible between changes — smooth, connected transitions"
            style={smooth ? { borderColor: 'var(--color-accent)', color: 'var(--color-accent)' } : undefined}
          >
            <Waves size={14} /> Smooth
          </button>
          <button type="button" className="btn btn-info" onClick={onExport}>
            <Download size={14} /> Export .mid
          </button>
          <button type="button" className="btn btn-danger-outline" onClick={clearProgression} aria-label="Clear progression">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        {progression.map((chord, i) => (
          <div
            key={i}
            role="button"
            tabIndex={0}
            aria-label={chord ? `Slot ${i + 1}: ${chord.name}` : `Slot ${i + 1}: empty`}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
            }}
            onDrop={(e) => {
              e.preventDefault();
              try {
                const data = JSON.parse(e.dataTransfer.getData('application/x-mpc-chord'));
                setSlot(i, data);
              } catch {
                /* not a chord payload */
              }
            }}
            onClick={() => {
              if (chord) {
                playNotes(chord.notes, (60000 / bpm) * 2, 95);
              } else {
                setSlot(i, currentChord());
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (chord) playNotes(chord.notes, (60000 / bpm) * 2, 95);
                else setSlot(i, currentChord());
              } else if (e.key === 'Delete' || e.key === 'Backspace') {
                clearSlot(i);
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              clearSlot(i);
            }}
            className={`flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 transition-all ${
              step === i ? 'pad-glow' : ''
            }`}
            style={{
              borderColor: step === i ? 'var(--color-playhead)' : chord ? 'var(--color-accent-dim)' : 'var(--color-border)',
              borderStyle: chord ? 'solid' : 'dashed',
              background: chord ? 'var(--color-surface-2)' : 'transparent',
            }}
          >
            <span className="font-mono text-[10px] text-text-muted">{i + 1}</span>
            {chord ? (
              <>
                <span className="font-mono text-lg font-bold">{chord.name}</span>
                <span className="font-mono text-[10px] text-text-secondary">oct {chord.octave}</span>
              </>
            ) : (
              <span className="font-mono text-[10px] text-text-muted">empty</span>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 font-mono text-[11px] text-text-muted">
        Click a chord to hear it · click an empty slot to insert the builder chord · right-click removes ·{' '}
        <b>Smooth</b> re-voices chords on playback & export for minimal note movement
      </p>
    </section>
  );
}

/** Pad cell for the 16 Levels grid. */
function LevelPad({ pad, noteName, offset, tone, isAnchor, onPlay }) {
  const highlighted = Boolean(tone) || isAnchor;
  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label={`Pad ${pad}: ${noteName}, ${offset >= 0 ? '+' : ''}${offset} semitones`}
      className="relative flex aspect-square w-full flex-col items-center justify-center gap-0.5 rounded-md border transition-all hover:border-[var(--color-accent)]"
      style={{
        background: tone
          ? 'rgba(255, 107, 0, 0.16)'
          : 'linear-gradient(180deg, var(--color-surface-2) 0%, var(--color-surface) 100%)',
        borderColor: tone ? 'var(--color-accent)' : isAnchor ? 'var(--color-border-bright)' : 'var(--color-border)',
        boxShadow: tone ? '0 0 14px var(--color-accent-glow)' : 'inset 0 1px 0 rgba(255,255,255,0.03)',
        opacity: highlighted ? 1 : 0.75,
      }}
    >
      <span className="absolute left-1.5 top-1 font-mono text-[10px] text-text-muted">{pad}</span>
      {tone && (
        <span
          className="absolute right-1 top-1 rounded px-1 font-mono text-[10px] font-bold"
          style={{ background: 'var(--color-accent)', color: '#0a0a0c' }}
        >
          {tone}
        </span>
      )}
      <span className="font-mono text-base font-semibold leading-none">{noteName}</span>
      <span className="font-mono text-[10px] text-text-secondary">
        {offset === 0 ? 'sample' : `${offset > 0 ? '+' : ''}${offset} st`}
      </span>
    </button>
  );
}

function SixteenLevels() {
  const sampleKey = useChordStore((s) => s.sampleKey);
  const anchorPad = useChordStore((s) => s.anchorPad);
  const setSampleKey = useChordStore((s) => s.setSampleKey);
  const setAnchorPad = useChordStore((s) => s.setAnchorPad);
  const root = useChordStore((s) => s.root);
  const chordType = useChordStore((s) => s.chordType);
  const { playNote, playNotes } = useAudition();

  const samplePc = NOTE_NAMES.indexOf(sampleKey);
  const { pads, offGrid } = mapChordTo16Levels(sampleKey, anchorPad, root, chordType);
  const toneByPad = new Map(pads.map((p) => [p.pad, p.toneLabel]));
  const chordName = getChordDisplayName(root, chordType);

  // sample's original pitch assumed around C3 register for audition
  const baseMidi = 48 + samplePc;
  const noteForPad = (pad) => baseMidi + (pad - anchorPad);

  // MPC layout: 13–16 top row, 1–4 bottom
  const gridOrder = [13, 14, 15, 16, 9, 10, 11, 12, 5, 6, 7, 8, 1, 2, 3, 4];

  const playOnPads = () => {
    if (!pads.length) {
      toast.warning('No chord tones fit on the pads — change the sample key or original-pitch pad');
      return;
    }
    playNotes(pads.map((p) => noteForPad(p.pad)), 900, 100);
  };

  return (
    <section className="panel p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h2 className="panel-title flex items-center gap-2">
          <Grid3x3 size={14} style={{ color: 'var(--color-accent)' }} /> 16 Levels chord finder
        </h2>
        <button type="button" className="btn btn-accent" onClick={playOnPads}>
          <Play size={14} /> Play {chordName} on pads
        </button>
      </div>
      <p className="mb-4 max-w-2xl text-sm leading-relaxed text-text-secondary">
        In <b>16 Levels (Tune)</b> the MPC spreads one sample across all pads in semitone steps — every pad is a
        pitch, so chords become pad shapes. Set the key your sample is in and which pad plays it untouched, and the
        grid shows exactly which pads make the chord in the builder above.
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div>
          <span className="mb-1.5 block font-mono text-xs text-text-muted">Sample key</span>
          <div className="grid grid-cols-6 gap-1 sm:grid-cols-12">
            {ROOTS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSampleKey(r)}
                aria-pressed={sampleKey === r}
                className="h-9 w-9 rounded font-mono text-xs font-semibold"
                style={{
                  background: sampleKey === r ? 'var(--color-accent)' : 'var(--color-surface-2)',
                  color: sampleKey === r ? '#0a0a0c' : 'var(--color-text-secondary)',
                  border: `1px solid ${sampleKey === r ? 'var(--color-accent)' : 'var(--color-border)'}`,
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="mb-1.5 block font-mono text-xs text-text-muted">Original pitch on pad</span>
          <select
            className="select"
            value={anchorPad}
            onChange={(e) => setAnchorPad(Number(e.target.value))}
            aria-label="Pad that plays the sample at original pitch"
          >
            {Array.from({ length: 16 }, (_, i) => i + 1).map((p) => (
              <option key={p} value={p}>
                Pad {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        {/* Pad grid */}
        <div>
          <div className="grid grid-cols-4 gap-2.5">
            {gridOrder.map((pad) => {
              const offset = pad - anchorPad;
              const noteName = NOTE_NAMES[(((samplePc + offset) % 12) + 12) % 12];
              return (
                <LevelPad
                  key={pad}
                  pad={pad}
                  noteName={noteName}
                  offset={offset}
                  tone={toneByPad.get(pad)}
                  isAnchor={pad === anchorPad}
                  onPlay={() => playNote(noteForPad(pad), 105, 350)}
                />
              );
            })}
          </div>
          <p className="mt-2 text-center font-mono text-[11px] text-text-muted">
            pad 1 bottom-left · orange pads = {chordName} · click a pad to hear that pitch
          </p>
          {offGrid.length > 0 && (
            <p className="mt-2 rounded border px-3 py-2 font-mono text-[11px]" style={{ borderColor: 'var(--color-warning, #d49a2a)', color: 'var(--color-warning, #d49a2a)' }}>
              Off the grid: {offGrid.map((t) => `${t.toneLabel} (${t.noteName}, +${t.offset} st)`).join(', ')} — move
              the original pitch to a lower pad or pick a chord root closer to {sampleKey}.
            </p>
          )}
        </div>

        {/* Retune helper */}
        <div>
          <h3 className="panel-title mb-2">Retune cheat sheet</h3>
          <p className="mb-3 max-w-md text-sm leading-relaxed text-text-secondary">
            Want your {sampleKey} sample in another key? Tune it by this many semitones on the MPC (both directions
            land on the same note — pick whichever keeps the sample sounding natural).
          </p>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {ROOTS.map((k) => {
              const { up, down } = getRetuneOptions(sampleKey, k);
              const isCurrent = k === sampleKey;
              const isChordRoot = k === root;
              return (
                <div
                  key={k}
                  className="flex flex-col items-center rounded border px-2 py-1.5"
                  style={{
                    background: isChordRoot ? 'var(--color-accent-dim)' : 'var(--color-surface-2)',
                    borderColor: isChordRoot ? 'var(--color-accent)' : 'var(--color-border)',
                    opacity: isCurrent ? 0.6 : 1,
                  }}
                >
                  <span className="font-mono text-sm font-bold">{k}</span>
                  <span className="font-mono text-[11px] text-text-secondary">
                    {isCurrent ? 'as is' : `${down} or +${up}`}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 font-mono text-[11px] text-text-muted">
            Highlighted = current chord root ({root}). Retuning ±7 st or more can change the sample's character —
            smaller moves usually sound cleaner.
          </p>
        </div>
      </div>
    </section>
  );
}

function ChordReference() {
  const currentChord = useChordStore((s) => s.currentChord);
  const root = useChordStore((s) => s.root);
  const chordType = useChordStore((s) => s.chordType);
  const voicing = useChordStore((s) => s.voicing);
  const octave = useChordStore((s) => s.octave);
  const scaleRoot = useChordStore((s) => s.scaleRoot);
  const scaleName = useChordStore((s) => s.scaleName);
  const scaleOctave = useChordStore((s) => s.scaleOctave);
  const { playNote } = useAudition();

  // re-derive whenever builder state changes
  void root; void chordType; void voicing; void octave;
  const chord = currentChord();
  const padNotes = getPadMapNotes(scaleRoot, scaleName, scaleOctave);

  return (
    <section className="panel p-5">
      <h2 className="panel-title section-head mb-4">Chord reference</h2>
      <div className="flex flex-wrap items-start gap-8">
        <div>
          <div className="mb-2 font-mono text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
            {chord.name}
          </div>
          <MiniPiano notes={chord.notes} />
        </div>

        <table className="font-mono text-sm">
          <thead>
            <tr className="text-left text-xs text-text-muted">
              <th className="pb-2 pr-6 font-normal">Note</th>
              <th className="pb-2 pr-6 font-normal">MIDI</th>
              <th className="pb-2 font-normal">MPC pad*</th>
            </tr>
          </thead>
          <tbody>
            {chord.notes.map((n) => {
              const padIdx = padNotes.indexOf(n);
              return (
                <tr
                  key={n}
                  className="cursor-pointer hover:text-[var(--color-accent)]"
                  style={{ borderTop: '1px solid var(--color-border)' }}
                  onClick={() => playNote(n, 100, 300)}
                  title={`Hear ${midiNoteToName(n)}`}
                >
                  <td className="py-1.5 pr-6 font-semibold">{midiNoteToName(n)}</td>
                  <td className="py-1.5 pr-6 text-text-secondary">{n}</td>
                  <td className="py-1.5" style={{ color: padIdx >= 0 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                    {padIdx >= 0 ? `Pad ${padIdx + 1}` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <p className="max-w-[220px] font-mono text-[11px] leading-relaxed text-text-muted">
          *Pad numbers follow the Scale Helper mapping: {scaleRoot} {SCALE_LABELS[scaleName]}, octave {scaleOctave}.
          Change it on the Scale page.
        </p>
      </div>
    </section>
  );
}

export default function ChordGenerator() {
  // keep Tone import referenced for transport BPM consistency (chord playback uses wall-clock)
  useEffect(() => {
    Tone.Transport.bpm.value = useGrooveStore.getState().bpm;
  }, []);

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-tight">Chord generator</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Build chords, hear them instantly, arrange progressions, play them on your pads.
          </p>
        </div>
        <SoundToggle />
      </div>
      <ChordBuilder />
      <InKeyPalette />
      <ProgressionBuilder />
      <SixteenLevels />
      <ChordReference />
    </div>
  );
}
