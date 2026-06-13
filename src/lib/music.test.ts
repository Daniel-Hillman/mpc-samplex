import { describe, expect, it } from 'vitest'
import {
  BAR_TICKS,
  analyzeSixteenLevelsChord,
  createPitchWindow,
  noteNameToMidi,
  padToMidi,
  toggleGridEvent,
} from './music'
import type { PadNumber, Pattern } from '../types'

describe('16 Levels pitch window', () => {
  it('maps pads to the fixed semitone window from the original pitch pad', () => {
    const sampleRoot = noteNameToMidi('C', 3)
    const originalPad = 5 as PadNumber
    const window = createPitchWindow(sampleRoot, originalPad)

    expect(window.minMidi).toBe(sampleRoot - 4)
    expect(window.maxMidi).toBe(sampleRoot + 11)
    expect(padToMidi(sampleRoot, originalPad, 5)).toBe(sampleRoot)
    expect(padToMidi(sampleRoot, originalPad, 16)).toBe(sampleRoot + 11)
  })

  it('ranks honest playable chord shapes without inventing off-window notes', () => {
    const analysis = analyzeSixteenLevelsChord('C', 'maj9', noteNameToMidi('C', 3), 1)
    const best = analysis.shapes[0]

    expect(['Full', 'Strong', 'Shell']).toContain(best.rank)
    expect(best.pads.every((pad) => pad.pad >= 1 && pad.pad <= 16)).toBe(true)
    expect(analysis.retuneSuggestions.every((suggestion) => suggestion.semitones !== 0)).toBe(true)
  })

  it('suggests pad-level octave escapes for chord colors beyond the 16-pad window', () => {
    const analysis = analyzeSixteenLevelsChord('C', 'dom13', noteNameToMidi('C', 3), 1)

    expect(analysis.padRetunePlans.length).toBeGreaterThan(0)
    expect(analysis.padRetunePlans.some((plan) => plan.intervalLabel === '13')).toBe(true)
    expect(analysis.padRetunePlans.every((plan) => Math.abs(plan.semitones) % 12 === 0)).toBe(true)
  })
})

describe('absolute tick sequencing', () => {
  it('keeps events at their absolute ticks when grid resolution changes', () => {
    const pattern: Pattern = {
      id: 'test',
      name: 'Test',
      bars: 1,
      events: [],
    }

    const withSixteenth = toggleGridEvent(pattern, 'kick', 36, 4, 16)
    const eventTick = withSixteenth.events[0].tick
    const withTripletGrid = toggleGridEvent(withSixteenth, 'snare', 38, 6, 24)

    expect(eventTick).toBe(BAR_TICKS / 4)
    expect(withTripletGrid.events.find((event) => event.laneId === 'kick')?.tick).toBe(eventTick)
  })
})
