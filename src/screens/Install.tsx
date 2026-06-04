import { useState, useEffect, useRef } from 'react';
import { installHermes, getInstallStatus, checkDependencies } from '../api/commands';

const STEPS = ['Checking dependencies...', 'Installing Hermes...', 'Configuring...', 'Done'];

interface InstallProps { onNavigate?: (screen: string) => void; onComplete?: () => void; }
export default function Install({ onNavigate, onComplete }: InstallProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [installing, setInstalling] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const startInstall = async () => {
    setInstalling(true);
    setError('');
    setLogs([]);
    setProgress(0);
    setCurrentStep(0);
    addLog('Starting installation...');

    try {
      addLog('Checking system dependencies...');
      const deps = await checkDependencies();
      addLog(`Git: ${deps.git_installed ? '✅' : '❌'}`);
      addLog(`Python: ${deps.python_installed ? '✅' : '❌'} (${deps.python_version || 'N/A'})`);
      addLog(`uv: ${deps.uv_installed ? '✅' : '❌'}`);

      if (!deps.git_installed) addLog('Warning: Git not found. May affect skill installation.');
      setProgress(25);
      setCurrentStep(1);

      addLog('Installing Hermes Python package...');
      setProgress(50);
      setCurrentStep(2);

      const result = await installHermes();
      addLog(`Install result: ${result}`);
      setProgress(75);

      addLog('Configuring Hermes...');
      let status = '';
      const onDone = () => {
        setProgress(100);
        setCurrentStep(3);
        setInstalling(false);
        addLog('Installation complete!');
        const done = onComplete || (onNavigate ? () => onNavigate('setup') : () => {});
        setTimeout(done, 1500);
      };

      const pollInterval = setInterval(async () => {
        try {
          status = await getInstallStatus();
          addLog(`Status: ${status}`);
          if (status.toLowerCase().includes('complete') || status.toLowerCase().includes('done')) {
            clearInterval(pollInterval);
            onDone();
          }
        } catch {
          // continue polling
        }
      }, 2000);

      setTimeout(() => {
        clearInterval(pollInterval);
        if (progress < 100) {
          onDone();
        }
      }, 30000);
    } catch (err) {
      setError(String(err));
      setInstalling(false);
      addLog(`Error: ${err}`);
    }
  };

  useEffect(() => {
    startInstall();
  }, []);

  const handleRetry = () => {
    startInstall();
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: '40px', background: 'var(--bg)'
    }}>
      <div style={{ width: '100%', maxWidth: '560px' }}>
        <h2 style={{ margin: '0 0 8px', color: 'var(--text-h)' }}>Installing Hermes</h2>
        <p style={{ color: 'var(--text)', marginBottom: '32px', fontSize: '14px' }}>
          Setting up your AI assistant
        </p>

        <div style={{
          background: 'var(--code-bg)', padding: '24px', borderRadius: '12px',
          border: '1px solid var(--border)', marginBottom: '24px'
        }}>
          <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              flex: 1, height: '8px', borderRadius: '4px', background: 'var(--border)',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progress}%`, height: '100%', borderRadius: '4px',
                background: error ? '#ef4444' : 'var(--accent)',
                transition: 'width 0.5s ease'
              }} />
            </div>
            <span style={{ fontSize: '13px', color: 'var(--text)', minWidth: '32px', textAlign: 'right' }}>
              {progress}%
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <span style={{
                  width: '20px', height: '20px', borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600,
                  background: i < currentStep ? '#22c55e' : i === currentStep ? 'var(--accent)' : 'var(--border)',
                  color: i <= currentStep ? '#fff' : 'var(--text)'
                }}>
                  {i < currentStep ? '✓' : i === currentStep ? '●' : '○'}
                </span>
                <span style={{
                  color: i <= currentStep ? 'var(--text-h)' : 'var(--text)',
                  fontWeight: i === currentStep ? 600 : 400
                }}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        <div ref={logRef} style={{
          background: '#0d1117', color: '#e6edf3', padding: '16px', borderRadius: '8px',
          fontFamily: 'var(--mono)', fontSize: '12px', lineHeight: '1.6',
          maxHeight: '240px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all'
        }}>
          {logs.length === 0 && !installing && <span style={{ color: '#8b949e' }}>Waiting to start...</span>}
          {logs.map((l, i) => <div key={i}>{l}</div>)}
          {installing && <span style={{ color: '#8b949e' }}>▊</span>}
        </div>

        {error && (
          <div style={{
            marginTop: '16px', padding: '12px', borderRadius: '8px',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#ef4444', fontSize: '13px'
          }}>
            {error}
            <button onClick={handleRetry}
              style={{
                marginTop: '8px', padding: '8px 16px', borderRadius: '6px', border: 'none',
                background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600,
                display: 'block', fontSize: '13px'
              }}>Retry Installation</button>
          </div>
        )}

        {!installing && !error && progress === 100 && (
          <p style={{ color: '#22c55e', fontSize: '14px', textAlign: 'center', marginTop: '16px' }}>
            ✅ Installation complete! Redirecting...
          </p>
        )}
      </div>
    </div>
  );
}
