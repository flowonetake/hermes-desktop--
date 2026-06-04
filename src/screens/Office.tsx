import { useState, useEffect, useCallback } from 'react';
import { startOfficeServer, stopOfficeServer, getOfficeStatus, listAdapters } from '../api/commands';

export default function Office() {
  const [status, setStatus] = useState('stopped');
  const [adapters, setAdapters] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState('');

  const loadStatus = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([getOfficeStatus(), listAdapters()]);
      setStatus(s.toLowerCase());
      setAdapters(a);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadStatus();
      setLoading(false);
    };
    init();
  }, [loadStatus]);

  const handleToggle = async () => {
    setToggling(true);
    setError('');
    try {
      if (status === 'running') {
        await stopOfficeServer();
        setStatus('stopped');
      } else {
        await startOfficeServer();
        setStatus('running');
      }
      await loadStatus();
    } catch (err) {
      setError(String(err));
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontSize: '16px'
      }}>
        Loading Office...
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: 'var(--bg)', padding: '24px'
    }}>
      <h2 style={{ margin: '0 0 20px', color: 'var(--text-h)' }}>Hermes Office (Claw3d)</h2>

      {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

      <div style={{
        padding: '24px', borderRadius: '12px', border: '1px solid var(--border)',
        background: 'var(--code-bg)', marginBottom: '20px',
        display: 'flex', alignItems: 'center', gap: '20px'
      }}>
        <div style={{
          width: '16px', height: '16px', borderRadius: '50%',
          background: status === 'running' ? '#22c55e' : status === 'starting' ? '#f59e0b' : '#ef4444',
          boxShadow: status === 'running' ? '0 0 12px rgba(34,197,94,0.5)' : 'none',
          flexShrink: 0,
          animation: status === 'starting' ? 'pulse 1s infinite' : 'none'
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--text-h)', fontWeight: 600, fontSize: '16px' }}>
            Server {status === 'running' ? 'Running' : status === 'starting' ? 'Starting...' : 'Stopped'}
          </div>
          <div style={{ color: 'var(--text)', fontSize: '13px', textTransform: 'capitalize' }}>
            Status: {status}
          </div>
        </div>
        <button onClick={handleToggle} disabled={toggling || status === 'starting'}
          style={{
            padding: '10px 24px', borderRadius: '8px', border: 'none',
            background: status === 'running' ? '#ef4444' : 'var(--accent)',
            color: '#fff', cursor: toggling ? 'default' : 'pointer',
            fontWeight: 600, fontSize: '14px', opacity: toggling ? 0.6 : 1,
            transition: 'all 0.2s'
          }}>
          {toggling ? '...' : status === 'running' ? 'Stop Server' : 'Start Server'}
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 12px', color: 'var(--text-h)', fontSize: '16px' }}>Loaded Adapters</h3>
        {adapters.length === 0 ? (
          <p style={{ color: 'var(--text)', fontSize: '13px' }}>No adapters loaded.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {adapters.map(adapter => (
              <span key={adapter} style={{
                padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border)',
                background: 'var(--bg)', color: 'var(--text-h)', fontSize: '13px'
              }}>
                {adapter}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ margin: '0 0 12px', color: 'var(--text-h)', fontSize: '16px' }}>3D Scene Viewer</h3>
        <div style={{
          flex: 1, borderRadius: '12px', border: '1px solid var(--border)',
          background: 'var(--code-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '200px'
        }}>
          <div style={{ textAlign: 'center', color: 'var(--text)' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎮</div>
            <p style={{ fontSize: '14px' }}>3D scene viewer placeholder</p>
            <p style={{ fontSize: '12px' }}>Three.js integration coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}
