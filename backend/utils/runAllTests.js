const connectDB = require('../config/db');
require('../server.js');

const BASE = 'http://127.0.0.1:5000/api';

const apiReq = async (path, { method = 'GET', token = null, body = null } = {}) => {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (_) {}

  return { status: res.status, data };
};

setTimeout(async () => {
  const results = [];
  const check = (id, category, name, passed, detail) => {
    results.push({
      '#': id,
      Category: category,
      'Test Case': name,
      Result: passed ? 'PASS' : 'FAIL',
      Detail: String(detail).slice(0, 78),
    });
  };

  const db = connectDB.getPool();
  const runId = Date.now().toString().slice(-5);
  const createdCourseIds = [];
  const createdStudentIds = [];

  try {
    console.log('\n=====================================================================');
    console.log('   RUNNING ALL 26 MASTER TEST CASES (SECURITY, DATES, SQL, RACE)');
    console.log('=====================================================================\n');

    const t1 = await apiReq('/health');
    check(1, 'Auth', 'Health Check Endpoint', t1.status === 200 && t1.data?.success, `HTTP ${t1.status} - ${t1.data?.database}`);

    const t2 = await apiReq('/auth/register', {
      method: 'POST',
      body: { name: 'Bad Actor', email: `bad${runId}@university.edu`, password: 'Password123', studentId: `BAD${runId}`, role: 'admin' },
    });
    check(2, 'Security', 'Block Admin Self-Registration', t2.status === 403, `HTTP ${t2.status} - ${t2.data?.message}`);

    const t3 = await apiReq('/auth/login', {
      method: 'POST',
      body: { email: 'admin@university.edu', password: 'WrongPassword!' },
    });
    check(3, 'Auth', 'Reject Invalid Password', t3.status === 401, `HTTP ${t3.status} - ${t3.data?.message}`);

    const t4 = await apiReq('/auth/login', {
      method: 'POST',
      body: { email: 'aarav@university.edu', password: 'Password123', expectedRole: 'admin' },
    });
    check(4, 'Security', 'Block Student on Admin Login Portal', t4.status === 403, `HTTP ${t4.status} - ${t4.data?.message}`);

    const t5 = await apiReq('/courses');
    check(5, 'Security', 'Block Unauthenticated Access (No JWT)', t5.status === 401, `HTTP ${t5.status} - ${t5.data?.message}`);

    const testStuEmail = `qa_stu_${runId}@university.edu`;
    const testStuRoll = `QA${runId}`;
    const t6Reg = await apiReq('/auth/register', {
      method: 'POST',
      body: { name: 'QA Student Primary', email: testStuEmail, password: 'Password123', studentId: testStuRoll },
    });
    const stuToken = t6Reg.data?.token;
    if (t6Reg.data?.user?._id) createdStudentIds.push(t6Reg.data.user._id);
    const t6Me = await apiReq('/auth/me', { token: stuToken });
    check(6, 'Auth', 'Student Register + /api/auth/me', t6Reg.status === 201 && t6Me.status === 200 && t6Me.data?.user?.email === testStuEmail, `Registered ${testStuRoll} & verified /me`);

    const admin1Login = await apiReq('/auth/login', {
      method: 'POST',
      body: { email: 'admin@university.edu', password: 'Admin@123', expectedRole: 'admin' },
    });
    const adminToken = admin1Login.data?.token;

    const t7 = await apiReq('/auth/change-password', {
      method: 'PUT',
      token: stuToken,
      body: { currentPassword: 'WrongCurrentPassword', newPassword: 'NewPassword123' },
    });
    check(7, 'Password', 'Reject Change Password w/ Wrong Current', t7.status === 401, `HTTP ${t7.status} - ${t7.data?.message}`);

    const t8Change = await apiReq('/auth/change-password', {
      method: 'PUT',
      token: stuToken,
      body: { currentPassword: 'Password123', newPassword: 'NewPassword123' },
    });
    const t8Login = await apiReq('/auth/login', {
      method: 'POST',
      body: { email: testStuEmail, password: 'NewPassword123', expectedRole: 'student' },
    });
    check(8, 'Password', 'Change Password & Login w/ New Pwd', t8Change.status === 200 && t8Login.status === 200, `Changed password & verified re-login`);

    const t9Forgot = await apiReq('/auth/forgot-password', {
      method: 'POST',
      body: { email: testStuEmail, studentId: testStuRoll, newPassword: 'RecoveredPassword123' },
    });
    const t9Login = await apiReq('/auth/login', {
      method: 'POST',
      body: { email: testStuEmail, password: 'RecoveredPassword123', expectedRole: 'student' },
    });
    check(9, 'Password', 'Forgot Password Recovery & Login', t9Forgot.status === 200 && t9Login.status === 200, `Recovered via Email+StudentID & logged in`);

    const t10 = await apiReq('/admin/courses', {
      method: 'POST',
      token: stuToken,
      body: { courseCode: 'HACK99', courseName: 'Hack', description: 'No', credits: 3, date: '2026-12-10', startTime: '10:00 AM', endTime: '11:00 AM', capacity: 10 },
    });
    check(10, 'RBAC', 'Block Student Creating Course', t10.status === 403, `HTTP ${t10.status} - ${t10.data?.message}`);

    const t11 = await apiReq('/admin/students', { token: stuToken });
    check(11, 'RBAC', 'Block Student Viewing Student Directory', t11.status === 403, `HTTP ${t11.status} - ${t11.data?.message}`);

    const t12 = await apiReq('/admin/audit-logs', { token: stuToken });
    check(12, 'RBAC', 'Block Student Viewing Audit Logs', t12.status === 403, `HTTP ${t12.status} - ${t12.data?.message}`);

    const t13 = await apiReq('/admin/courses', {
      method: 'POST',
      token: adminToken,
      body: { courseCode: `INV1_${runId}`, courseName: 'Bad Time', facultyName: 'Dr. X', description: 'Invalid', credits: 3, date: '2026-12-10', startTime: '02:00 PM', endTime: '11:00 AM', capacity: 10 },
    });
    check(13, 'Course', 'Reject Course Where Start >= End Time', t13.status === 400, `HTTP ${t13.status} - ${t13.data?.message}`);

    const t14 = await apiReq('/admin/courses', {
      method: 'POST',
      token: adminToken,
      body: { courseCode: `INV2_${runId}`, courseName: 'Zero Cap', facultyName: 'Dr. X', description: 'Invalid', credits: 3, date: '2026-12-10', startTime: '09:00 AM', endTime: '11:00 AM', capacity: 0 },
    });
    check(14, 'Course', 'Reject Course Where Capacity <= 0', t14.status === 400, `HTTP ${t14.status} - ${t14.data?.message}`);

    const cBaseRes = await apiReq('/admin/courses', {
      method: 'POST',
      token: adminToken,
      body: {
        courseCode: `QAB_${runId}`,
        courseName: 'QA Base Course',
        facultyName: 'Dr. QA Faculty',
        description: 'Base slot 10:00 AM - 12:00 PM',
        credits: 4,
        date: '2026-12-15',
        startDate: '2026-12-20',
        applyDeadline: '2026-12-19',
        startTime: '10:00 AM',
        endTime: '12:00 PM',
        capacity: 5,
      },
    });
    const cBase = cBaseRes.data?.course;
    if (cBase) createdCourseIds.push(cBase._id);
    check(15, 'Course', 'Admin Create Course w/ Faculty & Dates', cBaseRes.status === 201 && cBase?.facultyName === 'Dr. QA Faculty' && cBase?.applyDeadline === '2026-12-19', `Created ${cBase?.courseCode} (Faculty: ${cBase?.facultyName})`);

    const t16 = await apiReq('/admin/courses', {
      method: 'POST',
      token: adminToken,
      body: {
        courseCode: `QAB_${runId}`,
        courseName: 'Duplicate Code',
        facultyName: 'Dr. X',
        description: 'Dup',
        credits: 3,
        date: '2026-12-15',
        startTime: '03:00 PM',
        endTime: '04:00 PM',
        capacity: 10,
      },
    });
    check(16, 'Course', 'Reject Duplicate Course Code', t16.status === 409, `HTTP ${t16.status} - ${t16.data?.message}`);

    const cOverlap = (await apiReq('/admin/courses', {
      method: 'POST',
      token: adminToken,
      body: { courseCode: `QAO_${runId}`, courseName: 'QA Overlap', facultyName: 'Dr. O', description: '11-1', credits: 3, date: '2026-12-15', startDate: '2026-12-20', applyDeadline: '2026-12-19', startTime: '11:00 AM', endTime: '01:00 PM', capacity: 5 },
    })).data?.course;
    if (cOverlap) createdCourseIds.push(cOverlap._id);

    const cAdjacent = (await apiReq('/admin/courses', {
      method: 'POST',
      token: adminToken,
      body: { courseCode: `QAA_${runId}`, courseName: 'QA Adjacent', facultyName: 'Dr. A', description: '12-2', credits: 3, date: '2026-12-15', startDate: '2026-12-20', applyDeadline: '2026-12-19', startTime: '12:00 PM', endTime: '02:00 PM', capacity: 5 },
    })).data?.course;
    if (cAdjacent) createdCourseIds.push(cAdjacent._id);

    // Test #26: Past date & applyDeadline > startDate rejection
    const pastDateRes = await apiReq('/admin/courses', {
      method: 'POST',
      token: adminToken,
      body: { courseCode: `QAP_${runId}`, courseName: 'Past Date Course', facultyName: 'Dr. P', description: 'Should fail', credits: 3, date: '2020-01-01', startDate: '2020-01-05', applyDeadline: '2020-01-02', startTime: '09:00 AM', endTime: '10:00 AM', capacity: 10 },
    });
    const badOrderRes = await apiReq('/admin/courses', {
      method: 'POST',
      token: adminToken,
      body: { courseCode: `QAO2_${runId}`, courseName: 'Bad Order Course', facultyName: 'Dr. P', description: 'Should fail', credits: 3, date: '2026-12-20', startDate: '2026-12-20', applyDeadline: '2026-12-25', startTime: '09:00 AM', endTime: '10:00 AM', capacity: 10 },
    });
    check(26, 'Course', 'Reject Past Date & Deadline > StartDate', pastDateRes.status === 400 && badOrderRes.status === 400, `Past: HTTP ${pastDateRes.status} | Deadline > Start: HTTP ${badOrderRes.status}`);

    // Create valid course, then backdate apply_deadline in DB to simulate time passing
    const cExpired = (await apiReq('/admin/courses', {
      method: 'POST',
      token: adminToken,
      body: { courseCode: `QAE_${runId}`, courseName: 'QA Expired', facultyName: 'Dr. E', description: 'Simulated expired deadline', credits: 3, date: '2026-12-16', startDate: '2026-12-20', applyDeadline: '2026-12-19', startTime: '09:00 AM', endTime: '10:00 AM', capacity: 10 },
    })).data?.course;
    if (cExpired) {
      createdCourseIds.push(cExpired._id);
      await db.query("UPDATE courses SET apply_deadline = '2026-11-01' WHERE id = ?", [cExpired._id]);
    }

    const cRace = (await apiReq('/admin/courses', {
      method: 'POST',
      token: adminToken,
      body: { courseCode: `QAR_${runId}`, courseName: 'QA 1-Seat Race', facultyName: 'Dr. R', description: 'Cap 1', credits: 3, date: '2026-12-17', startDate: '2026-12-20', applyDeadline: '2026-12-19', startTime: '09:00 AM', endTime: '11:00 AM', capacity: 1 },
    })).data?.course;
    if (cRace) createdCourseIds.push(cRace._id);

    const t18 = await apiReq(`/enrollments/${cBase._id}`, { method: 'POST', token: stuToken });
    check(18, 'Enroll', 'Valid Registration & Seat Decrement', t18.status === 201 && t18.data?.course?.enrolledCount === 1 && t18.data?.course?.availableSeats === 4, `HTTP ${t18.status} - Seats: ${t18.data?.course?.enrolledCount}/${t18.data?.course?.capacity}`);

    const stu2Reg = await apiReq('/auth/register', {
      method: 'POST',
      body: { name: 'QA Student 2', email: `qa_stu2_${runId}@university.edu`, password: 'Password123', studentId: `QA2_${runId}` },
    });
    const stu2Token = stu2Reg.data?.token;
    if (stu2Reg.data?.user?._id) createdStudentIds.push(stu2Reg.data.user._id);
    await apiReq(`/enrollments/${cBase._id}`, { method: 'POST', token: stu2Token });
    const t17 = await apiReq(`/admin/courses/${cBase._id}`, {
      method: 'PUT',
      token: adminToken,
      body: { capacity: 1 },
    });
    check(17, 'Course', 'Reject Capacity < Current EnrolledCount', t17.status === 400, `HTTP ${t17.status} - ${t17.data?.message}`);

    const t19 = await apiReq(`/enrollments/${cBase._id}`, { method: 'POST', token: stuToken });
    check(19, 'Enroll', 'Rule 2: Duplicate Registration Blocked', t19.status === 409, `HTTP ${t19.status} - ${t19.data?.message}`);

    const t20 = await apiReq(`/enrollments/${cOverlap._id}`, { method: 'POST', token: stuToken });
    check(20, 'Enroll', 'Rule 3: Overlapping Slot Rejected', t20.status === 409, `HTTP ${t20.status} - ${t20.data?.message}`);

    const t21 = await apiReq(`/enrollments/${cAdjacent._id}`, { method: 'POST', token: stuToken });
    check(21, 'Enroll', 'Rule 3: Adjacent Slot (12-2 PM) Allowed', t21.status === 201, `HTTP ${t21.status} - Adjacent slot accepted cleanly`);

    const t22 = await apiReq(`/enrollments/${cExpired._id}`, { method: 'POST', token: stuToken });
    check(22, 'Enroll', 'Expired Apply Deadline Rejected', t22.status === 400, `HTTP ${t22.status} - ${t22.data?.message}`);

    const raceTokens = [stuToken, stu2Token];
    for (let k = 3; k <= 5; k++) {
      const r = await apiReq('/auth/register', {
        method: 'POST',
        body: { name: `QA Racer ${k}`, email: `qa_racer${k}_${runId}@university.edu`, password: 'Password123', studentId: `QAR${k}_${runId}` },
      });
      if (r.data?.user?._id) createdStudentIds.push(r.data.user._id);
      raceTokens.push(r.data?.token);
    }

    const raceResponses = await Promise.all(
      raceTokens.map((tok) => apiReq(`/enrollments/${cRace._id}`, { method: 'POST', token: tok }))
    );
    const winners = raceResponses.filter((r) => r.status === 201);
    const losers = raceResponses.filter((r) => r.status === 400);
    const cRaceCheck = await apiReq(`/courses/${cRace._id}`, { token: adminToken });
    check(
      23,
      'Concurrency',
      'Rule 7: 5-Way Race for 1 Seat (ACID)',
      winners.length === 1 && losers.length === 4 && cRaceCheck.data?.course?.enrolledCount === 1 && cRaceCheck.data?.course?.availableSeats === 0,
      `Winners: ${winners.length}, Rejected: ${losers.length}, DB Enrolled: ${cRaceCheck.data?.course?.enrolledCount}/1`
    );

    const winnerIdx = raceResponses.findIndex((r) => r.status === 201);
    const loserIdx = raceResponses.findIndex((r) => r.status !== 201);
    const wrongDrop = await apiReq(`/enrollments/${cRace._id}`, { method: 'DELETE', token: raceTokens[loserIdx] });
    const rightDrop = await apiReq(`/enrollments/${cRace._id}`, { method: 'DELETE', token: raceTokens[winnerIdx] });

    const stu2IdToDelete = createdStudentIds[1];
    const adminDelStu = await apiReq(`/admin/students/${stu2IdToDelete}`, { method: 'DELETE', token: adminToken });
    const cBaseAfterDel = await apiReq(`/courses/${cBase._id}`, { token: adminToken });

    check(
      24,
      'Integrity',
      'Ownership Drop + Admin Delete Seat Release',
      wrongDrop.status === 404 && rightDrop.status === 200 && adminDelStu.status === 200 && cBaseAfterDel.data?.course?.enrolledCount === 1,
      `Non-owner: 404 | Owner drop: 200 | Admin del restored seats to ${cBaseAfterDel.data?.course?.enrolledCount}/5`
    );

    let auditTriggerOk = false;
    let capTriggerOk = false;
    try {
      await db.query('DELETE FROM audit_logs LIMIT 1');
    } catch (e) {
      auditTriggerOk = e.sqlState === '45000';
    }
    try {
      await db.query('UPDATE courses SET enrolled_count = capacity + 5 WHERE id = ?', [cBase._id]);
    } catch (e) {
      capTriggerOk = e.sqlState === '45000';
    }
    check(
      25,
      'MySQL Triggers',
      'DB-Level Immutability & Capacity Guards',
      auditTriggerOk && capTriggerOk,
      `Audit DELETE blocked: ${auditTriggerOk} | Capacity overflow blocked: ${capTriggerOk}`
    );

    for (const cid of createdCourseIds) {
      await apiReq(`/admin/courses/${cid}?force=true`, { method: 'DELETE', token: adminToken });
    }
    for (const sid of createdStudentIds) {
      await apiReq(`/admin/students/${sid}`, { method: 'DELETE', token: adminToken });
    }

    results.sort((a, b) => a['#'] - b['#']);
    console.table(results);

    const passedCount = results.filter((r) => r.Result === 'PASS').length;
    console.log(`\nSUMMARY: ${passedCount} / ${results.length} TEST CASES PASSED!`);
    console.log(passedCount === results.length ? 'STATUS: ALL SYSTEMS GREEN!\n' : 'STATUS: SOME TESTS FAILED — INSPECT TABLE ABOVE.\n');

    process.exit(passedCount === results.length ? 0 : 1);
  } catch (err) {
    console.error('Fatal Test Suite Error:', err);
    process.exit(1);
  }
}, 2000);
