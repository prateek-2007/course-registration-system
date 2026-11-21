const bcrypt = require('bcryptjs');
const { getPool } = require('../config/db');
const { parseTimeToMinutes, toIsoDateString, formatCourseRow } = require('../utils/timeUtils');
const { broadcastChange } = require('../utils/liveEvents');

const createCourse = async (req, res, next) => {
  try {
    const {
      courseName,
      courseCode,
      facultyName,
      description,
      credits,
      date,
      startDate,
      applyDeadline,
      startTime,
      endTime,
      capacity,
      status,
    } = req.body;

    if (
      !courseName ||
      !courseCode ||
      !description ||
      credits === undefined ||
      !date ||
      !startTime ||
      !endTime ||
      capacity === undefined
    ) {
      res.status(400);
      throw new Error(
        'Please provide courseName, courseCode, facultyName, description, credits, date, startTime, endTime, and capacity.'
      );
    }

    const startMin = parseTimeToMinutes(startTime);
    const endMin = parseTimeToMinutes(endTime);
    if (Number.isNaN(startMin) || Number.isNaN(endMin) || startMin >= endMin) {
      res.status(400);
      throw new Error('Start time must be a valid time strictly earlier than end time.');
    }

    if (Number(capacity) < 1) {
      res.status(400);
      throw new Error('Capacity must be greater than zero.');
    }

    const normalizedCode = courseCode.trim().toUpperCase();
    const db = getPool();

    const [existing] = await db.query(
      'SELECT id FROM courses WHERE course_code = ? LIMIT 1',
      [normalizedCode]
    );
    if (existing.length > 0) {
      res.status(409);
      throw new Error(`A course with code '${normalizedCode}' already exists.`);
    }

    const formattedDate = toIsoDateString(date);
    const formattedStartDate = toIsoDateString(startDate) || formattedDate;
    const formattedDeadline = toIsoDateString(applyDeadline) || formattedStartDate;
    const courseStatus = status === 'inactive' ? 'inactive' : 'active';
    const cleanFaculty = facultyName ? facultyName.trim() : 'TBA';

    const [result] = await db.query(
      `INSERT INTO courses
        (course_name, course_code, faculty_name, description, credits, date, start_date, apply_deadline, start_time, end_time, capacity, enrolled_count, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        courseName.trim(),
        normalizedCode,
        cleanFaculty,
        description.trim(),
        Number(credits),
        formattedDate,
        formattedStartDate,
        formattedDeadline,
        startTime.trim(),
        endTime.trim(),
        Number(capacity),
        courseStatus,
        req.user.id,
      ]
    );

    const courseId = result.insertId;

    await db.query(
      'INSERT INTO audit_logs (actor_id, action, course_id, student_id, details) VALUES (?, ?, ?, NULL, ?)',
      [
        req.user.id,
        'COURSE_CREATED',
        courseId,
        `Admin ${req.user.email} created course ${normalizedCode} (${courseName.trim()}, Start: ${formattedStartDate}, Apply By: ${formattedDeadline}).`,
      ]
    );

    const [rows] = await db.query('SELECT * FROM courses WHERE id = ?', [courseId]);

    broadcastChange('COURSE_CREATED');

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      course: formatCourseRow(rows[0]),
    });
  } catch (error) {
    next(error);
  }
};

const updateCourse = async (req, res, next) => {
  try {
    const db = getPool();
    const [rows] = await db.query('SELECT * FROM courses WHERE id = ? LIMIT 1', [
      req.params.id,
    ]);

    if (!rows.length) {
      res.status(404);
      throw new Error('Course not found');
    }

    const current = rows[0];
    const {
      courseName,
      courseCode,
      facultyName,
      description,
      credits,
      date,
      startDate,
      applyDeadline,
      startTime,
      endTime,
      capacity,
      status,
    } = req.body;

    const nextCapacity =
      capacity !== undefined ? Number(capacity) : Number(current.capacity);

    if (nextCapacity < Number(current.enrolled_count)) {
      res.status(400);
      throw new Error(
        `Cannot reduce capacity to ${nextCapacity} because ${current.enrolled_count} student(s) are already enrolled.`
      );
    }

    let nextCode = current.course_code;
    if (courseCode && courseCode.trim().toUpperCase() !== current.course_code) {
      nextCode = courseCode.trim().toUpperCase();
      const [dup] = await db.query(
        'SELECT id FROM courses WHERE course_code = ? AND id != ? LIMIT 1',
        [nextCode, current.id]
      );
      if (dup.length > 0) {
        res.status(409);
        throw new Error(`Another course with code '${nextCode}' already exists.`);
      }
    }

    const nextStart = startTime !== undefined ? startTime.trim() : current.start_time;
    const nextEnd = endTime !== undefined ? endTime.trim() : current.end_time;
    const startMin = parseTimeToMinutes(nextStart);
    const endMin = parseTimeToMinutes(nextEnd);
    if (Number.isNaN(startMin) || Number.isNaN(endMin) || startMin >= endMin) {
      res.status(400);
      throw new Error('Start time must be a valid time strictly earlier than end time.');
    }

    const nextName = courseName !== undefined ? courseName.trim() : current.course_name;
    const nextFaculty =
      facultyName !== undefined ? facultyName.trim() || 'TBA' : current.faculty_name;
    const nextDesc = description !== undefined ? description.trim() : current.description;
    const nextCredits = credits !== undefined ? Number(credits) : Number(current.credits);
    const nextDate = date !== undefined ? toIsoDateString(date) : toIsoDateString(current.date);
    const nextStartDate =
      startDate !== undefined
        ? toIsoDateString(startDate)
        : toIsoDateString(current.start_date) || nextDate;
    const nextDeadline =
      applyDeadline !== undefined
        ? toIsoDateString(applyDeadline)
        : toIsoDateString(current.apply_deadline) || nextStartDate;
    const nextStatus = status !== undefined ? status : current.status;

    await db.query(
      `UPDATE courses
       SET course_name = ?, course_code = ?, faculty_name = ?, description = ?,
           credits = ?, date = ?, start_date = ?, apply_deadline = ?,
           start_time = ?, end_time = ?, capacity = ?, status = ?
       WHERE id = ?`,
      [
        nextName,
        nextCode,
        nextFaculty,
        nextDesc,
        nextCredits,
        nextDate,
        nextStartDate,
        nextDeadline,
        nextStart,
        nextEnd,
        nextCapacity,
        nextStatus,
        current.id,
      ]
    );

    await db.query(
      'INSERT INTO audit_logs (actor_id, action, course_id, student_id, details) VALUES (?, ?, ?, NULL, ?)',
      [
        req.user.id,
        'COURSE_UPDATED',
        current.id,
        `Admin ${req.user.email} updated course ${nextCode} (Start: ${nextStartDate}, Apply Deadline: ${nextDeadline}, Capacity: ${nextCapacity}, Status: ${nextStatus}).`,
      ]
    );

    const [updatedRows] = await db.query('SELECT * FROM courses WHERE id = ?', [
      current.id,
    ]);

    broadcastChange('COURSE_UPDATED');

    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      course: formatCourseRow(updatedRows[0]),
    });
  } catch (error) {
    next(error);
  }
};

const deleteCourse = async (req, res, next) => {
  const db = getPool();
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT * FROM courses WHERE id = ? FOR UPDATE',
      [req.params.id]
    );

    if (!rows.length) {
      res.status(404);
      throw new Error('Course not found');
    }

    const course = rows[0];
    const forceDelete = req.query.force === 'true';

    if (Number(course.enrolled_count) > 0 && !forceDelete) {
      await conn.query("UPDATE courses SET status = 'inactive' WHERE id = ?", [
        course.id,
      ]);

      await conn.query(
        'INSERT INTO audit_logs (actor_id, action, course_id, student_id, details) VALUES (?, ?, ?, NULL, ?)',
        [
          req.user.id,
          'COURSE_UPDATED',
          course.id,
          `Admin ${req.user.email} deactivated course ${course.course_code} (${course.enrolled_count} active enrollments preserved).`,
        ]
      );

      const [updatedRows] = await conn.query(
        'SELECT * FROM courses WHERE id = ?',
        [course.id]
      );

      await conn.commit();
      broadcastChange('COURSE_UPDATED');

      return res.status(200).json({
        success: true,
        action: 'deactivated',
        message: `Course '${course.course_code}' has ${course.enrolled_count} enrolled student(s) and was safely deactivated.`,
        course: formatCourseRow(updatedRows[0]),
      });
    }

    await conn.query('DELETE FROM enrollments WHERE course_id = ?', [course.id]);

    await conn.query(
      'INSERT INTO audit_logs (actor_id, action, course_id, student_id, details) VALUES (?, ?, ?, NULL, ?)',
      [
        req.user.id,
        'COURSE_DELETED',
        course.id,
        `Admin ${req.user.email} permanently deleted course ${course.course_code} (${course.course_name}).`,
      ]
    );

    await conn.query('DELETE FROM courses WHERE id = ?', [course.id]);

    await conn.commit();
    broadcastChange('COURSE_DELETED');

    res.status(200).json({
      success: true,
      action: 'deleted',
      message: `Course '${course.course_code}' permanently deleted.`,
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

const getCourseEnrollments = async (req, res, next) => {
  try {
    const db = getPool();
    const [courseRows] = await db.query(
      'SELECT * FROM courses WHERE id = ? LIMIT 1',
      [req.params.id]
    );

    if (!courseRows.length) {
      res.status(404);
      throw new Error('Course not found');
    }

    const course = formatCourseRow(courseRows[0]);
    const statusFilter = req.query.status || 'enrolled';

    let sql = `
      SELECT e.id, e.registration_date, e.status, e.created_at,
             u.id AS u_id, u.name AS u_name, u.email AS u_email, u.student_id AS u_student_id, u.created_at AS u_created_at
      FROM enrollments e
      INNER JOIN users u ON e.student_id = u.id
      WHERE e.course_id = ?
    `;
    const params = [courseRows[0].id];

    if (statusFilter !== 'all') {
      sql += ' AND e.status = ?';
      params.push(statusFilter);
    }

    sql += ' ORDER BY e.registration_date DESC LIMIT 250';

    const [enrollRows] = await db.query(sql, params);

    const enrollments = enrollRows.map((r) => ({
      _id: String(r.id),
      registrationDate: r.registration_date,
      status: r.status,
      createdAt: r.created_at,
      studentId: {
        _id: String(r.u_id),
        name: r.u_name,
        email: r.u_email,
        studentId: r.u_student_id,
        createdAt: r.u_created_at,
      },
    }));

    res.status(200).json({
      success: true,
      course,
      count: enrollments.length,
      enrollments,
    });
  } catch (error) {
    next(error);
  }
};

const getAdminDashboard = async (req, res, next) => {
  try {
    const db = getPool();

    // Execute all dashboard queries concurrently via Promise.all
    const [
      [[kpiRow]],
      [courseRows],
      [adminRows],
      [recentRows],
    ] = await Promise.all([
      db.query(`
        SELECT
          (SELECT COUNT(*) FROM users WHERE role = 'student') AS total_students,
          (SELECT COUNT(*) FROM users WHERE role = 'admin') AS total_admins,
          (SELECT COUNT(*) FROM courses) AS total_courses,
          (SELECT COUNT(*) FROM courses WHERE status = 'active') AS active_courses,
          (SELECT COUNT(*) FROM enrollments WHERE status = 'enrolled') AS total_enrollments
      `),
      db.query('SELECT * FROM courses ORDER BY date ASC, course_code ASC'),
      db.query(
        "SELECT id, name, email, role, created_at FROM users WHERE role = 'admin' ORDER BY id ASC"
      ),
      db.query(`
        SELECT e.id, e.registration_date, e.status,
               u.id AS u_id, u.name AS u_name, u.email AS u_email, u.student_id AS u_student_id,
               c.id AS c_id, c.course_name, c.course_code, c.faculty_name, c.date, c.start_time, c.end_time
        FROM enrollments e
        LEFT JOIN users u ON e.student_id = u.id
        LEFT JOIN courses c ON e.course_id = c.id
        ORDER BY e.registration_date DESC
        LIMIT 40
      `),
    ]);

    const recentEnrollments = recentRows.map((r) => ({
      _id: String(r.id),
      registrationDate: r.registration_date,
      status: r.status,
      studentId: r.u_id
        ? {
            _id: String(r.u_id),
            name: r.u_name,
            email: r.u_email,
            studentId: r.u_student_id,
          }
        : null,
      courseId: r.c_id
        ? {
            _id: String(r.c_id),
            courseName: r.course_name,
            courseCode: r.course_code,
            facultyName: r.faculty_name,
            date: r.date,
            startTime: r.start_time,
            endTime: r.end_time,
          }
        : null,
    }));

    const totalCourses = Number(kpiRow.total_courses);
    const activeCourses = Number(kpiRow.active_courses);

    res.status(200).json({
      success: true,
      stats: {
        totalStudents: Number(kpiRow.total_students),
        totalAdmins: Number(kpiRow.total_admins),
        totalCourses,
        activeCourses,
        inactiveCourses: totalCourses - activeCourses,
        totalEnrollments: Number(kpiRow.total_enrollments),
      },
      admins: adminRows.map((a) => ({
        _id: String(a.id),
        name: a.name,
        email: a.email,
        role: a.role,
        createdAt: a.created_at,
      })),
      courses: courseRows.map(formatCourseRow),
      recentEnrollments,
    });
  } catch (error) {
    next(error);
  }
};

const createAdminAccount = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400);
      throw new Error('Please provide name, email, and password for the new administrator.');
    }
    if (String(password).length < 6) {
      res.status(400);
      throw new Error('Password must be at least 6 characters long.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = getPool();
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [normalizedEmail]
    );
    if (existing.length > 0) {
      res.status(409);
      throw new Error('An account with that email address already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const [result] = await db.query(
      "INSERT INTO users (name, email, password, student_id, role) VALUES (?, ?, ?, NULL, 'admin')",
      [name.trim(), normalizedEmail, hashed]
    );

    await db.query(
      'INSERT INTO audit_logs (actor_id, action, course_id, student_id, details) VALUES (?, ?, NULL, NULL, ?)',
      [
        req.user.id,
        'ADMIN_CREATED',
        `Admin ${req.user.email} added new Administrator ${name.trim()} (${normalizedEmail}).`,
      ]
    );

    broadcastChange('ADMIN_CREATED');

    res.status(201).json({
      success: true,
      message: `Administrator ${name.trim()} (${normalizedEmail}) created successfully.`,
      admin: {
        _id: String(result.insertId),
        name: name.trim(),
        email: normalizedEmail,
        role: 'admin',
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const db = getPool();
    const [
      [[countRow]],
      [rows],
    ] = await Promise.all([
      db.query('SELECT COUNT(*) AS total FROM audit_logs'),
      db.query(
        `SELECT a.*,
                u.name AS actor_name, u.email AS actor_email, u.role AS actor_role,
                c.course_name, c.course_code
         FROM audit_logs a
         LEFT JOIN users u ON a.actor_id = u.id
         LEFT JOIN courses c ON a.course_id = c.id
         ORDER BY a.timestamp DESC, a.id DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      ),
    ]);

    const totalLogs = Number(countRow.total);

    const logs = rows.map((r) => ({
      _id: String(r.id),
      action: r.action,
      timestamp: r.timestamp,
      details: r.details,
      actorId: r.actor_id
        ? {
            _id: String(r.actor_id),
            name: r.actor_name || 'User',
            email: r.actor_email || '',
            role: r.actor_role || 'user',
          }
        : null,
      courseId: r.course_id
        ? {
            _id: String(r.course_id),
            courseName: r.course_name,
            courseCode: r.course_code,
          }
        : null,
    }));

    res.status(200).json({
      success: true,
      count: logs.length,
      totalLogs,
      page,
      totalPages: Math.ceil(totalLogs / limit) || 1,
      logs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Optimized Student Directory query:
 * Paginates `users` FIRST (using idx_users_role_id), then aggregates enrollments only for the 15 rows on the current page!
 */
const getStudents = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const offset = (page - 1) * limit;

    let whereSQL = "WHERE u.role = 'student'";
    const params = [];

    if (req.query.search && req.query.search.trim()) {
      const likeStr = `%${req.query.search.trim()}%`;
      whereSQL += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.student_id LIKE ?)';
      params.push(likeStr, likeStr, likeStr);
    }

    const db = getPool();
    const [
      [[countRow]],
      [rows],
    ] = await Promise.all([
      db.query(`SELECT COUNT(*) AS total FROM users u ${whereSQL}`, params),
      db.query(
        `SELECT page_u.id, page_u.name, page_u.email, page_u.student_id, page_u.role, page_u.created_at,
                COUNT(e.id) AS active_enrollments_count
         FROM (
           SELECT u.id, u.name, u.email, u.student_id, u.role, u.created_at
           FROM users u
           ${whereSQL}
           ORDER BY u.id ASC
           LIMIT ? OFFSET ?
         ) AS page_u
         LEFT JOIN enrollments e ON page_u.id = e.student_id AND e.status = 'enrolled'
         GROUP BY page_u.id
         ORDER BY page_u.id ASC`,
        [...params, limit, offset]
      ),
    ]);

    const totalStudents = Number(countRow.total);

    const students = rows.map((s) => ({
      _id: String(s.id),
      name: s.name,
      email: s.email,
      studentId: s.student_id,
      role: s.role,
      createdAt: s.created_at,
      activeEnrollmentsCount: Number(s.active_enrollments_count || 0),
    }));

    res.status(200).json({
      success: true,
      count: students.length,
      totalStudents,
      page,
      totalPages: Math.ceil(totalStudents / limit) || 1,
      students,
    });
  } catch (error) {
    next(error);
  }
};

const createStudentByAdmin = async (req, res, next) => {
  try {
    const { name, email, studentId, password } = req.body;

    if (!name || !email || !studentId || !password) {
      res.status(400);
      throw new Error('Please provide name, email, studentId, and password.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedStudentId = studentId.trim().toUpperCase();

    const db = getPool();
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ? OR student_id = ? LIMIT 1',
      [normalizedEmail, normalizedStudentId]
    );

    if (existing.length > 0) {
      res.status(409);
      throw new Error('A user with that email or Student ID already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const [result] = await db.query(
      "INSERT INTO users (name, email, password, student_id, role) VALUES (?, ?, ?, ?, 'student')",
      [name.trim(), normalizedEmail, hashed, normalizedStudentId]
    );

    const newId = result.insertId;

    await db.query(
      'INSERT INTO audit_logs (actor_id, action, course_id, student_id, details) VALUES (?, ?, NULL, ?, ?)',
      [
        req.user.id,
        'STUDENT_CREATED',
        newId,
        `Admin ${req.user.email} created student account ${normalizedStudentId} (${name.trim()}, ${normalizedEmail}).`,
      ]
    );

    broadcastChange('STUDENT_CREATED');

    res.status(201).json({
      success: true,
      message: `Student ${name.trim()} (${normalizedStudentId}) created successfully.`,
      student: {
        _id: String(newId),
        name: name.trim(),
        email: normalizedEmail,
        studentId: normalizedStudentId,
        role: 'student',
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateStudentByAdmin = async (req, res, next) => {
  try {
    const db = getPool();
    const [rows] = await db.query(
      "SELECT * FROM users WHERE id = ? AND role = 'student' LIMIT 1",
      [req.params.id]
    );

    if (!rows.length) {
      res.status(404);
      throw new Error('Student not found.');
    }

    const student = rows[0];
    const { name, email, studentId, password } = req.body;

    const nextEmail = email ? email.trim().toLowerCase() : student.email;
    const nextStudentId = studentId
      ? studentId.trim().toUpperCase()
      : student.student_id;
    const nextName = name ? name.trim() : student.name;

    const [dup] = await db.query(
      'SELECT id FROM users WHERE (email = ? OR student_id = ?) AND id != ? LIMIT 1',
      [nextEmail, nextStudentId, student.id]
    );
    if (dup.length > 0) {
      res.status(409);
      throw new Error('Another user is already using that email or Student ID.');
    }

    let nextPassword = student.password;
    if (password && password.trim().length > 0) {
      if (password.trim().length < 6) {
        res.status(400);
        throw new Error('Password must be at least 6 characters long.');
      }
      const salt = await bcrypt.genSalt(10);
      nextPassword = await bcrypt.hash(password.trim(), salt);
    }

    await db.query(
      'UPDATE users SET name = ?, email = ?, student_id = ?, password = ? WHERE id = ?',
      [nextName, nextEmail, nextStudentId, nextPassword, student.id]
    );

    await db.query(
      'INSERT INTO audit_logs (actor_id, action, course_id, student_id, details) VALUES (?, ?, NULL, ?, ?)',
      [
        req.user.id,
        'STUDENT_UPDATED',
        student.id,
        `Admin ${req.user.email} updated student ${nextStudentId} (${nextName}, ${nextEmail}).`,
      ]
    );

    broadcastChange('STUDENT_UPDATED');

    res.status(200).json({
      success: true,
      message: `Student ${nextName} (${nextStudentId}) updated successfully.`,
      student: {
        _id: String(student.id),
        name: nextName,
        email: nextEmail,
        studentId: nextStudentId,
        role: 'student',
      },
    });
  } catch (error) {
    next(error);
  }
};

const deleteStudentByAdmin = async (req, res, next) => {
  const db = getPool();
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT * FROM users WHERE id = ? AND role = 'student' FOR UPDATE",
      [req.params.id]
    );

    if (!rows.length) {
      res.status(404);
      throw new Error('Student not found.');
    }

    const student = rows[0];

    // Single bulk JOIN update instead of N+1 loop
    const [releaseRes] = await conn.query(
      `UPDATE courses c
       INNER JOIN enrollments e ON c.id = e.course_id
       SET c.enrolled_count = GREATEST(0, c.enrolled_count - 1)
       WHERE e.student_id = ? AND e.status = 'enrolled'`,
      [student.id]
    );

    const releasedCount = releaseRes.affectedRows || 0;

    await conn.query('DELETE FROM enrollments WHERE student_id = ?', [student.id]);

    await conn.query(
      'INSERT INTO audit_logs (actor_id, action, course_id, student_id, details) VALUES (?, ?, NULL, ?, ?)',
      [
        req.user.id,
        'STUDENT_DELETED',
        student.id,
        `Admin ${req.user.email} removed student ${student.student_id} (${student.name}) and released ${releasedCount} active course seat(s).`,
      ]
    );

    await conn.query('DELETE FROM users WHERE id = ?', [student.id]);

    await conn.commit();
    broadcastChange('STUDENT_DELETED');

    res.status(200).json({
      success: true,
      message: `Student ${student.name} (${student.student_id}) removed and ${releasedCount} seat(s) released.`,
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

module.exports = {
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseEnrollments,
  getAdminDashboard,
  createAdminAccount,
  getAuditLogs,
  getStudents,
  createStudentByAdmin,
  updateStudentByAdmin,
  deleteStudentByAdmin,
};
