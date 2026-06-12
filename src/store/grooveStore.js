import { create } from 'zustand';
import { makeDefaultRows, migrateRow, LS_KEYS, DEFAULT_BPM, MIN_BPM, MAX_BPM, DEFAULT_VELOCITY } from '../lib/constants';

function loadPatterns() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEYS.patterns)) || {};
  } catch {
    return {};
  }
}

function persistPatterns(patterns) {
  try {
    localStorage.setItem(LS_KEYS.patterns, JSON.stringify(patterns));
  } catch {
    /* storage full / unavailable */
  }
}

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEYS.settings)) || {};
  } catch {
    return {};
  }
}

const savedSettings = loadSettings();

const GROOVE_SOUND_KEY = 'mpc-studio:groove-sound';
function loadGrooveSound() {
  try {
    const v = localStorage.getItem(GROOVE_SOUND_KEY);
    return v === null ? true : v === 'true';
  } catch {
    return true;
  }
}

function snapshotOf(state) {
  return {
    rows: JSON.parse(JSON.stringify(state.rows)),
    bpm: state.bpm,
    swing: state.swing,
    resolution: state.resolution,
    savedAt: Date.now(),
  };
}

/** Rows from a snapshot, migrated from the legacy 16-step format if needed. */
function rowsFromSnapshot(snap) {
  return (snap.rows || []).map((r) => migrateRow(JSON.parse(JSON.stringify(r))));
}

export const useGrooveStore = create((set, get) => ({
  bpm: savedSettings.defaultBpm || DEFAULT_BPM,
  swing: 0,
  isPlaying: false,
  currentTick: -1,
  resolution: '1/16',
  loopEnabled: true,
  previewSound: loadGrooveSound(),
  rows: makeDefaultRows(),
  activePatternName: localStorage.getItem(LS_KEYS.activePattern) || null,
  savedPatterns: loadPatterns(),

  setBpm: (bpm) => set({ bpm: Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(bpm))) }),
  setSwing: (swing) => set({ swing: Math.max(0, Math.min(100, Math.round(swing))) }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTick: (currentTick) => set({ currentTick }),
  setResolution: (resolution) => set({ resolution }),
  toggleLoop: () => set((s) => ({ loopEnabled: !s.loopEnabled })),
  setPreviewSound: (previewSound) => {
    try {
      localStorage.setItem(GROOVE_SOUND_KEY, String(previewSound));
    } catch {
      /* storage unavailable */
    }
    set({ previewSound });
  },

  /** Toggle a note at an absolute tick within the bar. */
  toggleNote: (rowId, tick, velocity = DEFAULT_VELOCITY) =>
    set((s) => ({
      rows: s.rows.map((r) => {
        if (r.id !== rowId) return r;
        const notes = { ...r.notes };
        if (notes[tick] != null) delete notes[tick];
        else notes[tick] = velocity;
        return { ...r, notes };
      }),
    })),

  removeNote: (rowId, tick) =>
    set((s) => ({
      rows: s.rows.map((r) => {
        if (r.id !== rowId) return r;
        const notes = { ...r.notes };
        delete notes[tick];
        return { ...r, notes };
      }),
    })),

  setNoteVelocity: (rowId, tick, velocity) =>
    set((s) => ({
      rows: s.rows.map((r) => {
        if (r.id !== rowId || r.notes[tick] == null) return r;
        return { ...r, notes: { ...r.notes, [tick]: Math.max(1, Math.min(127, velocity)) } };
      }),
    })),

  setRowLabel: (rowId, label) =>
    set((s) => ({ rows: s.rows.map((r) => (r.id === rowId ? { ...r, label } : r)) })),

  setRowNote: (rowId, midiNote) =>
    set((s) => ({
      rows: s.rows.map((r) =>
        r.id === rowId ? { ...r, midiNote: Math.max(0, Math.min(127, midiNote)) } : r
      ),
    })),

  toggleMute: (rowId) =>
    set((s) => ({ rows: s.rows.map((r) => (r.id === rowId ? { ...r, muted: !r.muted } : r)) })),

  toggleSolo: (rowId) =>
    set((s) => ({ rows: s.rows.map((r) => (r.id === rowId ? { ...r, soloed: !r.soloed } : r)) })),

  /** Clear all hits in a single row. */
  clearRow: (rowId) =>
    set((s) => ({ rows: s.rows.map((r) => (r.id === rowId ? { ...r, notes: {} } : r)) })),

  clearPattern: () =>
    set((s) => ({ rows: s.rows.map((r) => ({ ...r, notes: {} })) })),

  savePattern: (name) => {
    const state = get();
    const savedPatterns = { ...state.savedPatterns, [name]: snapshotOf(state) };
    persistPatterns(savedPatterns);
    localStorage.setItem(LS_KEYS.activePattern, name);
    set({ savedPatterns, activePatternName: name });
  },

  loadPattern: (name) => {
    const snap = get().savedPatterns[name];
    if (!snap) return false;
    localStorage.setItem(LS_KEYS.activePattern, name);
    set({
      rows: rowsFromSnapshot(snap),
      bpm: snap.bpm,
      swing: snap.swing,
      resolution: snap.resolution || '1/16',
      activePatternName: name,
    });
    return true;
  },

  duplicatePattern: (name) => {
    const state = get();
    const snap = state.savedPatterns[name];
    if (!snap) return null;
    let copyName = `${name} copy`;
    let n = 2;
    while (state.savedPatterns[copyName]) copyName = `${name} copy ${n++}`;
    const savedPatterns = { ...state.savedPatterns, [copyName]: JSON.parse(JSON.stringify(snap)) };
    persistPatterns(savedPatterns);
    set({ savedPatterns });
    return copyName;
  },

  deletePattern: (name) => {
    const savedPatterns = { ...get().savedPatterns };
    delete savedPatterns[name];
    persistPatterns(savedPatterns);
    set((s) => ({
      savedPatterns,
      activePatternName: s.activePatternName === name ? null : s.activePatternName,
    }));
  },

  importPatterns: (incoming) => {
    const savedPatterns = { ...get().savedPatterns, ...incoming };
    persistPatterns(savedPatterns);
    set({ savedPatterns });
    return Object.keys(incoming).length;
  },

  clearAllData: () => {
    Object.values(LS_KEYS).forEach((k) => localStorage.removeItem(k));
    set({
      savedPatterns: {},
      activePatternName: null,
      rows: makeDefaultRows(),
      bpm: DEFAULT_BPM,
      swing: 0,
    });
  },
}));
