import { useEffect } from 'react';
import { useMidiStore } from '../store/midiStore';
import { enableMidi, refreshDevices, sendNote, sendChord, sendStrum, allNotesOff, getSelectedOutput } from '../lib/midi';

/**
 * React access to the shared MIDI layer. WebMIDI is enabled once for the app
 * lifetime (first mount wins); device state lives in midiStore.
 */
export function useMidi() {
  const status = useMidiStore((s) => s.status);
  const outputs = useMidiStore((s) => s.outputs);
  const inputs = useMidiStore((s) => s.inputs);
  const selectedOutputId = useMidiStore((s) => s.selectedOutputId);
  const midiChannel = useMidiStore((s) => s.midiChannel);
  const setSelectedOutputId = useMidiStore((s) => s.setSelectedOutputId);
  const setMidiChannel = useMidiStore((s) => s.setMidiChannel);

  useEffect(() => {
    enableMidi();
  }, []);

  return {
    status,
    outputs,
    inputs,
    selectedOutputId,
    midiChannel,
    setSelectedOutputId,
    setMidiChannel,
    refreshDevices,
    sendNote,
    sendChord,
    sendStrum,
    allNotesOff,
    getSelectedOutput,
    hasOutput: Boolean(selectedOutputId) && status === 'enabled',
  };
}
