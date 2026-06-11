// MPC Sample default pad → MIDI mapping (drum program, bank A)
export const DEFAULT_PAD_MAPPING = [
  { pad: 1, label: 'Kick', midiNote: 36 },
  { pad: 2, label: 'Snare', midiNote: 38 },
  { pad: 3, label: 'Hi-Hat', midiNote: 42 },
  { pad: 4, label: 'Open HH', midiNote: 46 },
  { pad: 5, label: 'Clap', midiNote: 39 },
  { pad: 6, label: 'Perc 1', midiNote: 43 },
  { pad: 7, label: 'Perc 2', midiNote: 45 },
  { pad: 8, label: 'Rim', midiNote: 37 },
];

// 16-pad starting map. The MPC Sample manual does not publish a pad→note
// chart, so these GM-style numbers are a working default — the note prober
// on the MPC page verifies the real mapping per unit.
export const MPC_PAD_REFERENCE = [
  { pad: 1, midiNote: 36, gmName: 'Bass Drum 1', bank: 'A' },
  { pad: 2, midiNote: 38, gmName: 'Acoustic Snare', bank: 'A' },
  { pad: 3, midiNote: 42, gmName: 'Closed Hi-Hat', bank: 'A' },
  { pad: 4, midiNote: 46, gmName: 'Open Hi-Hat', bank: 'A' },
  { pad: 5, midiNote: 39, gmName: 'Hand Clap', bank: 'A' },
  { pad: 6, midiNote: 43, gmName: 'High Floor Tom', bank: 'A' },
  { pad: 7, midiNote: 45, gmName: 'Low Tom', bank: 'A' },
  { pad: 8, midiNote: 37, gmName: 'Side Stick', bank: 'A' },
  { pad: 9, midiNote: 41, gmName: 'Low Floor Tom', bank: 'A' },
  { pad: 10, midiNote: 47, gmName: 'Low-Mid Tom', bank: 'A' },
  { pad: 11, midiNote: 48, gmName: 'Hi-Mid Tom', bank: 'A' },
  { pad: 12, midiNote: 50, gmName: 'High Tom', bank: 'A' },
  { pad: 13, midiNote: 49, gmName: 'Crash Cymbal 1', bank: 'A' },
  { pad: 14, midiNote: 51, gmName: 'Ride Cymbal 1', bank: 'A' },
  { pad: 15, midiNote: 53, gmName: 'Ride Bell', bank: 'A' },
  { pad: 16, midiNote: 54, gmName: 'Tambourine', bank: 'A' },
];

export const STEP_COUNT = 16;
export const DEFAULT_BPM = 90;
export const DEFAULT_VELOCITY = 100;
export const MIN_BPM = 40;
export const MAX_BPM = 240;

export const ROOT_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// localStorage keys
export const LS_KEYS = {
  patterns: 'mpc-studio:patterns',
  settings: 'mpc-studio:settings',
  padMap: 'mpc-studio:pad-map',
  activePattern: 'mpc-studio:active-pattern',
  setup: 'mpc-studio:setup-checklist',
};

export function makeDefaultRows() {
  let overrides = null;
  let velocity = DEFAULT_VELOCITY;
  try {
    const settings = JSON.parse(localStorage.getItem(LS_KEYS.settings)) || {};
    overrides = settings.grooveDefaults || null;
    if (settings.defaultVelocity >= 1 && settings.defaultVelocity <= 127) {
      velocity = settings.defaultVelocity;
    }
  } catch {
    /* use built-in defaults */
  }
  return DEFAULT_PAD_MAPPING.map((p, idx) => ({
    id: `row-${idx}`,
    label: overrides?.[idx]?.label ?? p.label,
    midiNote: overrides?.[idx]?.midiNote ?? p.midiNote,
    muted: false,
    soloed: false,
    steps: Array.from({ length: STEP_COUNT }, () => ({
      active: false,
      velocity,
    })),
  }));
}
