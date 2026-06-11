import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import ToastContainer from './components/ui/Toast';
import ErrorBoundary from './components/ui/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import GrooveEditor from './pages/GrooveEditor';
import ChordGenerator from './pages/ChordGenerator';
import ScaleHelper from './pages/ScaleHelper';
import MpcSampleHelper from './pages/MpcSampleHelper';
import Settings from './pages/Settings';
import { enableMidi } from './lib/midi';
import { useMidiStore } from './store/midiStore';

function FallbackBanner() {
  const status = useMidiStore((s) => s.status);
  if (status !== 'unavailable') return null;
  return (
    <div
      className="border-b px-5 py-2 font-mono text-xs"
      style={{
        background: 'rgba(255, 159, 10, 0.08)',
        borderColor: 'var(--color-warning)',
        color: 'var(--color-warning)',
      }}
      role="alert"
    >
      Live MIDI output requires Chrome or Edge. Chords and scales still play through browser sound, and Export .mid
      gets patterns onto your MPC.
    </div>
  );
}

export default function App() {
  // WebMIDI initialised once on app mount
  useEffect(() => {
    enableMidi();
  }, []);

  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <FallbackBanner />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/groove" element={<GrooveEditor />} />
              <Route path="/chords" element={<ChordGenerator />} />
              <Route path="/scale" element={<ScaleHelper />} />
              <Route path="/mpc" element={<MpcSampleHelper />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
