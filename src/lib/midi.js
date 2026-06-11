import { WebMidi } from 'webmidi';
import { useMidiStore } from '../store/midiStore';

let enablePromise = null;

function syncDevices() {
  const store = useMidiStore.getState();
  store.setOutputs([...WebMidi.outputs]);
  store.setInputs([...WebMidi.inputs]);
  if (WebMidi.outputs.length === 0) {
    store.setStatus('no-devices');
  } else {
    store.setStatus('enabled');
    // Auto-select: keep current if still present, else prefer an MPC, else first output
    const current = store.selectedOutputId;
    const stillThere = WebMidi.outputs.find((o) => o.id === current);
    if (!stillThere) {
      const mpc = WebMidi.outputs.find((o) => /mpc/i.test(`${o.name} ${o.manufacturer}`));
      store.setSelectedOutputId((mpc || WebMidi.outputs[0]).id);
    }
  }
}

/** Enable WebMIDI once for the app lifetime. Safe to call repeatedly. */
export function enableMidi() {
  if (enablePromise) return enablePromise;
  const store = useMidiStore.getState();
  if (!('requestMIDIAccess' in navigator)) {
    store.setStatus('unavailable');
    enablePromise = Promise.resolve(false);
    return enablePromise;
  }
  enablePromise = WebMidi.enable({ sysex: false })
    .then(() => {
      syncDevices();
      WebMidi.addListener('connected', syncDevices);
      WebMidi.addListener('disconnected', syncDevices);
      return true;
    })
    .catch(() => {
      store.setStatus('unavailable');
      return false;
    });
  return enablePromise;
}

/** Re-scan devices (WebMIDI keeps lists live, but this forces a store refresh). */
export function refreshDevices() {
  if (WebMidi.enabled) syncDevices();
}

export function getSelectedOutput() {
  const { selectedOutputId } = useMidiStore.getState();
  if (!WebMidi.enabled || !selectedOutputId) return null;
  return WebMidi.outputs.find((o) => o.id === selectedOutputId) || null;
}

/**
 * Send a note to the selected output.
 * @returns {boolean} true if sent
 */
export function sendNote(midiNote, velocity = 100, durationMs = 100, channel = null, time = undefined) {
  const output = getSelectedOutput();
  if (!output) return false;
  const ch = channel ?? useMidiStore.getState().midiChannel;
  try {
    output.channels[ch].playNote(midiNote, {
      rawAttack: Math.max(1, Math.min(127, Math.round(velocity))),
      duration: durationMs,
      time,
    });
    return true;
  } catch {
    return false;
  }
}

/** Send several notes simultaneously. */
export function sendChord(midiNotes, velocity = 100, durationMs = 500, channel = null) {
  const output = getSelectedOutput();
  if (!output) return false;
  midiNotes.forEach((n) => sendNote(n, velocity, durationMs, channel));
  return true;
}

/** Strum: notes staggered by strumMs, up or down. */
export function sendStrum(midiNotes, velocity = 100, durationMs = 600, strumMs = 60, direction = 'up', channel = null) {
  const output = getSelectedOutput();
  if (!output) return false;
  const ordered = direction === 'down' ? [...midiNotes].sort((a, b) => b - a) : [...midiNotes].sort((a, b) => a - b);
  ordered.forEach((n, i) => {
    sendNote(n, velocity, durationMs, channel, `+${i * strumMs}`);
  });
  return true;
}

/**
 * Send a Program Change (0–127). With Receive Program Change set to
 * "Sequence" the MPC Sample uses these to trigger sequences.
 */
export function sendProgramChange(program, channel = null) {
  const output = getSelectedOutput();
  if (!output) return false;
  const ch = channel ?? useMidiStore.getState().midiChannel;
  try {
    output.channels[ch].sendProgramChange(Math.max(0, Math.min(127, program)));
    return true;
  } catch {
    return false;
  }
}

/** Hard panic: all notes off on all channels of the selected output. */
export function allNotesOff() {
  const output = getSelectedOutput();
  if (!output) return;
  try {
    output.sendAllNotesOff();
    output.sendAllSoundOff();
  } catch {
    /* no-op */
  }
}
