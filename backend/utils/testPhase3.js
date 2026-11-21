require('../server.js');

setTimeout(async () => {
  try {
    // 1. Login as Student and Admin
    const studentLogin = await (
      await fetch('http://127.0.0.1:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'aarav@university.edu', password: 'Password123' }),
      })
    ).json();

    const adminLogin = await (
      await fetch('http://127.0.0.1:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@university.edu', password: 'Admin@123' }),
      })
    ).json();

    // 2. Verify Student CANNOT create a course (RBAC Check)
    const unauthorizedRes = await fetch('http://127.0.0.1:5000/api/admin/courses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + studentLogin.token,
      },
      body: JSON.stringify({
        courseName: 'Unauthorized Course',
        courseCode: 'HACK101',
        description: 'Should fail',
        credits: 3,
        date: '2026-11-16',
        startTime: '10:00 AM',
        endTime: '12:00 PM',
        capacity: 30,
      }),
    });
    console.log('\n--- 1. STUDENT ATTEMPTING ADMIN COURSE CREATION (EXPECT 403) ---');
    console.log('Status:', unauthorizedRes.status, await unauthorizedRes.json());

    // 3. Admin creates Course A (Mon 10:00 AM - 12:00 PM)
    const courseARes = await fetch('http://127.0.0.1:5000/api/admin/courses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + adminLogin.token,
      },
      body: JSON.stringify({
        courseName: 'Database Management Systems',
        courseCode: 'CS301',
        description: 'Relational and NoSQL database design, indexing, and ACID transactions.',
        credits: 4,
        date: '2026-11-16',
        startTime: '10:00 AM',
        endTime: '12:00 PM',
        capacity: 2,
      }),
    });
    const courseAData = await courseARes.json();
    console.log('\n--- 2. ADMIN CREATE COURSE A (CS301) ---');
    console.log(courseAData);

    // 4. Admin creates Course B (Overlapping: Mon 11:00 AM - 1:00 PM)
    const courseBRes = await fetch('http://127.0.0.1:5000/api/admin/courses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + adminLogin.token,
      },
      body: JSON.stringify({
        courseName: 'Operating Systems',
        courseCode: 'CS302',
        description: 'Process scheduling, concurrency, memory management, and file systems.',
        credits: 4,
        date: '2026-11-16',
        startTime: '11:00 AM',
        endTime: '01:00 PM',
        capacity: 30,
      }),
    });
    console.log('\n--- 3. ADMIN CREATE COURSE B (CS302 - OVERLAPPING SLOT) ---');
    console.log(await courseBRes.json());

    // 5. Admin creates Course C (Adjacent Non-Overlapping: Mon 12:00 PM - 2:00 PM)
    const courseCRes = await fetch('http://127.0.0.1:5000/api/admin/courses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + adminLogin.token,
      },
      body: JSON.stringify({
        courseName: 'Computer Networks',
        courseCode: 'CS303',
        description: 'TCP/IP protocol suite, routing algorithms, and network security.',
        credits: 3,
        date: '2026-11-16',
        startTime: '12:00 PM',
        endTime: '02:00 PM',
        capacity: 1,
      }),
    });
    console.log('\n--- 4. ADMIN CREATE COURSE C (CS303 - ADJACENT SLOT, CAPACITY 1) ---');
    console.log(await courseCRes.json());

    // 6. Student fetches active courses list
    const listRes = await fetch('http://127.0.0.1:5000/api/courses', {
      headers: { Authorization: 'Bearer ' + studentLogin.token },
    });
    const listData = await listRes.json();
    console.log('\n--- 5. STUDENT LIST COURSES (/api/courses) ---');
    console.log('Total active courses:', listData.totalCourses);
    console.log(
      listData.courses.map((c) => ({
        code: c.courseCode,
        name: c.courseName,
        slot: `${c.startTime} - ${c.endTime}`,
        capacity: c.capacity,
        enrolled: c.enrolledCount,
        available: c.availableSeats,
      }))
    );

    // 7. Admin fetches dashboard summary
    const dashRes = await fetch('http://127.0.0.1:5000/api/admin/dashboard', {
      headers: { Authorization: 'Bearer ' + adminLogin.token },
    });
    const dashData = await dashRes.json();
    console.log('\n--- 6. ADMIN DASHBOARD STATS (/api/admin/dashboard) ---');
    console.log(dashData.stats);

    process.exit(0);
  } catch (err) {
    console.error('Phase 3 test error:', err);
    process.exit(1);
  }
}, 2000);
