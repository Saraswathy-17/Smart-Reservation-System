import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  User,
  Mail,
  Phone,
  Lock,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Save,
  KeyRound,
  Calendar,
  Clock,
  Users,
  LogOut,
} from 'lucide-react';

export default function UserProfilePage() {
  const { user, updateUser, logout } = useAuth();

  // Profile fields
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // User Stats
  const [stats, setStats] = useState({
    totalReservations: 0,
    activeReservations: 0,
    queueEntries: 0,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const [resList, qList] = await Promise.all([
          api.reservations.listMy(),
          api.queue.listMy(),
        ]);
        const confirmed = (resList || []).filter((r) => r.status === 'CONFIRMED').length;
        const waiting = (qList || []).filter((q) => q.status === 'WAITING').length;
        setStats({
          totalReservations: (resList || []).length,
          activeReservations: confirmed,
          queueEntries: waiting,
        });
      } catch (err) {
        console.error('Failed to load user profile stats:', err);
      }
    }
    loadStats();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileLoading(true);

    try {
      const updated = await api.auth.updateProfile({
        full_name: fullName,
        phone: phone || undefined,
      });
      updateUser(updated);
      setProfileSuccess('Profile information updated successfully.');
    } catch (err) {
      setProfileError(err.message || 'Could not update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await api.auth.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordSuccess(res.message || 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.message || 'Could not change password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const accountCreatedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString([], {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Active';

  return (
    <div className="page-container" style={{ maxWidth: 960 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Member Profile & Security</h1>
          <p className="page-subtitle">
            Manage your account profile details, review booking stats, and update authentication credentials.
          </p>
        </div>
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
            padding: '0.5rem 1rem',
          }}
          title="Sign out of your account"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Account Overview Cards (Exact requirements from Part 12) */}
      <div
        className="glass-panel"
        style={{
          padding: '1.75rem',
          marginBottom: '2rem',
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(139, 92, 246, 0.05))',
          border: '1px solid rgba(6, 182, 212, 0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.2rem',
              color: '#fff',
            }}
          >
            {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem', margin: 0 }}>{user?.full_name || 'Member'}</h2>
            <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>{user?.email}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="glass-card" style={{ padding: '1rem', background: 'rgba(0, 0, 0, 0.25)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Account Created
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff' }}>
              {accountCreatedDate}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1rem', background: 'rgba(0, 0, 0, 0.25)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Total Reservations
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
              {stats.totalReservations}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1rem', background: 'rgba(0, 0, 0, 0.25)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Active Reservations
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--status-available)' }}>
              {stats.activeReservations}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1rem', background: 'rgba(0, 0, 0, 0.25)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Current Queue Entries
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#c084fc' }}>
              {stats.queueEntries}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem' }}>
        {/* Profile Card */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #06B6D4, #0284C7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User size={20} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem' }}>Profile Details</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Personal identity details</p>
            </div>
          </div>

          {profileSuccess && (
            <div className="banner banner-success" style={{ padding: '0.75rem 1rem', fontSize: '0.86rem' }}>
              <CheckCircle size={16} />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div
              className="banner"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                padding: '0.75rem 1rem',
                fontSize: '0.86rem',
              }}
            >
              <AlertCircle size={16} />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile}>
            <div className="form-group">
              <label className="form-label">Email Address (Immutable)</label>
              <input
                type="email"
                disabled
                className="form-input"
                style={{ opacity: 0.7, cursor: 'not-allowed', background: 'rgba(0, 0, 0, 0.3)' }}
                value={user?.email || ''}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                required
                className="form-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                className="form-input"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Role</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={user?.role === 'ADMIN' ? 'badge badge-ml' : 'badge badge-available'}>
                  <ShieldCheck size={13} /> {user?.role === 'ADMIN' ? 'Administrator' : 'Standard Member'}
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem' }}
              disabled={profileLoading}
            >
              <Save size={16} />
              <span>{profileLoading ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <KeyRound size={20} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem' }}>Change Password</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Never exposed or displayed</p>
            </div>
          </div>

          {passwordSuccess && (
            <div className="banner banner-success" style={{ padding: '0.75rem 1rem', fontSize: '0.86rem' }}>
              <CheckCircle size={16} />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div
              className="banner"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                padding: '0.75rem 1rem',
                fontSize: '0.86rem',
              }}
            >
              <AlertCircle size={16} />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                type="password"
                required
                className="form-input"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                required
                className="form-input"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                required
                className="form-input"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '1rem', borderColor: 'rgba(139, 92, 246, 0.4)', color: '#e9d5ff' }}
              disabled={passwordLoading}
            >
              <Lock size={16} />
              <span>{passwordLoading ? 'Updating Password...' : 'Update Password'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
