import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useLiveSync } from '../api/useLiveSync';

const getOffsetDateIso = (daysAhead = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return ${y}--;
};

const todayIso = getOffsetDateIso(0);

const initialCourseForm = {
  courseName: '',
  courseCode: '',
  facultyName: '',
  description: '',
  credits: 4,
  date: getOffsetDateIso(3),
  startDate: getOffsetDateIso(7),
  applyDeadline: getOffsetDateIso(5),
  startTime: '10:00 AM',
  endTime: '12:00 PM',
  capacity: 400,
  status: 'active',
};

const initialStudentForm = {
  name: '',
  email: '',
  studentId: '',
  password: '',
};

const initialAdminForm = {
  name: '',
  email: '',
  password: '',
};

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalAdmins: 0,
    totalCourses: 0,
    activeCourses: 0,
    inactiveCourses: 0,
    totalEnrollments: 0,
  });
  const [courses, setCourses] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [recentEnrollments, setRecentEnrollments] = useState([]);
  const [activeTab, setActiveTab] = useState('courses');

  // Course Create / Edit State
  const [formData, setFormData] = useState(initialCourseForm);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Course Roster Inspector State
  const [selectedRoster, setSelectedRoster] = useState(null);
  const [rosterLoading, setRosterLoading] = useState(false);

  // Student Management & Pagination State
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentPage, setStudentPage] = useState(1);
  const [studentTotalPages, setStudentTotalPages] = useState(1);
  const [studentTotalCount, setStudentTotalCount] = useState(0);
  const [studentForm, setStudentForm] = useState(initialStudentForm);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [studentSubmitting, setStudentSubmitting] = useState(false);

  // Admin Creation State
  const [adminForm, setAdminForm] = useState(initialAdminForm);
  const [adminSubmitting, setAdminSubmitting] = useState(false);

  // Audit Logs & Pagination State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditTotalLogs, setAuditTotalLogs] = useState(0);

  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const fetchDashboardOverview = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const { data } = await api.get('/admin/dashboard');
      setStats(data.stats);
      setCourses(data.courses || []);
      setAdmins(data.admins || []);
      setRecentEnrollments(data.recentEnrollments || []);
    } catch (err) {
      if (!silent) {
        setFeedback({
          type: 'error',
          message:
            err.response?.data?.message || 'Failed to load administrator data.',
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const fetchStudentsList = useCallback(
    async (targetPage = studentPage, searchStr = studentSearch) => {
      try {
        const { data } = await api.get('/admin/students', {
          params: { page: targetPage, limit: 15, search: searchStr },
        });
        setStudents(data.students || []);
        setStudentPage(data.page || 1);
        setStudentTotalPages(data.totalPages || 1);
        setStudentTotalCount(data.totalStudents || 0);
      } catch (_) {}
    },
    [studentPage, studentSearch]
  );

  const fetchAuditLogsList = useCallback(
    async (targetPage = auditPage) => {
      try {
        const { data } = await api.get('/admin/audit-logs', {
          params: { page: targetPage, limit: 10 },
        });
        setAuditLogs(data.logs || []);
        setAuditPage(data.page || 1);
        setAuditTotalPages(data.totalPages || 1);
        setAuditTotalLogs(data.totalLogs || 0);
      } catch (_) {}
    },
    [auditPage]
  );

  useEffect(() => {
    fetchDashboardOverview(false);
  }, [fetchDashboardOverview]);

  useEffect(() => {
    fetchStudentsList(studentPage, studentSearch);
  }, [studentPage]);

  useEffect(() => {
    fetchAuditLogsList(auditPage);
  }, [auditPage]);

  // Real-time auto-sync without refreshing the page!
  useLiveSync(() => {
    fetchDashboardOverview(true);
    fetchStudentsList(studentPage, studentSearch);
    fetchAuditLogsList(auditPage);
  }, 3000);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });
    setSubmitting(true);

    try {
      if (editingCourseId) {
        const { data } = await api.put(
          `/admin/courses/${editingCourseId}`,
          formData
        );
        setFeedback({ type: 'success', message: data.message });
      } else {
        const { data } = await api.post('/admin/courses', formData);
        setFeedback({ type: 'success', message: data.message });
      }

      setFormData(initialCourseForm);
      setEditingCourseId(null);
      await fetchDashboardOverview(true);
      await fetchAuditLogsList(1);
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          err.response?.data?.message || 'Failed to save course changes.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const startEditCourse = (course) => {
    setEditingCourseId(course._id);
    setFormData({
      courseName: course.courseName,
      courseCode: course.courseCode,
      facultyName: course.facultyName || 'TBA',
      description: course.description,
      credits: course.credits,
      date: course.date,
      startDate: course.startDate || course.date,
      applyDeadline: course.applyDeadline || course.date,
      startTime: course.startTime,
      endTime: course.endTime,
      capacity: course.capacity,
      status: course.status,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingCourseId(null);
    setFormData(initialCourseForm);
  };

  const handleDeleteCourse = async (courseId, force = false) => {
    setFeedback({ type: '', message: '' });
    try {
      const { data } = await api.delete(
        `/admin/courses/${courseId}${force ? '?force=true' : ''}`
      );
      setFeedback({ type: 'success', message: data.message });
      if (selectedRoster?.course?._id === courseId) {
        setSelectedRoster(null);
      }
      await fetchDashboardOverview(true);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to remove course.',
      });
    }
  };

  const handleToggleStatus = async (course) => {
    const nextStatus = course.status === 'active' ? 'inactive' : 'active';
    setFeedback({ type: '', message: '' });
    try {
      await api.put(`/admin/courses/${course._id}`, {
        status: nextStatus,
      });
      setFeedback({
        type: 'success',
        message: `${course.courseCode} status updated to ${nextStatus.toUpperCase()}.`,
      });
      await fetchDashboardOverview(true);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update status.',
      });
    }
  };

  const handleInspectRoster = async (courseId) => {
    setRosterLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      const { data } = await api.get(
        `/admin/courses/${courseId}/enrollments?status=all`
      );
      setSelectedRoster(data);
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          err.response?.data?.message || 'Failed to load student roster.',
      });
    } finally {
      setRosterLoading(false);
    }
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });
    setStudentSubmitting(true);

    try {
      if (editingStudentId) {
        const { data } = await api.put(
          `/admin/students/${editingStudentId}`,
          studentForm
        );
        setFeedback({ type: 'success', message: data.message });
      } else {
        const { data } = await api.post('/admin/students', studentForm);
        setFeedback({ type: 'success', message: data.message });
      }

      setStudentForm(initialStudentForm);
      setEditingStudentId(null);
      await fetchStudentsList(studentPage, studentSearch);
      await fetchDashboardOverview(true);
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          err.response?.data?.message || 'Failed to save student record.',
      });
    } finally {
      setStudentSubmitting(false);
    }
  };

  const startEditStudent = (student) => {
    setEditingStudentId(student._id);
    setStudentForm({
      name: student.name,
      email: student.email,
      studentId: student.studentId,
      password: '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteStudent = async (studentId) => {
    setFeedback({ type: '', message: '' });
    try {
      const { data } = await api.delete(`/admin/students/${studentId}`);
      setFeedback({ type: 'success', message: data.message });
      await fetchStudentsList(studentPage, studentSearch);
      await fetchDashboardOverview(true);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to delete student.',
      });
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });
    setAdminSubmitting(true);
    try {
      const { data } = await api.post('/admin/admins', adminForm);
      setFeedback({ type: 'success', message: data.message });
      setAdminForm(initialAdminForm);
      await fetchDashboardOverview(true);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to add administrator.',
      });
    } finally {
      setAdminSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="dashboard-banner admin-banner">
        <div>
          <h1>Academic Administrator Dashboard</h1>
          <p>
            Live Auto-Sync Active • Manage courses, start dates, registration
            deadlines, 1,500+ students, administrators, and audit logs.
          </p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Registered Students</span>
          <span className="kpi-value">{stats.totalStudents}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Administrators</span>
          <span className="kpi-value">{stats.totalAdmins || admins.length}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Open Courses</span>
          <span className="kpi-value">
            {stats.activeCourses} / {stats.totalCourses}
          </span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Active Seat Enrollments</span>
          <span className="kpi-value">{stats.totalEnrollments}</span>
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

      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'courses' ? 'active' : ''}`}
          onClick={() => setActiveTab('courses')}
        >
          Courses & Deadlines ({courses.length})
        </button>
        <button
          className={`admin-tab ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => setActiveTab('students')}
        >
          Manage Students ({studentTotalCount})
        </button>
        <button
          className={`admin-tab ${activeTab === 'admins' ? 'active' : ''}`}
          onClick={() => setActiveTab('admins')}
        >
          Administrators ({admins.length})
        </button>
        <button
          className={`admin-tab ${activeTab === 'enrollments' ? 'active' : ''}`}
          onClick={() => setActiveTab('enrollments')}
        >
          Recent Enrollments
        </button>
        <button
          className={`admin-tab ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          Audit Logs ({auditTotalLogs})
        </button>
      </div>

      {/* TAB 1: COURSES, START DATES & APPLICATION DEADLINES */}
      {activeTab === 'courses' && (
        <>
          <section className="card-panel">
            <h2>
              {editingCourseId
                ? `Edit Course (${formData.courseCode})`
                : 'Add New Course'}
            </h2>
            <form onSubmit={handleFormSubmit} className="admin-course-form">
              <div className="form-grid-3">
                <div className="form-group">
                  <label>Course Code *</label>
                  <input
                    name="courseCode"
                    type="text"
                    required
                    placeholder="e.g., CS311"
                    value={formData.courseCode}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Course Name *</label>
                  <input
                    name="courseName"
                    type="text"
                    required
                    placeholder="e.g., Natural Language Processing"
                    value={formData.courseName}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Faculty / Instructor Name *</label>
                  <input
                    name="facultyName"
                    type="text"
                    required
                    placeholder="e.g., Dr. R. K. Sharma"
                    value={formData.facultyName}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Class Timetable Date *</label>
                  <input
                    name="date"
                    type="date"
                    min={editingCourseId ? undefined : todayIso}
                    required
                    value={formData.date}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Course Start Date (When Course Begins) *</label>
                  <input
                    name="startDate"
                    type="date"
                    min={editingCourseId ? undefined : todayIso}
                    required
                    value={formData.startDate}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Last Date to Apply (Registration Deadline) *</label>
                  <input
                    name="applyDeadline"
                    type="date"
                    min={editingCourseId ? undefined : todayIso}
                    max={formData.startDate || undefined}
                    required
                    value={formData.applyDeadline}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Start Time *</label>
                  <input
                    name="startTime"
                    type="text"
                    required
                    placeholder="e.g., 10:00 AM"
                    value={formData.startTime}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>End Time *</label>
                  <input
                    name="endTime"
                    type="text"
                    required
                    placeholder="e.g., 12:00 PM"
                    value={formData.endTime}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Credits (1 - 10) *</label>
                  <input
                    name="credits"
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={formData.credits}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Maximum Seat Capacity *</label>
                  <input
                    name="capacity"
                    type="number"
                    min="1"
                    required
                    value={formData.capacity}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Registration Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="active">Active (Open for Registration)</option>
                    <option value="inactive">Inactive (Closed)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Course Description *</label>
                <textarea
                  name="description"
                  rows="2"
                  required
                  placeholder="Provide syllabus summary, prerequisites, and learning outcomes..."
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting
                    ? 'Saving...'
                    : editingCourseId
                    ? 'Update Course'
                    : 'Create Course'}
                </button>
                {editingCourseId && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="btn btn-outline"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </section>

          {selectedRoster && (
            <section className="card-panel roster-panel">
              <div className="section-header-inline">
                <div>
                  <h2>
                    Student Roster: {selectedRoster.course.courseCode} —{' '}
                    {selectedRoster.course.courseName}
                  </h2>
                  <p className="muted-text">
                    Faculty: <strong>{selectedRoster.course.facultyName}</strong> •
                    Occupied: {selectedRoster.course.enrolledCount} /{' '}
                    {selectedRoster.course.capacity} (Showing up to 250 recent)
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRoster(null)}
                  className="btn btn-outline btn-sm"
                >
                  Close Roster ×
                </button>
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Student Name</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Registration Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRoster.enrollments.map((rec) => (
                      <tr key={rec._id}>
                        <td>
                          <strong>{rec.studentId?.studentId || 'N/A'}</strong>
                        </td>
                        <td>{rec.studentId?.name || 'Unknown'}</td>
                        <td>{rec.studentId?.email || 'N/A'}</td>
                        <td>
                          <span
                            className={`status-tag ${
                              rec.status === 'enrolled' ? 'enrolled' : 'dropped'
                            }`}
                          >
                            {rec.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          {new Date(rec.registrationDate).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="card-panel">
            <h2>All University Courses ({courses.length})</h2>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Course Name</th>
                    <th>Faculty</th>
                    <th>Class Slot</th>
                    <th>Course Starts</th>
                    <th>Last Date to Apply</th>
                    <th>Occupied / Max</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr key={course._id}>
                      <td>
                        <span className="course-code-badge">
                          {course.courseCode}
                        </span>
                      </td>
                      <td>
                        <strong>{course.courseName}</strong>
                      </td>
                      <td>{course.facultyName || 'TBA'}</td>
                      <td>
                        {course.date}
                        <br />
                        <small>
                          {course.startTime} – {course.endTime}
                        </small>
                      </td>
                      <td>{course.startDate || course.date}</td>
                      <td>
                        <strong
                          style={{
                            color: course.isDeadlinePassed
                              ? '#dc2626'
                              : '#15803d',
                          }}
                        >
                          {course.applyDeadline || course.date}
                        </strong>
                        {course.isDeadlinePassed && (
                          <div>
                            <small style={{ color: '#dc2626' }}>
                              Deadline Passed
                            </small>
                          </div>
                        )}
                      </td>
                      <td>
                        <strong>{course.enrolledCount}</strong> /{' '}
                        {course.capacity} ({course.availableSeats} left)
                      </td>
                      <td>
                        <span
                          className={`status-tag ${
                            course.status === 'active' ? 'enrolled' : 'dropped'
                          }`}
                        >
                          {course.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="action-cell">
                        <button
                          onClick={() => handleInspectRoster(course._id)}
                          disabled={rosterLoading}
                          className="btn btn-secondary btn-xs"
                        >
                          Roster ({course.enrolledCount})
                        </button>
                        <button
                          onClick={() => startEditCourse(course)}
                          className="btn btn-outline btn-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(course)}
                          className="btn btn-outline btn-xs"
                        >
                          {course.status === 'active'
                            ? 'Deactivate'
                            : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(course._id, true)}
                          className="btn btn-danger btn-xs"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* TAB 2: MANAGE 1,500+ STUDENTS */}
      {activeTab === 'students' && (
        <>
          <section className="card-panel">
            <h2>
              {editingStudentId
                ? `Edit Student (${studentForm.studentId})`
                : 'Add New Student Account'}
            </h2>
            <form onSubmit={handleStudentSubmit}>
              <div className="form-grid-3">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Dhairya Solanki"
                    value={studentForm.name}
                    onChange={(e) =>
                      setStudentForm((p) => ({ ...p, name: e.target.value }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label>University Student ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., 221IT019"
                    value={studentForm.studentId}
                    onChange={(e) =>
                      setStudentForm((p) => ({
                        ...p,
                        studentId: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Student Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="dhairya@university.edu"
                    value={studentForm.email}
                    onChange={(e) =>
                      setStudentForm((p) => ({ ...p, email: e.target.value }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label>
                    {editingStudentId
                      ? 'New Password (leave blank to keep current)'
                      : 'Initial Password (min. 6 chars) *'}
                  </label>
                  <input
                    type="password"
                    required={!editingStudentId}
                    placeholder="Enter password"
                    value={studentForm.password}
                    onChange={(e) =>
                      setStudentForm((p) => ({
                        ...p,
                        password: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  disabled={studentSubmitting}
                  className="btn btn-primary"
                >
                  {studentSubmitting
                    ? 'Saving...'
                    : editingStudentId
                    ? 'Update Student'
                    : 'Add Student'}
                </button>
                {editingStudentId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingStudentId(null);
                      setStudentForm(initialStudentForm);
                    }}
                    className="btn btn-outline"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="card-panel">
            <div className="catalog-toolbar">
              <h2>University Student Directory ({studentTotalCount} Total)</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setStudentPage(1);
                  fetchStudentsList(1, studentSearch);
                }}
                className="search-bar"
              >
                <input
                  type="text"
                  placeholder="Search 1,500+ students by ID, name, or email..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
                <button type="submit" className="btn btn-primary btn-sm">
                  Search
                </button>
                {studentSearch && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      setStudentSearch('');
                      setStudentPage(1);
                      fetchStudentsList(1, '');
                    }}
                  >
                    Clear
                  </button>
                )}
              </form>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Active Courses</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((st) => (
                    <tr key={st._id}>
                      <td>
                        <span className="course-code-badge">{st.studentId}</span>
                      </td>
                      <td>
                        <strong>{st.name}</strong>
                      </td>
                      <td>{st.email}</td>
                      <td>
                        <span className="status-tag open">
                          {st.activeEnrollmentsCount || 0} Enrolled
                        </span>
                      </td>
                      <td className="action-cell">
                        <button
                          onClick={() => startEditStudent(st)}
                          className="btn btn-outline btn-xs"
                        >
                          Edit / Reset Pwd
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(st._id)}
                          className="btn btn-danger btn-xs"
                        >
                          Remove Student
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination-bar">
              <div className="pagination-info">
                Showing page <strong>{studentPage}</strong> of{' '}
                <strong>{studentTotalPages}</strong> ({studentTotalCount} students)
              </div>
              <div className="pagination-controls">
                <button
                  type="button"
                  disabled={studentPage <= 1}
                  onClick={() => setStudentPage((p) => Math.max(1, p - 1))}
                  className="btn btn-outline btn-sm"
                >
                  ← Previous
                </button>
                <span className="page-indicator">
                  Page {studentPage} / {studentTotalPages}
                </span>
                <button
                  type="button"
                  disabled={studentPage >= studentTotalPages}
                  onClick={() =>
                    setStudentPage((p) => Math.min(studentTotalPages, p + 1))
                  }
                  className="btn btn-outline btn-sm"
                >
                  Next →
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      {/* TAB 3: ADMINISTRATORS MANAGEMENT */}
      {activeTab === 'admins' && (
        <>
          <section className="card-panel">
            <h2>Add New Administrator</h2>
            <form onSubmit={handleCreateAdmin}>
              <div className="form-grid-3">
                <div className="form-group">
                  <label>Administrator Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Prof. Registrar"
                    value={adminForm.name}
                    onChange={(e) =>
                      setAdminForm((p) => ({ ...p, name: e.target.value }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Administrator Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="registrar@university.edu"
                    value={adminForm.email}
                    onChange={(e) =>
                      setAdminForm((p) => ({ ...p, email: e.target.value }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Password (min. 6 chars) *</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter password"
                    value={adminForm.password}
                    onChange={(e) =>
                      setAdminForm((p) => ({ ...p, password: e.target.value }))
                    }
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={adminSubmitting}
                className="btn btn-primary"
              >
                {adminSubmitting ? 'Creating...' : 'Create Administrator'}
              </button>
            </form>
          </section>

          <section className="card-panel">
            <h2>System Administrators ({admins.length})</h2>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((a) => (
                    <tr key={a._id}>
                      <td>
                        <strong>{a.name}</strong>
                      </td>
                      <td>{a.email}</td>
                      <td>
                        <span className="role-pill admin">ADMINISTRATOR</span>
                      </td>
                      <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* TAB 4: RECENT ENROLLMENTS */}
      {activeTab === 'enrollments' && (
        <section className="card-panel">
          <h2>Recent Enrollment Activity ({recentEnrollments.length})</h2>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Student Name</th>
                  <th>Course</th>
                  <th>Faculty</th>
                  <th>Status</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {recentEnrollments.map((rec) => (
                  <tr key={rec._id}>
                    <td>
                      <strong>{rec.studentId?.studentId || 'N/A'}</strong>
                    </td>
                    <td>{rec.studentId?.name || 'Unknown'}</td>
                    <td>
                      {rec.courseId
                        ? `${rec.courseId.courseCode} — ${rec.courseId.courseName}`
                        : 'Deleted Course'}
                    </td>
                    <td>{rec.courseId?.facultyName || 'TBA'}</td>
                    <td>
                      <span
                        className={`status-tag ${
                          rec.status === 'enrolled' ? 'enrolled' : 'dropped'
                        }`}
                      >
                        {rec.status.toUpperCase()}
                      </span>
                    </td>
                    <td>{new Date(rec.registrationDate).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <section className="card-panel">
          <h2>Append-Only System Audit Logs ({auditTotalLogs} Total)</h2>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Course</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log._id}>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                    <td>
                      <span className="course-code-badge">{log.action}</span>
                    </td>
                    <td>
                      {log.actorId?.name || 'User'} ({log.actorId?.role || 'N/A'})
                    </td>
                    <td>{log.courseId?.courseCode || '—'}</td>
                    <td>{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination-bar">
            <div className="pagination-info">
              Showing page <strong>{auditPage}</strong> of{' '}
              <strong>{auditTotalPages}</strong> ({auditTotalLogs} total logs)
            </div>
            <div className="pagination-controls">
              <button
                type="button"
                disabled={auditPage <= 1}
                onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                className="btn btn-outline btn-sm"
              >
                ← Previous
              </button>
              <span className="page-indicator">
                Page {auditPage} / {auditTotalPages}
              </span>
              <button
                type="button"
                disabled={auditPage >= auditTotalPages}
                onClick={() =>
                  setAuditPage((p) => Math.min(auditTotalPages, p + 1))
                }
                className="btn btn-outline btn-sm"
              >
                Next →
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default AdminDashboard;

