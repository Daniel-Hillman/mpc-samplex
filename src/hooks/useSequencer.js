import { useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { useGrooveStore } from '../store/grooveStore';
import { useMidiStore } from '../store/midiStore';
import { sendNote, allNotesOff } from '../lib/midi';
import { clockSender } from '../lib/midiClock';
import { TICKS_PER_BAR } from '../lib/constants';

/**
 * Drives the groove from a single fixed-resolution clock: one bar = TICKS_PER_BAR
 * ticks, and every row's notes are stored at absolute ticks. Because the engine
 * always runs at the finest tick, straight and triplet grids play from the same
 * data and switching the on-screen grid never changes what's heard.
 */
export function useSequencer() {
  const seqRef = useRef(null);

  const bpm = useGrooveStore((s) => s.bpm);
  const swing = useGrooveStore((s) => s.swing);
  const isPlaying = useGrooveStore((s) => s.isPlaying);

  // Build the tick sequence once — it never needs rebuilding for resolution
  // changes now, since resolution is purely a view concern.
  useEffect(() => {
    const seq = new Tone.Sequence(
      (time, tick) => {
        const state = useGrooveStore.getState();
        const anySolo = state.rows.some((r) => r.soloed);
        state.rows.forEach((row) => {
          const audible = anySolo ? row.soloed : !row.muted;
          if (!audible) return;
          const velocity = row.notes[tick];
          if (velocity != null) sendNote(row.midiNote, velocity, 60);
        });
        Tone.Draw.schedule(() => {
          useGrooveStore.getState().setCurrentTick(tick);
        }, time);
        // One-shot mode: stop after the final tick of the bar
        if (!state.loopEnabled && tick === TICKS_PER_BAR - 1) {
          Tone.Transport.scheduleOnce(() => {
            useGrooveStore.getState().setIsPlaying(false);
          }, `+${Tone.Time('96n').toSeconds() * 0.9}`);
        }
      },
      [...Array(TICKS_PER_BAR).keys()],
      '96n' // 96 subdivisions per bar
    );
    seq.start(0);
    seqRef.current = seq;
    return () => {
      seq.dispose();
      seqRef.current = null;
    };
  }, []);

  // Sync BPM
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  // Sync swing — applied to the 16th-note feel (straight grooves)
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
    store.setCurrentTick(-1);
  }, []);

  const reset = useCallback(() => {
    Tone.Transport.position = 0;
    useGrooveStore.getState().setCurrentTick(-1);
  }, []);

  return { play, stop, reset };
}
