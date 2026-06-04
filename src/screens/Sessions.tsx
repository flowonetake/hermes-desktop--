import { useState, useEffect, useCallback } from 'react';
import { listSessions, searchSessions, deleteSession } from '../api/commands';
import type { Session } from '../types';

interface SessionsProps {
  onSelect?: (sessionId: string) => void;
  onNavigate?: (screen: string) => void;
}

function getDateGroup(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  if (d >= startOfWeek) return 'This Week';
  return 'Earlier';
}

export default function Sessions({ onSelect, onNavigate }: SessionsProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (search.trim()) {
        const results = await searchSessions(search.trim());
        setSessions(results);
      } else {
        const all = await listSessions(100, 0);
        setSessions(all);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleDelete = async (id: string) => {
    try {
      await deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      setConfirmDelete(null);
    } catch (err) {
      setError(String(err));
    }
  };

  const grouped = sessions.reduce<Record<string, Session[]>>((acc, s) => {
    const group = getDateGroup(s.created_at);
    if (!acc[group]) acc[group] = [];
    acc[group].push(s);
    return acc;
  }, {});

  const groupOrder = ['Today', 'Yesterday', 'This Week', 'Earlier'];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: 'var(--bg)', padding: '24px'
    }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 16px', color: 'var(--text-h)' }}>Sessions</h2>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search sessions by title..."
          style={{
            width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)',
            background: 'var(--code-bg)', color: 'var(--text-h)', fontSize: '14px',
            boxSizing: 'border-box', outline: 'none'
          }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && <p style={{ color: 'var(--text)', textAlign: 'center', padding: '40px' }}>Loading sessions...</p>}
        {error && <p style={{ color: '#ef4444', textAlign: 'center', padding: '20px' }}>{error}</p>}

        {!loading && !error && sessions.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '60px 20px', color: 'var(--text)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
            <h3 style={{ color: 'var(--text-h)', margin: '0 0 8px' }}>No sessions yet</h3>
            <p style={{ fontSize: '14px' }}>Start a new chat to create your first session.</p>
          </div>
        )}

        {!loading && groupOrder.map(group => {
          const items = grouped[group];
          if (!items?.length) return null;
          return (
            <div key={group} style={{ marginBottom: '20px' }}>
              <h4 style={{
                margin: '0 0 8px', color: 'var(--text)', fontSize: '13px',
                textTransform: 'uppercase', letterSpacing: '0.5px'
              }}>{group}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {items.map(s => (
                  <div key={s.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px 16px', borderRadius: '8px',
                      border: '1px solid var(--border)', background: 'var(--code-bg)',
                      cursor: 'pointer', transition: 'background 0.15s'
                    }}
                    onClick={() => { if (onSelect) onSelect(s.id); if (onNavigate) onNavigate('chat'); }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--code-bg)')}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: 'var(--text-h)', fontWeight: 600, fontSize: '14px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}>{s.title}</div>
                      <div style={{
                        display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text)', marginTop: '4px'
                      }}>
                        <span>{s.model}</span>
                        <span>{new Date(s.created_at).toLocaleDateString()}</span>
                        <span>{s.message_count} msgs</span>
                        <span>{s.tokens_used} tokens</span>
                      </div>
                    </div>
                    <div>
                      {confirmDelete === s.id ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={e => { e.stopPropagation(); handleDelete(s.id); }}
                            style={{
                              padding: '4px 8px', borderRadius: '4px', border: 'none',
                              background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '12px'
                            }}>Delete</button>
                          <button onClick={e => { e.stopPropagation(); setConfirmDelete(null); }}
                            style={{
                              padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)',
                              background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: '12px'
                            }}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={e => { e.stopPropagation(); setConfirmDelete(s.id); }}
                          style={{
                            padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border)',
                            background: 'var(--bg)', color: '#ef4444', cursor: 'pointer', fontSize: '12px'
                          }}>Delete</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        padding: '12px 0 0', borderTop: '1px solid var(--border)',
        fontSize: '13px', color: 'var(--text)', textAlign: 'center'
      }}>
        {sessions.length} session{sessions.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
