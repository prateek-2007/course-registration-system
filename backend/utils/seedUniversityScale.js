const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');

const firstNames = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
  'Shaurya', 'Atharv', 'Advik', 'Pranav', 'Advaith', 'Aryan', 'Dhruv', 'Kabir', 'Ritvik', 'Aarush',
  'Kian', 'Darsh', 'Veer', 'Rohan', 'Karthik', 'Prateek', 'Dhairya', 'Siddharth', 'Rishabh', 'Harsh',
  'Ananya', 'Diya', 'Priya', 'Saanvi', 'Aadhya', 'Kiara', 'Myra', 'Pari', 'Anvi', 'Riya',
  'Navya', 'Ira', 'Kavya', 'Avni', 'Khushi', 'Shreya', 'Tanvi', 'Meera', 'Pooja', 'Neha',
];

const lastNames = [
  'Sharma', 'Verma', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Gupta', 'Singh', 'Kumar', 'Joshi',
  'Mehta', 'Rao', 'Solanki', 'Chauhan', 'Deshmukh', 'Kulkarni', 'Chatterjee', 'Banerjee', 'Agarwal', 'Malhotra',
  'Bhatia', 'Saxena', 'Kapoor', 'Tiwari', 'Mishra', 'Pandey', 'Menon', 'Pillai', 'Shetty', 'Hegde',
];

const branches = ['CS', 'IT', 'AI', 'EC', 'DS'];

const seedUniversityScale = async () => {
  const startTime = Date.now();
  try {
    await connectDB();
    const db = connectDB.getPool();

    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('Admin@123', salt);
    const studentHash = await bcrypt.hash('Password123', salt);

    // 1. Ensure 2 Admins & Demo Students exist
    await db.query(
      `INSERT IGNORE INTO users (name, email, password, student_id, role)
       VALUES
       ('System Administrator', 'admin@university.edu', ?, NULL, 'admin'),
       ('Dr. Vikram Sethi (Dean of Academics)', 'dean@university.edu', ?, NULL, 'admin'),
       ('Aarav Sharma', 'aarav@university.edu', ?, '221IT017', 'student'),
       ('Priya Patel', 'priya@university.edu', ?, '221IT018', 'student')`,
      [adminHash, adminHash, studentHash, studentHash]
    );

    // 2. Ensure 1,550+ Students exist
    const totalToGenerate = 1550;
    const batchSize = 500;

    for (let offset = 1; offset <= totalToGenerate; offset += batchSize) {
      const values = [];
      const placeholders = [];
      const end = Math.min(totalToGenerate, offset + batchSize - 1);

      for (let i = offset; i <= end; i++) {
        const fName = firstNames[i % firstNames.length];
        const lName = lastNames[(i * 7) % lastNames.length];
        const branch = branches[i % branches.length];
        const yearPrefix = 23 + (i % 4);
        const rollNum = String(i).padStart(4, '0');
        const studentId = `${yearPrefix}${branch}${rollNum}`;
        const email = `student${rollNum}@university.edu`;
        const fullName = `${fName} ${lName}`;

        placeholders.push("(?, ?, ?, ?, 'student')");
        values.push(fullName, email, studentHash, studentId);
      }

      await db.query(
        `INSERT IGNORE INTO users (name, email, password, student_id, role) VALUES ${placeholders.join(', ')}`,
        values
      );
    }

    const [[adminUser]] = await db.query(
      "SELECT id FROM users WHERE email = 'admin@university.edu' LIMIT 1"
    );

    // 3. Upsert 10 University Courses with realistic capacities
    const universityCourses = [
      // code, name, faculty, desc, credits, scheduleDate, startDate, applyDeadline, startTime, endTime, capacity, targetSeededSeats
      ['CS301', 'Database Management Systems', 'Dr. R. K. Sharma', 'Relational algebra, SQL, B+ tree indexing, query optimization, and ACID transactions.', 4, '2026-11-23', '2026-12-01', '2026-11-30', '10:00 AM', '12:00 PM', 450, 420],
      ['CS302', 'Operating Systems', 'Prof. Ananya Menon', 'Kernel architecture, process scheduling, mutexes, virtual memory, and file systems. (Overlaps with CS301)', 4, '2026-11-23', '2026-12-01', '2026-11-30', '11:00 AM', '01:00 PM', 400, 180],
      ['CS303', 'Computer Networks', 'Dr. Vikramaditya Rao', 'OSI and TCP/IP models, congestion control, BGP/OSPF routing, and transport security. (Adjacent to CS301)', 3, '2026-11-23', '2026-12-01', '2026-11-30', '12:00 PM', '02:00 PM', 350, 349],
      ['CS304', 'Deep Learning & Computer Vision', 'Dr. Jyotsna Sharma', 'Convolutional neural networks, U-Net segmentation architectures, attention mechanisms, and AMP.', 4, '2026-11-24', '2026-12-02', '2026-11-29', '09:00 AM', '11:00 AM', 500, 465],
      ['CS305', 'Graph Neural Networks & Network Science', 'Dr. Siddharth Verma', 'Message passing neural networks, GCN, GAT, GraphSAGE, and node classification.', 3, '2026-11-25', '2026-12-03', '2026-11-29', '02:00 PM', '04:00 PM', 350, 310],
      ['CS306', 'Distributed Systems & Cloud Computing', 'Prof. Rajeshwari Nair', 'Consensus protocols (Raft/Paxos), microservices, Kubernetes orchestration, and fault tolerance.', 4, '2026-11-26', '2026-12-04', '2026-11-30', '10:00 AM', '12:00 PM', 400, 360],
      ['CS307', 'Cybersecurity & Applied Cryptography', 'Dr. K. V. Subramanian', 'Symmetric/asymmetric encryption, zero-knowledge proofs, network intrusion detection, and web security.', 3, '2026-11-26', '2026-12-04', '2026-11-28', '02:00 PM', '04:00 PM', 300, 275],
      ['CS308', 'Data Structures & Algorithmic Design', 'Prof. Meenakshi Iyer', 'Amortized analysis, dynamic programming, network flow algorithms, and NP-completeness.', 4, '2026-11-27', '2026-12-05', '2026-11-30', '09:00 AM', '11:00 AM', 600, 540],
      ['CS309', 'Software Engineering & System Design', 'Dr. Arvind Kulkarni', 'Clean architecture, CI/CD pipelines, load balancing, database sharding, and high-availability design.', 3, '2026-11-27', '2026-12-05', '2026-11-30', '01:00 PM', '03:00 PM', 450, 410],
      ['CS310', 'Quantum Computing Fundamentals (Closed Deadline Demo)', 'Dr. Homi Bhabha Chair', 'Qubits, quantum gates, Shor and Grover algorithms. (Application deadline already passed for demo!)', 3, '2026-11-28', '2026-11-15', '2026-11-10', '03:00 PM', '05:00 PM', 150, 95],
    ];

    for (const [code, name, faculty, desc, credits, date, startDate, deadline, start, end, cap] of universityCourses) {
      await db.query(
        `INSERT INTO courses
          (course_code, course_name, faculty_name, description, credits, date, start_date, apply_deadline, start_time, end_time, capacity, enrolled_count, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'active', ?)
         ON DUPLICATE KEY UPDATE
           faculty_name = VALUES(faculty_name),
           date = VALUES(date),
           start_date = VALUES(start_date),
           apply_deadline = VALUES(apply_deadline),
           capacity = VALUES(capacity)`,
        [code, name, faculty, desc, credits, date, startDate, deadline, start, end, cap, adminUser.id]
      );
    }

    // 4. Reset enrollments cleanly and seed strictly within each course's capacity!
    await db.query('DELETE FROM enrollments');
    await db.query('UPDATE courses SET enrolled_count = 0');

    const [allStudents] = await db.query(
      "SELECT id FROM users WHERE role = 'student' AND email NOT IN ('aarav@university.edu', 'priya@university.edu') ORDER BY id ASC"
    );
    const [courseRows] = await db.query('SELECT id, course_code, capacity FROM courses');
    const courseMap = {};
    courseRows.forEach((c) => {
      courseMap[c.course_code] = c;
    });

    const enrollPlaceholders = [];
    const enrollValues = [];
    let studentCursor = 0;

    for (const [code, , , , , , , , , , cap, targetSeats] of universityCourses) {
      const courseObj = courseMap[code];
      if (!courseObj) continue;

      // Never exceed course capacity!
      const safeCount = Math.min(Number(cap), Number(targetSeats), allStudents.length);

      for (let k = 0; k < safeCount; k++) {
        const stu = allStudents[(studentCursor + k) % allStudents.length];
        enrollPlaceholders.push("(?, ?, NOW(), 'enrolled')");
        enrollValues.push(stu.id, courseObj.id);

        if (enrollPlaceholders.length >= 600) {
          await db.query(
            `INSERT IGNORE INTO enrollments (student_id, course_id, registration_date, status) VALUES ${enrollPlaceholders.join(', ')}`,
            enrollValues
          );
          enrollPlaceholders.length = 0;
          enrollValues.length = 0;
        }
      }
      studentCursor = (studentCursor + 173) % allStudents.length;
    }

    if (enrollPlaceholders.length > 0) {
      await db.query(
        `INSERT IGNORE INTO enrollments (student_id, course_id, registration_date, status) VALUES ${enrollPlaceholders.join(', ')}`,
        enrollValues
      );
    }

    // Recalculate exact enrolled_count from enrollments
    await db.query(`
      UPDATE courses c
      SET c.enrolled_count = (
        SELECT COUNT(*) FROM enrollments e
        WHERE e.course_id = c.id AND e.status = 'enrolled'
      )
    `);

    // 5. Add a MySQL Trigger on courses so enrolled_count can NEVER exceed capacity even via raw SQL!
    await db.query('DROP TRIGGER IF EXISTS enforce_course_capacity_bounds');
    await db.query(`
      CREATE TRIGGER enforce_course_capacity_bounds
      BEFORE UPDATE ON courses
      FOR EACH ROW
      BEGIN
        IF NEW.enrolled_count > NEW.capacity THEN
          SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Course capacity exceeded: enrolled_count cannot be greater than capacity.';
        END IF;
        IF NEW.enrolled_count < 0 THEN
          SET NEW.enrolled_count = 0;
        END IF;
      END;
    `);

    const [verifyCourses] = await db.query(
      'SELECT course_code, enrolled_count, capacity, (capacity - enrolled_count) AS available FROM courses ORDER BY course_code ASC'
    );
    console.log('\n============================================================');
    console.log('   VERIFIED COURSE SEAT OCCUPANCY (ZERO OVERFLOW!)');
    console.log('============================================================');
    console.table(verifyCourses);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding university scale data:', error);
    process.exit(1);
  }
};

seedUniversityScale();
