import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Bell,
  CheckCircle,
  XCircle,
  Users,
  Sparkles,
  TrendingUp,
  Info,
  Clock,
  CheckCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

export default function NotificationsPage({ onNavigate }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  const loadNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.notifications.listMy();
      setNotifications(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.notifications.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.notifications.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'RESERVATION_CONFIRMED':
        return <CheckCircle size={20} color="var(--status-available)" />;
      case 'RESERVATION_CANCELLED':
        return <XCircle size={20} color="#ef4444" />;
      case 'QUEUE_JOINED':
        return <Users size={20} color="var(--accent-cyan)" />;
      case 'QUEUE_PROMOTED':
        return <Sparkles size={20} color="#c084fc" />;
      case 'QUEUE_POSITION_CHANGED':
        return <TrendingUp size={20} color="#60a5fa" />;
      default:
        return <Bell size={20} color="var(--accent-cyan)" />;
    }
  };

  const getEventBadge = (eventType) => {
    switch (eventType) {
      case 'RESERVATION_CONFIRMED':
        return <span className="badge badge-available">Confirmed</span>;
      case 'RESERVATION_CANCELLED':
        return <span className="badge badge-full">Cancelled</span>;
      case 'QUEUE_JOINED':
        return <span className="badge badge-partial">Queued</span>;
      case 'QUEUE_PROMOTED':
        return <span className="badge badge-ml">Auto-Promoted</span>;
      case 'QUEUE_POSITION_CHANGED':
        return <span className="badge badge-partial">Position Update</span>;
      default:
        return <span className="badge badge-available">Notice</span>;
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="page-container" style={{ maxWidth: 900 }}>
      <div
        className="page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className="badge badge-available">
              <Bell size={13} /> In-App Notification Center
            </span>
            {unreadCount > 0 && (
              <span className="badge badge-partial">{unreadCount} Unread</span>
            )}
          </div>
          <h1 className="page-title">Notifications & Alerts</h1>
          <p className="page-subtitle">
            Stay updated with real-time confirmations, queue movements, and automatic promotions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {unreadCount > 0 && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleMarkAllAsRead}
              title="Mark all notifications as read"
            >
              <CheckCheck size={15} />
              <span>Mark All Read</span>
            </button>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={loadNotifications}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'badge-pulse' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <button
          onClick={() => setFilter('all')}
          style={{
            background: filter === 'all' ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
            color: filter === 'all' ? 'var(--accent-cyan)' : 'var(--text-muted)',
            border: 'none',
            borderBottom: filter === 'all' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            padding: '0.5rem 1rem',
            fontWeight: 600,
            fontSize: '0.88rem',
            cursor: 'pointer',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
          }}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          style={{
            background: filter === 'unread' ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
            color: filter === 'unread' ? 'var(--accent-cyan)' : 'var(--text-muted)',
            border: 'none',
            borderBottom: filter === 'unread' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            padding: '0.5rem 1rem',
            fontWeight: 600,
            fontSize: '0.88rem',
            cursor: 'pointer',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
          }}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {loading && notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
          <div className="badge-pulse" style={{ width: 14, height: 14, margin: '0 auto 1rem', color: 'var(--accent-cyan)' }} />
          <div>Loading notifications...</div>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
          <Bell size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <h3>You don't have any notifications yet.</h3>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
            When reservations are booked, cancelled, or queue positions advance, notifications will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className="glass-card"
              style={{
                display: 'flex',
                gap: '1.25rem',
                alignItems: 'flex-start',
                padding: '1.25rem 1.5rem',
                borderLeft: notif.is_read
                  ? '3px solid var(--border-subtle)'
                  : '3px solid var(--accent-cyan)',
                background: notif.is_read ? 'var(--bg-card)' : 'rgba(6, 182, 212, 0.04)',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '0.1rem',
                }}
              >
                {getEventIcon(notif.event_type)}
              </div>

              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.35rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h4 style={{ fontSize: '1.05rem', margin: 0, fontWeight: notif.is_read ? 500 : 700 }}>
                      {notif.title}
                    </h4>
                    {getEventBadge(notif.event_type)}
                    {!notif.is_read && (
                      <span className="badge-pulse" style={{ width: 8, height: 8, background: 'var(--accent-cyan)' }} />
                    )}
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Clock size={12} />
                    {new Date(notif.created_at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                  {notif.message}
                </p>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    marginTop: '0.75rem',
                  }}
                >
                  {notif.link_url && onNavigate && (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}
                      onClick={() => {
                        if (!notif.is_read) handleMarkAsRead(notif.id);
                        if (notif.link_url.includes('reservation')) {
                          onNavigate('my-reservations');
                        } else if (notif.link_url.includes('queue')) {
                          onNavigate('my-queue');
                        } else {
                          onNavigate('browse');
                        }
                      }}
                    >
                      <ExternalLink size={12} />
                      <span>View Details</span>
                    </button>
                  )}

                  {!notif.is_read && (
                    <button
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-cyan)',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        padding: 0,
                        fontWeight: 600,
                      }}
                      onClick={() => handleMarkAsRead(notif.id)}
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
