import { create } from 'zustand';
import { getNotes, getChordDisplayName, voiceLeadProgression } from '../lib/music-theory';

const PREFS_KEY = 'mpc-studio:chord-prefs';

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY)) || {};
  } catch {
    return {};
  }
}

function savePrefs(partial) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...loadPrefs(), ...partial }));
  } catch {
    /* storage unavailable */
  }
}

const prefs = loadPrefs();

export const useChordStore = create((set, get) => ({
  // Builder state
  root: 'C',
  chordType: 'min7',
  voicing: 'root',
  octave: 3,

  // Progression: 8 slots, each null or { name, root, chordType, voicing, octave, notes }
  progression: Array(8).fill(null),
  progressionPlaying: false,
  progressionStep: -1,
  progressionLoop: true,
  smoothVoicing: false,

  // Scale helper state (shared so chord page can show pad mapping)
  scaleRoot: 'C',
  scaleName: 'naturalMinor',
  scaleOctave: 2,

  // 16 Levels config + browser sound (persisted)
  sampleKey: prefs.sampleKey ?? 'C',
  anchorPad: prefs.anchorPad ?? 1,
  previewSound: prefs.previewSound ?? true,

  setRoot: (root) => set({ root }),
  setChordType: (chordType) => set({ chordType }),
  setVoicing: (voicing) => set({ voicing }),
  setOctave: (octave) => set({ octave: Math.max(1, Math.min(7, octave)) }),

  setScaleRoot: (scaleRoot) => set({ scaleRoot }),
  setScaleName: (scaleName) => set({ scaleName }),
  setScaleOctave: (scaleOctave) => set({ scaleOctave: Math.max(0, Math.min(6, scaleOctave)) }),

  setSampleKey: (sampleKey) => {
    savePrefs({ sampleKey });
    set({ sampleKey });
  },
  setAnchorPad: (anchorPad) => {
    const v = Math.max(1, Math.min(16, anchorPad));
    savePrefs({ anchorPad: v });
    set({ anchorPad: v });
  },
  setPreviewSound: (previewSound) => {
    savePrefs({ previewSound });
    set({ previewSound });
  },

  toggleSmoothVoicing: () => set((s) => ({ smoothVoicing: !s.smoothVoicing })),

  /** Permanently rewrite slot voicings with minimal-movement voice leading. */
  applySmoothVoicing: () =>
    set((s) => {
      const filled = s.progression.filter(Boolean);
      if (!filled.length) return {};
      const voiced = voiceLeadProgression(filled);
      let j = 0;
      const progression = s.progression.map((c) => (c ? voiced[j++] : c));
      return { progression };
    }),

  /** Current chord derived from builder state. */
  currentChord: () => {
    const { root, chordType, voicing, octave } = get();
    return {
      name: getChordDisplayName(root, chordType),
      root,
      chordType,
      voicing,
      octave,
      notes: getNotes(root, chordType, voicing, octave),
    };
  },

  setSlot: (idx, chord) =>
    set((s) => {
      const progression = [...s.progression];
      progression[idx] = chord;
      return { progression };
    }),

  /** Drop a chord into the first empty slot. Returns slot index or -1 if full. */
  addToProgression: (chord) => {
    const idx = get().progression.findIndex((c) => !c);
    if (idx < 0) return -1;
    get().setSlot(idx, chord);
    return idx;
  },

  clearSlot: (idx) =>
    set((s) => {
      const progression = [...s.progression];
      progression[idx] = null;
      return { progression };
    }),

  clearProgression: () => set({ progression: Array(8).fill(null) }),

  setProgressionPlaying: (progressionPlaying) => set({ progressionPlaying }),
  setProgressionStep: (progressionStep) => set({ progressionStep }),
  toggleProgressionLoop: () => set((s) => ({ progressionLoop: !s.progressionLoop })),
}));
