import { useState, useEffect, useCallback } from 'react';
import { getAppInfo, getHermesStatus } from './api/commands';
import type { AppInfo } from './types';
import Welcome from './screens/Welcome';
import Setup from './screens/Setup';
import Install from './screens/Install';
import Chat from './screens/Chat';
import Sessions from './screens/Sessions';
import Agents from './screens/Agents';
import Models from './screens/Models';
import Skills from './screens/Skills';
import Tools from './screens/Tools';
import Memory from './screens/Memory';
import Soul from './screens/Soul';
import Gateway from './screens/Gateway';
import Schedules from './screens/Schedules';
import Kanban from './screens/Kanban';
import Office from './screens/Office';
import Settings from './screens/Settings';
import Layout from './components/Layout';
import './App.css';

type Screen =
  | 'welcome' | 'setup' | 'install'
  | 'chat' | 'sessions' | 'agents'
  | 'models' | 'skills' | 'tools'
  | 'memory' | 'soul' | 'gateway'
  | 'schedules' | 'kanban' | 'office'
  | 'settings';

type AnyScreen = (props: any) => React.ReactNode;

const screenComponents: Record<Screen, AnyScreen> = {
  welcome: Welcome as AnyScreen,
  setup: Setup as AnyScreen,
  install: Install as AnyScreen,
  chat: Chat as AnyScreen,
  sessions: Sessions as AnyScreen,
  agents: Agents as AnyScreen,
  models: Models as AnyScreen,
  skills: Skills as AnyScreen,
  tools: Tools as AnyScreen,
  memory: Memory as AnyScreen,
  soul: Soul as AnyScreen,
  gateway: Gateway as AnyScreen,
  schedules: Schedules as AnyScreen,
  kanban: Kanban as AnyScreen,
  office: Office as AnyScreen,
  settings: Settings as AnyScreen,
};

function App() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [hermesStatus, setHermesStatus] = useState<string>('stopped');
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAppInfo()
      .then((info) => {
        setAppInfo(info);
        if (info.hermes_installed) {
          setCurrentScreen('chat');
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!appInfo?.hermes_installed) return;
    const interval = setInterval(() => {
      getHermesStatus()
        .then(setHermesStatus)
        .catch(() => {});
    }, 5000);
    getHermesStatus().then(setHermesStatus).catch(() => {});
    return () => clearInterval(interval);
  }, [appInfo?.hermes_installed]);

  const handleNavigate = useCallback((screen: Screen) => {
    setCurrentScreen(screen);
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading" />
        <p>Loading Hermes Desktop…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <h2>Failed to load</h2>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  if (!appInfo?.hermes_installed && currentScreen === 'welcome') {
    return <Welcome onNavigate={handleNavigate} />;
  }

  const ScreenComponent = screenComponents[currentScreen];

  return (
    <Layout
      currentScreen={currentScreen}
      hermesStatus={hermesStatus}
      onNavigate={handleNavigate}
    >
      <ScreenComponent onNavigate={handleNavigate} />
    </Layout>
  );
}

export default App;
