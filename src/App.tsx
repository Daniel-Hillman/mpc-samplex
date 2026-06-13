import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Cable,
  Download,
  Info,
  Library,
  Music,
  Play,
  Radio,
  Save,
  SlidersHorizontal,
  Square,
  Trash2,
  Upload,
  Usb,
  Volume2,
} from 'lucide-react'
import './App.css'
import { createInitialProject } from './data'
import type { StudioAudio } from './lib/audio'
import {
  BAR_TICKS,
  CHORD_DEFINITIONS,
  PAD_NUMBERS,
  ROOT_NOTES,
  analyzeSixteenLevelsChord,
  createPitchWindow,
  createTemplatePattern,
  describeChord,
  getDiatonicChords,
  gridSteps,
  midiToNoteName,
  midiToNoteWithOctave,
  noteNameToMidi,
  padToMidi,
  rankLabel,
  toggleGridEvent,
} from './lib/music'
import {
  beamPattern,
  downloadMidiFile,
  isSecureMidiContext,
  isWebMidiAvailable,
  requestMidiOutputs,
  sendMidiChord,
  sendMidiNote,
} from './lib/midi'
import type { ChordQualityId, ChordShape, ChordStep, MidiOutputDevice, PadNumber, Pattern, StudioProject } from './types'

type ViewId = 'studio' | 'chords' | 'levels' | 'groove' | 'bridge' | 'library'

const VIEW_ITEMS: { id: ViewId; label: string; icon: typeof Music }[] = [
  { id: 'studio', label: 'Studio', icon: Music },
  { id: 'chords', label: 'Chords', icon: SlidersHorizontal },
  { id: 'levels', label: '16 Levels', icon: Square },
  { id: 'groove', label: 'Groove', icon: Play },
  { id: 'bridge', label: 'Bridge', icon: Cable },
  { id: 'library', label: 'Library', icon: Library },
]

const GROOVE_LANES = [
  { id: 'kick', label: 'Kick', midiNote: 36 },
  { id: 'snare', label: 'Snare', midiNote: 38 },
  { id: 'hat', label: 'Hat', midiNote: 42 },
  { id: 'ghost', label: 'Ghost', midiNote: 39 },
]

const QUALITY_OPTIONS = CHORD_DEFINITIONS.map((definition) => ({
  value: definition.id,
  label: definition.label,
}))

function App() {
  const [activeView, setActiveView] = useState<ViewId>('studio')
  const [project, setProject] = useState<StudioProject>(() => createInitialProject())
  const [chordRoot, setChordRoot] = useState('C')
  const [chordQuality, setChordQuality] = useState<ChordQualityId>('min9')
  const [keyRoot, setKeyRoot] = useState('C')
  const [scaleType, setScaleType] = useState<'major' | 'minor'>('minor')
  const [sampleRootMidi, setSampleRootMidi] = useState(noteNameToMidi('C', 3))
  const [originalPad, setOriginalPad] = useState<PadNumber>(1)
  const [gridResolution, setGridResolution] = useState(16)
  const [previewEnabled, setPreviewEnabled] = useState(true)
  const [midiEnabled, setMidiEnabled] = useState(false)
  const [midiChannel, setMidiChannel] = useState(1)
  const [audioReady, setAudioReady] = useState(false)
  const [midiOutputs, setMidiOutputs] = useState<MidiOutputDevice[]>([])
  const [selectedOutputId, setSelectedOutputId] = useState('')
  const [midiMessage, setMidiMessage] = useState('No MIDI device selected')
  const [probeNote, setProbeNote] = useState(36)
  const [probePad, setProbePad] = useState<PadNumber>(1)
  const [calibratedPads, setCalibratedPads] = useState<Partial<Record<PadNumber, number>>>({})
  const [beamStage, setBeamStage] = useState<'ready' | 'count-in' | 'playing' | 'recall'>('ready')
  const [savedMessage, setSavedMessage] = useState('Local project ready')
  const audioRef = useRef<StudioAudio | null>(null)

  const pattern = project.patterns[0]
  const progression = project.progressions[0]
  const selectedOutput = midiOutputs.find((output) => output.id === selectedOutputId) ?? null
  const analysis = useMemo(
    () => analyzeSixteenLevelsChord(chordRoot, chordQuality, sampleRootMidi, originalPad),
    [chordRoot, chordQuality, sampleRootMidi, originalPad],
  )
  const selectedShape = analysis.shapes[0]
  const diatonicChords = useMemo(() => getDiatonicChords(keyRoot, scaleType), [keyRoot, scaleType])
  const progressionShapes = useMemo(
    () =>
      progression.steps.map((step) => ({
        step,
        shape: analyzeSixteenLevelsChord(step.root, step.quality, sampleRootMidi, originalPad).shapes[0],
      })),
    [originalPad, progression.steps, sampleRootMidi],
  )
  const pitchWindow = useMemo(() => createPitchWindow(sampleRootMidi, originalPad), [sampleRootMidi, originalPad])

  useEffect(() => {
    let alive = true
    const storageTimer = window.setTimeout(() => {
      import('./lib/storage')
        .then(({ db, ensureDefaultRecords }) => ensureDefaultRecords().then(() => db.projects.get('local-main')))
        .then((storedProject) => {
          if (alive && storedProject) {
            setProject(storedProject)
            const setup = storedProject.sixteenLevelsSetups[0]
            setSampleRootMidi(setup.sampleRootMidi)
            setOriginalPad(setup.originalPitchPad)
          }
        })
        .catch(() => setSavedMessage('Storage is unavailable in this browser'))
    }, 0)

    const audioWarmTimer = window.setTimeout(() => {
      void import('./lib/audio')
    }, 250)

    window.__MPC_STUDIO_READY__ = true
    return () => {
      alive = false
      window.clearTimeout(storageTimer)
      window.clearTimeout(audioWarmTimer)
    }
  }, [])

  async function ensureAudio() {
    if (!audioRef.current) {
      const { createStudioAudio } = await import('./lib/audio')
      audioRef.current = createStudioAudio()
    }

    await audioRef.current.start()
    setAudioReady(true)
    return audioRef.current
  }

  async function auditionShape(shape: ChordShape, strumMs = 0) {
    const notes = shape.pads.map((pad) => pad.midi)
    if (notes.length === 0) {
      return
    }

    if (previewEnabled) {
      const audio = await ensureAudio()
      audio.playMidiNotes(notes, '2n', 0.78, strumMs)
    }

    if (midiEnabled) {
      sendMidiChord(selectedOutput, midiChannel, notes, 98, 720, strumMs)
    }
  }

  async function playSinglePad(pad: PadNumber) {
    const midi = padToMidi(sampleRootMidi, originalPad, pad)
    if (previewEnabled) {
      const audio = await ensureAudio()
      audio.playMidiNotes([midi], '8n', 0.72)
    }
    if (midiEnabled) {
      sendMidiNote(selectedOutput, midiChannel, midi, 92, 220)
    }
  }

  async function playPattern() {
    if (previewEnabled) {
      const audio = await ensureAudio()
      audio.playPattern(pattern, project.tempo)
    }
    if (midiEnabled) {
      beamPattern(selectedOutput, midiChannel, pattern, project.tempo)
    }
  }

  function startBeamWorkflow() {
    const loopMs = Math.max(2200, pattern.bars * BAR_TICKS * (60 / project.tempo / 960) * 1000)
    setBeamStage('count-in')
    window.setTimeout(() => {
      setBeamStage('playing')
      beamPattern(selectedOutput, midiChannel, pattern, project.tempo)
    }, 900)
    window.setTimeout(() => setBeamStage('recall'), 900 + loopMs)
    window.setTimeout(() => setBeamStage('ready'), 6200 + loopMs)
  }

  async function connectMidi() {
    if (!isSecureMidiContext()) {
      setMidiMessage('MIDI needs HTTPS or localhost')
      return
    }

    if (!isWebMidiAvailable()) {
      setMidiMessage('Web MIDI is not available here')
      return
    }

    try {
      const outputs = await requestMidiOutputs()
      setMidiOutputs(outputs)
      setSelectedOutputId(outputs[0]?.id ?? '')
      setMidiMessage(outputs.length > 0 ? `${outputs.length} MIDI output${outputs.length === 1 ? '' : 's'} found` : 'No MIDI outputs found')
    } catch {
      setMidiMessage('MIDI permission was blocked')
    }
  }

  function updatePattern(nextPattern: Pattern) {
    setProject((current) => ({
      ...current,
      patterns: [nextPattern],
      updatedAt: new Date().toISOString(),
    }))
  }

  function addChordToProgression(root: string, quality: ChordQualityId) {
    setProject((current) => {
      const nextProgression = {
        ...current.progressions[0],
        steps: [
          ...current.progressions[0].steps,
          {
            id: `step-${Date.now()}`,
            root,
            quality,
            durationTicks: BAR_TICKS,
          },
        ],
      }

      return {
        ...current,
        progressions: [nextProgression],
        updatedAt: new Date().toISOString(),
      }
    })
  }

  function updateProgressionSteps(updater: (steps: ChordStep[]) => ChordStep[]) {
    setProject((current) => {
      const currentProgression = current.progressions[0]
      const nextSteps = updater(currentProgression.steps)

      return {
        ...current,
        progressions: [
          {
            ...currentProgression,
            steps: nextSteps,
          },
        ],
        updatedAt: new Date().toISOString(),
      }
    })
  }

  function removeChordFromProgression(stepId: string) {
    updateProgressionSteps((steps) => steps.filter((step) => step.id !== stepId))
  }

  function moveChordInProgression(stepId: string, direction: -1 | 1) {
    updateProgressionSteps((steps) => {
      const currentIndex = steps.findIndex((step) => step.id === stepId)
      const nextIndex = currentIndex + direction
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= steps.length) {
        return steps
      }

      const nextSteps = [...steps]
      const [movedStep] = nextSteps.splice(currentIndex, 1)
      nextSteps.splice(nextIndex, 0, movedStep)
      return nextSteps
    })
  }

  async function saveLocalProject() {
    const { saveProject } = await import('./lib/storage')
    const nextProject = {
      ...project,
      tempo: project.tempo,
      swing: project.swing,
      sixteenLevelsSetups: [{ sampleRootMidi, originalPitchPad: originalPad, targetKey: `${keyRoot} ${scaleType}` }],
      updatedAt: new Date().toISOString(),
    }
    await saveProject(nextProject)
    setProject(nextProject)
    setSavedMessage('Saved locally')
  }

  async function exportLibrary() {
    const { exportProjectsJson } = await import('./lib/storage')
    const json = await exportProjectsJson()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'mpc-studio-library.json'
    anchor.click()
    URL.revokeObjectURL(url)
    setSavedMessage('Library exported')
  }

  async function importLibrary(file: File | undefined) {
    if (!file) {
      return
    }

    const { db, importProjectsJson } = await import('./lib/storage')
    await importProjectsJson(await file.text())
    const restored = await db.projects.get('local-main')
    if (restored) {
      setProject(restored)
    }
    setSavedMessage('Library imported')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark">MPC</div>
          <div>
            <h1>MPC Studio</h1>
            <p>{describeChord(chordRoot, chordQuality)} over {midiToNoteWithOctave(sampleRootMidi)} - {project.tempo} BPM</p>
          </div>
        </div>
        <div className="transport-strip" aria-label="Transport">
          <button type="button" className="icon-button" onClick={() => auditionShape(selectedShape)} title="Play chord">
            <Play size={20} />
          </button>
          <button type="button" className="icon-button" onClick={() => auditionShape(selectedShape, 34)} title="Strum chord">
            <Volume2 size={20} />
          </button>
          <button type="button" className="icon-button accent" onClick={playPattern} title="Play groove">
            <Radio size={20} />
          </button>
        </div>
      </header>

      <nav className="view-tabs" aria-label="Studio sections">
        {VIEW_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <button
              type="button"
              key={item.id}
              className={activeView === item.id ? 'tab-button active' : 'tab-button'}
              onClick={() => setActiveView(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <main>
        {activeView === 'studio' && (
          <StudioView
            audioReady={audioReady}
            selectedShape={selectedShape}
            previewEnabled={previewEnabled}
            midiEnabled={midiEnabled}
            midiMessage={midiMessage}
            pitchWindow={pitchWindow}
            onTogglePreview={() => setPreviewEnabled((value) => !value)}
            onToggleMidi={() => setMidiEnabled((value) => !value)}
            onAudition={() => auditionShape(selectedShape)}
            onPlayPad={playSinglePad}
          />
        )}

        {activeView === 'chords' && (
          <ChordsView
            chordRoot={chordRoot}
            chordQuality={chordQuality}
            keyRoot={keyRoot}
            scaleType={scaleType}
            diatonicChords={diatonicChords}
            progressionShapes={progressionShapes}
            onRootChange={setChordRoot}
            onQualityChange={setChordQuality}
            onKeyRootChange={setKeyRoot}
            onScaleTypeChange={setScaleType}
            onAddChord={addChordToProgression}
            onMoveChord={moveChordInProgression}
            onRemoveChord={removeChordFromProgression}
            onAudition={auditionShape}
          />
        )}

        {activeView === 'levels' && (
          <LevelsView
            chordRoot={chordRoot}
            chordQuality={chordQuality}
            sampleRootMidi={sampleRootMidi}
            originalPad={originalPad}
            analysis={analysis}
            onRootChange={setChordRoot}
            onQualityChange={setChordQuality}
            onSampleRootChange={setSampleRootMidi}
            onOriginalPadChange={setOriginalPad}
            onAudition={auditionShape}
            onPlayPad={playSinglePad}
          />
        )}

        {activeView === 'groove' && (
          <GrooveView
            pattern={pattern}
            tempo={project.tempo}
            swing={project.swing}
            gridResolution={gridResolution}
            onTempoChange={(tempo) => setProject((current) => ({ ...current, tempo }))}
            onSwingChange={(swing) => setProject((current) => ({ ...current, swing }))}
            onGridChange={setGridResolution}
            onPatternChange={updatePattern}
            onPlayPattern={playPattern}
            onExportMidi={() => downloadMidiFile(pattern, project.tempo)}
          />
        )}

        {activeView === 'bridge' && (
          <BridgeView
            midiOutputs={midiOutputs}
            selectedOutputId={selectedOutputId}
            midiMessage={midiMessage}
            midiChannel={midiChannel}
            probeNote={probeNote}
            probePad={probePad}
            selectedOutput={selectedOutput}
            calibratedPads={calibratedPads}
            beamStage={beamStage}
            onConnect={connectMidi}
            onOutputChange={setSelectedOutputId}
            onChannelChange={setMidiChannel}
            onProbeNoteChange={setProbeNote}
            onProbePadChange={setProbePad}
            onProbe={() => sendMidiNote(selectedOutput, midiChannel, probeNote, 110, 180)}
            onSaveProbe={() => setCalibratedPads((current) => ({ ...current, [probePad]: probeNote }))}
            onBeam={startBeamWorkflow}
          />
        )}

        {activeView === 'library' && (
          <LibraryView
            project={project}
            savedMessage={savedMessage}
            onProjectNameChange={(name) => setProject((current) => ({ ...current, name }))}
            onSave={saveLocalProject}
            onExport={exportLibrary}
            onImport={importLibrary}
          />
        )}
      </main>
    </div>
  )
}

interface StudioViewProps {
  audioReady: boolean
  selectedShape: ChordShape
  previewEnabled: boolean
  midiEnabled: boolean
  midiMessage: string
  pitchWindow: ReturnType<typeof createPitchWindow>
  onTogglePreview: () => void
  onToggleMidi: () => void
  onAudition: () => void
  onPlayPad: (pad: PadNumber) => void
}

function StudioView({
  audioReady,
  selectedShape,
  previewEnabled,
  midiEnabled,
  midiMessage,
  pitchWindow,
  onTogglePreview,
  onToggleMidi,
  onAudition,
  onPlayPad,
}: StudioViewProps) {
  return (
    <section className="studio-grid">
      <div className="panel main-surface">
        <PanelHeader kicker="Playable surface" title="Pads, shape, sound" value={rankLabel(selectedShape.rank)} />
        <Guide title="How to use the playable pad surface">
          <p>Gold pads are the current chord shape. Tap a pad to hear one pitch, or use Audition shape to hear the whole voicing.</p>
          <p>The numbers at the bottom are semitone offsets from the sample root in 16 Levels Tune mode.</p>
        </Guide>
        <PadGrid selectedShape={selectedShape} pitchWindow={pitchWindow} onPlayPad={onPlayPad} />
      </div>

      <aside className="panel control-panel">
        <PanelHeader kicker="Monitor" title="Output" value={audioReady ? 'Audio armed' : 'Tap play'} />
        <Guide title="Browser audio and MIDI output controls">
          <p>Browser audio lets you sketch anywhere. Live MIDI sends the same notes to the MPC when a MIDI output is connected.</p>
          <p>If both are on, you will hear the browser and the hardware together.</p>
        </Guide>
        <div className="toggle-stack">
          <button type="button" className={previewEnabled ? 'toggle active' : 'toggle'} onClick={onTogglePreview}>
            <Volume2 size={18} />
            <span>Browser audio</span>
          </button>
          <button type="button" className={midiEnabled ? 'toggle active' : 'toggle'} onClick={onToggleMidi}>
            <Usb size={18} />
            <span>Live MIDI</span>
          </button>
        </div>
        <button type="button" className="primary-action" onClick={onAudition}>
          <Play size={18} />
          <span>Audition shape</span>
        </button>
        <StatusStack
          items={[
            { label: 'MIDI', value: midiEnabled ? midiMessage : 'Off' },
            { label: 'Window', value: `${midiToNoteWithOctave(pitchWindow.minMidi)} to ${midiToNoteWithOctave(pitchWindow.maxMidi)}` },
            { label: 'Pads', value: selectedShape.pads.map((pad) => pad.pad).join(', ') || 'No full shape' },
          ]}
        />
      </aside>
    </section>
  )
}

interface ChordsViewProps {
  chordRoot: string
  chordQuality: ChordQualityId
  keyRoot: string
  scaleType: 'major' | 'minor'
  diatonicChords: { id: string; root: string; quality: ChordQualityId; durationTicks: number }[]
  progressionShapes: { step: ChordStep; shape: ChordShape }[]
  onRootChange: (root: string) => void
  onQualityChange: (quality: ChordQualityId) => void
  onKeyRootChange: (root: string) => void
  onScaleTypeChange: (scaleType: 'major' | 'minor') => void
  onAddChord: (root: string, quality: ChordQualityId) => void
  onMoveChord: (stepId: string, direction: -1 | 1) => void
  onRemoveChord: (stepId: string) => void
  onAudition: (shape: ChordShape, strumMs?: number) => void
}

function ChordsView({
  chordRoot,
  chordQuality,
  keyRoot,
  scaleType,
  diatonicChords,
  progressionShapes,
  onRootChange,
  onQualityChange,
  onKeyRootChange,
  onScaleTypeChange,
  onAddChord,
  onMoveChord,
  onRemoveChord,
  onAudition,
}: ChordsViewProps) {
  return (
    <section className="split-layout">
      <div className="panel">
        <PanelHeader kicker="Builder" title="Chord source" value={describeChord(chordRoot, chordQuality)} />
        <Guide title="Build a chord">
          <p>Choose a root and quality, then add it to the progression. Minor 9, minor 11, and dominant 13 are useful sample-based colors.</p>
        </Guide>
        <ControlRow label="Root">
          <Segmented options={ROOT_NOTES} value={chordRoot} onChange={onRootChange} />
        </ControlRow>
        <ControlRow label="Quality">
          <select value={chordQuality} onChange={(event) => onQualityChange(event.target.value as ChordQualityId)}>
            {QUALITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </ControlRow>
        <button type="button" className="primary-action" onClick={() => onAddChord(chordRoot, chordQuality)}>
          <Music size={18} />
          <span>Add to progression</span>
        </button>
      </div>

      <div className="panel">
        <PanelHeader kicker="In key" title="Palette" value={`${keyRoot} ${scaleType}`} />
        <Guide title="Use the in-key palette">
          <p>Pick a key and mode, then tap a chip to add a chord that belongs to that key. This is the fastest way to find a loop that works.</p>
        </Guide>
        <ControlRow label="Key">
          <Segmented options={ROOT_NOTES} value={keyRoot} onChange={onKeyRootChange} />
        </ControlRow>
        <ControlRow label="Mode">
          <Segmented options={['minor', 'major']} value={scaleType} onChange={(value) => onScaleTypeChange(value as 'major' | 'minor')} />
        </ControlRow>
        <div className="chord-palette">
          {diatonicChords.map((step) => (
            <button type="button" key={step.id} className="chord-chip" onClick={() => onAddChord(step.root, step.quality)}>
              {describeChord(step.root, step.quality)}
            </button>
          ))}
        </div>
      </div>

      <div className="panel wide-panel">
        <PanelHeader kicker="Voice-led" title="Progression lane" value={`${progressionShapes.length} chords`} />
        <Guide title="Audition a progression shape">
          <p>Tap a progression block to hear the current 16 Levels voicing. Use the arrows to reorder chords and the bin to remove one.</p>
        </Guide>
        <div className="progression-lane">
          {progressionShapes.map(({ step, shape }, index) => (
            <div key={step.id} className={`progression-step ${rankClass(shape.rank)}`}>
              <button
                type="button"
                className="progression-audition"
                onClick={() => onAudition(shape, 26)}
                aria-label={`Audition ${describeChord(step.root, step.quality)}`}
              >
                <strong>{index + 1}. {describeChord(step.root, step.quality)}</strong>
                <span>{shape.inversion}</span>
                <small>{shape.pads.map((pad) => `P${pad.pad}`).join(' ') || 'retune'}</small>
              </button>
              <div className="progression-actions" aria-label={`${describeChord(step.root, step.quality)} controls`}>
                <button
                  type="button"
                  className="mini-icon"
                  onClick={() => onMoveChord(step.id, -1)}
                  disabled={index === 0}
                  title="Move earlier"
                  aria-label={`Move ${describeChord(step.root, step.quality)} earlier`}
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  type="button"
                  className="mini-icon"
                  onClick={() => onMoveChord(step.id, 1)}
                  disabled={index === progressionShapes.length - 1}
                  title="Move later"
                  aria-label={`Move ${describeChord(step.root, step.quality)} later`}
                >
                  <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  className="mini-icon danger"
                  onClick={() => onRemoveChord(step.id)}
                  title="Remove chord"
                  aria-label={`Remove ${describeChord(step.root, step.quality)}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <ProgressionMidiView progressionShapes={progressionShapes} />
      </div>
    </section>
  )
}

function ProgressionMidiView({ progressionShapes }: { progressionShapes: { step: ChordStep; shape: ChordShape }[] }) {
  const activeNotes = Array.from(new Set(progressionShapes.flatMap(({ shape }) => shape.pads.map((pad) => pad.midi)))).sort((a, b) => a - b)

  if (progressionShapes.length === 0) {
    return (
      <div className="midi-view" aria-label="MIDI view">
        <div className="midi-view-header">
          <div>
            <strong>MIDI view</strong>
            <span>Add chords to see the progression as note blocks.</span>
          </div>
        </div>
        <div className="empty-state">No chords in this progression yet.</div>
      </div>
    )
  }

  if (activeNotes.length === 0) {
    return (
      <div className="midi-view" aria-label="MIDI view">
        <div className="midi-view-header">
          <div>
            <strong>MIDI view</strong>
            <span>The current 16 Levels window cannot place any notes for these shapes.</span>
          </div>
        </div>
        <div className="empty-state">Try another original-pitch pad or retune suggestion.</div>
      </div>
    )
  }

  const minNote = activeNotes[0]
  const maxNote = activeNotes[activeNotes.length - 1]
  const noteRows = Array.from({ length: maxNote - minNote + 1 }, (_, index) => maxNote - index)
  const columnsStyle = { gridTemplateColumns: `repeat(${progressionShapes.length}, minmax(7rem, 1fr))` } as CSSProperties

  return (
    <div className="midi-view" aria-label="MIDI view">
      <div className="midi-view-header">
        <div>
          <strong>MIDI view</strong>
          <span>{midiToNoteWithOctave(minNote)} to {midiToNoteWithOctave(maxNote)}</span>
        </div>
        <small>Playable 16 Levels notes</small>
      </div>

      <div className="midi-scroll" role="img" aria-label="Piano roll view of the chord progression">
        <div className="midi-chord-bar" style={columnsStyle}>
          {progressionShapes.map(({ step }, index) => (
            <div key={step.id} className="midi-chord-label">
              <span>{index + 1}</span>
              <strong>{describeChord(step.root, step.quality)}</strong>
            </div>
          ))}
        </div>

        <div className="midi-roll">
          {noteRows.map((note) => (
            <div key={note} className={`midi-row ${midiToNoteName(note).includes('b') ? 'black-key' : ''}`}>
              <span className="midi-note-label">{midiToNoteWithOctave(note)}</span>
              <div className="midi-cells" style={columnsStyle}>
                {progressionShapes.map(({ step, shape }) => {
                  const pad = shape.pads.find((candidate) => candidate.midi === note)
                  return (
                    <div key={`${step.id}-${note}`} className="midi-cell">
                      {pad && (
                        <span
                          className="midi-note-block"
                          title={`${describeChord(step.root, step.quality)} ${midiToNoteWithOctave(note)} on pad ${pad.pad}`}
                        >
                          P{pad.pad}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface LevelsViewProps {
  chordRoot: string
  chordQuality: ChordQualityId
  sampleRootMidi: number
  originalPad: PadNumber
  analysis: ReturnType<typeof analyzeSixteenLevelsChord>
  onRootChange: (root: string) => void
  onQualityChange: (quality: ChordQualityId) => void
  onSampleRootChange: (midi: number) => void
  onOriginalPadChange: (pad: PadNumber) => void
  onAudition: (shape: ChordShape, strumMs?: number) => void
  onPlayPad: (pad: PadNumber) => void
}

function LevelsView({
  chordRoot,
  chordQuality,
  sampleRootMidi,
  originalPad,
  analysis,
  onRootChange,
  onQualityChange,
  onSampleRootChange,
  onOriginalPadChange,
  onAudition,
  onPlayPad,
}: LevelsViewProps) {
  return (
    <section className="levels-layout">
      <div className="panel">
        <PanelHeader kicker="16 Levels Tune" title="Window" value={`${midiToNoteWithOctave(analysis.window.minMidi)} to ${midiToNoteWithOctave(analysis.window.maxMidi)}`} />
        <Guide title="Set the 16 Levels window">
          <p>Sample root is the pitch of your sample. Original pad is the pad that plays it unshifted. Together they define the 16 semitones you can reach directly.</p>
        </Guide>
        <ControlRow label="Sample root">
          <select value={sampleRootMidi} onChange={(event) => onSampleRootChange(Number(event.target.value))}>
            {ROOT_NOTES.map((note) => (
              <option key={note} value={noteNameToMidi(note, 3)}>
                {note}3
              </option>
            ))}
          </select>
        </ControlRow>
        <ControlRow label="Original pad">
          <input type="range" min="1" max="16" value={originalPad} onChange={(event) => onOriginalPadChange(Number(event.target.value) as PadNumber)} />
          <output>Pad {originalPad}</output>
        </ControlRow>
        <ControlRow label="Chord">
          <select value={chordRoot} onChange={(event) => onRootChange(event.target.value)}>
            {ROOT_NOTES.map((note) => (
              <option key={note} value={note}>
                {note}
              </option>
            ))}
          </select>
          <select value={chordQuality} onChange={(event) => onQualityChange(event.target.value as ChordQualityId)}>
            {QUALITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </ControlRow>
        <PadGrid selectedShape={analysis.shapes[0]} pitchWindow={analysis.window} onPlayPad={onPlayPad} />
      </div>

      <div className="panel shape-panel">
        <PanelHeader kicker="Best shapes" title={describeChord(chordRoot, chordQuality)} value={rankLabel(analysis.shapes[0].rank)} />
        <Guide title="Read chord shapes">
          <p>Full means every requested tone fits. Strong keeps the main harmony. Shell gives the minimum chord identity when the full shape is awkward.</p>
        </Guide>
        <div className="shape-list">
          {analysis.shapes.map((shape) => (
            <button type="button" className={`shape-row ${rankClass(shape.rank)}`} key={shape.id} onClick={() => onAudition(shape, 28)}>
              <span className="rank-pill">{shape.rank}</span>
              <strong>{shape.inversion}</strong>
              <span>{shape.pads.map((pad) => `Pad ${pad.pad} ${pad.noteName}`).join(' - ') || 'No honest shape in this window'}</span>
              {shape.missing.length > 0 && <small>Missing {shape.missing.map((tone) => `${tone.label} ${tone.noteName}`).join(', ')}</small>}
              {shape.omitted.length > 0 && <small>Omitted color {shape.omitted.map((tone) => tone.label).join(', ')}</small>}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <PanelHeader kicker="Make it fit" title="Retune moves" value="Semitones" />
        <Guide title="Fix awkward chords">
          <p>Retune moves shift the whole sample window. Pad retunes are the workaround for one note: tune a single pad up or down by semitones on the MPC.</p>
        </Guide>
        <div className="suggestion-stack">
          {analysis.retuneSuggestions.map((suggestion) => (
            <button
              type="button"
              key={suggestion.semitones}
              className={`suggestion ${rankClass(suggestion.rank)}`}
              onClick={() => onSampleRootChange(sampleRootMidi + suggestion.semitones)}
            >
              <strong>{suggestion.label}</strong>
              <span>{suggestion.rank} - {suggestion.missingCount} missing</span>
            </button>
          ))}
        </div>
        <PanelHeader kicker="Octave escape" title="Pad retunes" value="+/-12 moves" />
        <div className="escape-stack">
          {analysis.padRetunePlans.length > 0 ? (
            analysis.padRetunePlans.map((plan) => (
              <div className="escape-card" key={plan.id}>
                <strong>Pad {plan.pad} -&gt; {plan.noteName}</strong>
                <span>{plan.reason}</span>
                <small>{midiToNoteWithOctave(plan.baseMidi)} to {midiToNoteWithOctave(plan.targetMidi)}</small>
              </div>
            ))
          ) : (
            <div className="escape-card">
              <strong>No pad retune needed</strong>
              <span>This shape fits inside the current 16-pad window.</span>
            </div>
          )}
        </div>
        <PanelHeader kicker="Or move base" title="Original pad" value="Best first" />
        <div className="mini-pad-list">
          {analysis.originalPadSuggestions.map((suggestion) => (
            <button
              type="button"
              key={suggestion.pad}
              className={suggestion.pad === originalPad ? 'mini-pad active' : 'mini-pad'}
              onClick={() => onOriginalPadChange(suggestion.pad)}
            >
              <span>P{suggestion.pad}</span>
              <small>{suggestion.rank}</small>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

interface GrooveViewProps {
  pattern: Pattern
  tempo: number
  swing: number
  gridResolution: number
  onTempoChange: (tempo: number) => void
  onSwingChange: (swing: number) => void
  onGridChange: (resolution: number) => void
  onPatternChange: (pattern: Pattern) => void
  onPlayPattern: () => void
  onExportMidi: () => void
}

function GrooveView({
  pattern,
  tempo,
  swing,
  gridResolution,
  onTempoChange,
  onSwingChange,
  onGridChange,
  onPatternChange,
  onPlayPattern,
  onExportMidi,
}: GrooveViewProps) {
  return (
    <section className="groove-layout">
      <div className="panel wide-panel">
        <PanelHeader kicker="Absolute ticks" title={pattern.name} value={`${gridResolution} steps`} />
        <Guide title="Program a groove">
          <p>Tap steps to add or remove hits. Changing the grid does not move existing hits because the app stores timing as absolute MPC ticks.</p>
        </Guide>
        <div className="sequencer-toolbar">
          <ControlRow label="Tempo">
            <input type="range" min="60" max="180" value={tempo} onChange={(event) => onTempoChange(Number(event.target.value))} />
            <output>{tempo} BPM</output>
          </ControlRow>
          <ControlRow label="Swing">
            <input type="range" min="50" max="75" value={swing} onChange={(event) => onSwingChange(Number(event.target.value))} />
            <output>{swing}%</output>
          </ControlRow>
          <ControlRow label="Grid">
            <Segmented options={['8', '16', '24', '32']} value={`${gridResolution}`} onChange={(value) => onGridChange(Number(value))} />
          </ControlRow>
        </div>

        <div className="sequencer" style={{ '--steps': gridResolution } as CSSProperties}>
          {GROOVE_LANES.map((lane) => (
            <div className="lane" key={lane.id}>
              <div className="lane-label">{lane.label}</div>
              {gridSteps(gridResolution).map((step) => {
                const tick = Math.round((BAR_TICKS / gridResolution) * step)
                const event = pattern.events.find((item) => item.laneId === lane.id && Math.abs(item.tick - tick) < 2)
                return (
                  <button
                    type="button"
                    key={`${lane.id}-${step}`}
                    className={event ? 'step active' : 'step'}
                    onClick={() => onPatternChange(toggleGridEvent(pattern, lane.id, lane.midiNote, step, gridResolution))}
                    aria-label={`${lane.label} step ${step + 1}`}
                  >
                    <span>{event ? Math.round(event.velocity * 127) : ''}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <aside className="panel">
        <PanelHeader kicker="Templates" title="Feel" value="1 bar" />
        <Guide title="Start from a feel">
          <p>Templates give you a quick pocket. Use Play groove to hear it, then edit steps or export/beam it to the MPC.</p>
        </Guide>
        <div className="template-stack">
          {[
            ['boom-bap', 'Boom-bap pocket'],
            ['dilla', 'Dilla drag'],
            ['amen', 'Amen two-step'],
            ['halftime', 'Halftime soul'],
            ['jungle-ghosts', 'Jungle ghosts'],
          ].map(([id, label]) => (
            <button type="button" className="template-button" key={id} onClick={() => onPatternChange(createTemplatePattern(id))}>
              {label}
            </button>
          ))}
        </div>
        <button type="button" className="primary-action" onClick={onPlayPattern}>
          <Play size={18} />
          <span>Play groove</span>
        </button>
        <button type="button" className="secondary-action" onClick={onExportMidi}>
          <Download size={18} />
          <span>Export MIDI</span>
        </button>
      </aside>
    </section>
  )
}

interface BridgeViewProps {
  midiOutputs: MidiOutputDevice[]
  selectedOutputId: string
  midiMessage: string
  midiChannel: number
  probeNote: number
  probePad: PadNumber
  selectedOutput: MidiOutputDevice | null
  calibratedPads: Partial<Record<PadNumber, number>>
  beamStage: 'ready' | 'count-in' | 'playing' | 'recall'
  onConnect: () => void
  onOutputChange: (id: string) => void
  onChannelChange: (channel: number) => void
  onProbeNoteChange: (note: number) => void
  onProbePadChange: (pad: PadNumber) => void
  onProbe: () => void
  onSaveProbe: () => void
  onBeam: () => void
}

function BridgeView({
  midiOutputs,
  selectedOutputId,
  midiMessage,
  midiChannel,
  probeNote,
  probePad,
  selectedOutput,
  calibratedPads,
  beamStage,
  onConnect,
  onOutputChange,
  onChannelChange,
  onProbeNoteChange,
  onProbePadChange,
  onProbe,
  onSaveProbe,
  onBeam,
}: BridgeViewProps) {
  const calibratedCount = Object.keys(calibratedPads).length

  return (
    <section className="bridge-layout">
      <div className="panel">
        <PanelHeader kicker="Connection" title="Web MIDI" value={selectedOutput ? selectedOutput.name : 'Offline'} />
        <Guide title="Connect the MPC">
          <p>Use Chrome or Edge on desktop. On the MPC, set MIDI Port to USB, Pad MIDI In to On, and choose the same MIDI channel.</p>
        </Guide>
        <button type="button" className="primary-action" onClick={onConnect}>
          <Usb size={18} />
          <span>Find MIDI outputs</span>
        </button>
        <ControlRow label="Output">
          <select value={selectedOutputId} onChange={(event) => onOutputChange(event.target.value)}>
            <option value="">None</option>
            {midiOutputs.map((output) => (
              <option key={output.id} value={output.id}>
                {output.name}
              </option>
            ))}
          </select>
        </ControlRow>
        <ControlRow label="Channel">
          <input type="number" min="1" max="16" value={midiChannel} onChange={(event) => onChannelChange(Number(event.target.value))} />
        </ControlRow>
        <StatusStack
          items={[
            { label: 'Status', value: midiMessage },
            { label: 'Context', value: isSecureMidiContext() ? 'Secure' : 'Needs HTTPS' },
            { label: 'API', value: isWebMidiAvailable() ? 'Available' : 'Unavailable' },
          ]}
        />
      </div>

      <div className="panel">
        <PanelHeader kicker="Pad prober" title="Find the real map" value={midiToNoteWithOctave(probeNote)} />
        <Guide title="Calibrate pads">
          <p>Send a test note, look at which MPC pad lights, set Lit pad to match, then save it. Repeat until the map is reliable.</p>
        </Guide>
        <ControlRow label="Probe note">
          <input type="range" min="24" max="84" value={probeNote} onChange={(event) => onProbeNoteChange(Number(event.target.value))} />
          <output>{midiToNoteWithOctave(probeNote)}</output>
        </ControlRow>
        <ControlRow label="Lit pad">
          <input type="range" min="1" max="16" value={probePad} onChange={(event) => onProbePadChange(Number(event.target.value) as PadNumber)} />
          <output>Pad {probePad}</output>
        </ControlRow>
        <button type="button" className="secondary-action" onClick={onProbe}>
          <Play size={18} />
          <span>Send test note</span>
        </button>
        <button type="button" className="secondary-action" onClick={onSaveProbe}>
          <Save size={18} />
          <span>Save lit pad</span>
        </button>
        <StatusStack
          items={[
            { label: 'Saved pads', value: `${calibratedCount} / 16` },
            { label: `Pad ${probePad}`, value: calibratedPads[probePad] ? midiToNoteWithOctave(calibratedPads[probePad]) : 'Not saved' },
          ]}
        />
      </div>

      <div className="panel wide-panel">
        <PanelHeader kicker="Sequence Recall" title="Beam to MPC" value={beamStageLabel(beamStage)} />
        <Guide title="Capture a groove on the MPC">
          <p>Beam plays the loop into the MPC over USB MIDI. When the app says Hit Recall, press SHIFT + SEQ REC on the hardware.</p>
        </Guide>
        <div className="beam-flow">
          {[
            ['ready', 'Check setup'],
            ['count-in', 'Count in'],
            ['playing', 'Loop playing'],
            ['recall', 'Hit Recall'],
          ].map(([stage, label]) => (
            <div key={stage} className={beamStage === stage ? 'beam-step active' : 'beam-step'}>
              <strong>{label}</strong>
              <span>{beamStageCopy(stage)}</span>
            </div>
          ))}
        </div>
        <button type="button" className="primary-action beam-action" onClick={onBeam}>
          <Radio size={18} />
          <span>Beam current groove</span>
        </button>
      </div>
    </section>
  )
}

function beamStageLabel(stage: 'ready' | 'count-in' | 'playing' | 'recall'): string {
  if (stage === 'count-in') return 'Get ready'
  if (stage === 'playing') return 'Capturing'
  if (stage === 'recall') return 'SHIFT + SEQ REC'
  return 'Live capture'
}

function beamStageCopy(stage: string): string {
  if (stage === 'ready') return 'USB MIDI, Pad MIDI In, channel, and Time Correct are set.'
  if (stage === 'count-in') return 'One moment to get your hands near the MPC.'
  if (stage === 'playing') return 'The app is firing the current groove over MIDI.'
  return 'Press Recall on the MPC before the idea disappears.'
}

interface LibraryViewProps {
  project: StudioProject
  savedMessage: string
  onProjectNameChange: (name: string) => void
  onSave: () => void
  onExport: () => void
  onImport: (file: File | undefined) => void
}

function LibraryView({ project, savedMessage, onProjectNameChange, onSave, onExport, onImport }: LibraryViewProps) {
  return (
    <section className="library-layout">
      <div className="panel">
        <PanelHeader kicker="Local" title="Project" value={savedMessage} />
        <Guide title="Save your work">
          <p>Save local keeps projects in this browser. Export library makes a JSON backup you can move to another device.</p>
        </Guide>
        <ControlRow label="Name">
          <input value={project.name} onChange={(event) => onProjectNameChange(event.target.value)} />
        </ControlRow>
        <StatusStack
          items={[
            { label: 'Patterns', value: `${project.patterns.length}` },
            { label: 'Progressions', value: `${project.progressions.length}` },
            { label: 'Updated', value: new Date(project.updatedAt).toLocaleString() },
          ]}
        />
        <button type="button" className="primary-action" onClick={onSave}>
          <Save size={18} />
          <span>Save local</span>
        </button>
      </div>

      <div className="panel">
        <PanelHeader kicker="Portable" title="Import / export" value="JSON" />
        <button type="button" className="secondary-action" onClick={onExport}>
          <Download size={18} />
          <span>Export library</span>
        </button>
        <label className="file-action">
          <Upload size={18} />
          <span>Import library</span>
          <input type="file" accept="application/json" onChange={(event) => onImport(event.target.files?.[0])} />
        </label>
      </div>

      <div className="panel">
        <PanelHeader kicker="Reality check" title="Transfer routes" value="Honest" />
        <StatusStack
          items={[
            { label: 'Direct .mid import', value: 'Not supported by MPC Sample' },
            { label: 'Best route', value: 'Live MIDI + Sequence Recall' },
            { label: 'Desktop route', value: '.mid to MPC3, then export to Sample' },
          ]}
        />
      </div>
    </section>
  )
}

interface PadGridProps {
  selectedShape: ChordShape
  pitchWindow: ReturnType<typeof createPitchWindow>
  onPlayPad: (pad: PadNumber) => void
}

function PadGrid({ selectedShape, pitchWindow, onPlayPad }: PadGridProps) {
  const activePads = new Map(selectedShape.pads.map((pad) => [pad.pad, pad]))

  return (
    <div className="pad-grid">
      {PAD_NUMBERS.map((pad) => {
        const active = activePads.get(pad)
        const midi = padToMidi(pitchWindow.sampleRootMidi, pitchWindow.originalPitchPad, pad)
        return (
          <button
            type="button"
            className={active ? `mpc-pad active interval-${active.interval}` : 'mpc-pad'}
            key={pad}
            onClick={() => onPlayPad(pad)}
          >
            <span className="pad-number">{pad}</span>
            <strong>{midiToNoteName(midi)}</strong>
            <small>{active ? active.interval : midi - pitchWindow.sampleRootMidi}</small>
          </button>
        )
      })}
    </div>
  )
}

function PanelHeader({ kicker, title, value }: { kicker: string; title: string; value: string }) {
  return (
    <div className="panel-header">
      <span>{kicker}</span>
      <h2>{title}</h2>
      <b>{value}</b>
    </div>
  )
}

function Guide({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="guide-panel">
      <summary title={title} aria-label={title}>
        <Info size={16} />
        <span>Guide</span>
      </summary>
      <div>{children}</div>
    </details>
  )
}

function ControlRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="control-row">
      <span>{label}</span>
      <div>{children}</div>
    </label>
  )
}

function Segmented({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="segmented">
      {options.map((option) => (
        <button type="button" key={option} className={option === value ? 'active' : ''} onClick={() => onChange(option)}>
          {option}
        </button>
      ))}
    </div>
  )
}

function StatusStack({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="status-stack">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function rankClass(rank: string): string {
  return `rank-${rank.toLowerCase().replace(/[^a-z]+/g, '-')}`
}

export default App
