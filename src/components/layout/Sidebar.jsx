import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, Music, Piano, Layers, Cpu, Settings, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/groove', label: 'Groove', icon: Layers },
  { to: '/chords', label: 'Chords', icon: Music },
  { to: '/scale', label: 'Scale', icon: Piano },
  { to: '/mpc', label: 'MPC', icon: Cpu },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1280);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 1280) setCollapsed(true);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const width = collapsed ? 64 : 220;

  const linkCls = ({ isActive }) =>
    `flex items-center gap-3 rounded px-3 py-2.5 font-mono text-sm transition-colors ${
      isActive ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'
    }`;

  const linkStyle = ({ isActive }) => ({
    background: isActive ? 'var(--color-surface-2)' : 'transparent',
    borderLeft: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
  });

  return (
    <aside
      className="flex shrink-0 flex-col border-r transition-all duration-200"
      style={{ width, borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b px-4" style={{ borderColor: 'var(--color-border)' }}>
        <div
          className="grid h-7 w-7 shrink-0 grid-cols-2 gap-[3px] rounded p-[5px]"
          style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border-bright)' }}
          aria-hidden="true"
        >
          <span className="rounded-[2px]" style={{ background: 'var(--color-accent)' }} />
          <span className="rounded-[2px]" style={{ background: 'var(--color-border)' }} />
          <span className="rounded-[2px]" style={{ background: 'var(--color-border)' }} />
          <span className="rounded-[2px]" style={{ background: 'var(--color-accent)' }} />
        </div>
        {!collapsed && (
          <span className="font-mono text-sm font-bold tracking-widest" style={{ color: 'var(--color-text-primary)' }}>
            MPC&nbsp;STUDIO
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 p-2.5" aria-label="Main navigation">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={linkCls} style={linkStyle} title={label}>
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}

        <div className="my-2 h-px" style={{ background: 'var(--color-border)' }} />

        <NavLink to="/settings" className={linkCls} style={linkStyle} title="Settings">
          <Settings size={18} className="shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>
      </nav>

      {/* Collapse toggle */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="m-2.5 flex items-center justify-center gap-2 rounded border py-2 font-mono text-xs text-text-secondary hover:text-text-primary"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}
      >
        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
}
