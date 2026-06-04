import { useState, useEffect, useCallback } from 'react';
import { listCronJobs, createCronJob, updateCronJob, deleteCronJob } from '../api/commands';
import type { CronJob } from '../types';

const CRON_PRESETS = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Daily at 9 AM', value: '0 9 * * *' },
  { label: 'Weekly on Monday', value: '0 0 * * 1' },
  { label: 'Custom', value: '' },
];

export default function Schedules() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', cron_expression: '0 * * * *', command: '', target: '', enabled: true,
  });

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const raw = await listCronJobs();
      setJobs(raw.map((j: string) => { try { return JSON.parse(j); } catch { return { id: j, name: j }; } }));
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const handlePreset = (value: string) => {
    setForm(prev => ({ ...prev, cron_expression: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.cron_expression.trim()) {
      setError('Name and cron expression are required');
      return;
    }
    setError('');
    try {
      if (editingId) {
        await updateCronJob(JSON.stringify({
          id: editingId,
          ...form,
          cron_expression: form.cron_expression,
        }));
      } else {
        await createCronJob(JSON.stringify({
          id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
          ...form,
          cron_expression: form.cron_expression,
        }));
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', cron_expression: '0 * * * *', command: '', target: '', enabled: true });
      await loadJobs();
    } catch (err) {
      setError(String(err));
    }
  };

  const handleEdit = (job: CronJob) => {
    setForm({
      name: job.name,
      cron_expression: job.cron_expression,
      command: job.command,
      target: job.target,
      enabled: job.enabled,
    });
    setEditingId(job.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCronJob(id);
      setJobs(prev => prev.filter(j => j.id !== id));
      setConfirmDelete(null);
    } catch (err) {
      setError(String(err));
    }
  };

  const handleToggle = async (job: CronJob) => {
    try {
      await updateCronJob(JSON.stringify({ ...job, enabled: !job.enabled }));
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, enabled: !j.enabled } : j));
    } catch (err) {
      setError(String(err));
    }
  };

  const resetForm = () => {
    setForm({ name: '', cron_expression: '0 * * * *', command: '', target: '', enabled: true });
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: 'var(--bg)', padding: '24px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: 'var(--text-h)' }}>Schedules</h2>
        <button onClick={() => setShowForm(true)}
          style={{
            padding: '8px 16px', borderRadius: '6px', border: 'none',
            background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '13px'
          }}>+ New Schedule</button>
      </div>

      {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

      {showForm && (
        <div style={{
          marginBottom: '20px', padding: '20px', borderRadius: '8px',
          border: '1px solid var(--border)', background: 'var(--code-bg)'
        }}>
          <h3 style={{ margin: '0 0 16px', color: 'var(--text-h)', fontSize: '16px' }}>
            {editingId ? 'Edit Schedule' : 'New Schedule'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text)', marginBottom: '4px' }}>Name</label>
              <input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Daily backup"
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)',
                  background: 'var(--bg)', color: 'var(--text-h)', fontSize: '13px', boxSizing: 'border-box'
                }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text)', marginBottom: '4px' }}>Target</label>
              <input value={form.target} onChange={e => setForm(prev => ({ ...prev, target: e.target.value }))}
                placeholder="delivery://chat"
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)',
                  background: 'var(--bg)', color: 'var(--text-h)', fontSize: '13px', boxSizing: 'border-box'
                }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text)', marginBottom: '4px' }}>Command</label>
              <input value={form.command} onChange={e => setForm(prev => ({ ...prev, command: e.target.value }))}
                placeholder="/system backup --full"
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)',
                  background: 'var(--bg)', color: 'var(--text-h)', fontSize: '13px', boxSizing: 'border-box'
                }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text)', marginBottom: '4px' }}>Cron Expression</label>
              <input value={form.cron_expression} onChange={e => setForm(prev => ({ ...prev, cron_expression: e.target.value }))}
                placeholder="0 * * * *"
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)',
                  background: 'var(--bg)', color: 'var(--text-h)', fontSize: '13px', fontFamily: 'var(--mono)',
                  marginBottom: '8px', boxSizing: 'border-box'
                }} />
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {CRON_PRESETS.map(p => (
                  <button key={p.label} onClick={() => handlePreset(p.value)}
                    style={{
                      padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--border)',
                      background: form.cron_expression === p.value ? 'var(--accent-bg)' : 'var(--bg)',
                      color: form.cron_expression === p.value ? 'var(--accent)' : 'var(--text)',
                      cursor: 'pointer', fontSize: '11px'
                    }}>{p.label}</button>
                ))}
              </div>
            </div>
          </div>
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

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {loading && <p style={{ color: 'var(--text)', textAlign: 'center', padding: '40px' }}>Loading schedules...</p>}

        {!loading && jobs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏰</div>
            <h3 style={{ color: 'var(--text-h)', margin: '0 0 8px' }}>No schedules</h3>
            <p style={{ fontSize: '14px' }}>Create a scheduled task to automate Hermes.</p>
          </div>
        )}

        {jobs.map(job => (
          <div key={job.id} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '16px', borderRadius: '8px', border: '1px solid var(--border)',
            background: 'var(--code-bg)', opacity: job.enabled ? 1 : 0.5
          }}>
            <label style={{
              position: 'relative', display: 'inline-block', width: '44px', height: '24px',
              cursor: 'pointer', flexShrink: 0
            }}>
              <input type="checkbox" checked={job.enabled}
                onChange={() => handleToggle(job)}
                style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{
                position: 'absolute', inset: 0, borderRadius: '12px',
                background: job.enabled ? 'var(--accent)' : 'var(--border)',
                transition: 'background 0.2s'
              }}>
                <span style={{
                  position: 'absolute', top: '2px', left: job.enabled ? '22px' : '2px',
                  width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s'
                }} />
              </span>
            </label>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'var(--text-h)', fontWeight: 600, fontSize: '14px' }}>{job.name}</div>
              <div style={{
                display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text)', marginTop: '4px',
                flexWrap: 'wrap'
              }}>
                <span style={{ fontFamily: 'var(--mono)' }}>{job.cron_expression}</span>
                <span>{job.command}</span>
                {job.next_run && <span>Next: {new Date(job.next_run).toLocaleString()}</span>}
                {job.last_run && <span>Last: {new Date(job.last_run).toLocaleString()}</span>}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
              <button onClick={() => handleEdit(job)}
                style={{
                  padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)',
                  background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: '11px'
                }}>Edit</button>
              {confirmDelete === job.id ? (
                <>
                  <button onClick={() => handleDelete(job.id)}
                    style={{
                      padding: '4px 8px', borderRadius: '4px', border: 'none',
                      background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '11px'
                    }}>Delete</button>
                  <button onClick={() => setConfirmDelete(null)}
                    style={{
                      padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)',
                      background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: '11px'
                    }}>Cancel</button>
                </>
              ) : (
                <button onClick={() => setConfirmDelete(job.id)}
                  style={{
                    padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)',
                    background: 'var(--bg)', color: '#ef4444', cursor: 'pointer', fontSize: '11px'
                  }}>Delete</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
