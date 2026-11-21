const { getPool } = require('../config/db');
const { formatCourseRow } = require('../utils/timeUtils');

const getCourses = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 6));
    const offset = (page - 1) * limit;

    const whereClauses = [];
    const params = [];

    if (req.user.role === 'student') {
      whereClauses.push("c.status = 'active'");
    } else if (req.query.status) {
      whereClauses.push('c.status = ?');
      params.push(req.query.status);
    }

    if (req.query.search && req.query.search.trim()) {
      const likeStr = `%${req.query.search.trim()}%`;
      whereClauses.push(
        '(c.course_name LIKE ? OR c.course_code LIKE ? OR c.faculty_name LIKE ?)'
      );
      params.push(likeStr, likeStr, likeStr);
    }

    const whereSQL =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const db = getPool();

    const [[countRow]] = await db.query(
      `SELECT COUNT(*) AS total FROM courses c ${whereSQL}`,
      params
    );
    const totalCourses = Number(countRow.total);

    const [rows] = await db.query(
      `SELECT c.*, u.name AS creator_name, u.email AS creator_email
       FROM courses c
       LEFT JOIN users u ON c.created_by = u.id
       ${whereSQL}
       ORDER BY c.date ASC, c.start_time ASC, c.course_code ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const formattedCourses = rows.map(formatCourseRow);

    res.status(200).json({
      success: true,
      count: formattedCourses.length,
      totalCourses,
      page,
      totalPages: Math.ceil(totalCourses / limit) || 1,
      courses: formattedCourses,
    });
  } catch (error) {
    next(error);
  }
};

const getCourseById = async (req, res, next) => {
  try {
    const db = getPool();
    const [rows] = await db.query(
      `SELECT c.*, u.name AS creator_name, u.email AS creator_email
       FROM courses c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = ? LIMIT 1`,
      [req.params.id]
    );

    if (!rows.length) {
      res.status(404);
      throw new Error('Course not found');
    }

    const course = formatCourseRow(rows[0]);

    if (req.user.role === 'student' && course.status !== 'active') {
      res.status(404);
      throw new Error('This course is currently inactive and unavailable.');
    }

    res.status(200).json({
      success: true,
      course,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCourses,
  getCourseById,
};
