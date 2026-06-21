import * as Tone from 'tone'
import { midiToNoteWithOctave, ticksToSeconds } from './music'
import type { AudioFeel, InstrumentPreset, Pattern } from '../types'

type DrumLane = 'kick' | 'snare' | 'hat' | 'ghost'
type SafeOscillatorType = 'sine' | 'triangle' | 'square' | 'sawtooth'

export interface PlayMidiOptions {
  duration?: string
  velocity?: number
  strumMs?: number
  randomizeOrder?: boolean
}

interface HumanizedNoteEvent {
  midi: number
  timeOffsetMs: number
  velocity: number
}

const FEEL_SETTINGS: Record<AudioFeel, { timingMs: number; velocityRange: number; spreadMinMs: number; spreadMaxMs: number; randomizeOrder: boolean }> = {
  tight: { timingMs: 0, velocityRange: 0, spreadMinMs: 0, spreadMaxMs: 0, randomizeOrder: false },
  natural: { timingMs: 14, velocityRange: 0.08, spreadMinMs: 18, spreadMaxMs: 42, randomizeOrder: false },
  loose: { timingMs: 26, velocityRange: 0.16, spreadMinMs: 28, spreadMaxMs: 62, randomizeOrder: true },
}

const PRESET_SETTINGS: Record<
  InstrumentPreset,
  {
    oscillator: SafeOscillatorType
    attack: number
    decay: number
    sustain: number
    release: number
    volume: number
    filter: number
    chorusWet: number
    delayWet: number
    reverbWet: number
    distortionWet: number
    distortion: number
  }
> = {
  warmKeys: {
    oscillator: 'triangle',
    attack: 0.024,
    decay: 0.18,
    sustain: 0.5,
    release: 1.05,
    volume: -7,
    filter: 4200,
    chorusWet: 0.18,
    delayWet: 0.06,
    reverbWet: 0.2,
    distortionWet: 0.04,
    distortion: 0.05,
  },
  lushPad: {
    oscillator: 'sine',
    attack: 0.18,
    decay: 0.32,
    sustain: 0.72,
    release: 2.1,
    volume: -10,
    filter: 3200,
    chorusWet: 0.32,
    delayWet: 0.1,
    reverbWet: 0.36,
    distortionWet: 0.03,
    distortion: 0.04,
  },
  dustyEp: {
    oscillator: 'sine',
    attack: 0.012,
    decay: 0.34,
    sustain: 0.38,
    release: 1.35,
    volume: -8,
    filter: 3600,
    chorusWet: 0.22,
    delayWet: 0.08,
    reverbWet: 0.18,
    distortionWet: 0.12,
    distortion: 0.11,
  },
  softPluck: {
    oscillator: 'triangle',
    attack: 0.006,
    decay: 0.22,
    sustain: 0.18,
    release: 0.62,
    volume: -6,
    filter: 5200,
    chorusWet: 0.08,
    delayWet: 0.12,
    reverbWet: 0.16,
    distortionWet: 0.03,
    distortion: 0.04,
  },
  deepBass: {
    oscillator: 'sine',
    attack: 0.01,
    decay: 0.18,
    sustain: 0.58,
    release: 0.55,
    volume: -5,
    filter: 900,
    chorusWet: 0.03,
    delayWet: 0.02,
    reverbWet: 0.05,
    distortionWet: 0.08,
    distortion: 0.08,
  },
  cleanSine: {
    oscillator: 'sine',
    attack: 0.018,
    decay: 0.12,
    sustain: 0.44,
    release: 0.86,
    volume: -7,
    filter: 6500,
    chorusWet: 0.02,
    delayWet: 0.03,
    reverbWet: 0.12,
    distortionWet: 0,
    distortion: 0,
  },
}

export class StudioAudio {
  private synth: Tone.PolySynth | null = null
  private kick: Tone.MembraneSynth | null = null
  private snare: Tone.NoiseSynth | null = null
  private hat: Tone.NoiseSynth | null = null
  private limiter: Tone.Limiter | null = null
  private master: Tone.Volume | null = null
  private filter: Tone.Filter | null = null
  private chorus: Tone.Chorus | null = null
  private delay: Tone.FeedbackDelay | null = null
  private reverb: Tone.Reverb | null = null
  private distortion: Tone.Distortion | null = null
  private preset: InstrumentPreset = 'warmKeys'
  private feel: AudioFeel = 'natural'

  async start() {
    await Tone.start()
    Tone.getContext().lookAhead = 0.02

    if (this.synth) {
      return
    }

    this.limiter = new Tone.Limiter(-3).toDestination()
    const compressor = new Tone.Compressor({
      threshold: -18,
      ratio: 2.5,
      attack: 0.006,
      release: 0.16,
    }).connect(this.limiter)
    this.master = new Tone.Volume(-11).connect(compressor)
    const chordBus = new Tone.Volume(-8).connect(this.master)
    const drumBus = new Tone.Volume(-8).connect(this.master)
    const hatFilter = new Tone.Filter(7200, 'highpass').connect(drumBus)
    this.filter = new Tone.Filter(4200, 'lowpass').connect(chordBus)
    this.reverb = new Tone.Reverb({ decay: 2.8, preDelay: 0.02, wet: 0.2 }).connect(this.filter)
    this.delay = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.18, wet: 0.06 }).connect(this.reverb)
    this.chorus = new Tone.Chorus(1.2, 2.5, 0.18).connect(this.delay).start()
    this.distortion = new Tone.Distortion({ distortion: 0.05, wet: 0.04 }).connect(this.chorus)

    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.022, decay: 0.16, sustain: 0.42, release: 0.82 },
      volume: -5,
    }).connect(this.distortion)

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

    this.applyPreset()
  }

  setInstrumentPreset(preset: InstrumentPreset) {
    this.preset = preset
    this.applyPreset()
  }

  setAudioFeel(feel: AudioFeel) {
    this.feel = feel
  }

  playMidiNotes(midiNotes: number[], durationOrOptions: string | PlayMidiOptions = '2n', velocity = 0.78, strumMs = 0) {
    if (!this.synth) {
      return
    }

    const options = typeof durationOrOptions === 'string' ? { duration: durationOrOptions, velocity, strumMs } : durationOrOptions
    const duration = options.duration ?? '2n'
    const requestedVelocity = options.velocity ?? velocity
    const safeVelocity = Math.min(0.62, requestedVelocity / Math.sqrt(Math.max(1, midiNotes.length / 2)))
    const feel = FEEL_SETTINGS[this.feel]
    const spreadMs = options.strumMs ?? spreadForChord(midiNotes.length, feel.spreadMinMs, feel.spreadMaxMs)
    const events = humanizeNoteEvents(midiNotes, feel.timingMs, feel.velocityRange, spreadMs, safeVelocity, options.randomizeOrder ?? feel.randomizeOrder)
    const now = Tone.now() + 0.05
    events.forEach((event) => {
      this.synth?.triggerAttackRelease(midiToNoteWithOctave(event.midi), duration, now + event.timeOffsetMs / 1000, event.velocity)
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

  private applyPreset() {
    if (!this.synth) {
      return
    }

    const preset = PRESET_SETTINGS[this.preset]
    this.synth.set({
      oscillator: { type: preset.oscillator },
      envelope: { attack: preset.attack, decay: preset.decay, sustain: preset.sustain, release: preset.release },
      volume: preset.volume,
    })
    if (this.filter) this.filter.frequency.value = preset.filter
    if (this.chorus) this.chorus.wet.value = preset.chorusWet
    if (this.delay) this.delay.wet.value = preset.delayWet
    if (this.reverb) this.reverb.wet.value = preset.reverbWet
    if (this.distortion) {
      this.distortion.wet.value = preset.distortionWet
      this.distortion.distortion = preset.distortion
    }
  }
}

export function createStudioAudio(): StudioAudio {
  return new StudioAudio()
}

export function humanizeNoteEvents(
  midiNotes: number[],
  timingRangeMs: number,
  velocityRange: number,
  chordSpreadMs: number,
  baseVelocity = 0.78,
  randomizeOrder = false,
): HumanizedNoteEvent[] {
  const orderedNotes = randomizeOrder ? shuffle(midiNotes) : [...midiNotes]
  return orderedNotes.map((midi, index) => {
    const timingJitter = timingRangeMs === 0 ? 0 : randomBetween(-timingRangeMs, timingRangeMs)
    const velocityJitter = velocityRange === 0 ? 0 : randomBetween(-velocityRange, velocityRange)
    return {
      midi,
      timeOffsetMs: Math.max(-timingRangeMs, index * chordSpreadMs + timingJitter),
      velocity: clamp(baseVelocity * (1 + velocityJitter), 0.05, 0.85),
    }
  })
}

function spreadForChord(noteCount: number, minMs: number, maxMs: number): number {
  if (noteCount <= 1 || maxMs === 0) {
    return 0
  }
  return clamp(minMs + noteCount * 4, minMs, maxMs)
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function shuffle(values: number[]): number[] {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}
