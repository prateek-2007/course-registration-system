const { getPool } = require('../config/db');
const {
  doTimeSlotsOverlap,
  toIsoDateString,
  isDeadlineExpired,
  formatCourseRow,
} = require('../utils/timeUtils');
const { broadcastChange } = require('../utils/liveEvents');

const isSameCalendarDate = (dateA, dateB) => {
  return toIsoDateString(dateA) === toIsoDateString(dateB);
};

const enrollInCourse = async (req, res, next) => {
  const db = getPool();
  const conn = await db.getConnection();

  try {
    const studentId = req.user.id;
    const courseId = Number(req.params.courseId);

    if (!courseId || Number.isNaN(courseId)) {
      res.status(400);
      throw new Error('Invalid course ID format.');
    }

    await conn.beginTransaction();

    // 1. Lock the student's user row to serialize concurrent registration requests from the same student
    await conn.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [studentId]);

    // 2. Lock target course row with FOR UPDATE
    const [courseRows] = await conn.query(
      'SELECT * FROM courses WHERE id = ? FOR UPDATE',
      [courseId]
    );

    if (!courseRows.length) {
      res.status(404);
      throw new Error('Course not found.');
    }

    const targetCourse = courseRows[0];

    if (targetCourse.status !== 'active') {
      res.status(400);
      throw new Error('Cannot register for an inactive course.');
    }

    // 3. Enforce Last Date to Apply (Registration Deadline)
    if (isDeadlineExpired(targetCourse.apply_deadline)) {
      res.status(400);
      throw new Error(
        `Registration closed: The last date to apply for ${targetCourse.course_code} was ${toIsoDateString(targetCourse.apply_deadline)}.`
      );
    }

    // 4. Rule 2: Duplicate Registration Check
    const [existingRows] = await conn.query(
      'SELECT * FROM enrollments WHERE student_id = ? AND course_id = ? FOR UPDATE',
      [studentId, courseId]
    );

    if (existingRows.length > 0 && existingRows[0].status === 'enrolled') {
      res.status(409);
      throw new Error('Duplicate registration: You are already registered for this course.');
    }

    // 5. Rule 3: Timetable Conflict Prevention
    const [activeEnrollments] = await conn.query(
      `SELECT c.id, c.course_name, c.course_code, c.date, c.start_time, c.end_time
       FROM enrollments e
       INNER JOIN courses c ON e.course_id = c.id
       WHERE e.student_id = ? AND e.status = 'enrolled'`,
      [studentId]
    );

    for (const enrolledCourse of activeEnrollments) {
      if (isSameCalendarDate(targetCourse.date, enrolledCourse.date)) {
        const hasOverlap = doTimeSlotsOverlap(
          targetCourse.start_time,
          targetCourse.end_time,
          enrolledCourse.start_time,
          enrolledCourse.end_time
        );

        if (hasOverlap) {
          res.status(409);
          throw new Error(
            `Schedule conflict detected with '${enrolledCourse.course_code} - ${enrolledCourse.course_name}' (${enrolledCourse.start_time} - ${enrolledCourse.end_time} on ${toIsoDateString(enrolledCourse.date)}).`
          );
        }
      }
    }

    // 6. Rule 1 & Rule 7: Atomic Conditional Seat Reservation in SQL
    const [updateResult] = await conn.query(
      `UPDATE courses
       SET enrolled_count = enrolled_count + 1
       WHERE id = ? AND status = 'active' AND enrolled_count < capacity`,
      [courseId]
    );

    if (updateResult.affectedRows === 0) {
      res.status(400);
      throw new Error(
        'Course registration failed: No available seats remaining (capacity is full).'
      );
    }

    // 7. Insert or Reactivate Enrollment Record
    let enrollmentId;
    if (existingRows.length > 0 && existingRows[0].status === 'dropped') {
      enrollmentId = existingRows[0].id;
      await conn.query(
        "UPDATE enrollments SET status = 'enrolled', registration_date = NOW() WHERE id = ?",
        [enrollmentId]
      );
    } else {
      const [insRes] = await conn.query(
        "INSERT INTO enrollments (student_id, course_id, registration_date, status) VALUES (?, ?, NOW(), 'enrolled')",
        [studentId, courseId]
      );
      enrollmentId = insRes.insertId;
    }

    const newEnrolledCount = Number(targetCourse.enrolled_count) + 1;

    // 8. Insert Immutable AuditLog inside same SQL Transaction
    await conn.query(
      'INSERT INTO audit_logs (actor_id, action, course_id, student_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        studentId,
        'COURSE_REGISTERED',
        courseId,
        studentId,
        `Student ${req.user.studentId || req.user.email} registered for course ${targetCourse.course_code} (${targetCourse.course_name}). Seats: ${newEnrolledCount}/${targetCourse.capacity}.`,
      ]
    );

    await conn.commit();

    broadcastChange('COURSE_REGISTERED');

    res.status(201).json({
      success: true,
      message: `Successfully registered for ${targetCourse.course_code} - ${targetCourse.course_name}`,
      enrollment: {
        _id: String(enrollmentId),
        studentId: String(studentId),
        courseId: String(courseId),
        status: 'enrolled',
        registrationDate: new Date(),
      },
      course: formatCourseRow({
        ...targetCourse,
        enrolled_count: newEnrolledCount,
      }),
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

const dropCourse = async (req, res, next) => {
  const db = getPool();
  const conn = await db.getConnection();

  try {
    const studentId = req.user.id;
    const courseId = Number(req.params.courseId);

    if (!courseId || Number.isNaN(courseId)) {
      res.status(400);
      throw new Error('Invalid course ID format.');
    }

    await conn.beginTransaction();

    const [existingRows] = await conn.query(
      "SELECT * FROM enrollments WHERE student_id = ? AND course_id = ? AND status = 'enrolled' FOR UPDATE",
      [studentId, courseId]
    );

    if (!existingRows.length) {
      res.status(404);
      throw new Error('You are not currently registered for this course.');
    }

    await conn.query(
      "UPDATE enrollments SET status = 'dropped' WHERE id = ?",
      [existingRows[0].id]
    );

    await conn.query(
      'UPDATE courses SET enrolled_count = GREATEST(0, enrolled_count - 1) WHERE id = ?',
      [courseId]
    );

    const [courseRows] = await conn.query(
      'SELECT * FROM courses WHERE id = ?',
      [courseId]
    );
    const updatedCourse = courseRows[0];

    await conn.query(
      'INSERT INTO audit_logs (actor_id, action, course_id, student_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        studentId,
        'COURSE_DROPPED',
        courseId,
        studentId,
        `Student ${req.user.studentId || req.user.email} dropped course ${updatedCourse.course_code} (${updatedCourse.course_name}). Seats: ${updatedCourse.enrolled_count}/${updatedCourse.capacity}.`,
      ]
    );

    await conn.commit();

    broadcastChange('COURSE_DROPPED');

    res.status(200).json({
      success: true,
      message: `Successfully dropped ${updatedCourse.course_code} - ${updatedCourse.course_name}`,
      course: formatCourseRow(updatedCourse),
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

const getMyCourses = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const db = getPool();

    const [rows] = await db.query(
      `SELECT e.id AS e_id, e.status AS e_status, e.registration_date, e.created_at AS e_created_at,
              c.*
       FROM enrollments e
       INNER JOIN courses c ON e.course_id = c.id
       WHERE e.student_id = ?
       ORDER BY e.registration_date DESC`,
      [studentId]
    );

    const formattedHistory = rows.map((r) => ({
      _id: String(r.e_id),
      status: r.e_status,
      registrationDate: r.registration_date,
      createdAt: r.e_created_at,
      course: formatCourseRow(r),
    }));

    const activeEnrollments = formattedHistory.filter(
      (item) => item.status === 'enrolled'
    );

    const totalActiveCredits = activeEnrollments.reduce(
      (sum, item) => sum + (item.course.credits || 0),
      0
    );

    res.status(200).json({
      success: true,
      activeCount: activeEnrollments.length,
      totalActiveCredits,
      enrolledCourses: activeEnrollments,
      historyCount: formattedHistory.length,
      history: formattedHistory,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  enrollInCourse,
  dropCourse,
  getMyCourses,
};
