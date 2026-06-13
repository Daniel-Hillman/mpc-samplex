import * as Tone from 'tone'
import { midiToNoteWithOctave, ticksToSeconds } from './music'
import type { Pattern } from '../types'

type DrumLane = 'kick' | 'snare' | 'hat' | 'ghost'

export class StudioAudio {
  private synth: Tone.PolySynth | null = null
  private kick: Tone.MembraneSynth | null = null
  private snare: Tone.NoiseSynth | null = null
  private hat: Tone.NoiseSynth | null = null
  private limiter: Tone.Limiter | null = null
  private master: Tone.Volume | null = null

  async start() {
    await Tone.start()
    Tone.getContext().lookAhead = 0.02

    if (this.synth) {
      return
    }

    this.limiter = new Tone.Limiter(-6).toDestination()
    const compressor = new Tone.Compressor({
      threshold: -18,
      ratio: 2.5,
      attack: 0.006,
      release: 0.16,
    }).connect(this.limiter)
    this.master = new Tone.Volume(-9).connect(compressor)
    const chordBus = new Tone.Volume(-7).connect(this.master)
    const drumBus = new Tone.Volume(-8).connect(this.master)
    const hatFilter = new Tone.Filter(7200, 'highpass').connect(drumBus)

    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle8' },
      envelope: { attack: 0.022, decay: 0.16, sustain: 0.42, release: 0.82 },
      volume: -5,
    }).connect(chordBus)

    this.kick = new Tone.MembraneSynth({
      pitchDecay: 0.036,
      octaves: 7,
      envelope: { attack: 0.002, decay: 0.42, sustain: 0.02, release: 0.1 },
      volume: -8,
    }).connect(drumBus)

    this.snare = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.001, decay: 0.18, sustain: 0.02, release: 0.09 },
      volume: -13,
    }).connect(drumBus)

    this.hat = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.045, sustain: 0, release: 0.018 },
      volume: -20,
    }).connect(hatFilter)
  }

  playMidiNotes(midiNotes: number[], duration = '2n', velocity = 0.78, strumMs = 0) {
    if (!this.synth) {
      return
    }

    const now = Tone.now()
    const safeVelocity = Math.min(0.62, velocity / Math.sqrt(Math.max(1, midiNotes.length / 2)))
    midiNotes.forEach((midi, index) => {
      this.synth?.triggerAttackRelease(midiToNoteWithOctave(midi), duration, now + (strumMs / 1000) * index, safeVelocity)
    })
  }

  playDrum(lane: DrumLane, time = Tone.now(), velocity = 0.85) {
    if (lane === 'kick') {
      this.kick?.triggerAttackRelease('C1', '8n', time, Math.min(0.78, velocity))
    } else if (lane === 'snare' || lane === 'ghost') {
      this.snare?.triggerAttackRelease('16n', time, lane === 'ghost' ? velocity * 0.34 : Math.min(0.68, velocity))
    } else {
      this.hat?.triggerAttackRelease('32n', time, velocity * 0.32)
    }
  }

  playPattern(pattern: Pattern, bpm: number) {
    const now = Tone.now() + 0.06

    pattern.events.forEach((event) => {
      const lane = event.laneId as DrumLane
      const repeats = event.ratchet ?? 1
      const slice = ticksToSeconds(event.durationTicks, bpm) / repeats

      for (let index = 0; index < repeats; index += 1) {
        this.playDrum(lane, now + ticksToSeconds(event.tick, bpm) + slice * index, event.velocity)
      }
    })
  }
}

export function createStudioAudio(): StudioAudio {
  return new StudioAudio()
}
