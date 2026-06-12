import MidiWriter from 'midi-writer-js';
import { midiNoteToName } from './music-theory';
import { TICKS_PER_BAR } from './constants';

// midi-writer uses 128 ticks per quarter note → 512 per 4/4 bar.
const MIDI_TICKS_PER_BAR = 512;

// midi-writer-js accepts note names like "C4" or MIDI numbers directly in pitch arrays.
// We pass names for clarity in the generated file.
function toPitch(midiNote) {
  return midiNoteToName(midiNote);
}

function downloadDataUri(dataUri, filename) {
  const a = document.createElement('a');
  a.href = dataUri;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function sanitize(name) {
  return (name || 'untitled').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
}

/**
 * Export the groove as a .mid file. Notes are stored at absolute ticks within
 * the bar (TICKS_PER_BAR), so straight and triplet hits export at exact times.
 */
export function exportGrooveAsMidi(rows, bpm, patternName) {
  const track = new MidiWriter.Track();
  track.setTempo(bpm);
  track.addTrackName(patternName || 'groove');

  const anySolo = rows.some((r) => r.soloed);
  let eventCount = 0;

  rows.forEach((row) => {
    const audible = anySolo ? row.soloed : !row.muted;
    if (!audible) return;
    Object.entries(row.notes || {}).forEach(([tickStr, velocity]) => {
      const tick = Number(tickStr);
      track.addEvent(
        new MidiWriter.NoteEvent({
          pitch: [toPitch(row.midiNote)],
          duration: 'T32',
          startTick: Math.round((tick / TICKS_PER_BAR) * MIDI_TICKS_PER_BAR),
          velocity: Math.round((velocity / 127) * 100), // midi-writer velocity is 0–100
          channel: 1,
        })
      );
      eventCount += 1;
    });
  });

  if (eventCount === 0) return false;

  const writer = new MidiWriter.Writer(track);
  downloadDataUri(writer.dataUri(), `groove-${sanitize(patternName)}-${bpm}bpm.mid`);
  return true;
}

/**
 * Export a chord progression: each chord lasts 1 bar.
 * @param {Array<{name: string, notes: number[]}>} chords
 */
export function exportChordProgressionAsMidi(chords, bpm, name = 'progression') {
  const filled = chords.filter((c) => c && c.notes && c.notes.length);
  if (!filled.length) return false;

  const track = new MidiWriter.Track();
  track.setTempo(bpm);
  track.addTrackName(name);

  filled.forEach((chord, i) => {
    track.addEvent(
      new MidiWriter.NoteEvent({
        pitch: chord.notes.map(toPitch),
        duration: '1',
        startTick: i * 512, // 1 bar = 4 quarters × 128 ticks
        velocity: 71, // ≈ 90/127
        channel: 1,
      })
    );
  });

  const writer = new MidiWriter.Writer(track);
  downloadDataUri(writer.dataUri(), `${sanitize(name)}-${bpm}bpm.mid`);
  return true;
}

/** Export all pad-map notes as one sustained chord .mid (reference voicing). */
export function exportPadMapAsMidi(notes, scaleLabel, rootName) {
  if (!notes.length) return false;
  const track = new MidiWriter.Track();
  track.setTempo(120);
  track.addTrackName(`${rootName} ${scaleLabel} pad map`);
  track.addEvent(
    new MidiWriter.NoteEvent({
      pitch: notes.map(toPitch),
      duration: '1',
      velocity: 71,
      channel: 1,
    })
  );
  const writer = new MidiWriter.Writer(track);
  downloadDataUri(writer.dataUri(), `scale-${sanitize(scaleLabel)}-${sanitize(rootName)}.mid`);
  return true;
}

/** Export a plain-text pad reference card. */
export function exportPadMapAsText(notes, scaleLabel, rootName) {
  if (!notes.length) return false;
  const lines = [
    `MPC STUDIO — PAD MAP`,
    `Scale: ${rootName} ${scaleLabel}`,
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    ``,
    `PAD | NOTE | MIDI`,
    `----+------+-----`,
    ...notes.map((n, i) => {
      const pad = String(i + 1).padStart(3, ' ');
      const name = midiNoteToName(n).padEnd(4, ' ');
      return `${pad} | ${name} | ${n}`;
    }),
    ``,
    `Pads laid out MPC-style: pad 1 = bottom-left, ascending left→right, bottom→top.`,
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  downloadDataUri(url, `scale-${sanitize(scaleLabel)}-${sanitize(rootName)}.txt`);
  URL.revokeObjectURL(url);
  return true;
}

/** Export saved patterns as JSON (Settings → Data). */
export function exportPatternsAsJson(patterns) {
  const blob = new Blob([JSON.stringify(patterns, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  downloadDataUri(url, `mpc-studio-patterns-${new Date().toISOString().slice(0, 10)}.json`);
  URL.revokeObjectURL(url);
  return true;
}
