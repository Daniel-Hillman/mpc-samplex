import * as Tone from 'tone';
import { midiNoteToName } from './music-theory';

// Lush browser-synth preview. A warm, wide electric-piano / pad voice so chord
// and scale auditions sound musical even without a MIDI device. Built lazily on
// the first user gesture (Tone requires that for the AudioContext).

let synth = null;
let audioStarted = false;

async function ensureSynth() {
  if (!audioStarted) {
    await Tone.start(); // unlock the audio context inside a user gesture
    audioStarted = true;
  }
  if (!synth) {
    // Stereo width + air, then a gentle space to bloom the chord
    const reverb = new Tone.Reverb({ decay: 3.2, preDelay: 0.02, wet: 0.26 }).toDestination();
    const chorus = new Tone.Chorus({ frequency: 0.8, delayTime: 3.2, depth: 0.55, spread: 160, wet: 0.4 })
      .connect(reverb)
      .start();
    // Tame the top so detuned saws stay creamy, not buzzy
    const tone = new Tone.Filter({ type: 'lowpass', frequency: 3400, rolloff: -12, Q: 0.4 }).connect(chorus);

    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fattriangle', count: 3, spread: 28 },
      envelope: { attack: 0.018, decay: 1.1, sustain: 0.5, release: 1.8 },
    }).connect(tone);
    synth.maxPolyphony = 32;
    synth.volume.value = -12;
  }
  return synth;
}

/**
 * Play notes through the lush browser synth.
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
    // a touch of sustain past the visual duration lets the reverb tail breathe
    const dur = Math.max(0.18, durationMs / 1000);
    ordered.forEach((n, i) => {
      if (n < 0 || n > 127) return;
      s.triggerAttackRelease(midiNoteToName(n), dur, now + (i * strumMs) / 1000, velocity);
    });
  } catch {
    /* audio context blocked — nothing to do */
  }
}
