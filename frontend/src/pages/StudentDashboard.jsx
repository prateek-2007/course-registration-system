import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useLiveSync } from '../api/useLiveSync';
import { useAuth } from '../context/AuthContext';
import CourseCard from '../components/CourseCard';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCourses, setTotalCourses] = useState(0);

  const [enrolledCourseIds, setEnrolledCourseIds] = useState(new Set());
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [totalCredits, setTotalCredits] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const fetchDashboardData = useCallback(
    async (
      targetPage = page,
      searchQuery = search,
      pageLimit = limit,
      silent = false
    ) => {
      try {
        if (!silent) setLoading(true);
        const [coursesRes, myCoursesRes] = await Promise.all([
          api.get('/courses', {
            params: { page: targetPage, limit: pageLimit, search: searchQuery },
          }),
          api.get('/enrollments/my-courses'),
        ]);

        setCourses(coursesRes.data.courses || []);
        setPage(coursesRes.data.page || 1);
        setTotalPages(coursesRes.data.totalPages || 1);
        setTotalCourses(coursesRes.data.totalCourses || 0);

        const activeList = myCoursesRes.data.enrolledCourses || [];
        setEnrolledCourses(activeList);
        setTotalCredits(myCoursesRes.data.totalActiveCredits || 0);
        setEnrolledCourseIds(
          new Set(activeList.map((item) => item.course._id))
        );
      } catch (err) {
        if (!silent) {
          setFeedback({
            type: 'error',
            message:
              err.response?.data?.message || 'Failed to load courses from server.',
          });
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [page, search, limit]
  );

  useEffect(() => {
    fetchDashboardData(page, search, limit, false);
  }, [page, limit]);

  // Real-time auto-sync without page refresh!
  useLiveSync(() => {
    fetchDashboardData(page, search, limit, true);
  }, 3000);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchDashboardData(1, search, limit, false);
  };

  const handleEnroll = async (courseId) => {
    setFeedback({ type: '', message: '' });
    setActionLoadingId(courseId);
    try {
      const { data } = await api.post(`/enrollments/${courseId}`);
      setFeedback({ type: 'success', message: data.message });
      await fetchDashboardData(page, search, limit, true);
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          err.response?.data?.message ||
          'Course registration failed. Please check seat availability and schedule.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDrop = async (courseId) => {
    setFeedback({ type: '', message: '' });
    setActionLoadingId(courseId);
    try {
      const { data } = await api.delete(`/enrollments/${courseId}`);
      setFeedback({ type: 'success', message: data.message });
      await fetchDashboardData(page, search, limit, true);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to drop course.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="page-container">
      <div className="dashboard-banner">
        <div>
          <h1>Welcome, {user?.name}</h1>
          <p>
            Student ID: <strong>{user?.studentId}</strong> • Live Auto-Sync
            Enabled (Seat counts & courses update automatically in real time!)
          </p>
        </div>
        <div className="banner-stats">
          <div className="mini-stat">
            <span className="mini-stat-label">Registered Courses</span>
            <span className="mini-stat-value">{enrolledCourses.length}</span>
          </div>
          <div className="mini-stat">
            <span className="mini-stat-label">Active Credits</span>
            <span className="mini-stat-value">{totalCredits}</span>
          </div>
        </div>
      </div>

      {feedback.message && (
        <div
          className={`alert ${
            feedback.type === 'error' ? 'alert-error' : 'alert-success'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            className="alert-close"
            onClick={() => setFeedback({ type: '', message: '' })}
          >
            ×
          </button>
        </div>
      )}

      {enrolledCourses.length > 0 && (
        <section className="enrolled-strip">
          <div className="section-header-inline">
            <h2>Your Current Schedule ({enrolledCourses.length})</h2>
            <Link to="/my-courses" className="link-primary">
              View Full Schedule & Enrollment History →
            </Link>
          </div>
          <div className="enrolled-pills-grid">
            {enrolledCourses.map(({ course }) => (
              <div key={course._id} className="enrolled-pill-card">
                <div>
                  <strong>{course.courseCode}</strong> — {course.courseName}
                  <div className="pill-meta">
                    {course.facultyName || 'TBA'} • Starts:{' '}
                    {course.startDate || course.date} • {course.startTime} –{' '}
                    {course.endTime} ({course.credits} Cr)
                  </div>
                </div>
                <button
                  onClick={() => handleDrop(course._id)}
                  disabled={actionLoadingId === course._id}
                  className="btn btn-danger btn-xs"
                >
                  {actionLoadingId === course._id ? '...' : 'Drop'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="catalog-section">
        <div className="catalog-toolbar">
          <h2>Available Course Catalog ({totalCourses} Total)</h2>
          <form onSubmit={handleSearchSubmit} className="search-bar">
            <input
              type="text"
              placeholder="Search by code, title, or faculty name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm">
              Search
            </button>
            {search && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                  fetchDashboardData(1, '', limit, false);
                }}
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {loading ? (
          <div className="loading-box">Loading active courses...</div>
        ) : courses.length === 0 ? (
          <div className="empty-box">
            No active courses match your search criteria.
          </div>
        ) : (
          <>
            <div className="course-grid">
              {courses.map((course) => (
                <CourseCard
                  key={course._id}
                  course={course}
                  isEnrolled={enrolledCourseIds.has(course._id)}
                  onEnroll={handleEnroll}
                  onDrop={handleDrop}
                  actionLoadingId={actionLoadingId}
                  userRole={user?.role}
                />
              ))}
            </div>

            <div className="pagination-bar">
              <div className="pagination-info">
                Showing page <strong>{page}</strong> of{' '}
                <strong>{totalPages}</strong> ({totalCourses} total courses)
              </div>
              <div className="pagination-controls">
                <label className="page-size-label">
                  Per page:{' '}
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    <option value={3}>3</option>
                    <option value={6}>6</option>
                    <option value={9}>9</option>
                    <option value={12}>12</option>
                  </select>
                </label>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="btn btn-outline btn-sm"
                >
                  ← Previous
                </button>
                <span className="page-indicator">
                  Page {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="btn btn-outline btn-sm"
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default StudentDashboard;
