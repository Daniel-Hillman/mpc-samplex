import { useRef } from 'react';
import { Download, Upload, Trash2 } from 'lucide-react';
import { useMidi } from '../hooks/useMidi';
import { useGrooveStore } from '../store/grooveStore';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { LS_KEYS, DEFAULT_PAD_MAPPING, DEFAULT_BPM, DEFAULT_VELOCITY } from '../lib/constants';
import { midiNoteToName } from '../lib/music-theory';
import { exportPatternsAsJson } from '../lib/export';
import { toast } from '../store/toastStore';
import DeviceSelector from '../components/ui/DeviceSelector';

export default function Settings() {
  const { midiChannel, setMidiChannel, selectedOutputId } = useMidi();
  const savedPatterns = useGrooveStore((s) => s.savedPatterns);
  const importPatterns = useGrooveStore((s) => s.importPatterns);
  const clearAllData = useGrooveStore((s) => s.clearAllData);
  const [settings, setSettings] = useLocalStorage(LS_KEYS.settings, {});
  const fileRef = useRef(null);

  const update = (patch) => {
    setSettings((s) => ({ ...s, ...patch }));
  };

  const saveMidiDefaults = () => {
    update({ defaultOutputId: selectedOutputId, defaultChannel: midiChannel });
    toast.success('MIDI defaults saved — applied on next load');
  };

  const grooveDefaults = settings.grooveDefaults || DEFAULT_PAD_MAPPING.map((p) => ({ label: p.label, midiNote: p.midiNote }));

  const setRowDefault = (idx, patch) => {
    const next = grooveDefaults.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    update({ grooveDefaults: next });
  };

  const onImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (typeof data !== 'object' || Array.isArray(data) || !data) throw new Error('bad shape');
        const count = importPatterns(data);
        toast.success(`Imported ${count} pattern${count === 1 ? '' : 's'}`);
      } catch {
        toast.error('Invalid patterns file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const onClearAll = () => {
    if (!window.confirm('Delete all saved patterns, settings and pad maps? This cannot be undone.')) return;
    clearAllData();
    setSettings({});
    toast.info('All local data cleared');
  };

  return (
    <div className="flex max-w-4xl flex-col gap-5 p-4 sm:p-6">
      <div>
        <h1 className="font-mono text-xl font-bold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-sm text-text-secondary">Defaults are stored locally and applied when the app loads.</p>
      </div>

      {/* MIDI */}
      <section className="panel p-5">
        <h2 className="panel-title mb-4">MIDI device</h2>
        <div className="flex flex-wrap items-end gap-5">
          <div>
            <span className="mb-1.5 block font-mono text-xs text-text-muted">Output</span>
            <DeviceSelector />
          </div>
          <div>
            <span className="mb-1.5 block font-mono text-xs text-text-muted">Channel</span>
            <select
              className="select"
              value={midiChannel}
              onChange={(e) => setMidiChannel(Number(e.target.value))}
              aria-label="Default MIDI channel"
            >
              {Array.from({ length: 16 }, (_, i) => i + 1).map((ch) => (
                <option key={ch} value={ch}>
                  Channel {ch}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="btn btn-accent" onClick={saveMidiDefaults}>
            Save as default
          </button>
        </div>
      </section>

      {/* BPM + velocity */}
      <section className="panel p-5">
        <h2 className="panel-title mb-4">Defaults on load</h2>
        <div className="flex flex-wrap items-end gap-5">
          <div>
            <span className="mb-1.5 block font-mono text-xs text-text-muted">Default BPM (60–200)</span>
            <input
              type="number"
              min={60}
              max={200}
              className="input w-24 text-center"
              value={settings.defaultBpm ?? DEFAULT_BPM}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v)) update({ defaultBpm: Math.max(60, Math.min(200, v)) });
              }}
              aria-label="Default BPM"
            />
          </div>
          <div>
            <span className="mb-1.5 block font-mono text-xs text-text-muted">Default step velocity (1–127)</span>
            <input
              type="number"
              min={1}
              max={127}
              className="input w-24 text-center"
              value={settings.defaultVelocity ?? DEFAULT_VELOCITY}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v)) update({ defaultVelocity: Math.max(1, Math.min(127, v)) });
              }}
              aria-label="Default velocity"
            />
          </div>
        </div>
      </section>

      {/* Groove row defaults */}
      <section className="panel p-5">
        <h2 className="panel-title mb-4">Groove row defaults</h2>
        <p className="mb-3 text-sm text-text-secondary">
          Labels and MIDI notes used when the Groove editor starts fresh or the grid is reset.
        </p>
        <div className="grid grid-cols-1 gap-x-8 gap-y-2 lg:grid-cols-2">
          {grooveDefaults.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 font-mono text-xs text-text-muted">{i + 1}</span>
              <input
                className="input h-9 flex-1 text-xs"
                value={row.label}
                onChange={(e) => setRowDefault(i, { label: e.target.value })}
                aria-label={`Default label for row ${i + 1}`}
              />
              <input
                type="number"
                min={0}
                max={127}
                className="input h-9 w-16 text-center text-xs"
                value={row.midiNote}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v)) setRowDefault(i, { midiNote: Math.max(0, Math.min(127, v)) });
                }}
                aria-label={`Default MIDI note for row ${i + 1}`}
              />
              <span className="w-10 font-mono text-[10px] text-text-muted">{midiNoteToName(row.midiNote)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Data */}
      <section className="panel p-5">
        <h2 className="panel-title mb-4">Data</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-info"
            onClick={() => {
              if (!Object.keys(savedPatterns).length) {
                toast.warning('No saved patterns to export');
                return;
              }
              exportPatternsAsJson(savedPatterns);
              toast.success('Patterns exported as JSON');
            }}
          >
            <Download size={14} /> Export patterns (JSON)
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            <Upload size={14} /> Import patterns
          </button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onImportFile} />
          <button type="button" className="btn btn-danger-outline ml-auto" onClick={onClearAll}>
            <Trash2 size={14} /> Clear all saved data
          </button>
        </div>
        <p className="mt-3 font-mono text-[11px] text-text-muted">
          {Object.keys(savedPatterns).length} pattern{Object.keys(savedPatterns).length === 1 ? '' : 's'} stored in this
          browser.
        </p>
      </section>
    </div>
  );
}
