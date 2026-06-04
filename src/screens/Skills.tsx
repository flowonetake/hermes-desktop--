import { useState, useEffect, useCallback } from 'react';
import { listSkills, installSkill, uninstallSkill } from '../api/commands';

export default function Skills() {
  const [skills, setSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [installUrl, setInstallUrl] = useState('');
  const [installing, setInstalling] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const loadSkills = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const s = await listSkills();
      setSkills(s);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSkills(); }, [loadSkills]);

  const handleInstall = async () => {
    if (!installUrl.trim()) return;
    setInstalling(true);
    setError('');
    try {
      await installSkill(installUrl.trim(), 'remote');
      setInstallUrl('');
      await loadSkills();
    } catch (err) {
      setError(String(err));
    } finally {
      setInstalling(false);
    }
  };

  const handleRemove = async (name: string) => {
    try {
      await uninstallSkill(name);
      setSkills(prev => prev.filter(s => { const n = typeof s === 'string' ? s : (s as any).name || ''; return n !== name; }));
      setConfirmRemove(null);
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: 'var(--bg)', padding: '24px'
    }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 16px', color: 'var(--text-h)' }}>Skills</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input value={installUrl} onChange={e => setInstallUrl(e.target.value)}
            placeholder="Skill URL or name (e.g., github.com/user/skill)"
            onKeyDown={e => e.key === 'Enter' && handleInstall()}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)',
              background: 'var(--code-bg)', color: 'var(--text-h)', fontSize: '14px', outline: 'none'
            }} />
          <button onClick={handleInstall} disabled={!installUrl.trim() || installing}
            style={{
              padding: '10px 20px', borderRadius: '8px', border: 'none',
              background: installing ? 'var(--code-bg)' : 'var(--accent)',
              color: installing ? 'var(--text)' : '#fff',
              cursor: installing || !installUrl.trim() ? 'default' : 'pointer',
              fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap'
            }}>
            {installing ? 'Installing...' : 'Install Skill'}
          </button>
        </div>
      </div>

      {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {loading && <p style={{ color: 'var(--text)', textAlign: 'center', padding: '40px' }}>Loading skills...</p>}

        {!loading && skills.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
            <h3 style={{ color: 'var(--text-h)', margin: '0 0 8px' }}>No skills installed</h3>
            <p style={{ fontSize: '14px' }}>Install a skill to extend Hermes\' capabilities.</p>
          </div>
        )}

        {skills.map((skill, idx) => {
          const name = typeof skill === 'string' ? skill : (skill as any).name || `skill-${idx}`;
          return (
            <div key={name} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px', borderRadius: '8px',
              border: '1px solid var(--border)', background: 'var(--code-bg)'
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ color: 'var(--text-h)', fontWeight: 600, fontSize: '14px' }}>{name}</span>
              </div>
              {confirmRemove === name ? (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => handleRemove(name)}
                    style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '12px' }}>Remove</button>
                  <button onClick={() => setConfirmRemove(null)}
                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirmRemove(name)}
                  style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}>Remove</button>
              )}
            </div>
          );
        })}
      </div>

      <div style={{
        padding: '12px 0 0', borderTop: '1px solid var(--border)',
        fontSize: '13px', color: 'var(--text)', textAlign: 'center'
      }}>
        {skills.length} skill{skills.length !== 1 ? 's' : ''} installed
      </div>
    </div>
  );
}
