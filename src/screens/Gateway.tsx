import { useState, useEffect, useCallback } from 'react';
import { listGateways, configureGateway, testGateway } from '../api/commands';
import type { Gateway } from '../types';

const GATEWAY_ICONS: Record<string, string> = {
  telegram: '📱',
  discord: '💬',
  slack: '🔷',
  whatsapp: '📞',
  signal: '🔒',
  matrix: '🧩',
  messenger: '💙',
  webhook: '🔗',
};

const GATEWAY_FIELDS: Record<string, string[]> = {
  telegram: ['bot_token', 'chat_id'],
  discord: ['bot_token', 'channel_id', 'guild_id'],
  slack: ['bot_token', 'signing_secret', 'channel'],
  whatsapp: ['phone_number_id', 'access_token', 'webhook_secret'],
  signal: ['number', 'server'],
  matrix: ['homeserver', 'user_id', 'access_token'],
  messenger: ['page_id', 'access_token', 'app_secret'],
  webhook: ['url', 'secret'],
};

export default function GatewayScreen() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, boolean>>({});

  const loadGateways = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const g = await listGateways();
      setGateways(g.map(s => JSON.parse(s)));
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGateways(); }, [loadGateways]);

  const handleToggle = async (gw: { name: string; type: string; enabled: boolean; config: Record<string, string> }) => {
    try {
      await configureGateway(JSON.stringify({
        ...gw,
        enabled: !gw.enabled,
      }));
      setGateways(prev => prev.map(g => g.name === gw.name ? { ...g, enabled: !g.enabled } : g));
    } catch (err) {
      setError(String(err));
    }
  };

  const handleConfigure = async (name: string) => {
    try {
      const existing = gateways.find(g => g.name === name);
      await configureGateway(JSON.stringify({
        ...existing,
        name,
        config: configValues,
      }));
      setSelected(null);
      setConfigValues({});
      await loadGateways();
    } catch (err) {
      setError(String(err));
    }
  };

  const handleTest = async (name: string) => {
    setTesting(name);
    setTestResult(prev => ({ ...prev, [name]: false }));
    try {
      const result = await testGateway(name);
      setTestResult(prev => ({ ...prev, [name]: result }));
    } catch {
      setTestResult(prev => ({ ...prev, [name]: false }));
    } finally {
      setTesting(null);
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: 'var(--bg)', padding: '24px'
    }}>
      <h2 style={{ margin: '0 0 20px', color: 'var(--text-h)' }}>Gateways</h2>

      {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

      <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
        {loading && <p style={{ color: 'var(--text)', gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>Loading gateways...</p>}

        {!loading && gateways.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text)', gridColumn: '1 / -1' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌐</div>
            <h3 style={{ color: 'var(--text-h)', margin: '0 0 8px' }}>No gateways configured</h3>
            <p style={{ fontSize: '14px' }}>Connect Hermes to messaging platforms.</p>
          </div>
        )}

        {gateways.map(gw => {
          const icon = GATEWAY_ICONS[gw.type] || '🔌';
          const fields = GATEWAY_FIELDS[gw.type] || Object.keys(gw.config || {});
          const isSelected = selected === gw.name;

          return (
            <div key={gw.name} style={{
              padding: '16px', borderRadius: '8px', border: '1px solid var(--border)',
              background: 'var(--code-bg)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '28px' }}>{icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'var(--text-h)', fontWeight: 600, fontSize: '14px' }}>{gw.name}</span>
                    <span style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: gw.enabled ? '#22c55e' : 'var(--border)',
                      display: 'inline-block'
                    }} />
                    {testResult[gw.name] !== undefined && (
                      <span style={{ fontSize: '12px', color: testResult[gw.name] ? '#22c55e' : '#ef4444' }}>
                        {testResult[gw.name] ? '✓ Connected' : '✗ Failed'}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text)', textTransform: 'capitalize' }}>
                    {gw.type}
                  </div>
                </div>
                <label style={{
                  position: 'relative', display: 'inline-block', width: '44px', height: '24px',
                  cursor: 'pointer', flexShrink: 0
                }}>
                  <input type="checkbox" checked={gw.enabled}
                    onChange={() => handleToggle(gw)}
                    style={{ opacity: 0, width: 0, height: 0 }} />
                  <span style={{
                    position: 'absolute', inset: 0, borderRadius: '12px',
                    background: gw.enabled ? 'var(--accent)' : 'var(--border)',
                    transition: 'background 0.2s',
                    boxShadow: gw.enabled ? '0 0 8px rgba(192,132,252,0.3)' : 'none'
                  }}>
                    <span style={{
                      position: 'absolute', top: '2px', left: gw.enabled ? '22px' : '2px',
                      width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
                      transition: 'left 0.2s'
                    }} />
                  </span>
                </label>
              </div>

              {isSelected ? (
                <div>
                  {fields.map(field => (
                    <div key={field} style={{ marginBottom: '8px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text)', marginBottom: '2px', textTransform: 'capitalize' }}>
                        {field.replace(/_/g, ' ')}
                      </label>
                      <input value={configValues[field] ?? ''}
                        onChange={e => setConfigValues(prev => ({ ...prev, [field]: e.target.value }))}
                        placeholder={`Enter ${field.replace(/_/g, ' ')}`}
                        style={{
                          width: '100%', padding: '8px 10px', borderRadius: '4px',
                          border: '1px solid var(--border)', background: 'var(--bg)',
                          color: 'var(--text-h)', fontSize: '13px', boxSizing: 'border-box'
                        }} />
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                    <button onClick={() => handleConfigure(gw.name)}
                      style={{
                        padding: '6px 12px', borderRadius: '4px', border: 'none',
                        background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: '12px'
                      }}>Save</button>
                    <button onClick={() => { setSelected(null); setConfigValues({}); }}
                      style={{
                        padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border)',
                        background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: '12px'
                      }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => {
                    setSelected(gw.name);
                    setConfigValues(gw.config || {});
                  }}
                    style={{
                      padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border)',
                      background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: '12px'
                    }}>Configure</button>
                  <button onClick={() => handleTest(gw.name)} disabled={testing === gw.name}
                    style={{
                      padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border)',
                      background: 'var(--bg)', color: 'var(--text)', cursor: testing === gw.name ? 'default' : 'pointer',
                      fontSize: '12px'
                    }}>
                    {testing === gw.name ? 'Testing...' : 'Test'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
