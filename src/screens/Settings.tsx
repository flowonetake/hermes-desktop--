import { useState, useEffect } from 'react';
import {
  getConfig, setConfig, setEnv, getAllEnv,
  getAppInfo, backupData, importData, openLogsDir, checkUpdate
} from '../api/commands';
import type { AppInfo } from '../types';

const TABS = ['Provider', 'Network', 'Data', 'Logs', 'About', 'Theme'] as const;

export default function Settings() {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Provider');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');

  const [proxyUrl, setProxyUrl] = useState('');
  const [port, setPort] = useState('8080');

  const [logs] = useState<string[]>([]);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [updateInfo, setUpdateInfo] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const [saving, setSaving] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [p, bk, bu, envs, info, ver] = await Promise.all([
          getConfig('llm.provider'),
          getConfig('llm.base_url'),
          getConfig('network.proxy_url'),
          getAllEnv(),
          getAppInfo(),
          getConfig('theme.mode').catch(() => 'dark'),
        ]);
        setProvider(p || 'openai');
        setBaseUrl(bk || '');
        setProxyUrl(bu || '');
        setApiKey(envs['LLM_API_KEY'] || '');
        setAppInfo(info);
        setTheme(ver === 'light' ? 'light' : 'dark');
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleSaveProvider = async () => {
    setSaving('provider');
    setError('');
    try {
      await setConfig('llm.provider', provider);
      await setConfig('llm.base_url', baseUrl);
      if (apiKey) await setEnv('LLM_API_KEY', apiKey);
      showSuccess('Provider settings saved');
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving('');
    }
  };

  const handleSaveNetwork = async () => {
    setSaving('network');
    setError('');
    try {
      await setConfig('network.proxy_url', proxyUrl);
      await setConfig('network.port', port);
      showSuccess('Network settings saved');
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving('');
    }
  };

  const handleBackup = async () => {
    setSaving('backup');
    setError('');
    try {
      const path = await backupData();
      showSuccess(`Backup saved to ${path}`);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving('');
    }
  };

  const handleRestore = async () => {
    setSaving('restore');
    setError('');
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const file = await open({ filters: [{ name: 'Backup', extensions: ['zip', 'tar.gz'] }] });
      if (file) {
        await importData(file as string);
        showSuccess('Data restored successfully');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving('');
    }
  };

  const handleOpenLogs = async () => {
    try {
      await openLogsDir();
    } catch (err) {
      setError(String(err));
    }
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setError('');
    try {
      const result = await checkUpdate();
      setUpdateInfo(result || 'You are up to date!');
    } catch (err) {
      setError(String(err));
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleThemeToggle = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    try {
      await setConfig('theme.mode', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    } catch {}
  };

  const tabContent = (tab: typeof TABS[number]) => {
    switch (tab) {
      case 'Provider':
        return (
          <div>
            <h3 style={{ margin: '0 0 16px', color: 'var(--text-h)', fontSize: '16px' }}>Provider Settings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text)', marginBottom: '4px' }}>Provider</label>
                <select value={provider} onChange={e => setProvider(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                    background: 'var(--bg)', color: 'var(--text-h)', fontSize: '14px', boxSizing: 'border-box'
                  }}>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google / Gemini</option>
                  <option value="xai">xAI / Grok</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="local">Local</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text)', marginBottom: '4px' }}>Base URL</label>
                <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                    background: 'var(--bg)', color: 'var(--text-h)', fontSize: '14px', boxSizing: 'border-box'
                  }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text)', marginBottom: '4px' }}>API Key</label>
                <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                    background: 'var(--bg)', color: 'var(--text-h)', fontSize: '14px', boxSizing: 'border-box'
                  }} />
              </div>
              <button onClick={handleSaveProvider}
                style={{
                  padding: '10px 20px', borderRadius: '6px', border: 'none',
                  background: saving === 'provider' ? 'var(--code-bg)' : 'var(--accent)',
                  color: saving === 'provider' ? 'var(--text)' : '#fff',
                  cursor: 'pointer', fontWeight: 600, fontSize: '14px', alignSelf: 'flex-start'
                }}>
                {saving === 'provider' ? 'Saving...' : 'Save Provider Settings'}
              </button>
            </div>
          </div>
        );

      case 'Network':
        return (
          <div>
            <h3 style={{ margin: '0 0 16px', color: 'var(--text-h)', fontSize: '16px' }}>Network Settings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text)', marginBottom: '4px' }}>Proxy URL</label>
                <input value={proxyUrl} onChange={e => setProxyUrl(e.target.value)}
                  placeholder="http://proxy:8080 (leave empty for none)"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                    background: 'var(--bg)', color: 'var(--text-h)', fontSize: '14px', boxSizing: 'border-box'
                  }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text)', marginBottom: '4px' }}>Port</label>
                <input value={port} onChange={e => setPort(e.target.value)}
                  placeholder="8080"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                    background: 'var(--bg)', color: 'var(--text-h)', fontSize: '14px', boxSizing: 'border-box'
                  }} />
              </div>
              <button onClick={handleSaveNetwork}
                style={{
                  padding: '10px 20px', borderRadius: '6px', border: 'none',
                  background: saving === 'network' ? 'var(--code-bg)' : 'var(--accent)',
                  color: saving === 'network' ? 'var(--text)' : '#fff',
                  cursor: 'pointer', fontWeight: 600, fontSize: '14px', alignSelf: 'flex-start'
                }}>
                {saving === 'network' ? 'Saving...' : 'Save Network Settings'}
              </button>
            </div>
          </div>
        );

      case 'Data':
        return (
          <div>
            <h3 style={{ margin: '0 0 16px', color: 'var(--text-h)', fontSize: '16px' }}>Data Management</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text)', margin: 0 }}>
                Backup your conversations, settings, and profiles.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleBackup}
                  style={{
                    padding: '10px 20px', borderRadius: '6px', border: 'none',
                    background: saving === 'backup' ? 'var(--code-bg)' : 'var(--accent)',
                    color: saving === 'backup' ? 'var(--text)' : '#fff',
                    cursor: 'pointer', fontWeight: 600, fontSize: '14px'
                  }}>
                  {saving === 'backup' ? 'Backing up...' : 'Backup Data'}
                </button>
                <button onClick={handleRestore}
                  style={{
                    padding: '10px 20px', borderRadius: '6px', border: '1px solid var(--border)',
                    background: saving === 'restore' ? 'var(--code-bg)' : 'var(--bg)',
                    color: saving === 'restore' ? 'var(--text)' : 'var(--text-h)',
                    cursor: 'pointer', fontWeight: 600, fontSize: '14px'
                  }}>
                  {saving === 'restore' ? 'Restoring...' : 'Restore Data'}
                </button>
              </div>
              <div style={{
                marginTop: '16px', padding: '16px', borderRadius: '8px',
                border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)'
              }}>
                <p style={{ fontSize: '12px', color: '#ef4444', margin: 0 }}>
                  Warning: Clear all data including sessions, profiles, and settings. This cannot be undone.
                </p>
              </div>
            </div>
          </div>
        );

      case 'Logs':
        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-h)', fontSize: '16px' }}>Application Logs</h3>
              <button onClick={handleOpenLogs}
                style={{
                  padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)',
                  background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: '13px'
                }}>Open Logs Folder</button>
            </div>
            <div style={{
              background: '#0d1117', color: '#e6edf3', padding: '16px', borderRadius: '8px',
              fontFamily: 'var(--mono)', fontSize: '12px', lineHeight: '1.6',
              maxHeight: '400px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all'
            }}>
              {logs.length === 0 ? (
                <span style={{ color: '#8b949e' }}>No logs loaded. Open the logs folder to view log files.</span>
              ) : (
                logs.map((l, i) => <div key={i}>{l}</div>)
              )}
            </div>
          </div>
        );

      case 'About':
        return (
          <div>
            <h3 style={{ margin: '0 0 16px', color: 'var(--text-h)', fontSize: '16px' }}>About Hermes Desktop</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
              {appInfo && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                  <div><strong style={{ color: 'var(--text-h)' }}>Version:</strong> <span style={{ color: 'var(--text)' }}>{appInfo.version}</span></div>
                  <div><strong style={{ color: 'var(--text-h)' }}>OS:</strong> <span style={{ color: 'var(--text)' }}>{appInfo.os}</span></div>
                  <div><strong style={{ color: 'var(--text-h)' }}>Hermes Installed:</strong>
                    <span style={{ color: appInfo.hermes_installed ? '#22c55e' : '#ef4444', marginLeft: '8px' }}>
                      {appInfo.hermes_installed ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div><strong style={{ color: 'var(--text-h)' }}>Active Profile:</strong> <span style={{ color: 'var(--text)' }}>{appInfo.active_profile || 'None'}</span></div>
                  <div><strong style={{ color: 'var(--text-h)' }}>Sessions:</strong> <span style={{ color: 'var(--text)' }}>{appInfo.sessions_count}</span></div>
                </div>
              )}

              <div style={{ marginTop: '12px' }}>
                <button onClick={handleCheckUpdate} disabled={checkingUpdate}
                  style={{
                    padding: '10px 20px', borderRadius: '6px', border: 'none',
                    background: checkingUpdate ? 'var(--code-bg)' : 'var(--accent)',
                    color: checkingUpdate ? 'var(--text)' : '#fff',
                    cursor: checkingUpdate ? 'default' : 'pointer',
                    fontWeight: 600, fontSize: '14px'
                  }}>
                  {checkingUpdate ? 'Checking...' : 'Check for Updates'}
                </button>
                {updateInfo && (
                  <p style={{ marginTop: '8px', fontSize: '13px', color: updateInfo === 'You are up to date!' ? '#22c55e' : 'var(--text)' }}>
                    {updateInfo}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 'Theme':
        return (
          <div>
            <h3 style={{ margin: '0 0 16px', color: 'var(--text-h)', fontSize: '16px' }}>Theme Settings</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '14px', color: 'var(--text)' }}>Current theme: <strong style={{ color: 'var(--text-h)', textTransform: 'capitalize' }}>{theme}</strong></span>
              <button onClick={handleThemeToggle}
                style={{
                  padding: '12px 24px', borderRadius: '8px', border: 'none',
                  background: 'var(--accent)', color: '#fff', cursor: 'pointer',
                  fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                {theme === 'dark' ? '☀️ Switch to Light' : '🌙 Switch to Dark'}
              </button>
            </div>
            <div style={{ marginTop: '24px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text)' }}>
                Theme preference is saved and will persist across restarts.
              </p>
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontSize: '16px'
      }}>
        Loading settings...
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: 'var(--bg)'
    }}>
      <div style={{ padding: '24px 24px 0' }}>
        <h2 style={{ margin: '0 0 16px', color: 'var(--text-h)' }}>Settings</h2>

        <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 20px', border: 'none', background: 'none',
                color: activeTab === tab ? 'var(--accent)' : 'var(--text)',
                fontWeight: activeTab === tab ? 600 : 400,
                cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap',
                borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'all 0.15s'
              }}>{tab}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
        {success && <p style={{ color: '#22c55e', fontSize: '13px', marginBottom: '12px' }}>{success}</p>}
        {tabContent(activeTab)}
      </div>
    </div>
  );
}
