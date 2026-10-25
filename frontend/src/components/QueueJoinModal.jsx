import React, { useState } from 'react';
import { api } from '../services/api';
import { X, Users, Clock, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';

export default function QueueJoinModal({ slot, onClose, onJoined }) {
  const [partySize, setPartySize] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [queueTicket, setQueueTicket] = useState(null);

  if (!slot) return null;

  const handleJoinQueue = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const q = await api.queue.join({
        slot_id: slot.id,
        party_size: Number(partySize),
      });
      setQueueTicket(q);
      if (onJoined) onJoined(q);
    } catch (err) {
      setError(err.message || 'Could not join waiting queue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        {queueTicket ? (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'rgba(139, 92, 246, 0.15)',
                  color: '#c084fc',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '0.75rem',
                  boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)',
                }}
              >
                <Sparkles size={32} />
              </div>
              <h3 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '0.25rem' }}>
                YOU ARE #{queueTicket.position} IN THE QUEUE
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Estimated wait: ~{Math.round(queueTicket.predicted_wait_time_minutes)} minutes
              </p>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '1.25rem',
                marginBottom: '1.5rem',
                display: 'grid',
                gap: '0.75rem',
                fontSize: '0.9rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Queue ID</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                  {queueTicket.id.slice(0, 8)}...
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Resource</span>
                <span style={{ fontWeight: 600 }}>{queueTicket.resource_name || slot.resource_name}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Date</span>
                <span>{queueTicket.slot_date || slot.slot_date}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Time</span>
                <span>{String(slot.start_time).slice(0, 5)} - {String(slot.end_time).slice(0, 5)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Current Position</span>
                <span className="badge badge-partial">#{queueTicket.position}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Estimated Waiting Time</span>
                <span className="badge badge-ml">~{Math.round(queueTicket.predicted_wait_time_minutes)} minutes</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Queue Status</span>
                <span className="badge badge-partial">WAITING</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Joined At</span>
                <span style={{ fontSize: '0.85rem' }}>
                  {new Date(queueTicket.joined_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.85rem 1rem',
                fontSize: '0.86rem',
                color: '#e9d5ff',
                marginBottom: '1.5rem',
                lineHeight: 1.5,
              }}
            >
              You will be automatically promoted when a reservation becomes available.
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={onClose}
            >
              Done & View Live Queue
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span className="badge badge-full">This slot is currently full.</span>
                  <span className="badge badge-ml"><Sparkles size={12} /> ML Queue Prediction</span>
                </div>
                <h3 style={{ fontSize: '1.4rem' }}>Join Waiting Queue</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{slot.resource_name}</p>
              </div>
              <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="banner" style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#fca5a5' }}>
                <AlertCircle size={18} />
                <span style={{ fontSize: '0.88rem' }}>{error}</span>
              </div>
            )}

            <div
              style={{
                background: 'rgba(139, 92, 246, 0.08)',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#c084fc', fontWeight: 600 }}>QUEUE POSITION ESTIMATION</span>
                <span style={{ fontSize: '0.85rem', color: '#e9d5ff' }}>Estimated Position #{slot.active_queue_count + 1}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '2rem', fontFamily: 'var(--font-heading)', fontWeight: 700, color: '#f3e8ff' }}>
                  ~{Math.max(8, (slot.active_queue_count + 1) * 15)} mins
                </span>
                <span style={{ fontSize: '0.85rem', color: '#d8b4fe' }}>estimated wait</span>
              </div>

              <p style={{ fontSize: '0.82rem', color: '#e9d5ff', opacity: 0.9, margin: 0 }}>
                You will be automatically promoted when a reservation becomes available.
              </p>
            </div>

            <form onSubmit={handleJoinQueue}>
              <div className="form-group">
                <label className="form-label">Party Size</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  required
                  className="form-input"
                  value={partySize}
                  onChange={(e) => setPartySize(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
                  }}
                  disabled={loading}
                >
                  {loading ? 'Joining Queue...' : 'Join Queue'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
