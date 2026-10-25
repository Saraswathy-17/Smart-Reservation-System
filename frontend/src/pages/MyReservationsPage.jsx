import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Calendar, Clock, Users, XCircle, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function MyReservationsPage() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadReservations = async () => {
    setLoading(true);
    try {
      const data = await api.reservations.listMy();
      setReservations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, []);

  const handleCancel = async (id, code) => {
    if (!window.confirm(`Are you sure you want to cancel reservation ${code}? This will immediately notify and promote the next customer waiting in the queue.`)) {
      return;
    }

    setCancellingId(id);
    setError('');
    setMessage('');

    try {
      await api.reservations.cancel(id, 'Cancelled voluntarily by user');
      setMessage(`Reservation ${code} cancelled. Capacity has been returned and queue backfilled.`);
      await loadReservations();
    } catch (err) {
      setError(err.message);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">My Reservation History</h1>
          <p className="page-subtitle">
            Manage your confirmed bookings, access check-in codes, and monitor statuses.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadReservations} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'badge-pulse' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {message && (
        <div className="banner banner-success">
          <CheckCircle size={18} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="banner" style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#fca5a5' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
          <div className="badge-pulse" style={{ width: 14, height: 14, margin: '0 auto 1rem', color: 'var(--accent-cyan)' }} />
          <div>Loading your reservations...</div>
        </div>
      ) : reservations.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
          <Calendar size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <h3>No reservations found.</h3>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
            Browse available slots to place your first reservation!
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {reservations.map((res) => {
            const isConfirmed = res.status === 'CONFIRMED';
            const isCancelled = res.status === 'CANCELLED';

            return (
              <div
                key={res.id}
                className="glass-card"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1.5rem',
                  borderLeft: `4px solid ${isConfirmed ? 'var(--status-available)' : 'var(--status-full)'}`
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: 'var(--accent-cyan)',
                      background: 'rgba(6, 182, 212, 0.1)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      letterSpacing: '0.05em'
                    }}>
                      {res.reservation_code}
                    </span>

                    {isConfirmed && <span className="badge badge-available">Confirmed</span>}
                    {isCancelled && <span className="badge badge-full">Cancelled</span>}
                  </div>

                  <h3 style={{ fontSize: '1.2rem', marginBottom: '0.35rem' }}>{res.resource_name}</h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', color: 'var(--text-muted)', fontSize: '0.88rem', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={15} color="var(--accent-cyan)" />
                      {res.slot_date}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={15} color="var(--accent-cyan)" />
                      {String(res.start_time).slice(0, 5)} - {String(res.end_time).slice(0, 5)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Users size={15} color="var(--accent-cyan)" />
                      Party of {res.party_size}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>
                      Booked: {new Date(res.created_at || res.confirmed_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  {res.special_notes && (
                    <div style={{ marginTop: '0.6rem', fontSize: '0.82rem', color: 'var(--text-subtle)', fontStyle: 'italic' }}>
                      Note: "{res.special_notes}"
                    </div>
                  )}

                  {isCancelled && res.cancellation_reason && (
                    <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: '#f87171' }}>
                      Reason: {res.cancellation_reason}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedReservation(res)}
                  >
                    View Details
                  </button>

                  {isConfirmed && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleCancel(res.id, res.reservation_code)}
                      disabled={cancellingId === res.id}
                    >
                      <XCircle size={16} />
                      <span>{cancellingId === res.id ? 'Cancelling...' : 'Cancel'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reservation Details Modal */}
      {selectedReservation && (
        <div className="modal-overlay" onClick={() => setSelectedReservation(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <span className="badge badge-available" style={{ marginBottom: '0.25rem' }}>
                  {selectedReservation.status}
                </span>
                <h3 style={{ fontSize: '1.3rem' }}>Reservation Details</h3>
              </div>
              <button
                onClick={() => setSelectedReservation(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '1.25rem',
              display: 'grid',
              gap: '0.75rem',
              fontSize: '0.88rem',
              marginBottom: '1.5rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Reservation ID</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                  {selectedReservation.reservation_code}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Resource</span>
                <span style={{ fontWeight: 600 }}>{selectedReservation.resource_name}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Date</span>
                <span>{selectedReservation.slot_date}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Time Slot</span>
                <span>
                  {String(selectedReservation.start_time).slice(0, 5)} - {String(selectedReservation.end_time).slice(0, 5)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Party Size</span>
                <span>{selectedReservation.party_size} person(s)</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Confirmed At</span>
                <span>{new Date(selectedReservation.confirmed_at).toLocaleString()}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Created At</span>
                <span>{new Date(selectedReservation.created_at || selectedReservation.confirmed_at).toLocaleString()}</span>
              </div>

              {selectedReservation.cancelled_at && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', color: '#f87171' }}>
                  <span>Cancelled At</span>
                  <span>{new Date(selectedReservation.cancelled_at).toLocaleString()}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedReservation(null)}>
                Close
              </button>
              {selectedReservation.status === 'CONFIRMED' && (
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    handleCancel(selectedReservation.id, selectedReservation.reservation_code);
                    setSelectedReservation(null);
                  }}
                >
                  Cancel Reservation
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
