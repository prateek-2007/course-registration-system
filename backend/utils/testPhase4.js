require('../server.js');

setTimeout(async () => {
  try {
    // 1. Login Student 1 (Aarav) & Admin
    const student1 = await (
      await fetch('http://127.0.0.1:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'aarav@university.edu', password: 'Password123' }),
      })
    ).json();

    const admin = await (
      await fetch('http://127.0.0.1:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@university.edu', password: 'Admin@123' }),
      })
    ).json();

    // Register or login Student 2 (Priya) for concurrency & ownership testing
    await fetch('http://127.0.0.1:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Priya Patel',
        email: 'priya@university.edu',
        password: 'Password123',
        studentId: '221IT018',
      }),
    });

    const student2 = await (
      await fetch('http://127.0.0.1:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'priya@university.edu', password: 'Password123' }),
      })
    ).json();

    // Fetch courses CS301, CS302, CS303
    const coursesRes = await (
      await fetch('http://127.0.0.1:5000/api/courses', {
        headers: { Authorization: 'Bearer ' + student1.token },
      })
    ).json();

    const cs301 = coursesRes.courses.find((c) => c.courseCode === 'CS301');
    const cs302 = coursesRes.courses.find((c) => c.courseCode === 'CS302');
    const cs303 = coursesRes.courses.find((c) => c.courseCode === 'CS303');

    // TEST 1: Aarav registers for CS301 (10:00 AM - 12:00 PM)
    const enroll1 = await fetch(`http://127.0.0.1:5000/api/enrollments/${cs301._id}`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + student1.token },
    });
    console.log('\n--- 1. AARAV REGISTERS FOR CS301 (10:00 AM - 12:00 PM) ---');
    console.log('Status:', enroll1.status, (await enroll1.json()).message);

    // TEST 2: Duplicate Registration Prevention (Aarav tries CS301 again)
    const dupEnroll = await fetch(`http://127.0.0.1:5000/api/enrollments/${cs301._id}`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + student1.token },
    });
    console.log('\n--- 2. RULE 2: DUPLICATE REGISTRATION CHECK (EXPECT 409) ---');
    console.log('Status:', dupEnroll.status, (await dupEnroll.json()).message);

    // TEST 3: Time-Slot Conflict Prevention (Aarav tries CS302: 11:00 AM - 01:00 PM)
    const conflictEnroll = await fetch(`http://127.0.0.1:5000/api/enrollments/${cs302._id}`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + student1.token },
    });
    console.log('\n--- 3. RULE 3: OVERLAPPING TIME SLOT CHECK (CS302 11:00 AM - 1:00 PM, EXPECT 409) ---');
    console.log('Status:', conflictEnroll.status, (await conflictEnroll.json()).message);

    // TEST 4: Concurrent Registration Race Condition on CS303 (Capacity = 1, 12:00 PM - 2:00 PM)
    console.log('\n--- 4. RULE 1 & RULE 7: CONCURRENT RACE FOR LAST SEAT IN CS303 (CAPACITY = 1) ---');
    const [raceRes1, raceRes2] = await Promise.all([
      fetch(`http://127.0.0.1:5000/api/enrollments/${cs303._id}`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + student1.token },
      }),
      fetch(`http://127.0.0.1:5000/api/enrollments/${cs303._id}`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + student2.token },
      }),
    ]);
    const raceData1 = await raceRes1.json();
    const raceData2 = await raceRes2.json();
    console.log('Student 1 (Aarav) Result:', raceRes1.status, raceData1.message);
    console.log('Student 2 (Priya) Result:', raceRes2.status, raceData2.message);

    // TEST 5: Ownership Check & Course Drop
    const winnerToken = raceRes1.status === 201 ? student1.token : student2.token;
    const loserToken = raceRes1.status === 201 ? student2.token : student1.token;

    const unauthorizedDrop = await fetch(`http://127.0.0.1:5000/api/enrollments/${cs303._id}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + loserToken },
    });
    console.log('\n--- 5. RULE 4: NON-ENROLLED STUDENT ATTEMPTING TO DROP CS303 (EXPECT 404) ---');
    console.log('Status:', unauthorizedDrop.status, (await unauthorizedDrop.json()).message);

    const validDrop = await fetch(`http://127.0.0.1:5000/api/enrollments/${cs303._id}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + winnerToken },
    });
    const validDropData = await validDrop.json();
    console.log('\n--- 6. VALID COURSE DROP BY ENROLLED STUDENT (SEAT FREED IN REAL TIME) ---');
    console.log('Status:', validDrop.status, validDropData.message, 'Available Seats Now:', validDropData.course.availableSeats);

    // TEST 6: My Courses & History + Admin Audit Logs
    const myCourses = await (
      await fetch('http://127.0.0.1:5000/api/enrollments/my-courses', {
        headers: { Authorization: 'Bearer ' + student1.token },
      })
    ).json();
    console.log('\n--- 7. AARAV MY-COURSES & ENROLLMENT HISTORY ---');
    console.log('Active Enrolled Count:', myCourses.activeCount, '| Total History Records:', myCourses.historyCount);

    const auditLogs = await (
      await fetch('http://127.0.0.1:5000/api/admin/audit-logs', {
        headers: { Authorization: 'Bearer ' + admin.token },
      })
    ).json();
    console.log('\n--- 8. ADMIN AUDIT LOGS (/api/admin/audit-logs) ---');
    console.log('Total Audit Log Entries:', auditLogs.totalLogs);
    console.log(auditLogs.logs.slice(0, 4).map((l) => `${l.action}: ${l.details}`));

    process.exit(0);
  } catch (err) {
    console.error('Phase 4 test error:', err);
    process.exit(1);
  }
}, 2000);
