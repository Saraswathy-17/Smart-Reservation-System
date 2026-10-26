import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import BrowseSlotsPage from './pages/BrowseSlotsPage';
import MyReservationsPage from './pages/MyReservationsPage';
import QueueTrackerPage from './pages/QueueTrackerPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import UserDashboardPage from './pages/UserDashboardPage';
import UserProfilePage from './pages/UserProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import AuthView from './components/AuthView';
import { Sparkles, Shield, Cpu, Clock, ShieldAlert, Loader2, AlertCircle } from 'lucide-react';

function AppContent() {
  const { user, isAuthenticated, isAdmin, loading, loginWithGoogle } = useAuth();
  const [activeTab, setActiveTab] = useState('browse');
  const [oauthStatus, setOauthStatus] = useState(null); // { status: 'loading' | 'error', message: '' }

  // Intercept Google OAuth callback parameters on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const oauthError = urlParams.get('error');

    if (oauthError) {
      setOauthStatus({
        status: 'error',
        message: `Google sign-in was cancelled or encountered an error (${oauthError}). Please try again.`,
      });
      window.history.replaceState({}, document.title, '/');
      setActiveTab('login');
      return;
    }

    if (code) {
      setOauthStatus({
        status: 'loading',
        message: 'Authenticating with Google... Exchanging secure credentials.',
      });

      // Maintain redirect URI consistency with Google Cloud console registration
      const redirectUri = window.location.origin + '/auth/google/callback';
      loginWithGoogle(code, redirectUri)
        .then((loggedInUser) => {
          setOauthStatus(null);
          window.history.replaceState({}, document.title, '/');
          handleAuthSuccess(loggedInUser);
        })
        .catch((err) => {
          setOauthStatus({
            status: 'error',
            message: err.message || 'Failed to complete Google authentication.',
          });
          window.history.replaceState({}, document.title, '/');
          setActiveTab('login');
        });
    }
  }, []);

  // Automatically direct user to their respective dashboard on login
  const handleAuthSuccess = (loggedInUser) => {
    if (loggedInUser.role === 'ADMIN') {
      setActiveTab('admin-dashboard');
    } else {
      setActiveTab('user-dashboard');
    }
  };

  // If user is already authenticated on initial load, navigate to dashboard if on login/register
  useEffect(() => {
    if (isAuthenticated && (activeTab === 'login' || activeTab === 'register')) {
      if (isAdmin) {
        setActiveTab('admin-dashboard');
      } else {
        setActiveTab('user-dashboard');
      }
    }
  }, [isAuthenticated, isAdmin]);

  const isAdminRoute = activeTab.startsWith('admin-');
  const adminSection = isAdminRoute ? activeTab.replace('admin-', '') : 'dashboard';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main style={{ flex: 1 }}>
        {/* OAuth Loading Overlay / Feedback */}
        {oauthStatus && (
          <div style={{ maxWidth: 500, margin: '2rem auto', padding: '0 1rem' }}>
            <div
              className="glass-panel"
              style={{
                padding: '2rem',
                textAlign: 'center',
                borderColor: oauthStatus.status === 'error' ? 'rgba(239, 68, 68, 0.4)' : 'var(--accent-cyan)',
              }}
            >
              {oauthStatus.status === 'loading' ? (
                <>
                  <Loader2
                    size={36}
                    color="var(--accent-cyan)"
                    style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }}
                  />
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Signing In with Google</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{oauthStatus.message}</p>
                </>
              ) : (
                <>
                  <AlertCircle size={36} color="#ef4444" style={{ marginBottom: '1rem' }} />
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#ef4444' }}>
                    Google Sign-In Error
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                    {oauthStatus.message}
                  </p>
                  <button className="btn btn-secondary" onClick={() => setOauthStatus(null)}>
                    Dismiss & Try Again
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* 1. AUTHENTICATION VIEWS */}
        {activeTab === 'login' && !isAuthenticated && (
          <AuthView
            initialMode="login"
            onSuccess={handleAuthSuccess}
          />
        )}

        {activeTab === 'register' && !isAuthenticated && (
          <AuthView
            initialMode="register"
            onSuccess={handleAuthSuccess}
          />
        )}

        {/* 2. USER DASHBOARD */}
        {activeTab === 'user-dashboard' && (
          isAuthenticated ? (
            <UserDashboardPage onNavigate={(tab) => setActiveTab(tab)} />
          ) : (
            <AuthView initialMode="login" onSuccess={handleAuthSuccess} />
          )
        )}

        {/* 3. BROWSE SLOTS */}
        {activeTab === 'browse' && (
          <BrowseSlotsPage onNavigate={(tab) => setActiveTab(tab)} />
        )}

        {/* 4. MY RESERVATIONS */}
        {activeTab === 'my-reservations' && (
          isAuthenticated ? (
            <MyReservationsPage />
          ) : (
            <AuthView initialMode="login" onSuccess={handleAuthSuccess} />
          )
        )}

        {/* 5. MY QUEUE TRACKER */}
        {activeTab === 'my-queue' && (
          isAuthenticated ? (
            <QueueTrackerPage onNavigate={(tab) => setActiveTab(tab)} />
          ) : (
            <AuthView initialMode="login" onSuccess={handleAuthSuccess} />
          )
        )}

        {/* 6. NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          isAuthenticated ? (
            <NotificationsPage onNavigate={(tab) => setActiveTab(tab)} />
          ) : (
            <AuthView initialMode="login" onSuccess={handleAuthSuccess} />
          )
        )}

        {/* 7. USER PROFILE */}
        {activeTab === 'profile' && (
          isAuthenticated ? (
            <UserProfilePage />
          ) : (
            <AuthView initialMode="login" onSuccess={handleAuthSuccess} />
          )
        )}

        {/* 8. ADMIN ROUTES */}
        {isAdminRoute && (
          isAdmin ? (
            <AdminDashboardPage initialSection={adminSection} />
          ) : (
            <div className="page-container" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
              <div
                className="glass-panel"
                style={{
                  maxWidth: 520,
                  margin: '0 auto',
                  padding: '3rem 2rem',
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                }}
              >
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                  color: '#ef4444',
                }}>
                  <ShieldAlert size={28} />
                </div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Access Restricted</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  This administrative route is secured by server-side Role-Based Access Control (RBAC). Your account does not hold administrator authorization.
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => setActiveTab(isAuthenticated ? 'user-dashboard' : 'login')}
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          )
        )}
      </main>

      {/* Production-Style Footer */}
      <footer style={{
        background: 'rgba(10, 14, 23, 0.95)',
        borderTop: '1px solid var(--border-subtle)',
        padding: '2.5rem 1.5rem',
        marginTop: '4rem',
      }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>
              <Sparkles size={18} color="var(--accent-cyan)" />
              SmartReserve
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Dynamic Availability & Machine Learning Queue Prediction Platform
            </div>
          </div>

          <div style={{ display: 'flex', gap: '2rem', fontSize: '0.82rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Shield size={14} color="var(--status-available)" /> ACID Concurrency Locking
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Cpu size={14} color="var(--accent-purple)" /> Scikit-Learn Hybrid Wait Estimator
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Clock size={14} color="var(--accent-cyan)" /> FIFO Auto-Promotion
            </span>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>
            Production Academic System • 2026
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
