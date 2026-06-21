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
      updatedAt: new Date().toISOString(),
    })
  }
}

export async function saveProject(project: StudioProject) {
  await db.projects.put({ ...project, updatedAt: new Date().toISOString() })
}

export async function exportProjectsJson(): Promise<string> {
  await ensureDefaultRecords()
  const [projects, padMaps, settings] = await Promise.all([db.projects.toArray(), db.padMaps.toArray(), db.settings.toArray()])
  return JSON.stringify({ schemaVersion: 1, projects, padMaps, settings }, null, 2)
}

export async function importProjectsJson(json: string) {
  const payload = JSON.parse(json) as {
    projects?: StudioProject[]
    padMaps?: PadMap[]
    settings?: AppSettings[]
  }

  await db.transaction('rw', db.projects, db.padMaps, db.settings, async () => {
    if (Array.isArray(payload.projects)) {
      await db.projects.bulkPut(payload.projects)
    }
    if (Array.isArray(payload.padMaps)) {
      await db.padMaps.bulkPut(payload.padMaps)
    }
    if (Array.isArray(payload.settings)) {
      await db.settings.bulkPut(payload.settings)
    }
  })
}
