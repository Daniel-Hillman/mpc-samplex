import { BAR_TICKS, createDefaultPadMap, createTemplatePattern, noteNameToMidi } from './lib/music'
import type { ChordProgression, StudioProject } from './types'

export const DEFAULT_PROGRESSION: ChordProgression = {
  id: 'progression-velvet-loop',
  name: 'Velvet loop',
  steps: [
    { id: 'step-1', root: 'C', quality: 'min9', durationTicks: BAR_TICKS },
    { id: 'step-2', root: 'F', quality: 'min7', durationTicks: BAR_TICKS },
    { id: 'step-3', root: 'Bb', quality: 'dom9', durationTicks: BAR_TICKS },
    { id: 'step-4', root: 'Eb', quality: 'maj7', durationTicks: BAR_TICKS },
  ],
}

export function createInitialProject(): StudioProject {
  const now = new Date().toISOString()

  return {
    schemaVersion: 1,
    id: 'local-main',
    name: 'Sofa sketches',
    tempo: 92,
    swing: 56,
    padMapId: 'factory-chromatic',
    patterns: [createTemplatePattern('boom-bap')],
    progressions: [DEFAULT_PROGRESSION],
    sixteenLevelsSetups: [
      {
        sampleRootMidi: noteNameToMidi('C', 3),
        originalPitchPad: 1,
        targetKey: 'C minor',
      },
    ],
    updatedAt: now,
  }
}

export const DEFAULT_PAD_MAP = createDefaultPadMap()
