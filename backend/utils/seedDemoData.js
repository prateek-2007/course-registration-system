const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');

const seedDemoData = async () => {
  try {
    await connectDB();
    const db = connectDB.getPool();

    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('Admin@123', salt);
    const studentHash = await bcrypt.hash('Password123', salt);

    await db.query(
      `INSERT IGNORE INTO users (name, email, password, student_id, role)
       VALUES
       ('System Administrator', 'admin@university.edu', ?, NULL, 'admin'),
       ('Aarav Sharma', 'aarav@university.edu', ?, '221IT017', 'student'),
       ('Priya Patel', 'priya@university.edu', ?, '221IT018', 'student')`,
      [adminHash, studentHash, studentHash]
    );

    const [[adminUser]] = await db.query(
      "SELECT id FROM users WHERE email = 'admin@university.edu' LIMIT 1"
    );

    const demoCourses = [
      ['CS301', 'Database Management Systems', 'Dr. R. K. Sharma', 'Relational algebra, SQL, B+ tree indexing, query optimization, and ACID transactions.', 4, '2026-11-16', '10:00 AM', '12:00 PM', 30],
      ['CS302', 'Operating Systems', 'Prof. Ananya Menon', 'Kernel architecture, process scheduling, mutexes, virtual memory, and file systems. (Overlaps with CS301)', 4, '2026-11-16', '11:00 AM', '01:00 PM', 30],
      ['CS303', 'Computer Networks', 'Dr. Vikramaditya Rao', 'OSI and TCP/IP models, congestion control, routing, and security. (Adjacent to CS301, Capacity 1)', 3, '2026-11-16', '12:00 PM', '02:00 PM', 1],
      ['CS304', 'Deep Learning & Computer Vision', 'Dr. Jyotsna Sharma', 'Convolutional neural networks, U-Net segmentation architectures, attention mechanisms, and AMP.', 4, '2026-11-17', '09:00 AM', '11:00 AM', 25],
      ['CS305', 'Graph Neural Networks & Network Science', 'Dr. Siddharth Verma', 'Message passing neural networks, GCN, GAT, GraphSAGE, and node classification.', 3, '2026-11-18', '02:00 PM', '04:00 PM', 20],
    ];

    for (const [code, name, faculty, desc, credits, date, start, end, cap] of demoCourses) {
      await db.query(
        `INSERT IGNORE INTO courses
          (course_code, course_name, faculty_name, description, credits, date, start_time, end_time, capacity, enrolled_count, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'active', ?)`,
        [code, name, faculty, desc, credits, date, start, end, cap, adminUser.id]
      );
    }

    console.log('MySQL Demo Data seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding MySQL demo data:', error);
    process.exit(1);
  }
};

seedDemoData();
