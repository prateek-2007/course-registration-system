import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { useLiveSync } from '../api/useLiveSync';
import { useAuth } from '../context/AuthContext';

const CourseDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const loadCourseDetails = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const courseRes = await api.get(`/courses/${id}`);
        setCourse(courseRes.data.course);

        if (user?.role === 'student') {
          const myRes = await api.get('/enrollments/my-courses');
          const enrolledIds = new Set(
            (myRes.data.enrolledCourses || []).map((item) => item.course._id)
          );
          setIsEnrolled(enrolledIds.has(String(id)));
        }
      } catch (err) {
        if (!silent) {
          setFeedback({
            type: 'error',
            message:
              err.response?.data?.message || 'Unable to load course details.',
          });
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id, user?.role]
  );

  useEffect(() => {
    loadCourseDetails(false);
  }, [loadCourseDetails]);

  useLiveSync(() => {
    loadCourseDetails(true);
  }, 3000);

  const handleEnroll = async () => {
    setFeedback({ type: '', message: '' });
    setProcessing(true);
    try {
      const { data } = await api.post(`/enrollments/${id}`);
      setFeedback({ type: 'success', message: data.message });
      await loadCourseDetails(true);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Registration failed.',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDrop = async () => {
    setFeedback({ type: '', message: '' });
    setProcessing(true);
    try {
      const { data } = await api.delete(`/enrollments/${id}`);
      setFeedback({ type: 'success', message: data.message });
      await loadCourseDetails(true);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Drop course failed.',
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-box">Loading course details...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="page-container">
        <div className="alert alert-error">
          {feedback.message || 'Course not found.'}
        </div>
        <Link
          to={user?.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'}
          className="btn btn-outline"
        >
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const availableSeats =
    course.availableSeats !== undefined
      ? course.availableSeats
      : Math.max(0, course.capacity - course.enrolledCount);

  return (
    <div className="page-container">
      <div className="page-header">
        <Link
          to={user?.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'}
          className="btn btn-outline btn-sm"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {feedback.message && (
        <div
          className={`alert ${
            feedback.type === 'error' ? 'alert-error' : 'alert-success'
          }`}
        >
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="card-panel details-card">
        <div className="details-header">
          <div>
            <span className="course-code-badge">{course.courseCode}</span>
            <span className="course-credits-badge">
              {course.credits} Credits
            </span>
            <span
              className={`status-tag ${
                course.status === 'active' ? 'open' : 'full'
              }`}
            >
              {course.status.toUpperCase()}
            </span>
          </div>
          {user?.role === 'student' && (
            <div>
              {isEnrolled ? (
                <button
                  onClick={handleDrop}
                  disabled={processing}
                  className="btn btn-danger"
                >
                  {processing ? 'Dropping...' : 'Drop This Course'}
                </button>
              ) : (
                <button
                  onClick={handleEnroll}
                  disabled={
                    availableSeats <= 0 || course.isDeadlinePassed || processing
                  }
                  className="btn btn-primary"
                >
                  {processing
                    ? 'Registering...'
                    : course.isDeadlinePassed
                    ? 'Registration Deadline Passed'
                    : availableSeats <= 0
                    ? 'Course Full'
                    : 'Register for Course'}
                </button>
              )}
            </div>
          )}
        </div>

        <h1>{course.courseName}</h1>
        <p className="details-description">{course.description}</p>

        <div className="details-grid">
          <div className="detail-item">
            <span className="detail-label">Course Instructor / Faculty</span>
            <span className="detail-value">{course.facultyName || 'TBA'}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Course Starts On</span>
            <span className="detail-value">
              {course.startDate || course.date}
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Last Date to Apply</span>
            <span
              className="detail-value"
              style={{
                color: course.isDeadlinePassed ? '#dc2626' : '#15803d',
              }}
            >
              {course.applyDeadline || course.date}
              {course.isDeadlinePassed ? ' (Closed)' : ' (Open)'}
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Class Schedule & Time Slot</span>
            <span className="detail-value">
              {course.date} ({course.startTime} – {course.endTime})
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Occupied / Max Capacity</span>
            <span className="detail-value">
              {course.enrolledCount} / {course.capacity} Seats
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Available Seats (Live)</span>
            <span className="detail-value highlight">
              {availableSeats} Available
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetails;

