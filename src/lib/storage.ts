import Dexie, { type Table } from 'dexie'
import type { AppSettings, PadMap, StudioProject } from '../types'
import { createDefaultPadMap } from './music'

class MPCSamplexDatabase extends Dexie {
  projects!: Table<StudioProject, string>
  padMaps!: Table<PadMap, string>
  settings!: Table<AppSettings, string>

  constructor() {
    super('mpc-samplex')
    this.version(1).stores({
      projects: 'id, updatedAt',
      padMaps: 'id, updatedAt',
      settings: 'id, updatedAt',
    })
  }
}

export const db = new MPCSamplexDatabase()

export async function ensureDefaultRecords() {
  const padMap = await db.padMaps.get('factory-chromatic')
  if (!padMap) {
    await db.padMaps.put(createDefaultPadMap())
  }

  const settings = await db.settings.get('settings')
  if (!settings) {
    await db.settings.put({
      id: 'settings',
      previewEnabled: true,
      lastPadMapId: 'factory-chromatic',
      instrumentPreset: 'warmKeys',
      audioFeel: 'natural',
      keyRoot: 'C',
      scaleType: 'minor',
      updatedAt: new Date().toISOString(),
    })
  } else if (!settings.instrumentPreset || !settings.audioFeel || !settings.keyRoot || !settings.scaleType) {
    await db.settings.put({
      ...settings,
      instrumentPreset: settings.instrumentPreset ?? 'warmKeys',
      audioFeel: settings.audioFeel ?? 'natural',
      keyRoot: settings.keyRoot ?? 'C',
      scaleType: settings.scaleType ?? 'minor',
      updatedAt: new Date().toISOString(),
    })
  }
}

export async function saveProject(project: StudioProject) {
  await db.projects.put({ ...project, updatedAt: new Date().toISOString() })
}

export async function saveSettings(settings: AppSettings) {
  await db.settings.put({ ...settings, updatedAt: new Date().toISOString() })
}
