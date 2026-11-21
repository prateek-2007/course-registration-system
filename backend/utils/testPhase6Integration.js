const connectDB = require('../config/db');
require('../server.js');

setTimeout(async () => {
  const results = [];
  const recordCheck = (name, passed, detail) => {
    results.push({ name, status: passed ? 'PASS' : 'FAIL', detail });
  };

  try {
    console.log('\n============================================================');
    console.log('   MYSQL UNIVERSITY-SCALE INTEGRATION & AUDIT SUITE');
    console.log('============================================================\n');

    const db = connectDB.getPool();

    const privEscRes = await fetch('http://127.0.0.1:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Malicious User',
        email: 'hacker@university.edu',
        password: 'Password123',
        studentId: '999IT999',
        role: 'admin',
      }),
    });
    const privEscData = await privEscRes.json();
    recordCheck(
      '1. Block Admin Self-Registration',
      privEscRes.status === 403,
      `HTTP ${privEscRes.status} - ${privEscData.message}`
    );

    const [student1Login, student2Login, admin1Login, admin2Login] = await Promise.all([
      fetch('http://127.0.0.1:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'aarav@university.edu', password: 'Password123', expectedRole: 'student' }),
      }).then((r) => r.json()),
      fetch('http://127.0.0.1:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'priya@university.edu', password: 'Password123', expectedRole: 'student' }),
      }).then((r) => r.json()),
      fetch('http://127.0.0.1:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@university.edu', password: 'Admin@123', expectedRole: 'admin' }),
      }).then((r) => r.json()),
      fetch('http://127.0.0.1:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'dean@university.edu', password: 'Admin@123', expectedRole: 'admin' }),
      }).then((r) => r.json()),
    ]);

    recordCheck(
      '2. Multi-Admin & Student JWT Auth',
      Boolean(student1Login.token && student2Login.token && admin1Login.token && admin2Login.token),
      `Verified Admin 1 (${admin1Login.user.email}), Admin 2 (${admin2Login.user.email}), & Students`
    );

    const catalogData = await (
      await fetch('http://127.0.0.1:5000/api/courses?limit=50', {
        headers: { Authorization: 'Bearer ' + student1Login.token },
      })
    ).json();

    const cs301 = catalogData.courses.find((c) => c.courseCode === 'CS301');
    const cs302 = catalogData.courses.find((c) => c.courseCode === 'CS302');
    const cs310 = catalogData.courses.find((c) => c.courseCode === 'CS310');

    // Ensure Aarav is enrolled in CS301
    await fetch(`http://127.0.0.1:5000/api/enrollments/${cs301._id}`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + student1Login.token },
    });

    // Check Duplicate Enrollment
    const dupRes = await fetch(`http://127.0.0.1:5000/api/enrollments/${cs301._id}`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + student1Login.token },
    });
    recordCheck(
      '3. Duplicate Registration Prevention',
      dupRes.status === 409,
      `HTTP ${dupRes.status} - ${(await dupRes.json()).message}`
    );

    // Check Timetable Overlap (CS301 vs CS302)
    const overlapRes = await fetch(`http://127.0.0.1:5000/api/enrollments/${cs302._id}`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + student1Login.token },
    });
    recordCheck(
      '4. Timetable Overlap Prevention',
      overlapRes.status === 409,
      `HTTP ${overlapRes.status} - ${(await overlapRes.json()).message}`
    );

    // Check Expired Application Deadline (CS310)
    const deadlineRes = await fetch(`http://127.0.0.1:5000/api/enrollments/${cs310._id}`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + student1Login.token },
    });
    recordCheck(
      '5. Application Deadline Enforcement (CS310)',
      deadlineRes.status === 400,
      `HTTP ${deadlineRes.status} - ${(await deadlineRes.json()).message}`
    );

    // Check MySQL Trigger Append-Only Immutability on audit_logs
    let triggerBlocked = false;
    let triggerMsg = '';
    try {
      await db.query('DELETE FROM audit_logs LIMIT 1');
    } catch (err) {
      triggerBlocked = true;
      triggerMsg = err.message;
    }
    recordCheck(
      '6. MySQL Append-Only Audit Trigger',
      triggerBlocked,
      triggerMsg
    );

    // Check 1,500+ Student Directory Pagination Speed
    const t0 = Date.now();
    const stuRes = await (
      await fetch('http://127.0.0.1:5000/api/admin/students?page=1&limit=15', {
        headers: { Authorization: 'Bearer ' + admin1Login.token },
      })
    ).json();
    const elapsedMs = Date.now() - t0;
    recordCheck(
      '7. 1,550+ Student Paginated Query Speed',
      stuRes.totalStudents >= 1500 && elapsedMs < 250,
      `Loaded page 1 of ${stuRes.totalPages} (${stuRes.totalStudents} students) in ${elapsedMs}ms`
    );

    console.table(results);
    process.exit(0);
  } catch (err) {
    console.error('Audit Suite Error:', err);
    process.exit(1);
  }
}, 2000);
