import { useState, useEffect, useCallback } from 'react';
import { listProfiles, createProfile, deleteProfile, switchProfile, getActiveProfile } from '../api/commands';
import type { Profile } from '../types';

export default function Agents() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [p, active] = await Promise.all([listProfiles(), getActiveProfile()]);
      setProfiles(p);
      setActiveProfile(active);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const profile = await createProfile(newName.trim());
      setProfiles(prev => [...prev, profile]);
      setNewName('');
      setShowNew(false);
    } catch (err) {
      setError(String(err));
    }
  };

  const handleSwitch = async (name: string) => {
    try {
      await switchProfile(name);
      setActiveProfile(name);
    } catch (err) {
      setError(String(err));
    }
  };

  const handleDelete = async (name: string) => {
    try {
      await deleteProfile(name);
      setProfiles(prev => prev.filter(p => p.name !== name));
      if (activeProfile === name) setActiveProfile(null);
      if (selectedProfile?.name === name) setSelectedProfile(null);
      setConfirmDelete(null);
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: 'var(--bg)', padding: '24px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: 'var(--text-h)' }}>Profiles</h2>
        <button onClick={() => setShowNew(true)}
          style={{
            padding: '8px 16px', borderRadius: '6px', border: 'none',
            background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '13px'
          }}>+ New Profile</button>
      </div>

      {showNew && (
        <div style={{
          padding: '16px', marginBottom: '16px', borderRadius: '8px',
          background: 'var(--code-bg)', border: '1px solid var(--border)',
          display: 'flex', gap: '8px', alignItems: 'center'
        }}>
          <input value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Profile name..."
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)',
              background: 'var(--bg)', color: 'var(--text-h)', fontSize: '14px', outline: 'none'
            }} />
          <button onClick={handleCreate} disabled={!newName.trim()}
            style={{
              padding: '8px 16px', borderRadius: '6px', border: 'none',
              background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '13px'
            }}>Create</button>
          <button onClick={() => { setShowNew(false); setNewName(''); }}
            style={{
              padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)',
              background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: '13px'
            }}>Cancel</button>
        </div>
      )}

      {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', gap: '16px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {loading && <p style={{ color: 'var(--text)', textAlign: 'center', padding: '40px' }}>Loading profiles...</p>}

          {!loading && profiles.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>👤</div>
              <h3 style={{ color: 'var(--text-h)', margin: '0 0 8px' }}>No profiles</h3>
              <p style={{ fontSize: '14px' }}>Create a profile to personalize your AI assistant.</p>
            </div>
          )}

          {profiles.map(p => (
            <div key={p.name}
              onClick={() => setSelectedProfile(p)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px', borderRadius: '8px',
                border: activeProfile === p.name ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: selectedProfile?.name === p.name ? 'var(--accent-bg)' : 'var(--code-bg)',
                cursor: 'pointer', transition: 'background 0.15s'
              }}>
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: activeProfile === p.name ? '#22c55e' : 'var(--border)',
                flexShrink: 0
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: 'var(--text-h)', fontWeight: 600, fontSize: '14px' }}>
                  {p.name}
                  {activeProfile === p.name && (
                    <span style={{
                      marginLeft: '8px', fontSize: '11px', padding: '2px 6px',
                      borderRadius: '4px', background: 'rgba(34,197,94,0.15)', color: '#22c55e'
                    }}>Active</span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '2px' }}>
                  {p.provider} · {p.model} · {new Date(p.created_at).toLocaleDateString()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {activeProfile !== p.name && (
                  <button onClick={e => { e.stopPropagation(); handleSwitch(p.name); }}
                    style={{
                      padding: '6px 12px', borderRadius: '4px', border: 'none',
                      background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: '12px'
                    }}>Switch</button>
                )}
                {confirmDelete === p.name ? (
                  <>
                    <button onClick={e => { e.stopPropagation(); handleDelete(p.name); }}
                      style={{
                        padding: '6px 12px', borderRadius: '4px', border: 'none',
                        background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '12px'
                      }}>Delete</button>
                    <button onClick={e => { e.stopPropagation(); setConfirmDelete(null); }}
                      style={{
                        padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border)',
                        background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: '12px'
                      }}>Cancel</button>
                  </>
                ) : (
                  <button onClick={e => { e.stopPropagation(); setConfirmDelete(p.name); }}
                    style={{
                      padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border)',
                      background: 'var(--bg)', color: '#ef4444', cursor: 'pointer', fontSize: '12px'
                    }}>Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>

        {selectedProfile && (
          <div style={{
            width: '320px', padding: '20px', borderRadius: '8px',
            border: '1px solid var(--border)', background: 'var(--code-bg)',
            alignSelf: 'flex-start'
          }}>
            <h3 style={{ margin: '0 0 16px', color: 'var(--text-h)' }}>{selectedProfile.name}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div>
                <strong style={{ color: 'var(--text-h)' }}>Provider:</strong>
                <span style={{ color: 'var(--text)', marginLeft: '8px' }}>{selectedProfile.provider}</span>
              </div>
              <div>
                <strong style={{ color: 'var(--text-h)' }}>Model:</strong>
                <span style={{ color: 'var(--text)', marginLeft: '8px' }}>{selectedProfile.model}</span>
              </div>
              <div>
                <strong style={{ color: 'var(--text-h)' }}>Created:</strong>
                <span style={{ color: 'var(--text)', marginLeft: '8px' }}>
                  {new Date(selectedProfile.created_at).toLocaleString()}
                </span>
              </div>
              <div>
                <strong style={{ color: 'var(--text-h)' }}>Active:</strong>
                <span style={{
                  color: activeProfile === selectedProfile.name ? '#22c55e' : '#ef4444',
                  marginLeft: '8px'
                }}>{activeProfile === selectedProfile.name ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
