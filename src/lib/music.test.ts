import { describe, expect, it } from 'vitest'
import {
  BAR_TICKS,
  analyzeSixteenLevelsChord,
  buildProgressionPlaybook,
  createPitchWindow,
  formatSemitoneShift,
  getBassPadRecipe,
  getMelodyPadRoles,
  getScaleNotes,
  noteNameToMidi,
  padToMidi,
  shortestPitchShift,
  suggestNextChords,
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

describe('sample helper theory tools', () => {
  it('finds scale notes for MPC safe-pad highlighting', () => {
    expect(getScaleNotes('A', 'minorPent')).toEqual(['A', 'C', 'D', 'E', 'G'])
    expect(getScaleNotes('G', 'mixolydian')).toContain('F')
  })

  it('calculates the shortest one-shot repitch move', () => {
    expect(shortestPitchShift('C', 'A')).toBe(-3)
    expect(formatSemitoneShift(-3)).toBe('Pitch down -3 semitones')
  })

  it('suggests beginner-friendly next chords by musical job', () => {
    const [start, mood, tension] = suggestNextChords(null, 'C', 'minor')

    expect(start.category).toBe('Safe')
    expect(start.root).toBe('C')
    expect(mood.label).toBe('emotional')
    expect(tension.category).toBe('Tension')
  })

  it('labels melody pads by home, strong, safe, passing, and tension roles', () => {
    const analysis = analyzeSixteenLevelsChord('C', 'min9', noteNameToMidi('C', 3), 4)
    const roles = getMelodyPadRoles(getScaleNotes('C', 'minor'), analysis.shapes[0], analysis.window)

    expect(roles.find((pad) => pad.pad === 4)?.role).toBe('home')
    expect(roles.some((pad) => pad.role === 'strong')).toBe(true)
    expect(roles.some((pad) => pad.role === 'safe')).toBe(true)
  })

  it('builds bass recipes and progression playbook from honest window pads', () => {
    const window = createPitchWindow(noteNameToMidi('C', 3), 4)
    const cStep = { id: 'c', root: 'C', quality: 'min7' as const, durationTicks: BAR_TICKS }
    const fStep = { id: 'f', root: 'F', quality: 'min7' as const, durationTicks: BAR_TICKS }
    const bass = getBassPadRecipe(cStep, fStep, window)
    const progressionShapes = [cStep, fStep].map((step) => ({
      step,
      shape: analyzeSixteenLevelsChord(step.root, step.quality, window.sampleRootMidi, window.originalPitchPad).shapes[0],
    }))
    const playbook = buildProgressionPlaybook(progressionShapes, getScaleNotes('C', 'minor'), window)

    expect(bass.find((recipe) => recipe.id === 'root')?.pads).toEqual([4])
    expect(bass.find((recipe) => recipe.id === 'root-fifth')?.status).toBe('ready')
    expect(playbook).toHaveLength(2)
    expect(playbook[0].chordPads.length).toBeGreaterThan(0)
    expect(playbook[0].melodyPads.length).toBeGreaterThan(0)
  })
})
