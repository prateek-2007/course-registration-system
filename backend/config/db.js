const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

let pool;

const getPool = () => {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'course_registration_sql',
      waitForConnections: true,
      connectionLimit: 25,
      queueLimit: 0,
      dateStrings: ['DATE'], // Prevents UTC timezone shift on DATE columns!
    });
  }
  return pool;
};

const connectDB = async () => {
  try {
    const host = process.env.MYSQL_HOST || '127.0.0.1';
    const port = Number(process.env.MYSQL_PORT) || 3306;
    const user = process.env.MYSQL_USER || 'root';
    const password = process.env.MYSQL_PASSWORD || '';
    const dbName = process.env.MYSQL_DATABASE || 'course_registration_sql';

    const bootstrapConn = await mysql.createConnection({
      host,
      port,
      user,
      password,
    });
    await bootstrapConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await bootstrapConn.end();

    const db = getPool();

    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        student_id VARCHAR(50) DEFAULT NULL UNIQUE,
        role ENUM('admin', 'student') NOT NULL DEFAULT 'student',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_users_role_id (role, id),
        INDEX idx_users_name (name)
      ) ENGINE=InnoDB;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_name VARCHAR(150) NOT NULL,
        course_code VARCHAR(20) NOT NULL UNIQUE,
        faculty_name VARCHAR(100) NOT NULL DEFAULT 'TBA',
        description TEXT NOT NULL,
        credits INT NOT NULL,
        date DATE NOT NULL,
        start_date DATE DEFAULT NULL,
        apply_deadline DATE DEFAULT NULL,
        start_time VARCHAR(20) NOT NULL,
        end_time VARCHAR(20) NOT NULL,
        capacity INT NOT NULL,
        enrolled_count INT NOT NULL DEFAULT 0,
        status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
        created_by INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_courses_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
        INDEX idx_courses_status_date (status, date)
      ) ENGINE=InnoDB;
    `);

    const [cols] = await db.query(`SHOW COLUMNS FROM courses LIKE 'start_date'`);
    if (cols.length === 0) {
      await db.query(`ALTER TABLE courses ADD COLUMN start_date DATE DEFAULT NULL AFTER date`);
    }
    const [deadlineCols] = await db.query(`SHOW COLUMNS FROM courses LIKE 'apply_deadline'`);
    if (deadlineCols.length === 0) {
      await db.query(`ALTER TABLE courses ADD COLUMN apply_deadline DATE DEFAULT NULL AFTER start_date`);
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        course_id INT NOT NULL,
        registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        status ENUM('enrolled', 'dropped') NOT NULL DEFAULT 'enrolled',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_student_course (student_id, course_id),
        CONSTRAINT fk_enrollments_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_enrollments_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        INDEX idx_enrollments_course_status (course_id, status),
        INDEX idx_enrollments_student_status (student_id, status),
        INDEX idx_enrollments_reg_date (registration_date DESC)
      ) ENGINE=InnoDB;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        actor_id INT DEFAULT NULL,
        action VARCHAR(50) NOT NULL,
        course_id INT DEFAULT NULL,
        student_id INT DEFAULT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        details TEXT NOT NULL,
        INDEX idx_audit_timestamp (timestamp DESC, id DESC)
      ) ENGINE=InnoDB;
    `);

    await db.query(`DROP TRIGGER IF EXISTS prevent_audit_log_update;`);
    await db.query(`
      CREATE TRIGGER prevent_audit_log_update
      BEFORE UPDATE ON audit_logs
      FOR EACH ROW
      BEGIN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'AuditLog records are append-only and cannot be modified or deleted.';
      END;
    `);

    await db.query(`DROP TRIGGER IF EXISTS prevent_audit_log_delete;`);
    await db.query(`
      CREATE TRIGGER prevent_audit_log_delete
      BEFORE DELETE ON audit_logs
      FOR EACH ROW
      BEGIN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'AuditLog records are append-only and cannot be modified or deleted.';
      END;
    `);

    console.log(`MySQL Connected: ${host}:${port} (Database: ${dbName})`);
  } catch (error) {
    console.error(`MySQL Connection Error: ${error.message}`);
    process.exit(1);
  }
};

connectDB.getPool = getPool;
module.exports = connectDB;
