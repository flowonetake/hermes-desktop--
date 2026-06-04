import { useState, useEffect, useCallback } from 'react';
import { searchMemories, storeMemory, deleteMemory, clearMemories, getMemoryStats } from '../api/commands';

const TABS = ['Entries', 'Stats'] as const;

export default function MemoryScreen() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('Entries');
  const [entries, setEntries] = useState<[string, string][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [memStats, setMemStats] = useState<Record<string, number>>({});
  const [confirmClear, setConfirmClear] = useState(false);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const e = await searchMemories('');
      setEntries(e);
      const s = await getMemoryStats();
      setMemStats(s);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const handleAdd = async () => {
    if (!newKey.trim() || !newValue.trim()) return;
    try {
      await storeMemory(newKey.trim(), newValue.trim());
      setNewKey('');
      setNewValue('');
      await loadEntries();
    } catch (err) {
      setError(String(err));
    }
  };

  const handleDelete = async (key: string) => {
    try {
      await deleteMemory(key);
      setEntries(prev => prev.filter(([k]) => k !== key));
    } catch (err) {
      setError(String(err));
    }
  };

  const handleClear = async () => {
    try {
      await clearMemories();
      setEntries([]);
      setConfirmClear(false);
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', padding: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 16px', color: 'var(--text-h)' }}>Memory</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px', borderRadius: '6px', border: activeTab === tab ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: activeTab === tab ? 'var(--accent-bg)' : 'var(--code-bg)',
                color: activeTab === tab ? 'var(--accent)' : 'var(--text)', cursor: 'pointer', fontWeight: activeTab === tab ? 600 : 400, fontSize: '14px'
              }}>{tab}</button>
          ))}
        </div>
      </div>

      {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

      {activeTab === 'Entries' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text)', marginBottom: '4px' }}>Key</label>
              <input value={newKey} onChange={e => setNewKey(e.target.value)}
                placeholder="Memory key"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }} />
            </div>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text)', marginBottom: '4px' }}>Value</label>
              <input value={newValue} onChange={e => setNewValue(e.target.value)}
                placeholder="Memory value"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }} />
            </div>
            <button onClick={handleAdd} disabled={!newKey.trim() || !newValue.trim()}
              style={{
                padding: '8px 16px', borderRadius: '6px', border: 'none',
                background: !newKey.trim() || !newValue.trim() ? 'var(--code-bg)' : 'var(--accent)',
                color: !newKey.trim() || !newValue.trim() ? 'var(--text)' : '#fff',
                cursor: !newKey.trim() || !newValue.trim() ? 'default' : 'pointer', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap'
              }}>Add</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && <p style={{ color: 'var(--text)', textAlign: 'center', padding: '40px' }}>Loading...</p>}
            {!loading && entries.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text)' }}>
                <p>No memory entries. Add one above.</p>
              </div>
            )}
            {entries.map(([key, value]) => (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)',
                background: 'var(--code-bg)', marginBottom: '4px'
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--text-h)', fontWeight: 600, fontSize: '13px' }}>{key}</div>
                  <div style={{ color: 'var(--text)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
                </div>
                <button onClick={() => handleDelete(key)}
                  style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: '#ef4444', cursor: 'pointer', fontSize: '11px' }}>Delete</button>
              </div>
            ))}
          </div>

          {entries.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              {confirmClear ? (
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text)' }}>Clear all?</span>
                  <button onClick={handleClear} style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '12px' }}>Yes</button>
                  <button onClick={() => setConfirmClear(false)} style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: '12px' }}>No</button>
                </div>
              ) : (
                <button onClick={() => setConfirmClear(true)} style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}>Clear All</button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'Stats' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {Object.entries(memStats).map(([key, value]) => (
              <div key={key} style={{ padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--code-bg)' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent)' }}>{value}</div>
                <div style={{ fontSize: '13px', color: 'var(--text)', marginTop: '4px' }}>{key.replace(/_/g, ' ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
