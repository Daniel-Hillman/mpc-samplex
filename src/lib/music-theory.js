// Pure music theory functions. All notes are MIDI integers; convert to names only for display.

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const CHORD_INTERVALS = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dom7: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  add9: [0, 4, 7, 14],
  min9: [0, 3, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14],
};

export const CHORD_LABELS = {
  major: 'Major',
  minor: 'Minor',
  dom7: 'Dom7',
  maj7: 'Maj7',
  min7: 'Min7',
  sus2: 'Sus2',
  sus4: 'Sus4',
  dim: 'Dim',
  aug: 'Aug',
  add9: 'Add9',
  min9: 'Min9',
  maj9: 'Maj9',
};

export const CHORD_SUFFIX = {
  major: '',
  minor: 'm',
  dom7: '7',
  maj7: 'maj7',
  min7: 'm7',
  sus2: 'sus2',
  sus4: 'sus4',
  dim: 'dim',
  aug: 'aug',
  add9: 'add9',
  min9: 'm9',
  maj9: 'maj9',
};

export const SCALE_INTERVALS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  naturalMinor: [0, 2, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  melodicMinor: [0, 2, 3, 5, 7, 9, 11],
  pentatonicMajor: [0, 2, 4, 7, 9],
  pentatonicMinor: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  wholeTone: [0, 2, 4, 6, 8, 10],
  diminished: [0, 2, 3, 5, 6, 8, 9, 11],
};

export const SCALE_LABELS = {
  major: 'Major',
  naturalMinor: 'Natural Minor',
  harmonicMinor: 'Harmonic Minor',
  melodicMinor: 'Melodic Minor',
  pentatonicMajor: 'Pentatonic Major',
  pentatonicMinor: 'Pentatonic Minor',
  blues: 'Blues',
  dorian: 'Dorian',
  phrygian: 'Phrygian',
  lydian: 'Lydian',
  mixolydian: 'Mixolydian',
  locrian: 'Locrian',
  wholeTone: 'Whole Tone',
  diminished: 'Diminished',
};

// Modes of the major scale, in degree order
export const MAJOR_MODES = ['major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'naturalMinor', 'locrian'];

export const VOICINGS = {
  root: 'Root',
  first: 'First Inversion',
  second: 'Second Inversion',
  drop2: 'Drop 2',
};

/** 60 → "C4" (MIDI 60 = C4, octave = floor(midi/12) - 1) */
export function midiNoteToName(midi) {
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

/** "C4" → 60. Accepts sharps only (e.g. "F#2"). */
export function noteNameToMidi(name) {
  const m = /^([A-G]#?)(-?\d+)$/.exec(name.trim());
  if (!m) return null;
  const idx = NOTE_NAMES.indexOf(m[1]);
  if (idx < 0) return null;
  return (parseInt(m[2], 10) + 1) * 12 + idx;
}

/** Pitch class index (0–11) for a root name like "C#" */
export function rootNameToPitchClass(rootName) {
  return NOTE_NAMES.indexOf(rootName);
}

function applyVoicing(notes, voicing) {
  const v = [...notes];
  switch (voicing) {
    case 'first':
      if (v.length > 1) v.push(v.shift() + 12);
      return v.sort((a, b) => a - b);
    case 'second':
      if (v.length > 2) {
        v.push(v.shift() + 12);
        v.push(v.shift() + 12);
      }
      return v.sort((a, b) => a - b);
    case 'drop2': {
      if (v.length < 3) return v;
      // Drop the second-highest note down an octave
      const sorted = [...v].sort((a, b) => a - b);
      const idx = sorted.length - 2;
      sorted[idx] -= 12;
      return sorted.sort((a, b) => a - b);
    }
    case 'root':
    default:
      return v;
  }
}

/**
 * Build a chord as MIDI note numbers.
 * @param {string} rootName  e.g. "C", "F#"
 * @param {string} chordType key of CHORD_INTERVALS
 * @param {string} voicing   key of VOICINGS
 * @param {number} octave    1–7
 */
export function getNotes(rootName, chordType, voicing = 'root', octave = 4) {
  const pc = rootNameToPitchClass(rootName);
  if (pc < 0 || !CHORD_INTERVALS[chordType]) return [];
  const rootMidi = (octave + 1) * 12 + pc;
  const base = CHORD_INTERVALS[chordType].map((iv) => rootMidi + iv);
  return applyVoicing(base, voicing).filter((n) => n >= 0 && n <= 127);
}

/** Display name, e.g. ("C", "min7") → "Cm7" */
export function getChordDisplayName(rootName, chordType) {
  return `${rootName}${CHORD_SUFFIX[chordType] ?? ''}`;
}

/** Scale notes (MIDI) across `octaves` octaves starting at root octave. */
export function getScaleNotes(rootName, scaleName, octave = 3, octaves = 1) {
  const pc = rootNameToPitchClass(rootName);
  const intervals = SCALE_INTERVALS[scaleName];
  if (pc < 0 || !intervals) return [];
  const rootMidi = (octave + 1) * 12 + pc;
  const out = [];
  for (let o = 0; o < octaves; o++) {
    intervals.forEach((iv) => out.push(rootMidi + o * 12 + iv));
  }
  out.push(rootMidi + octaves * 12); // top octave root
  return out.filter((n) => n >= 0 && n <= 127);
}

/** Pitch classes (0–11) in a scale */
export function getScalePitchClasses(rootName, scaleName) {
  const pc = rootNameToPitchClass(rootName);
  const intervals = SCALE_INTERVALS[scaleName] || [];
  return intervals.map((iv) => (pc + iv) % 12);
}

/** Ascending scale notes for the 16 MPC pads, starting at the root octave. */
export function getPadMapNotes(rootName, scaleName, octave = 2) {
  const pc = rootNameToPitchClass(rootName);
  const intervals = SCALE_INTERVALS[scaleName];
  if (pc < 0 || !intervals) return [];
  const rootMidi = (octave + 1) * 12 + pc;
  const notes = [];
  let o = 0;
  while (notes.length < 16) {
    for (const iv of intervals) {
      notes.push(rootMidi + o * 12 + iv);
      if (notes.length === 16) break;
    }
    o += 1;
  }
  return notes.filter((n) => n >= 0 && n <= 127);
}

const TRIAD_QUALITY_BY_INTERVALS = {
  '4,7': { suffix: '', type: 'major', roman: (d) => d },
  '3,7': { suffix: 'm', type: 'minor', roman: (d) => d.toLowerCase() },
  '3,6': { suffix: 'dim', type: 'dim', roman: (d) => `${d.toLowerCase()}°` },
  '4,8': { suffix: 'aug', type: 'aug', roman: (d) => `${d}+` },
};

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/**
 * Diatonic triads built on each degree of a 7-note scale.
 * Returns [{ degree, roman, rootName, name, type, notes }]
 */
export function getAllChordsInKey(rootName, scaleName, octave = 3) {
  const pc = rootNameToPitchClass(rootName);
  const intervals = SCALE_INTERVALS[scaleName];
  if (pc < 0 || !intervals || intervals.length < 5) return [];
  const rootMidi = (octave + 1) * 12 + pc;
  const len = intervals.length;
  const scaleAcrossOctaves = [];
  for (let o = 0; o < 3; o++) {
    intervals.forEach((iv) => scaleAcrossOctaves.push(rootMidi + o * 12 + iv));
  }
  return intervals.map((_, degree) => {
    const root = scaleAcrossOctaves[degree];
    const third = scaleAcrossOctaves[degree + 2];
    const fifth = scaleAcrossOctaves[degree + 4];
    const key = `${third - root},${fifth - root}`;
    const quality = TRIAD_QUALITY_BY_INTERVALS[key] || { suffix: '?', type: 'unknown', roman: (d) => d };
    const chordRootName = NOTE_NAMES[((root % 12) + 12) % 12];
    const romanBase = ROMAN[degree % 7] || `${degree + 1}`;
    return {
      degree: degree + 1,
      roman: quality.roman(romanBase),
      rootName: chordRootName,
      name: `${chordRootName}${quality.suffix}`,
      type: quality.type,
      notes: [root, third, fifth],
    };
  });
}

/** Relative major/minor for a root + scale. Returns { label, rootName, scaleName } or null. */
export function getRelativeKey(rootName, scaleName) {
  const pc = rootNameToPitchClass(rootName);
  if (pc < 0) return null;
  if (scaleName === 'major' || scaleName === 'pentatonicMajor' || scaleName === 'lydian' || scaleName === 'mixolydian') {
    const rel = NOTE_NAMES[(pc + 9) % 12];
    return { label: 'Relative minor', rootName: rel, scaleName: 'naturalMinor' };
  }
  if (scaleName === 'naturalMinor' || scaleName === 'pentatonicMinor' || scaleName === 'blues' || scaleName === 'harmonicMinor' || scaleName === 'melodicMinor' || scaleName === 'dorian' || scaleName === 'phrygian' || scaleName === 'locrian') {
    const rel = NOTE_NAMES[(pc + 3) % 12];
    return { label: 'Relative major', rootName: rel, scaleName: 'major' };
  }
  return null;
}

/**
 * Modes derived from the same parent major scale.
 * Only meaningful for the 7 diatonic modes; returns [] otherwise.
 */
export function getParallelModes(rootName, scaleName) {
  const modeIdx = MAJOR_MODES.indexOf(scaleName);
  const pc = rootNameToPitchClass(rootName);
  if (modeIdx < 0 || pc < 0) return [];
  // Find the parent major root: subtract the mode's degree offset
  const majorIntervals = SCALE_INTERVALS.major;
  const parentPc = (pc - majorIntervals[modeIdx] + 12) % 12;
  return MAJOR_MODES.map((mode, i) => ({
    scaleName: mode,
    label: SCALE_LABELS[mode],
    rootName: NOTE_NAMES[(parentPc + majorIntervals[i]) % 12],
    isCurrent: mode === scaleName,
  }));
}

/** Interval names for display */
const INTERVAL_NAMES = ['R', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];
export function getIntervalNames(scaleName) {
  return (SCALE_INTERVALS[scaleName] || []).map((iv) => INTERVAL_NAMES[iv % 12]);
}

/** Chord-tone label for a semitone interval from the chord root (extensions included). */
export function chordToneLabel(iv) {
  if (iv === 13) return 'b9';
  if (iv === 14) return '9';
  if (iv === 17) return '11';
  if (iv === 21) return '13';
  return INTERVAL_NAMES[((iv % 12) + 12) % 12];
}

/**
 * Re-voice a chord so each note lands as close as possible to the previous
 * chord's register — minimal movement = smooth ("buttery") transitions.
 * Pure octave displacement only; the chord quality never changes.
 */
export function voiceLeadChord(prevNotes, notes) {
  if (!notes?.length) return [];
  if (!prevNotes?.length) return [...notes].sort((a, b) => a - b);
  const center = prevNotes.reduce((a, b) => a + b, 0) / prevNotes.length;
  const placed = [];
  notes.forEach((n) => {
    let best = null;
    for (let k = -2; k <= 2; k++) {
      const c = n + k * 12;
      if (c < 21 || c > 108 || placed.includes(c)) continue;
      if (best === null || Math.abs(c - center) < Math.abs(best - center)) best = c;
    }
    placed.push(best ?? n);
  });
  return [...new Set(placed)].sort((a, b) => a - b);
}

/** Apply voice leading across a whole progression (array of { ..., notes }). */
export function voiceLeadProgression(chords) {
  let prev = null;
  return chords.map((c) => {
    if (!c || !c.notes?.length) return c;
    const notes = voiceLeadChord(prev, c.notes);
    prev = notes;
    return { ...c, notes };
  });
}

/**
 * Map a chord onto 16 Levels pads (Tune mode = chromatic semitone spread).
 * @param {string} sampleKeyName key your sample is in, e.g. "F"
 * @param {number} anchorPad     pad (1–16) that plays the sample at original pitch
 * @returns {{ pads: {pad:number, offset:number, noteName:string, toneLabel:string}[], offGrid: {noteName:string, offset:number, toneLabel:string}[], rootOffset:number }}
 */
export function mapChordTo16Levels(sampleKeyName, anchorPad, chordRootName, chordType) {
  const samplePc = rootNameToPitchClass(sampleKeyName);
  const rootPc = rootNameToPitchClass(chordRootName);
  const ivs = CHORD_INTERVALS[chordType] || [];
  if (samplePc < 0 || rootPc < 0) return { pads: [], offGrid: [], rootOffset: 0 };
  const rootOffset = (rootPc - samplePc + 12) % 12;
  const pads = [];
  const offGrid = [];
  ivs.forEach((iv) => {
    const offset = rootOffset + iv;
    const entry = {
      offset,
      noteName: NOTE_NAMES[(samplePc + offset) % 12],
      toneLabel: chordToneLabel(iv),
    };
    const pad = anchorPad + offset;
    if (pad >= 1 && pad <= 16) pads.push({ ...entry, pad });
    else offGrid.push(entry);
  });
  return { pads, offGrid, rootOffset };
}

/**
 * Smallest retune amounts to move a sample between keys.
 * F → C gives { up: 7, down: -5 }.
 */
export function getRetuneOptions(fromName, toName) {
  const up = ((rootNameToPitchClass(toName) - rootNameToPitchClass(fromName)) % 12 + 12) % 12;
  return { up, down: up === 0 ? 0 : up - 12 };
}
