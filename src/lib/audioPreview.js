import * as Tone from 'tone';
import { midiNoteToName } from './music-theory';

// Browser-synth chord preview. Lets every chord/scale tool make sound even
// without a MIDI device (phones, Firefox, away from the MPC).

let synth = null;
let audioStarted = false;

async function ensureSynth() {
  if (!audioStarted) {
    await Tone.start(); // must run inside a user gesture the first time
    audioStarted = true;
  }
  if (!synth) {
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle8' },
      envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.5 },
    }).toDestination();
    synth.maxPolyphony = 16;
    synth.volume.value = -9;
  }
  return synth;
}

/**
 * Play notes through the browser synth.
 * @param {number[]} midiNotes
 * @param {number} durationMs
 * @param {number} velocity 0–1
 * @param {number} strumMs  stagger between notes (0 = block chord)
 * @param {'up'|'down'} direction strum direction
 */
export async function auditionNotes(midiNotes, durationMs = 700, velocity = 0.75, strumMs = 0, direction = 'up') {
  if (!midiNotes?.length) return;
  try {
    const s = await ensureSynth();
    const now = Tone.now();
    const ordered =
      direction === 'down' ? [...midiNotes].sort((a, b) => b - a) : [...midiNotes].sort((a, b) => a - b);
    ordered.forEach((n, i) => {
      if (n < 0 || n > 127) return;
      s.triggerAttackRelease(midiNoteToName(n), durationMs / 1000, now + (i * strumMs) / 1000, velocity);
    });
  } catch {
    /* audio context blocked — nothing to do */
  }
}
