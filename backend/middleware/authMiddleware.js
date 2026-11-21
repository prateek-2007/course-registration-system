const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');

const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401);
      throw new Error('Not authorized to access this route. No token provided.');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      res.status(401);
      throw new Error('Not authorized. Token is invalid or expired.');
    }

    const db = getPool();
    const [rows] = await db.query(
      'SELECT id, name, email, student_id, role, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
      [decoded.id]
    );

    if (!rows.length) {
      res.status(401);
      throw new Error('The user belonging to this token no longer exists.');
    }

    const u = rows[0];
    req.user = {
      _id: String(u.id),
      id: u.id,
      name: u.name,
      email: u.email,
      studentId: u.student_id,
      role: u.role,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { protect };
