import { useState, useEffect, useCallback } from 'react';
import { listSavedModels, saveModel, deleteModel, discoverModels } from '../api/commands';
import type { ModelConfig } from '../types';

const PROVIDER_PRESETS = [
  { name: 'OpenAI', provider: 'openai', base_url: 'https://api.openai.com/v1' },
  { name: 'Anthropic', provider: 'anthropic', base_url: 'https://api.anthropic.com' },
  { name: 'Google', provider: 'google', base_url: 'https://generativelanguage.googleapis.com' },
  { name: 'xAI', provider: 'xai', base_url: 'https://api.x.ai' },
  { name: 'OpenRouter', provider: 'openrouter', base_url: 'https://openrouter.ai/api/v1' },
  { name: 'Local (Ollama)', provider: 'local', base_url: 'http://localhost:11434' },
  { name: 'Local (LM Studio)', provider: 'local', base_url: 'http://localhost:1234' },
];

const DEFAULT_MODEL_IDS: Record<string, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
  google: 'gemini-2.0-flash',
  xai: 'grok-3',
  openrouter: 'auto',
  local: 'llama-3.3-70b',
};

export default function Models() {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState<string[]>([]);
  const [form, setForm] = useState<ModelConfig>({
    name: '', provider: 'openai', model_id: '', base_url: 'https://api.openai.com/v1',
    temperature: 0.7, max_tokens: 4096,
  });

  const loadModels = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const m = await listSavedModels();
      setModels(m);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadModels(); }, [loadModels]);

  const handlePreset = (preset: typeof PROVIDER_PRESETS[0]) => {
    setForm(prev => ({
      ...prev,
      provider: preset.provider,
      base_url: preset.base_url,
      name: preset.name,
      model_id: DEFAULT_MODEL_IDS[preset.provider] || '',
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.model_id.trim()) {
      setError('Name and model ID are required');
      return;
    }
    setError('');
    try {
      await saveModel(JSON.stringify(form));
      setShowForm(false);
      setEditingIdx(null);
      setForm({ name: '', provider: 'openai', model_id: '', base_url: 'https://api.openai.com/v1', temperature: 0.7, max_tokens: 4096 });
      await loadModels();
    } catch (err) {
      setError(String(err));
    }
  };

  const handleEdit = (model: ModelConfig, idx: number) => {
    setForm(model);
    setEditingIdx(idx);
    setShowForm(true);
  };

  const handleDelete = async (name: string) => {
    try {
      await deleteModel(name);
      await loadModels();
    } catch (err) {
      setError(String(err));
    }
  };

  const handleDiscover = async () => {
    if (!form.provider) return;
    setDiscovering(true);
    setDiscovered([]);
    try {
      const result = await discoverModels(form.provider);
      setDiscovered(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setDiscovering(false);
    }
  };

  const resetForm = () => {
    setForm({ name: '', provider: 'openai', model_id: '', base_url: 'https://api.openai.com/v1', temperature: 0.7, max_tokens: 4096 });
    setEditingIdx(null);
    setShowForm(false);
    setError('');
    setDiscovered([]);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: 'var(--bg)', padding: '24px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: 'var(--text-h)' }}>Models</h2>
        <button onClick={() => setShowForm(true)}
          style={{
            padding: '8px 16px', borderRadius: '6px', border: 'none',
            background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '13px'
          }}>+ Add Model</button>
      </div>

      {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

      {showForm && (
        <div style={{
          marginBottom: '20px', padding: '20px', borderRadius: '8px',
          border: '1px solid var(--border)', background: 'var(--code-bg)'
        }}>
          <h3 style={{ margin: '0 0 16px', color: 'var(--text-h)', fontSize: '16px' }}>
            {editingIdx !== null ? 'Edit Model' : 'Add Model'}
          </h3>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {PROVIDER_PRESETS.map(p => (
              <button key={p.name} onClick={() => handlePreset(p)}
                style={{
                  padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--border)',
                  background: form.name === p.name ? 'var(--accent-bg)' : 'var(--bg)',
                  color: form.name === p.name ? 'var(--accent)' : 'var(--text)',
                  cursor: 'pointer', fontSize: '12px'
                }}>{p.name}</button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text)', marginBottom: '4px' }}>Name</label>
              <input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My Model"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text)', marginBottom: '4px' }}>Provider</label>
              <select value={form.provider} onChange={e => setForm(prev => ({ ...prev, provider: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)', fontSize: '13px', boxSizing: 'border-box' }}>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="google">Google</option>
                <option value="xai">xAI</option>
                <option value="openrouter">OpenRouter</option>
                <option value="local">Local</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text)', marginBottom: '4px' }}>Model ID</label>
              <input value={form.model_id} onChange={e => setForm(prev => ({ ...prev, model_id: e.target.value }))}
                placeholder="gpt-4o"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text)', marginBottom: '4px' }}>Base URL</label>
              <input value={form.base_url || ''} onChange={e => setForm(prev => ({ ...prev, base_url: e.target.value }))}
                placeholder="https://api.openai.com/v1"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text)', marginBottom: '4px' }}>Temperature</label>
              <input type="number" step="0.1" min="0" max="2" value={form.temperature ?? 0.7}
                onChange={e => setForm(prev => ({ ...prev, temperature: parseFloat(e.target.value) || 0.7 }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text)', marginBottom: '4px' }}>Max Tokens</label>
              <input type="number" step="1" min="1" max="512000" value={form.max_tokens ?? 4096}
                onChange={e => setForm(prev => ({ ...prev, max_tokens: parseInt(e.target.value) || 4096 }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button onClick={handleDiscover} disabled={discovering}
              style={{
                padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)',
                background: 'var(--bg)', color: 'var(--text-h)', cursor: 'pointer', fontSize: '13px'
              }}>
              {discovering ? 'Discovering...' : 'Discover Models'}
            </button>
          </div>

          {discovered.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text)', marginBottom: '4px' }}>Discovered Models</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {discovered.map(d => (
                  <button key={d} onClick={() => setForm(prev => ({ ...prev, model_id: d }))}
                    style={{
                      padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)',
                      background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: '11px'
                    }}>{d}</button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleSave}
              style={{
                padding: '8px 16px', borderRadius: '6px', border: 'none',
                background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '13px'
              }}>Save</button>
            <button onClick={resetForm}
              style={{
                padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)',
                background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: '13px'
              }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
        {loading && <p style={{ color: 'var(--text)', gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>Loading models...</p>}

        {!loading && models.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text)', gridColumn: '1 / -1' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧠</div>
            <h3 style={{ color: 'var(--text-h)', margin: '0 0 8px' }}>No models configured</h3>
            <p style={{ fontSize: '14px' }}>Add a model to start chatting.</p>
          </div>
        )}

        {models.map((m, i) => (
          <div key={m.name} style={{
            padding: '16px', borderRadius: '8px', border: '1px solid var(--border)',
            background: 'var(--code-bg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <div style={{ color: 'var(--text-h)', fontWeight: 600, fontSize: '14px' }}>{m.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '2px' }}>{m.provider}</div>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button onClick={() => handleEdit(m, i)}
                  style={{
                    padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)',
                    background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: '11px'
                  }}>Edit</button>
                <button onClick={() => handleDelete(m.name)}
                  style={{
                    padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)',
                    background: 'var(--bg)', color: '#ef4444', cursor: 'pointer', fontSize: '11px'
                  }}>Delete</button>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text)', lineHeight: '1.7' }}>
              <div><strong>Model ID:</strong> {m.model_id}</div>
              {m.base_url && <div><strong>Base URL:</strong> <span style={{ wordBreak: 'break-all' }}>{m.base_url}</span></div>}
              <div><strong>Temp:</strong> {m.temperature ?? 0.7} · <strong>Max:</strong> {m.max_tokens ?? 4096}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
