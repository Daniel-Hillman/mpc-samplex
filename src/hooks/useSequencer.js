import { useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { useGrooveStore } from '../store/grooveStore';
import { useMidiStore } from '../store/midiStore';
import { sendNote, allNotesOff } from '../lib/midi';
import { clockSender } from '../lib/midiClock';
import { STEP_COUNT } from '../lib/constants';

/**
 * Drives the 16-step groove via Tone.Transport. One Tone.Sequence lives for
 * the lifetime of the hook; row/step data is read from the store inside the
 * tick callback so edits apply live without rebuilding the sequence.
 */
export function useSequencer() {
  const seqRef = useRef(null);

  const bpm = useGrooveStore((s) => s.bpm);
  const swing = useGrooveStore((s) => s.swing);
  const resolution = useGrooveStore((s) => s.resolution);
  const isPlaying = useGrooveStore((s) => s.isPlaying);

  // Build the sequence; rebuilt when resolution changes (subdivision is read-only on Tone.Sequence)
  useEffect(() => {
    const seq = new Tone.Sequence(
      (time, step) => {
        const state = useGrooveStore.getState();
        const anySolo = state.rows.some((r) => r.soloed);
        state.rows.forEach((row) => {
          const audible = anySolo ? row.soloed : !row.muted;
          if (!audible) return;
          const cell = row.steps[step];
          if (cell && cell.active) {
            sendNote(row.midiNote, cell.velocity, 60);
          }
        });
        Tone.Draw.schedule(() => {
          useGrooveStore.getState().setCurrentStep(step);
        }, time);
        // One-shot mode: stop after the last step
        if (!state.loopEnabled && step === STEP_COUNT - 1) {
          Tone.Transport.scheduleOnce(() => {
            useGrooveStore.getState().setIsPlaying(false);
          }, `+${Tone.Time(state.resolution === '1/8' ? '8n' : '16n').toSeconds() * 0.9}`);
        }
      },
      [...Array(STEP_COUNT).keys()],
      resolution === '1/8' ? '8n' : '16n'
    );
    seq.start(0);
    seqRef.current = seq;
    return () => {
      seq.dispose();
      seqRef.current = null;
    };
  }, [resolution]);

  // Sync BPM
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  // Sync swing — Tone applies it to every other subdivision
  useEffect(() => {
    Tone.Transport.swing = swing / 100;
    Tone.Transport.swingSubdivision = '16n';
  }, [swing]);

  // Start/stop transport when isPlaying flips; mirror to MIDI clock when sending
  useEffect(() => {
    const clockSending = useMidiStore.getState().clockMode === 'send';
    if (isPlaying) {
      Tone.start().then(() => {
        Tone.Transport.start();
      });
      if (clockSending) clockSender.start();
    } else {
      Tone.Transport.stop();
      Tone.Transport.position = 0;
      allNotesOff();
      if (clockSending) clockSender.stop();
    }
  }, [isPlaying]);

  const play = useCallback(() => {
    useGrooveStore.getState().setIsPlaying(true);
  }, []);

  const stop = useCallback(() => {
    const store = useGrooveStore.getState();
    store.setIsPlaying(false);
    store.setCurrentStep(-1);
  }, []);

  const reset = useCallback(() => {
    Tone.Transport.position = 0;
    useGrooveStore.getState().setCurrentStep(-1);
  }, []);

  return { play, stop, reset };
}
