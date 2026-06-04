import { useState, useEffect, useRef, useCallback } from 'react';
import {
  createSession, getSession,
  getMessages, addMessage, listSavedModels
} from '../api/commands';
import type { Message, ModelConfig } from '../types';

interface ChatProps {
  sessionId?: string;
  onNavigate?: (screen: string) => void;
}

const MAX_TOKENS = 128000;

function formatTimestamp(ts: string) {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return ts;
  }
}

function renderMarkdown(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background:#1f2028;padding:12px;border-radius:6px;overflow-x:auto;font-size:13px"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code style="background:#1f2028;padding:2px 6px;border-radius:3px;font-size:13px">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:var(--accent)">$1</a>')
    .replace(/\n- (.+)/g, '\n• $1')
    .replace(/\n/g, '<br/>');
  return html;
}

export default function Chat({ sessionId: initialSessionId }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(initialSessionId || null);
  const [sessionTitle, setSessionTitle] = useState('New Chat');
  const [tokensUsed, setTokensUsed] = useState(0);
  const [selectedModel, setSelectedModel] = useState('');
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [showCommands, setShowCommands] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [attachedFile, setAttachedFile] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadModels = useCallback(async () => {
    try {
      const m = await listSavedModels();
      setModels(m);
      if (m.length > 0 && !selectedModel) setSelectedModel(m[0].model_id);
    } catch {
      // silently fail
    }
  }, []);

  const loadMessages = useCallback(async (sid: string) => {
    try {
      const msgs = await getMessages(sid);
      setMessages(msgs);
      const total = msgs.reduce((sum, m) => sum + (m.tokens || 0), 0);
      setTokensUsed(total);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const createNewSession = useCallback(async () => {
    try {
      const sid = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
      const sessionData = JSON.stringify({
        id: sid, title: 'New Chat', model: selectedModel,
        profile_name: 'default', created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(), message_count: 0, tokens_used: 0
      });
      await createSession(sessionData);
      setCurrentSessionId(sid);
      setSessionTitle('New Chat');
      setMessages([]);
      setTokensUsed(0);
      return sid;
    } catch (err) {
      setError(String(err));
      return null;
    }
  }, [selectedModel]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadModels();
      if (initialSessionId) {
        setCurrentSessionId(initialSessionId);
        try {
          const s = await getSession(initialSessionId);
          if (s) {
            setSessionTitle(s.title);
            setSelectedModel(s.model);
          }
        } catch {}
        await loadMessages(initialSessionId);
      } else {
        await createNewSession();
      }
      setLoading(false);
    };
    init();
  }, [initialSessionId]);

  useEffect(() => {
    if (currentSessionId) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => {
        loadMessages(currentSessionId);
      }, 3000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
  }, [currentSessionId, loadMessages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !currentSessionId || sending) return;

    if (text.startsWith('/')) {
      handleSlashCommand(text);
      setInput('');
      return;
    }

    setSending(true);
    setError('');

    try {
      const userMsg: Message = {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-msg`,
        session_id: currentSessionId,
        role: 'user',
        content: attachedFile ? `[File: ${attachedFile}]\n\n${text}` : text,
        tokens: 0,
        created_at: new Date().toISOString(),
      };
      await addMessage(JSON.stringify(userMsg));
      setInput('');
      setAttachedFile(null);

      if (sessionTitle === 'New Chat') {
        const newTitle = text.length > 40 ? text.slice(0, 40) + '...' : text;
        setSessionTitle(newTitle);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setSending(false);
    }
  };

  const handleSlashCommand = (cmd: string) => {
    const parts = cmd.split(' ');
    const command = parts[0].toLowerCase();
    switch (command) {
      case '/new':
        handleNewSession();
        break;
      case '/clear':
        setMessages([]);
        setTokensUsed(0);
        break;
      case '/help':
        setMessages(prev => [...prev, {
          id: 'help-msg', session_id: currentSessionId || '', role: 'assistant',
          content: `**Available Commands:**\n- /new - Start a new chat session\n- /clear - Clear all messages\n- /fast - Toggle fast mode\n- /help - Show this help message\n- /pin - Toggle pinning the panel`,
          tokens: 0, created_at: new Date().toISOString()
        }]);
        break;
      case '/fast':
      case '/pin':
        break;
    }
  };

  const handleNewSession = async () => {
    await createNewSession();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setShowCommands(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    if (val.startsWith('/')) {
      setShowCommands(true);
      setSlashFilter(val.slice(1));
    } else {
      setShowCommands(false);
    }
  };

  const commands = [
    { name: '/new', desc: 'New chat session' },
    { name: '/clear', desc: 'Clear messages' },
    { name: '/help', desc: 'Show commands' },
    { name: '/fast', desc: 'Toggle fast mode' },
    { name: '/pin', desc: 'Toggle pin panel' },
  ];

  const filteredCommands = slashFilter
    ? commands.filter(c => c.name.includes(slashFilter))
    : commands;

  const handleFileAttach = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const file = await open({ multiple: false });
      if (file) setAttachedFile(file as string);
    } catch {
      // fallback
    }
  };

  const handleModelChange = async (modelId: string) => {
    setSelectedModel(modelId);
    if (currentSessionId) {
      try {
        const { setConfig } = await import('../api/commands');
        await setConfig('llm.model', modelId);
      } catch {}
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontSize: '16px'
      }}>
        Loading chat...
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: 'var(--bg)', maxWidth: '100%'
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px', borderBottom: '1px solid var(--border)',
        background: 'var(--code-bg)', gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          <button onClick={handleNewSession}
            style={{
              padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)',
              background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: '13px',
              whiteSpace: 'nowrap'
            }} title="New session">
            +
          </button>
          <span style={{
            color: 'var(--text-h)', fontWeight: 600, fontSize: '14px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>{sessionTitle}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select value={selectedModel} onChange={e => handleModelChange(e.target.value)}
            style={{
              padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)',
              background: 'var(--bg)', color: 'var(--text-h)', fontSize: '13px', cursor: 'pointer'
            }}>
            {models.map(m => (
              <option key={m.name} value={m.model_id}>{m.name} ({m.provider})</option>
            ))}
            {models.length === 0 && <option value="">No models saved</option>}
          </select>
        </div>
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', padding: '20px',
        display: 'flex', flexDirection: 'column', gap: '8px'
      }}>
        {messages.length === 0 && !loading && (
          <div style={{
            textAlign: 'center', color: 'var(--text)', padding: '40px 20px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px'
          }}>
            <div style={{ fontSize: '48px' }}>🤖</div>
            <h3 style={{ color: 'var(--text-h)', margin: 0 }}>How can I help you?</h3>
            <p style={{ fontSize: '14px', maxWidth: '400px' }}>
              Ask me anything! Type a message below or use /commands.
            </p>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} style={{
            display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: '4px'
          }}>
            <div style={{
              maxWidth: '70%', padding: '10px 16px', borderRadius: '12px',
              background: msg.role === 'user' ? 'var(--accent-bg)' : 'var(--code-bg)',
              border: msg.role === 'user' ? '1px solid var(--accent-border)' : '1px solid var(--border)',
              color: 'var(--text-h)', fontSize: '14px', lineHeight: '1.5',
              wordWrap: 'break-word'
            }}>
              {msg.role === 'assistant' ? (
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
              ) : (
                <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
              )}
              <div style={{
                fontSize: '11px', color: 'var(--text)', marginTop: '6px',
                textAlign: 'right', opacity: 0.7
              }}>
                {formatTimestamp(msg.created_at)}
                {msg.tokens > 0 && ` · ${msg.tokens} tokens`}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div style={{
          padding: '8px 20px', background: 'rgba(239,68,68,0.1)',
          borderTop: '1px solid rgba(239,68,68,0.3)', color: '#ef4444',
          fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span>{error}</span>
          <button onClick={() => setError('')}
            style={{
              background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer',
              fontSize: '13px', textDecoration: 'underline'
            }}>Dismiss</button>
        </div>
      )}

      <div style={{
        padding: '12px 20px', borderTop: '1px solid var(--border)',
        background: 'var(--code-bg)', position: 'relative'
      }}>
        {attachedFile && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px',
            padding: '6px 12px', background: 'var(--bg)', borderRadius: '6px',
            border: '1px solid var(--border)', fontSize: '13px', color: 'var(--text)'
          }}>
            <span>📎</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {attachedFile.split(/[/\\]/).pop()}
            </span>
            <button onClick={() => setAttachedFile(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: '16px' }}>
              ×
            </button>
          </div>
        )}

        {showCommands && (
          <div style={{
            position: 'absolute', bottom: '100%', left: '20px', right: '20px',
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: '8px', boxShadow: 'var(--shadow)', marginBottom: '4px',
            maxHeight: '200px', overflowY: 'auto', zIndex: 10
          }}>
            {filteredCommands.map(cmd => (
              <button key={cmd.name} onClick={() => { handleSlashCommand(cmd.name); setInput(''); setShowCommands(false); }}
                style={{
                  width: '100%', padding: '10px 16px', textAlign: 'left', border: 'none',
                  background: 'transparent', color: 'var(--text-h)', cursor: 'pointer',
                  fontSize: '14px', display: 'flex', justifyContent: 'space-between',
                  borderBottom: '1px solid var(--border)'
                }}>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{cmd.name}</span>
                <span style={{ color: 'var(--text)', fontSize: '13px' }}>{cmd.desc}</span>
              </button>
            ))}
            {filteredCommands.length === 0 && (
              <div style={{ padding: '10px 16px', color: 'var(--text)', fontSize: '14px' }}>
                No commands found
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleFileAttach}
            style={{
              padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)',
              background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: '16px'
            }} title="Attach file">
            📎
          </button>
          <input ref={inputRef} value={input} onChange={handleInputChange} onKeyDown={handleKeyDown}
            placeholder="Type a message... (/help for commands)"
            style={{
              flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)',
              background: 'var(--bg)', color: 'var(--text-h)', fontSize: '14px', outline: 'none'
            }} />
          <button onClick={handleSend} disabled={!input.trim() || sending}
            style={{
              padding: '10px 20px', borderRadius: '8px', border: 'none',
              background: !input.trim() ? 'var(--code-bg)' : 'var(--accent)',
              color: !input.trim() ? 'var(--text)' : '#fff',
              cursor: !input.trim() ? 'default' : 'pointer', fontWeight: 600, fontSize: '14px'
            }}>
            {sending ? '...' : 'Send'}
          </button>
        </div>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '6px 20px', borderTop: '1px solid var(--border)',
        fontSize: '12px', color: 'var(--text)'
      }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>Tokens: {tokensUsed}</span>
          <span>Messages: {messages.length}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Context</span>
          <div style={{
            width: '80px', height: '6px', borderRadius: '3px', background: 'var(--border)',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${Math.min((tokensUsed / MAX_TOKENS) * 100, 100)}%`,
              height: '100%', borderRadius: '3px',
              background: tokensUsed / MAX_TOKENS > 0.8 ? '#ef4444'
                : tokensUsed / MAX_TOKENS > 0.5 ? '#f59e0b' : 'var(--accent)',
              transition: 'width 0.3s'
            }} />
          </div>
          <span>{Math.round((tokensUsed / MAX_TOKENS) * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
