import * as Tone from 'tone';

// Synthesized drum kit for previewing grooves in the browser (no MPC needed).
// Each row's MIDI note is mapped to a General-MIDI-style percussion voice so a
// "kick" sounds like a kick, not a piano note. Built lazily once the audio
// context is running (playback already calls Tone.start()).

let kit = null;

function buildKit() {
  const out = new Tone.Gain(0.9).toDestination();
  const glue = new Tone.Compressor(-20, 3).connect(out);

  const kick = new Tone.MembraneSynth({
    pitchDecay: 0.03,
    octaves: 6,
    envelope: { attack: 0.001, decay: 0.34, sustain: 0, release: 0.2 },
  }).connect(glue);

  const tom = new Tone.MembraneSynth({
    pitchDecay: 0.02,
    octaves: 4,
    envelope: { attack: 0.001, decay: 0.28, sustain: 0, release: 0.2 },
  }).connect(glue);

  const snareBody = new Tone.MembraneSynth({
    pitchDecay: 0.018,
    octaves: 3,
    envelope: { attack: 0.001, decay: 0.13, sustain: 0 },
  }).connect(glue);
  const snareHi = new Tone.Filter(1700, 'highpass').connect(glue);
  const snareNoise = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.16, sustain: 0 },
  }).connect(snareHi);

  const hatHi = new Tone.Filter(8500, 'highpass').connect(glue);
  const closedHat = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.045, sustain: 0 },
  }).connect(hatHi);
  const openHi = new Tone.Filter(7000, 'highpass').connect(glue);
  const openHat = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.32, sustain: 0.04, release: 0.2 },
  }).connect(openHi);

  const clapBp = new Tone.Filter({ type: 'bandpass', frequency: 1100, Q: 1.4 }).connect(glue);
  const clap = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.002, decay: 0.18, sustain: 0 },
  }).connect(clapBp);

  const metal = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.5, release: 0.2 },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 4000,
    octaves: 1.5,
  }).connect(glue);
  metal.frequency.value = 250;
  metal.volume.value = -22;
  closedHat.volume.value = -6;
  openHat.volume.value = -8;
  clap.volume.value = -4;
  snareNoise.volume.value = -4;

  return { kick, tom, snareBody, snareNoise, closedHat, openHat, clap, metal };
}

function ensureKit() {
  if (!kit && Tone.context.state === 'running') kit = buildKit();
  return kit;
}

const v = (vel) => Math.max(0.05, Math.min(1, vel / 127));

/**
 * Trigger a drum voice for a MIDI note at a precise transport time.
 * @param {number} note GM-style drum note
 * @param {number} velocity 0–127
 * @param {number} time Tone transport time for sample-accurate playback
 */
export function triggerDrum(note, velocity = 100, time = undefined) {
  const k = ensureKit();
  if (!k) return;
  const vel = v(velocity);
  try {
    switch (note) {
      case 35:
      case 36: // kick
        k.kick.triggerAttackRelease('C1', '8n', time, vel);
        break;
      case 38:
      case 40: // snare
        k.snareBody.triggerAttackRelease('D2', '16n', time, vel * 0.8);
        k.snareNoise.triggerAttackRelease('16n', time, vel);
        break;
      case 37: // side stick / rim
        k.snareBody.triggerAttackRelease('A3', '32n', time, vel * 0.6);
        break;
      case 39: // hand clap — quick double burst
        k.clap.triggerAttackRelease('16n', time, vel);
        k.clap.triggerAttackRelease('16n', time === undefined ? '+0.012' : time + 0.012, vel * 0.7);
        break;
      case 42:
      case 44: // closed / pedal hat
        k.closedHat.triggerAttackRelease('32n', time, vel);
        break;
      case 46: // open hat
        k.openHat.triggerAttackRelease('8n', time, vel);
        break;
      case 41:
      case 43: // low toms
        k.tom.triggerAttackRelease('C2', '8n', time, vel);
        break;
      case 45:
      case 47: // mid toms
        k.tom.triggerAttackRelease('E2', '8n', time, vel);
        break;
      case 48:
      case 50: // high toms
        k.tom.triggerAttackRelease('A2', '8n', time, vel);
        break;
      case 49:
      case 51:
      case 52:
      case 53:
      case 55:
      case 57:
      case 59: // cymbals / ride / bell
        k.metal.triggerAttackRelease('4n', time, vel * 0.9);
        break;
      case 54: // tambourine
        k.metal.triggerAttackRelease('16n', time, vel * 0.7);
        break;
      default: // anything else — a neutral perc tone
        k.tom.triggerAttackRelease('G2', '16n', time, vel);
    }
  } catch {
    /* voice retrigger collision — ignore */
  }
}
