import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Calendar,
  Clock,
  Users,
  Sparkles,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  User as UserIcon,
  ShieldCheck,
  XCircle,
  ExternalLink,
  ChevronRight,
  Bell,
} from 'lucide-react';

export default function UserDashboardPage({ onNavigate }) {
  const { user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [queues, setQueues] = useState([]);
  const [recommendedSlots, setRecommendedSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const [resList, qList, slotsList] = await Promise.all([
        api.reservations.listMy(),
        api.queue.listMy(),
        api.slots.list(undefined, todayStr),
      ]);
      setReservations(resList || []);
      setQueues(qList || []);
      // Filter for available or partially available slots as recommendations
      const available = (slotsList || []).filter(
        (s) => s.status === 'AVAILABLE' || s.status === 'PARTIAL'
      );
      setRecommendedSlots(available.slice(0, 4));
    } catch (err) {
      console.error('Failed to load user dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleCancelUpcoming = async (id, code) => {
    if (
      !window.confirm(
        `Are you sure you want to cancel reservation ${code}? This will immediately notify and promote the next customer waiting in the queue.`
      )
    ) {
      return;
    }

    setCancellingId(id);
    setError('');
    setMessage('');

    try {
      await api.reservations.cancel(id, 'Cancelled from dashboard');
      setMessage(`Reservation ${code} cancelled successfully. The queue was backfilled.`);
      await loadDashboardData();
    } catch (err) {
      setError(err.message || 'Could not cancel reservation.');
    } finally {
      setCancellingId(null);
    }
  };

  const activeReservations = reservations.filter((r) => r.status === 'CONFIRMED');
  const activeQueues = queues.filter((q) => q.status === 'WAITING');
  const nextReservation = activeReservations[0] || null;
  const activeQueueTicket = activeQueues[0] || null;

  return (
    <div className="page-container">
      {/* Welcome Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '2.25rem',
          marginBottom: '2rem',
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(139, 92, 246, 0.08))',
          border: '1px solid rgba(6, 182, 212, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span className="badge badge-available">
              <ShieldCheck size={13} /> Active Account
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Role: Verified Member
            </span>
          </div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>
            Welcome back, {user?.full_name || 'Member'}!
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: 620 }}>
            Here is your current reservation status. What do you have booked, and what can you book?
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => onNavigate('browse')}>
            <Calendar size={16} />
            <span>Browse & Reserve</span>
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('notifications')}>
            <Bell size={16} />
            <span>Notifications</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="banner banner-success" style={{ marginBottom: '1.5rem' }}>
          <CheckCircle size={18} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div
          className="banner"
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            marginBottom: '1.5rem',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div
          className="metric-card"
          onClick={() => onNavigate('my-reservations')}
          style={{ cursor: 'pointer' }}
        >
          <div className="metric-header">
            <span className="metric-title">Active Bookings</span>
            <CheckCircle size={18} color="var(--status-available)" />
          </div>
          <div className="metric-value">{activeReservations.length}</div>
          <div className="metric-subtitle">Confirmed active seats</div>
        </div>

        <div
          className="metric-card"
          onClick={() => onNavigate('my-queue')}
          style={{ cursor: 'pointer' }}
        >
          <div className="metric-header">
            <span className="metric-title">Queue Position</span>
            <Users size={18} color="var(--status-partial)" />
          </div>
          <div className="metric-value">
            {activeQueueTicket ? `#${activeQueueTicket.position}` : 'None'}
          </div>
          <div className="metric-subtitle">
            {activeQueueTicket
              ? `Estimated wait: ~${Math.round(activeQueueTicket.predicted_wait_time_minutes)} mins`
              : 'No active queue tickets'}
          </div>
        </div>

        <div
          className="metric-card"
          onClick={() => onNavigate('browse')}
          style={{ cursor: 'pointer' }}
        >
          <div className="metric-header">
            <span className="metric-title">Available Slots</span>
            <Clock size={18} color="var(--accent-cyan)" />
          </div>
          <div className="metric-value">{recommendedSlots.length}</div>
          <div className="metric-subtitle">Recommended for today</div>
        </div>
      </div>

      {/* Main Grid: Upcoming Reservation + Active Queue */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* Next Upcoming Reservation Card */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
            }}
          >
            <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} color="var(--accent-cyan)" />
              <span>UPCOMING RESERVATION</span>
            </h3>
            <button
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-cyan)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
              }}
              onClick={() => onNavigate('my-reservations')}
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {nextReservation ? (
            <div
              className="glass-card"
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                padding: '1.5rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Reservation ID: </span>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      color: 'var(--accent-cyan)',
                      background: 'rgba(6, 182, 212, 0.1)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {nextReservation.reservation_code}
                  </span>
                </div>
                <span className="badge badge-available">Status: CONFIRMED</span>
              </div>

              <h4 style={{ fontSize: '1.3rem', marginBottom: '0.6rem', color: '#fff' }}>
                {nextReservation.resource_name}
              </h4>

              <div
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.9rem',
                  display: 'grid',
                  gap: '0.35rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={15} color="var(--accent-cyan)" />
                  <span>Date: <strong>{nextReservation.slot_date}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={15} color="var(--accent-cyan)" />
                  <span>Time: <strong>{String(nextReservation.start_time).slice(0, 5)} – {String(nextReservation.end_time).slice(0, 5)}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={15} color="var(--accent-cyan)" />
                  <span>Party Size: <strong>{nextReservation.party_size} person(s)</strong></span>
                </div>
              </div>

              {/* Exact Requested Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => onNavigate('my-reservations')}
                >
                  <ExternalLink size={14} />
                  <span>View Reservation</span>
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  style={{ flex: 1 }}
                  disabled={cancellingId === nextReservation.id}
                  onClick={() => handleCancelUpcoming(nextReservation.id, nextReservation.reservation_code)}
                >
                  <XCircle size={14} />
                  <span>{cancellingId === nextReservation.id ? 'Cancelling...' : 'Cancel Reservation'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
              <Clock size={36} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
              <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>No upcoming reservations scheduled</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', marginTop: '0.25rem' }}>
                Browse available resources and reserve a slot in seconds.
              </p>
              <button
                className="btn btn-primary btn-sm"
                style={{ marginTop: '1.25rem' }}
                onClick={() => onNavigate('browse')}
              >
                Browse & Reserve Now
              </button>
            </div>
          )}
        </div>

        {/* Live Queue Status Card */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
            }}
          >
            <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} color="var(--accent-purple)" />
              <span>CURRENT QUEUE POSITION</span>
            </h3>
            <button
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-purple)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
              }}
              onClick={() => onNavigate('my-queue')}
            >
              <span>Track Queue</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {activeQueueTicket ? (
            <div
              className="glass-card"
              style={{
                background: 'rgba(139, 92, 246, 0.04)',
                borderColor: 'rgba(139, 92, 246, 0.25)',
                padding: '1.5rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                }}
              >
                <span className="badge badge-partial">
                  <span className="badge-pulse" /> Position #{activeQueueTicket.position} in Line
                </span>
                <span className="badge badge-ml">
                  <Sparkles size={11} /> ~{Math.round(activeQueueTicket.predicted_wait_time_minutes)} min wait
                </span>
              </div>

              <h4 style={{ fontSize: '1.2rem', marginBottom: '0.4rem', color: '#fff' }}>
                {activeQueueTicket.resource_name}
              </h4>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                {activeQueueTicket.slot_date} • {String(activeQueueTicket.start_time).slice(0, 5)} - {String(activeQueueTicket.end_time).slice(0, 5)}
              </p>

              <div
                style={{
                  background: 'rgba(139, 92, 246, 0.1)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  color: '#e9d5ff',
                  lineHeight: 1.5,
                  marginBottom: '1rem',
                }}
              >
                ⚡ <strong>Automatic Promotion Active:</strong> You will be automatically promoted to confirmed status as soon as a cancellation occurs.
              </div>

              <button
                className="btn btn-secondary btn-sm"
                style={{ width: '100%' }}
                onClick={() => onNavigate('my-queue')}
              >
                <Users size={14} />
                <span>Open Queue Tracker</span>
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
              <Users size={36} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
              <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>You are not currently in any waiting queues</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', marginTop: '0.25rem' }}>
                If your preferred time slot is full, you can join the queue to be automatically promoted upon cancellation.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recommended Available Slots (What can I book?) */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} color="var(--accent-cyan)" />
              <span>Available Recommended Slots</span>
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Real-time openings calculated dynamically from PostgreSQL database.
            </p>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate('browse')}
          >
            <span>View All Slots</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {recommendedSlots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            No slots currently open for today. Browse upcoming dates for more availability!
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            {recommendedSlots.map((slot) => (
              <div
                key={slot.id}
                className="glass-card"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span className="badge badge-available">
                      {slot.available_capacity} {slot.available_capacity === 1 ? 'Seat' : 'Seats'} Left
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                      {String(slot.start_time).slice(0, 5)} - {String(slot.end_time).slice(0, 5)}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '1.05rem', marginBottom: '0.35rem', color: '#fff' }}>
                    {slot.resource_name}
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Date: {slot.slot_date}
                  </p>
                </div>

                <button
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%' }}
                  onClick={() => onNavigate('browse')}
                >
                  Reserve Now
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Reservation Activity */}
      {reservations.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
            }}
          >
            <h3 style={{ fontSize: '1.2rem' }}>Recent Reservation Activity</h3>
            <button
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-cyan)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
              onClick={() => onNavigate('my-reservations')}
            >
              See Full History
            </button>
          </div>

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {reservations.slice(0, 3).map((r) => (
              <div
                key={r.id}
                className="glass-card"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem 1.25rem',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      {r.reservation_code}
                    </span>
                    <span style={{ fontWeight: 600 }}>{r.resource_name}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {r.slot_date} • {String(r.start_time).slice(0, 5)} - {String(r.end_time).slice(0, 5)}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span
                    className={
                      r.status === 'CONFIRMED'
                        ? 'badge badge-available'
                        : r.status === 'CANCELLED'
                        ? 'badge badge-full'
                        : 'badge badge-partial'
                    }
                  >
                    {r.status}
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
                    onClick={() => onNavigate('my-reservations')}
                  >
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
