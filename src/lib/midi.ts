import { BAR_TICKS, midiToNoteWithOctave, ticksToSeconds } from './music'
import type { MidiOutputDevice, Pattern } from '../types'

interface MidiAccessLike {
  outputs: Map<string, MidiOutputDevice>
}

export function isWebMidiAvailable(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.requestMIDIAccess === 'function'
}

export function isSecureMidiContext(): boolean {
  return typeof window !== 'undefined' && (window.isSecureContext || window.location.hostname === 'localhost')
}

export async function requestMidiOutputs(): Promise<MidiOutputDevice[]> {
  if (!navigator.requestMIDIAccess) {
    return []
  }

  const access = (await navigator.requestMIDIAccess({ sysex: false })) as unknown as MidiAccessLike
  return Array.from(access.outputs.values()).map((output) => ({
    id: output.id,
    name: output.name || 'MIDI output',
    manufacturer: output.manufacturer || undefined,
    send: output.send.bind(output),
  }))
}

export function sendMidiNote(output: MidiOutputDevice | null, channel: number, note: number, velocity = 100, durationMs = 240) {
  if (!output) {
    return
  }

  const status = 0x90 + clampChannel(channel)
  const offStatus = 0x80 + clampChannel(channel)
  const now = performance.now()
  output.send([status, note, Math.max(1, Math.min(127, velocity))], now)
  output.send([offStatus, note, 0], now + durationMs)
}

export function sendMidiChord(output: MidiOutputDevice | null, channel: number, notes: number[], velocity = 96, durationMs = 700, strumMs = 0) {
  if (!output) {
    return
  }

  const status = 0x90 + clampChannel(channel)
  const offStatus = 0x80 + clampChannel(channel)
  const now = performance.now()

  notes.forEach((note, index) => {
    const start = now + strumMs * index
    output.send([status, note, Math.max(1, Math.min(127, velocity))], start)
    output.send([offStatus, note, 0], start + durationMs)
  })
}

export function beamPattern(output: MidiOutputDevice | null, channel: number, pattern: Pattern, bpm: number) {
  if (!output) {
    return
  }

  const startMs = 700
  const status = 0x90 + clampChannel(channel)
  const offStatus = 0x80 + clampChannel(channel)
  const now = performance.now()

  pattern.events.forEach((event) => {
    const delay = startMs + ticksToSeconds(event.tick, bpm) * 1000
    const durationMs = Math.max(80, ticksToSeconds(event.durationTicks, bpm) * 1000)
    const velocity = Math.round(event.velocity * 127)
    output.send([status, event.midiNote, velocity], now + delay)
    output.send([offStatus, event.midiNote, 0], now + delay + durationMs)
  })
}

export async function exportPatternMidi(pattern: Pattern, bpm: number): Promise<Uint8Array> {
  const { Midi } = await import('@tonejs/midi')
  const midi = new Midi()
  midi.header.setTempo(bpm)
  const track = midi.addTrack()

  pattern.events.forEach((event) => {
    track.addNote({
      midi: event.midiNote,
      ticks: event.tick,
      durationTicks: event.durationTicks,
      velocity: event.velocity,
    })
  })

  const endTick = pattern.bars * BAR_TICKS
  track.addNote({ midi: 0, ticks: endTick, durationTicks: 1, velocity: 0 })
  return midi.toArray()
}

export async function downloadMidiFile(pattern: Pattern, bpm: number) {
  const bytes = await exportPatternMidi(pattern, bpm)
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  const blob = new Blob([arrayBuffer], { type: 'audio/midi' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${pattern.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.mid`
  anchor.click()
  URL.revokeObjectURL(url)
}

function clampChannel(channel: number): number {
  return Math.max(0, Math.min(15, channel - 1))
}

export function noteLabelForMidi(note: number): string {
  return midiToNoteWithOctave(note)
}
