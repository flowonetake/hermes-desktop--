import { useState, useEffect } from 'react';
import { setConfig, setEnv, readConfig, writeConfig } from '../api/commands';

const PROVIDERS = [
  { id: 'openrouter', name: 'OpenRouter' },
  { id: 'anthropic', name: 'Anthropic' },
  { id: 'openai', name: 'OpenAI' },
  { id: 'google', name: 'Google / Gemini' },
  { id: 'xai', name: 'xAI / Grok' },
  { id: 'local', name: 'Local (Ollama / LM Studio)' },
];

const PROVIDER_MODELS: Record<string, string[]> = {
  openrouter: ['auto', 'anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'google/gemini-2.0-flash'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-latest', 'claude-3-opus-latest', 'claude-3-haiku-latest'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  google: ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  xai: ['grok-3', 'grok-3-mini', 'grok-2'],
  local: ['llama-3.3-70b', 'qwen-2.5-coder-32b', 'mistral-nemo', 'deepseek-r1'],
};

const STEP_LABELS = ['Provider', 'API Key', 'Model', 'Done'];

interface SetupProps { onNavigate?: (screen: string) => void; onComplete?: () => void; }
export default function Setup({ onNavigate, onComplete }: SetupProps) {
  const [step, setStep] = useState(0);
  const [provider, setProvider] = useState('openrouter');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'fail'>('idle');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setModels(PROVIDER_MODELS[provider] || []);
    setModel('');
    setBaseUrl(provider === 'local' ? 'http://localhost:11434' : '');
  }, [provider]);

  const handleNext = () => {
    setError('');
    if (step === 0 && !provider) { setError('Select a provider'); return; }
    if (step === 1 && !apiKey && provider !== 'local') { setError('Enter an API key'); return; }
    if (step === 2 && !model) { setError('Select a model'); return; }
    setStep(s => Math.min(s + 1, 3));
  };

  const handleBack = () => setStep(s => Math.max(s - 1, 0));

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult('idle');
    try {
      const { sshExecute } = await import('../api/commands');
      await setConfig('llm.provider', provider);
      await setConfig('llm.model', model || models[0] || '');
      await setConfig('llm.base_url', baseUrl);
      if (apiKey) await setEnv('LLM_API_KEY', apiKey);
      if (provider === 'local') {
        const result = await sshExecute('curl -s -o /dev/null -w "%{http_code}" http://localhost:11434/api/tags || echo "0"');
        if (result.trim() === '0') throw new Error('Local server not reachable');
      }
      setTestResult('success');
    } catch (err) {
      setTestResult('fail');
      setError(String(err));
    } finally {
      setTesting(false);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    setError('');
    try {
      const existing = await readConfig();
      const config = existing ? JSON.parse(existing) : {};
      config.llm = { provider, model, base_url: baseUrl };
      config.setup_complete = true;
      await writeConfig(JSON.stringify(config, null, 2));
      if (apiKey) await setEnv('LLM_API_KEY', apiKey);
      if (onComplete) onComplete(); else if (onNavigate) onNavigate('chat');
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const renderStepIndicator = () => (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '32px' }}>
      {STEP_LABELS.map((label, i) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: i <= step ? 'var(--accent)' : 'var(--code-bg)',
            color: i <= step ? '#fff' : 'var(--text)',
            fontSize: '14px', fontWeight: 600
          }}>{i + 1}</div>
          <span style={{ color: i <= step ? 'var(--text-h)' : 'var(--text)', fontSize: '14px' }}>{label}</span>
          {i < 3 && <span style={{ color: 'var(--border)' }}>→</span>}
        </div>
      ))}
    </div>
  );

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: '40px', background: 'var(--bg)'
    }}>
      <div style={{ width: '100%', maxWidth: '560px' }}>
        <h2 style={{ margin: '0 0 8px', color: 'var(--text-h)' }}>Setup Wizard</h2>
        <p style={{ color: 'var(--text)', marginBottom: '24px', fontSize: '14px' }}>
          Configure your AI provider to get started
        </p>
        {renderStepIndicator()}

        <div style={{
          background: 'var(--code-bg)', padding: '24px', borderRadius: '12px',
          border: '1px solid var(--border)', minHeight: '300px'
        }}>
          {step === 0 && (
            <div>
              <h3 style={{ margin: '0 0 16px', color: 'var(--text-h)' }}>Choose Provider</h3>
              <div style={{ display: 'grid', gap: '8px' }}>
                {PROVIDERS.map(p => (
                  <button key={p.id} onClick={() => setProvider(p.id)}
                    style={{
                      padding: '12px 16px', borderRadius: '8px', textAlign: 'left', cursor: 'pointer',
                      border: provider === p.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: provider === p.id ? 'var(--accent-bg)' : 'var(--bg)',
                      color: 'var(--text-h)', fontSize: '14px', fontWeight: provider === p.id ? 600 : 400
                    }}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h3 style={{ margin: '0 0 16px', color: 'var(--text-h)' }}>Configure API Key</h3>
              {provider !== 'local' ? (
                <>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text)' }}>API Key</label>
                  <input type="password" value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={`Enter your ${PROVIDERS.find(p => p.id === provider)?.name} API key`}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                      background: 'var(--bg)', color: 'var(--text-h)', fontSize: '14px', marginBottom: '16px',
                      boxSizing: 'border-box'
                    }} />
                </>
              ) : (
                <p style={{ color: 'var(--text)', fontSize: '14px' }}>
                  Local providers don\'t require an API key. Make sure Ollama or LM Studio is running.
                </p>
              )}
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text)' }}>Base URL (optional)</label>
              <input type="text" value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                placeholder={provider === 'local' ? 'http://localhost:11434' : 'https://api.openai.com/v1'}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                  background: 'var(--bg)', color: 'var(--text-h)', fontSize: '14px', marginBottom: '16px',
                  boxSizing: 'border-box'
                }} />
              <button onClick={handleTestConnection} disabled={testing}
                style={{
                  padding: '10px 20px', borderRadius: '6px', border: 'none',
                  background: testing ? 'var(--code-bg)' : 'var(--accent)',
                  color: testing ? 'var(--text)' : '#fff', cursor: testing ? 'default' : 'pointer',
                  fontWeight: 600, fontSize: '14px'
                }}>
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              {testResult === 'success' && <span style={{ marginLeft: '12px', color: '#22c55e', fontSize: '14px' }}>✅ Connected</span>}
              {testResult === 'fail' && <span style={{ marginLeft: '12px', color: '#ef4444', fontSize: '14px' }}>❌ Failed</span>}
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 style={{ margin: '0 0 16px', color: 'var(--text-h)' }}>Select Model</h3>
              <select value={model} onChange={e => setModel(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                  background: 'var(--bg)', color: 'var(--text-h)', fontSize: '14px', boxSizing: 'border-box'
                }}>
                <option value="">-- Select a model --</option>
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              {!models.length && (
                <p style={{ color: 'var(--text)', fontSize: '13px', marginTop: '12px' }}>
                  No models available for this provider. You can type a model name manually.
                </p>
              )}
              <input type="text" value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="Or type a custom model name..."
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                  background: 'var(--bg)', color: 'var(--text-h)', fontSize: '14px', marginTop: '12px',
                  boxSizing: 'border-box'
                }} />
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 style={{ margin: '0 0 16px', color: 'var(--text-h)' }}>Setup Complete 🎉</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                <div><strong style={{ color: 'var(--text-h)' }}>Provider:</strong> <span style={{ color: 'var(--text)' }}>{PROVIDERS.find(p => p.id === provider)?.name}</span></div>
                <div><strong style={{ color: 'var(--text-h)' }}>API Key:</strong> <span style={{ color: 'var(--text)' }}>{apiKey ? '••••••••' + apiKey.slice(-4) : 'Not set'}</span></div>
                <div><strong style={{ color: 'var(--text-h)' }}>Model:</strong> <span style={{ color: 'var(--text)' }}>{model}</span></div>
                <div><strong style={{ color: 'var(--text-h)' }}>Base URL:</strong> <span style={{ color: 'var(--text)' }}>{baseUrl || 'Default'}</span></div>
              </div>
              <p style={{ color: 'var(--text)', fontSize: '13px', marginTop: '16px' }}>
                You can change these settings later in Settings.
              </p>
            </div>
          )}

          {error && <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '12px' }}>{error}</p>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
          <button onClick={handleBack} disabled={step === 0}
            style={{
              padding: '10px 24px', borderRadius: '6px', border: '1px solid var(--border)',
              background: 'var(--bg)', color: 'var(--text)', cursor: step === 0 ? 'default' : 'pointer',
              opacity: step === 0 ? 0.5 : 1
            }}>Back</button>
          {step < 3 ? (
            <button onClick={handleNext}
              style={{
                padding: '10px 24px', borderRadius: '6px', border: 'none',
                background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600
              }}>Next</button>
          ) : (
            <button onClick={handleFinish} disabled={saving}
              style={{
                padding: '10px 24px', borderRadius: '6px', border: 'none',
                background: saving ? 'var(--code-bg)' : 'var(--accent)',
                color: saving ? 'var(--text)' : '#fff', cursor: saving ? 'default' : 'pointer',
                fontWeight: 600
              }}>{saving ? 'Saving...' : 'Finish'}</button>
          )}
        </div>
      </div>
    </div>
  );
}
