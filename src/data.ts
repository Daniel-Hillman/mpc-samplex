import { createDefaultPadMap, createTemplatePattern, noteNameToMidi } from './lib/music'
import type { ChordProgression, StudioProject } from './types'

export const DEFAULT_PROGRESSION: ChordProgression = {
  id: 'progression-chord-sketch',
  name: 'Chord sketch',
  steps: [],
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
        originalPitchPad: 4,
        targetKey: 'C minor',
      },
    ],
    updatedAt: now,
  }
}

export const DEFAULT_PAD_MAP = createDefaultPadMap()
