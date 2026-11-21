import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useLiveSync } from '../api/useLiveSync';

const MyCourses = () => {
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [history, setHistory] = useState([]);
  const [totalCredits, setTotalCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const fetchMyCourses = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const { data } = await api.get('/enrollments/my-courses');
      setEnrolledCourses(data.enrolledCourses || []);
      setHistory(data.history || []);
      setTotalCredits(data.totalActiveCredits || 0);
    } catch (err) {
      if (!silent) {
        setFeedback({
          type: 'error',
          message:
            err.response?.data?.message || 'Failed to load your enrollments.',
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyCourses(false);
  }, [fetchMyCourses]);

  useLiveSync(() => {
    fetchMyCourses(true);
  });

  const handleDrop = async (courseId) => {
    setFeedback({ type: '', message: '' });
    setActionLoadingId(courseId);
    try {
      const { data } = await api.delete(`/enrollments/${courseId}`);
      setFeedback({ type: 'success', message: data.message });
      await fetchMyCourses(true);
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
      <div className="page-header">
        <div>
          <h1>My Registered Courses & Enrollment History</h1>
          <p>
            Active Courses: <strong>{enrolledCourses.length}</strong> • Total
            Registered Credits: <strong>{totalCredits}</strong>
          </p>
        </div>
        <Link to="/student/dashboard" className="btn btn-outline">
          ← Back to Course Catalog
        </Link>
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

      {loading ? (
        <div className="loading-box">Loading your courses...</div>
      ) : (
        <>
          <section className="card-panel">
            <h2>Active Course Registrations ({enrolledCourses.length})</h2>
            {enrolledCourses.length === 0 ? (
              <p className="muted-text">
                You are not currently registered for any active courses.{' '}
                <Link to="/student/dashboard">Browse available courses</Link>.
              </p>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Course Name</th>
                      <th>Faculty</th>
                      <th>Credits</th>
                      <th>Course Starts</th>
                      <th>Class Slot</th>
                      <th>Seats (Occupied / Max)</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrolledCourses.map(({ _id, course }) => (
                      <tr key={_id}>
                        <td>
                          <span className="course-code-badge">
                            {course.courseCode}
                          </span>
                        </td>
                        <td>
                          <Link
                            to={`/courses/${course._id}`}
                            className="table-link"
                          >
                            {course.courseName}
                          </Link>
                        </td>
                        <td>{course.facultyName || 'TBA'}</td>
                        <td>{course.credits}</td>
                        <td>{course.startDate || course.date}</td>
                        <td>
                          {course.date} ({course.startTime} – {course.endTime})
                        </td>
                        <td>
                          {course.enrolledCount} / {course.capacity} (
                          {course.availableSeats} left)
                        </td>
                        <td>
                          <button
                            onClick={() => handleDrop(course._id)}
                            disabled={actionLoadingId === course._id}
                            className="btn btn-danger btn-xs"
                          >
                            {actionLoadingId === course._id
                              ? 'Dropping...'
                              : 'Drop Course'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card-panel">
            <h2>Personal Enrollment History ({history.length})</h2>
            {history.length === 0 ? (
              <p className="muted-text">No enrollment records found.</p>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Course Code</th>
                      <th>Course Title</th>
                      <th>Faculty</th>
                      <th>Schedule</th>
                      <th>Status</th>
                      <th>Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item) => (
                      <tr key={item._id}>
                        <td>
                          <strong>{item.course.courseCode}</strong>
                        </td>
                        <td>{item.course.courseName}</td>
                        <td>{item.course.facultyName || 'TBA'}</td>
                        <td>
                          {item.course.date} ({item.course.startTime} –{' '}
                          {item.course.endTime})
                        </td>
                        <td>
                          <span
                            className={`status-tag ${
                              item.status === 'enrolled' ? 'enrolled' : 'dropped'
                            }`}
                          >
                            {item.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          {new Date(item.registrationDate).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default MyCourses;
