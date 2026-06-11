import { create } from 'zustand';
import { LS_KEYS } from '../lib/constants';

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEYS.settings)) || {};
  } catch {
    return {};
  }
}

const saved = loadSettings();

export const useMidiStore = create((set) => ({
  // 'idle' | 'enabled' | 'no-devices' | 'unavailable'
  status: 'idle',
  outputs: [],
  inputs: [],
  selectedOutputId: saved.defaultOutputId || null,
  midiChannel: saved.defaultChannel || 1,

  // MIDI beat clock: 'off' | 'send' (app is master) | 'receive' (follow MPC)
  clockMode: 'off',
  clockInputId: null,
  externalBpm: null,

  setStatus: (status) => set({ status }),
  setOutputs: (outputs) => set({ outputs }),
  setInputs: (inputs) => set({ inputs }),
  setSelectedOutputId: (selectedOutputId) => set({ selectedOutputId }),
  setMidiChannel: (midiChannel) => set({ midiChannel }),
  setClockMode: (clockMode) => set({ clockMode }),
  setClockInputId: (clockInputId) => set({ clockInputId }),
  setExternalBpm: (externalBpm) => set({ externalBpm }),
}));
