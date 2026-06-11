import { WebMidi } from 'webmidi';
import { useMidiStore } from '../store/midiStore';
import { useGrooveStore } from '../store/grooveStore';
import { getSelectedOutput } from './midi';

// MIDI beat clock = 24 ticks per quarter note, scheduled ahead of time with
// Web MIDI timestamps so main-thread jitter never reaches the wire.
const LOOKAHEAD_MS = 160;
const SCHEDULER_INTERVAL_MS = 50;

class ClockSender {
  constructor() {
    this.timer = null;
    this.nextTickAt = 0;
    this.bpm = 90;
    this.transportRunning = false;
  }

  get tickMs() {
    return 60000 / this.bpm / 24;
  }

  begin(bpm) {
    this.bpm = bpm;
    if (this.timer) return;
    this.nextTickAt = performance.now() + 20;
    this.timer = setInterval(() => this.schedule(), SCHEDULER_INTERVAL_MS);
    this.schedule();
  }

  schedule() {
    const out = getSelectedOutput();
    if (!out) return;
    const horizon = performance.now() + LOOKAHEAD_MS;
    while (this.nextTickAt < horizon) {
      try {
        out.sendClock({ time: this.nextTickAt });
      } catch {
        /* device vanished mid-schedule */
      }
      this.nextTickAt += this.tickMs;
    }
  }

  setBpm(bpm) {
    this.bpm = bpm;
  }

  // Transport messages ride on top of the continuous tick stream
  start() {
    const out = getSelectedOutput();
    try {
      out?.sendStart();
    } catch {
      /* no-op */
    }
    this.transportRunning = true;
  }

  stop() {
    const out = getSelectedOutput();
    try {
      out?.sendStop();
    } catch {
      /* no-op */
    }
    this.transportRunning = false;
  }

  end() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.transportRunning) this.stop();
  }

  get active() {
    return this.timer !== null;
  }
}

class ClockReceiver {
  constructor() {
    this.input = null;
    this.lastTickTime = 0;
    this.intervals = [];
    this.handlers = {};
  }

  attach(inputId, { onBpm, onStart, onStop }) {
    this.detach();
    const input = WebMidi.inputs.find((i) => i.id === inputId);
    if (!input) return false;
    this.input = input;
    this.lastTickTime = 0;
    this.intervals = [];

    this.handlers.clock = (e) => {
      const t = e.timestamp;
      if (this.lastTickTime) {
        const dt = t - this.lastTickTime;
        // Sanity window: 12.5–500 BPM
        if (dt > 5 && dt < 200) {
          this.intervals.push(dt);
          if (this.intervals.length > 48) this.intervals.shift();
          // Report twice a beat once we have half a beat of data
          if (this.intervals.length >= 12 && this.intervals.length % 12 === 0) {
            const avg = this.intervals.reduce((a, b) => a + b, 0) / this.intervals.length;
            onBpm?.(60000 / (avg * 24));
          }
        }
      }
      this.lastTickTime = t;
    };
    this.handlers.start = () => onStart?.();
    this.handlers.continue = () => onStart?.();
    this.handlers.stop = () => onStop?.();

    input.addListener('clock', this.handlers.clock);
    input.addListener('start', this.handlers.start);
    input.addListener('continue', this.handlers.continue);
    input.addListener('stop', this.handlers.stop);
    return true;
  }

  detach() {
    if (this.input) {
      try {
        this.input.removeListener('clock', this.handlers.clock);
        this.input.removeListener('start', this.handlers.start);
        this.input.removeListener('continue', this.handlers.continue);
        this.input.removeListener('stop', this.handlers.stop);
      } catch {
        /* input already gone */
      }
    }
    this.input = null;
    this.lastTickTime = 0;
    this.intervals = [];
  }
}

export const clockSender = new ClockSender();
export const clockReceiver = new ClockReceiver();

/**
 * Switch global clock mode: 'off' | 'send' | 'receive'.
 * Send: app is the tempo master — MPC (MIDI Sync In: Midi Clock) follows.
 * Receive: app follows the MPC's clock (MIDI Sync Out: Midi Clock).
 */
export function setClockMode(mode, inputId = null) {
  const midi = useMidiStore.getState();
  const groove = useGrooveStore.getState();

  // Tear down whatever is running
  clockSender.end();
  clockReceiver.detach();
  midi.setExternalBpm(null);

  if (mode === 'send') {
    clockSender.begin(groove.bpm);
    if (groove.isPlaying) clockSender.start();
  } else if (mode === 'receive') {
    const ok = clockReceiver.attach(inputId ?? midi.clockInputId, {
      onBpm: (bpm) => {
        const rounded = Math.round(bpm * 10) / 10;
        useMidiStore.getState().setExternalBpm(rounded);
        useGrooveStore.getState().setBpm(Math.round(bpm));
      },
      onStart: () => useGrooveStore.getState().setIsPlaying(true),
      onStop: () => useGrooveStore.getState().setIsPlaying(false),
    });
    if (!ok) {
      midi.setClockMode('off');
      return false;
    }
  }
  midi.setClockMode(mode);
  if (inputId) midi.setClockInputId(inputId);
  return true;
}

// Keep the sender's tempo glued to the global BPM
useGrooveStore.subscribe((state, prev) => {
  if (state.bpm !== prev.bpm && clockSender.active) {
    clockSender.setBpm(state.bpm);
  }
});
