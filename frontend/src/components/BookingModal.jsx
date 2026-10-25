import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { X, Calendar, Clock, Users, CheckCircle, AlertCircle } from 'lucide-react';

export default function BookingModal({ slot, onClose, onBooked, onNavigate }) {
  const { user } = useAuth();
  const [partySize, setPartySize] = useState(1);
  const [specialNotes, setSpecialNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState(null);

  if (!slot) return null;

  const handleBooking = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.reservations.create({
        slot_id: slot.id,
        party_size: Number(partySize),
        special_notes: specialNotes || undefined,
      });
      setConfirmation(res);
      if (onBooked) onBooked(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      {confirmation ? (
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10B981',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.75rem',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)',
            }}>
              <CheckCircle size={32} />
            </div>
            <h3 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '0.25rem' }}>RESERVATION CONFIRMED</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Your reservation has been recorded in PostgreSQL.
            </p>
          </div>

          {/* Structured Confirmation Receipt with all requested fields */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            display: 'grid',
            gap: '0.75rem',
            fontSize: '0.9rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Reservation ID</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                {confirmation.reservation_code || confirmation.id}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>User</span>
              <span style={{ fontWeight: 600 }}>{confirmation.user_name || user?.full_name || 'Member'} ({confirmation.user_email || user?.email})</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Resource</span>
              <span style={{ fontWeight: 600 }}>{confirmation.resource_name || slot.resource_name}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Date</span>
              <span>{confirmation.slot_date || slot.slot_date}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Time</span>
              <span>{String(slot.start_time).slice(0, 5)} - {String(slot.end_time).slice(0, 5)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Status</span>
              <span className="badge badge-available">CONFIRMED</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Created At</span>
              <span style={{ fontSize: '0.85rem' }}>
                {new Date(confirmation.created_at || confirmation.confirmed_at || Date.now()).toLocaleString()}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={onClose}
            >
              Done
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={() => {
                onClose();
                if (onNavigate) onNavigate('my-reservations');
              }}
            >
              View My Reservations
            </button>
          </div>
        </div>
      ) : (
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.4rem' }}>Confirm Reservation</h3>
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

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem',
            marginBottom: '1.5rem',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={16} color="var(--accent-cyan)" />
              <span style={{ fontSize: '0.88rem' }}><strong>Date:</strong> {slot.slot_date}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} color="var(--accent-cyan)" />
              <span style={{ fontSize: '0.88rem' }}>
                <strong>Time:</strong> {String(slot.start_time).slice(0, 5)} - {String(slot.end_time).slice(0, 5)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={16} color="var(--status-available)" />
              <span style={{ fontSize: '0.88rem' }}>
                <strong>Capacity:</strong> {slot.available_capacity} / {slot.max_capacity} Available
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.88rem' }}>
                <strong>Resource:</strong> {slot.resource_name}
              </span>
            </div>
            <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              Reserving for: <strong style={{ color: '#fff' }}>{user?.full_name || 'Member'}</strong> ({user?.email})
            </div>
          </div>

          <form onSubmit={handleBooking}>
            <div className="form-group">
              <label className="form-label">Party Size (Number of people)</label>
              <input
                type="number"
                min="1"
                max={slot.available_capacity}
                required
                className="form-input"
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Special Notes / Requirements (Optional)</label>
              <textarea
                className="form-textarea"
                rows="3"
                placeholder="e.g. Need projector, accessibility requirements, quiet corner..."
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
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
                style={{ flex: 1 }}
                disabled={loading}
              >
                {loading ? 'Securing Slot...' : 'Confirm Reservation'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>,
    document.body
  );
}
