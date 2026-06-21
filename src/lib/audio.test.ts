import { describe, expect, it } from 'vitest'
import { humanizeNoteEvents } from './audio'

describe('audio humanization', () => {
  it('keeps tight playback exactly aligned and even', () => {
    const events = humanizeNoteEvents([60, 64, 67], 0, 0, 0, 0.7, false)

    expect(events.map((event) => event.timeOffsetMs)).toEqual([0, 0, 0])
    expect(events.every((event) => event.velocity === 0.7)).toBe(true)
  })

  it('keeps natural timing and velocity inside configured ranges', () => {
    const events = humanizeNoteEvents([60, 64, 67], 14, 0.08, 24, 0.7, false)

    events.forEach((event, index) => {
      expect(event.timeOffsetMs).toBeGreaterThanOrEqual(-14)
      expect(event.timeOffsetMs).toBeLessThanOrEqual(index * 24 + 14)
      expect(event.velocity).toBeGreaterThanOrEqual(0.7 * 0.92)
      expect(event.velocity).toBeLessThanOrEqual(0.7 * 1.08)
    })
  })
})
