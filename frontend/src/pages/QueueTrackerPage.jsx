import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Users, Clock, Sparkles, AlertCircle, CheckCircle, ArrowRight, XCircle, RefreshCw } from 'lucide-react';

export default function QueueTrackerPage({ onNavigate }) {
  const [queueEntries, setQueueEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [leavingId, setLeavingId] = useState(null);

  const fetchQueueEntries = async () => {
    try {
      const data = await api.queue.listMy();
      setQueueEntries(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueEntries();
    // Live polling every 5 seconds for real-time queue position and auto-promotion tracking
    const interval = setInterval(fetchQueueEntries, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLeaveQueue = async (queueId) => {
    if (!window.confirm('Are you sure you want to exit the queue? You will lose your current position.')) {
      return;
    }
    setLeavingId(queueId);
    try {
      await api.queue.leave(queueId);
      await fetchQueueEntries();
    } catch (err) {
      setError(err.message);
    } finally {
      setLeavingId(null);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className="badge badge-ml"><Sparkles size={13} /> Live Prediction Active</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Auto-refreshes every 5s</span>
          </div>
          <h1 className="page-title">Live Queue Tracker</h1>
          <p className="page-subtitle">
            Real-time waiting queue positioning, dynamic wait-time ML estimation, and automated promotions.
          </p>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={fetchQueueEntries} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'badge-pulse' : ''} />
          <span>Refresh Status</span>
        </button>
      </div>

      {error && (
        <div className="banner" style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#fca5a5' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading && queueEntries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
          <div className="badge-pulse" style={{ width: 14, height: 14, margin: '0 auto 1rem', color: 'var(--accent-cyan)' }} />
          <div>Checking live queue tickets...</div>
        </div>
      ) : queueEntries.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
          <Users size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <h3>You have no active queue tickets.</h3>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
            When a time slot is fully booked, you can join the queue to be automatically promoted when a cancellation occurs!
          </p>
          <button
            className="btn btn-primary"
            style={{ marginTop: '1.5rem' }}
            onClick={() => onNavigate && onNavigate('browse')}
          >
            Browse Available Slots
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {queueEntries.map((entry) => {
            const isWaiting = entry.status === 'WAITING';
            const isPromoted = entry.status === 'PROMOTED';
            const isCancelled = entry.status === 'CANCELLED';

            return (
              <div
                key={entry.id}
                className="glass-card"
                style={{
                  border: isPromoted
                    ? '2px solid var(--status-available)'
                    : '1px solid var(--border-subtle)',
                  background: isPromoted
                    ? 'rgba(16, 185, 129, 0.05)'
                    : 'var(--bg-card)',
                  padding: '2rem',
                }}
              >
                {/* Promoted Alert Banner */}
                {isPromoted && (
                  <div
                    className="banner banner-success"
                    style={{
                      marginBottom: '1.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <CheckCircle size={22} color="#10B981" />
                      <div>
                        <strong>Congratulations! A slot opened up.</strong>
                        <div style={{ fontSize: '0.85rem' }}>
                          You have been automatically promoted to a confirmed reservation!
                        </div>
                      </div>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => onNavigate && onNavigate('my-reservations')}
                    >
                      View Booking Receipt
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Time Slot Queue
                      </span>
                      {isWaiting && (
                        <span className="badge badge-partial">
                          <span className="badge-pulse" /> In Queue
                        </span>
                      )}
                      {isPromoted && <span className="badge badge-available">Promoted</span>}
                      {isCancelled && <span className="badge badge-full">Exited</span>}
                    </div>

                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                      {entry.resource_name}
                    </h2>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      <span>{entry.slot_date}</span>
                      <span>•</span>
                      <span>
                        {String(entry.start_time).slice(0, 5)} - {String(entry.end_time).slice(0, 5)}
                      </span>
                      <span>•</span>
                      <span>Party of {entry.party_size}</span>
                    </div>
                  </div>

                  {/* Position & Wait Time Display */}
                  {isWaiting && (
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{
                        background: 'rgba(6, 182, 212, 0.08)',
                        border: '1px solid rgba(6, 182, 212, 0.25)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1rem 1.5rem',
                        textAlign: 'center',
                        minWidth: 140,
                      }}>
                        <div style={{ fontSize: '0.78rem', color: '#67e8f9', textTransform: 'uppercase', fontWeight: 600 }}>
                          Queue Position
                        </div>
                        <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: '#fff' }}>
                          #{entry.position}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          in line
                        </div>
                      </div>

                      <div style={{
                        background: 'rgba(139, 92, 246, 0.08)',
                        border: '1px solid rgba(139, 92, 246, 0.25)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1rem 1.5rem',
                        textAlign: 'center',
                        minWidth: 160,
                      }}>
                        <div style={{ fontSize: '0.78rem', color: '#c084fc', textTransform: 'uppercase', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                          <Sparkles size={12} /> Predicted Wait
                        </div>
                        <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: '#f3e8ff' }}>
                          ~{Math.round(entry.predicted_wait_time_minutes)}<span style={{ fontSize: '1.2rem' }}>m</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#d8b4fe' }}>
                          via Gradient Boosting
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {isWaiting && (
                  <div
                    style={{
                      background: 'rgba(139, 92, 246, 0.08)',
                      border: '1px solid rgba(139, 92, 246, 0.25)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.85rem 1.25rem',
                      marginTop: '1.25rem',
                      fontSize: '0.88rem',
                      color: '#e9d5ff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <span>⚡ <strong>You will be automatically promoted when a reservation becomes available.</strong></span>
                  </div>
                )}

                {isWaiting && (
                  <div style={{
                    marginTop: '1.25rem',
                    paddingTop: '1.25rem',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Clock size={14} color="var(--accent-cyan)" />
                      <span>Joined queue: {new Date(entry.joined_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}. Position updates dynamically on vacancies.</span>
                    </div>

                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleLeaveQueue(entry.id)}
                      disabled={leavingId === entry.id}
                    >
                      <XCircle size={16} />
                      <span>{leavingId === entry.id ? 'Leaving...' : 'Leave Queue'}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
