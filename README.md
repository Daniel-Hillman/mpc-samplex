# MPC Studio

Touch-first React/Vite PWA companion for the Akai MPC Sample.

## What is built

- Browser audio first, Web MIDI second.
- Smart 16 Levels chord finder that respects the 16-pad semitone window.
- Pad-level octave escape suggestions for MPC semitone retune workarounds.
- Chord builder, in-key palette, progression lane, groove sequencer, Beam to MPC flow, local library import/export.
- PWA-ready static deployment for GitHub Pages.

## Commands

```bash
npm install
npm run dev
npm run build
npm test
```

## Hardware notes

The MPC Sample cannot import MIDI or pattern files directly. The main transfer flow is live Web MIDI into the MPC followed by `SHIFT + SEQ REC (RECALL)` on the hardware.
