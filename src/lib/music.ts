import type {
  ChordDefinition,
  ChordPad,
  ChordQualityId,
  ChordRank,
  ChordShape,
  ChordStep,
  OriginalPadSuggestion,
  PadMap,
  PadNumber,
  PadRetunePlan,
  Pattern,
  PitchWindow,
  RetuneSuggestion,
  SixteenLevelsAnalysis,
  TimelineEvent,
} from '../types'

export const PPQN = 960
export const BAR_TICKS = PPQN * 4
export const PAD_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] as PadNumber[]
export const ROOT_NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const NOTE_TO_PITCH_CLASS: Record<string, number> = {
  C: 0,
  'B#': 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  'E#': 5,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
  Cb: 11,
}

const INTERVAL_LABELS: Record<number, string> = {
  0: 'root',
  2: '2',
  3: 'b3',
  4: '3',
  5: '4',
  6: 'b5',
  7: '5',
  10: 'b7',
  11: '7',
  14: '9',
  17: '11',
  21: '13',
}

export const CHORD_DEFINITIONS: ChordDefinition[] = [
  { id: 'maj', label: 'Major', symbol: '', coreIntervals: [0, 4, 7], colorIntervals: [], shellIntervals: [0, 4, 7] },
  { id: 'min', label: 'Minor', symbol: 'm', coreIntervals: [0, 3, 7], colorIntervals: [], shellIntervals: [0, 3, 7] },
  { id: 'dom7', label: 'Dominant 7', symbol: '7', coreIntervals: [0, 4, 7, 10], colorIntervals: [], shellIntervals: [0, 4, 10] },
  { id: 'min7', label: 'Minor 7', symbol: 'm7', coreIntervals: [0, 3, 7, 10], colorIntervals: [], shellIntervals: [0, 3, 10] },
  { id: 'maj7', label: 'Major 7', symbol: 'maj7', coreIntervals: [0, 4, 7, 11], colorIntervals: [], shellIntervals: [0, 4, 11] },
  { id: 'dim', label: 'Diminished', symbol: 'dim', coreIntervals: [0, 3, 6], colorIntervals: [], shellIntervals: [0, 3, 6] },
  { id: 'sus2', label: 'Sus 2', symbol: 'sus2', coreIntervals: [0, 2, 7], colorIntervals: [], shellIntervals: [0, 2, 7] },
  { id: 'sus4', label: 'Sus 4', symbol: 'sus4', coreIntervals: [0, 5, 7], colorIntervals: [], shellIntervals: [0, 5, 7] },
  { id: 'min9', label: 'Minor 9', symbol: 'm9', coreIntervals: [0, 3, 7, 10], colorIntervals: [14], shellIntervals: [0, 3, 10] },
  { id: 'dom9', label: 'Dominant 9', symbol: '9', coreIntervals: [0, 4, 7, 10], colorIntervals: [14], shellIntervals: [0, 4, 10] },
  { id: 'maj9', label: 'Major 9', symbol: 'maj9', coreIntervals: [0, 4, 7, 11], colorIntervals: [14], shellIntervals: [0, 4, 11] },
  { id: 'min11', label: 'Minor 11', symbol: 'm11', coreIntervals: [0, 3, 7, 10], colorIntervals: [14, 17], shellIntervals: [0, 3, 10] },
  { id: 'dom13', label: 'Dominant 13', symbol: '13', coreIntervals: [0, 4, 7, 10], colorIntervals: [14, 21], shellIntervals: [0, 4, 10] },
]

const RANK_WEIGHT: Record<ChordRank, number> = {
  Full: 400,
  Strong: 300,
  Shell: 180,
  'Not playable': 0,
}

export function getChordDefinition(id: ChordQualityId): ChordDefinition {
  return CHORD_DEFINITIONS.find((quality) => quality.id === id) ?? CHORD_DEFINITIONS[0]
}

export function midiToNoteName(midi: number): string {
  return NOTE_NAMES[positiveMod(midi, 12)]
}

export function midiToNoteWithOctave(midi: number): string {
  return `${midiToNoteName(midi)}${Math.floor(midi / 12) - 1}`
}

export function noteNameToMidi(noteName: string, octave = 3): number {
  return (NOTE_TO_PITCH_CLASS[noteName] ?? 0) + (octave + 1) * 12
}

export function createPitchWindow(sampleRootMidi: number, originalPitchPad: PadNumber): PitchWindow {
  return {
    sampleRootMidi,
    originalPitchPad,
    minMidi: sampleRootMidi + (1 - originalPitchPad),
    maxMidi: sampleRootMidi + (16 - originalPitchPad),
  }
}

export function padToMidi(sampleRootMidi: number, originalPitchPad: PadNumber, pad: PadNumber): number {
  return sampleRootMidi + (pad - originalPitchPad)
}

export function midiToPad(window: PitchWindow, midi: number): PadNumber | null {
  if (midi < window.minMidi || midi > window.maxMidi) {
    return null
  }
  return (window.originalPitchPad + (midi - window.sampleRootMidi)) as PadNumber
}

export function createDefaultPadMap(): PadMap {
  const now = new Date().toISOString()
  const notesByPad = PAD_NUMBERS.reduce(
    (map, pad, index) => {
      map[pad] = 36 + index
      return map
    },
    {} as Record<PadNumber, number>,
  )

  return {
    id: 'factory-chromatic',
    name: 'Factory chromatic guess',
    bank: 'A',
    midiChannel: 1,
    notesByPad,
    createdAt: now,
    updatedAt: now,
  }
}

export function describeChord(root: string, qualityId: ChordQualityId): string {
  const quality = getChordDefinition(qualityId)
  return `${root}${quality.symbol}`
}

export function getDiatonicChords(keyRoot: string, scaleType = 'major'): ChordStep[] {
  const scaleIntervals = scaleType === 'minor' ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11]
  const keyMidi = noteNameToMidi(keyRoot, 3)
  const notes = scaleIntervals.map((interval) => midiToNoteName(keyMidi + interval))
  const majorQualities: ChordQualityId[] = ['maj7', 'min7', 'min7', 'maj7', 'dom7', 'min7', 'dim']
  const minorQualities: ChordQualityId[] = ['min7', 'dim', 'maj7', 'min7', 'min7', 'maj7', 'dom7']
  const qualities = scaleType === 'minor' ? minorQualities : majorQualities

  return notes.slice(0, 7).map((root, index) => ({
    id: `diatonic-${root}-${qualities[index]}`,
    root,
    quality: qualities[index],
    durationTicks: BAR_TICKS,
  }))
}

export function getChordToneMidi(root: string, interval: number): number {
  return noteNameToMidi(root, 3) + interval
}

export function analyzeSixteenLevelsChord(
  root: string,
  qualityId: ChordQualityId,
  sampleRootMidi: number,
  originalPitchPad: PadNumber,
): SixteenLevelsAnalysis {
  const window = createPitchWindow(sampleRootMidi, originalPitchPad)
  const shapes = buildShapeVariants(root, qualityId, window)
    .sort((a, b) => b.score - a.score)
    .filter((shape, index, all) => index === all.findIndex((other) => other.id === shape.id))
    .slice(0, 5)

  return {
    window,
    shapes,
    retuneSuggestions: findRetuneSuggestions(root, qualityId, sampleRootMidi, originalPitchPad),
    padRetunePlans: findPadRetunePlans(root, qualityId, window),
    originalPadSuggestions: findOriginalPadSuggestions(root, qualityId, sampleRootMidi),
  }
}

export function rankLabel(rank: ChordRank): string {
  if (rank === 'Full') return 'Full chord'
  if (rank === 'Strong') return 'Strong shape'
  if (rank === 'Shell') return 'Shell voicing'
  return 'Not playable'
}

export function createTemplatePattern(templateId: string): Pattern {
  const base = {
    id: `pattern-${templateId}`,
    name: 'Boom-bap pocket',
    bars: 1,
    events: [] as TimelineEvent[],
  }

  const add = (laneId: string, step: number, midiNote: number, velocity = 0.9, microshiftTicks = 0, ratchet = 1) => {
    base.events.push({
      id: `${laneId}-${step}-${microshiftTicks}-${ratchet}`,
      tick: Math.round((BAR_TICKS / 16) * step) + microshiftTicks,
      durationTicks: PPQN / 4,
      midiNote,
      velocity,
      laneId,
      ratchet,
    })
  }

  if (templateId === 'amen') {
    base.name = 'Amen two-step'
    ;[0, 6, 10, 13].forEach((step) => add('kick', step, 36, 0.95))
    ;[4, 11].forEach((step) => add('snare', step, 38, 0.98))
    ;[2, 5, 8, 12, 15].forEach((step) => add('hat', step, 42, 0.62))
    add('ghost', 7, 39, 0.42, -34)
    add('ghost', 14, 39, 0.38, 28)
  } else if (templateId === 'dilla') {
    base.name = 'Dilla drag'
    ;[0, 7, 10].forEach((step) => add('kick', step, 36, step === 7 ? 0.72 : 0.95, step === 7 ? 56 : 0))
    ;[4, 12].forEach((step) => add('snare', step, 38, 0.92, step === 12 ? 42 : 20))
    ;[0, 2, 4, 6, 8, 10, 12, 14].forEach((step) => add('hat', step, 42, 0.48, step % 4 === 2 ? 38 : 0))
  } else if (templateId === 'halftime') {
    base.name = 'Halftime soul'
    ;[0, 11].forEach((step) => add('kick', step, 36, step === 11 ? 0.74 : 0.94))
    add('snare', 8, 38, 0.98, 36)
    ;[0, 4, 8, 12].forEach((step) => add('hat', step, 42, 0.42, step === 12 ? 24 : 0))
    add('ghost', 7, 39, 0.28, -20)
  } else if (templateId === 'jungle-ghosts') {
    base.name = 'Jungle ghosts'
    ;[0, 3, 10, 14].forEach((step) => add('kick', step, 36, 0.86))
    ;[4, 9, 12].forEach((step) => add('snare', step, 38, step === 9 ? 0.48 : 0.94, step === 9 ? -42 : 18))
    ;[0, 2, 5, 6, 8, 10, 13, 15].forEach((step) => add('hat', step, 42, 0.55))
    add('ghost', 11, 39, 0.35, 22, 2)
  } else {
    ;[0, 6, 10].forEach((step) => add('kick', step, 36, 0.92))
    ;[4, 12].forEach((step) => add('snare', step, 38, 0.94))
    ;[0, 2, 4, 6, 8, 10, 12, 14].forEach((step) => add('hat', step, 42, 0.55))
    add('ghost', 11, 39, 0.34, -26)
  }

  return base
}

export function toggleGridEvent(pattern: Pattern, laneId: string, midiNote: number, step: number, stepsPerBar: number): Pattern {
  const tick = Math.round((BAR_TICKS / stepsPerBar) * step)
  const existing = pattern.events.find((event) => event.laneId === laneId && Math.abs(event.tick - tick) < 2)
  const events = existing
    ? pattern.events.filter((event) => event.id !== existing.id)
    : [
        ...pattern.events,
        {
          id: `${laneId}-${tick}-${Date.now()}`,
          tick,
          durationTicks: Math.round(BAR_TICKS / stepsPerBar / 2),
          midiNote,
          velocity: laneId === 'hat' ? 0.55 : 0.9,
          laneId,
        },
      ]

  return { ...pattern, events: events.sort((a, b) => a.tick - b.tick) }
}

export function ticksToSeconds(ticks: number, bpm: number): number {
  return (ticks / PPQN) * (60 / bpm)
}

export function gridSteps(resolution: number): number[] {
  return Array.from({ length: resolution }, (_, index) => index)
}

function buildShape(root: string, qualityId: ChordQualityId, window: PitchWindow): ChordShape {
  return buildShapeVariants(root, qualityId, window)[0]
}

function buildShapeVariants(root: string, qualityId: ChordQualityId, window: PitchWindow): ChordShape[] {
  const quality = getChordDefinition(qualityId)
  const rootMidi = noteNameToMidi(root, 3)
  const requestedIntervals = [...quality.coreIntervals, ...quality.colorIntervals]
  const fullChoices = choosePadCombinations(rootMidi, requestedIntervals, window, 8)

  if (fullChoices[0]?.missing.length === 0) {
    return fullChoices.map((choice, index) => createShapeCandidate('Full', choice.pads, [], [], window, quality.coreIntervals, index))
  }

  const coreChoices = choosePadCombinations(rootMidi, quality.coreIntervals, window, 8)
  if (coreChoices[0]?.missing.length === 0) {
    return coreChoices.map((choice, index) =>
      createShapeCandidate('Strong', choice.pads, [], quality.colorIntervals.map((interval) => makeTone(rootMidi, interval)), window, quality.coreIntervals, index),
    )
  }

  const shellChoices = choosePadCombinations(rootMidi, quality.shellIntervals, window, 8)
  if (shellChoices[0]?.missing.length === 0) {
    const omitted = requestedIntervals.filter((interval) => !quality.shellIntervals.includes(interval)).map((interval) => makeTone(rootMidi, interval))
    return shellChoices.map((choice, index) => createShapeCandidate('Shell', choice.pads, [], omitted, window, quality.coreIntervals, index))
  }

  const fallback = choosePadCombination(rootMidi, quality.coreIntervals, window)
  return [createShapeCandidate('Not playable', fallback.pads, fallback.missing, [], window, quality.coreIntervals, 0)]
}

function createShapeCandidate(
  rank: ChordRank,
  pads: ChordPad[],
  missing: ReturnType<typeof makeTone>[],
  omitted: ReturnType<typeof makeTone>[],
  window: PitchWindow,
  coreIntervals: number[],
  index: number,
): ChordShape {
  const span = pads.length > 1 ? pads[pads.length - 1].midi - pads[0].midi : 16
  const score = RANK_WEIGHT[rank] + pads.length * 10 - span - missing.length * 30 - omitted.length * 12 + scoreCombination(pads) / 2
  const inversion = describeInversion(pads, coreIntervals)
  const id = `${rank}-${index}-${pads.map((pad) => pad.pad).join('-')}-${missing.map((tone) => tone.interval).join('-')}`

  return {
    id,
    rank,
    inversion,
    score,
    pads,
    missing,
    omitted,
    window,
  }
}

function choosePadCombination(
  rootMidi: number,
  intervals: number[],
  window: PitchWindow,
): { pads: ChordPad[]; missing: ReturnType<typeof makeTone>[] } {
  return choosePadCombinations(rootMidi, intervals, window, 1)[0] ?? { pads: [], missing: intervals.map((interval) => makeTone(rootMidi, interval)) }
}

function choosePadCombinations(
  rootMidi: number,
  intervals: number[],
  window: PitchWindow,
  limit: number,
): { pads: ChordPad[]; missing: ReturnType<typeof makeTone>[] }[] {
  const missing: ReturnType<typeof makeTone>[] = []
  const optionGroups = intervals.map((interval) => {
    const options = findPitchClassOptions(rootMidi + interval, window).map((midi) => ({
      pad: midiToPad(window, midi) as PadNumber,
      midi,
      noteName: midiToNoteName(midi),
      interval,
    }))

    if (options.length === 0) {
      missing.push(makeTone(rootMidi, interval))
    }

    return options
  })

  const availableGroups = optionGroups.filter((group) => group.length > 0)
  if (availableGroups.length === 0) {
    return [{ pads: [], missing }]
  }

  const combinations = availableGroups.reduce(
    (accumulator, group) =>
      accumulator.flatMap((combo) =>
        group
          .filter((candidate) => !combo.some((pad) => pad.midi === candidate.midi))
          .map((candidate) => [...combo, candidate]),
      ),
    [[]] as ChordPad[][],
  )

  const best = combinations
    .filter((combo) => combo.length === availableGroups.length)
    .map((combo) => combo.sort((a, b) => a.midi - b.midi))
    .sort((a, b) => scoreCombination(b) - scoreCombination(a))
    .slice(0, limit)

  return best.map((pads) => ({ pads, missing }))
}

function findPitchClassOptions(targetMidi: number, window: PitchWindow): number[] {
  const targetClass = positiveMod(targetMidi, 12)
  const options: number[] = []

  for (let midi = window.minMidi; midi <= window.maxMidi; midi += 1) {
    if (positiveMod(midi, 12) === targetClass) {
      options.push(midi)
    }
  }

  return options
}

function findRetuneSuggestions(
  root: string,
  qualityId: ChordQualityId,
  sampleRootMidi: number,
  originalPitchPad: PadNumber,
): RetuneSuggestion[] {
  const suggestions = Array.from({ length: 25 }, (_, index) => index - 12)
    .filter((shift) => shift !== 0)
    .map((shift) => {
      const shape = buildShape(root, qualityId, createPitchWindow(sampleRootMidi + shift, originalPitchPad))
      return {
        semitones: shift,
        label: shift > 0 ? `Tune sample +${shift}` : `Tune sample ${shift}`,
        rank: shape.rank,
        missingCount: shape.missing.length,
      }
    })
    .filter((suggestion) => suggestion.rank !== 'Not playable')
    .sort((a, b) => RANK_WEIGHT[b.rank] - RANK_WEIGHT[a.rank] || Math.abs(a.semitones) - Math.abs(b.semitones))

  return suggestions.slice(0, 4)
}

function findOriginalPadSuggestions(root: string, qualityId: ChordQualityId, sampleRootMidi: number): OriginalPadSuggestion[] {
  return PAD_NUMBERS.map((pad) => {
    const shape = buildShape(root, qualityId, createPitchWindow(sampleRootMidi, pad))
    return {
      pad,
      rank: shape.rank,
      score: shape.score,
      missingCount: shape.missing.length,
    }
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
}

function findPadRetunePlans(root: string, qualityId: ChordQualityId, window: PitchWindow): PadRetunePlan[] {
  const quality = getChordDefinition(qualityId)
  const rootMidi = noteNameToMidi(root, 3)
  const requestedIntervals = [...quality.coreIntervals, ...quality.colorIntervals]
  const plans = requestedIntervals.flatMap((interval) => {
    const targetMidi = rootMidi + interval
    const inWindowPad = midiToPad(window, targetMidi)
    const needsOctaveEscape = inWindowPad === null || interval >= 17

    if (!needsOctaveEscape) {
      return []
    }

    return findPitchClassOptions(targetMidi, window)
      .map((baseMidi) => ({
        baseMidi,
        semitones: targetMidi - baseMidi,
      }))
      .filter((plan) => plan.semitones !== 0 && Math.abs(plan.semitones) <= 24)
      .map((plan) => {
        const pad = midiToPad(window, plan.baseMidi)
        if (pad === null) {
          return null
        }

        const intervalLabel = INTERVAL_LABELS[interval] ?? `${interval}st`
        const direction = plan.semitones > 0 ? '+' : ''

        return {
          id: `${pad}-${targetMidi}-${plan.semitones}`,
          pad,
          baseMidi: plan.baseMidi,
          targetMidi,
          noteName: midiToNoteWithOctave(targetMidi),
          intervalLabel,
          semitones: plan.semitones,
          reason: `Set Pad ${pad} tune ${direction}${plan.semitones} to reach the ${intervalLabel}`,
        } satisfies PadRetunePlan
      })
      .filter((plan): plan is PadRetunePlan => plan !== null)
  })

  return plans
    .filter((plan, index, all) => index === all.findIndex((other) => other.id === plan.id))
    .sort((a, b) => Math.abs(a.semitones) - Math.abs(b.semitones) || a.pad - b.pad)
    .slice(0, 6)
}

function makeTone(rootMidi: number, interval: number) {
  const midi = rootMidi + interval
  return {
    interval,
    label: INTERVAL_LABELS[interval] ?? `${interval}st`,
    midi,
    noteName: midiToNoteName(midi),
  }
}

function describeInversion(pads: ChordPad[], coreIntervals: number[]): string {
  if (pads.length === 0) return 'No playable shape'
  const bass = pads[0]
  const normalized = positiveMod(bass.interval, 12)
  const rootInterval = positiveMod(coreIntervals[0], 12)
  const thirdInterval = positiveMod(coreIntervals[1] ?? 4, 12)
  const fifthInterval = positiveMod(coreIntervals[2] ?? 7, 12)

  if (normalized === rootInterval) return 'Root position'
  if (normalized === thirdInterval) return 'First inversion'
  if (normalized === fifthInterval) return 'Second inversion'
  return `${INTERVAL_LABELS[bass.interval] ?? 'Color'} in bass`
}

function positiveMod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor
}

function scoreCombination(combo: ChordPad[]): number {
  const sorted = combo.sort((a, b) => a.midi - b.midi)
  const bass = positiveMod(sorted[0]?.interval ?? 99, 12)
  const span = sorted.length > 1 ? sorted[sorted.length - 1].midi - sorted[0].midi : 16
  const bassScore = bass === 0 ? 90 : bass === 3 || bass === 4 ? 62 : bass === 7 ? 46 : bass === 10 || bass === 11 ? 32 : -80
  const highestCore = Math.max(...sorted.filter((pad) => pad.interval < 12).map((pad) => pad.midi))
  const colorBelowCorePenalty = sorted.filter((pad) => pad.interval >= 12 && pad.midi < highestCore).length * 70
  const topColorBonus = sorted.some((pad, index) => index > 0 && pad.interval >= 12) ? 12 : 0
  return bassScore + topColorBonus + sorted.length * 10 - span * 2 - colorBelowCorePenalty
}
