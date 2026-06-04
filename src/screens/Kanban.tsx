import { useState, useEffect, useCallback } from 'react';
import { getKanbanData, updateKanbanColumn, moveCard } from '../api/commands';
import type { KanbanBoard, KanbanCard } from '../types';

const COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
};

export default function Kanban() {
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<{ colId: string; card: KanbanCard } | null>(null);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium' as KanbanCard['priority'] });

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getKanbanData();
      setBoard(typeof data === 'string' ? JSON.parse(data) : data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  const saveColumn = async (colId: string, cards: KanbanCard[]) => {
    if (!board) return;
    const col = board.columns.find(c => c.id === colId);
    if (!col) return;
    try {
      await updateKanbanColumn(JSON.stringify({ ...col, cards }));
    } catch (err) {
      setError(String(err));
    }
  };

  const handleAddCard = async (colId: string) => {
    if (!form.title.trim()) return;
    if (!board) return;
    const card: KanbanCard = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      created_at: new Date().toISOString(),
    };

    const updatedColumns = board.columns.map(col => {
      if (col.id === colId) {
        return { ...col, cards: [...col.cards, card] };
      }
      return col;
    });
    setBoard({ ...board, columns: updatedColumns });
    await saveColumn(colId, updatedColumns.find(c => c.id === colId)?.cards || []);
    setShowAdd(null);
    setForm({ title: '', description: '', priority: 'medium' });
  };

  const handleMoveCard = async (cardId: string, fromColId: string, toColId: string) => {
    if (!board) return;
    const fromCol = board.columns.find(c => c.id === fromColId);
    if (!fromCol) return;
    const card = fromCol.cards.find(c => c.id === cardId);
    if (!card) return;

    try {
      await moveCard(cardId, toColId);
      const updatedColumns = board.columns.map(col => {
        if (col.id === fromColId) return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
        if (col.id === toColId) return { ...col, cards: [...col.cards, card] };
        return col;
      });
      setBoard({ ...board, columns: updatedColumns });
    } catch (err) {
      setError(String(err));
    }
  };

  const handleDeleteCard = async (colId: string, cardId: string) => {
    if (!board) return;
    const updatedColumns = board.columns.map(col => {
      if (col.id === colId) return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
      return col;
    });
    setBoard({ ...board, columns: updatedColumns });
    await saveColumn(colId, updatedColumns.find(c => c.id === colId)?.cards || []);
  };

  const handleEditCard = async () => {
    if (!editingCard || !board || !form.title.trim()) return;
    const updatedColumns = board.columns.map(col => {
      if (col.id === editingCard.colId) {
        return {
          ...col,
          cards: col.cards.map(c => c.id === editingCard.card.id ? { ...c, ...form } : c),
        };
      }
      return col;
    });
    setBoard({ ...board, columns: updatedColumns });
    await saveColumn(editingCard.colId, updatedColumns.find(c => c.id === editingCard.colId)?.cards || []);
    setEditingCard(null);
    setForm({ title: '', description: '', priority: 'medium' });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
        Loading board...
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: 'var(--bg)', padding: '24px'
    }}>
      <h2 style={{ margin: '0 0 20px', color: 'var(--text-h)' }}>{board?.name || 'Kanban Board'}</h2>

      {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

      <div style={{ flex: 1, display: 'flex', gap: '16px', overflowX: 'auto', overflowY: 'hidden' }}>
        {(board?.columns || []).map(col => {
          const nextCol = board?.columns.find((_, i, arr) => arr[i].id !== col.id && arr.indexOf(col) < i);
          const prevCol = board?.columns.find((_, i, arr) => arr[i].id !== col.id && arr.indexOf(col) > i);

          return (
            <div key={col.id} style={{
              flex: 1, minWidth: '280px', maxWidth: '400px',
              display: 'flex', flexDirection: 'column',
              borderRadius: '8px', border: '1px solid var(--border)',
              background: 'var(--code-bg)'
            }}>
              <div style={{
                padding: '12px 16px', borderBottom: '1px solid var(--border)',
                fontWeight: 600, color: 'var(--text-h)', fontSize: '14px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span>{col.name}</span>
                <span style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 400 }}>
                  {col.cards.length}
                </span>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                {col.cards.map(card => {
                  const isEditing = editingCard?.card.id === card.id && editingCard?.colId === col.id;
                  return (
                    <div key={card.id} style={{
                      padding: '12px', marginBottom: '8px', borderRadius: '6px',
                      border: '1px solid var(--border)', background: 'var(--bg)',
                      borderLeft: `3px solid ${COLORS[card.priority] || COLORS.medium}`
                    }}>
                      {isEditing ? (
                        <div>
                          <input value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                            style={{
                              width: '100%', padding: '6px 8px', borderRadius: '4px',
                              border: '1px solid var(--border)', background: 'var(--code-bg)',
                              color: 'var(--text-h)', fontSize: '13px', marginBottom: '6px',
                              boxSizing: 'border-box'
                            }} />
                          <input value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                            style={{
                              width: '100%', padding: '6px 8px', borderRadius: '4px',
                              border: '1px solid var(--border)', background: 'var(--code-bg)',
                              color: 'var(--text-h)', fontSize: '12px', marginBottom: '6px',
                              boxSizing: 'border-box'
                            }} />
                          <select value={form.priority} onChange={e => setForm(prev => ({ ...prev, priority: e.target.value as KanbanCard['priority'] }))}
                            style={{
                              width: '100%', padding: '6px 8px', borderRadius: '4px',
                              border: '1px solid var(--border)', background: 'var(--code-bg)',
                              color: 'var(--text-h)', fontSize: '12px', marginBottom: '6px'
                            }}>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={handleEditCard}
                              style={{
                                padding: '4px 8px', borderRadius: '4px', border: 'none',
                                background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: '11px'
                              }}>Save</button>
                            <button onClick={() => setEditingCard(null)}
                              style={{
                                padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)',
                                background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: '11px'
                              }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ color: 'var(--text-h)', fontWeight: 600, fontSize: '13px' }}>{card.title}</div>
                          {card.description && (
                            <div style={{ color: 'var(--text)', fontSize: '12px', marginTop: '4px' }}>
                              {card.description}
                            </div>
                          )}
                          <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            marginTop: '8px'
                          }}>
                            <span style={{
                              fontSize: '10px', padding: '2px 6px', borderRadius: '3px',
                              background: `${COLORS[card.priority]}20`, color: COLORS[card.priority],
                              textTransform: 'uppercase', fontWeight: 600
                            }}>{card.priority}</span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {prevCol && (
                                <button onClick={() => handleMoveCard(card.id, col.id, prevCol.id)}
                                  style={{
                                    padding: '2px 6px', borderRadius: '3px', border: '1px solid var(--border)',
                                    background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: '10px'
                                  }}>←</button>
                              )}
                              {nextCol && (
                                <button onClick={() => handleMoveCard(card.id, col.id, nextCol.id)}
                                  style={{
                                    padding: '2px 6px', borderRadius: '3px', border: '1px solid var(--border)',
                                    background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: '10px'
                                  }}>→</button>
                              )}
                              <button onClick={() => { setEditingCard({ colId: col.id, card }); setForm({ title: card.title, description: card.description, priority: card.priority }); }}
                                style={{
                                  padding: '2px 6px', borderRadius: '3px', border: '1px solid var(--border)',
                                  background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: '10px'
                                }}>Edit</button>
                              <button onClick={() => handleDeleteCard(col.id, card.id)}
                                style={{
                                  padding: '2px 6px', borderRadius: '3px', border: '1px solid var(--border)',
                                  background: 'var(--bg)', color: '#ef4444', cursor: 'pointer', fontSize: '10px'
                                }}>×</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ padding: '8px', borderTop: '1px solid var(--border)' }}>
                {showAdd === col.id ? (
                  <div>
                    <input value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Card title"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && handleAddCard(col.id)}
                      style={{
                        width: '100%', padding: '6px 8px', borderRadius: '4px',
                        border: '1px solid var(--border)', background: 'var(--bg)',
                        color: 'var(--text-h)', fontSize: '12px', marginBottom: '4px',
                        boxSizing: 'border-box'
                      }} />
                    <input value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Description (optional)"
                      style={{
                        width: '100%', padding: '6px 8px', borderRadius: '4px',
                        border: '1px solid var(--border)', background: 'var(--bg)',
                        color: 'var(--text-h)', fontSize: '12px', marginBottom: '4px',
                        boxSizing: 'border-box'
                      }} />
                    <select value={form.priority} onChange={e => setForm(prev => ({ ...prev, priority: e.target.value as KanbanCard['priority'] }))}
                      style={{
                        width: '100%', padding: '4px 6px', borderRadius: '4px',
                        border: '1px solid var(--border)', background: 'var(--bg)',
                        color: 'var(--text-h)', fontSize: '11px', marginBottom: '4px'
                      }}>
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => handleAddCard(col.id)}
                        style={{
                          flex: 1, padding: '6px', borderRadius: '4px', border: 'none',
                          background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: '12px'
                        }}>Add</button>
                      <button onClick={() => { setShowAdd(null); setForm({ title: '', description: '', priority: 'medium' }); }}
                        style={{
                          padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border)',
                          background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: '12px'
                        }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setShowAdd(col.id); setForm({ title: '', description: '', priority: 'medium' }); }}
                    style={{
                      width: '100%', padding: '8px', borderRadius: '4px', border: '1px dashed var(--border)',
                      background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: '12px'
                    }}>+ Add Card</button>
                )}
              </div>
            </div>
          );
        })}

        {(!board || board.columns.length === 0) && !loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text)', width: '100%' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <h3 style={{ color: 'var(--text-h)', margin: '0 0 8px' }}>No board data</h3>
          </div>
        )}
      </div>
    </div>
  );
}
