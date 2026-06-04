import { useState, useEffect, useCallback } from 'react';
import { listTools, toggleTool } from '../api/commands';

const CATEGORIES = ['Web', 'Browser', 'Terminal', 'File', 'Code', 'Vision', 'Image', 'TTS'];

export default function Tools() {
  const [tools, setTools] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const loadTools = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const t = await listTools();
      setTools(t);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTools(); }, [loadTools]);

  const handleToggle = async (name: string, enabled: boolean) => {
    try {
      await toggleTool(name, enabled);
    } catch (err) {
      setError(String(err));
    }
  };

  const filtered = tools.filter(t => {
    const name = typeof t === 'string' ? t : (t as any).name || '';
    if (search && !name.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter && !name.toLowerCase().includes(categoryFilter.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: 'var(--bg)', padding: '24px'
    }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 16px', color: 'var(--text-h)' }}>Tools</h2>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tools..."
            style={{
              flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)',
              background: 'var(--code-bg)', color: 'var(--text-h)', fontSize: '14px', outline: 'none'
            }} />
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            style={{
              padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)',
              background: 'var(--code-bg)', color: 'var(--text-h)', fontSize: '14px', cursor: 'pointer'
            }}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

      <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '8px' }}>
        {loading && <p style={{ color: 'var(--text)', gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>Loading tools...</p>}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text)', gridColumn: '1 / -1' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛠️</div>
            <h3 style={{ color: 'var(--text-h)', margin: '0 0 8px' }}>No tools found</h3>
            <p style={{ fontSize: '14px' }}>Try adjusting your search or filters.</p>
          </div>
        )}

        {filtered.map((tool, idx) => {
          const name = typeof tool === 'string' ? tool : (tool as any).name || `tool-${idx}`;
          const enabled = typeof tool === 'object' ? (tool as any).enabled : true;
          return (
          <div key={name} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '16px', borderRadius: '8px', border: '1px solid var(--border)',
            background: 'var(--code-bg)'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: 'var(--text-h)', fontWeight: 600, fontSize: '14px' }}>{name}</div>
            </div>
            <label style={{
              position: 'relative', display: 'inline-block', width: '44px', height: '24px',
              cursor: 'pointer', flexShrink: 0
            }}>
              <input type="checkbox" checked={enabled}
                onChange={e => handleToggle(name, e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{
                position: 'absolute', inset: 0, borderRadius: '12px',
                background: enabled ? 'var(--accent)' : 'var(--border)',
                transition: 'background 0.2s',
                boxShadow: enabled ? '0 0 8px rgba(192,132,252,0.3)' : 'none'
              }}>
                <span style={{
                  position: 'absolute', top: '2px', left: enabled ? '22px' : '2px',
                  width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s'
                }} />
              </span>
            </label>
          </div>
          );
        })}
      </div>

      <div style={{
        padding: '12px 0 0', borderTop: '1px solid var(--border)',
        fontSize: '13px', color: 'var(--text)', textAlign: 'center'
      }}>
        {tools.length} tool{tools.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
