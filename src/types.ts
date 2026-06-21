import type { ScaleType } from './lib/music'

export type Bank = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H'

export type PadNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16

export type ChordRank = 'Full' | 'Strong' | 'Shell' | 'Not playable'

export type ChordQualityId =
  | 'maj'
  | 'min'
  | 'dom7'
  | 'min7'
  | 'maj7'
  | 'dim'
  | 'sus2'
  | 'sus4'
  | 'min9'
  | 'dom9'
  | 'maj9'
  | 'min11'
  | 'dom13'

export interface PadMap {
  id: string
  name: string
  bank: Bank
  notesByPad: Record<PadNumber, number>
  createdAt: string
  updatedAt: string
}

export interface ChordDefinition {
  id: ChordQualityId
  label: string
  symbol: string
  coreIntervals: number[]
  colorIntervals: number[]
  shellIntervals: number[]
}

export interface ChordTone {
  interval: number
  label: string
  midi: number
  noteName: string
}

export interface ChordPad {
  pad: PadNumber
  midi: number
  noteName: string
  interval: number
}

export interface ChordShape {
  id: string
  rank: ChordRank
  inversion: string
  score: number
  pads: ChordPad[]
  missing: ChordTone[]
  omitted: ChordTone[]
  window: PitchWindow
}

export interface RetuneSuggestion {
  semitones: number
  label: string
  rank: ChordRank
  missingCount: number
}

export interface PadRetunePlan {
  id: string
  pad: PadNumber
  baseMidi: number
  targetMidi: number
  noteName: string
  intervalLabel: string
  semitones: number
  reason: string
}

export interface OriginalPadSuggestion {
  pad: PadNumber
  rank: ChordRank
  score: number
  missingCount: number
}

export interface PitchWindow {
  minMidi: number
  maxMidi: number
  sampleRootMidi: number
  originalPitchPad: PadNumber
}

export interface SixteenLevelsSetup {
  sampleRootMidi: number
  originalPitchPad: PadNumber
  targetKey: string
}

export interface SixteenLevelsAnalysis {
  window: PitchWindow
  shapes: ChordShape[]
  retuneSuggestions: RetuneSuggestion[]
  padRetunePlans: PadRetunePlan[]
  originalPadSuggestions: OriginalPadSuggestion[]
}

export interface TimelineEvent {
  id: string
  tick: number
  durationTicks: number
  midiNote: number
  velocity: number
  laneId: string
  microshiftTicks?: number
  ratchet?: number
}

export interface Pattern {
  id: string
  name: string
  bars: number
  events: TimelineEvent[]
}

export interface ChordStep {
  id: string
  root: string
  quality: ChordQualityId
  durationTicks: number
}

export interface ChordProgression {
  id: string
  name: string
  steps: ChordStep[]
}

export type NextChordCategory = 'Safe' | 'Moodier' | 'Tension'

export interface ChordDegree {
  index: number
  number: string
  numeral: string
  use: string
}

export interface NextChordSuggestion {
  id: string
  category: NextChordCategory
  degree: ChordDegree
  root: string
  quality: ChordQualityId
  label: string
  reason: string
}

export type MelodyPadRole = 'home' | 'strong' | 'safe' | 'passing' | 'tension'

export interface MelodyPad {
  pad: PadNumber
  midi: number
  noteName: string
  role: MelodyPadRole
  reason: string
}

export interface BassRecipe {
  id: string
  label: string
  pads: PadNumber[]
  instruction: string
  status: 'ready' | 'retune' | 'missing'
}

export interface ProgressionPlaybookStep {
  id: string
  chordName: string
  chordPads: PadNumber[]
  bass: BassRecipe
  melodyPads: MelodyPad[]
}

export type InstrumentPreset = 'warmKeys' | 'lushPad' | 'dustyEp' | 'softPluck' | 'deepBass' | 'cleanSine'
export type AudioFeel = 'tight' | 'natural' | 'loose'

export interface StudioProject {
  schemaVersion: 1
  id: string
  name: string
  tempo: number
  swing: number
  padMapId: string
  patterns: Pattern[]
  progressions: ChordProgression[]
  sixteenLevelsSetups: SixteenLevelsSetup[]
  updatedAt: string
}

export interface AppSettings {
  id: 'settings'
  previewEnabled: boolean
  lastPadMapId: string
  instrumentPreset: InstrumentPreset
  audioFeel: AudioFeel
  keyRoot: string
  scaleType: ScaleType
  updatedAt: string
}
