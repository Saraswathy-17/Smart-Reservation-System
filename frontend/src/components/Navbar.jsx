import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Calendar,
  Clock,
  Users,
  Shield,
  LogOut,
  LogIn,
  Sparkles,
  LayoutDashboard,
  User,
  Layers,
  BarChart3,
  ListOrdered,
  Eye,
  UserPlus,
  Bell,
  Database,
  Settings,
  Home,
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll for unread notifications if authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    async function checkUnread() {
      try {
        const notifs = await api.notifications.listMy(20);
        const unread = (notifs || []).filter((n) => !n.is_read).length;
        setUnreadCount(unread);
      } catch (err) {
        // Silently skip if network delay
      }
    }
    checkUnread();
    const interval = setInterval(checkUnread, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, activeTab]);

  const handleBrandClick = () => {
    if (isAdmin) {
      setActiveTab('admin-dashboard');
    } else if (isAuthenticated) {
      setActiveTab('user-dashboard');
    } else {
      setActiveTab('browse');
    }
  };

  const handleLogout = () => {
    logout();
    setActiveTab('browse');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Brand Logo */}
        <div className="brand-logo" onClick={handleBrandClick} style={{ cursor: 'pointer' }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(6, 182, 212, 0.4)'
          }}>
            <Sparkles size={20} color="#fff" />
          </div>
          <div>Smart<span>Reserve</span></div>
        </div>

        {/* Dynamic Navigation Links Based on Role */}
        <ul className="nav-links">
          {/* 1. NOT LOGGED IN */}
          {!isAuthenticated && (
            <>
              <li
                className={`nav-item ${activeTab === 'browse' ? 'active' : ''}`}
                onClick={() => setActiveTab('browse')}
              >
                <Calendar size={17} />
                <span>Browse & Reserve</span>
              </li>
            </>
          )}

          {/* 2. REGULAR USER NAVIGATION (Part 2) */}
          {isAuthenticated && !isAdmin && (
            <>
              <li
                className={`nav-item ${activeTab === 'user-dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('user-dashboard')}
              >
                <LayoutDashboard size={17} />
                <span>Dashboard</span>
              </li>

              <li
                className={`nav-item ${activeTab === 'browse' ? 'active' : ''}`}
                onClick={() => setActiveTab('browse')}
              >
                <Calendar size={17} />
                <span>Browse & Reserve</span>
              </li>

              <li
                className={`nav-item ${activeTab === 'my-reservations' ? 'active' : ''}`}
                onClick={() => setActiveTab('my-reservations')}
              >
                <Clock size={17} />
                <span>My Reservations</span>
              </li>

              <li
                className={`nav-item ${activeTab === 'my-queue' ? 'active' : ''}`}
                onClick={() => setActiveTab('my-queue')}
              >
                <Users size={17} />
                <span>My Queue</span>
              </li>

              <li
                className={`nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
                onClick={() => setActiveTab('notifications')}
                style={{ position: 'relative' }}
              >
                <Bell size={17} />
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span
                    style={{
                      background: 'var(--status-partial)',
                      color: '#000',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      borderRadius: '50%',
                      width: 16,
                      height: 16,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: 4,
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </li>

              <li
                className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                <User size={17} />
                <span>Profile</span>
              </li>
            </>
          )}

          {/* 3. ADMIN NAVIGATION (Part 13) */}
          {isAuthenticated && isAdmin && (
            <>
              <li
                className={`nav-item ${activeTab === 'admin-dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin-dashboard')}
              >
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </li>

              <li
                className={`nav-item ${activeTab === 'admin-reservations' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin-reservations')}
              >
                <Clock size={16} />
                <span>Reservations</span>
              </li>

              <li
                className={`nav-item ${activeTab === 'admin-users' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin-users')}
              >
                <Users size={16} />
                <span>Users</span>
              </li>

              <li
                className={`nav-item ${activeTab === 'admin-resources' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin-resources')}
              >
                <Layers size={16} />
                <span>Resources</span>
              </li>

              <li
                className={`nav-item ${activeTab === 'admin-slots' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin-slots')}
              >
                <Calendar size={16} />
                <span>Time Slots</span>
              </li>

              <li
                className={`nav-item ${activeTab === 'admin-queue' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin-queue')}
              >
                <ListOrdered size={16} />
                <span>Queue</span>
              </li>

              <li
                className={`nav-item ${activeTab === 'admin-availability' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin-availability')}
              >
                <Eye size={16} />
                <span>Availability</span>
              </li>

              <li
                className={`nav-item ${activeTab === 'admin-notifications' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin-notifications')}
              >
                <Bell size={16} />
                <span>Notifications</span>
              </li>

              <li
                className={`nav-item ${activeTab === 'admin-analytics' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin-analytics')}
              >
                <BarChart3 size={16} />
                <span>Analytics</span>
              </li>

              <li
                className={`nav-item ${activeTab === 'admin-database-records' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin-database-records')}
              >
                <Database size={16} />
                <span>Database Records</span>
              </li>

              <li
                className={`nav-item ${activeTab === 'admin-settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin-settings')}
              >
                <Settings size={16} />
                <span>Settings</span>
              </li>

              <li
                className="nav-item"
                onClick={handleLogout}
                style={{ color: '#f87171', cursor: 'pointer' }}
                title="Sign out of account"
              >
                <LogOut size={16} color="#f87171" />
                <span style={{ color: '#f87171', fontWeight: 600 }}>Sign Out</span>
              </li>
            </>
          )}
        </ul>

        {/* Right Action / Profile & Sign Out - ALWAYS FIXED ON SCREEN */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, marginLeft: 'auto' }}>
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>{user?.full_name || 'Member'}</div>
                <div style={{ fontSize: '0.72rem', color: isAdmin ? '#c084fc' : '#34d399' }}>
                  {isAdmin ? 'Administrator' : 'Verified Member'}
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleLogout}
                title="Sign out of your account"
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  borderColor: 'rgba(239, 68, 68, 0.35)',
                  color: '#f87171',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.85rem',
                }}
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveTab('login')}
              >
                <LogIn size={15} />
                <span>Sign In</span>
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setActiveTab('register')}
              >
                <UserPlus size={15} />
                <span>Create Account</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
