import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [pwdFeedback, setPwdFeedback] = useState({ type: '', message: '' });
  const [pwdSaving, setPwdSaving] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) =>
    location.pathname === path ? 'nav-link active' : 'nav-link';

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdFeedback({ type: '', message: '' });

    if (pwdForm.newPassword.length < 6) {
      return setPwdFeedback({
        type: 'error',
        message: 'New password must be at least 6 characters long.',
      });
    }

    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      return setPwdFeedback({
        type: 'error',
        message: 'New passwords do not match.',
      });
    }

    setPwdSaving(true);
    try {
      const { data } = await api.put('/auth/change-password', {
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      });
      setPwdFeedback({ type: 'success', message: data.message });
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwdFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to change password.',
      });
    } finally {
      setPwdSaving(false);
    }
  };

  return (
    <>
      <header className="navbar">
        <div className="navbar-container">
          <Link
            to={
              user
                ? user.role === 'admin'
                  ? '/admin/dashboard'
                  : '/student/dashboard'
                : '/login'
            }
            className="navbar-brand"
          >
            <span className="brand-badge">UNI</span>
            <span>Course Registration System</span>
          </Link>

          {user ? (
            <div className="navbar-menu">
              <nav className="navbar-links">
                {user.role === 'student' && (
                  <>
                    <Link
                      to="/student/dashboard"
                      className={isActive('/student/dashboard')}
                    >
                      Browse Courses
                    </Link>
                    <Link to="/my-courses" className={isActive('/my-courses')}>
                      My Courses & History
                    </Link>
                  </>
                )}
                {user.role === 'admin' && (
                  <Link
                    to="/admin/dashboard"
                    className={isActive('/admin/dashboard')}
                  >
                    Admin Dashboard
                  </Link>
                )}
              </nav>

              <div className="navbar-user">
                <div className="user-meta">
                  <span className="user-name">{user.name}</span>
                  <span className={`role-pill ${user.role}`}>
                    {user.role === 'admin'
                      ? 'Administrator'
                      : `Student • ${user.studentId}`}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setPwdFeedback({ type: '', message: '' });
                    setShowPwdModal(true);
                  }}
                  className="btn btn-outline btn-sm"
                >
                  Change Password
                </button>
                <button
                  onClick={handleLogout}
                  className="btn btn-outline btn-sm"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="navbar-links">
              <Link to="/login" className={isActive('/login')}>
                Login
              </Link>
              <Link to="/register" className={isActive('/register')}>
                Student Sign Up
              </Link>
            </div>
          )}
        </div>
      </header>

      {showPwdModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="section-header-inline">
              <h3>Change Account Password</h3>
              <button
                onClick={() => setShowPwdModal(false)}
                className="alert-close"
              >
                ×
              </button>
            </div>

            {pwdFeedback.message && (
              <div
                className={`alert ${
                  pwdFeedback.type === 'error' ? 'alert-error' : 'alert-success'
                }`}
              >
                <span>{pwdFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter current password"
                  value={pwdForm.currentPassword}
                  onChange={(e) =>
                    setPwdForm((p) => ({
                      ...p,
                      currentPassword: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="form-group">
                <label>New Password (min. 6 chars)</label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password"
                  value={pwdForm.newPassword}
                  onChange={(e) =>
                    setPwdForm((p) => ({ ...p, newPassword: e.target.value }))
                  }
                />
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Confirm new password"
                  value={pwdForm.confirmPassword}
                  onChange={(e) =>
                    setPwdForm((p) => ({
                      ...p,
                      confirmPassword: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  disabled={pwdSaving}
                  className="btn btn-primary"
                >
                  {pwdSaving ? 'Updating...' : 'Update Password'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPwdModal(false)}
                  className="btn btn-outline"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
