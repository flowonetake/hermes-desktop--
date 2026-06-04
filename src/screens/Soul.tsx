import { useState, useEffect, useCallback } from 'react';
import { getSoulContent, updateSoulContent, resetSoulToDefault } from '../api/commands';

export default function Soul() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const loadContent = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const c = await getSoulContent();
      setContent(c || '# SOUL.md\n\nDefine your AI\'s personality here.');
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadContent(); }, [loadContent]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await updateSoulContent(content);
      setSuccess('Saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      await resetSoulToDefault();
      setConfirmReset(false);
      await loadContent();
      setSuccess('Reset to default!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(String(err));
    }
  };

  const renderPreview = () => {
    let html = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/### (.+)/g, '<h3 style="color:var(--text-h);margin:16px 0 8px">$1</h3>')
      .replace(/## (.+)/g, '<h2 style="color:var(--text-h);margin:20px 0 10px">$1</h2>')
      .replace(/# (.+)/g, '<h1 style="color:var(--text-h);margin:24px 0 12px">$1</h1>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background:var(--code-bg);padding:2px 6px;border-radius:3px">$1</code>')
      .replace(/- (.+)/g, '<li style="color:var(--text);margin:4px 0">$1</li>')
      .replace(/\n/g, '<br/>');
    return html;
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontSize: '16px'
      }}>
        Loading SOUL.md...
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: 'var(--bg)', padding: '24px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', color: 'var(--text-h)' }}>SOUL.md</h2>
          <p style={{ fontSize: '13px', color: 'var(--text)', margin: 0 }}>
            Define Hermes\' personality, behavior, and constraints
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setPreview(prev => !prev)}
            style={{
              padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)',
              background: preview ? 'var(--accent-bg)' : 'var(--bg)',
              color: preview ? 'var(--accent)' : 'var(--text)',
              cursor: 'pointer', fontSize: '13px'
            }}>
            {preview ? 'Edit' : 'Preview'}
          </button>
          {confirmReset ? (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={handleReset}
                style={{
                  padding: '8px 16px', borderRadius: '6px', border: 'none',
                  background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '13px'
                }}>Confirm Reset</button>
              <button onClick={() => setConfirmReset(false)}
                style={{
                  padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)',
                  background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: '13px'
                }}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => setConfirmReset(true)}
              style={{
                padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)',
                background: 'var(--bg)', color: '#ef4444', cursor: 'pointer', fontSize: '13px'
              }}>Reset to Default</button>
          )}
          <button onClick={handleSave} disabled={saving}
            style={{
              padding: '8px 16px', borderRadius: '6px', border: 'none',
              background: saving ? 'var(--code-bg)' : 'var(--accent)',
              color: saving ? 'var(--text)' : '#fff',
              cursor: saving ? 'default' : 'pointer', fontWeight: 600, fontSize: '13px'
            }}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>

      {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
      {success && <p style={{ color: '#22c55e', fontSize: '13px', marginBottom: '12px' }}>{success}</p>}

      <div style={{ flex: 1 }}>
        {preview ? (
          <div style={{
            padding: '20px', borderRadius: '8px', border: '1px solid var(--border)',
            background: 'var(--code-bg)', minHeight: '400px', overflowY: 'auto',
            fontSize: '14px', lineHeight: '1.7', color: 'var(--text)'
          }}>
            <div dangerouslySetInnerHTML={{ __html: renderPreview() }} />
          </div>
        ) : (
          <textarea value={content} onChange={e => setContent(e.target.value)}
            placeholder="# SOUL.md"
            style={{
              width: '100%', height: '100%', minHeight: '400px', padding: '20px', boxSizing: 'border-box',
              borderRadius: '8px', border: '1px solid var(--border)',
              background: 'var(--code-bg)', color: 'var(--text-h)', fontSize: '14px', lineHeight: '1.7',
              fontFamily: 'var(--mono)', resize: 'none', outline: 'none'
            }} />
        )}
      </div>
    </div>
  );
}
