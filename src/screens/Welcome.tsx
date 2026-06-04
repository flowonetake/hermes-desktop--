import { useState } from 'react';

interface WelcomeProps {
  onNavigate: (screen: 'setup' | 'install') => void;
}

export default function Welcome({ onNavigate }: WelcomeProps) {
  const [step] = useState(0);

  return (
    <div className="welcome-screen">
      <div className="welcome-card">
        <div className="welcome-logo">H</div>
        <h1>Hermes Desktop</h1>
        <p className="welcome-subtitle">
          Your AI agent companion
        </p>
        {step === 0 && (
          <div className="welcome-actions">
            <p className="welcome-desc">
              Hermes is not installed yet. Get started by installing Hermes or
              configuring an existing installation.
            </p>
            <button className="btn btn-primary" onClick={() => onNavigate('install')}>
              Install Hermes
            </button>
            <button className="btn btn-secondary" onClick={() => onNavigate('setup')}>
              Configure Existing
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
