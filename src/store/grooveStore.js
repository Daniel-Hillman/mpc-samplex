import { create } from 'zustand';
import { makeDefaultRows, LS_KEYS, DEFAULT_BPM, MIN_BPM, MAX_BPM, STEP_COUNT, DEFAULT_VELOCITY } from '../lib/constants';

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

function snapshotOf(state) {
  return {
    rows: JSON.parse(JSON.stringify(state.rows)),
    bpm: state.bpm,
    swing: state.swing,
    resolution: state.resolution,
    savedAt: Date.now(),
  };
}

export const useGrooveStore = create((set, get) => ({
  bpm: savedSettings.defaultBpm || DEFAULT_BPM,
  swing: 0,
  isPlaying: false,
  currentStep: -1,
  resolution: '1/16',
  loopEnabled: true,
  rows: makeDefaultRows(),
  activePatternName: localStorage.getItem(LS_KEYS.activePattern) || null,
  savedPatterns: loadPatterns(),

  setBpm: (bpm) => set({ bpm: Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(bpm))) }),
  setSwing: (swing) => set({ swing: Math.max(0, Math.min(100, Math.round(swing))) }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentStep: (currentStep) => set({ currentStep }),
  setResolution: (resolution) => set({ resolution }),
  toggleLoop: () => set((s) => ({ loopEnabled: !s.loopEnabled })),

  toggleStep: (rowId, stepIdx) =>
    set((s) => ({
      rows: s.rows.map((r) =>
        r.id !== rowId
          ? r
          : {
              ...r,
              steps: r.steps.map((st, i) => (i === stepIdx ? { ...st, active: !st.active } : st)),
            }
      ),
    })),

  setStepVelocity: (rowId, stepIdx, velocity) =>
    set((s) => ({
      rows: s.rows.map((r) =>
        r.id !== rowId
          ? r
          : {
              ...r,
              steps: r.steps.map((st, i) =>
                i === stepIdx ? { ...st, velocity: Math.max(1, Math.min(127, velocity)) } : st
              ),
            }
      ),
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

  clearPattern: () =>
    set((s) => ({
      rows: s.rows.map((r) => ({
        ...r,
        steps: r.steps.map(() => ({ active: false, velocity: DEFAULT_VELOCITY })),
      })),
    })),

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
      rows: JSON.parse(JSON.stringify(snap.rows)),
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

export const STEP_TOTAL = STEP_COUNT;
