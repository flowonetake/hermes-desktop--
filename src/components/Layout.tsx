import type { ReactNode } from 'react';

type Screen =
  | 'welcome' | 'setup' | 'install'
  | 'chat' | 'sessions' | 'agents'
  | 'models' | 'skills' | 'tools'
  | 'memory' | 'soul' | 'gateway'
  | 'schedules' | 'kanban' | 'office'
  | 'settings';

interface NavItem {
  screen: Screen;
  label: string;
  icon: string;
  group: string;
}

const navItems: NavItem[] = [
  { screen: 'chat', label: 'Chat', icon: '\u{1F4AC}', group: 'main' },
  { screen: 'sessions', label: 'Sessions', icon: '\u{1F4CB}', group: 'main' },
  { screen: 'agents', label: 'Agents', icon: '\u{1F916}', group: 'main' },
  { screen: 'models', label: 'Models', icon: '\u{1F9E0}', group: 'config' },
  { screen: 'skills', label: 'Skills', icon: '\u{1F4E6}', group: 'config' },
  { screen: 'tools', label: 'Tools', icon: '\u{1F527}', group: 'config' },
  { screen: 'memory', label: 'Memory', icon: '\u{1F5C3}', group: 'config' },
  { screen: 'soul', label: 'Soul', icon: '\u{1F4A0}', group: 'config' },
  { screen: 'gateway', label: 'Gateway', icon: '\u{1F310}', group: 'config' },
  { screen: 'schedules', label: 'Schedules', icon: '\u{23F0}', group: 'config' },
  { screen: 'kanban', label: 'Kanban', icon: '\u{1F4D1}', group: 'config' },
  { screen: 'office', label: 'Office', icon: '\u{1F3E2}', group: 'config' },
  { screen: 'settings', label: 'Settings', icon: '\u2699\uFE0F', group: 'bottom' },
];

interface LayoutProps {
  currentScreen: Screen;
  hermesStatus: string;
  onNavigate: (screen: Screen) => void;
  children: ReactNode;
}

export default function Layout({ currentScreen, hermesStatus, onNavigate, children }: LayoutProps) {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">H</div>
          <h1>Hermes</h1>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.screen}
              className={`sidebar-item${currentScreen === item.screen ? ' active' : ''}`}
              onClick={() => onNavigate(item.screen)}
            >
              <span className="icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
            <span className={`status-dot ${hermesStatus === 'running' ? 'running' : 'stopped'}`} />
            {hermesStatus === 'running' ? 'Running' : 'Stopped'}
          </div>
        </div>
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
