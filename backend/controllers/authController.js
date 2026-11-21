const bcrypt = require('bcryptjs');
const { getPool } = require('../config/db');
const generateToken = require('../utils/generateToken');

const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, studentId, role } = req.body;

    if (role && role !== 'student') {
      res.status(403);
      throw new Error('Public registration as an administrator is strictly forbidden.');
    }

    if (!name || !email || !password || !studentId) {
      res.status(400);
      throw new Error('Please provide name, email, password, and studentId.');
    }

    if (String(password).length < 6) {
      res.status(400);
      throw new Error('Password must be at least 6 characters long.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedStudentId = studentId.trim().toUpperCase();

    const db = getPool();
    const [existing] = await db.query(
      'SELECT email, student_id FROM users WHERE email = ? OR student_id = ? LIMIT 1',
      [normalizedEmail, normalizedStudentId]
    );

    if (existing.length > 0) {
      res.status(409);
      if (existing[0].email === normalizedEmail) {
        throw new Error('An account with this email address already exists.');
      }
      throw new Error('An account with this Student ID already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await db.query(
      'INSERT INTO users (name, email, password, student_id, role) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), normalizedEmail, hashedPassword, normalizedStudentId, 'student']
    );

    const userId = String(result.insertId);
    const token = generateToken(userId, 'student');

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      token,
      user: {
        _id: userId,
        name: name.trim(),
        email: normalizedEmail,
        studentId: normalizedStudentId,
        role: 'student',
        createdAt: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password, expectedRole } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Please provide both email and password.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = getPool();

    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [normalizedEmail]
    );

    if (!rows.length) {
      res.status(401);
      throw new Error('Invalid email or password.');
    }

    const user = rows[0];
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      res.status(401);
      throw new Error('Invalid email or password.');
    }

    if (expectedRole && user.role !== expectedRole) {
      res.status(403);
      throw new Error(
        `Access denied: This account is registered as a '${user.role}', not '${expectedRole}'. Please use the ${user.role} login portal.`
      );
    }

    const userId = String(user.id);
    const token = generateToken(userId, user.role);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        _id: userId,
        name: user.name,
        email: user.email,
        studentId: user.student_id,
        role: user.role,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400);
      throw new Error('Please provide both currentPassword and newPassword.');
    }

    if (newPassword.length < 6) {
      res.status(400);
      throw new Error('New password must be at least 6 characters long.');
    }

    const db = getPool();
    const [rows] = await db.query('SELECT * FROM users WHERE id = ? LIMIT 1', [
      req.user.id,
    ]);

    if (!rows.length) {
      res.status(404);
      throw new Error('User not found.');
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      res.status(401);
      throw new Error('Current password is incorrect.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);

    await db.query('UPDATE users SET password = ? WHERE id = ?', [
      hashed,
      user.id,
    ]);

    await db.query(
      'INSERT INTO audit_logs (actor_id, action, course_id, student_id, details) VALUES (?, ?, NULL, ?, ?)',
      [
        user.id,
        'PASSWORD_CHANGED',
        user.role === 'student' ? user.id : null,
        `User ${user.email} (${user.role}) changed their account password.`,
      ]
    );

    res.status(200).json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email, studentId, newPassword } = req.body;

    if (!email || !studentId || !newPassword) {
      res.status(400);
      throw new Error(
        'Please provide your registered email, Student ID, and a new password.'
      );
    }

    if (newPassword.length < 6) {
      res.status(400);
      throw new Error('New password must be at least 6 characters long.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedStudentId = studentId.trim().toUpperCase();

    const db = getPool();
    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ? AND student_id = ? AND role = 'student' LIMIT 1",
      [normalizedEmail, normalizedStudentId]
    );

    if (!rows.length) {
      res.status(404);
      throw new Error(
        'No matching student account found with that Email and Student ID.'
      );
    }

    const user = rows[0];
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);

    await db.query('UPDATE users SET password = ? WHERE id = ?', [
      hashed,
      user.id,
    ]);

    await db.query(
      'INSERT INTO audit_logs (actor_id, action, course_id, student_id, details) VALUES (?, ?, NULL, ?, ?)',
      [
        user.id,
        'PASSWORD_CHANGED',
        user.id,
        `Student ${user.student_id} (${user.email}) reset their password via Forgot Password recovery.`,
      ]
    );

    res.status(200).json({
      success: true,
      message:
        'Password has been reset successfully! You can now sign in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  changePassword,
  forgotPassword,
};
