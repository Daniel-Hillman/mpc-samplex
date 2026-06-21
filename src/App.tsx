import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Info,
  Library,
  Music,
  Play,
  Save,
  SlidersHorizontal,
  Square,
  Upload,
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
  SCALE_DEFINITIONS,
  type ScaleType,
  analyzeSixteenLevelsChord,
  createPitchWindow,
  createTemplatePattern,
  describeChord,
  formatSemitoneShift,
  getDiatonicChords,
  getChordDefinition,
  getScaleDefinition,
  getScaleNotes,
  gridSteps,
  intervalRoleLabel,
  midiToNoteName,
  midiToNoteWithOctave,
  noteNameToMidi,
  padToMidi,
  pitchClass,
  rankLabel,
  shortestPitchShift,
  toggleGridEvent,
} from './lib/music'
import type { ChordQualityId, ChordShape, ChordStep, PadNumber, Pattern, StudioProject } from './types'

type ViewId = 'studio' | 'chordPads' | 'chords' | 'levels' | 'groove' | 'library'
type ChordPaletteMode = 'triads' | 'sevenths' | 'colors'
type PadHighlight = {
  isSafe: boolean
  isRoot: boolean
  isChord: boolean
  isOriginal: boolean
  chordRole?: string
}

const VIEW_ITEMS: { id: ViewId; label: string; icon: typeof Music }[] = [
  { id: 'studio', label: 'Home', icon: Music },
  { id: 'chords', label: 'Chords', icon: SlidersHorizontal },
  { id: 'levels', label: '16 Levels', icon: Square },
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
  const [scaleType, setScaleType] = useState<ScaleType>('minor')
  const [sampleRootMidi, setSampleRootMidi] = useState(noteNameToMidi('C', 3))
  const [originalPad, setOriginalPad] = useState<PadNumber>(4)
  const [otherSampleNote, setOtherSampleNote] = useState('C')
  const [targetNote, setTargetNote] = useState('C')
  const [highlightMode, setHighlightMode] = useState<'scale' | 'chord' | 'all'>('scale')
  const [animatedPads, setAnimatedPads] = useState<PadNumber[]>([])
  const [gridResolution, setGridResolution] = useState(16)
  const [previewEnabled, setPreviewEnabled] = useState(true)
  const [audioReady, setAudioReady] = useState(false)
  const [savedMessage, setSavedMessage] = useState('Local project ready')
  const audioRef = useRef<StudioAudio | null>(null)

  const pattern = project.patterns[0]
  const progression = project.progressions[0]
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
  const scaleNotes = useMemo(() => getScaleNotes(keyRoot, scaleType), [keyRoot, scaleType])
  const scaleDefinition = useMemo(() => getScaleDefinition(scaleType), [scaleType])
  const chordToneRoles = useMemo(() => {
    const definition = getChordDefinition(chordQuality)
    const intervals = [...definition.coreIntervals, ...definition.colorIntervals]
    const rootMidi = noteNameToMidi(chordRoot, 3)
    return new Map(intervals.map((interval) => [pitchClass(midiToNoteName(rootMidi + interval)), intervalRoleLabel(interval)]))
  }, [chordQuality, chordRoot])
  const padHighlights = useMemo(() => {
    const safePitchClasses = new Set(scaleNotes.map(pitchClass))
    const rootPitch = pitchClass(keyRoot)

    return PAD_NUMBERS.reduce(
      (map, pad) => {
        const midi = padToMidi(sampleRootMidi, originalPad, pad)
        const note = midiToNoteName(midi)
        const notePitch = pitchClass(note)
        map[pad] = {
          isSafe: safePitchClasses.has(notePitch),
          isRoot: notePitch === rootPitch,
          isChord: chordToneRoles.has(notePitch),
          isOriginal: pad === originalPad,
          chordRole: chordToneRoles.get(notePitch),
        }
        return map
      },
      {} as Record<PadNumber, PadHighlight>,
    )
  }, [chordToneRoles, keyRoot, originalPad, sampleRootMidi, scaleNotes])
  const chordShapeHighlights = useMemo(() => {
    const activePads = new Map(selectedShape.pads.map((pad) => [pad.pad, pad]))
    return PAD_NUMBERS.reduce(
      (map, pad) => {
        const active = activePads.get(pad)
        map[pad] = {
          isSafe: false,
          isRoot: Boolean(active && positiveInterval(active.interval) === 0),
          isChord: Boolean(active),
          isOriginal: pad === originalPad,
          chordRole: active ? intervalRoleLabel(active.interval) : undefined,
        }
        return map
      },
      {} as Record<PadNumber, PadHighlight>,
    )
  }, [originalPad, selectedShape])
  const safePads = PAD_NUMBERS.filter((pad) => padHighlights[pad].isSafe)
  const rootPads = PAD_NUMBERS.filter((pad) => padHighlights[pad].isRoot)
  const chordPads = PAD_NUMBERS.filter((pad) => padHighlights[pad].isChord)
  const repitchShift = shortestPitchShift(otherSampleNote, targetNote)

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
  }

  async function playSinglePad(pad: PadNumber) {
    const midi = padToMidi(sampleRootMidi, originalPad, pad)
    if (previewEnabled) {
      const audio = await ensureAudio()
      audio.playMidiNotes([midi], '8n', 0.72)
    }
  }

  async function playPattern() {
    if (previewEnabled) {
      const audio = await ensureAudio()
      audio.playPattern(pattern, project.tempo)
    }
  }

  function setTrackKey(root: string) {
    setKeyRoot(root)
    setTargetNote(root)
  }

  function animatePads(pads: PadNumber[], mode: 'scale' | 'chord') {
    setHighlightMode(mode)
    setAnimatedPads([])
    pads.forEach((pad, index) => {
      window.setTimeout(() => setAnimatedPads([pad]), index * 170)
    })
    window.setTimeout(() => setAnimatedPads([]), pads.length * 170 + 460)
  }

  function applyJunglePreset() {
    setSampleRootMidi(noteNameToMidi('A', 3))
    setOriginalPad(4)
    setTrackKey('A')
    setScaleType('minor')
    setChordRoot('A')
    setChordQuality('min7')
    setOtherSampleNote('C')
    setTargetNote('A')
    setHighlightMode('scale')
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
      const currentProgression = current.progressions[0]
      const nextProgression = {
        ...currentProgression,
        steps: [
          ...currentProgression.steps,
          {
            id: `step-${Date.now()}-${currentProgression.steps.length}`,
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

  function moveChordInProgression(stepId: string, direction: -1 | 1) {
    setProject((current) => {
      const currentProgression = current.progressions[0]
      const steps = [...currentProgression.steps]
      const fromIndex = steps.findIndex((step) => step.id === stepId)
      const toIndex = fromIndex + direction

      if (fromIndex < 0 || toIndex < 0 || toIndex >= steps.length) {
        return current
      }

      const [step] = steps.splice(fromIndex, 1)
      steps.splice(toIndex, 0, step)

      return {
        ...current,
        progressions: [{ ...currentProgression, steps }],
        updatedAt: new Date().toISOString(),
      }
    })
  }

  function removeChordFromProgression(stepId: string) {
    setProject((current) => {
      const currentProgression = current.progressions[0]
      return {
        ...current,
        progressions: [
          {
            ...currentProgression,
            steps: currentProgression.steps.filter((step) => step.id !== stepId),
          },
        ],
        updatedAt: new Date().toISOString(),
      }
    })
  }

  function clearProgression() {
    setProject((current) => {
      const currentProgression = current.progressions[0]
      return {
        ...current,
        progressions: [{ ...currentProgression, steps: [] }],
        updatedAt: new Date().toISOString(),
      }
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
    anchor.download = 'mpc-samplex-library.json'
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
            <h1>MPC Samplex</h1>
            <p>{describeChord(chordRoot, chordQuality)} over {midiToNoteWithOctave(sampleRootMidi)} - {project.tempo} BPM</p>
          </div>
        </div>
        {activeView !== 'chords' && (
          <div className="transport-strip" aria-label="Transport">
            <button type="button" className="icon-button" onClick={() => auditionShape(selectedShape)} title="Play chord">
              <Play size={20} />
            </button>
            <button type="button" className="icon-button" onClick={() => auditionShape(selectedShape, 34)} title="Strum chord">
              <Volume2 size={20} />
            </button>
          </div>
        )}
      </header>

      <nav className="view-tabs" aria-label="Samplex sections">
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
            pitchWindow={pitchWindow}
            sampleRootMidi={sampleRootMidi}
            originalPad={originalPad}
            keyRoot={keyRoot}
            scaleType={scaleType}
            chordRoot={chordRoot}
            chordQuality={chordQuality}
            otherSampleNote={otherSampleNote}
            targetNote={targetNote}
            highlightMode={highlightMode}
            padHighlights={padHighlights}
            safePads={safePads}
            rootPads={rootPads}
            chordPads={chordPads}
            scaleDefinitionLabel={scaleDefinition.label}
            scaleNotes={scaleNotes}
            repitchShift={repitchShift}
            animatedPads={animatedPads}
            onSampleRootChange={setSampleRootMidi}
            onOriginalPadChange={setOriginalPad}
            onKeyRootChange={setTrackKey}
            onScaleTypeChange={setScaleType}
            onChordRootChange={setChordRoot}
            onChordQualityChange={setChordQuality}
            onOtherSampleNoteChange={setOtherSampleNote}
            onTargetNoteChange={setTargetNote}
            onSetTargetToKey={() => setTargetNote(keyRoot)}
            onHighlightModeChange={setHighlightMode}
            onAnimateSafePads={() => animatePads(safePads, 'scale')}
            onAnimateChordPads={() => animatePads(chordPads, 'chord')}
            onPresetJungle={applyJunglePreset}
            onTogglePreview={() => setPreviewEnabled((value) => !value)}
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
            sampleRootMidi={sampleRootMidi}
            originalPad={originalPad}
            diatonicChords={diatonicChords}
            selectedShape={selectedShape}
            progressionShapes={progressionShapes}
            pitchWindow={pitchWindow}
            chordShapeHighlights={chordShapeHighlights}
            animatedPads={animatedPads}
            onRootChange={setChordRoot}
            onQualityChange={setChordQuality}
            onKeyRootChange={setKeyRoot}
            onScaleTypeChange={setScaleType}
            onSampleRootChange={setSampleRootMidi}
            onOriginalPadChange={setOriginalPad}
            onAddChord={addChordToProgression}
            onMoveChord={moveChordInProgression}
            onRemoveChord={removeChordFromProgression}
            onClearProgression={clearProgression}
            onAnimate={() => animatePads(selectedShape.pads.map((pad) => pad.pad), 'chord')}
            onPlayPad={playSinglePad}
          />
        )}

        {activeView === 'chordPads' && (
          <ChordPadsView
            chordRoot={chordRoot}
            chordQuality={chordQuality}
            keyRoot={keyRoot}
            scaleType={scaleType}
            sampleRootMidi={sampleRootMidi}
            originalPad={originalPad}
            analysis={analysis}
            selectedShape={selectedShape}
            pitchWindow={pitchWindow}
            chordShapeHighlights={chordShapeHighlights}
            animatedPads={animatedPads}
            onRootChange={setChordRoot}
            onQualityChange={setChordQuality}
            onSampleRootChange={setSampleRootMidi}
            onOriginalPadChange={setOriginalPad}
            onUseTrackKey={() => {
              setChordRoot(keyRoot)
              setChordQuality(scaleType === 'major' || scaleType === 'majorPent' || scaleType === 'mixolydian' ? 'maj' : 'min')
            }}
            onAnimate={() => animatePads(selectedShape.pads.map((pad) => pad.pad), 'chord')}
            onAudition={() => auditionShape(selectedShape, 26)}
            onPlayPad={playSinglePad}
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
  pitchWindow: ReturnType<typeof createPitchWindow>
  sampleRootMidi: number
  originalPad: PadNumber
  keyRoot: string
  scaleType: ScaleType
  chordRoot: string
  chordQuality: ChordQualityId
  otherSampleNote: string
  targetNote: string
  highlightMode: 'scale' | 'chord' | 'all'
  padHighlights: Record<PadNumber, PadHighlight>
  safePads: PadNumber[]
  rootPads: PadNumber[]
  chordPads: PadNumber[]
  scaleDefinitionLabel: string
  scaleNotes: string[]
  repitchShift: number
  animatedPads: PadNumber[]
  onSampleRootChange: (midi: number) => void
  onOriginalPadChange: (pad: PadNumber) => void
  onKeyRootChange: (root: string) => void
  onScaleTypeChange: (scaleType: ScaleType) => void
  onChordRootChange: (root: string) => void
  onChordQualityChange: (quality: ChordQualityId) => void
  onOtherSampleNoteChange: (note: string) => void
  onTargetNoteChange: (note: string) => void
  onSetTargetToKey: () => void
  onHighlightModeChange: (mode: 'scale' | 'chord' | 'all') => void
  onAnimateSafePads: () => void
  onAnimateChordPads: () => void
  onPresetJungle: () => void
  onTogglePreview: () => void
  onAudition: () => void
  onPlayPad: (pad: PadNumber) => void
}

function StudioView({
  audioReady,
  selectedShape,
  previewEnabled,
  pitchWindow,
  sampleRootMidi,
  originalPad,
  keyRoot,
  scaleType,
  chordRoot,
  chordQuality,
  otherSampleNote,
  targetNote,
  highlightMode,
  padHighlights,
  safePads,
  rootPads,
  chordPads,
  scaleDefinitionLabel,
  scaleNotes,
  repitchShift,
  animatedPads,
  onSampleRootChange,
  onOriginalPadChange,
  onKeyRootChange,
  onScaleTypeChange,
  onChordRootChange,
  onChordQualityChange,
  onOtherSampleNoteChange,
  onTargetNoteChange,
  onSetTargetToKey,
  onHighlightModeChange,
  onAnimateSafePads,
  onAnimateChordPads,
  onPresetJungle,
  onTogglePreview,
  onAudition,
  onPlayPad,
}: StudioViewProps) {
  const sampleNote = midiToNoteName(sampleRootMidi)
  const chordPadDetails = chordPads.map((pad) => {
    const midi = padToMidi(sampleRootMidi, originalPad, pad)
    const role = padHighlights[pad].chordRole ?? 'tone'
    return `P${pad} ${midiToNoteName(midi)} ${role}`
  })
  const easyChord = chordPads.slice(0, 4).map((pad) => `P${pad}`).join(' -> ')
  const fifthPad = chordPads.find((pad) => padHighlights[pad].chordRole === '5')
  const nearestShift = `${repitchShift > 0 ? '+' : ''}${repitchShift} st`
  const litScaleNoteSet = new Set(safePads.map((pad) => midiToNoteName(padToMidi(sampleRootMidi, originalPad, pad))))
  const litScaleNotes = scaleNotes.filter((note) => litScaleNoteSet.has(note))
  const missingScaleNotes = scaleNotes.filter((note) => !litScaleNoteSet.has(note))

  return (
    <section className="helper-grid">
      <aside className="panel helper-setup">
        <PanelHeader kicker="1. Setup" title="Sample and key" value={`${sampleNote} on pad ${originalPad}`} />
        <Guide title="Find safe pads fast">
          <p>Set the note your one-shot is tuned to, pick the track key and scale, then use the highlighted pads in 16 Levels Tune mode.</p>
        </Guide>
        <ControlRow label="Sample note">
          <select value={sampleNote} onChange={(event) => onSampleRootChange(noteNameToMidi(event.target.value, 3))}>
            {ROOT_NOTES.map((note) => (
              <option key={note} value={note}>
                {note}
              </option>
            ))}
          </select>
        </ControlRow>
        <ControlRow label="Original pad">
          <select value={originalPad} onChange={(event) => onOriginalPadChange(Number(event.target.value) as PadNumber)}>
            {PAD_NUMBERS.map((pad) => (
              <option key={pad} value={pad}>
                Pad {pad}
              </option>
            ))}
          </select>
        </ControlRow>
        <div className="helper-mini-row">
          <ControlRow label="Track key">
            <select value={keyRoot} onChange={(event) => onKeyRootChange(event.target.value)}>
              {ROOT_NOTES.map((note) => (
                <option key={note} value={note}>
                  {note}
                </option>
              ))}
            </select>
          </ControlRow>
          <ControlRow label="Scale">
            <select value={scaleType} onChange={(event) => onScaleTypeChange(event.target.value as ScaleType)}>
              {SCALE_DEFINITIONS.map((scale) => (
                <option key={scale.id} value={scale.id}>
                  {scale.label}
                </option>
              ))}
            </select>
          </ControlRow>
        </div>
        <div className="helper-actions">
          <button type="button" className={highlightMode === 'scale' ? 'primary-action' : 'secondary-action'} onClick={() => onHighlightModeChange('scale')}>
            <span>Show safe pads</span>
          </button>
          <button type="button" className={highlightMode === 'chord' ? 'primary-action' : 'secondary-action'} onClick={() => onHighlightModeChange('chord')}>
            <span>Highlight chord</span>
          </button>
          <button type="button" className="secondary-action" onClick={() => onHighlightModeChange('all')}>
            <span>Show all pads</span>
          </button>
          <button type="button" className="secondary-action" onClick={onPresetJungle}>
            <span>Preset: A minor bass shot</span>
          </button>
        </div>
        <div className="legend helper-legend">
          <span>Mint = in key</span>
          <span>Gold = root</span>
          <span>Rose = chord</span>
          <span>Blue = original</span>
        </div>
      </aside>

      <div className="panel main-surface helper-pad-panel">
        <PanelHeader kicker="2. 16 Levels" title="Tune pad map" value={`${scaleNotes.length} notes / ${safePads.length} pads`} />
        <PadGrid
          selectedShape={selectedShape}
          pitchWindow={pitchWindow}
          padHighlights={padHighlights}
          highlightMode={highlightMode}
          animatedPads={animatedPads}
          onPlayPad={onPlayPad}
        />
        <div className="helper-pad-actions">
          <button type="button" className="secondary-action" onClick={onAnimateSafePads} disabled={safePads.length === 0}>
            <Play size={18} />
            <span>Animate safe pads</span>
          </button>
          <button type="button" className="secondary-action" onClick={onAnimateChordPads} disabled={chordPads.length === 0}>
            <Music size={18} />
            <span>Animate chord</span>
          </button>
          <button type="button" className="primary-action" onClick={onAudition}>
            <Volume2 size={18} />
            <span>Audition chord</span>
          </button>
        </div>
      </div>

      <aside className="panel control-panel">
        <PanelHeader kicker="Monitor" title="Output" value={audioReady ? 'Audio armed' : 'Tap play'} />
        <Guide title="Browser audio controls">
          <p>Browser audio lets you sketch chords, pads, and grooves without connecting hardware.</p>
        </Guide>
        <div className="toggle-stack">
          <button type="button" className={previewEnabled ? 'toggle active' : 'toggle'} onClick={onTogglePreview}>
            <Volume2 size={18} />
            <span>Browser audio</span>
          </button>
        </div>
        <button type="button" className="primary-action" onClick={onAudition}>
          <Play size={18} />
          <span>Audition shape</span>
        </button>
        <StatusStack
          items={[
            { label: 'Preview', value: previewEnabled ? 'Browser audio on' : 'Muted' },
            { label: 'Window', value: `${midiToNoteWithOctave(pitchWindow.minMidi)} to ${midiToNoteWithOctave(pitchWindow.maxMidi)}` },
            { label: 'Pads', value: selectedShape.pads.map((pad) => pad.pad).join(', ') || 'No full shape' },
          ]}
        />
      </aside>

      <section className="panel helper-results">
        <PanelHeader kicker="3. What to play" title={`${keyRoot} ${scaleDefinitionLabel}`} value="Coach" />
        <div className="result-stack">
          <div className="result-box">
            <strong>Scale notes ({scaleNotes.length}):</strong> {scaleNotes.join(', ')}
            <br />
            <strong>Visible notes ({litScaleNotes.length}/{scaleNotes.length}):</strong> {litScaleNotes.join(', ') || 'none in this window'}
            <br />
            <strong>Pads lit ({safePads.length}):</strong> {safePads.length ? safePads.map((pad) => `P${pad}`).join(', ') : 'none in this window'}
            <br />
            <strong>Root pads:</strong> {rootPads.length ? rootPads.map((pad) => `P${pad}`).join(', ') : 'none in this window'}
            {missingScaleNotes.length > 0 && (
              <>
                <br />
                <strong>Missing notes:</strong> {missingScaleNotes.join(', ')}
              </>
            )}
          </div>
          <div className="result-box">
            <strong>Practical tip:</strong> Start with the gold root pads, move to nearby mint pads, and use a non-mint pad briefly only when you want grit or tension.
          </div>
        </div>
      </section>

      <section className="panel helper-chord">
        <PanelHeader kicker="4. Chord coach" title={describeChord(chordRoot, chordQuality)} value={`${chordPads.length} pads`} />
        <div className="helper-mini-row">
          <ControlRow label="Chord root">
            <select value={chordRoot} onChange={(event) => onChordRootChange(event.target.value)}>
              {ROOT_NOTES.map((note) => (
                <option key={note} value={note}>
                  {note}
                </option>
              ))}
            </select>
          </ControlRow>
          <ControlRow label="Type">
            <select value={chordQuality} onChange={(event) => onChordQualityChange(event.target.value as ChordQualityId)}>
              {QUALITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </ControlRow>
        </div>
        <button
          type="button"
          className="secondary-action"
          onClick={() => {
            onChordRootChange(keyRoot)
            onChordQualityChange(scaleType === 'major' || scaleType === 'majorPent' || scaleType === 'mixolydian' ? 'maj' : 'min')
            onHighlightModeChange('chord')
          }}
        >
          <span>Use track key as chord root</span>
        </button>
        <div className="pitch-list">
          {chordPadDetails.length ? (
            chordPadDetails.map((detail) => (
              <div className="pitch-row" key={detail}>
                <span>{detail}</span>
                <span className="pill">Chord</span>
              </div>
            ))
          ) : (
            <div className="result-box">No chord tones appear in this 16 Levels window. Try Pad 4 original or retune the sample by an octave.</div>
          )}
          {easyChord && (
            <div className="pitch-row">
              <span>Easy chord stab</span>
              <span className="pill">{easyChord}</span>
            </div>
          )}
          {rootPads[0] && fifthPad && (
            <div className="pitch-row">
              <span>Bass movement</span>
              <span className="pill">{`P${rootPads[0]} -> P${fifthPad} -> P${rootPads[0]}`}</span>
            </div>
          )}
        </div>
      </section>

      <section className="panel helper-pitch">
        <PanelHeader kicker="5. Repitch" title="Match another one-shot" value={nearestShift} />
        <div className="helper-mini-row">
          <ControlRow label="Detected note">
            <select value={otherSampleNote} onChange={(event) => onOtherSampleNoteChange(event.target.value)}>
              {ROOT_NOTES.map((note) => (
                <option key={note} value={note}>
                  {note}
                </option>
              ))}
            </select>
          </ControlRow>
          <ControlRow label="Target note">
            <select value={targetNote} onChange={(event) => onTargetNoteChange(event.target.value)}>
              {ROOT_NOTES.map((note) => (
                <option key={note} value={note}>
                  {note}
                </option>
              ))}
            </select>
          </ControlRow>
        </div>
        <button type="button" className="secondary-action" onClick={onSetTargetToKey}>
          <span>Set target to track key</span>
        </button>
        <div className="result-box">
          <strong>{`${otherSampleNote} -> ${targetNote}`}</strong>
          <br />
          {formatSemitoneShift(repitchShift)}. Use this as a starting point, then adjust by ear if the sample wobbles.
        </div>
        <div className="pitch-list">
          {[
            ['Nearest shift', repitchShift],
            ['Same note one octave up', repitchShift + 12],
            ['Same note one octave down', repitchShift - 12],
          ].map(([label, shift]) => (
            <div className="pitch-row" key={label}>
              <span>{label}</span>
              <span className="pill">{Number(shift) > 0 ? '+' : ''}{shift} st</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  )
}

interface ChordPadsViewProps {
  chordRoot: string
  chordQuality: ChordQualityId
  keyRoot: string
  scaleType: ScaleType
  sampleRootMidi: number
  originalPad: PadNumber
  analysis: ReturnType<typeof analyzeSixteenLevelsChord>
  selectedShape: ChordShape
  pitchWindow: ReturnType<typeof createPitchWindow>
  chordShapeHighlights: Record<PadNumber, PadHighlight>
  animatedPads: PadNumber[]
  onRootChange: (root: string) => void
  onQualityChange: (quality: ChordQualityId) => void
  onSampleRootChange: (midi: number) => void
  onOriginalPadChange: (pad: PadNumber) => void
  onUseTrackKey: () => void
  onAnimate: () => void
  onAudition: () => void
  onPlayPad: (pad: PadNumber) => void
}

function ChordPadsView({
  chordRoot,
  chordQuality,
  keyRoot,
  scaleType,
  sampleRootMidi,
  originalPad,
  analysis,
  selectedShape,
  pitchWindow,
  chordShapeHighlights,
  animatedPads,
  onRootChange,
  onQualityChange,
  onSampleRootChange,
  onOriginalPadChange,
  onUseTrackKey,
  onAnimate,
  onAudition,
  onPlayPad,
}: ChordPadsViewProps) {
  const sampleNote = midiToNoteName(sampleRootMidi)
  const playablePads = selectedShape.pads.slice().sort((a, b) => a.pad - b.pad)
  const padRecipe = playablePads.map((pad) => `P${pad.pad}`).join(' + ')
  const missingEssentials = selectedShape.missing.filter((tone) => {
    const definition = getChordDefinition(chordQuality)
    return definition.coreIntervals.includes(tone.interval)
  })
  const bestOriginalPadSuggestions = analysis.originalPadSuggestions.slice(0, 4)
  const bestPadRetunes = analysis.padRetunePlans.slice(0, 4)

  return (
    <section className="chord-pad-layout">
      <aside className="panel chord-pad-controls">
        <PanelHeader kicker="1. Choose chord" title="Chord pad builder" value={describeChord(chordRoot, chordQuality)} />
        <Guide title="Build chords from 16 Levels pads">
          <p>Choose the chord root and type. The pad grid highlights exactly what to press in 16 Levels Tune mode for the current sample note and original-pitch pad.</p>
        </Guide>
        <ControlRow label="Chord root">
          <Segmented options={ROOT_NOTES} value={chordRoot} onChange={onRootChange} />
        </ControlRow>
        <ControlRow label="Chord type">
          <select value={chordQuality} onChange={(event) => onQualityChange(event.target.value as ChordQualityId)}>
            {QUALITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </ControlRow>
        <div className="helper-mini-row">
          <ControlRow label="Sample note">
            <select value={sampleNote} onChange={(event) => onSampleRootChange(noteNameToMidi(event.target.value, 3))}>
              {ROOT_NOTES.map((note) => (
                <option key={note} value={note}>
                  {note}
                </option>
              ))}
            </select>
          </ControlRow>
          <ControlRow label="Original pad">
            <select value={originalPad} onChange={(event) => onOriginalPadChange(Number(event.target.value) as PadNumber)}>
              {PAD_NUMBERS.map((pad) => (
                <option key={pad} value={pad}>
                  Pad {pad}
                </option>
              ))}
            </select>
          </ControlRow>
        </div>
        <div className="helper-actions">
          <button type="button" className="secondary-action" onClick={onUseTrackKey}>
            <span>Use track key: {keyRoot} {getScaleDefinition(scaleType).label}</span>
          </button>
          <button type="button" className="primary-action" onClick={onAudition} disabled={playablePads.length === 0}>
            <Play size={18} />
            <span>Hear chord</span>
          </button>
          <button type="button" className="secondary-action" onClick={onAnimate} disabled={playablePads.length === 0}>
            <Music size={18} />
            <span>Animate pads</span>
          </button>
        </div>
      </aside>

      <div className="panel chord-pad-surface">
        <PanelHeader kicker="2. Press these pads" title={padRecipe || 'No playable recipe'} value={rankLabel(selectedShape.rank)} />
        <PadGrid
          selectedShape={selectedShape}
          pitchWindow={pitchWindow}
          padHighlights={chordShapeHighlights}
          highlightMode="chord"
          animatedPads={animatedPads}
          onPlayPad={onPlayPad}
        />
        <div className="chord-pad-summary">
          <div className={`connection-card ${selectedShape.rank === 'Not playable' ? 'offline' : 'confirmed'}`}>
            {selectedShape.rank === 'Not playable' ? <AlertCircle size={22} /> : <CheckCircle2 size={22} />}
            <div>
              <strong>{rankLabel(selectedShape.rank)}</strong>
              <span>
                {padRecipe
                  ? `Press ${padRecipe} for ${selectedShape.inversion}.`
                  : 'The essential tones are outside the current 16 Levels window.'}
              </span>
            </div>
          </div>
          <div className="pitch-list">
            {playablePads.map((pad) => (
              <div className="pitch-row" key={`${pad.pad}-${pad.midi}`}>
                <span>Pad {pad.pad}: {midiToNoteWithOctave(pad.midi)}</span>
                <span className="pill">{intervalRoleLabel(pad.interval)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside className="panel chord-pad-coach">
        <PanelHeader kicker="3. Fixes" title="If it does not fit" value={`${selectedShape.missing.length} missing`} />
        <div className="result-stack">
          <div className="result-box">
            <strong>Missing:</strong>{' '}
            {selectedShape.missing.length
              ? selectedShape.missing.map((tone) => `${tone.noteName} ${intervalRoleLabel(tone.interval)}`).join(', ')
              : 'Nothing important missing.'}
            {missingEssentials.length > 0 && (
              <>
                <br />
                <strong>Warning:</strong> essential tones are missing, so this is not the full chord yet.
              </>
            )}
          </div>
          <div className="result-box">
            <strong>Omitted colors:</strong>{' '}
            {selectedShape.omitted.length
              ? selectedShape.omitted.map((tone) => `${tone.noteName} ${intervalRoleLabel(tone.interval)}`).join(', ')
              : 'No optional color tones omitted.'}
          </div>
        </div>

        <h3 className="mini-heading">Try another original pad</h3>
        <div className="suggestion-stack">
          {bestOriginalPadSuggestions.map((suggestion) => (
            <button type="button" className="suggestion" key={suggestion.pad} onClick={() => onOriginalPadChange(suggestion.pad)}>
              <strong>Pad {suggestion.pad}</strong>
              <span>{rankLabel(suggestion.rank)}</span>
              <small>{suggestion.missingCount} missing tones</small>
            </button>
          ))}
        </div>

        <h3 className="mini-heading">Pad retune workarounds</h3>
        <div className="escape-stack">
          {bestPadRetunes.length ? (
            bestPadRetunes.map((plan) => (
              <div className="escape-card" key={plan.id}>
                <strong>{plan.noteName} {plan.intervalLabel}</strong>
                <span>Retune Pad {plan.pad} {plan.semitones > 0 ? '+' : ''}{plan.semitones} st</span>
                <small>{plan.reason}</small>
              </div>
            ))
          ) : (
            <div className="escape-card">
              <strong>No retune workaround needed</strong>
              <span>The current recipe fits the selected window.</span>
            </div>
          )}
        </div>
      </aside>
    </section>
  )
}

interface ChordsViewProps {
  chordRoot: string
  chordQuality: ChordQualityId
  keyRoot: string
  scaleType: ScaleType
  sampleRootMidi: number
  originalPad: PadNumber
  diatonicChords: { id: string; root: string; quality: ChordQualityId; durationTicks: number }[]
  selectedShape: ChordShape
  progressionShapes: { step: ChordStep; shape: ChordShape }[]
  pitchWindow: ReturnType<typeof createPitchWindow>
  chordShapeHighlights: Record<PadNumber, PadHighlight>
  animatedPads: PadNumber[]
  onRootChange: (root: string) => void
  onQualityChange: (quality: ChordQualityId) => void
  onKeyRootChange: (root: string) => void
  onScaleTypeChange: (scaleType: ScaleType) => void
  onSampleRootChange: (midi: number) => void
  onOriginalPadChange: (pad: PadNumber) => void
  onAddChord: (root: string, quality: ChordQualityId) => void
  onMoveChord: (stepId: string, direction: -1 | 1) => void
  onRemoveChord: (stepId: string) => void
  onClearProgression: () => void
  onAnimate: () => void
  onPlayPad: (pad: PadNumber) => void
}

function ChordsView({
  chordRoot,
  chordQuality,
  keyRoot,
  scaleType,
  sampleRootMidi,
  originalPad,
  diatonicChords,
  selectedShape,
  progressionShapes,
  pitchWindow,
  chordShapeHighlights,
  animatedPads,
  onRootChange,
  onQualityChange,
  onKeyRootChange,
  onScaleTypeChange,
  onSampleRootChange,
  onOriginalPadChange,
  onAddChord,
  onMoveChord,
  onRemoveChord,
  onClearProgression,
  onAnimate,
  onPlayPad,
}: ChordsViewProps) {
  const [paletteMode, setPaletteMode] = useState<ChordPaletteMode>('sevenths')
  const sampleNote = midiToNoteName(sampleRootMidi)
  const scaleLabel = getScaleDefinition(scaleType).label
  const degreeChords = diatonicChords.map((step, index) => ({
    ...step,
    quality: degreeQuality(index, scaleType, paletteMode),
  }))
  const playablePads = selectedShape.pads.slice().sort((a, b) => a.pad - b.pad)
  const padRecipe = playablePads.map((pad) => `P${pad.pad}`).join(' + ')
  const missingEssentials = selectedShape.missing.filter((tone) => getChordDefinition(chordQuality).coreIntervals.includes(tone.interval))

  function selectChord(root: string, quality: ChordQualityId) {
    onRootChange(root)
    onQualityChange(quality)
  }

  return (
    <section className="chord-finder-layout">
      <aside className="panel chord-finder-setup">
        <PanelHeader kicker="1. Setup" title="Scale and sample" value={`${keyRoot} ${scaleLabel}`} />
        <Guide title="Choose the musical map">
          <p>Set the track key and scale, then tell the app which note your sample plays and which MPC pad holds the original pitch.</p>
        </Guide>
        <div className="helper-mini-row">
          <ControlRow label="Track key">
            <select value={keyRoot} onChange={(event) => onKeyRootChange(event.target.value)}>
              {ROOT_NOTES.map((note) => (
                <option key={note} value={note}>
                  {note}
                </option>
              ))}
            </select>
          </ControlRow>
          <ControlRow label="Scale">
            <select value={scaleType} onChange={(event) => onScaleTypeChange(event.target.value as ScaleType)}>
              {SCALE_DEFINITIONS.map((scale) => (
                <option key={scale.id} value={scale.id}>
                  {scale.label}
                </option>
              ))}
            </select>
          </ControlRow>
        </div>
        <div className="helper-mini-row">
          <ControlRow label="Sample note">
            <select value={sampleNote} onChange={(event) => onSampleRootChange(noteNameToMidi(event.target.value, 3))}>
              {ROOT_NOTES.map((note) => (
                <option key={note} value={note}>
                  {note}
                </option>
              ))}
            </select>
          </ControlRow>
          <ControlRow label="Original pad">
            <select value={originalPad} onChange={(event) => onOriginalPadChange(Number(event.target.value) as PadNumber)}>
              {PAD_NUMBERS.map((pad) => (
                <option key={pad} value={pad}>
                  Pad {pad}
                </option>
              ))}
            </select>
          </ControlRow>
        </div>
        <StatusStack
          items={[
            { label: 'Window', value: `${midiToNoteWithOctave(pitchWindow.minMidi)} to ${midiToNoteWithOctave(pitchWindow.maxMidi)}` },
            { label: 'Original', value: `${sampleNote} on Pad ${originalPad}` },
          ]}
        />
      </aside>

      <div className="panel chord-finder-palette">
        <PanelHeader kicker="2. Scale degrees" title="1st to 7th chords" value={paletteModeLabel(paletteMode)} />
        <Guide title="Pick a degree, then add it">
          <p>The 1st is home, 4th opens the loop, 5th pulls back home, and 6th is often the emotional move. Tap a degree to see its 16 Levels pads.</p>
        </Guide>
        <div className="mode-strip" aria-label="Chord type">
          {(['triads', 'sevenths', 'colors'] as ChordPaletteMode[]).map((mode) => (
            <button
              type="button"
              key={mode}
              className={paletteMode === mode ? 'mode-button active' : 'mode-button'}
              onClick={() => setPaletteMode(mode)}
            >
              {paletteModeLabel(mode)}
            </button>
          ))}
        </div>
        <div className="chord-palette chord-degree-grid">
          {degreeChords.map((step, index) => {
            const active = step.root === chordRoot && step.quality === chordQuality
            return (
              <button
                type="button"
                key={step.id}
                className={active ? 'chord-chip active' : 'chord-chip'}
                onClick={() => selectChord(step.root, step.quality)}
              >
                <span>{degreeNumber(index)} / {degreeLabel(index, step.quality)}</span>
                <strong>{describeChord(step.root, step.quality)}</strong>
                <small>{degreeUse(index)}</small>
              </button>
            )
          })}
        </div>
      </div>

      <div className="panel chord-finder-pads">
        <PanelHeader kicker="3. Pads" title={padRecipe || 'No playable recipe'} value={rankLabel(selectedShape.rank)} />
        <PadGrid
          selectedShape={selectedShape}
          pitchWindow={pitchWindow}
          padHighlights={chordShapeHighlights}
          highlightMode="chord"
          animatedPads={animatedPads}
          onPlayPad={onPlayPad}
        />
        <div className="pad-actions">
          <button type="button" className="secondary-action" onClick={onAnimate} disabled={playablePads.length === 0}>
            <Music size={18} />
            <span>Flash pads</span>
          </button>
          <button type="button" className="primary-action" onClick={() => onAddChord(chordRoot, chordQuality)} disabled={playablePads.length === 0}>
            <Music size={18} />
            <span>Add {describeChord(chordRoot, chordQuality)}</span>
          </button>
        </div>
      </div>

      <aside className="panel chord-finder-recipe">
        <PanelHeader kicker="4. Recipe" title={describeChord(chordRoot, chordQuality)} value={padRecipe || 'Try retune'} />
        <div className="result-stack">
          <div className="result-box">
            <strong>Press:</strong> {padRecipe || 'No pads fit this chord in the current 16 Levels window.'}
            <br />
            <strong>Shape:</strong> {selectedShape.inversion}
            <br />
            <strong>Rank:</strong> {rankLabel(selectedShape.rank)}
          </div>
          <div className="pitch-list">
            {playablePads.map((pad) => (
              <div className="pitch-row" key={`${pad.pad}-${pad.midi}`}>
                <span>Pad {pad.pad}: {midiToNoteWithOctave(pad.midi)}</span>
                <span className="pill">{intervalRoleLabel(pad.interval)}</span>
              </div>
            ))}
          </div>
          {missingEssentials.length > 0 && (
            <div className="result-box warning-box">
              <strong>Missing:</strong> {missingEssentials.map((tone) => `${tone.noteName} ${intervalRoleLabel(tone.interval)}`).join(', ')}. Try another original pad above or check the 16 Levels page.
            </div>
          )}
        </div>
        <h3 className="mini-heading">Custom chord</h3>
        <ControlRow label="Root">
          <select value={chordRoot} onChange={(event) => onRootChange(event.target.value)}>
            {ROOT_NOTES.map((note) => (
              <option key={note} value={note}>
                {note}
              </option>
            ))}
          </select>
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
      </aside>

      <div className="panel chord-finder-progression">
        <PanelHeader kicker="5. Progression pads" title="Selected chords" value={`${progressionShapes.length} chords`} />
        <Guide title="Play the progression on the MPC">
          <p>Each row is one chord in order. Set 16 Levels the same way, then press the listed pads for each chord.</p>
        </Guide>
        {progressionShapes.length === 0 ? (
          <div className="empty-state">
            Choose a 1st-7th chord, then tap the Add button under the pads to start a progression recipe.
          </div>
        ) : (
          <div className="progression-recipe-list">
            {progressionShapes.map(({ step, shape }, index) => (
              <div className={`progression-recipe ${rankClass(shape.rank)}`} key={step.id}>
                <div className="progression-info">
                  <span className="progression-index">{index + 1}</span>
                  <strong>{describeChord(step.root, step.quality)}</strong>
                  <small>{shape.inversion} / {rankLabel(shape.rank)}</small>
                </div>
                <b>{shape.pads.length ? shape.pads.map((pad) => `P${pad.pad}`).join(' + ') : 'retune'}</b>
                <div className="progression-actions">
                  <button type="button" className="secondary-action compact-action" onClick={() => onMoveChord(step.id, -1)} disabled={index === 0}>
                    Up
                  </button>
                  <button type="button" className="secondary-action compact-action" onClick={() => onMoveChord(step.id, 1)} disabled={index === progressionShapes.length - 1}>
                    Down
                  </button>
                  <button type="button" className="secondary-action compact-action" onClick={() => onRemoveChord(step.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {progressionShapes.length > 0 && (
          <button type="button" className="secondary-action" onClick={onClearProgression}>
            Clear progression
          </button>
        )}
      </div>
    </section>
  )
}

function degreeLabel(index: number, quality: ChordQualityId): string {
  const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
  const base = numerals[index] ?? `${index + 1}`
  if (quality === 'dim') return `${base.toLowerCase()}dim`
  if (quality.includes('min')) return base.toLowerCase()
  return base
}

function degreeNumber(index: number): string {
  return ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'][index] ?? `${index + 1}th`
}

function degreeUse(index: number): string {
  return ['home', 'passing', 'color', 'fourth', 'fifth', 'relative', 'turnaround'][index] ?? 'color'
}

function paletteModeLabel(mode: ChordPaletteMode): string {
  if (mode === 'triads') return 'Triads'
  if (mode === 'colors') return 'Color chords'
  return '7ths'
}

function degreeQuality(index: number, scaleType: ScaleType, mode: ChordPaletteMode): ChordQualityId {
  const minorishScales: ScaleType[] = ['minor', 'minorPent', 'blues', 'dorian', 'phrygian']
  const isMinorish = minorishScales.includes(scaleType)

  if (mode === 'triads') {
    const majorTriads: ChordQualityId[] = ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim']
    const minorTriads: ChordQualityId[] = ['min', 'dim', 'maj', 'min', 'min', 'maj', 'maj']
    return (isMinorish ? minorTriads : majorTriads)[index] ?? 'maj'
  }

  if (mode === 'colors') {
    const majorColors: ChordQualityId[] = ['maj9', 'min7', 'min7', 'maj9', 'dom13', 'min9', 'dim']
    const minorColors: ChordQualityId[] = ['min9', 'dim', 'maj7', 'min11', 'min7', 'maj9', 'dom9']
    return (isMinorish ? minorColors : majorColors)[index] ?? 'maj7'
  }

  const majorSevenths: ChordQualityId[] = ['maj7', 'min7', 'min7', 'maj7', 'dom7', 'min7', 'dim']
  const minorSevenths: ChordQualityId[] = ['min7', 'dim', 'maj7', 'min7', 'min7', 'maj7', 'dom7']
  return (isMinorish ? minorSevenths : majorSevenths)[index] ?? 'maj7'
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
          <p>Templates give you a quick pocket. Use Play groove to hear it, then copy the feel onto the MPC by hand.</p>
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
      </aside>
    </section>
  )
}

function positiveInterval(interval: number): number {
  return ((interval % 12) + 12) % 12
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
        <PanelHeader kicker="Reality check" title="Current scope" value="No export" />
        <StatusStack
          items={[
            { label: 'MPC workflow', value: 'Use pad recipes and repitch notes by hand' },
            { label: 'Browser role', value: 'Audition chords, scales, grooves, and one-shot pitches' },
            { label: 'Future transfer', value: 'Parked until the core helper feels excellent' },
          ]}
        />
      </div>
    </section>
  )
}

interface PadGridProps {
  selectedShape: ChordShape
  pitchWindow: ReturnType<typeof createPitchWindow>
  padHighlights?: Record<PadNumber, PadHighlight>
  highlightMode?: 'scale' | 'chord' | 'all'
  animatedPads?: PadNumber[]
  onPlayPad: (pad: PadNumber) => void
}

function PadGrid({ selectedShape, pitchWindow, padHighlights, highlightMode = 'chord', animatedPads = [], onPlayPad }: PadGridProps) {
  const activePads = new Map(selectedShape.pads.map((pad) => [pad.pad, pad]))

  return (
    <div className="pad-grid">
      {PAD_NUMBERS.map((pad) => {
        const active = activePads.get(pad)
        const midi = padToMidi(pitchWindow.sampleRootMidi, pitchWindow.originalPitchPad, pad)
        const highlight = padHighlights?.[pad]
        const shouldShowScale = highlightMode === 'scale' || highlightMode === 'all'
        const shouldShowChord = highlightMode === 'chord' || highlightMode === 'all'
        const classes = [
          'mpc-pad',
          active && !padHighlights ? 'active' : '',
          active && !padHighlights ? `interval-${active.interval}` : '',
          highlight?.isOriginal ? 'original' : '',
          shouldShowScale && highlight?.isSafe ? 'safe' : '',
          highlight?.isRoot ? 'root' : '',
          shouldShowChord && highlight?.isChord ? 'chord' : '',
          animatedPads.includes(pad) ? 'pulse' : '',
        ]
          .filter(Boolean)
          .join(' ')
        const offset = midi - pitchWindow.sampleRootMidi
        const meta = pad === pitchWindow.originalPitchPad ? 'Original' : `${offset > 0 ? '+' : ''}${offset} st`
        return (
          <button
            type="button"
            className={classes}
            key={pad}
            onClick={() => onPlayPad(pad)}
          >
            <span className="pad-number">{pad}</span>
            <strong>{midiToNoteName(midi)}</strong>
            <small>{highlight?.chordRole && shouldShowChord ? highlight.chordRole : meta}</small>
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
