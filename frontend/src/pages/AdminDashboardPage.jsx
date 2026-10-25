import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Calendar,
  Clock,
  Sparkles,
  BarChart3,
  Layers,
  PlusCircle,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Zap,
  RefreshCw,
  X,
  Search,
  Filter,
  Shield,
  ShieldCheck,
  UserCheck,
  UserX,
  XCircle,
  Check,
  Edit3,
  Eye,
  ListOrdered,
  Activity,
  ArrowUpRight,
  Database,
  Bell,
  Settings as SettingsIcon,
  Server,
  Send,
  Lock,
  Info,
  LogOut,
} from 'lucide-react';

export default function AdminDashboardPage({ initialSection = 'dashboard' }) {
  const { logout } = useAuth();
  const [section, setSection] = useState(initialSection);
  const [analytics, setAnalytics] = useState(null);
  const [activeQueues, setActiveQueues] = useState([]);
  const [resources, setResources] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Availability View state
  const [availDate, setAvailDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [availResource, setAvailResource] = useState('');
  const [availSlots, setAvailSlots] = useState([]);

  // Resources & Slots View state
  const [selectedResForSlots, setSelectedResForSlots] = useState('');
  const [resourceSlotsDate, setResourceSlotsDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [resourceSlots, setResourceSlots] = useState([]);

  // Reservations Filter state
  const [resStatusFilter, setResStatusFilter] = useState('');
  const [resSearch, setResSearch] = useState('');

  // Users Filter state
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');

  // Modals
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [selectedResDetail, setSelectedResDetail] = useState(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [loadingUserDetail, setLoadingUserDetail] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [newSlotCapacity, setNewSlotCapacity] = useState(1);

  // New Resource Form
  const [newResName, setNewResName] = useState('');
  const [newResDesc, setNewResDesc] = useState('');
  const [newResCategory, setNewResCategory] = useState('Meeting Spaces');
  const [newResCapacity, setNewResCapacity] = useState(1);

  // Database Records View state
  const [dbStatus, setDbStatus] = useState(null);
  const [dbTable, setDbTable] = useState('users');
  const [dbRecords, setDbRecords] = useState([]);
  const [loadingDbRecords, setLoadingDbRecords] = useState(false);
  const [dbSearch, setDbSearch] = useState('');

  // Admin Notifications View state
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [loadingAdminNotifs, setLoadingAdminNotifs] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState('SYSTEM_ALERT');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Time Slots View filter state
  const [slotsSearch, setSlotsSearch] = useState('');

  // Slot Generator Form
  const [genResourceId, setGenResourceId] = useState('');
  const [genStartDate, setGenStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [genEndDate, setGenEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [genStartHour, setGenStartHour] = useState(9);
  const [genEndHour, setGenEndHour] = useState(18);
  const [genDuration, setGenDuration] = useState(60);
  const [genCapacity, setGenCapacity] = useState(1);

  // Retrain State
  const [retraining, setRetraining] = useState(false);
  const [mlMetrics, setMlMetrics] = useState(null);

  // Canvas ref for chart
  const canvasRef = useRef(null);

  useEffect(() => {
    if (initialSection === 'database') {
      setSection('database-records');
    } else {
      setSection(initialSection);
    }
  }, [initialSection]);

  const loadDbData = async (tableToLoad = dbTable) => {
    setLoadingDbRecords(true);
    try {
      const [statusRes, recordsRes] = await Promise.all([
        api.admin.getDatabaseStatus(),
        api.admin.getDatabaseRecords(tableToLoad, 100),
      ]);
      setDbStatus(statusRes);
      setDbRecords(Array.isArray(recordsRes) ? recordsRes : (recordsRes.records || []));
    } catch (err) {
      setError('Failed to fetch PostgreSQL records: ' + err.message);
    } finally {
      setLoadingDbRecords(false);
    }
  };

  const loadAdminNotifs = async () => {
    setLoadingAdminNotifs(true);
    try {
      const notifs = await api.notifications.listAdmin(100);
      setAdminNotifications(Array.isArray(notifs) ? notifs : []);
    } catch (err) {
      console.error('Error fetching admin notifications:', err);
    } finally {
      setLoadingAdminNotifs(false);
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) return;
    setSendingBroadcast(true);
    try {
      await api.notifications.broadcast({
        title: broadcastTitle,
        message: broadcastMessage,
        type: broadcastType,
      });
      setSuccessMsg('Broadcast notification sent to all active users!');
      setBroadcastTitle('');
      setBroadcastMessage('');
      await loadAdminNotifs();
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingBroadcast(false);
    }
  };

  useEffect(() => {
    if (section === 'database-records' || section === 'database') {
      loadDbData(dbTable);
    } else if (section === 'notifications') {
      loadAdminNotifs();
    }
  }, [section, dbTable]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [dash, queues, resList, allRes, users] = await Promise.all([
        api.admin.getDashboard(),
        api.admin.listQueues(),
        api.resources.list(),
        api.admin.listReservations(resStatusFilter || undefined),
        api.admin.listUsers(userSearch || undefined, userRoleFilter || undefined),
      ]);
      setAnalytics(dash);
      setActiveQueues(queues);
      setResources(resList);
      setReservations(allRes);
      setUsersList(users);

      if (resList.length > 0) {
        if (!genResourceId) setGenResourceId(resList[0].id);
        if (!availResource) setAvailResource(resList[0].id);
        if (!selectedResForSlots) setSelectedResForSlots(resList[0].id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [resStatusFilter, userRoleFilter]);

  // Load availability slots when date or resource changes
  useEffect(() => {
    async function loadAvail() {
      if (!availResource) return;
      try {
        const slots = await api.slots.list(availResource, availDate);
        setAvailSlots(slots);
      } catch (err) {
        console.error('Could not load availability slots:', err);
      }
    }
    loadAvail();
  }, [availResource, availDate]);

  // Load slots for Resources & Slots manager
  useEffect(() => {
    async function loadResSlots() {
      if (!selectedResForSlots) return;
      try {
        const slots = await api.slots.list(selectedResForSlots, resourceSlotsDate);
        setResourceSlots(slots);
      } catch (err) {
        console.error('Could not load resource slots:', err);
      }
    }
    loadResSlots();
  }, [selectedResForSlots, resourceSlotsDate]);

  // Draw pure HTML5 Canvas bar chart for hourly demand
  useEffect(() => {
    if ((section !== 'dashboard' && section !== 'analytics') || !analytics || !analytics.hourly_demand || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const data = analytics.hourly_demand;
    if (data.length === 0) return;

    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const barWidth = Math.max(12, chartWidth / data.length - 8);

    const maxVal = Math.max(10, ...data.map((d) => Math.max(d.reservations, d.queue_joins)));

    // Draw horizontal grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();

      // Label
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(Math.round(maxVal - (maxVal / 4) * i), 10, y + 3);
    }

    // Draw bars
    data.forEach((d, idx) => {
      const x = padding + idx * (chartWidth / data.length) + 4;
      const resBarHeight = (d.reservations / maxVal) * chartHeight;
      const qBarHeight = (d.queue_joins / maxVal) * chartHeight;

      // Reservation bar (Cyan)
      ctx.fillStyle = '#06B6D4';
      ctx.beginPath();
      ctx.roundRect(x, height - padding - resBarHeight, barWidth / 2 - 1, resBarHeight, [3, 3, 0, 0]);
      ctx.fill();

      // Queue bar (Purple)
      ctx.fillStyle = '#8B5CF6';
      ctx.beginPath();
      ctx.roundRect(x + barWidth / 2, height - padding - qBarHeight, barWidth / 2 - 1, qBarHeight, [3, 3, 0, 0]);
      ctx.fill();

      // X-Axis Labels (every 2 hours)
      if (idx % 2 === 0) {
        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(d.label, x + barWidth / 2, height - padding + 16);
      }
    });
  }, [analytics, section]);

  const handleCreateResource = async (e) => {
    e.preventDefault();
    try {
      await api.resources.create({
        name: newResName,
        description: newResDesc,
        category: newResCategory,
        base_capacity: Number(newResCapacity),
      });
      setSuccessMsg(`Resource "${newResName}" created successfully!`);
      setShowResourceModal(false);
      setNewResName('');
      setNewResDesc('');
      await loadAllData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGenerateSlots = async (e) => {
    e.preventDefault();
    try {
      const generated = await api.slots.generate({
        resource_id: genResourceId,
        start_date: genStartDate,
        end_date: genEndDate,
        start_hour: Number(genStartHour),
        end_hour: Number(genEndHour),
        slot_duration_minutes: Number(genDuration),
        max_capacity: Number(genCapacity),
      });
      setSuccessMsg(`Successfully generated ${generated.length} slots for selected date range!`);
      setShowSlotModal(false);
      await loadAllData();
      if (availResource === genResourceId) {
        const slots = await api.slots.list(availResource, availDate);
        setAvailSlots(slots);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleForcePromote = async (queueId, userName) => {
    if (!window.confirm(`Force promote ${userName} directly into a confirmed reservation?`)) return;
    try {
      await api.admin.forcePromote(queueId);
      setSuccessMsg(`Promoted ${userName} successfully!`);
      await loadAllData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRetrainML = async () => {
    setRetraining(true);
    setError('');
    try {
      const res = await api.admin.retrainML(3500);
      setMlMetrics(res);
      setSuccessMsg(`Model successfully retrained on ${res.samples_trained} samples! R²: ${res.r2_score}, MAE: ${res.mae_minutes}m`);
    } catch (err) {
      setError(err.message);
    } finally {
      setRetraining(false);
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      await api.admin.updateUserStatus(userId, { is_active: !currentStatus });
      setSuccessMsg('User status updated.');
      await loadAllData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleUserRole = async (userId, currentRole) => {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!window.confirm(`Are you sure you want to change user role to ${newRole}?`)) return;
    try {
      await api.admin.updateUserStatus(userId, { role: newRole });
      setSuccessMsg(`User role updated to ${newRole}.`);
      await loadAllData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOpenUserDetails = async (userId) => {
    setLoadingUserDetail(true);
    try {
      const details = await api.admin.getUserDetails(userId);
      setSelectedUserDetail(details);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingUserDetail(false);
    }
  };

  const handleUpdateSlotCapacity = async (e) => {
    e.preventDefault();
    if (!editingSlot) return;
    try {
      await api.slots.updateCapacity(editingSlot.id, Number(newSlotCapacity));
      setSuccessMsg(`Slot capacity updated to ${newSlotCapacity}.`);
      setEditingSlot(null);
      // Refresh current slots
      if (availResource) {
        const slots = await api.slots.list(availResource, availDate);
        setAvailSlots(slots);
      }
      if (selectedResForSlots) {
        const slots = await api.slots.list(selectedResForSlots, resourceSlotsDate);
        setResourceSlots(slots);
      }
      await loadAllData();
    } catch (err) {
      setError(err.message);
    }
  };

  const getSlotAvailabilityStatus = (slot) => {
    if (slot.status === 'FULL') {
      return slot.active_queue_count > 0 ? 'FULL / QUEUE OPEN' : 'FULL';
    }
    if (slot.status === 'PARTIAL') return 'PARTIALLY AVAILABLE';
    return 'AVAILABLE';
  };

  const getStatusBadgeClass = (status) => {
    if (status === 'AVAILABLE') return 'badge badge-available';
    if (status === 'PARTIALLY AVAILABLE' || status === 'PARTIAL') return 'badge badge-partial';
    return 'badge badge-full';
  };

  const filteredReservations = reservations.filter((r) => {
    if (!resSearch) return true;
    const q = resSearch.toLowerCase();
    return (
      r.reservation_code.toLowerCase().includes(q) ||
      (r.user_name && r.user_name.toLowerCase().includes(q)) ||
      (r.user_email && r.user_email.toLowerCase().includes(q)) ||
      (r.resource_name && r.resource_name.toLowerCase().includes(q))
    );
  });

  const filteredUsers = usersList.filter((u) => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return (
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-container">
      {/* Admin Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className="badge badge-ml">Admin Operations</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Role-Based Access Control Enforced</span>
          </div>
          <h1 className="page-title">Executive Management & System Control</h1>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowResourceModal(true)}>
            <PlusCircle size={16} />
            <span>New Resource</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowSlotModal(true)}>
            <Calendar size={16} />
            <span>Generate Slots</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleRetrainML} disabled={retraining}>
            <Zap size={16} color="var(--accent-purple)" />
            <span>{retraining ? 'Training...' : 'Retrain ML'}</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={loadAllData} title="Refresh Live Data">
            <RefreshCw size={15} />
            <span>Sync</span>
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={logout}
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              borderColor: 'rgba(239, 68, 68, 0.35)',
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
            title="Sign out of Admin Portal"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Internal Navigation Tabs for Admin */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '0.5rem',
        marginBottom: '2rem',
        overflowX: 'auto',
      }}>
        {[
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'reservations', label: 'Reservations' },
          { id: 'users', label: 'Users' },
          { id: 'resources', label: 'Resources' },
          { id: 'slots', label: 'Time Slots' },
          { id: 'queue', label: 'Queue Management' },
          { id: 'availability', label: 'Availability' },
          { id: 'notifications', label: 'Notifications' },
          { id: 'analytics', label: 'Analytics' },
          { id: 'database-records', label: 'Database Records' },
          { id: 'settings', label: 'Settings' },
          { id: 'logout', label: 'Sign Out' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === 'logout') {
                logout();
              } else {
                setSection(tab.id);
              }
            }}
            style={{
              background: tab.id === 'logout' ? 'rgba(239, 68, 68, 0.08)' : (section === tab.id || (tab.id === 'database-records' && section === 'database')) ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
              color: tab.id === 'logout' ? '#f87171' : (section === tab.id || (tab.id === 'database-records' && section === 'database')) ? 'var(--accent-cyan)' : 'var(--text-muted)',
              border: 'none',
              borderBottom: tab.id === 'logout' ? '2px solid transparent' : (section === tab.id || (tab.id === 'database-records' && section === 'database')) ? '2px solid var(--accent-cyan)' : '2px solid transparent',
              padding: '0.6rem 1rem',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              marginLeft: tab.id === 'logout' ? 'auto' : undefined,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            {tab.id === 'logout' && <LogOut size={14} />}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {successMsg && (
        <div className="banner banner-success" style={{ marginBottom: '1.5rem' }}>
          <CheckCircle size={18} />
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="banner" style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#fca5a5', marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 1: DASHBOARD                                      */}
      {/* ========================================================= */}
      {section === 'dashboard' && (
        <div>
          {analytics && (
            <>
                            {/* 11 Database-backed Real Metrics from PostgreSQL */}
              <div style={{ marginBottom: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Live PostgreSQL Database Operational Status
              </div>
              <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '2rem' }}>
                {/* 1. Total Users */}
                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-title">Total Users</span>
                    <Users size={18} color="var(--accent-cyan)" />
                  </div>
                  <div className="metric-value">{analytics.metrics.total_users ?? usersList.length}</div>
                  <div className="metric-subtitle">Registered user accounts</div>
                </div>

                {/* 2. Total Reservations */}
                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-title">Total Reservations</span>
                    <Calendar size={18} color="var(--accent-cyan)" />
                  </div>
                  <div className="metric-value">{analytics.metrics.total_reservations ?? reservations.length}</div>
                  <div className="metric-subtitle">All-time reservation records</div>
                </div>

                {/* 3. Total Reservations Today */}
                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-title">Today's Bookings</span>
                    <Clock size={18} color="var(--accent-cyan)" />
                  </div>
                  <div className="metric-value">{analytics.metrics.total_reservations_today}</div>
                  <div className="metric-subtitle">Created today</div>
                </div>

                {/* 4. Confirmed Reservations */}
                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-title">Confirmed</span>
                    <CheckCircle size={18} color="var(--status-available)" />
                  </div>
                  <div className="metric-value">{analytics.metrics.confirmed_reservations}</div>
                  <div className="metric-subtitle">Active seats held in system</div>
                </div>

                {/* 5. Cancelled Reservations */}
                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-title">Cancelled</span>
                    <XCircle size={18} color="#ef4444" />
                  </div>
                  <div className="metric-value">{analytics.metrics.cancelled_reservations}</div>
                  <div className="metric-subtitle">Released back to queue/pool</div>
                </div>

                {/* 6. Completed Reservations */}
                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-title">Completed</span>
                    <CheckCircle size={18} color="var(--accent-purple)" />
                  </div>
                  <div className="metric-value">{analytics.metrics.completed_reservations ?? 0}</div>
                  <div className="metric-subtitle">Past reservation periods</div>
                </div>

                {/* 7. Current Queue Size */}
                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-title">Queue Size</span>
                    <ListOrdered size={18} color="var(--accent-purple)" />
                  </div>
                  <div className="metric-value">{analytics.metrics.current_queue_size}</div>
                  <div className="metric-subtitle">Active waiting queue entries</div>
                </div>

                {/* 8. Available Slots */}
                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-title">Available Slots</span>
                    <Clock size={18} color="var(--status-available)" />
                  </div>
                  <div className="metric-value">{analytics.metrics.available_slots}</div>
                  <div className="metric-subtitle">100% capacity open</div>
                </div>

                {/* 9. Partially Available Slots */}
                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-title">Partial Slots</span>
                    <Activity size={18} color="var(--status-partial)" />
                  </div>
                  <div className="metric-value">{analytics.metrics.partial_slots}</div>
                  <div className="metric-subtitle">Occupied with open capacity</div>
                </div>

                {/* 10. Full Slots */}
                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-title">Full Slots</span>
                    <AlertCircle size={18} color="var(--status-full)" />
                  </div>
                  <div className="metric-value">{analytics.metrics.full_slots}</div>
                  <div className="metric-subtitle">At maximum capacity limit</div>
                </div>

                {/* 11. Active Resources */}
                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-title">Active Resources</span>
                    <Layers size={18} color="var(--accent-cyan)" />
                  </div>
                  <div className="metric-value">{analytics.metrics.active_resources ?? resources.length}</div>
                  <div className="metric-subtitle">Configured bookable assets</div>
                </div>
              </div>
            </>
          )}

          {/* Quick Charts & Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="glass-panel" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem' }}>Hourly Demand & Queue Pressure</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Reservations (Cyan) vs Queue Joins (Purple)</p>
                </div>
              </div>
              <canvas ref={canvasRef} width={500} height={220} style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>

            <div className="glass-panel" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', marginBottom: '0.25rem' }}>Resource Occupancy Breakdown</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Live capacity consumption per asset
                  </p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setSection('resources')}>
                  Manage <ArrowUpRight size={14} />
                </button>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Resource</th>
                    <th>Category</th>
                    <th>Occupancy</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics?.resource_utilization?.map((r) => (
                    <tr key={r.resource_id}>
                      <td><strong>{r.resource_name}</strong></td>
                      <td><span className="badge badge-partial" style={{ fontSize: '0.72rem' }}>{r.category}</span></td>
                      <td style={{ minWidth: 160 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div className="progress-bar" style={{ margin: 0, flex: 1 }}>
                            <div className="progress-fill" style={{ width: `${Math.min(100, r.occupancy_rate)}%` }} />
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{r.occupancy_rate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION: TIME SLOTS MANAGEMENT                            */}
      {/* ========================================================= */}
      {section === 'slots' && (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem' }}>Operating Time Slots & Schedules</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Configure resource operating hours, review capacity limits, and eliminate scheduling conflicts.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm" onClick={() => setShowSlotModal(true)}>
                <Calendar size={15} />
                <span>Batch Generate Slots</span>
              </button>
              <button className="btn btn-secondary btn-sm" onClick={async () => {
                if (selectedResForSlots) {
                  const slots = await api.slots.list(selectedResForSlots, resourceSlotsDate);
                  setResourceSlots(slots);
                }
              }}>
                <RefreshCw size={15} />
                <span>Refresh Slots</span>
              </button>
            </div>
          </div>

          <div style={{
            background: 'rgba(6, 182, 212, 0.06)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
          }}>
            <ShieldCheck size={20} color="var(--accent-cyan)" />
            <div>
              <strong style={{ color: 'var(--text-main)' }}>Operating Conflict Prevention:</strong> Time intervals are strictly validated in PostgreSQL. Overlapping slots for the same resource are disallowed, ensuring unambiguous reservation boundaries.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1', minWidth: 220 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Select Resource
              </label>
              <select
                className="form-select"
                value={selectedResForSlots}
                onChange={async (e) => {
                  const rId = e.target.value;
                  setSelectedResForSlots(rId);
                  const slots = await api.slots.list(rId, resourceSlotsDate);
                  setResourceSlots(slots);
                }}
              >
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} ({r.category})</option>
                ))}
              </select>
            </div>

            <div style={{ width: 180 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Schedule Date
              </label>
              <input
                type="date"
                className="form-input"
                value={resourceSlotsDate}
                onChange={async (e) => {
                  const d = e.target.value;
                  setResourceSlotsDate(d);
                  if (selectedResForSlots) {
                    const slots = await api.slots.list(selectedResForSlots, d);
                    setResourceSlots(slots);
                  }
                }}
              />
            </div>
          </div>

          {resourceSlots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              No slots configured for this resource on {resourceSlotsDate}. Click <strong>"Batch Generate Slots"</strong> to create operational intervals.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Slot ID</th>
                    <th>Time Interval</th>
                    <th>Max Capacity</th>
                    <th>Occupancy</th>
                    <th>Remaining</th>
                    <th>Queue</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {resourceSlots.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {s.id.slice(0, 8)}...
                      </td>
                      <td>
                        <strong>{String(s.start_time).slice(0, 5)} - {String(s.end_time).slice(0, 5)}</strong>
                      </td>
                      <td>{s.max_capacity} seats</td>
                      <td>
                        <span style={{ fontWeight: 600, color: s.current_reservations > 0 ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                          {s.current_reservations} booked
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: s.remaining_capacity > 0 ? '#34d399' : '#f87171' }}>
                          {s.remaining_capacity} free
                        </span>
                      </td>
                      <td>
                        {s.active_queue_count > 0 ? (
                          <span className="badge badge-partial">{s.active_queue_count} queued</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>0</span>
                        )}
                      </td>
                      <td>
                        <span className={getStatusBadgeClass(s.status)}>
                          {getSlotAvailabilityStatus(s)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setEditingSlot(s);
                            setNewSlotCapacity(s.max_capacity);
                          }}
                        >
                          <Edit3 size={13} />
                          <span>Edit Capacity</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION: DATABASE RECORDS (PART 22 SAFE READ-ONLY VIEWER)  */}
      {/* ========================================================= */}
      {(section === 'database-records' || section === 'database') && (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          {/* Header & PostgreSQL Live Status Indicator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span className="badge badge-ml">Administrative Data Viewer</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Read-Only PostgreSQL Mirror</span>
              </div>
              <h3 style={{ fontSize: '1.25rem' }}>Database Records (PostgreSQL)</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Direct administrative view of verified relational records. Credentials and passwords remain strictly protected on the backend.
              </p>
            </div>

            {/* PostgreSQL Connected Status Indicator Badge */}
            <div style={{
              background: 'rgba(52, 211, 153, 0.08)',
              border: '1px solid rgba(52, 211, 153, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.6rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.15rem',
              minWidth: 200,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399', fontWeight: 600, fontSize: '0.88rem' }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
                <span>DATABASE Connected</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Database type: <strong style={{ color: 'var(--text-main)' }}>PostgreSQL</strong>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Environment: <strong style={{ color: 'var(--text-main)' }}>{dbStatus?.environment || 'Production'}</strong>
              </div>
            </div>
          </div>

          {/* Table Selector Sub-Tabs */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '0.5rem',
            marginBottom: '1.5rem',
            overflowX: 'auto',
          }}>
            {[
              { id: 'users', label: 'Users', count: dbStatus?.table_counts?.users },
              { id: 'reservations', label: 'Reservations', count: dbStatus?.table_counts?.reservations },
              { id: 'queue_entries', label: 'Queue Entries', count: dbStatus?.table_counts?.queue_entries },
              { id: 'resources', label: 'Resources', count: dbStatus?.table_counts?.resources },
              { id: 'time_slots', label: 'Time Slots', count: dbStatus?.table_counts?.time_slots },
            ].map((tbl) => (
              <button
                key={tbl.id}
                onClick={() => {
                  setDbTable(tbl.id);
                  loadDbData(tbl.id);
                }}
                style={{
                  background: dbTable === tbl.id ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  color: dbTable === tbl.id ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  border: dbTable === tbl.id ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{tbl.label}</span>
                {tbl.count !== undefined && (
                  <span style={{ fontSize: '0.72rem', background: 'rgba(255, 255, 255, 0.1)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>
                    {tbl.count}
                  </span>
                )}
              </button>
            ))}

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Filter table rows..."
                className="form-input"
                style={{ width: 200, padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
                value={dbSearch}
                onChange={(e) => setDbSearch(e.target.value)}
              />
              <button className="btn btn-secondary btn-sm" onClick={() => loadDbData(dbTable)} title="Refresh PostgreSQL Table">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Table Data Viewer */}
          {loadingDbRecords ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              Querying PostgreSQL database table...
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              {/* TABLE: USERS */}
              {dbTable === 'users' && (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>User ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Created At</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbRecords
                      .filter((u) => !dbSearch || JSON.stringify(u).toLowerCase().includes(dbSearch.toLowerCase()))
                      .map((u) => (
                        <tr key={u.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>{u.id.slice(0, 10)}...</td>
                          <td><strong>{u.full_name}</strong></td>
                          <td>{u.email}</td>
                          <td><span className={u.role === 'ADMIN' ? 'badge badge-ml' : 'badge badge-available'}>{u.role}</span></td>
                          <td style={{ fontSize: '0.82rem' }}>{u.created_at ? new Date(u.created_at).toLocaleString() : 'N/A'}</td>
                          <td><span style={{ color: u.status === 'Active' ? '#34d399' : '#f87171', fontSize: '0.82rem' }}>● {u.status}</span></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}

              {/* TABLE: RESERVATIONS */}
              {dbTable === 'reservations' && (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Reservation Code</th>
                      <th>User</th>
                      <th>Resource</th>
                      <th>Date</th>
                      <th>Time Slot</th>
                      <th>Status</th>
                      <th>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbRecords
                      .filter((r) => !dbSearch || JSON.stringify(r).toLowerCase().includes(dbSearch.toLowerCase()))
                      .map((r) => (
                        <tr key={r.id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-cyan)' }}>{r.reservation_code}</td>
                          <td>{r.user_name}</td>
                          <td><strong>{r.resource_name}</strong></td>
                          <td>{r.date}</td>
                          <td>{r.time}</td>
                          <td><span className={r.status === 'CONFIRMED' ? 'badge badge-available' : 'badge badge-full'}>{r.status}</span></td>
                          <td style={{ fontSize: '0.82rem' }}>{r.created_at ? new Date(r.created_at).toLocaleString() : 'N/A'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}

              {/* TABLE: QUEUE ENTRIES */}
              {dbTable === 'queue_entries' && (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Queue ID</th>
                      <th>User</th>
                      <th>Resource</th>
                      <th>Slot</th>
                      <th>Position</th>
                      <th>Est. Wait</th>
                      <th>Status</th>
                      <th>Joined At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbRecords
                      .filter((q) => !dbSearch || JSON.stringify(q).toLowerCase().includes(dbSearch.toLowerCase()))
                      .map((q) => (
                        <tr key={q.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{q.id.slice(0, 8)}...</td>
                          <td><strong>{q.user_name}</strong></td>
                          <td>{q.resource_name}</td>
                          <td>{q.slot}</td>
                          <td><span style={{ fontWeight: 700, color: 'var(--accent-purple)' }}>#{q.position}</span></td>
                          <td><span style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem' }}>{q.estimated_wait}</span></td>
                          <td><span className="badge badge-partial">{q.status}</span></td>
                          <td style={{ fontSize: '0.82rem' }}>{q.joined_at ? new Date(q.joined_at).toLocaleString() : 'N/A'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}

              {/* TABLE: RESOURCES */}
              {dbTable === 'resources' && (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Resource ID</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Base Capacity</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbRecords
                      .filter((res) => !dbSearch || JSON.stringify(res).toLowerCase().includes(dbSearch.toLowerCase()))
                      .map((res) => (
                        <tr key={res.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{res.id.slice(0, 8)}...</td>
                          <td><strong>{res.name}</strong></td>
                          <td><span className="badge badge-partial">{res.category}</span></td>
                          <td>{res.capacity} units</td>
                          <td><span style={{ color: res.status === 'Active' ? '#34d399' : '#f87171', fontSize: '0.82rem' }}>● {res.status}</span></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}

              {/* TABLE: TIME SLOTS */}
              {dbTable === 'time_slots' && (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Slot ID</th>
                      <th>Resource</th>
                      <th>Date</th>
                      <th>Time Interval</th>
                      <th>Capacity</th>
                      <th>Current Occupancy</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbRecords
                      .filter((s) => !dbSearch || JSON.stringify(s).toLowerCase().includes(dbSearch.toLowerCase()))
                      .map((s) => (
                        <tr key={s.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.id.slice(0, 8)}...</td>
                          <td><strong>{s.resource_name}</strong></td>
                          <td>{s.date}</td>
                          <td>{s.start_time} - {s.end_time}</td>
                          <td>{s.capacity} seats</td>
                          <td>{s.current_reservations} reserved</td>
                          <td><span className={getStatusBadgeClass(s.status)}>{s.status}</span></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION: NOTIFICATIONS & BROADCAST                        */}
      {/* ========================================================= */}
      {section === 'notifications' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
          {/* 1. Broadcast Notification Form */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Bell size={20} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.25rem' }}>Broadcast System Notice</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Dispatch real-time push announcements to all registered users simultaneously. Broadcasts appear immediately in the user notification center.
            </p>

            <form onSubmit={handleSendBroadcast}>
              <div className="form-group">
                <label className="form-label">Notification Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scheduled Maintenance or New Facilities Added"
                  className="form-input"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Alert Severity / Type</label>
                <select
                  className="form-select"
                  value={broadcastType}
                  onChange={(e) => setBroadcastType(e.target.value)}
                >
                  <option value="SYSTEM_ALERT">System Alert (Cyan)</option>
                  <option value="MAINTENANCE">Maintenance Notice (Amber)</option>
                  <option value="RESERVATION_UPDATE">Operational Update (Purple)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Message Details</label>
                <textarea
                  required
                  rows="4"
                  className="form-textarea"
                  placeholder="Enter full broadcast message for all system users..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={sendingBroadcast}>
                <Send size={15} />
                <span>{sendingBroadcast ? 'Broadcasting...' : 'Send Broadcast to All Users'}</span>
              </button>
            </form>
          </div>

          {/* 2. System Notification Audit Trail */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem' }}>Notification Event Log</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Audit log of automatic lifecycle alerts (bookings, promotions, cancellations).
                </p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={loadAdminNotifs}>
                <RefreshCw size={14} />
              </button>
            </div>

            {loadingAdminNotifs ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                Loading event log...
              </div>
            ) : adminNotifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                No notifications logged yet.
              </div>
            ) : (
              <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {adminNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      style={{
                        padding: '0.85rem',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span className="badge badge-partial" style={{ fontSize: '0.72rem' }}>{notif.type}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {notif.created_at ? new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.2rem' }}>{notif.title}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{notif.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION: SYSTEM SETTINGS                                  */}
      {/* ========================================================= */}
      {section === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '1.5rem' }}>
          {/* Card 1: PostgreSQL & Infrastructure */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Server size={20} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.25rem' }}>Database & Infrastructure</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Engine</span>
                <strong>PostgreSQL 18 (Local Instance)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Connection Driver</span>
                <code>asyncpg + SQLAlchemy ORM</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Database Name</span>
                <strong>smart_reservation</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Concurrency Protection</span>
                <span style={{ color: '#34d399', fontWeight: 600 }}>SELECT FOR UPDATE (Row-Lock)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0' }}>
                <span style={{ color: 'var(--text-muted)' }}>Credential Exposure</span>
                <span style={{ color: '#34d399', fontWeight: 600 }}>Protected (Server-Side Only)</span>
              </div>
            </div>
          </div>

          {/* Card 2: Security & Authentication */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <ShieldCheck size={20} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.25rem' }}>Security & Authentication</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Access Control</span>
                <strong>Role-Based Access Control (RBAC)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Supported Roles</span>
                <code>USER, ADMIN</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Google OAuth 2.0</span>
                <span>Configured via environment variables</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Password Encryption</span>
                <code>Passlib BCrypt Salted Hash</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0' }}>
                <span style={{ color: 'var(--text-muted)' }}>Token Specification</span>
                <strong>JWT HMAC-SHA256 Bearer</strong>
              </div>
            </div>
          </div>

          {/* Card 3: Machine Learning & Queue Engine */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Sparkles size={20} color="var(--accent-purple)" />
              <h3 style={{ fontSize: '1.25rem' }}>Queue Prediction Engine</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>ML Algorithm</span>
                <strong>HistGradientBoostingRegressor</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Promotion Policy</span>
                <span style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>Strict FIFO (First-In, First-Out)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Waiting Time Factors</span>
                <span>Queue position, slot capacity, cancellation rates</span>
              </div>
              <div style={{ paddingTop: '0.75rem' }}>
                <button className="btn btn-primary btn-sm" onClick={handleRetrainML} disabled={retraining} style={{ width: '100%' }}>
                  <Zap size={14} />
                  <span>{retraining ? 'Retraining ML Model...' : 'Retrain Wait-Time Predictor'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 4: System Information */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Info size={20} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.25rem' }}>System Metadata</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Application</span>
                <strong>Smart Reservation System</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Architecture</span>
                <span>FastAPI + PostgreSQL + React (Vite)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>API Version</span>
                <code>/api/v1</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0' }}>
                <span style={{ color: 'var(--text-muted)' }}>Environment Status</span>
                <span className="badge badge-available">Production Ready</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 2: RESERVATIONS                                  */}
      {/* ========================================================= */}
      {section === 'reservations' && (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem' }}>Reservation Management</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Inspect who booked what, when, and active lifecycle status from PostgreSQL.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search code, user, resource..."
                  className="form-input"
                  style={{ paddingLeft: '2rem', width: 240 }}
                  value={resSearch}
                  onChange={(e) => setResSearch(e.target.value)}
                />
                <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              </div>

              <select
                className="form-select"
                style={{ width: 'auto' }}
                value={resStatusFilter}
                onChange={(e) => setResStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Reservation ID</th>
                <th>User Name</th>
                <th>User Email</th>
                <th>Resource Name</th>
                <th>Date</th>
                <th>Time Slot</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Cancelled At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReservations.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No reservations matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredReservations.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                        {r.reservation_code}
                      </span>
                    </td>
                    <td>
                      <strong>{r.user_name || 'Member'}</strong>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{r.user_email}</span>
                    </td>
                    <td>{r.resource_name}</td>
                    <td>{r.slot_date}</td>
                    <td>
                      {String(r.start_time).slice(0, 5)} - {String(r.end_time).slice(0, 5)}
                    </td>
                    <td>
                      <span className={r.status === 'CONFIRMED' ? 'badge badge-available' : r.status === 'CANCELLED' ? 'badge badge-full' : 'badge badge-partial'}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem' }}>
                        {r.created_at ? new Date(r.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : new Date(r.confirmed_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: r.cancelled_at ? '#ef4444' : 'var(--text-muted)' }}>
                        {r.cancelled_at ? new Date(r.cancelled_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                        onClick={() => setSelectedResDetail(r)}
                        title="View Full Booking Details"
                      >
                        <Eye size={13} />
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 3: USERS                                          */}
      {/* ========================================================= */}
      {section === 'users' && (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem' }}>User Directory & Permissions</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Inspect registered user accounts, historical reservations count, and active queue positions.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search user or email..."
                  className="form-input"
                  style={{ paddingLeft: '2rem', width: 220 }}
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
                <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              </div>

              <select
                className="form-select"
                style={{ width: 'auto' }}
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Account Created</th>
                <th>Reservations</th>
                <th>Current Queue</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No users matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }} title={u.id}>
                        {u.id.substring(0, 8)}...
                      </span>
                    </td>
                    <td>
                      <strong>{u.full_name}</strong>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem' }}>{u.email}</span>
                    </td>
                    <td>
                      <span className={u.role === 'ADMIN' ? 'badge badge-ml' : 'badge badge-available'}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem' }}>
                        {new Date(u.created_at).toLocaleDateString([], { dateStyle: 'medium' })}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-partial" style={{ fontSize: '0.8rem' }}>
                        {u.reservation_count ?? 0}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-warning" style={{ fontSize: '0.8rem' }}>
                        {u.active_queue_count ?? 0}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: u.is_active ? '#34d399' : '#f87171' }}>
                        ● {u.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.3rem 0.55rem', fontSize: '0.78rem' }}
                          onClick={() => handleOpenUserDetails(u.id)}
                          title="View User Details & Activity"
                        >
                          <Eye size={13} />
                          <span>Details</span>
                        </button>

                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.3rem 0.55rem', fontSize: '0.78rem' }}
                          onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                          title={u.is_active ? 'Deactivate Account' : 'Activate Account'}
                        >
                          {u.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                        </button>

                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.3rem 0.55rem', fontSize: '0.78rem' }}
                          onClick={() => handleToggleUserRole(u.id, u.role)}
                          title="Change Role"
                        >
                          <Shield size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 4: QUEUE MANAGEMENT                               */}
      {/* ========================================================= */}
      {section === 'queue' && (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem' }}>Live Queue Management Monitor</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Real-time queue positions. When reservations are cancelled, first waiting user is automatically promoted.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className="badge badge-partial">
                {activeQueues.length} Waiting Users
              </span>
              <button className="btn btn-secondary btn-sm" onClick={loadAllData} title="Refresh Queue">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {activeQueues.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 0', color: 'var(--text-muted)' }}>
              <Users size={44} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
              <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>Queue is Currently Clear</div>
              <div style={{ fontSize: '0.85rem' }}>No users waiting in queue. All resource demands are fulfilled.</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Queue ID</th>
                  <th>Position</th>
                  <th>User Name</th>
                  <th>User Email</th>
                  <th>Resource</th>
                  <th>Date</th>
                  <th>Time Slot</th>
                  <th>Estimated Wait</th>
                  <th>Queue Status</th>
                  <th>Joined At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeQueues.map((q) => (
                  <tr key={q.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }} title={q.id}>
                        {q.id.substring(0, 8)}...
                      </span>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: 'rgba(6, 182, 212, 0.15)',
                        color: 'var(--accent-cyan)',
                        fontWeight: 700,
                        fontFamily: 'var(--font-heading)',
                      }}>
                        #{q.position}
                      </span>
                    </td>
                    <td><strong>{q.user_name}</strong></td>
                    <td><span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{q.user_email}</span></td>
                    <td>{q.resource_name}</td>
                    <td>{q.slot_date}</td>
                    <td>
                      {String(q.start_time).slice(0, 5)} - {String(q.end_time).slice(0, 5)}
                    </td>
                    <td>
                      <span className="badge badge-ml">
                        <Sparkles size={11} /> ~{Math.round(q.predicted_wait_time_minutes || 0)} min
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-partial">
                        {q.status || 'WAITING'}
                      </span>
                    </td>
                    <td>{new Date(q.joined_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleForcePromote(q.id, q.user_name)}
                        title="Directly promote this user to a confirmed booking"
                      >
                        <span>Force Promote</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 5: RESOURCES & SLOTS                              */}
      {/* ========================================================= */}
      {section === 'resources' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem' }}>Resources & Schedule Management</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Configure resource definitions, operating hours, base capacity, and individual slot capacities.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm" onClick={() => setShowResourceModal(true)}>
                <PlusCircle size={15} />
                <span>Add Resource</span>
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowSlotModal(true)}>
                <Calendar size={15} />
                <span>Batch Generate Slots</span>
              </button>
            </div>
          </div>

          {/* Resources Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
            {resources.map((res) => (
              <div key={res.id} className="glass-card" style={{ borderColor: selectedResForSlots === res.id ? 'var(--accent-cyan)' : undefined }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className="badge badge-partial">{res.category}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Base Cap: {res.base_capacity} units</span>
                </div>
                <h4 style={{ fontSize: '1.15rem', marginBottom: '0.35rem' }}>{res.name}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', minHeight: 38 }}>
                  {res.description}
                </p>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Operating Hours: <strong style={{ color: 'var(--text-main)' }}>09:00 - 18:00</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <button
                    className={`btn btn-sm ${selectedResForSlots === res.id ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSelectedResForSlots(res.id)}
                  >
                    View Time Slots
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setGenResourceId(res.id);
                      setShowSlotModal(true);
                    }}
                  >
                    Generate Slots
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Slots Table for Selected Resource */}
          {selectedResForSlots && (
            <div className="glass-panel" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h4 style={{ fontSize: '1.15rem' }}>
                    Time Slots for {resources.find((r) => r.id === selectedResForSlots)?.name || 'Selected Resource'}
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Inspect slot capacity, current occupancy, remaining capacity, and modify slot parameters in PostgreSQL.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <input
                    type="date"
                    className="form-input"
                    style={{ width: 'auto' }}
                    value={resourceSlotsDate}
                    onChange={(e) => setResourceSlotsDate(e.target.value)}
                  />
                </div>
              </div>

              {resourceSlots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 0', color: 'var(--text-muted)' }}>
                  No slots scheduled for this date. Click "Batch Generate Slots" to create intervals.
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Time Slot</th>
                      <th>Slot Capacity</th>
                      <th>Current Occupancy</th>
                      <th>Remaining Capacity</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resourceSlots.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <strong>{String(s.start_time).slice(0, 5)} - {String(s.end_time).slice(0, 5)}</strong>
                        </td>
                        <td>{s.max_capacity}</td>
                        <td>{s.current_reservations}</td>
                        <td>
                          <span style={{ fontWeight: 600, color: s.max_capacity - s.current_reservations > 0 ? '#34d399' : '#f87171' }}>
                            {Math.max(0, s.max_capacity - s.current_reservations)}
                          </span>
                        </td>
                        <td>
                          <span className={getStatusBadgeClass(getSlotAvailabilityStatus(s))}>
                            {getSlotAvailabilityStatus(s)}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                            onClick={() => {
                              setEditingSlot(s);
                              setNewSlotCapacity(s.max_capacity);
                            }}
                          >
                            <Edit3 size={13} />
                            <span>Edit Capacity</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 6: AVAILABILITY                                   */}
      {/* ========================================================= */}
      {section === 'availability' && (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem' }}>Real-Time Availability Management</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Live calculation of slot capacity, current reservations, remaining seats, and queue sizes directly from PostgreSQL.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <select
                className="form-select"
                style={{ width: 'auto' }}
                value={availResource}
                onChange={(e) => setAvailResource(e.target.value)}
              >
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>

              <input
                type="date"
                className="form-input"
                style={{ width: 'auto' }}
                value={availDate}
                onChange={(e) => setAvailDate(e.target.value)}
              />
            </div>
          </div>

          {availSlots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 0', color: 'var(--text-muted)' }}>
              No slots scheduled for this resource on {availDate}.
            </div>
          ) : (
            <div className="slots-grid">
              {availSlots.map((s) => {
                const availStatus = getSlotAvailabilityStatus(s);
                const remaining = Math.max(0, s.max_capacity - s.current_reservations);
                return (
                  <div key={s.id} className={`glass-card slot-card ${s.status === 'FULL' ? 'status-full' : s.status === 'PARTIAL' ? 'status-partial' : 'status-available'}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontWeight: 700, fontFamily: 'var(--font-heading)', fontSize: '1.05rem' }}>
                        {String(s.start_time).slice(0, 5)} - {String(s.end_time).slice(0, 5)}
                      </span>
                      <span className={getStatusBadgeClass(availStatus)}>
                        {availStatus}
                      </span>
                    </div>

                    <div className="progress-bar" style={{ marginBottom: '0.75rem' }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.round((s.current_reservations / s.max_capacity) * 100)}%`,
                          background: s.status === 'FULL' ? 'var(--status-full)' : s.status === 'PARTIAL' ? 'var(--status-partial)' : 'var(--status-available)'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                      <span><strong>Capacity:</strong> {s.max_capacity}</span>
                      <span><strong>Current:</strong> {s.current_reservations}</span>
                      <span style={{ color: remaining > 0 ? '#34d399' : '#f87171' }}>
                        <strong>Remaining:</strong> {remaining}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span>Queue Size: <strong style={{ color: 'var(--accent-purple)' }}>{s.active_queue_count}</strong></span>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => {
                          setEditingSlot(s);
                          setNewSlotCapacity(s.max_capacity);
                        }}
                      >
                        Adjust Capacity
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 7: ANALYTICS                                      */}
      {/* ========================================================= */}
      {section === 'analytics' && (
        <div>
          {/* Top Analytics Metrics */}
          <div className="metrics-grid" style={{ marginBottom: '2rem' }}>
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Cancellations</span>
                <XCircle size={18} color="#ef4444" />
              </div>
              <div className="metric-value">{analytics?.metrics?.cancelled_reservations ?? 0}</div>
              <div className="metric-subtitle">Total cancellations recorded</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Queue Size</span>
                <Users size={18} color="var(--accent-purple)" />
              </div>
              <div className="metric-value">{analytics?.metrics?.current_queue_size ?? 0}</div>
              <div className="metric-subtitle">Pending queue entries</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Average Waiting Time</span>
                <Clock size={18} color="var(--accent-cyan)" />
              </div>
              <div className="metric-value">
                ~{Math.round(analytics?.metrics?.avg_wait_time_minutes ?? 0)}m
              </div>
              <div className="metric-subtitle">Average realized wait time</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Confirmed Bookings</span>
                <CheckCircle size={18} color="var(--status-available)" />
              </div>
              <div className="metric-value">{analytics?.metrics?.confirmed_reservations ?? 0}</div>
              <div className="metric-subtitle">Active confirmed bookings</div>
            </div>
          </div>

          {/* ML Telemetry Banner */}
          <div style={{
            background: 'rgba(139, 92, 246, 0.08)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#c084fc', fontWeight: 600, fontSize: '0.95rem' }}>
                <Sparkles size={18} />
                <span>Machine Learning Wait-Time Model Diagnostics</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem', maxWidth: 650 }}>
                Algorithm: Scikit-Learn HistGradientBoostingRegressor. Factors in queue length, server capacity, service duration, hour of day, and stochastic cancellation patterns.
              </p>
            </div>

            <button className="btn btn-primary" onClick={handleRetrainML} disabled={retraining}>
              <Zap size={16} />
              <span>{retraining ? 'Retraining...' : 'Trigger Model Retrain'}</span>
            </button>
          </div>

          {/* Charts & Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="glass-panel" style={{ padding: '1.75rem' }}>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Reservations by Time Slot (Hourly Demand)</h3>
              <canvas ref={canvasRef} width={500} height={220} style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>

            <div className="glass-panel" style={{ padding: '1.75rem' }}>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Reservations by Day</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Confirmed</th>
                    <th>Cancelled</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics?.daily_reservations?.length > 0 ? (
                    analytics.daily_reservations.map((d) => (
                      <tr key={d.date}>
                        <td><strong>{d.date}</strong></td>
                        <td>{d.total}</td>
                        <td><span style={{ color: '#34d399' }}>{d.confirmed}</span></td>
                        <td><span style={{ color: '#f87171' }}>{d.cancelled}</span></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        No daily trends available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Peak Reservation Periods & Resource Utilization */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="glass-panel" style={{ padding: '1.75rem' }}>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Peak Reservation Periods</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {analytics?.peak_hours?.length > 0 ? (
                  analytics.peak_hours.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-sm)' }}>
                      <div>
                        <strong>{p.time_interval}</strong>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>High booking density window</div>
                      </div>
                      <span className="badge badge-partial">{p.bookings_count} bookings</span>
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    09:00 - 11:00 and 14:00 - 16:00 represent peak demand intervals.
                  </div>
                )}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.75rem' }}>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Resource Utilization Rate</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Resource</th>
                    <th>Category</th>
                    <th>Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics?.resource_utilization?.map((r) => (
                    <tr key={r.resource_id}>
                      <td><strong>{r.resource_name}</strong></td>
                      <td><span className="badge badge-partial" style={{ fontSize: '0.72rem' }}>{r.category}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div className="progress-bar" style={{ margin: 0, flex: 1 }}>
                            <div className="progress-fill" style={{ width: `${Math.min(100, r.occupancy_rate)}%` }} />
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{r.occupancy_rate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: RESERVATION DETAILS (ADMIN VIEW)                   */}
      {/* ========================================================= */}
      {selectedResDetail && (
        <div className="modal-overlay" onClick={() => setSelectedResDetail(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
              <div>
                <span className="badge badge-ml" style={{ marginBottom: '0.25rem' }}>Database Record</span>
                <h3 style={{ fontSize: '1.3rem' }}>Reservation Details</h3>
              </div>
              <button onClick={() => setSelectedResDetail(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(6, 182, 212, 0.08)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Reservation ID</span>
                <strong style={{ fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>{selectedResDetail.reservation_code}</strong>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>User Name</div>
                  <div style={{ fontWeight: 600 }}>{selectedResDetail.user_name || 'Member'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>User Email</div>
                  <div style={{ fontSize: '0.9rem' }}>{selectedResDetail.user_email}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Resource</div>
                  <div style={{ fontWeight: 600 }}>{selectedResDetail.resource_name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Category</div>
                  <div><span className="badge badge-partial">{selectedResDetail.resource_category || 'General'}</span></div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Date</div>
                  <div style={{ fontWeight: 600 }}>{selectedResDetail.slot_date}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Time Slot</div>
                  <div style={{ fontWeight: 600 }}>
                    {String(selectedResDetail.start_time).slice(0, 5)} - {String(selectedResDetail.end_time).slice(0, 5)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Status</div>
                  <span className={selectedResDetail.status === 'CONFIRMED' ? 'badge badge-available' : 'badge badge-full'}>
                    {selectedResDetail.status}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Party Size</div>
                  <div style={{ fontWeight: 600 }}>{selectedResDetail.party_size || 1} Person(s)</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Created At</div>
                  <div style={{ fontSize: '0.85rem' }}>
                    {selectedResDetail.created_at ? new Date(selectedResDetail.created_at).toLocaleString() : new Date(selectedResDetail.confirmed_at).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Cancelled At</div>
                  <div style={{ fontSize: '0.85rem', color: selectedResDetail.cancelled_at ? '#ef4444' : 'var(--text-muted)' }}>
                    {selectedResDetail.cancelled_at ? new Date(selectedResDetail.cancelled_at).toLocaleString() : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedResDetail(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: USER DETAILS & ACTIVITY (ADMIN VIEW)               */}
      {/* ========================================================= */}
      {selectedUserDetail && (
        <div className="modal-overlay" onClick={() => setSelectedUserDetail(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
              <div>
                <span className="badge badge-ml" style={{ marginBottom: '0.25rem' }}>User Record</span>
                <h3 style={{ fontSize: '1.3rem' }}>{selectedUserDetail.full_name}</h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{selectedUserDetail.email}</div>
              </div>
              <button onClick={() => setSelectedUserDetail(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Profile Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Role</div>
                <span className={selectedUserDetail.role === 'ADMIN' ? 'badge badge-ml' : 'badge badge-available'}>
                  {selectedUserDetail.role}
                </span>
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Status</div>
                <span style={{ fontSize: '0.85rem', color: selectedUserDetail.is_active ? '#34d399' : '#f87171' }}>
                  ● {selectedUserDetail.is_active ? 'Active' : 'Disabled'}
                </span>
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Member Since</div>
                <div style={{ fontSize: '0.85rem' }}>{new Date(selectedUserDetail.created_at).toLocaleDateString()}</div>
              </div>
            </div>

            {/* User Reservations History */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
                Reservations History ({selectedUserDetail.reservations?.length || 0})
              </h4>
              {selectedUserDetail.reservations?.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No reservations made yet.</div>
              ) : (
                <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                  <table className="data-table" style={{ fontSize: '0.82rem' }}>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Resource</th>
                        <th>Date & Time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedUserDetail.reservations.map((res) => (
                        <tr key={res.id}>
                          <td><strong>{res.reservation_code}</strong></td>
                          <td>{res.resource_name}</td>
                          <td>{res.slot_date} {String(res.start_time).slice(0, 5)}</td>
                          <td>
                            <span className={res.status === 'CONFIRMED' ? 'badge badge-available' : 'badge badge-full'}>
                              {res.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Active Queue Tickets */}
            <div>
              <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
                Active Queue Positions ({selectedUserDetail.queue_tickets?.length || 0})
              </h4>
              {selectedUserDetail.queue_tickets?.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No active queue entries.</div>
              ) : (
                <table className="data-table" style={{ fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th>Position</th>
                      <th>Resource</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedUserDetail.queue_tickets.map((qt) => (
                      <tr key={qt.id}>
                        <td><strong>#{qt.position}</strong></td>
                        <td>{qt.resource_name}</td>
                        <td>{qt.slot_date} {String(qt.start_time).slice(0, 5)}</td>
                        <td><span className="badge badge-partial">{qt.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              <button
                className={`btn btn-sm ${selectedUserDetail.role === 'ADMIN' ? 'btn-secondary' : 'btn-primary'}`}
                onClick={async () => {
                  const newRole = selectedUserDetail.role === 'ADMIN' ? 'USER' : 'ADMIN';
                  if (!window.confirm(`Are you sure you want to change role for ${selectedUserDetail.full_name} (${selectedUserDetail.email}) from ${selectedUserDetail.role} to ${newRole}?\n\n${newRole === 'ADMIN' ? 'This user will gain full administrative rights to manage reservations, resources, and users.' : 'This user will be reverted to standard customer privileges.'}`)) return;
                  try {
                    await api.admin.updateUserStatus(selectedUserDetail.id, { role: newRole });
                    setSelectedUserDetail({ ...selectedUserDetail, role: newRole });
                    setSuccessMsg(`Successfully updated role for ${selectedUserDetail.full_name} to ${newRole} in PostgreSQL.`);
                    await loadAllData();
                  } catch (err) {
                    setError(err.message);
                  }
                }}
              >
                <Shield size={14} />
                <span>Change Role: {selectedUserDetail.role === 'ADMIN' ? 'Demote to USER' : 'Promote to ADMIN'}</span>
              </button>

              <button className="btn btn-secondary" onClick={() => setSelectedUserDetail(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIT SLOT CAPACITY                                 */}
      {/* ========================================================= */}
      {editingSlot && (
        <div className="modal-overlay" onClick={() => setEditingSlot(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem' }}>Edit Slot Capacity</h3>
              <button onClick={() => setEditingSlot(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateSlotCapacity}>
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                <div><strong>Slot:</strong> {String(editingSlot.start_time).slice(0, 5)} - {String(editingSlot.end_time).slice(0, 5)}</div>
                <div style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Current Reservations: <strong>{editingSlot.current_reservations}</strong>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">New Max Capacity (Units/Seats)</label>
                <input
                  type="number"
                  min={editingSlot.current_reservations}
                  max="100"
                  required
                  className="form-input"
                  value={newSlotCapacity}
                  onChange={(e) => setNewSlotCapacity(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  Cannot be lower than current reservations ({editingSlot.current_reservations}).
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingSlot(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Capacity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Resource */}
      {showResourceModal && (
        <div className="modal-overlay" onClick={() => setShowResourceModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.3rem' }}>Create New Resource</h3>
              <button onClick={() => setShowResourceModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateResource}>
              <div className="form-group">
                <label className="form-label">Resource Name</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. VIP Boardroom C"
                  value={newResName}
                  onChange={(e) => setNewResName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={newResCategory}
                  onChange={(e) => setNewResCategory(e.target.value)}
                >
                  <option value="Meeting Spaces">Meeting Spaces</option>
                  <option value="Lab & Computing">Lab & Computing</option>
                  <option value="Dining & Hospitality">Dining & Hospitality</option>
                  <option value="Healthcare & Wellness">Healthcare & Wellness</option>
                  <option value="Desks & Workspaces">Desks & Workspaces</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Base Capacity (Units / Seats)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  className="form-input"
                  value={newResCapacity}
                  onChange={(e) => setNewResCapacity(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  placeholder="Asset description, equipment, and features..."
                  value={newResDesc}
                  onChange={(e) => setNewResDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowResourceModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Create Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Batch Generate Slots */}
      {showSlotModal && (
        <div className="modal-overlay" onClick={() => setShowSlotModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.3rem' }}>Batch Generate Time Slots</h3>
              <button onClick={() => setShowSlotModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGenerateSlots}>
              <div className="form-group">
                <label className="form-label">Select Resource</label>
                <select
                  className="form-select"
                  value={genResourceId}
                  onChange={(e) => setGenResourceId(e.target.value)}
                >
                  {resources.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} (Cap: {r.base_capacity})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={genStartDate}
                    onChange={(e) => setGenStartDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={genEndDate}
                    onChange={(e) => setGenEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Start Hour (24h)</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    className="form-input"
                    value={genStartHour}
                    onChange={(e) => setGenStartHour(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Hour (24h)</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    className="form-input"
                    value={genEndHour}
                    onChange={(e) => setGenEndHour(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Slot Duration (Mins)</label>
                  <select
                    className="form-select"
                    value={genDuration}
                    onChange={(e) => setGenDuration(e.target.value)}
                  >
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes</option>
                    <option value="90">90 minutes</option>
                    <option value="120">120 minutes</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Max Slot Capacity</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={genCapacity}
                    onChange={(e) => setGenCapacity(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowSlotModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Generate Slots
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
