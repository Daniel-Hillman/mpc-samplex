import { Link } from 'react-router-dom';
import { Layers, Music, Piano, Cpu, ArrowRight, Disc3 } from 'lucide-react';
import { useGrooveStore } from '../store/grooveStore';
import { useMidi } from '../hooks/useMidi';
import { toast } from '../store/toastStore';

const TOOLS = [
  { to: '/groove', icon: Layers, name: 'Groove editor', desc: '16-step drum sequencer with live MIDI out and swing.' },
  { to: '/chords', icon: Music, name: 'Chord generator', desc: 'Build voicings, audition them, arrange progressions.' },
  { to: '/scale', icon: Piano, name: 'Scale helper', desc: 'Explore scales and map them onto your 16 pads.' },
  { to: '/mpc', icon: Cpu, name: 'MPC helper', desc: 'Pad maps, channel routing, tempo maths, device debug.' },
];

function HeroGrid() {
  // Ambient 8×4 pulsing pad grid behind the hero text
  const cells = Array.from({ length: 32 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -right-6 top-1/2 grid -translate-y-1/2 grid-cols-8 gap-2 opacity-60">
        {cells.map((i) => (
          <span
            key={i}
            className="h-7 w-7 rounded"
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              animation: `hero-pulse ${2.2 + (i % 5) * 0.7}s ease-in-out ${(i % 8) * 0.18}s infinite`,
              ...( [3, 9, 14, 20, 27].includes(i)
                ? { background: 'var(--color-accent-dim)', border: '1px solid var(--color-accent)' }
                : {}),
            }}
          />
        ))}
      </div>
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(90deg, var(--color-surface) 35%, transparent 85%)' }}
      />
    </div>
  );
}

export default function Dashboard() {
  const bpm = useGrooveStore((s) => s.bpm);
  const activePatternName = useGrooveStore((s) => s.activePatternName);
  const savedPatterns = useGrooveStore((s) => s.savedPatterns);
  const loadPattern = useGrooveStore((s) => s.loadPattern);
  const isPlaying = useGrooveStore((s) => s.isPlaying);
  const { status, outputs, selectedOutputId } = useMidi();

  const device = outputs.find((o) => o.id === selectedOutputId);
  const recent = Object.entries(savedPatterns)
    .sort((a, b) => (b[1].savedAt || 0) - (a[1].savedAt || 0))
    .slice(0, 5);

  const stats = [
    {
      label: 'Active pattern',
      value: activePatternName || 'Unsaved',
      detail: isPlaying ? 'playing' : 'stopped',
      color: isPlaying ? 'var(--color-success)' : 'var(--color-text-muted)',
    },
    { label: 'Tempo', value: `${bpm} BPM`, detail: 'global', color: 'var(--color-accent)' },
    {
      label: 'MIDI device',
      value: device ? device.name : 'No device',
      detail: status,
      color: device ? 'var(--color-success)' : 'var(--color-warning)',
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Hero */}
      <section className="panel relative overflow-hidden px-5 py-8 sm:px-8 sm:py-12">
        <HeroGrid />
        <div className="relative">
          <h1 className="font-mono text-2xl font-extrabold tracking-tight sm:text-3xl">
            MPC&nbsp;<span style={{ color: 'var(--color-accent)' }}>STUDIO</span>
          </h1>
          <p className="mt-2 font-mono text-sm tracking-[0.2em] text-text-secondary">
            midi tools for the mpc sample
          </p>
        </div>
      </section>

      {/* Quick stats */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="panel p-4">
            <div className="panel-title mb-2">{s.label}</div>
            <div className="truncate font-mono text-lg font-bold">{s.value}</div>
            <div className="mt-1 font-mono text-xs" style={{ color: s.color }}>
              {s.detail}
            </div>
          </div>
        ))}
      </section>

      {/* Quick launch */}
      <section>
        <h2 className="panel-title mb-3">Tools</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {TOOLS.map(({ to, icon: Icon, name, desc }) => (
            <Link
              key={to}
              to={to}
              className="panel group flex flex-col gap-3 p-5 transition-colors hover:border-[var(--color-accent)]"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-md transition-shadow group-hover:pad-glow"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-bright)' }}
              >
                <Icon size={18} style={{ color: 'var(--color-accent)' }} />
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-mono text-base font-bold">
                  {name}
                  <ArrowRight size={14} className="opacity-0 transition-opacity group-hover:opacity-100" style={{ color: 'var(--color-accent)' }} />
                </div>
                <p className="mt-1 text-sm leading-snug text-text-secondary">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent patterns */}
      <section>
        <h2 className="panel-title mb-3">Recent patterns</h2>
        {recent.length ? (
          <div className="panel divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {recent.map(([name, snap]) => (
              <div
                key={name}
                className="flex items-center gap-4 px-5 py-3"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <Disc3 size={16} style={{ color: 'var(--color-accent-dim)' }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-sm font-semibold">{name}</div>
                  <div className="font-mono text-xs text-text-muted">
                    {snap.bpm} BPM · swing {snap.swing}%
                    {snap.savedAt ? ` · ${new Date(snap.savedAt).toLocaleDateString()}` : ''}
                  </div>
                </div>
                <Link
                  to="/groove"
                  className="btn"
                  onClick={() => {
                    loadPattern(name);
                    toast.info(`Loaded "${name}"`);
                  }}
                >
                  Load
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="panel flex flex-col items-center gap-3 border-dashed px-5 py-10 text-center">
            <p className="font-mono text-sm text-text-muted">No saved patterns yet.</p>
            <Link to="/groove" className="btn btn-accent">
              Open the Groove editor
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
