import { useCallback } from 'react';
import { useChordStore } from '../store/chordStore';
import { useMidi } from './useMidi';
import { auditionNotes } from '../lib/audioPreview';

/**
 * Unified note audition: sends to the MPC over MIDI when an output is
 * selected, and plays the browser synth when preview sound is on.
 * Returns true if anything made a sound.
 */
export function useAudition() {
  const previewSound = useChordStore((s) => s.previewSound);
  const setPreviewSound = useChordStore((s) => s.setPreviewSound);
  const { sendChord, sendStrum, hasOutput } = useMidi();

  const playNotes = useCallback(
    (notes, durationMs = 700, velocity = 100, strumMs = 0, direction = 'up') => {
      if (!notes?.length) return false;
      let sounded = false;
      if (hasOutput) {
        sounded =
          strumMs > 0
            ? sendStrum(notes, velocity, durationMs, strumMs, direction)
            : sendChord(notes, velocity, durationMs);
      }
      if (previewSound) {
        auditionNotes(notes, durationMs, Math.min(1, velocity / 127), strumMs, direction);
        sounded = true;
      }
      return sounded;
    },
    [hasOutput, previewSound, sendChord, sendStrum]
  );

  const playNote = useCallback(
    (note, velocity = 100, durationMs = 250) => playNotes([note], durationMs, velocity),
    [playNotes]
  );

  return { playNotes, playNote, previewSound, setPreviewSound, hasOutput };
}
