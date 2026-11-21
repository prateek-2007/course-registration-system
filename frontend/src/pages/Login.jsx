import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const Login = () => {
  const [roleTab, setRoleTab] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [forgotMode, setForgotMode] = useState(false);
  const [resetData, setResetData] = useState({
    email: '',
    studentId: '',
    newPassword: '',
    confirmPassword: '',
  });

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const loggedInUser = await login(email, password, roleTab);
      if (loggedInUser.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Login failed. Please check your credentials.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (resetData.newPassword.length < 6) {
      return setError('New password must be at least 6 characters long.');
    }
    if (resetData.newPassword !== resetData.confirmPassword) {
      return setError('New passwords do not match.');
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/forgot-password', {
        email: resetData.email,
        studentId: resetData.studentId,
        newPassword: resetData.newPassword,
      });
      setSuccessMsg(data.message);
      setEmail(resetData.email);
      setResetData({
        email: '',
        studentId: '',
        newPassword: '',
        confirmPassword: '',
      });
      setForgotMode(false);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Password reset failed. Check your Email and Student ID.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoCredentials = (type) => {
    setError('');
    setSuccessMsg('');
    setForgotMode(false);
    if (type === 'admin') {
      setRoleTab('admin');
      setEmail('admin@university.edu');
      setPassword('Admin@123');
    } else if (type === 'admin2') {
      setRoleTab('admin');
      setEmail('dean@university.edu');
      setPassword('Admin@123');
    } else {
      setRoleTab('student');
      setEmail('aarav@university.edu');
      setPassword('Password123');
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        {forgotMode ? (
          <>
            <div className="auth-header">
              <h1>Reset Student Password</h1>
              <p>Verify your registered University Email and Student ID to set a new password</p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleForgotSubmit} className="auth-form">
              <div className="form-group">
                <label>Registered Student Email</label>
                <input
                  type="email"
                  required
                  placeholder="aarav@university.edu"
                  value={resetData.email}
                  onChange={(e) =>
                    setResetData((p) => ({ ...p, email: e.target.value }))
                  }
                />
              </div>

              <div className="form-group">
                <label>University Student ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 221IT017"
                  value={resetData.studentId}
                  onChange={(e) =>
                    setResetData((p) => ({ ...p, studentId: e.target.value }))
                  }
                />
              </div>

              <div className="form-group">
                <label>New Password (min. 6 characters)</label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password"
                  value={resetData.newPassword}
                  onChange={(e) =>
                    setResetData((p) => ({ ...p, newPassword: e.target.value }))
                  }
                />
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter new password"
                  value={resetData.confirmPassword}
                  onChange={(e) =>
                    setResetData((p) => ({
                      ...p,
                      confirmPassword: e.target.value,
                    }))
                  }
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary btn-block"
              >
                {submitting ? 'Resetting Password...' : 'Reset Password'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setForgotMode(false);
                  setError('');
                }}
                className="btn btn-outline btn-block"
                style={{ marginTop: '0.6rem' }}
              >
                ← Back to Sign In
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="auth-header">
              <h1>Sign In to Portal</h1>
              <p>Select your role to access your academic dashboard</p>
            </div>

            <div className="role-tabs">
              <button
                type="button"
                className={`role-tab ${roleTab === 'student' ? 'active' : ''}`}
                onClick={() => {
                  setRoleTab('student');
                  setError('');
                }}
              >
                Student Portal
              </button>
              <button
                type="button"
                className={`role-tab ${roleTab === 'admin' ? 'active' : ''}`}
                onClick={() => {
                  setRoleTab('admin');
                  setError('');
                }}
              >
                Administrator Portal
              </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {successMsg && <div className="alert alert-success">{successMsg}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">
                  {roleTab === 'admin' ? 'Administrator Email' : 'Student Email'}
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder={
                    roleTab === 'admin'
                      ? 'admin@university.edu'
                      : 'student@university.edu'
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <div className="label-row">
                  <label htmlFor="password">Password</label>
                  {roleTab === 'student' && (
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setSuccessMsg('');
                        setForgotMode(true);
                      }}
                      className="link-button"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary btn-block"
              >
                {submitting
                  ? 'Signing in...'
                  : `Sign In as ${roleTab === 'admin' ? 'Administrator' : 'Student'}`}
              </button>
            </form>

            <div className="demo-box">
              <span className="demo-label">Quick Fill Test Accounts:</span>
              <div className="demo-buttons">
                <button
                  type="button"
                  onClick={() => fillDemoCredentials('student')}
                  className="btn btn-outline btn-xs"
                >
                  Demo Student (Aarav)
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoCredentials('admin')}
                  className="btn btn-outline btn-xs"
                >
                  Admin 1 (System)
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoCredentials('admin2')}
                  className="btn btn-outline btn-xs"
                >
                  Admin 2 (Dean)
                </button>
              </div>
            </div>

            {roleTab === 'student' && (
              <p className="auth-footer">
                New undergraduate student?{' '}
                <Link to="/register">Create a Student Account</Link>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
