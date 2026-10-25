import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import BookingModal from '../components/BookingModal';
import QueueJoinModal from '../components/QueueJoinModal';
import { Calendar, Clock, Users, Sparkles, Filter, ChevronRight, CheckCircle2 } from 'lucide-react';

export default function BrowseSlotsPage({ onNavigate }) {
  const { isAuthenticated } = useAuth();
  const [resources, setResources] = useState([]);
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Modals
  const [bookingSlot, setBookingSlot] = useState(null);
  const [queueSlot, setQueueSlot] = useState(null);

  // Fetch resources on mount
  useEffect(() => {
    async function loadResources() {
      try {
        const data = await api.resources.list(categoryFilter || undefined);
        setResources(data);
        if (data.length > 0 && !selectedResourceId) {
          setSelectedResourceId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to load resources:', err);
      }
    }
    loadResources();
  }, [categoryFilter]);

  // Fetch slots whenever selectedResourceId or selectedDate changes
  useEffect(() => {
    async function loadSlots() {
      if (!selectedResourceId) return;
      setLoading(true);
      try {
        const data = await api.slots.list(selectedResourceId, selectedDate);
        setSlots(data);
      } catch (err) {
        console.error('Failed to load slots:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSlots();
  }, [selectedResourceId, selectedDate]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 5000);
  };

  const handleActionClick = (slot) => {
    if (!isAuthenticated) {
      if (onNavigate) onNavigate('login');
      return;
    }
    if (slot.status === 'FULL') {
      setQueueSlot(slot);
    } else {
      setBookingSlot(slot);
    }
  };

  const selectedResource = resources.find((r) => r.id === selectedResourceId);

  const categories = ['All', ...new Set(resources.map((r) => r.category))];

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Smart Reservation Slots</h1>
          <p className="page-subtitle">
            Dynamic capacity tracking with automated queue prediction & double-booking prevention.
          </p>
        </div>

        {/* Date Filter Quick Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <Calendar size={18} color="var(--accent-cyan)" />
          <input
            type="date"
            className="form-input"
            style={{ padding: '0.35rem 0.6rem', border: 'none', background: 'transparent', width: 'auto' }}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {toastMessage && (
        <div className="banner banner-success" style={{ animation: 'modalIn 0.3s ease' }}>
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Resource Selection Carousel / Grid */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {resources.map((res) => {
            const isSelected = res.id === selectedResourceId;
            return (
              <div
                key={res.id}
                onClick={() => setSelectedResourceId(res.id)}
                className="glass-card"
                style={{
                  minWidth: 260,
                  cursor: 'pointer',
                  borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                  background: isSelected ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-card)',
                  boxShadow: isSelected ? '0 0 16px var(--accent-cyan-glow)' : 'none',
                  padding: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', fontWeight: 600, textTransform: 'uppercase' }}>
                    {res.category}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Cap: {res.base_capacity}
                  </span>
                </div>
                <h4 style={{ fontSize: '1.05rem', marginBottom: '0.4rem', color: isSelected ? '#fff' : 'var(--text-main)' }}>
                  {res.name}
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {res.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Resource Info Header */}
      {selectedResource && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Viewing Time Slots for:
            </span>
            <h3 style={{ fontSize: '1.3rem', color: 'var(--text-main)' }}>{selectedResource.name}</h3>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span className="badge badge-available"><span className="badge-pulse" /> Available</span>
            <span className="badge badge-partial">Partial</span>
            <span className="badge badge-full">Full (Queue Open)</span>
          </div>
        </div>
      )}

      {/* Slots Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
          <div className="badge-pulse" style={{ width: 14, height: 14, margin: '0 auto 1rem', color: 'var(--accent-cyan)' }} />
          <div>Checking dynamic availability...</div>
        </div>
      ) : slots.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
          <Calendar size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <h3>No slots scheduled for this date.</h3>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
            Try selecting another date or check other resources.
          </p>
        </div>
      ) : (
        <div className="slots-grid">
          {slots.map((slot) => {
            const isFull = slot.status === 'FULL';
            const isPartial = slot.status === 'PARTIAL';
            const cardStatusClass = isFull ? 'status-full' : isPartial ? 'status-partial' : 'status-available';
            const occPercent = Math.round((slot.current_reservations / slot.max_capacity) * 100);

            return (
              <div key={slot.id} className={`glass-card slot-card ${cardStatusClass}`}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Clock size={16} color="var(--accent-cyan)" />
                      <span style={{ fontWeight: 700, fontSize: '1.05rem', fontFamily: 'var(--font-heading)' }}>
                        {String(slot.start_time).slice(0, 5)} - {String(slot.end_time).slice(0, 5)}
                      </span>
                    </div>

                    {isFull ? (
                      <span className="badge badge-full">FULL / QUEUE OPEN</span>
                    ) : isPartial ? (
                      <span className="badge badge-partial">PARTIALLY AVAILABLE</span>
                    ) : (
                      <span className="badge badge-available">AVAILABLE</span>
                    )}
                  </div>

                  {/* Capacity Bar */}
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(100, occPercent)}%`,
                        background: isFull ? 'var(--status-full)' : isPartial ? 'var(--status-partial)' : 'var(--status-available)'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                    <span>
                      {slot.current_reservations} / {slot.max_capacity} Occupied
                    </span>
                    <span>
                      {slot.available_capacity} left
                    </span>
                  </div>

                  {isFull && slot.active_queue_count > 0 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      fontSize: '0.8rem',
                      color: '#c084fc',
                      background: 'rgba(139, 92, 246, 0.1)',
                      padding: '0.4rem 0.6rem',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '1.25rem',
                    }}>
                      <Users size={14} />
                      <span>{slot.active_queue_count} in queue • Estimated wait ~{slot.active_queue_count * 15}m</span>
                    </div>
                  )}
                </div>

                <button
                  className={`btn ${isFull ? 'btn-secondary' : 'btn-primary'}`}
                  style={{
                    width: '100%',
                    borderColor: isFull ? 'rgba(239, 68, 68, 0.4)' : undefined,
                    color: isFull ? '#fca5a5' : undefined,
                  }}
                  onClick={() => handleActionClick(slot)}
                >
                  {isFull ? (
                    <>
                      <Users size={16} />
                      <span>Join Waiting Queue</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Book Slot</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Booking Modal */}
      {bookingSlot && (
        <BookingModal
          slot={bookingSlot}
          onClose={() => setBookingSlot(null)}
          onNavigate={onNavigate}
          onBooked={(res) => {
            showToast(`Reservation ${res.reservation_code} secured successfully!`);
            // Refresh slots
            api.slots.list(selectedResourceId, selectedDate).then(setSlots);
          }}
        />
      )}

      {/* Queue Join Modal */}
      {queueSlot && (
        <QueueJoinModal
          slot={queueSlot}
          onClose={() => setQueueSlot(null)}
          onJoined={(q) => {
            showToast(`Joined queue at Position #${q.position}! Predicted wait: ~${Math.round(q.predicted_wait_time_minutes)} mins.`);
            // Refresh slots
            api.slots.list(selectedResourceId, selectedDate).then(setSlots);
            if (onNavigate) onNavigate('my-queue');
          }}
        />
      )}
    </div>
  );
}
