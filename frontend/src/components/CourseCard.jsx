import React from 'react';
import { Link } from 'react-router-dom';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
};

const CourseCard = ({
  course,
  isEnrolled,
  onEnroll,
  onDrop,
  actionLoadingId,
  userRole,
}) => {
  const availableSeats =
    course.availableSeats !== undefined
      ? course.availableSeats
      : Math.max(0, course.capacity - course.enrolledCount);

  const isFull = availableSeats <= 0;
  const isDeadlinePassed = Boolean(course.isDeadlinePassed);
  const occupancyPercent =
    course.capacity > 0
      ? Math.min(100, Math.round((course.enrolledCount / course.capacity) * 100))
      : 100;

  const isProcessing = actionLoadingId === course._id;

  return (
    <div className={`course-card ${isEnrolled ? 'course-card-enrolled' : ''}`}>
      <div className="course-card-header">
        <div>
          <span className="course-code-badge">{course.courseCode}</span>
          <span className="course-credits-badge">{course.credits} Credits</span>
        </div>
        {isEnrolled ? (
          <span className="status-tag enrolled">Registered</span>
        ) : isDeadlinePassed ? (
          <span className="status-tag full">Deadline Passed</span>
        ) : isFull ? (
          <span className="status-tag full">Full</span>
        ) : (
          <span className="status-tag open">{availableSeats} Seats Left</span>
        )}
      </div>

      <h3 className="course-card-title">{course.courseName}</h3>
      <p className="course-faculty-line">
        Instructor: <strong>{course.facultyName || 'TBA'}</strong>
      </p>
      <p className="course-card-desc">{course.description}</p>

      <div className="course-schedule-box">
        <div className="schedule-row">
          <span className="schedule-label">Class Slot:</span>
          <span className="schedule-value">
            {formatDate(course.date)} ({course.startTime} – {course.endTime})
          </span>
        </div>
        <div className="schedule-row">
          <span className="schedule-label">Course Starts:</span>
          <span className="schedule-value">
            {formatDate(course.startDate || course.date)}
          </span>
        </div>
        <div className="schedule-row">
          <span className="schedule-label">Last Date to Apply:</span>
          <span
            className="schedule-value"
            style={{ color: isDeadlinePassed ? '#dc2626' : '#15803d' }}
          >
            {formatDate(course.applyDeadline || course.date)}
            {isDeadlinePassed ? ' (Closed)' : ''}
          </span>
        </div>
      </div>

      <div className="seat-meter">
        <div className="seat-meter-labels">
          <span>
            Occupied: <strong>{course.enrolledCount}</strong> / {course.capacity}
          </span>
          <span>
            Available: <strong>{availableSeats}</strong>
          </span>
        </div>
        <div className="seat-progress-track">
          <div
            className={`seat-progress-fill ${isFull ? 'fill-danger' : 'fill-primary'}`}
            style={{ width: `${occupancyPercent}%` }}
          />
        </div>
      </div>

      <div className="course-card-actions">
        <Link to={`/courses/${course._id}`} className="btn btn-secondary btn-sm">
          Details
        </Link>

        {userRole === 'student' && (
          <>
            {isEnrolled ? (
              <button
                onClick={() => onDrop(course._id)}
                disabled={isProcessing}
                className="btn btn-danger btn-sm"
              >
                {isProcessing ? 'Dropping...' : 'Drop Course'}
              </button>
            ) : (
              <button
                onClick={() => onEnroll(course._id)}
                disabled={isFull || isDeadlinePassed || isProcessing}
                className="btn btn-primary btn-sm"
              >
                {isProcessing
                  ? 'Registering...'
                  : isDeadlinePassed
                  ? 'Deadline Closed'
                  : isFull
                  ? 'Course Full'
                  : 'Register Now'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CourseCard;
